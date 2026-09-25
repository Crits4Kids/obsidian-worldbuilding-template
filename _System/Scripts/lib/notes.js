// Builds new notes (frontmatter + body skeleton + infobox) and reports note health.
const schema = require("./schema");
const { toYaml } = require("./yaml");
const { fill, addConnection, splitFrontmatter } = require("./markdown");
const { renderInfobox, upsertInfobox, readInfobox } = require("./infobox");

const BODIES = "_System/Templates/Bodies";
const clone = (v) => (Array.isArray(v) ? [...v] : v);
// Charted Roots only charts people with a cr_id; same shape it generates itself (abc-123-def-456).
const pick = (chars, n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
const crId = () => `${pick("abcdefghijklmnopqrstuvwxyz", 3)}-${pick("0123456789", 3)}-${pick("abcdefghijklmnopqrstuvwxyz", 3)}-${pick("0123456789", 3)}`;

function buildFrontmatter({ type, subtype, name, summary = "", campaigns = [], share, fields = {}, tags = [] }) {
  const def = schema.TYPES[type];
  if (!def) throw new Error(`Unknown type: ${type}`);
  const fm = { title: name, subtitle: "", infobox: "", image: "", type };
  const sk = schema.subtypeKey(type);
  if (sk) {
    if (!def.subtypes.includes(subtype)) throw new Error(`Unknown ${sk}: ${subtype}`);
    fm[sk] = subtype;
  }
  Object.assign(fm, {
    status: "active", campaigns: [...campaigns], summary,
    share: share ?? schema.DEFAULT_SHARE[type] ?? false, aliases: [], tags: [type, ...tags],
  });
  if (type === "person") Object.assign(fm, { cr_id: crId(), cr_type: "person", name });
  const defaults = { ...(def.fields || {}), ...((def.subtypeFields || {})[subtype] || {}) };
  for (const [k, v] of Object.entries(defaults)) fm[k] = clone(v);
  return Object.assign(fm, fields);
}

function buildNote(spec, bodyTemplate) {
  const fm = buildFrontmatter(spec);
  let body = fill(bodyTemplate, { name: spec.name, intro: "", ...(spec.vars || {}) });
  for (const c of spec.connections || []) body = addConnection(body, c);
  body = upsertInfobox(body, renderInfobox(fm, spec.name));
  return `---\n${toYaml(fm)}\n---\n${body.endsWith("\n") ? body : `${body}\n`}`;
}

const bodyFile = (type, subtype) => [...(subtype ? [`${BODIES}/${type}-${subtype}.md`] : []), `${BODIES}/${type}.md`];
const nextSessionNumber = (nums) => nums.map(Number).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0) + 1;
const sessionName = (campaign, n) => `${campaign} Session ${n}`;

function noteIssues(fm, text, name) {
  const issues = [];
  if (!fm || !fm.type) return ["no type"];
  if (!fm.summary || String(fm.summary).trim() === "") issues.push("missing summary");
  const box = readInfobox(splitFrontmatter(text).body);
  if (box === null) issues.push("infobox missing");
  else if (box !== renderInfobox(fm, name)) issues.push("infobox out of date");
  return issues;
}

module.exports = { buildFrontmatter, buildNote, bodyFile, nextSessionNumber, sessionName, noteIssues, BODIES };
