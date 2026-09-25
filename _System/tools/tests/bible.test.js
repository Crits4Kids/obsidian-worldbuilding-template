const { test, expect } = require("bun:test");
const bible = require("../../Scripts/lib/bible.js");

const e = (name, fm) => bible.entryFromFrontmatter(name, fm);
const entries = [
  e("Mira Vell", { type: "person", person_type: "npc", status: "active", summary: "Harbormaster;\n smuggler." }),
  e("Ansel", { type: "person", person_type: "pc", status: "background", summary: "" }),
  e("Old Duke", { type: "person", person_type: "npc", status: "archived", summary: "Dead." }),
  e("The Drowning", { type: "plot", plot_type: "clock", status: "active", summary: "Floods.", stage: 3, max_stage: 6, owner: "[[Tide Court]]" }),
  e("Tides", { type: "campaign", status: "active", summary: "Main game.", active: true }),
  e("Tides Session 1", { type: "session", status: "active", summary: "Arrived.", campaign: "[[Tides]]", session_number: 1 }),
  e("Tides Session 2", { type: "session", status: "active", summary: "Fought.", campaign: [["Tides"]], session_number: 2 }),
  e("Saltmarsh", { type: "microsetting", status: "active", summary: "Swamp stack." }),
];

test("buildIndex groups, sorts and summarises", () => {
  const out = bible.buildIndex(entries, "2026-09-25 10:00");
  expect(out).toContain("## People (2)\n- [[Ansel]] — pc · background · (no summary)\n- [[Mira Vell]] — npc · active · Harbormaster; smuggler.");
  expect(out).toContain("## Groups (0)\n");
  expect(out).toContain("## Plot (1)\n- [[The Drowning]] — clock · active · Floods.");
  expect(out).toContain("## Active clocks\n- [[The Drowning]] — 3/6 · owner [[Tide Court]]");
  expect(out).toContain("## Campaigns\n- [[Tides]] — active · 2 sessions · last [[Tides Session 2]] — Fought.");
  expect(out).toContain("## Micro-settings (1)\n- [[Saltmarsh]] — active · Swamp stack.");
  expect(out).toContain("## Archived: 1 notes (not listed)");
  expect(out).not.toContain("Old Duke");
  expect(out.startsWith("_Generated 2026-09-25 10:00")).toBe(true);
});

test("replaceBetweenMarkers keeps everything outside the markers", () => {
  const text = `# WB\nHand text\n${bible.START}\nold\n${bible.END}\nFooter\n`;
  expect(bible.replaceBetweenMarkers(text, "new")).toBe(`# WB\nHand text\n${bible.START}\nnew\n${bible.END}\nFooter\n`);
});

test("replaceBetweenMarkers refuses when markers are missing or reversed", () => {
  expect(() => bible.replaceBetweenMarkers("no markers", "x")).toThrow("markers");
  expect(() => bible.replaceBetweenMarkers(`${bible.END}\n${bible.START}`, "x")).toThrow("markers");
});
