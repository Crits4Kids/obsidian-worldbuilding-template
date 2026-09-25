// Obsidian glue: prompts via a ui adapter, then calls the pure lib modules.
const schema = require("./schema");
const md = require("./markdown");
const notes = require("./notes");
const infobox = require("./infobox");
const bible = require("./bible");
const handouts = require("./handouts");
const deck = require("./deck");

const CANCEL = Symbol("cancel");
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const stamp = (d) => `${isoDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// ---------- ui adapters ----------
function uiFromQuickAdd(qa, obsidian) {
  const safe = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { return null; } };
  return {
    prompt: safe((h, v = "") => qa.inputPrompt(h, "", v)),
    wide: safe((h) => qa.wideInputPrompt(h)),
    suggest: safe((labels, values, placeholder) => qa.suggester(labels, values, placeholder)),
    confirm: safe((h, t) => qa.yesNoPrompt(h, t)),
    info: async (h, t) => {
      if (qa.infoDialog) return qa.infoDialog(h, t);
      if (obsidian && obsidian.Notice) return new obsidian.Notice(`${h}\n${t}`, 8000);
      console.log(h, t);
    },
  };
}

function uiFromTemplater(tp) {
  const safe = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { return null; } };
  return {
    prompt: safe((h, v = "") => tp.system.prompt(h, v, true)),
    wide: safe((h) => tp.system.prompt(h, "", true, true)),
    suggest: safe((labels, values, placeholder) => tp.system.suggester(labels, values, true, placeholder)),
    confirm: safe((h) => tp.system.suggester(["Yes", "No"], [true, false], true, h)),
    info: async (h, t) => console.log(h, t),
  };
}

// ---------- helpers ----------
async function ask(p) {
  const v = await p;
  if (v === null || v === undefined) throw CANCEL;
  return v;
}

const fmOf = (app, f) => (app.metadataCache.getFileCache(f) || {}).frontmatter || {};
const under = (app, roots) => app.vault.getMarkdownFiles().filter((f) => roots.some((r) => f.path.startsWith(`${r}/`)));
const ofType = (app, type) => under(app, schema.CONTENT_ROOTS).filter((f) => fmOf(app, f).type === type);

async function ensureFolder(app, path) {
  let cur = "";
  for (const part of path.split("/")) {
    cur = cur ? `${cur}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(cur)) await app.vault.createFolder(cur);
  }
}

async function readBody(app, type, subtype) {
  for (const p of notes.bodyFile(type, subtype)) if (await app.vault.adapter.exists(p)) return app.vault.adapter.read(p);
  throw new Error(`Missing body template for ${type} in ${notes.BODIES}`);
}

function assertFree(app, name) {
  const hit = app.metadataCache.getFirstLinkpathDest(name, "");
  if (hit) throw new Error(`A note named "${name}" already exists at ${hit.path}.`);
}

function cleanName(raw) {
  const name = md.safeName(raw);
  if (!name) throw new Error("That name is empty once characters Obsidian can't use in file names are removed.");
  return name;
}

async function createEntity(app, spec, folder) {
  assertFree(app, spec.name);
  const content = notes.buildNote(spec, await readBody(app, spec.type, spec.subtype));
  await ensureFolder(app, folder);
  return app.vault.create(`${folder}/${spec.name}.md`, content);
}

async function openFile(app, file) {
  if (app.workspace && app.workspace.getLeaf) await app.workspace.getLeaf(false).openFile(file);
}

const NEW_TYPES = ["person", "group", "place", "thing", "lore", "plot", "arc", "encounter", "rumor_table", "toolkit", "map"];

async function pickCampaign(ctx) {
  const all = ofType(ctx.app, "campaign");
  if (!all.length) throw new Error("There is no campaign yet. Run \"WB: New campaign\" first.");
  const active = all.filter((f) => fmOf(ctx.app, f).active === true);
  if (active.length === 1) return active[0].basename;
  return ask(ctx.ui.suggest(all.map((f) => f.basename), all.map((f) => f.basename), "Which campaign?"));
}

async function askSubtype(ctx, type) {
  const def = schema.FAMILIES[type];
  if (!def) return undefined;
  return ask(ctx.ui.suggest(def.subtypes.map((s) => infobox.humanize(s)), def.subtypes, `Kind of ${type}`));
}

