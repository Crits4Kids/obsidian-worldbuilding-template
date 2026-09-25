// Plans the notes for one Deck of Worlds stack (Region + up to five cards). No card text ships with the vault.
const { escapeCell, oneLine } = require("./markdown");

const SLOTS = ["landmark", "namesake", "origin", "attribute", "advent"];
const BIOMES = ["Coast", "Desert", "Forest", "Hills", "Jungle", "Mountain", "Plains", "Swamp", "Tundra", "Underground", "Urban"];
const KINDS = {
  place: { type: "place", subtype: "landmark", label: "New place" },
  person: { type: "person", subtype: "npc", label: "New person" },
  group: { type: "group", subtype: "power", label: "New group" },
  lore: { type: "lore", subtype: "history", label: "New lore" },
  event: { type: "plot", subtype: "event", label: "New event" },
  hook: { type: "plot", subtype: "hook", label: "New plot hook" },
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function summarize(text, max = 140) {
  const one = oneLine(text);
  const m = one.match(/^.*?[.!?](?=\s|$)/);
  const first = m ? m[0] : one;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…`.slice(0, max) : first;
}

function planStack({ name, biome, cards }) {
  const used = (cards || []).filter((c) => c && c.kind !== "skip");
  if (!used.length) throw new Error("A micro-setting needs at least one card.");
  // Case-insensitive, and including the micro-setting itself: macOS/Windows file names ignore case.
  const seen = new Set([oneLine(name).toLowerCase()]);
  for (const c of used) {
    const n = oneLine(c.noteName);
    if (!n) throw new Error(`The ${c.slot} card needs a note name.`);
    if (seen.has(n.toLowerCase()) && c.kind !== "existing") throw new Error(`"${n}" is used twice in this stack.`);
    seen.add(n.toLowerCase());
  }
  const tag = (c) => `[[${name}]] (micro-setting: ${c.slot})`;
  const notes = [];
  const links = [];
  used.forEach((c, i) => {
    if (c.kind === "existing") { links.push({ name: c.noteName, connection: tag(c) }); return; }
    const k = KINDS[c.kind];
    if (!k) throw new Error(`Unknown card kind: ${c.kind}`);
    const connections = [tag(c)];
    if (i > 0) connections.push(`[[${used[i - 1].noteName}]]`);
    if (i < used.length - 1) connections.push(`[[${used[i + 1].noteName}]]`);
    const quoted = String(c.text).trim().split("\n").map((l) => `> ${l}`).join("\n");
    notes.push({ type: k.type, subtype: k.subtype, name: c.noteName, summary: summarize(c.text), connections,
      vars: { intro: `> [!quote] Deck of Worlds: ${c.slot}\n${quoted}\n\n` } });
  });
  const rows = SLOTS.map((slot) => {
    const c = used.find((x) => x.slot === slot);
    return c ? `| ${cap(slot)} | ${escapeCell(oneLine(c.text))} | [[${c.noteName}]] |` : `| ${cap(slot)} | — | — |`;
  });
  const microsetting = {
    type: "microsetting", name, summary: `Deck of Worlds micro-setting (${biome}).`,
    fields: { region_card: biome, cards: used.map((c) => `[[${c.noteName}]]`) },
    connections: used.map((c) => `[[${c.noteName}]]`),
    vars: { cards_table: [`| Card | Text | Became |`, `|---|---|---|`, `| Region | ${biome} | — |`, ...rows].join("\n") },
  };
  return { notes, links, microsetting };
}

module.exports = { SLOTS, BIOMES, KINDS, summarize, planStack };
