const { test, expect } = require("bun:test");
const deck = require("../../Scripts/lib/deck.js");

const cards = [
  { slot: "landmark", kind: "place", text: "A drowned bell tower. It still rings at low tide.", noteName: "The Drowned Bell" },
  { slot: "namesake", kind: "person", text: "Named for Sister Wren.", noteName: "Sister Wren" },
  { slot: "origin", kind: "existing", text: "Built by the Tide Court.", noteName: "Tide Court" },
  { slot: "advent", kind: "hook", text: "The bell rang at high tide.", noteName: "The Wrong Tide" },
];

test("planStack creates notes, links neighbours and the stack note", () => {
  const plan = deck.planStack({ name: "Saltmarsh Bell", biome: "Swamp", cards });
  expect(plan.notes.map((n) => [n.type, n.subtype, n.name])).toEqual([
    ["place", "landmark", "The Drowned Bell"], ["person", "npc", "Sister Wren"], ["plot", "hook", "The Wrong Tide"],
  ]);
  expect(plan.notes[0].summary).toBe("A drowned bell tower.");
  expect(plan.notes[0].connections).toEqual(["[[Saltmarsh Bell]] (micro-setting: landmark)", "[[Sister Wren]]"]);
  expect(plan.notes[1].connections).toEqual(["[[Saltmarsh Bell]] (micro-setting: namesake)", "[[The Drowned Bell]]", "[[Tide Court]]"]);
  expect(plan.notes[0].vars.intro).toBe("> [!quote] Deck of Worlds: landmark\n> A drowned bell tower. It still rings at low tide.\n\n");
  expect(plan.links).toEqual([{ name: "Tide Court", connection: "[[Saltmarsh Bell]] (micro-setting: origin)" }]);
  const ms = plan.microsetting;
  expect(ms).toMatchObject({ type: "microsetting", name: "Saltmarsh Bell", fields: { region_card: "Swamp",
    cards: ["[[The Drowned Bell]]", "[[Sister Wren]]", "[[Tide Court]]", "[[The Wrong Tide]]"] } });
  expect(ms.vars.cards_table).toContain("| Attribute | — | — |");
  expect(ms.vars.cards_table).toContain("| Origin | Built by the Tide Court. | [[Tide Court]] |");
});

test("planStack rejects duplicate or empty names, and no cards", () => {
  expect(() => deck.planStack({ name: "X", biome: "Swamp", cards: [cards[0], { ...cards[1], noteName: "The Drowned Bell" }] })).toThrow("twice");
  expect(() => deck.planStack({ name: "X", biome: "Swamp", cards: [{ ...cards[0], noteName: " " }] })).toThrow("name");
  expect(() => deck.planStack({ name: "X", biome: "Swamp", cards: [] })).toThrow("at least one");
});

test("summarize takes the first sentence and caps length", () => {
  expect(deck.summarize("One. Two.")).toBe("One.");
  expect(deck.summarize("x".repeat(200)).length).toBe(140);
});

test("planStack rejects a card named like the micro-setting, and case-only duplicates", () => {
  expect(() => deck.planStack({ name: "Harbor", biome: "Coast", cards: [{ ...cards[0], noteName: "Harbor" }] })).toThrow("twice");
  expect(() => deck.planStack({ name: "X", biome: "Coast", cards: [cards[0], { ...cards[1], kind: "place", noteName: "the drowned bell" }] })).toThrow("twice");
});
