// Loads _System/Scripts/lib/*.js inside Obsidian, where vault files cannot be require()d.
// Each module may require("./other") another lib module; nothing else.
async function loadWb(app, dir = "_System/Scripts/lib") {
  const listing = await app.vault.adapter.list(dir);
  const sources = {};
  for (const p of listing.files) {
    if (p.endsWith(".js")) sources[p.split("/").pop().replace(/\.js$/, "")] = await app.vault.adapter.read(p);
  }
  const cache = {};
  const req = (name) => {
    const key = String(name).replace(/^\.\//, "").replace(/\.js$/, "");
    if (cache[key]) return cache[key].exports;
    if (!(key in sources)) throw new Error(`wb loader: unknown module "${name}"`);
    const module = { exports: {} };
    cache[key] = module;
    new Function("module", "exports", "require", sources[key])(module, module.exports, req);
    return module.exports;
  };
  const api = {};
  for (const key of Object.keys(sources)) api[key] = req(key);
  return api;
}

module.exports = { loadWb };
