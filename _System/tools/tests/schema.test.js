const { test, expect } = require("bun:test");
const s = require("../../Scripts/lib/schema.js");

test("typesForPath maps folders to allowed types", () => {
  expect(s.typesForPath("World/People/Mira.md")).toEqual(["person"]);
  expect(s.typesForPath("World/Plot/The Drowning.md")).toEqual(["plot"]);
  expect(s.typesForPath("Campaigns/Tides/Tides.md")).toEqual(["campaign"]);
  expect(s.typesForPath("Campaigns/Tides/Arcs/Arc 1.md")).toEqual(["arc"]);
  expect(s.typesForPath("Campaigns/Tides/Sessions/Tides Session 1.md")).toEqual(["session", "recap"]);
  expect(s.typesForPath("Micro-settings/Saltmarsh.md")).toEqual(["microsetting"]);
  expect(s.typesForPath("GM Toolkit/House Rules.md")).toEqual(["encounter", "rumor_table", "toolkit"]);
  expect(s.typesForPath("Archive/People/Old.md")).toEqual(["person"]);
  expect(s.typesForPath("Home.md")).toEqual([]);
});

test("folderFor, archivePath and handoutPath", () => {
  expect(s.folderFor("place")).toBe("World/Places");
  expect(s.folderFor("session", "Tides")).toBe("Campaigns/Tides/Sessions");
  expect(s.folderFor("arc", "Tides")).toBe("Campaigns/Tides/Arcs");
  expect(s.folderFor("campaign", "Tides")).toBe("Campaigns/Tides");
  expect(() => s.folderFor("session")).toThrow("campaign");
  expect(s.archivePath("person", "Mira")).toBe("Archive/People/Mira.md");
  expect(s.archivePath("session", "Tides Session 1")).toBe("Archive/Sessions/Tides Session 1.md");
  expect(s.handoutPath("recap", "Tides Session 1 Recap")).toBe("Player Handouts/Recaps/Tides Session 1 Recap.md");
});

test("subtypeKey only exists for the six families", () => {
  expect(s.subtypeKey("thing")).toBe("thing_type");
  expect(s.subtypeKey("session")).toBe(null);
});
