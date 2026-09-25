// Pure Markdown helpers shared by every command.
const FM = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function splitFrontmatter(text) {
  const m = String(text).match(FM);
  if (!m) return { frontmatter: "", yaml: "", body: String(text) };
  return { frontmatter: m[0], yaml: m[1], body: text.slice(m[0].length) };
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}

function sectionRange(body, heading) {
  const lines = body.split("\n");
  const want = heading.trim().toLowerCase();
  const start = lines.findIndex((l) => /^##\s+/.test(l) && l.replace(/^##\s+/, "").trim().toLowerCase() === want);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^#{1,2}\s/.test(lines[i])) { end = i; break; }
  return { lines, start, end };
}

function extractSection(body, heading) {
  const r = sectionRange(body, heading);
  return r ? r.lines.slice(r.start + 1, r.end).join("\n").trim() : "";
}

function addConnection(body, link) {
  const item = `- ${link}`;
  const r = sectionRange(body, "Connections");
  if (!r) return `${body.replace(/\s*$/, "")}\n\n## Connections\n${item}\n`;
  if (r.lines.slice(r.start + 1, r.end).some((l) => l.trim() === item)) return body;
  let at = r.end;
  while (at > r.start + 1 && r.lines[at - 1].trim() === "") at--;
  return [...r.lines.slice(0, at), item, ...r.lines.slice(at)].join("\n");
}

function safeName(name) {
  return String(name ?? "").replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/\s+/g, " ").trim();
}

function linkTarget(inner) {
  return String(inner).split("|")[0].split("#")[0].replace(/\\$/, "").trim();
}

function linkName(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return linkName(v[0]);
  const s = String(v);
  const m = s.match(/\[\[([^\]]+)\]\]/);
  return m ? linkTarget(m[1]) : s.trim();
}

function escapeCell(s) {
  return String(s).replace(/(?<!\\)\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function oneLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

module.exports = { splitFrontmatter, fill, extractSection, addConnection, safeName, linkTarget, linkName, escapeCell, oneLine };
