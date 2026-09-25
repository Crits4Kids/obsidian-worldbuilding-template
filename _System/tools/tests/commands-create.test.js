const { test, expect } = require("bun:test");
const { makeFakeApp, makeUi } = require("./fake-app.js");

async function boot(files) {
  const { app, store } = makeFakeApp(files);
  const src = store.get("_System/Scripts/loader.js");
  const m = { exports: {} };
  new Function("module", "exports", src)(m, m.exports);
  const wb = await m.exports.loadWb(app);
  return { app, store, wb };
}
const fmOf = (store, p) => Bun.YAML.parse(store.get(p).match(/^---\n([\s\S]*?)\n---/)[1]);

test("loader exposes every lib module", async () => {
  const { wb } = await boot();
  for (const k of ["schema", "markdown", "yaml", "infobox", "notes", "bible", "handouts", "deck", "commands"]) expect(wb[k]).toBeDefined();
});

test("newEntity creates a person in World/People", async () => {
  const { app, store, wb } = await boot();
  const ui = makeUi(["person", "npc", "Mira Vell", "Harbormaster of Rivertown."]);
  await wb.commands.newEntity({ app, ui, now: new Date("2026-09-25T10:00:00") });
  const fm = fmOf(store, "World/People/Mira Vell.md");
  expect(fm).toMatchObject({ type: "person", person_type: "npc", summary: "Harbormaster of Rivertown." });
});

test("newEntity refuses a duplicate name and creates nothing", async () => {
  const { app, store, wb } = await boot({ "World/Places/Mira Vell.md": "---\ntype: place\n---\n" });
  const before = store.size;
  const ui = makeUi(["person", "npc", "Mira Vell", ""]);
  await expect(wb.commands.newEntity({ app, ui, now: new Date() })).rejects.toThrow("already exists");
  expect(store.size).toBe(before);
});

test("cancelling a prompt throws CANCEL and creates nothing", async () => {
  const { app, store, wb } = await boot();
  const before = store.size;
  await expect(wb.commands.newEntity({ app, ui: makeUi(["person", null]), now: new Date() })).rejects.toBe(wb.commands.CANCEL);
  expect(store.size).toBe(before);
});

test("newCampaign makes folders, the campaign note, and becomes the only active campaign", async () => {
  const { app, store, wb } = await boot({ "Campaigns/Old/Old.md": "---\ntype: campaign\nactive: true\n---\n" });
  await wb.commands.newCampaign({ app, ui: makeUi(["Tides", "Shadowdark"]), now: new Date() });
  expect(fmOf(store, "Campaigns/Tides/Tides.md")).toMatchObject({ type: "campaign", active: true, system: "Shadowdark" });
  expect(fmOf(store, "Campaigns/Old/Old.md").active).toBe(false);
  expect(app.vault.getAbstractFileByPath("Campaigns/Tides/Sessions")).not.toBe(null);
  expect(app.vault.getAbstractFileByPath("Campaigns/Tides/Arcs")).not.toBe(null);
});

test("newSession numbers sessions, carries loose threads, and optionally makes a recap", async () => {
  const { app, store, wb } = await boot({
    "Campaigns/Tides/Tides.md": "---\ntype: campaign\nactive: true\n---\n",
    "Campaigns/Tides/Sessions/Tides Session 1.md": "---\ntype: session\ncampaign: \"[[Tides]]\"\nsession_number: 1\n---\n## Loose threads\n- Who rang the bell?\n\n## Connections\n",
  });
  await wb.commands.newSession({ app, ui: makeUi([true]), now: new Date("2026-09-25T10:00:00") });
  const p = "Campaigns/Tides/Sessions/Tides Session 2.md";
  expect(fmOf(store, p)).toMatchObject({ type: "session", session_number: 2, campaign: "[[Tides]]", date: "2026-09-25" });
  expect(store.get(p)).toContain("## Threads carried forward\n- Who rang the bell?");
  expect(store.get(p)).toContain("- Previous: [[Tides Session 1]]");
  expect(fmOf(store, "Campaigns/Tides/Sessions/Tides Session 2 Recap.md")).toMatchObject({ type: "recap", share: true, session: "[[Tides Session 2]]" });
});

test("newSession without any campaign explains what to do", async () => {
  const { app, wb } = await boot();
  await expect(wb.commands.newSession({ app, ui: makeUi([]), now: new Date() })).rejects.toThrow("New campaign");
});

test("fromTemplater infers the type from the folder and returns the note text", async () => {
  const { app, wb } = await boot();
  let renamed = null;
  const tp = {
    file: { path: () => "World/Things/Untitled.md", rename: async (n) => { renamed = n; } },
    system: {
      prompt: async (h) => (h.startsWith("Name") ? "Bell Key" : "Opens the bell."),
      suggester: async (labels, values) => values.find((v) => v === "key_item"),
    },
  };
  const text = await wb.commands.fromTemplater(tp, app, null);
  expect(renamed).toBe("Bell Key");
  expect(text).toContain("thing_type: key_item");
  expect(text).toContain("> [!infobox]+ Bell Key");
});
