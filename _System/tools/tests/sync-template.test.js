const { test, expect } = require("bun:test");
const { join } = require("node:path");
test("sync-template.sh behaves", () => {
  const r = Bun.spawnSync(["bash", join(__dirname, "sync-template.test.sh")]);
  expect(r.stdout.toString() + r.stderr.toString()).toContain("PASS");
  expect(r.exitCode).toBe(0);
});
