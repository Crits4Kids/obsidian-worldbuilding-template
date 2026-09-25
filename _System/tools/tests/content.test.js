const { test, expect } = require("bun:test");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "../../..");
const schema = require("../../Scripts/lib/schema.js");

test("the shipped vault validates with zero errors", async () => {
  const { validateVault } = await import("../validate.mjs");
  const { errors } = validateVault(ROOT);
  expect(errors).toEqual([]);
});

test("CLAUDE.md points the AI at the World Bible first", () => {
  const t = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  expect(t).toContain("World Bible.md");
  expect(t).toContain("_System/Schema.md");
});

test("Schema.md documents every type and subtype", () => {
  const t = readFileSync(join(ROOT, "_System/Schema.md"), "utf8");
  for (const [type, def] of Object.entries(schema.TYPES)) {
    expect(t).toContain(`\`${type}\``);
    for (const s of def.subtypes || []) expect(t).toContain(s);
  }
});

test("there is one Base per family", () => {
  const bases = readdirSync(join(ROOT, "_System/Bases"));
  for (const def of Object.values(schema.FAMILIES)) expect(bases).toContain(`${def.label}.base`);
});
