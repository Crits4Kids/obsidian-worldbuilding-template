// QuickAdd user script → WB: Deck of Worlds: new micro-setting. Logic lives in _System/Scripts/lib/commands.js.
module.exports = async (params) => {
  const src = await params.app.vault.adapter.read("_System/Scripts/loader.js");
  const m = { exports: {} };
  new Function("module", "exports", src)(m, m.exports);
  const wb = await m.exports.loadWb(params.app);
  await wb.commands.run("deckOfWorlds", params);
};
