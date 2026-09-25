const { test, expect } = require("bun:test");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const notes = require("../../Scripts/lib/notes.js");
const schema = require("../../Scripts/lib/schema.js");
const BODIES = join(__dirname, "../../Templates/Bodies");

test("buildNote writes frontmatter, fills the body, and renders the infobox first", () => {
  const text = notes.buildNote(
    { type: "person", subtype: "npc", name: "Mira Vell", summary: "Harbormaster.", fields: { role: "Harbormaster" }, connections: ["[[Rivertown]]"] },
    "{{intro}}Hello {{name}}.\n\n## Connections\n",
  );
  const [, yaml, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const fm = Bun.YAML.parse(yaml);
  expect(fm).toMatchObject({ title: "Mira Vell", type: "person", person_type: "npc", status: "active", summary: "Harbormaster.",
    share: false, tags: ["person"], role: "Harbormaster", cr_type: "person", name: "Mira Vell", campaigns: [] });
  expect(body.startsWith("> [!infobox]+ Mira Vell\n")).toBe(true);
  expect(body).toContain("> | **Role** | Harbormaster |");
  expect(body).toContain("Hello Mira Vell.");
  expect(body).toContain("## Connections\n- [[Rivertown]]");
});

test("subtype is validated and subtype fields are added", () => {
  expect(() => notes.buildFrontmatter({ type: "plot", subtype: "nope", name: "X" })).toThrow("plot_type");
  const clock = notes.buildFrontmatter({ type: "plot", subtype: "clock", name: "The Drowning" });
  expect(clock).toMatchObject({ plot_type: "clock", stage: 0, max_stage: 6 });
  expect(notes.buildFrontmatter({ type: "recap", name: "R" }).share).toBe(true);
});

test("session helpers", () => {
  expect(notes.nextSessionNumber([1, "3", 2, "x"])).toBe(4);
  expect(notes.nextSessionNumber([])).toBe(1);
  expect(notes.sessionName("Tides", 4)).toBe("Tides Session 4");
});

test("bodyFile prefers type-subtype then type", () => {
  expect(notes.bodyFile("plot", "clock")).toEqual(["_System/Templates/Bodies/plot-clock.md", "_System/Templates/Bodies/plot.md"]);
  expect(notes.bodyFile("session")).toEqual(["_System/Templates/Bodies/session.md"]);
});

test("every type has a body skeleton with {{intro}} and a Connections section", () => {
  const files = readdirSync(BODIES);
  for (const type of Object.keys(schema.TYPES)) {
    expect(files).toContain(`${type}.md`);
    const body = readFileSync(join(BODIES, `${type}.md`), "utf8");
    expect(body.startsWith("{{intro}}")).toBe(true);
    expect(body).toContain("## Connections");
    expect(body).not.toMatch(/```(dataview|dataviewjs)|<%/);
  }
});

test("noteIssues reports missing summary and stale infobox", () => {
  const text = notes.buildNote({ type: "thing", subtype: "key_item", name: "Key", summary: "" }, "{{intro}}\n## Connections\n");
  const fm = Bun.YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  expect(notes.noteIssues(fm, text, "Key")).toEqual(["missing summary"]);
  expect(notes.noteIssues({ ...fm, summary: "ok", rarity: "rare" }, text, "Key")).toEqual(["infobox out of date"]);
  expect(notes.noteIssues({ ...fm, summary: "ok" }, "---\n---\nNo box", "Key")).toEqual(["infobox missing"]);
});
