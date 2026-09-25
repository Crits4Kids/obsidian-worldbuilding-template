const { test, expect } = require("bun:test");
const md = require("../../Scripts/lib/markdown.js");

test("splitFrontmatter separates fences, yaml and body", () => {
  const r = md.splitFrontmatter("---\na: 1\n---\nBody\n");
  expect(r).toEqual({ frontmatter: "---\na: 1\n---\n", yaml: "a: 1", body: "Body\n" });
  expect(md.splitFrontmatter("No fm").frontmatter).toBe("");
});

test("fill replaces known and blanks unknown placeholders", () => {
  expect(md.fill("{{name}} {{missing}}!", { name: "Rivertown" })).toBe("Rivertown !");
});

test("extractSection returns text under an h2 until the next heading", () => {
  const body = "## Recap\nx\n## Loose threads\n- a\n- b\n\n## Connections\n- [[Z]]\n";
  expect(md.extractSection(body, "Loose threads")).toBe("- a\n- b");
  expect(md.extractSection(body, "Nope")).toBe("");
});

test("addConnection appends once, creating the section if needed", () => {
  const withSection = "Text\n\n## Connections\n- [[A]]\n\n## Stats\n";
  const once = md.addConnection(withSection, "[[B]]");
  expect(once).toBe("Text\n\n## Connections\n- [[A]]\n- [[B]]\n\n## Stats\n");
  expect(md.addConnection(once, "[[B]]")).toBe(once);
  expect(md.addConnection("Text\n", "[[B]]")).toBe("Text\n\n## Connections\n- [[B]]\n");
});

test("safeName strips characters Obsidian cannot use in file names", () => {
  expect(md.safeName('  The #1 "Best" [Inn]: a/b?  ')).toBe("The 1 Best Inn ab");
});

test("linkName normalises link shapes", () => {
  expect(md.linkName("[[Mira Vell|the Harbormaster]]")).toBe("Mira Vell");
  expect(md.linkName([["Old Tom"]])).toBe("Old Tom");
  expect(md.linkName("Plain")).toBe("Plain");
  expect(md.linkName(null)).toBe("");
});

test("escapeCell escapes pipes and newlines", () => {
  expect(md.escapeCell("[[A|B]] or C|D\nE")).toBe("[[A\\|B]] or C\\|D<br>E");
  expect(md.escapeCell("[[A\\|B]]")).toBe("[[A\\|B]]");
});