// Prompts for everything a new note of `type` needs. Returns {spec, folder}.
async function specFor(ctx, type, { campaign } = {}) {
  const subtype = await askSubtype(ctx, type);
  if (type === "arc" && !campaign) campaign = await pickCampaign(ctx);
  const name = cleanName(await ask(ctx.ui.prompt(`Name of the new ${infobox.humanize(subtype || type)}`)));
  const summary = md.oneLine((await ctx.ui.prompt("One-line summary (for the World Bible), optional")) || "");
  const spec = { type, subtype, name, summary };
  if (campaign) Object.assign(spec, { campaigns: [`[[${campaign}]]`], fields: { campaign: `[[${campaign}]]` } });
  return { spec, folder: schema.folderFor(type, type === "campaign" ? name : campaign) };
}

async function sessionSpec(ctx, campaign) {
  const { app } = ctx;
  const sessions = ofType(app, "session").filter((f) => md.linkName(fmOf(app, f).campaign) === campaign);
  const n = notes.nextSessionNumber(sessions.map((f) => fmOf(app, f).session_number));
  const prev = sessions.find((f) => Number(fmOf(app, f).session_number) === n - 1);
  const carried = prev ? md.extractSection(md.splitFrontmatter(await app.vault.read(prev)).body, "Loose threads") : "";
  const spec = {
    type: "session", name: notes.sessionName(campaign, n), campaigns: [`[[${campaign}]]`],
    fields: { campaign: `[[${campaign}]]`, session_number: n, date: isoDate(ctx.now) },
    vars: { carried: carried && carried !== "-" ? carried : "- " },
    connections: prev ? [`Previous: [[${prev.basename}]]`] : [],
  };
  return { spec, folder: schema.folderFor("session", campaign) };
}

// ---------- creation commands ----------
async function newEntity(ctx) {
  const type = await ask(ctx.ui.suggest(NEW_TYPES.map((t) => schema.labelOf(t)), NEW_TYPES, "What are you creating?"));
  const { spec, folder } = await specFor(ctx, type);
  const file = await createEntity(ctx.app, spec, folder);
  await openFile(ctx.app, file);
  return file;
}

async function newCampaign(ctx) {
  const { app } = ctx;
  const name = cleanName(await ask(ctx.ui.prompt("Campaign name")));
  const system = md.oneLine((await ctx.ui.prompt("Game system (free text), optional")) || "");
  assertFree(app, name);
  for (const f of ofType(app, "campaign")) {
    if (fmOf(app, f).active === true) await app.fileManager.processFrontMatter(f, (fm) => { fm.active = false; });
  }
  await ensureFolder(app, `Campaigns/${name}/Arcs`);
  await ensureFolder(app, `Campaigns/${name}/Sessions`);
  const file = await createEntity(app, { type: "campaign", name, summary: "", fields: { system, active: true } }, `Campaigns/${name}`);
  await openFile(app, file);
  return file;
}

async function newSession(ctx) {
  const campaign = await pickCampaign(ctx);
  const { spec, folder } = await sessionSpec(ctx, campaign);
  const file = await createEntity(ctx.app, spec, folder);
  if (await ctx.ui.confirm("Also create a player recap?", "Recaps are shared with players via the handout export.")) {
    await createEntity(ctx.app, {
      type: "recap", name: `${spec.name} Recap`, campaigns: spec.campaigns,
      fields: { campaign: `[[${campaign}]]`, session: `[[${spec.name}]]` }, connections: [`[[${spec.name}]]`],
    }, folder);
  }
  await openFile(ctx.app, file);
  return file;
}

// Called from the thin Templater templates. Returns the full note text for tR.
async function fromTemplater(tp, app, type) {
  const ctx = { app, ui: uiFromTemplater(tp), now: new Date() };
  const path = tp.file.path(true);
  if (!type) {
    const allowed = schema.typesForPath(path);
    if (!allowed.length) throw new Error(`No note type is defined for ${path}.`);
    type = allowed.length === 1 ? allowed[0]
      : await ask(ctx.ui.suggest(allowed.map((t) => infobox.humanize(t)), allowed, "What kind of note?"));
  }
  const campaign = path.startsWith("Campaigns/") ? path.split("/")[1] : undefined;
  const { spec } = type === "session" ? await sessionSpec(ctx, campaign) : await specFor(ctx, type, { campaign: type === "campaign" ? undefined : campaign });
  if (type === "campaign") spec.fields = { ...(spec.fields || {}), active: false };
  await tp.file.rename(spec.name);
  return notes.buildNote(spec, await readBody(app, spec.type, spec.subtype));
}

