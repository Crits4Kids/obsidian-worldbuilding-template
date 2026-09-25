const { test, expect } = require("bun:test");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "../../..");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("every enabled community plugin is vendored", () => {
  for (const id of json(".obsidian/community-plugins.json")) expect(existsSync(join(ROOT, ".obsidian/plugins", id, "main.js"))).toBe(true);
});

test("Templater folder templates point at real templates and folders", () => {
  const t = json(".obsidian/plugins/templater-obsidian/data.json");
  expect(t.templates_folder).toBe("_System/Templates");
  expect(t.user_scripts_folder).toBe("_System/Scripts/templater");
  expect(t.data_version).toBe(2);
  expect(t.trigger_on_file_creation).toBeUndefined();
  for (const f of t.ignore_folders_on_creation) expect(typeof f.folder).toBe("string");
  for (const ft of t.folder_templates) {
    expect(existsSync(join(ROOT, ft.folder))).toBe(true);
    expect(existsSync(join(ROOT, ft.template))).toBe(true);
  }
});

test("QuickAdd macros point at real scripts", () => {
  const q = json(".obsidian/plugins/quickadd/data.json");
  expect(q.choices.length).toBe(9);
  for (const c of q.choices) for (const cmd of c.macro.commands) expect(existsSync(join(ROOT, cmd.path))).toBe(true);
});

test("appearance enables Minimal and every snippet exists", () => {
  const a = json(".obsidian/appearance.json");
  expect(a.cssTheme).toBe("Minimal");
  for (const s of a.enabledCssSnippets) expect(existsSync(join(ROOT, ".obsidian/snippets", `${s}.css`))).toBe(true);
});
