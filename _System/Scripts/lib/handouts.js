// Turns a GM note into a player-safe copy for the shared Foundry folder.
const { linkTarget } = require("./markdown");
const { toYaml } = require("./yaml");

const KEEP_KEYS = ["title", "subtitle", "infobox", "image", "type", "tags"];
const depth = (line) => ((line.match(/^(\s*>)+/) || [""])[0].match(/>/g) || []).length;
const GM = /^(\s*>)+\s*\[!gm\]/i;

function stripSecrets(body) {
  const out = [];
  let skipDepth = 0;
  for (const line of String(body).replace(/%%[\s\S]*?%%/g, "").split("\n")) {
    if (skipDepth) {
      if (depth(line) >= skipDepth) continue;
      skipDepth = 0;
    }
    if (GM.test(line)) { skipDepth = depth(line); continue; }
    out.push(line);
  }
  return out.join("\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
}

const isAsset = (name) => /\.(?!md$)[a-z0-9]+$/i.test(name);

function unlinkUnshared(body, shared) {
  return String(body).replace(/(!?)\[\[([^\]]+)\]\]/g, (all, bang, inner) => {
    const target = linkTarget(inner);
    if (target === "") return all;
    const base = target.split("/").pop();
    if (isAsset(base) || shared.has(base)) return all;
    if (bang) return "";
    const pipe = inner.indexOf("|");
    return pipe === -1 ? base : inner.slice(pipe + 1);
  });
}

function makeHandout(fm, body, shared) {
  const keep = {};
  for (const k of KEEP_KEYS) if (fm[k] !== undefined && fm[k] !== null && fm[k] !== "") keep[k] = fm[k];
  const clean = unlinkUnshared(stripSecrets(body), shared).replace(/\s+$/, "");
  return `---\n${toYaml(keep)}\n---\n${clean}\n`;
}

module.exports = { KEEP_KEYS, stripSecrets, unlinkUnshared, makeHandout };