// ---------- maintenance commands ----------
async function refreshInfobox(ctx) {
  const { app } = ctx;
  const scope = await ask(ctx.ui.suggest(["Current note", "Current folder", "Whole vault"], ["note", "folder", "vault"], "Refresh which infoboxes?"));
  const active = app.workspace.getActiveFile();
  let files;
  if (scope === "vault") files = under(app, schema.CONTENT_ROOTS);
  else {
    if (!active) throw new Error("Open a note first.");
    files = scope === "note" ? [active] : app.vault.getMarkdownFiles().filter((f) => f.parent.path === active.parent.path);
  }
  let changed = 0;
  for (const f of files) {
    const fm = fmOf(app, f);
    if (!schema.TYPES[fm.type]) continue;
    await app.vault.process(f, (text) => {
      const { frontmatter, body } = md.splitFrontmatter(text);
      const next = frontmatter + infobox.upsertInfobox(body, infobox.renderInfobox(fm, f.basename));
      if (next !== text) changed++;
      return next;
    });
  }
  await ctx.ui.info("Infoboxes refreshed", `${changed} note(s) updated.`);
  return changed;
}

async function rebuildWorldBible(ctx) {
  const { app } = ctx;
  const file = app.vault.getAbstractFileByPath("World Bible.md");
  if (!file) throw new Error("World Bible.md is missing from the vault root.");
  const entries = under(app, ["World", "Campaigns", "Micro-settings", "Archive"])
    .map((f) => ({ f, fm: fmOf(app, f) }))
    .filter(({ fm }) => schema.TYPES[fm.type])
    .map(({ f, fm }) => bible.entryFromFrontmatter(f.basename, fm));
  const index = bible.buildIndex(entries, stamp(ctx.now));
  await app.vault.process(file, (text) => bible.replaceBetweenMarkers(text, index));
  await ctx.ui.info("World Bible rebuilt", `${entries.length} notes indexed.`);
}

async function exportHandouts(ctx) {
  const { app } = ctx;
  const shared = under(app, ["World", "Campaigns", "Micro-settings", "GM Toolkit"]).filter((f) => fmOf(app, f).share === true);
  const names = new Set(shared.map((f) => f.basename));
  const wanted = new Set();
  for (const f of shared) {
    const fm = fmOf(app, f);
    const path = schema.handoutPath(fm.type, f.basename);
    wanted.add(path);
    const text = handouts.makeHandout(fm, md.splitFrontmatter(await app.vault.read(f)).body, names);
    await ensureFolder(app, path.split("/").slice(0, -1).join("/"));
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing) await app.vault.modify(existing, text);
    else await app.vault.create(path, text);
  }
  const stale = under(app, ["Player Handouts"]).filter((f) => !wanted.has(f.path));
  for (const f of stale) await app.fileManager.trashFile(f);
  await ctx.ui.info("Player handouts exported", `${wanted.size} written, ${stale.length} removed.`);
  return { written: wanted.size, removed: stale.length };
}

async function archiveNote(ctx) {
  const { app } = ctx;
  const file = app.workspace.getActiveFile();
  if (!file) throw new Error("Open the note you want to archive first.");
  const fm = fmOf(app, file);
  if (!schema.TYPES[fm.type]) throw new Error("This note has no known type, so it can't be archived automatically.");
  if (!(await ctx.ui.confirm(`Archive "${file.basename}"?`, "It will be marked archived and moved to Archive/."))) throw CANCEL;
  const target = schema.archivePath(fm.type, file.basename);
  if (app.vault.getAbstractFileByPath(target)) throw new Error(`${target} already exists.`);
  await app.fileManager.processFrontMatter(file, (f) => { f.status = "archived"; });
  await ensureFolder(app, target.split("/").slice(0, -1).join("/"));
  await app.fileManager.renameFile(file, target);
}

