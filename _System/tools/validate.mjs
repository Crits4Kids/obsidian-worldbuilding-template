#!/usr/bin/env bun
// Checks every content note against the vault schema. Usage: bun _System/tools/validate.mjs [vaultRoot]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const schema = require("../Scripts/lib/schema.js");
const { splitFrontmatter } = require("../Scripts/lib/markdown.js");
const { noteIssues } = require("../Scripts/lib/notes.js");
const { START, END } = require("../Scripts/lib/bible.js");

const CODE = /^```(dataview|dataviewjs|leaflet)\b|<%/m;
const STATUSES = ["active", "background", "archived"];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith(".md") ? [join(dir, d.name)] : []);
}

export function validateVault(root) {
  const errors = [];
  const warnings = [];
  const biblePath = join(root, "World Bible.md");
  if (!existsSync(biblePath)) errors.push("World Bible.md: missing");
  else {
    const t = readFileSync(biblePath, "utf8");
    if (t.indexOf(START) === -1 || t.indexOf(END) < t.indexOf(START)) errors.push("World Bible.md: index markers missing or out of order");
  }
  for (const r of schema.CONTENT_ROOTS) {
    if (!existsSync(join(root, r))) continue;
    for (const abs of walk(join(root, r))) {
      const rel = relative(root, abs).split("\\").join("/");
      const depth = rel.split("/").length - 1;
      if (depth > 3) errors.push(`${rel}: folder depth ${depth} exceeds 3 (Foundry import limit)`);
      const text = readFileSync(abs, "utf8");
      const { frontmatter, yaml, body } = splitFrontmatter(text);
      if (!frontmatter) { errors.push(`${rel}: no frontmatter`); continue; }
      let fm;
      try { fm = Bun.YAML.parse(yaml) || {}; } catch (e) { errors.push(`${rel}: invalid YAML (${e.message})`); continue; }
      const name = rel.split("/").pop().replace(/\.md$/, "");
      if (!schema.TYPES[fm.type]) { errors.push(`${rel}: unknown type ${JSON.stringify(fm.type)}`); continue; }
      const allowed = schema.typesForPath(rel);
      if (allowed.length && !allowed.includes(fm.type)) errors.push(`${rel}: type ${fm.type} not allowed here (expected ${allowed.join(" or ")})`);
      if (!fm.title) errors.push(`${rel}: missing title`);
      if (!STATUSES.includes(fm.status)) errors.push(`${rel}: status must be one of ${STATUSES.join(", ")}`);
      if (r === "Archive" && fm.status !== "archived") warnings.push(`${rel}: in Archive/ but status is ${fm.status}`);
      const sk = schema.subtypeKey(fm.type);
      if (sk && !schema.FAMILIES[fm.type].subtypes.includes(fm[sk])) errors.push(`${rel}: ${sk} must be one of ${schema.FAMILIES[fm.type].subtypes.join(", ")}`);
      if (CODE.test(body)) errors.push(`${rel}: plugin code in a content note`);
      for (const issue of noteIssues(fm, text, name)) {
        if (issue === "infobox missing") errors.push(`${rel}: infobox missing (run "WB: Refresh infobox")`);
        else warnings.push(`${rel}: ${issue}`);
      }
    }
  }
  return { errors, warnings };
}

if (import.meta.main) {
  const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "../..");
  const { errors, warnings } = validateVault(root);
  for (const w of warnings) console.log(`warn  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
