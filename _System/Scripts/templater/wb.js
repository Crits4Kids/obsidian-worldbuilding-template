// Templater user script: `await tp.user.wb()` returns the vault library (see _System/Scripts/loader.js).
module.exports = async function wb() {
  const src = await app.vault.adapter.read("_System/Scripts/loader.js");
  const m = { exports: {} };
  new Function("module", "exports", src)(m, m.exports);
  return m.exports.loadWb(app);
};
