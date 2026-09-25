const { test, expect } = require("bun:test");
const { renderInfobox, upsertInfobox, readInfobox } = require("../../Scripts/lib/infobox.js");

const place = {
  title: "Rivertown", subtitle: "Free city", infobox: "City-state", image: "[[Assets/rivertown.jpg]]",
  type: "place", place_type: "settlement", status: "active", campaigns: [], summary: "x", share: false,
  aliases: [], tags: ["place"], region: "[[Sorn Delta]]", ruler: "[[Mira Vell|the Harbormaster]]",
  population: 12000, map: "", location: [10, 20],
};

test("renders title, subtitle, image, header and visible fields only", () => {
  expect(renderInfobox(place, "Rivertown")).toBe([
    "> [!infobox]+ Rivertown",
    "> *Free city*",
    "> ![[Assets/rivertown.jpg]]",
    "> ###### City-state",
    ">",
    "> | | |",
    "> |---|---|",
    "> | **Type** | Settlement |",
    "> | **Region** | [[Sorn Delta]] |",
    "> | **Ruler** | [[Mira Vell\\|the Harbormaster]] |",
    "> | **Population** | 12000 |",
  ].join("\n"));
});

test("unquoted YAML links (nested arrays) render as links", () => {
  const out = renderInfobox({ type: "person", person_type: "npc", father: [["Old Tom"]], children: [[["A"]], [["B"]]] }, "Kid");
  expect(out).toContain("> | **Father** | [[Old Tom]] |");
  expect(out).toContain("> | **Children** | [[A]], [[B]] |");
});

test("Chronicler layout: alias, group, header above, separator below", () => {
  const fm = {
    type: "group", group_type: "power", leader: "[[Queen Ysolde]]", goal: "Hold the delta",
    allies_north: "[[Frost Clans]]", allies_south: "[[Reed Folk]]",
    layout: [
      { type: "alias", keys: ["leader"], text: "Sovereign" },
      { type: "header", text: "Allies", above: "allies_north" },
      { type: "group", keys: ["allies_north", "allies_south"] },
      { type: "separator", below: ["goal"] },
    ],
  };
  expect(renderInfobox(fm, "Tide Court")).toBe([
    "> [!infobox]+ Tide Court",
    ">",
    "> | | |",
    "> |---|---|",
    "> | **Type** | Power |",
    "> | **Sovereign** | [[Queen Ysolde]] |",
    "> | **Goal** | Hold the delta |",
    ">",
    "> ---",
    ">",
    "> ###### Allies",
    ">",
    "> | | |",
    "> |---|---|",
    "> | **Allies north / Allies south** | [[Frost Clans]] / [[Reed Folk]] |",
  ].join("\n"));
});

test("image lists become a gallery with captions", () => {
  const out = renderInfobox({ type: "place", image: [["day.jpg", "Day"], ["night.jpg", "Night"]] }, "X");
  expect(out).toContain("> > [!gallery]\n> > ![[day.jpg]]\n> > *Day*\n> > ![[night.jpg]]\n> > *Night*");
});

test("hidden keys never render: cr_*, name, fc-category, place location", () => {
  const out = renderInfobox({ type: "person", person_type: "pc", cr_id: "abc", cr_type: "person", name: "Kid", born: "1450-01-01" }, "Kid");
  expect(out).not.toContain("cr_");
  expect(out).not.toContain("**Name**");
  expect(out).toContain("> | **Born** | 1450-01-01 |");
});

test("upsertInfobox inserts at top, then replaces in place", () => {
  const body = "Intro line.\n\n## Connections\n";
  const first = upsertInfobox(body, "> [!infobox]+ A\n> x");
  expect(first).toBe("> [!infobox]+ A\n> x\n\nIntro line.\n\n## Connections\n");
  const second = upsertInfobox(first, "> [!infobox]+ A\n> y\n> z");
  expect(second).toBe("> [!infobox]+ A\n> y\n> z\n\nIntro line.\n\n## Connections\n");
  expect(readInfobox(second)).toBe("> [!infobox]+ A\n> y\n> z");
  expect(readInfobox("No box")).toBe(null);
});

test("upsertInfobox keeps a blank line before following text", () => {
  expect(upsertInfobox("> [!infobox]+ A\n> x\nText", "> [!infobox]+ A\n> y")).toBe("> [!infobox]+ A\n> y\n\nText");
});

test("pc and npc subtypes render as acronyms", () => {
  expect(renderInfobox({ type: "person", person_type: "npc" }, "A")).toContain("> | **Type** | NPC |");
  expect(renderInfobox({ type: "person", person_type: "pc" }, "A")).toContain("> | **Type** | PC |");
});
