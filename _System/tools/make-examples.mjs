#!/usr/bin/env bun
// Generates example content with the vault's own note builder. Re-runnable; skips existing files.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const notes = require("../Scripts/lib/notes.js");
const schema = require("../Scripts/lib/schema.js");
const ROOT = join(import.meta.dir, "../..");

const body = (type, subtype) => {
  for (const p of notes.bodyFile(type, subtype)) if (existsSync(join(ROOT, p))) return readFileSync(join(ROOT, p), "utf8");
  throw new Error(`no body for ${type}`);
};
const C = "Example Campaign";
const ex = { tags: ["example"], campaigns: [`[[${C}]]`] };
const items = [
  [{ type: "campaign", name: C, summary: "A sample campaign. Delete with WB: Remove example content.", fields: { active: true, system: "Any" }, tags: ["example"] }, `Campaigns/${C}`],
  [{ type: "arc", name: "Arc 1 - The Wrong Tide", summary: "The party learns why the bell rings.", fields: { campaign: `[[${C}]]`, order: 1 }, ...ex }, `Campaigns/${C}/Arcs`],
  [{ type: "session", name: `${C} Session 1`, summary: "The party arrives in Rivertown.", fields: { campaign: `[[${C}]]`, session_number: 1, date: "2026-01-01" }, vars: { carried: "- " }, ...ex }, `Campaigns/${C}/Sessions`],
  [{ type: "person", subtype: "npc", name: "Mira Vell", summary: "Harbormaster of Rivertown.", fields: { role: "Harbormaster", location: "[[Rivertown]]", faction: ["[[Tide Court]]"] }, connections: ["[[Rivertown]]", "[[Tide Court]]"], ...ex }],
  [{ type: "group", subtype: "power", name: "Tide Court", summary: "The council that rules the delta.", fields: { leader: "[[Mira Vell]]", headquarters: "[[Rivertown]]" }, ...ex }],
  [{ type: "place", subtype: "settlement", name: "Rivertown", summary: "A free trading city on a river delta.", share: true, fields: { ruler: "[[Tide Court]]", population: 12000 }, ...ex }],
  [{ type: "thing", subtype: "key_item", name: "The Bell Key", summary: "Opens the drowned bell tower.", fields: { owner: "[[Mira Vell]]" }, ...ex }],
  [{ type: "lore", subtype: "deity", name: "The Drowned Mother", summary: "River goddess whose bells call the tide.", ...ex }],
  [{ type: "plot", subtype: "clock", name: "The Rising Water", summary: "Floods reach Rivertown's lower quarter.", fields: { owner: "[[Tide Court]]", stage: 1, max_stage: 6 }, ...ex }],
  [{ type: "plot", subtype: "hook", name: "Bell at High Tide", summary: "The bell rang when it should not have.", ...ex }],
  [{ type: "microsetting", name: "Example Micro-setting", summary: "Shows the Deck of Worlds stack layout.", fields: { region_card: "Swamp" },
     vars: { cards_table: "| Card | Text | Became |\n|---|---|---|\n| Region | Swamp | — |\n| Landmark | _your card text_ | [[Rivertown]] |" }, ...ex }],
  [{ type: "toolkit", name: "House Rules", summary: "Table rules and rulings.", fields: {} }],
  [{ type: "toolkit", name: "Run Sheet", summary: "Checklist for the next session.", fields: {} }],
  [{ type: "map", name: "World Map", summary: "Leaflet map of the world.", fields: {} }],
];
for (const [spec, folder] of items) {
  if ((spec.tags || []).includes("example")) spec.fields = { ...(spec.fields || {}), status: "background" };
  const dir = folder ?? schema.folderFor(spec.type);
  const path = join(ROOT, dir, `${spec.name}.md`);
  if (existsSync(path)) { console.log(`skip ${dir}/${spec.name}.md`); continue; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, notes.buildNote(spec, body(spec.type, spec.subtype)));
  console.log(`wrote ${dir}/${spec.name}.md`);
}
