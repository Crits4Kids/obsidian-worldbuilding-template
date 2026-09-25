const { test, expect } = require("bun:test");
const h = require("../../Scripts/lib/handouts.js");

test("strips gm callouts of any case, fold state and nesting, plus %% comments", () => {
  const body = [
    "Public.", "> [!gm]- Secret", "> hidden 1", "", "Still public. %%inline secret%%",
    "> [!note] Note", "> keep", "> > [!GM]+ nested", "> > hidden 2", "> after nested", "",
    "%%", "block secret", "%%", "End.",
  ].join("\n");
  const out = h.stripSecrets(body);
  expect(out).not.toContain("hidden");
  expect(out).not.toContain("secret");
  expect(out).toContain("> [!note] Note\n> keep\n> after nested");
  expect(out).toContain("Public.");
  expect(out).toContain("End.");
});

test("links to unshared notes become plain text; shared, asset and self links stay", () => {
  const shared = new Set(["Rivertown"]);
  const body = "[[Rivertown]] [[Mira Vell|the Harbormaster]] [[World/People/Ansel]] ![[Secret Map]] ![[Assets/r.jpg]] [[#Heading]] [[Mira Vell\\|alias]]";
  expect(h.unlinkUnshared(body, shared)).toBe("[[Rivertown]] the Harbormaster Ansel  ![[Assets/r.jpg]] [[#Heading]] alias");
});

test("makeHandout keeps only display frontmatter", () => {
  const out = h.makeHandout({ title: "Rivertown", type: "place", summary: "secret-ish", share: true, tags: ["place"], ruler: "[[X]]" },
    "Body [[X]]\n> [!gm] s\n> x\n", new Set());
  expect(out).toBe("---\ntitle: Rivertown\ntype: place\ntags: [place]\n---\nBody X\n");
});

test("an unclosed %% hides the rest of the note, as in Obsidian", () => {
  expect(h.stripSecrets("Public\n%%\nGM notes forever")).toBe("Public\n");
});

test("lazy continuation lines of a gm callout are stripped", () => {
  expect(h.stripSecrets("Intro\n> [!gm] Secret\n> The duke is a vampire\nand he killed the king.\n\nAfter")).toBe("Intro\n\nAfter");
});

test("%% inside code is not treated as a comment", () => {
  const body = "```\n%% x\n```\nkeep `%%` this";
  expect(h.stripSecrets(body)).toBe(body);
});

test("links to shared notes are normalised to the bare name", () => {
  const shared = new Set(["Mira Vell"]);
  expect(h.unlinkUnshared("[[World/People/Mira Vell]] [[World/People/Mira Vell|Mira]]", shared)).toBe("[[Mira Vell]] [[Mira Vell|Mira]]");
});
