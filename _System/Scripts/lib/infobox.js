// Renders Chronicler-style infoboxes from frontmatter as a static [!infobox] callout.
const { HIDDEN_KEYS, HIDDEN_BY_TYPE, LABELS, subtypeKey } = require("./schema");
const { escapeCell } = require("./markdown");

const toList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const isEmpty = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.every(isEmpty));

function humanize(key) {
  const s = String(key).replace(/^fc-/, "").replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Unquoted `[[X]]` in YAML parses as [["X"]]; depth tracks that nesting.
function formatValue(v, depth = 0) {
  if (isEmpty(v)) return "";
  if (Array.isArray(v)) {
    if (depth >= 1 && v.length === 1 && typeof v[0] === "string") return `[[${v[0]}]]`;
    return v.map((x) => formatValue(x, depth + 1)).filter(Boolean).join(", ");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v).trim();
}

function imageList(image) {
  if (isEmpty(image)) return [];
  if (!Array.isArray(image)) return [{ file: String(image) }];
  return image.filter((x) => !isEmpty(x)).map((x) => (Array.isArray(x) ? { file: String(x[0]), caption: x[1] } : { file: String(x) }));
}

function imageRef(file) {
  const m = String(file).trim().match(/^!?\[\[(.+?)\]\]$/);
  return `![[${m ? m[1] : String(file).trim()}]]`;
}

function renderImages(image) {
  const list = imageList(image);
  if (list.length === 0) return [];
  if (list.length === 1) return [`> ${imageRef(list[0].file)}`, ...(list[0].caption ? [`> *${list[0].caption}*`] : [])];
  const out = ["> > [!gallery]"];
  for (const i of list) {
    out.push(`> > ${imageRef(i.file)}`);
    if (i.caption) out.push(`> > *${i.caption}*`);
  }
  return out;
}

function renderInfobox(fm, name) {
  fm = fm || {};
  const hidden = new Set([...HIDDEN_KEYS, ...(HIDDEN_BY_TYPE[fm.type] || [])]);
  const layout = Array.isArray(fm.layout) ? fm.layout.filter(Boolean) : [];
  const sk = subtypeKey(fm.type);
  const aliases = {};
  for (const r of layout) if (r.type === "alias") for (const k of toList(r.keys)) aliases[k] = r.text;
  const label = (k) => aliases[k] ?? LABELS[k] ?? (k === sk ? "Type" : humanize(k));
  const value = (k) => (k === sk && fm[k] ? humanize(fm[k]) : formatValue(fm[k]));

  const keys = Object.keys(fm).filter((k) => !hidden.has(k) && !k.startsWith("cr_"));
  const groupAt = new Map();
  const inGroup = new Set();
  for (const r of layout.filter((r) => r.type === "group")) {
    const ks = toList(r.keys).filter((k) => keys.includes(k)).sort((a, b) => keys.indexOf(a) - keys.indexOf(b));
    if (ks.length) { groupAt.set(ks[0], ks); ks.forEach((k) => inGroup.add(k)); }
  }

  const rows = [];
  for (const k of keys) {
    if (inGroup.has(k) && !groupAt.has(k)) continue;
    const ks = groupAt.get(k) || [k];
    const vals = ks.map(value);
    if (vals.every((v) => v === "")) continue;
    rows.push({ keys: ks, label: ks.map(label).join(" / "), value: vals.map((v) => v || "—").join(" / ") });
  }

  const markers = layout.filter((r) => r.type === "header" || r.type === "separator");
  const used = new Set();
  const pick = (row, side) => markers.filter((r) => !used.has(r) && toList(r[side]).some((k) => row.keys.includes(k)));

  const out = [`> [!infobox]+ ${fm.title || name}`];
  if (!isEmpty(fm.subtitle)) out.push(`> *${formatValue(fm.subtitle)}*`);
  out.push(...renderImages(fm.image));
  if (!isEmpty(fm.infobox)) out.push(`> ###### ${formatValue(fm.infobox)}`);

  let table = [];
  const flush = () => {
    if (!table.length) return;
    out.push(">", "> | | |", "> |---|---|", ...table);
    table = [];
  };
  const marker = (r) => {
    used.add(r);
    flush();
    out.push(">", r.type === "header" ? `> ###### ${r.text}` : "> ---");
  };
  for (const row of rows) {
    pick(row, "above").forEach(marker);
    table.push(`> | **${escapeCell(row.label)}** | ${escapeCell(row.value)} |`);
    pick(row, "below").forEach(marker);
  }
  flush();
  return out.join("\n");
}

function blockRange(lines) {
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || !/^>\s*\[!infobox\]/i.test(lines[i])) return null;
  let j = i;
  while (j < lines.length && lines[j].startsWith(">")) j++;
  return { i, j };
}

function readInfobox(body) {
  const lines = String(body).split("\n");
  const r = blockRange(lines);
  return r ? lines.slice(r.i, r.j).join("\n") : null;
}

function upsertInfobox(body, block) {
  const lines = String(body).split("\n");
  const r = blockRange(lines);
  if (!r) return `${block}\n\n${String(body).replace(/^\s*\n/, "")}`;
  const rest = lines.slice(r.j);
  if (rest.length && rest[0].trim() !== "") rest.unshift("");
  return [...lines.slice(0, r.i), ...block.split("\n"), ...rest].join("\n");
}

module.exports = { renderInfobox, upsertInfobox, readInfobox, formatValue, humanize };
