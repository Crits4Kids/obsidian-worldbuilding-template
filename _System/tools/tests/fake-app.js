// In-memory stand-in for the parts of Obsidian's App that commands.js uses.
const { readdirSync, readFileSync, statSync } = require("node:fs");
const { join, relative } = require("node:path");
const { splitFrontmatter } = require("../../Scripts/lib/markdown.js");
const { toYaml } = require("../../Scripts/lib/yaml.js");
const ROOT = join(__dirname, "../../..");

function repoFiles(dir) {
  const out = {};
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (!n.startsWith(".")) out[relative(ROOT, p).split("\\").join("/")] = readFileSync(p, "utf8");
    }
  };
  walk(join(ROOT, dir));
  return out;
}

const parentOf = (p) => p.split("/").slice(0, -1).join("/");

function makeFakeApp(files = {}) {
  const store = new Map(Object.entries({ ...repoFiles("_System/Scripts"), ...repoFiles("_System/Templates"), ...files }));
  const folders = new Set();
  const addFolders = (p) => { const parts = p.split("/"); for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join("/")); };
  for (const p of store.keys()) addFolders(p);
  const fileObj = (path) => {
    const name = path.split("/").pop();
    return { path, name, basename: name.replace(/\.md$/, ""), extension: name.split(".").pop(), parent: { path: parentOf(path) } };
  };
  const parse = (t) => { const { yaml } = splitFrontmatter(t); return yaml ? Bun.YAML.parse(yaml) || {} : undefined; };
  const app = {
    vault: {
      configDir: ".obsidian",
      getMarkdownFiles: () => [...store.keys()].filter((p) => p.endsWith(".md")).map(fileObj),
      read: async (f) => store.get(f.path),
      cachedRead: async (f) => store.get(f.path),
      create: async (path, data) => {
        if (store.has(path)) throw new Error(`File already exists: ${path}`);
        if (parentOf(path) && !folders.has(parentOf(path))) throw new Error(`Folder missing: ${parentOf(path)}`);
        store.set(path, data); addFolders(path); return fileObj(path);
      },
      modify: async (f, data) => { store.set(f.path, data); },
      process: async (f, fn) => { const v = fn(store.get(f.path)); store.set(f.path, v); return v; },
      createFolder: async (p) => { if (folders.has(p)) throw new Error(`Folder exists: ${p}`); addFolders(`${p}/x`); },
      getAbstractFileByPath: (p) => (store.has(p) ? fileObj(p) : folders.has(p) ? { path: p, children: [] } : null),
      adapter: {
        exists: async (p) => store.has(p) || folders.has(p),
        read: async (p) => { if (!store.has(p)) throw new Error(`ENOENT ${p}`); return store.get(p); },
        write: async (p, data) => { store.set(p, data); addFolders(p); },
        list: async (dir) => ({ files: [...store.keys()].filter((p) => parentOf(p) === dir), folders: [...folders].filter((p) => parentOf(p) === dir) }),
      },
    },
    metadataCache: {
      getFileCache: (f) => (store.has(f.path) ? { frontmatter: parse(store.get(f.path)) } : null),
      getFirstLinkpathDest: (link) => {
        const hit = [...store.keys()].find((p) => p.endsWith(".md") && p.split("/").pop() === `${link}.md`);
        return hit ? fileObj(hit) : null;
      },
    },
    fileManager: {
      processFrontMatter: async (f, fn) => {
        const t = store.get(f.path);
        const { yaml, body } = splitFrontmatter(t);
        const fm = (yaml ? Bun.YAML.parse(yaml) : {}) || {};
        fn(fm);
        store.set(f.path, `---\n${toYaml(fm)}\n---\n${body}`);
      },
      renameFile: async (f, to) => {
        if (store.has(to)) throw new Error(`File already exists: ${to}`);
        store.set(to, store.get(f.path)); store.delete(f.path); addFolders(to);
      },
      trashFile: async (f) => { store.delete(f.path); },
    },
    plugins: {
      log: [],
      enabledPlugins: new Set(["obsidian-git"]),
      async disablePlugin(id) { this.log.push(`disable:${id}`); this.enabledPlugins.delete(id); },
      async enablePlugin(id) { this.log.push(`enable:${id}`); this.enabledPlugins.add(id); },
    },
    workspace: {
      activePath: null,
      getActiveFile() { return this.activePath ? fileObj(this.activePath) : null; },
      getLeaf: () => ({ openFile: async () => {} }),
    },
  };
  return { app, store };
}

function makeUi(answers) {
  const queue = [...answers];
  const log = [];
  const next = (kind, header) => {
    log.push([kind, header]);
    if (!queue.length) throw new Error(`Unexpected ${kind}: ${header}`);
    return queue.shift();
  };
  return {
    log,
    prompt: async (h) => next("prompt", h),
    wide: async (h) => next("wide", h),
    suggest: async (labels, values, placeholder) => {
      const a = next("suggest", placeholder || labels.join("|"));
      if (a !== null && a !== undefined && !values.includes(a)) throw new Error(`Answer ${JSON.stringify(a)} not offered: ${JSON.stringify(values)}`);
      return a;
    },
    confirm: async (h) => next("confirm", h),
    info: async (h, t) => { log.push(["info", h, t]); },
  };
}

module.exports = { makeFakeApp, makeUi };
