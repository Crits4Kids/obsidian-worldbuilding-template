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
};
