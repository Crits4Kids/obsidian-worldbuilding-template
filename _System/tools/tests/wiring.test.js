const { test, expect } = require("bun:test");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const commands = require("../../Scripts/lib/commands.js");
const schema = require("../../Scripts/lib/schema.js");
const S = join(__dirname, "../..");

const COMMANDS = {
  "new-entity": "newEntity", "new-campaign": "newCampaign", "new-session": "newSession",
  "refresh-infobox": "refreshInfobox", "rebuild-world-bible": "rebuildWorldBible", "deck-of-worlds": "deckOfWorlds",
  "export-handouts": "exportHandouts", "archive-note": "archiveNote", "remove-examples": "removeExamples",
};

test("each QuickAdd script calls an existing command", () => {
  for (const [file, fn] of Object.entries(COMMANDS)) {
    const src = readFileSync(join(S, "Scripts/quickadd", `${file}.js`), "utf8");
    expect(src).toContain(`wb.commands.run("${fn}", params)`);
    expect(typeof commands[fn]).toBe("function");
  }
});

test("each Templater template calls fromTemplater with a known type or null", () => {
  const TEMPLATES = { Person: "person", Group: "group", Place: "place", Thing: "thing", Lore: "lore", Plot: "plot",
    "Campaign Item": null, "Micro-setting": "microsetting", Map: "map", "GM Toolkit Item": null };
  for (const [name, type] of Object.entries(TEMPLATES)) {
    const src = readFileSync(join(S, "Templates", `${name}.md`), "utf8");
    expect(src).toContain(`fromTemplater(tp, app, ${type === null ? "null" : `"${type}"`})`);
    if (type) expect(schema.TYPES[type]).toBeDefined();
  }
  expect(existsSync(join(S, "Scripts/templater/wb.js"))).toBe(true);
});