async function removeExamples(ctx) {
  const { app } = ctx;
  const files = app.vault.getMarkdownFiles().filter((f) => {
    const tags = fmOf(app, f).tags;
    return Array.isArray(tags) ? tags.includes("example") : tags === "example";
  });
  if (!files.length) { await ctx.ui.info("No example content", "Nothing is tagged example."); return 0; }
  if (!(await ctx.ui.confirm(`Delete ${files.length} example note(s)?`, "They go to Obsidian's trash."))) throw CANCEL;
  for (const f of files) await app.fileManager.trashFile(f);
  return files.length;
}

async function deckOfWorlds(ctx) {
  const { app, ui } = ctx;
  // 1. Gather every answer first, so a cancel creates nothing.
  const name = cleanName(await ask(ui.prompt("Micro-setting name")));
  let biome = await ask(ui.suggest([...deck.BIOMES, "Other…"], [...deck.BIOMES, "other"], "Region card biome"));
  if (biome === "other") biome = md.oneLine(await ask(ui.prompt("Biome")));
  const kinds = [...Object.keys(deck.KINDS), "existing", "skip"];
  const kindLabels = [...Object.values(deck.KINDS).map((k) => k.label), "Link an existing note", "Skip this card"];
  // Resolve "existing" cards by file, never by link text: Player Handouts holds same-named copies.
  const byName = new Map(under(app, schema.CONTENT_ROOTS).map((f) => [f.basename, f]));
  const existing = [...byName.keys()].sort();
  const cards = [];
  for (const slot of deck.SLOTS) {
    const kind = await ask(ui.suggest(kindLabels, kinds, `${infobox.humanize(slot)} card becomes…`));
    if (kind === "skip") continue;
    const text = await ask(ui.wide(`${infobox.humanize(slot)} card text`));
    const noteName = kind === "existing"
      ? await ask(ui.suggest(existing, existing, "Link to which note?"))
      : cleanName(await ask(ui.prompt(`Name for the ${deck.KINDS[kind].label.replace("New ", "")}`)));
    cards.push({ slot, kind, text, noteName });
  }
  // 2. Plan and check every collision before writing anything.
  const plan = deck.planStack({ name, biome, cards });
  for (const n of [plan.microsetting, ...plan.notes]) assertFree(app, n.name);
  const noteBodies = [];
  for (const n of plan.notes) noteBodies.push(await readBody(app, n.type, n.subtype));
  const stackBody = await readBody(app, "microsetting");
  // 3. Write.
  for (const [i, n] of plan.notes.entries()) {
    await ensureFolder(app, schema.folderFor(n.type));
    await app.vault.create(`${schema.folderFor(n.type)}/${n.name}.md`, notes.buildNote(n, noteBodies[i]));
  }
  await ensureFolder(app, "Micro-settings");
  const file = await app.vault.create(`Micro-settings/${name}.md`, notes.buildNote(plan.microsetting, stackBody));
  for (const l of plan.links) {
    const target = byName.get(l.name);
    if (target) await app.vault.process(target, (text) => {
      const { frontmatter, body } = md.splitFrontmatter(text);
      return frontmatter + md.addConnection(body, l.connection);
    });
  }
  if (await ui.confirm("Rebuild the World Bible now?", "Adds the new notes to the index.")) await rebuildWorldBible(ctx);
  await openFile(app, file);
  return file;
}

// ---------- entry point for QuickAdd scripts ----------
async function run(name, params) {
  const ctx = { app: params.app, ui: uiFromQuickAdd(params.quickAddApi, params.obsidian), now: new Date() };
  try {
    if (!module.exports[name]) throw new Error(`Unknown command: ${name}`);
    return await module.exports[name](ctx);
  } catch (e) {
    if (e === CANCEL) return undefined;
    await ctx.ui.info("Worldbuilding command failed", e && e.message ? e.message : String(e));
    return undefined;
  }
}

module.exports = {
  CANCEL, run, fromTemplater, uiFromQuickAdd, uiFromTemplater,
  ask, fmOf, under, ofType, ensureFolder, readBody, assertFree, cleanName, createEntity, pickCampaign, isoDate, stamp,
  newEntity, newCampaign, newSession,
  refreshInfobox, rebuildWorldBible, exportHandouts, archiveNote, removeExamples, deckOfWorlds,
};
