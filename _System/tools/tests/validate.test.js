const { test, expect } = require("bun:test");
const { mkdtempSync, mkdirSync, writeFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { tmpdir } = require("node:os");
const notes = require("../../Scripts/lib/notes.js");

function vault(files) {
  const root = mkdtempSync(join(tmpdir(), "wbv-"));
  for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), t); }
  return root;
}
const BIBLE = "<!-- WB:INDEX START -->\n<!-- WB:INDEX END -->\n";
const good = notes.buildNote({ type: "person", subtype: "npc", name: "Mira", summary: "ok" }, "{{intro}}x\n\n## Connections\n");

test("a clean vault passes", async () => {
  const { validateVault } = await import("../validate.mjs");
  expect(validateVault(vault({ "World Bible.md": BIBLE, "World/People/Mira.md": good }))).toEqual({ errors: [], warnings: [] });
});

test("reports each rule", async () => {
  const { validateVault } = await import("../validate.mjs");
  const r = validateVault(vault({
    "World/People/NoFm.md": "hello",
    "World/Places/Wrong.md": good.replace("Mira", "Wrong"),
    "World/People/Bad.md": good.replace("person_type: npc", "person_type: dragon"),
    "World/People/Code.md": good + "\n```dataview\nLIST\n```\n",
    "World/People/Empty.md": good.replace("summary: ok", "summary:"),
    "Campaigns/A/Sessions/Deep/x.md": good,
  }));
  expect(r.errors.join("\n")).toContain("World Bible.md: missing");
  expect(r.errors.join("\n")).toContain("World/People/NoFm.md: no frontmatter");
  expect(r.errors.join("\n")).toContain("World/Places/Wrong.md: type person not allowed here");
  expect(r.errors.join("\n")).toContain("World/People/Bad.md: person_type must be one of");
  expect(r.errors.join("\n")).toContain("World/People/Code.md: plugin code in a content note");
  expect(r.errors.join("\n")).toContain("x.md: folder depth 4 exceeds 3");
  expect(r.warnings.join("\n")).toContain("World/People/Empty.md: missing summary");
});
