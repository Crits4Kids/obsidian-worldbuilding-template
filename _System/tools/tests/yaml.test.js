const { test, expect } = require("bun:test");
const { toYaml } = require("../../Scripts/lib/yaml.js");

test("round-trips the shapes the vault writes", () => {
  const obj = {
    title: "Mira Vell", subtitle: "", type: "person", person_type: "npc", status: "active",
    campaigns: ["[[Example Campaign]]"], summary: "Harbormaster: smuggles, lies, 'helps'.",
    share: false, aliases: [], tags: ["person", "example"], stage: 3, date: "2026-09-25",
    "fc-date": "1492-03-01", father: "[[Old Tom]]", yes_word: "yes", number_word: "42",
    layout: [{ type: "header", text: "Family", above: ["father"] }, { type: "group", keys: ["father", "mother"] }],
  };
  const parsed = Bun.YAML.parse(toYaml(obj));
  expect(parsed).toEqual({ ...obj, subtitle: null });
});

test("empty strings are written as bare keys", () => {
  expect(toYaml({ image: "" })).toBe("image:");
});
