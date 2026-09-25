const { test, expect } = require("bun:test");
const b = require("../../Scripts/lib/backup.js");

const cfg = (url) => `[core]\n\tbare = false\n[remote "origin"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`;

test("originUrl reads the origin remote from .git/config", () => {
  expect(b.originUrl(cfg("git@github.com:me/my-game.git"))).toBe("git@github.com:me/my-game.git");
  expect(b.originUrl("[core]\n\tbare = false\n")).toBe(null);
});

test("isTemplateRemote matches the template over https and ssh, any case, with or without .git", () => {
  for (const u of ["https://github.com/Crits4Kids/obsidian-worldbuilding-template.git", "https://github.com/crits4kids/obsidian-worldbuilding-template",
    "git@github.com:Crits4Kids/obsidian-worldbuilding-template.git", "ssh://git@github.com/Crits4Kids/obsidian-worldbuilding-template"]) {
    expect(b.isTemplateRemote(u)).toBe(true);
  }
  expect(b.isTemplateRemote("https://github.com/Crits4Kids/obsidian-worldbuilding-template-game.git")).toBe(false);
  expect(b.isTemplateRemote("git@github.com:me/my-game.git")).toBe(false);
});

test("withAutoBackup turns on 10-minute commit+push and keeps other settings", () => {
  expect(b.withAutoBackup({ autoSaveInterval: 0, commitMessage: "x", disablePush: true })).toEqual({
    autoSaveInterval: 10, differentIntervalCommitAndPush: false, autoPushInterval: 0, disablePush: false, autoPullOnBoot: true, commitMessage: "x",
  });
});
