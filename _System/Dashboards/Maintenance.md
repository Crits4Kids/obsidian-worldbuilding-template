# Maintenance

Notes whose infobox is out of date or missing, or that have no summary. Fix them with **WB: Refresh infobox** (Whole vault).

```dataviewjs
const src = await app.vault.adapter.read("_System/Scripts/loader.js");
const m = { exports: {} };
new Function("module", "exports", src)(m, m.exports);
const wb = await m.exports.loadWb(app);
const rows = [];
for (const f of app.vault.getMarkdownFiles()) {
  if (!wb.schema.CONTENT_ROOTS.some((r) => f.path.startsWith(r + "/"))) continue;
  const fm = app.metadataCache.getFileCache(f)?.frontmatter;
  const issues = wb.notes.noteIssues(fm, await app.vault.cachedRead(f), f.basename);
  if (issues.length) rows.push([dv.fileLink(f.path), issues.join("; ")]);
}
rows.length ? dv.table(["Note", "Issues"], rows) : dv.paragraph("✅ Everything is up to date.");
```

Orphans and broken links: run **Find orphaned files and broken links** from the command palette.
