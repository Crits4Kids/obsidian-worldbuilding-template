// Turns a GM note into a player-safe copy for the shared Foundry folder.
const { linkTarget } = require("./markdown");
const { toYaml } = require("./yaml");

const KEEP_KEYS = ["title", "subtitle", "infobox", "image", "type", "tags"];
const depth = (line) => ((line.match(/^(\s*>)+/) || [""])[0].match(/>/g) || []).length;
const GM = /^(\s*>)+\s*\[!gm\]/i;

// Code is masked first so `%%` inside code blocks or inline code is never treated as a comment.
function maskCode(text) {
  const saved = [];
  const masked = text.replace(/```[\s\S]*?```|`[^`\n]*`/g, (m) => { saved.push(m); return `\u0000${saved.length - 1}\u0000`; });
  return { masked, restore: (s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)]) };
}

function stripSecrets(body) {
  const { masked, restore } = maskCode(String(body));
  // Paired %%comments%%, then an unclosed %% which Obsidian hides to the end of the note.
  const text = masked.replace(/%%[\s\S]*?%%/g, "").replace(/%%[\s\S]*$/, "");
  const out = [];
  let skipDepth = 0;
  for (const line of text.split("\n")) {
    if (skipDepth) {
      if (depth(line) >= skipDepth) continue;
      // An unquoted, non-blank line straight after a quoted one is a lazy continuation of the callout.
      if (depth(line) === 0 && line.trim() !== "") continue;
      skipDepth = 0;
    }
    if (GM.test(line)) { skipDepth = depth(line); continue; }
    out.push(line);
  }
  return restore(out.join("\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n"));
}

const isAsset = (name) => /\.(?!md$)[a-z0-9]+$/i.test(name);

function unlinkUnshared(body, shared) {
  return String(body).replace(/(!?)\[\[([^\]]+)\]\]/g, (all, bang, inner) => {
    const target = linkTarget(inner);
    if (target === "") return all;
    const base = target.split("/").pop();
    if (isAsset(base)) return all;
    // Shared notes: drop any folder path so the link resolves inside the Player Handouts import.
    if (shared.has(base)) return `${bang}[[${inner.replace(/^[^|#]*?(?=\\?[|#]|$)/, base)}]]`;
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
