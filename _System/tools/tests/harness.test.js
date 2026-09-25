const { test, expect } = require("bun:test");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "../../..");

test("vault skeleton folders exist", () => {
  for (const d of ["World/People", "World/Plot", "Campaigns", "Micro-settings", "Maps", "GM Toolkit",
    "Player Handouts", "Assets/Maps", "Archive", "_System/Scripts/lib", "_System/Templates/Bodies"]) {
    expect(existsSync(join(ROOT, d))).toBe(true);
  }
});
