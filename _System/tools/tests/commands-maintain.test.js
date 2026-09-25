const { test, expect } = require("bun:test");
const { makeFakeApp, makeUi } = require("./fake-app.js");

async function boot(files) {
  const { app, store } = makeFakeApp(files);
  const m = { exports: {} };
  new Function("module", "exports", store.get("_System/Scripts/loader.js"))(m, m.exports);
  return { app, store, wb: await m.exports.loadWb(app) };
}
const NOW = new Date("2026-09-25T10:30:00");
const note = (fm, body = "") => `---\n${fm}\n---\n${body}`;

test("refreshInfobox rewrites only stale boxes and preserves frontmatter text", async () => {
  const fmText = "title: Key\ntype: thing\nthing_type: key_item\nstatus: active\nsummary: x\nrarity: rare  # keep this comment";
  const { app, store, wb } = await boot({ "World/Things/Key.md": note(fmText, "Body\n") });
  const n = await wb.commands.refreshInfobox({ app, ui: makeUi(["vault"]), now: NOW });
  expect(n).toBe(1);
  const text = store.get("World/Things/Key.md");
  expect(text.startsWith(`---\n${fmText}\n---\n> [!infobox]+ Key`)).toBe(true);
  expect(text).toContain("> | **Rarity** | rare |");
  expect(await wb.commands.refreshInfobox({ app, ui: makeUi(["vault"]), now: NOW })).toBe(0);
});

test("rebuildWorldBible replaces only the index", async () => {
  const { app, store, wb } = await boot({
    "World Bible.md": "# World Bible\nMine.\n<!-- WB:INDEX START -->\nold\n<!-- WB:INDEX END -->\n",
    "World/People/Mira.md": note("type: person\nperson_type: npc\nstatus: active\nsummary: Harbormaster."),
  });
  await wb.commands.rebuildWorldBible({ app, ui: makeUi([]), now: NOW });
  const t = store.get("World Bible.md");
  expect(t.startsWith("# World Bible\nMine.\n<!-- WB:INDEX START -->\n_Generated 2026-09-25 10:30")).toBe(true);
  expect(t).toContain("- [[Mira]] — npc · active · Harbormaster.");
  expect(t.endsWith("<!-- WB:INDEX END -->\n")).toBe(true);
});

test("exportHandouts writes shared notes without secrets and removes stale copies", async () => {
  const { app, store, wb } = await boot({
    "World/Places/Rivertown.md": note("title: Rivertown\ntype: place\nshare: true\ntags: [place]", "Ruled by [[Mira]].\n> [!gm] Secret\n> doppelganger\n"),
    "World/People/Mira.md": note("type: person\nshare: false", "x"),
    "Player Handouts/Places/Old.md": "stale",
  });
  const r = await wb.commands.exportHandouts({ app, ui: makeUi([]), now: NOW });
  expect(r).toEqual({ written: 1, removed: 1 });
  const out = store.get("Player Handouts/Places/Rivertown.md");
  expect(out).toContain("Ruled by Mira.");
  expect(out).not.toContain("doppelganger");
  expect(store.has("Player Handouts/Places/Old.md")).toBe(false);
});

test("archiveNote marks archived and moves under Archive/<Family>", async () => {
  const { app, store, wb } = await boot({ "World/People/Mira.md": note("type: person\nstatus: active", "x") });
  app.workspace.activePath = "World/People/Mira.md";
  await wb.commands.archiveNote({ app, ui: makeUi([true]), now: NOW });
  expect(store.has("World/People/Mira.md")).toBe(false);
  expect(store.get("Archive/People/Mira.md")).toContain("status: archived");
});

test("removeExamples deletes only notes tagged example after confirmation", async () => {
  const { app, store, wb } = await boot({
    "World/People/Ex.md": note("type: person\ntags: [person, example]"),
    "World/People/Real.md": note("type: person\ntags: [person]"),
  });
  expect(await wb.commands.removeExamples({ app, ui: makeUi([true]), now: NOW })).toBe(1);
  expect(store.has("World/People/Ex.md")).toBe(false);
  expect(store.has("World/People/Real.md")).toBe(true);
});

test("deckOfWorlds creates linked notes, the stack note, and updates existing notes", async () => {
  const { app, store, wb } = await boot({ "World/Groups/Tide Court.md": note("type: group", "Court.\n\n## Connections\n") });
  const ui = makeUi([
    "Saltmarsh Bell", "Swamp",
    "place", "A drowned bell tower. It rings.", "The Drowned Bell",   // landmark
    "person", "Named for Sister Wren.", "Sister Wren",               // namesake
    "existing", "Built by the Tide Court.", "Tide Court",            // origin
    "skip",                                                           // attribute
    "hook", "The bell rang at high tide.", "The Wrong Tide",         // advent
    false,                                                            // rebuild World Bible?
  ]);
  await wb.commands.deckOfWorlds({ app, ui, now: NOW });
  expect(store.get("World/Places/The Drowned Bell.md")).toContain("> [!quote] Deck of Worlds: landmark");
  expect(store.get("World/People/Sister Wren.md")).toContain("- [[Saltmarsh Bell]] (micro-setting: namesake)");
  expect(store.get("World/Plot/The Wrong Tide.md")).toContain("plot_type: hook");
  expect(store.get("Micro-settings/Saltmarsh Bell.md")).toContain("| Origin | Built by the Tide Court. | [[Tide Court]] |");
  expect(store.get("World/Groups/Tide Court.md")).toContain("## Connections\n- [[Saltmarsh Bell]] (micro-setting: origin)");
});

test("deckOfWorlds creates nothing when a name collides or the user cancels", async () => {
  const { app, store, wb } = await boot({ "World/People/Sister Wren.md": note("type: person") });
  const before = new Map(store);
  const collide = makeUi(["Stack", "Swamp", "place", "t", "New Place", "person", "t", "Sister Wren", "skip", "skip", "skip"]);
  await expect(wb.commands.deckOfWorlds({ app, ui: collide, now: NOW })).rejects.toThrow("already exists");
  expect(new Map(store)).toEqual(before);
  const cancel = makeUi(["Stack", "Swamp", "place", "t", null]);
  await expect(wb.commands.deckOfWorlds({ app, ui: cancel, now: NOW })).rejects.toBe(wb.commands.CANCEL);
  expect(new Map(store)).toEqual(before);
});

test("deckOfWorlds links the real note, not a same-named player handout copy", async () => {
  const { app, store, wb } = await boot({
    "Player Handouts/Groups/Tide Court.md": note("title: Tide Court\ntype: group", "copy"),
    "World/Groups/Tide Court.md": note("type: group", "Court.\n\n## Connections\n"),
  });
  const ui = makeUi(["Bell", "Swamp", "existing", "Built by the court.", "Tide Court", "skip", "skip", "skip", "skip", false]);
  await wb.commands.deckOfWorlds({ app, ui, now: NOW });
  expect(store.get("World/Groups/Tide Court.md")).toContain("- [[Bell]] (micro-setting: landmark)");
  expect(store.get("Player Handouts/Groups/Tide Court.md")).not.toContain("[[Bell]]");
});
