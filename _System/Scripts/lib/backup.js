// Opt-in Obsidian Git auto-backup. The template ships with it off so a direct clone of the
// template repo can never auto-push into the template itself.
const TEMPLATE_REPO = "crits4kids/obsidian-worldbuilding-template";

function originUrl(gitConfig) {
  const m = String(gitConfig).match(/\[remote "origin"\][^[]*?\burl\s*=\s*(\S+)/);
  return m ? m[1] : null;
}

// Normalises https://host/owner/repo(.git), git@host:owner/repo(.git) and ssh://git@host/owner/repo to "owner/repo".
function repoPath(url) {
  const m = String(url).trim().match(/[:/]([^/:]+\/[^/]+?)(?:\.git)?\/?$/);
  return m ? m[1].toLowerCase() : "";
}

const isTemplateRemote = (url) => repoPath(url) === TEMPLATE_REPO;

function withAutoBackup(settings) {
  return { ...settings, autoSaveInterval: 10, differentIntervalCommitAndPush: false, autoPushInterval: 0, disablePush: false, autoPullOnBoot: true };
}

module.exports = { TEMPLATE_REPO, originUrl, repoPath, isTemplateRemote, withAutoBackup };
