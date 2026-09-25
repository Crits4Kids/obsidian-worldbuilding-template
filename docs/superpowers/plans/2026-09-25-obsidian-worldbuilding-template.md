# Obsidian Worldbuilding Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clone-and-go, Git-hosted Obsidian vault template for system-agnostic TTRPG worldbuilding. It provides Chronicler-style infoboxes, a token-cheap World Bible for the MCP, Deck of Worlds entry, player-handout export for Foundry's Obsidian Bridge, and pre-configured plugins.

**Architecture:** Content notes are plain Markdown with Chronicler-compatible frontmatter. All logic lives in small CommonJS modules under `_System/Scripts/lib/`. Pure functions (infobox rendering, World Bible index, handout stripping, Deck of Worlds planning, YAML writing) are unit-tested with Bun. A thin Obsidian "glue" module (`commands.js`) calls them through a UI adapter, so the same commands work from QuickAdd, Templater, and a fake app in tests. Inside Obsidian, `_System/Scripts/loader.js` loads the lib modules from the vault, because vault files can't be `require`d there.

**Tech Stack:** Obsidian 1.9+ (Bases core plugin), Templater, QuickAdd, Dataview, Calendarium, Leaflet, Excalidraw, Charted Roots, Find Orphaned Files and Broken Links, Tag Wrangler, Style Settings, Minimal theme, Obsidian Git. Tooling: Bun ≥ 1.4 (`bun test`, `Bun.YAML`), bash, curl, git, gh.

**Spec:** `docs/superpowers/specs/2026-09-25-obsidian-worldbuilding-template-design.md`

## Global Constraints

- Content notes (under `World/`, `Campaigns/`, `Micro-settings/`, `GM Toolkit/`, `Archive/`) contain **no** Dataview, DataviewJS, Templater (`<%`), or Leaflet code. Code is allowed only in `Home.md`, `_System/`, and `Maps/`.
- Folder depth under any Foundry import root is **≤ 3** folders (e.g., `Campaigns/<X>/Sessions/note.md`).
- Chronicler frontmatter keys: `title`, `subtitle`, `infobox`, `image`, `layout`. Every content note also has `type`, `status` (`active | background | archived`), `campaigns` (list), `summary` (one line), `share` (bool), `aliases`, `tags`.
- The subtype key is `<type>_type` for the six families:
  - `person_type`: pc | npc | enemy | monster
  - `group_type`: power | guild | faith
  - `place_type`: region | settlement | building | landmark
  - `thing_type`: magic_item | key_item | mundane_item
  - `lore_type`: deity | species | plane | history | culture
  - `plot_type`: hook | event | fact | clock
- GM secrets live in `> [!gm]` callouts. `[!spoiler]` is player-safe. `[!infobox]` is generated and never hand-edited.
- World Bible index markers are exactly `<!-- WB:INDEX START -->` and `<!-- WB:INDEX END -->`.
- No Deck of Worlds card text and no game-system content ship in the repo.
- No Local REST API, MCP Tools, or Smart Connections plugins. The MCP is `@bitbonsai/mcpvault` (filesystem).
- Obsidian Git: auto commit + push every 10 minutes; pull on startup.
- Pushes to GitHub happen **only with explicit user approval**.
- Tests run with `bun test`. Bun is at `~/.bun/bin/bun`; if `bun` isn't on PATH, use that path. There's no `package.json` and no `node_modules` in the vault.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Deviations from the spec (resolved while planning; the user reviews them with this plan)

1. **Tooling runs on Bun, not Node.** Node isn't on the PATH, and Bun's built-in `Bun.YAML` avoids adding a dependency, which would otherwise put `node_modules` inside the vault.
2. **Chronicler `layout` headers and separators** take `above` *or* `below` (a string or list), per Chronicler's HELP.md.
3. **Templates are consolidated.** There's one Templater template per family folder. The subtype (hook, event, clock, and so on) is asked for by prompt, not split into separate files. Campaign, Arc, Session, and Recap are handled by a single `Campaign Item` template that infers the type from the folder. World Seed questions live in the World Bible's hand-written section.
4. **Note bodies live in `_System/Templates/Bodies/<type>[-<subtype>].md`** as plain Markdown with `{{placeholders}}`, so the Templater and QuickAdd paths share one editable source.
5. **`Maps/` isn't imported into Foundry**, because it contains Leaflet code blocks.
6. **Person notes carry `cr_type: person` and `name`.** Charted Roots needs both to find people; they're hidden from the infobox.
7. **Session names are `<Campaign> Session <n>`** and recaps are `<Campaign> Session <n> Recap`, so basenames stay unique across campaigns.
8. **`sync-template.sh` doesn't overwrite `data.json`** for Calendarium, Charted Roots, Obsidian Git, Leaflet, Excalidraw, and Style Settings. Those hold per-game data, such as your calendar.

## Review Focus

1. **Pipes inside wikilinks in infobox values** (`[[Mira Vell|the Harbormaster]]`) must not break the Markdown table. Expect `[[Mira Vell\|the Harbormaster]]` in the cell. *(Task 3 test.)*
2. **Unquoted YAML links** (`father: [[Old Tom]]` parses as `[["Old Tom"]]`) must still render as `[[Old Tom]]`, not as `Old Tom` or `[object Object]`. *(Task 3 test.)*
3. **GM secrets in unusual shapes** must all be stripped from player handouts: nested `> > [!gm]`, capitalized `[!GM]+`, and `%%comments%%`. Links to unshared notes must become plain text. *(Task 6 test.)*
4. **`sync-template.sh`** must never touch world content or per-game plugin data (the Calendarium calendar, Git settings), and must refuse to run with uncommitted changes in template-owned paths. *(Task 16 test.)*
5. **Cancelling or hitting a name collision partway through Deck of Worlds** must leave no partial notes. All input is gathered and every collision checked before anything is created. *(Task 9 test.)*

---

## File Map

```
.gitignore  .gitattributes  README.md  CLAUDE.md  Home.md  World Bible.md  THIRD_PARTY_NOTICES.md
World/{People,Groups,Places,Things,Lore,Plot}/          content (examples + .gitkeep)
Campaigns/Example Campaign/{Example Campaign.md,Arcs/,Sessions/}
Micro-settings/  Maps/World Map.md  GM Toolkit/  Player Handouts/.gitkeep  Assets/{Maps,Tokens,Excalidraw}/  Archive/.gitkeep
_System/
  Schema.md
  Scripts/
    loader.js                 loadWb(app) – loads lib/*.js inside Obsidian
    lib/yaml.js               toYaml(obj)
    lib/markdown.js           splitFrontmatter, fill, extractSection, addConnection, safeName, linkName, linkTarget, escapeCell, oneLine
    lib/schema.js             FAMILIES, OTHER, TYPES, subtypeKey, typesForPath, folderFor, archivePath, handoutPath, HIDDEN_KEYS, LABELS, CONTENT_ROOTS
    lib/infobox.js            renderInfobox, upsertInfobox, readInfobox, formatValue
    lib/notes.js              buildFrontmatter, buildNote, nextSessionNumber, sessionName, noteIssues
    lib/bible.js              buildIndex, replaceBetweenMarkers, entryFromFrontmatter
    lib/handouts.js           stripCallouts, unlinkUnshared, makeHandout
    lib/deck.js               SLOTS, KINDS, summarize, planStack
    lib/commands.js           Obsidian glue: run(), fromTemplater(), all commands
    templater/wb.js           Templater user script → tp.user.wb()
    quickadd/*.js             one 6-line bootstrap per command
  Templates/*.md              thin Templater wrappers
  Templates/Bodies/*.md       note body skeletons
  Bases/*.base  Dashboards/*.md
  tools/plugins.txt  update-plugins.sh  sync-template.sh  validate.mjs  make-examples.mjs
  tools/tests/*.test.js  tools/tests/fake-app.js  tools/tests/sync-template.test.sh
.obsidian/{app.json,appearance.json,core-plugins.json,community-plugins.json,graph.json,plugins/*,themes/Minimal/*,snippets/*.css}
```

---

### Task 1: Repository scaffold and test harness

**Files:**
- Create: `.gitignore`, `.gitattributes`, `.gitkeep` files in every empty folder, `_System/tools/tests/harness.test.js`

**Interfaces:**
- Produces: the folder skeleton; `bun test _System/tools/tests` as the test command.

- [ ] **Step 1: Create the folders with `.gitkeep`**

```bash
cd /Users/matt/Obsidian/obsidian-worldbuilding-template
for d in World/People World/Groups World/Places World/Things World/Lore World/Plot \
  "Campaigns" "Micro-settings" "Maps" "GM Toolkit" "Player Handouts" \
  Assets/Maps Assets/Tokens Assets/Excalidraw Archive \
  _System/Scripts/lib _System/Scripts/templater _System/Scripts/quickadd \
  _System/Templates/Bodies _System/Bases _System/Dashboards _System/tools/tests; do
  mkdir -p "$d" && touch "$d/.gitkeep"; done
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# Obsidian per-device state
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/workspaces.json
.obsidian/cache
.obsidian/plugins/*/data-cache*
.obsidian/plugins/obsidian-excalidraw-plugin/*.bak
.smart-env/
.trash/
# OS
.DS_Store
Thumbs.db
# Tooling scratch
_System/tools/.tmp/
```

- [ ] **Step 3: Write `.gitattributes`**

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.gif binary
*.pdf binary
*.woff binary
*.woff2 binary
*.ttf binary
```

- [ ] **Step 4: Write a harness test that proves `bun test` runs and the folders exist**

`_System/tools/tests/harness.test.js`:
```js
const { test, expect } = require("bun:test");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "../../..");

test("vault skeleton folders exist", () => {
  for (const d of ["World/People", "World/Plot", "Campaigns", "Micro-settings", "Maps", "GM Toolkit",
    "Player Handouts", "Assets/Maps", "Archive", "_System/Scripts/lib", "_System/Templates/Bodies"]) {
    expect(existsSync(join(ROOT, d))).toBe(true);
  }
});
```

- [ ] **Step 5: Run the test**

Run: `~/.bun/bin/bun test _System/tools/tests`
Expected: `1 pass`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: vault skeleton, gitignore, test harness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: YAML writer and Markdown helpers

**Files:**
- Create: `_System/Scripts/lib/yaml.js`, `_System/Scripts/lib/markdown.js`
- Test: `_System/tools/tests/yaml.test.js`, `_System/tools/tests/markdown.test.js`

**Interfaces:**
- Produces:
  - `toYaml(obj: object): string` (no `---` fences)
  - `splitFrontmatter(text): {frontmatter: string, yaml: string, body: string}`: `frontmatter` includes the fences and trailing newline; `""` if absent.
  - `fill(template, vars): string`: replaces `{{key}}`; unknown keys become `""`.
  - `extractSection(body, heading): string` (trimmed text under `## heading`)
  - `addConnection(body, link): string`: appends `- link` under `## Connections`, creating the section if needed. Idempotent.
  - `safeName(name): string`
  - `linkName(value): string`: `"[[X|y]]"`, `[["X"]]`, and `"X"` all give `"X"`.
  - `linkTarget(inner): string`: the part of `[[inner]]` before `|` or `#`.
  - `escapeCell(s): string`
  - `oneLine(s): string`

- [ ] **Step 1: Write failing tests**

`_System/tools/tests/yaml.test.js`:
```js
const { test, expect } = require("bun:test");
const { toYaml } = require("../../Scripts/lib/yaml.js");

test("round-trips the shapes the vault writes", () => {
  const obj = {
    title: "Mira Vell", subtitle: "", type: "person", person_type: "npc", status: "active",
    campaigns: ["[[Example Campaign]]"], summary: "Harbormaster: smuggles, lies, 'helps'.",
    share: false, aliases: [], tags: ["person", "example"], stage: 3, date: "2026-09-25",
    "fc-date": "1492-03-01", father: "[[Old Tom]]", yes_word: "yes", number_word: "42",
    layout: [{ type: "header", text: "Family", above: ["father"] }, { type: "group", keys: ["father", "mother"] }],
  };
  const parsed = Bun.YAML.parse(toYaml(obj));
  expect(parsed).toEqual({ ...obj, subtitle: null });
});

test("empty strings are written as bare keys", () => {
  expect(toYaml({ image: "" })).toBe("image:");
});
```

`_System/tools/tests/markdown.test.js`:
```js
const { test, expect } = require("bun:test");
const md = require("../../Scripts/lib/markdown.js");

test("splitFrontmatter separates fences, yaml and body", () => {
  const r = md.splitFrontmatter("---\na: 1\n---\nBody\n");
  expect(r).toEqual({ frontmatter: "---\na: 1\n---\n", yaml: "a: 1", body: "Body\n" });
  expect(md.splitFrontmatter("No fm").frontmatter).toBe("");
});

test("fill replaces known and blanks unknown placeholders", () => {
  expect(md.fill("{{name}} {{missing}}!", { name: "Rivertown" })).toBe("Rivertown !");
});

test("extractSection returns text under an h2 until the next heading", () => {
  const body = "## Recap\nx\n## Loose threads\n- a\n- b\n\n## Connections\n- [[Z]]\n";
  expect(md.extractSection(body, "Loose threads")).toBe("- a\n- b");
  expect(md.extractSection(body, "Nope")).toBe("");
});

test("addConnection appends once, creating the section if needed", () => {
  const withSection = "Text\n\n## Connections\n- [[A]]\n\n## Stats\n";
  const once = md.addConnection(withSection, "[[B]]");
  expect(once).toBe("Text\n\n## Connections\n- [[A]]\n- [[B]]\n\n## Stats\n");
  expect(md.addConnection(once, "[[B]]")).toBe(once);
  expect(md.addConnection("Text\n", "[[B]]")).toBe("Text\n\n## Connections\n- [[B]]\n");
});

test("safeName strips characters Obsidian cannot use in file names", () => {
  expect(md.safeName('  The #1 "Best" [Inn]: a/b?  ')).toBe("The 1 Best Inn ab");
});

test("linkName normalises link shapes", () => {
  expect(md.linkName("[[Mira Vell|the Harbormaster]]")).toBe("Mira Vell");
  expect(md.linkName([["Old Tom"]])).toBe("Old Tom");
  expect(md.linkName("Plain")).toBe("Plain");
  expect(md.linkName(null)).toBe("");
});

test("escapeCell escapes pipes and newlines", () => {
  expect(md.escapeCell("[[A|B]] or C|D\nE")).toBe("[[A\\|B]] or C\\|D<br>E");
  expect(md.escapeCell("[[A\\|B]]")).toBe("[[A\\|B]]");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `~/.bun/bin/bun test _System/tools/tests/yaml.test.js _System/tools/tests/markdown.test.js`
Expected: FAIL with `Cannot find module '../../Scripts/lib/yaml.js'`

- [ ] **Step 3: Implement `yaml.js`**

```js
// Minimal YAML writer for the frontmatter shapes this vault produces.
// Reading YAML is left to Obsidian (metadataCache) and Bun.YAML (tools).
const RESERVED = /^(true|false|yes|no|on|off|null|~|-?\d+(\.\d+)?)$/i;
const PLAIN = /^[A-Za-z0-9][A-Za-z0-9 _.,'()\/-]*$/;
const FLOW_PLAIN = /^[A-Za-z0-9_-]+$/;

function scalar(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return PLAIN.test(s) && !RESERVED.test(s) && !s.endsWith(" ") ? s : JSON.stringify(s);
}

function flow(v) {
  if (Array.isArray(v)) return `[${v.map(flow).join(", ")}]`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v ?? "");
  return FLOW_PLAIN.test(s) && !RESERVED.test(s) ? s : JSON.stringify(s);
}

const isMap = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

function toYaml(obj) {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && v.some(isMap)) {
      lines.push(`${k}:`);
      for (const item of v) {
        Object.entries(item).forEach(([ik, iv], i) => {
          const val = Array.isArray(iv) ? flow(iv) : scalar(iv);
          lines.push(`${i === 0 ? "  - " : "    "}${ik}:${val === "" ? "" : ` ${val}`}`);
        });
      }
    } else if (Array.isArray(v)) {
      lines.push(`${k}: ${flow(v)}`);
    } else {
      const s = scalar(v);
      lines.push(s === "" ? `${k}:` : `${k}: ${s}`);
    }
  }
  return lines.join("\n");
}

module.exports = { toYaml };
```

- [ ] **Step 4: Implement `markdown.js`**

```js
// Pure Markdown helpers shared by every command.
const FM = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function splitFrontmatter(text) {
  const m = String(text).match(FM);
  if (!m) return { frontmatter: "", yaml: "", body: String(text) };
  return { frontmatter: m[0], yaml: m[1], body: text.slice(m[0].length) };
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}

function sectionRange(body, heading) {
  const lines = body.split("\n");
  const want = heading.trim().toLowerCase();
  const start = lines.findIndex((l) => /^##\s+/.test(l) && l.replace(/^##\s+/, "").trim().toLowerCase() === want);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^#{1,2}\s/.test(lines[i])) { end = i; break; }
  return { lines, start, end };
}

function extractSection(body, heading) {
  const r = sectionRange(body, heading);
  return r ? r.lines.slice(r.start + 1, r.end).join("\n").trim() : "";
}

function addConnection(body, link) {
  const item = `- ${link}`;
  const r = sectionRange(body, "Connections");
  if (!r) return `${body.replace(/\s*$/, "")}\n\n## Connections\n${item}\n`;
  if (r.lines.slice(r.start + 1, r.end).some((l) => l.trim() === item)) return body;
  let at = r.end;
  while (at > r.start + 1 && r.lines[at - 1].trim() === "") at--;
  return [...r.lines.slice(0, at), item, ...r.lines.slice(at)].join("\n");
}

function safeName(name) {
  return String(name ?? "").replace(/[\\/:*?"<>|#^[\]]/g, "").replace(/\s+/g, " ").trim();
}

function linkTarget(inner) {
  return String(inner).split("|")[0].split("#")[0].replace(/\\$/, "").trim();
}

function linkName(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return linkName(v[0]);
  const s = String(v);
  const m = s.match(/\[\[([^\]]+)\]\]/);
  return m ? linkTarget(m[1]) : s.trim();
}

function escapeCell(s) {
  return String(s).replace(/(?<!\\)\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function oneLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

module.exports = { splitFrontmatter, fill, extractSection, addConnection, safeName, linkTarget, linkName, escapeCell, oneLine };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `~/.bun/bin/bun test _System/tools/tests/yaml.test.js _System/tools/tests/markdown.test.js`
Expected: all pass. If the round-trip test fails because `Bun.YAML` returns a `Date` for `date`/`fc-date`, change `scalar()` to JSON-quote any string matching `/^\d{4}-\d{2}-\d{2}/` and re-run.

- [ ] **Step 6: Commit**

```bash
git add _System && git commit -m "feat(lib): yaml writer and markdown helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Schema and the infobox renderer

**Files:**
- Create: `_System/Scripts/lib/schema.js`, `_System/Scripts/lib/infobox.js`
- Test: `_System/tools/tests/schema.test.js`, `_System/tools/tests/infobox.test.js`

**Interfaces:**
- Consumes: `markdown.js` (`escapeCell`, `oneLine`).
- Produces:
  - `schema`: `FAMILIES`, `OTHER`, `TYPES`, `CONTENT_ROOTS`, `HIDDEN_KEYS`, `HIDDEN_BY_TYPE`, `LABELS`, `DEFAULT_SHARE`, `subtypeKey(type)`, `typesForPath(path): string[]`, `folderFor(type, campaign?)`, `archivePath(type, name)`, `handoutPath(type, name)`, `labelOf(type)`
  - `infobox`: `renderInfobox(fm, name): string`, `upsertInfobox(body, block): string`, `readInfobox(body): string|null`, `formatValue(v): string`

- [ ] **Step 1: Write failing tests**

`_System/tools/tests/schema.test.js`:
```js
const { test, expect } = require("bun:test");
const s = require("../../Scripts/lib/schema.js");

test("typesForPath maps folders to allowed types", () => {
  expect(s.typesForPath("World/People/Mira.md")).toEqual(["person"]);
  expect(s.typesForPath("World/Plot/The Drowning.md")).toEqual(["plot"]);
  expect(s.typesForPath("Campaigns/Tides/Tides.md")).toEqual(["campaign"]);
  expect(s.typesForPath("Campaigns/Tides/Arcs/Arc 1.md")).toEqual(["arc"]);
  expect(s.typesForPath("Campaigns/Tides/Sessions/Tides Session 1.md")).toEqual(["session", "recap"]);
  expect(s.typesForPath("Micro-settings/Saltmarsh.md")).toEqual(["microsetting"]);
  expect(s.typesForPath("GM Toolkit/House Rules.md")).toEqual(["encounter", "rumor_table", "toolkit"]);
  expect(s.typesForPath("Archive/People/Old.md")).toEqual(["person"]);
  expect(s.typesForPath("Home.md")).toEqual([]);
});

test("folderFor, archivePath and handoutPath", () => {
  expect(s.folderFor("place")).toBe("World/Places");
  expect(s.folderFor("session", "Tides")).toBe("Campaigns/Tides/Sessions");
  expect(s.folderFor("arc", "Tides")).toBe("Campaigns/Tides/Arcs");
  expect(s.folderFor("campaign", "Tides")).toBe("Campaigns/Tides");
  expect(() => s.folderFor("session")).toThrow("campaign");
  expect(s.archivePath("person", "Mira")).toBe("Archive/People/Mira.md");
  expect(s.archivePath("session", "Tides Session 1")).toBe("Archive/Sessions/Tides Session 1.md");
  expect(s.handoutPath("recap", "Tides Session 1 Recap")).toBe("Player Handouts/Recaps/Tides Session 1 Recap.md");
});

test("subtypeKey only exists for the six families", () => {
  expect(s.subtypeKey("thing")).toBe("thing_type");
  expect(s.subtypeKey("session")).toBe(null);
});
```

`_System/tools/tests/infobox.test.js`:
```js
const { test, expect } = require("bun:test");
const { renderInfobox, upsertInfobox, readInfobox } = require("../../Scripts/lib/infobox.js");

const place = {
  title: "Rivertown", subtitle: "Free city", infobox: "City-state", image: "[[Assets/rivertown.jpg]]",
  type: "place", place_type: "settlement", status: "active", campaigns: [], summary: "x", share: false,
  aliases: [], tags: ["place"], region: "[[Sorn Delta]]", ruler: "[[Mira Vell|the Harbormaster]]",
  population: 12000, map: "", location: [10, 20],
};

test("renders title, subtitle, image, header and visible fields only", () => {
  expect(renderInfobox(place, "Rivertown")).toBe([
    "> [!infobox]+ Rivertown",
    "> *Free city*",
    "> ![[Assets/rivertown.jpg]]",
    "> ###### City-state",
    ">",
    "> | | |",
    "> |---|---|",
    "> | **Type** | Settlement |",
    "> | **Region** | [[Sorn Delta]] |",
    "> | **Ruler** | [[Mira Vell\\|the Harbormaster]] |",
    "> | **Population** | 12000 |",
  ].join("\n"));
});

test("unquoted YAML links (nested arrays) render as links", () => {
  const out = renderInfobox({ type: "person", person_type: "npc", father: [["Old Tom"]], children: [[["A"]], [["B"]]] }, "Kid");
  expect(out).toContain("> | **Father** | [[Old Tom]] |");
  expect(out).toContain("> | **Children** | [[A]], [[B]] |");
});

test("Chronicler layout: alias, group, header above, separator below", () => {
  const fm = {
    type: "group", group_type: "power", leader: "[[Queen Ysolde]]", goal: "Hold the delta",
    allies_north: "[[Frost Clans]]", allies_south: "[[Reed Folk]]",
    layout: [
      { type: "alias", keys: ["leader"], text: "Sovereign" },
      { type: "header", text: "Allies", above: "allies_north" },
      { type: "group", keys: ["allies_north", "allies_south"] },
      { type: "separator", below: ["goal"] },
    ],
  };
  expect(renderInfobox(fm, "Tide Court")).toBe([
    "> [!infobox]+ Tide Court",
    ">",
    "> | | |",
    "> |---|---|",
    "> | **Type** | Power |",
    "> | **Sovereign** | [[Queen Ysolde]] |",
    "> | **Goal** | Hold the delta |",
    ">",
    "> ---",
    ">",
    "> ###### Allies",
    ">",
    "> | | |",
    "> |---|---|",
    "> | **Allies north / Allies south** | [[Frost Clans]] / [[Reed Folk]] |",
  ].join("\n"));
});

test("image lists become a gallery with captions", () => {
  const out = renderInfobox({ type: "place", image: [["day.jpg", "Day"], ["night.jpg", "Night"]] }, "X");
  expect(out).toContain("> > [!gallery]\n> > ![[day.jpg]]\n> > *Day*\n> > ![[night.jpg]]\n> > *Night*");
});

test("hidden keys never render: cr_*, name, fc-category, place location", () => {
  const out = renderInfobox({ type: "person", person_type: "pc", cr_id: "abc", cr_type: "person", name: "Kid", born: "1450-01-01" }, "Kid");
  expect(out).not.toContain("cr_");
  expect(out).not.toContain("**Name**");
  expect(out).toContain("> | **Born** | 1450-01-01 |");
});

test("upsertInfobox inserts at top, then replaces in place", () => {
  const body = "Intro line.\n\n## Connections\n";
  const first = upsertInfobox(body, "> [!infobox]+ A\n> x");
  expect(first).toBe("> [!infobox]+ A\n> x\n\nIntro line.\n\n## Connections\n");
  const second = upsertInfobox(first, "> [!infobox]+ A\n> y\n> z");
  expect(second).toBe("> [!infobox]+ A\n> y\n> z\n\nIntro line.\n\n## Connections\n");
  expect(readInfobox(second)).toBe("> [!infobox]+ A\n> y\n> z");
  expect(readInfobox("No box")).toBe(null);
});

test("upsertInfobox keeps a blank line before following text", () => {
  expect(upsertInfobox("> [!infobox]+ A\n> x\nText", "> [!infobox]+ A\n> y")).toBe("> [!infobox]+ A\n> y\n\nText");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `~/.bun/bin/bun test _System/tools/tests/schema.test.js _System/tools/tests/infobox.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `schema.js`**

```js
// Single source of truth for note types, folders and infobox visibility.
const FAMILIES = {
  person: {
    label: "People", folder: "World/People", subtypes: ["pc", "npc", "enemy", "monster"],
    fields: { role: "", species: "", pronouns: "", faction: [], location: "", father: "", mother: "", spouse: "", children: [], born: "", died: "" },
  },
  group: { label: "Groups", folder: "World/Groups", subtypes: ["power", "guild", "faith"], fields: { leader: "", headquarters: "", goal: "", allies: [], rivals: [] } },
  place: { label: "Places", folder: "World/Places", subtypes: ["region", "settlement", "building", "landmark"], fields: { region: "", ruler: "", population: "", map: "" } },
  thing: { label: "Things", folder: "World/Things", subtypes: ["magic_item", "key_item", "mundane_item"], fields: { owner: "", location: "", rarity: "" } },
  lore: { label: "Lore", folder: "World/Lore", subtypes: ["deity", "species", "plane", "history", "culture"], fields: { domain: "", related: [] } },
  plot: {
    label: "Plot", folder: "World/Plot", subtypes: ["hook", "event", "fact", "clock"], fields: {},
    subtypeFields: { hook: { resolved: false }, event: { "fc-date": "", "fc-category": "" }, fact: {}, clock: { owner: "", stage: 0, max_stage: 6, trigger: "" } },
  },
};

const OTHER = {
  campaign: { label: "Campaigns", fields: { system: "", players: [], start: "", active: false } },
  arc: { label: "Arcs", fields: { campaign: "", order: "" } },
  session: { label: "Sessions", fields: { campaign: "", arc: "", session_number: "", date: "", "fc-date": "", players_present: [] } },
  recap: { label: "Recaps", fields: { campaign: "", session: "" } },
  microsetting: { label: "Micro-settings", folder: "Micro-settings", fields: { region_card: "", cards: [] } },
  encounter: { label: "Encounters", folder: "GM Toolkit", fields: { location: "", threat: "" } },
  rumor_table: { label: "Rumor Tables", folder: "GM Toolkit", fields: { location: "" } },
  toolkit: { label: "GM Toolkit", folder: "GM Toolkit", fields: {} },
  map: { label: "Maps", folder: "Maps", fields: {} },
};

const TYPES = { ...FAMILIES, ...OTHER };
const CONTENT_ROOTS = ["World", "Campaigns", "Micro-settings", "GM Toolkit", "Archive"];
const HIDDEN_KEYS = new Set(["title", "subtitle", "infobox", "image", "layout", "tags", "aliases", "type", "status",
  "campaigns", "summary", "share", "cssclasses", "active", "cards", "name", "mapmarker", "fc-category", "fc-display-name"]);
const HIDDEN_BY_TYPE = { place: ["location"] };
const LABELS = { "fc-date": "Date", "fc-end": "Ends", max_stage: "Max stage", session_number: "Session" };
const DEFAULT_SHARE = { recap: true };

const subtypeKey = (type) => (FAMILIES[type] ? `${type}_type` : null);
const labelOf = (type) => (TYPES[type] ? TYPES[type].label : "Other");

function typesForPath(path) {
  const parts = String(path).split("/");
  const [root, a, b] = parts;
  if (root === "World") {
    const t = Object.keys(FAMILIES).find((k) => FAMILIES[k].folder === `World/${a}`);
    return t ? [t] : [];
  }
  if (root === "Archive") {
    const t = Object.keys(TYPES).find((k) => TYPES[k].label === a);
    return t ? [t] : Object.keys(TYPES);
  }
  if (root === "Campaigns") {
    if (parts.length === 3) return ["campaign"];
    if (b === "Arcs") return ["arc"];
    if (b === "Sessions") return ["session", "recap"];
    return [];
  }
  if (root === "Micro-settings") return ["microsetting"];
  if (root === "GM Toolkit") return ["encounter", "rumor_table", "toolkit"];
  if (root === "Maps") return ["map"];
  return [];
}

function folderFor(type, campaign) {
  if (!TYPES[type]) throw new Error(`Unknown type: ${type}`);
  if (TYPES[type].folder) return TYPES[type].folder;
  if (!campaign) throw new Error(`A ${type} needs a campaign.`);
  if (type === "campaign") return `Campaigns/${campaign}`;
  if (type === "arc") return `Campaigns/${campaign}/Arcs`;
  return `Campaigns/${campaign}/Sessions`;
}

const archivePath = (type, name) => `Archive/${labelOf(type)}/${name}.md`;
const handoutPath = (type, name) => `Player Handouts/${labelOf(type)}/${name}.md`;

module.exports = { FAMILIES, OTHER, TYPES, CONTENT_ROOTS, HIDDEN_KEYS, HIDDEN_BY_TYPE, LABELS, DEFAULT_SHARE,
  subtypeKey, labelOf, typesForPath, folderFor, archivePath, handoutPath };
```

- [ ] **Step 4: Implement `infobox.js`**

```js
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `~/.bun/bin/bun test _System/tools/tests/schema.test.js _System/tools/tests/infobox.test.js`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add _System && git commit -m "feat(lib): schema and Chronicler-style infobox renderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Note builder and body skeletons

**Files:**
- Create: `_System/Scripts/lib/notes.js`, and in `_System/Templates/Bodies/`: `person.md`, `group.md`, `place.md`, `thing.md`, `lore.md`, `plot.md`, `plot-clock.md`, `campaign.md`, `arc.md`, `session.md`, `recap.md`, `microsetting.md`, `encounter.md`, `rumor_table.md`, `toolkit.md`, `map.md`
- Test: `_System/tools/tests/notes.test.js`

**Interfaces:**
- Consumes: `schema`, `yaml.toYaml`, `markdown.fill/addConnection/splitFrontmatter`, `infobox.renderInfobox/upsertInfobox/readInfobox`
- Produces:
  - `buildFrontmatter(spec): object`
  - `buildNote(spec, bodyTemplate): string`

  Here `spec` = `{type, subtype?, name, summary?, campaigns?: string[], share?, fields?: object, tags?: string[], vars?: object, connections?: string[]}`.

  Also:
  - `bodyFile(type, subtype): string[]`: the candidate body paths, most specific first.
  - `nextSessionNumber(numbers): number`
  - `sessionName(campaign, n): string`
  - `noteIssues(fm, text, name): string[]`

- [ ] **Step 1: Write failing tests**

```js
const { test, expect } = require("bun:test");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const notes = require("../../Scripts/lib/notes.js");
const schema = require("../../Scripts/lib/schema.js");
const BODIES = join(__dirname, "../../Templates/Bodies");

test("buildNote writes frontmatter, fills the body, and renders the infobox first", () => {
  const text = notes.buildNote(
    { type: "person", subtype: "npc", name: "Mira Vell", summary: "Harbormaster.", fields: { role: "Harbormaster" }, connections: ["[[Rivertown]]"] },
    "{{intro}}Hello {{name}}.\n\n## Connections\n",
  );
  const [, yaml, body] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const fm = Bun.YAML.parse(yaml);
  expect(fm).toMatchObject({ title: "Mira Vell", type: "person", person_type: "npc", status: "active", summary: "Harbormaster.",
    share: false, tags: ["person"], role: "Harbormaster", cr_type: "person", name: "Mira Vell", campaigns: [] });
  expect(body.startsWith("> [!infobox]+ Mira Vell\n")).toBe(true);
  expect(body).toContain("> | **Role** | Harbormaster |");
  expect(body).toContain("Hello Mira Vell.");
  expect(body).toContain("## Connections\n- [[Rivertown]]");
});

test("subtype is validated and subtype fields are added", () => {
  expect(() => notes.buildFrontmatter({ type: "plot", subtype: "nope", name: "X" })).toThrow("plot_type");
  const clock = notes.buildFrontmatter({ type: "plot", subtype: "clock", name: "The Drowning" });
  expect(clock).toMatchObject({ plot_type: "clock", stage: 0, max_stage: 6 });
  expect(notes.buildFrontmatter({ type: "recap", name: "R" }).share).toBe(true);
});

test("session helpers", () => {
  expect(notes.nextSessionNumber([1, "3", 2, "x"])).toBe(4);
  expect(notes.nextSessionNumber([])).toBe(1);
  expect(notes.sessionName("Tides", 4)).toBe("Tides Session 4");
});

test("bodyFile prefers type-subtype then type", () => {
  expect(notes.bodyFile("plot", "clock")).toEqual(["_System/Templates/Bodies/plot-clock.md", "_System/Templates/Bodies/plot.md"]);
  expect(notes.bodyFile("session")).toEqual(["_System/Templates/Bodies/session.md"]);
});

test("every type has a body skeleton with {{intro}} and a Connections section", () => {
  const files = readdirSync(BODIES);
  for (const type of Object.keys(schema.TYPES)) {
    expect(files).toContain(`${type}.md`);
    const body = readFileSync(join(BODIES, `${type}.md`), "utf8");
    expect(body.startsWith("{{intro}}")).toBe(true);
    expect(body).toContain("## Connections");
    expect(body).not.toMatch(/```(dataview|dataviewjs)|<%/);
  }
});

test("noteIssues reports missing summary and stale infobox", () => {
  const text = notes.buildNote({ type: "thing", subtype: "key_item", name: "Key", summary: "" }, "{{intro}}\n## Connections\n");
  const fm = Bun.YAML.parse(text.match(/^---\n([\s\S]*?)\n---/)[1]);
  expect(notes.noteIssues(fm, text, "Key")).toEqual(["missing summary"]);
  expect(notes.noteIssues({ ...fm, summary: "ok", rarity: "rare" }, text, "Key")).toEqual(["infobox out of date"]);
  expect(notes.noteIssues({ ...fm, summary: "ok" }, "---\n---\nNo box", "Key")).toEqual(["infobox missing"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `~/.bun/bin/bun test _System/tools/tests/notes.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `notes.js`**

```js
// Builds new notes (frontmatter + body skeleton + infobox) and reports note health.
const schema = require("./schema");
const { toYaml } = require("./yaml");
const { fill, addConnection, splitFrontmatter } = require("./markdown");
const { renderInfobox, upsertInfobox, readInfobox } = require("./infobox");

const BODIES = "_System/Templates/Bodies";
const clone = (v) => (Array.isArray(v) ? [...v] : v);

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
  if (type === "person") Object.assign(fm, { cr_type: "person", name });
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
```

- [ ] **Step 4: Write the body skeletons**

Every file starts with `{{intro}}` (Deck of Worlds puts the card text there) and ends with `## Connections`. The prose placeholders are italic hints.

`person.md`:
```markdown
{{intro}}
_Who they are, as common knowledge. This part can be shared with players._

## Snippets
- **Appearance:**
- **Voice / mannerisms:**
- **Wants:**

> [!gm]- GM only
> _Secret, true motive, what they really know._

## Stats
_System-agnostic: paste or link a stat block for your game._

## Connections
```

`group.md`:
```markdown
{{intro}}
_What the group is and what people say about it._

## Snippets
- **Symbol / colours:**
- **How to join:**
- **What they want right now:**

> [!gm]- GM only
> _Hidden agenda, internal fractures, who really pulls the strings._

## Connections
```

`place.md`:
```markdown
{{intro}}
_What travellers see and hear about this place._

## Snippets
- **Sights / sounds / smells:**
- **For sale here:**
- **Local trouble:**
- **Rumour players might hear:**

> [!gm]- GM only
> _What's really going on here._

## Connections
```

`thing.md`:
```markdown
{{intro}}
_What it looks like and what is commonly believed about it._

> [!gm]- GM only
> _True properties, curse, history._

## Stats
_System-agnostic: paste or link the item's rules for your game._

## Connections
```

`lore.md`:
```markdown
{{intro}}
_The commonly told version._

> [!gm]- GM only
> _The truth behind the story._

## Connections
```

`plot.md`:
```markdown
{{intro}}
_What is happening or what the players could learn._

> [!gm]- GM only
> _Why it matters, what happens if ignored._

## Connections
```

`plot-clock.md`:
```markdown
{{intro}}
_What this clock tracks._

## What advances it
- 

## Stages
| Stage | Consequence |
|---|---|
| 1 |  |
| 2 |  |
| 3 |  |
| 4 |  |
| 5 |  |
| 6 |  |

## When it fills
_What happens._

## Connections
```

`campaign.md`:
```markdown
{{intro}}
## Premise
_One paragraph: what this campaign is about._

## The party
- 

## Arcs
- 

> [!gm]- GM only
> _Where this is heading._

## Connections
```

`arc.md`:
```markdown
{{intro}}
## Goal of this arc
_What the party is trying to do._

## Key beats
- 

> [!gm]- GM only
> _How it can end._

## Connections
```

`session.md`:
```markdown
{{intro}}
## Threads carried forward
{{carried}}

## Recap
_What happened, in order._

## Decisions that matter later
- 

## New or changed people, places, groups
- 

## Loose threads
- 

> [!gm]- GM prep notes
> _Strong start, scenes, secrets and clues._

## Connections
```

`recap.md`:
```markdown
{{intro}}
## What happened
_Player-facing recap. This note is shared with players by default._

## Connections
```

`microsetting.md`:
```markdown
{{intro}}
## The stack
{{cards_table}}

## Story in one paragraph
_Read the cards top to bottom and write what they add up to._

> [!gm]- GM only
> _How this micro-setting ties to your campaign._

## Connections
```

`encounter.md`:
```markdown
{{intro}}
## Setup
_Where, who, why now._

## Opposition
- 

## Terrain and twists
- 

> [!gm]- GM only
> _Tactics, morale, what they know._

## Connections
```

`rumor_table.md`:
```markdown
{{intro}}
| d6 | Rumour | True? |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |

## Connections
```

`toolkit.md`:
```markdown
{{intro}}
_Notes for running the game._

## Connections
```

`map.md` (Maps are excluded from validation and from the Foundry import):
````markdown
{{intro}}
```leaflet
id: {{name}}
image: [[Assets/Maps/placeholder-map.png]]
height: 600px
minZoom: -2
maxZoom: 2
defaultZoom: 0
unit: miles
markerFolder: World/Places
```

_Replace the image with your own map. Place notes whose frontmatter has `location: [y, x]` appear as markers automatically._

## Connections
````

- [ ] **Step 5: Run the tests to verify they pass**

Run: `~/.bun/bin/bun test _System/tools/tests/notes.test.js`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add _System && git commit -m "feat(lib): note builder and body skeletons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: World Bible index

**Files:**
- Create: `_System/Scripts/lib/bible.js`
- Test: `_System/tools/tests/bible.test.js`

**Interfaces:**
- Consumes: `schema`, `markdown.linkName/oneLine`
- Produces:
  - `START`, `END` (the marker strings)
  - `entryFromFrontmatter(name, fm): Entry`, where `Entry = {name, type, subtype, status, summary, stage, max_stage, owner, campaign, session_number, active}`
  - `buildIndex(entries: Entry[], stamp: string): string`
  - `replaceBetweenMarkers(text, content): string`: throws when the markers are missing or out of order.

- [ ] **Step 1: Write failing tests**

```js
const { test, expect } = require("bun:test");
const bible = require("../../Scripts/lib/bible.js");

const e = (name, fm) => bible.entryFromFrontmatter(name, fm);
const entries = [
  e("Mira Vell", { type: "person", person_type: "npc", status: "active", summary: "Harbormaster;\n smuggler." }),
  e("Ansel", { type: "person", person_type: "pc", status: "background", summary: "" }),
  e("Old Duke", { type: "person", person_type: "npc", status: "archived", summary: "Dead." }),
  e("The Drowning", { type: "plot", plot_type: "clock", status: "active", summary: "Floods.", stage: 3, max_stage: 6, owner: "[[Tide Court]]" }),
  e("Tides", { type: "campaign", status: "active", summary: "Main game.", active: true }),
  e("Tides Session 1", { type: "session", status: "active", summary: "Arrived.", campaign: "[[Tides]]", session_number: 1 }),
  e("Tides Session 2", { type: "session", status: "active", summary: "Fought.", campaign: [["Tides"]], session_number: 2 }),
  e("Saltmarsh", { type: "microsetting", status: "active", summary: "Swamp stack." }),
];

test("buildIndex groups, sorts and summarises", () => {
  const out = bible.buildIndex(entries, "2026-09-25 10:00");
  expect(out).toContain("## People (2)\n- [[Ansel]] — pc · background · (no summary)\n- [[Mira Vell]] — npc · active · Harbormaster; smuggler.");
  expect(out).toContain("## Groups (0)\n");
  expect(out).toContain("## Plot (1)\n- [[The Drowning]] — clock · active · Floods.");
  expect(out).toContain("## Active clocks\n- [[The Drowning]] — 3/6 · owner [[Tide Court]]");
  expect(out).toContain("## Campaigns\n- [[Tides]] — active · 2 sessions · last [[Tides Session 2]] — Fought.");
  expect(out).toContain("## Micro-settings (1)\n- [[Saltmarsh]] — active · Swamp stack.");
  expect(out).toContain("## Archived: 1 notes (not listed)");
  expect(out).not.toContain("Old Duke");
  expect(out.startsWith("_Generated 2026-09-25 10:00")).toBe(true);
});

test("replaceBetweenMarkers keeps everything outside the markers", () => {
  const text = `# WB\nHand text\n${bible.START}\nold\n${bible.END}\nFooter\n`;
  expect(bible.replaceBetweenMarkers(text, "new")).toBe(`# WB\nHand text\n${bible.START}\nnew\n${bible.END}\nFooter\n`);
});

test("replaceBetweenMarkers refuses when markers are missing or reversed", () => {
  expect(() => bible.replaceBetweenMarkers("no markers", "x")).toThrow("markers");
  expect(() => bible.replaceBetweenMarkers(`${bible.END}\n${bible.START}`, "x")).toThrow("markers");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/bible.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `bible.js`**

```js
// Generates the World Bible index: one line per entity, so the AI reads one file first.
const schema = require("./schema");
const { linkName, oneLine } = require("./markdown");

const START = "<!-- WB:INDEX START -->";
const END = "<!-- WB:INDEX END -->";
const ORDER = ["person", "group", "place", "thing", "lore", "plot"];

function entryFromFrontmatter(name, fm) {
  fm = fm || {};
  const sk = schema.subtypeKey(fm.type);
  return {
    name, type: fm.type, subtype: sk ? fm[sk] || "" : "", status: fm.status || "active", summary: oneLine(fm.summary),
    stage: fm.stage, max_stage: fm.max_stage, owner: fm.owner, campaign: linkName(fm.campaign),
    session_number: fm.session_number, active: fm.active === true,
  };
}

const byName = (a, b) => a.name.localeCompare(b.name);
const describe = (e) => [e.subtype, e.status].filter(Boolean).join(" · ");
const line = (e) => `- [[${e.name}]] — ${describe(e)} · ${e.summary || "(no summary)"}`;

function buildIndex(entries, stamp) {
  const live = entries.filter((e) => e.status !== "archived");
  const out = [`_Generated ${stamp}. Do not edit between the markers; run "WB: Rebuild World Bible"._`, ""];
  for (const t of ORDER) {
    const list = live.filter((e) => e.type === t).sort(byName);
    out.push(`## ${schema.FAMILIES[t].label} (${list.length})`, ...list.map(line), "");
  }
  const clocks = live.filter((e) => e.type === "plot" && e.subtype === "clock" && e.status === "active").sort(byName);
  out.push("## Active clocks");
  out.push(...(clocks.length ? clocks.map((c) => `- [[${c.name}]] — ${c.stage ?? 0}/${c.max_stage ?? "?"}${c.owner ? ` · owner [[${linkName(c.owner)}]]` : ""}`) : ["- none"]), "");
  const campaigns = live.filter((e) => e.type === "campaign").sort(byName);
  out.push("## Campaigns");
  for (const c of campaigns) {
    const sessions = live.filter((e) => e.type === "session" && e.campaign === c.name)
      .sort((a, b) => Number(b.session_number) - Number(a.session_number));
    const last = sessions[0];
    out.push(`- [[${c.name}]] — ${c.active ? "active" : "inactive"} · ${sessions.length} sessions${last ? ` · last [[${last.name}]] — ${last.summary || "(no summary)"}` : ""}`);
  }
  if (!campaigns.length) out.push("- none");
  out.push("");
  const ms = live.filter((e) => e.type === "microsetting").sort(byName);
  out.push(`## Micro-settings (${ms.length})`, ...ms.map(line), "");
  out.push(`## Archived: ${entries.length - live.length} notes (not listed)`);
  return out.join("\n");
}

function replaceBetweenMarkers(text, content) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s === -1 || e === -1 || e < s) throw new Error(`World Bible markers missing or out of order. Add ${START} and ${END} on their own lines.`);
  return `${text.slice(0, s + START.length)}\n${content}\n${text.slice(e)}`;
}

module.exports = { START, END, entryFromFrontmatter, buildIndex, replaceBetweenMarkers };
```

- [ ] **Step 4: Run to verify pass**

Run: `~/.bun/bin/bun test _System/tools/tests/bible.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add _System && git commit -m "feat(lib): World Bible index generator

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Player handout stripping

**Files:**
- Create: `_System/Scripts/lib/handouts.js`
- Test: `_System/tools/tests/handouts.test.js`

**Interfaces:**
- Consumes: `markdown.linkTarget`, `yaml.toYaml`
- Produces:
  - `stripSecrets(body): string`: removes `[!gm]` callouts at any nesting depth or case, and `%%comments%%`.
  - `unlinkUnshared(body, shared: Set<string>): string`
  - `makeHandout(fm, body, shared): string`: the full file text.
  - `KEEP_KEYS`

- [ ] **Step 1: Write failing tests**

```js
const { test, expect } = require("bun:test");
const h = require("../../Scripts/lib/handouts.js");

test("strips gm callouts of any case, fold state and nesting, plus %% comments", () => {
  const body = [
    "Public.", "> [!gm]- Secret", "> hidden 1", "", "Still public. %%inline secret%%",
    "> [!note] Note", "> keep", "> > [!GM]+ nested", "> > hidden 2", "> after nested", "",
    "%%", "block secret", "%%", "End.",
  ].join("\n");
  const out = h.stripSecrets(body);
  expect(out).not.toContain("hidden");
  expect(out).not.toContain("secret");
  expect(out).toContain("> [!note] Note\n> keep\n> after nested");
  expect(out).toContain("Public.");
  expect(out).toContain("End.");
});

test("links to unshared notes become plain text; shared, asset and self links stay", () => {
  const shared = new Set(["Rivertown"]);
  const body = "[[Rivertown]] [[Mira Vell|the Harbormaster]] [[World/People/Ansel]] ![[Secret Map]] ![[Assets/r.jpg]] [[#Heading]] [[Mira Vell\\|alias]]";
  expect(h.unlinkUnshared(body, shared)).toBe("[[Rivertown]] the Harbormaster Ansel  ![[Assets/r.jpg]] [[#Heading]] alias");
});

test("makeHandout keeps only display frontmatter", () => {
  const out = h.makeHandout({ title: "Rivertown", type: "place", summary: "secret-ish", share: true, tags: ["place"], ruler: "[[X]]" },
    "Body [[X]]\n> [!gm] s\n> x\n", new Set());
  expect(out).toBe("---\ntitle: Rivertown\ntype: place\ntags: [place]\n---\nBody X\n");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/handouts.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `handouts.js`**

```js
// Turns a GM note into a player-safe copy for the shared Foundry folder.
const { linkTarget } = require("./markdown");
const { toYaml } = require("./yaml");

const KEEP_KEYS = ["title", "subtitle", "infobox", "image", "type", "tags"];
const depth = (line) => ((line.match(/^(\s*>)+/) || [""])[0].match(/>/g) || []).length;
const GM = /^(\s*>)+\s*\[!gm\]/i;

function stripSecrets(body) {
  const out = [];
  let skipDepth = 0;
  for (const line of String(body).replace(/%%[\s\S]*?%%/g, "").split("\n")) {
    if (skipDepth) {
      if (depth(line) >= skipDepth) continue;
      skipDepth = 0;
    }
    if (GM.test(line)) { skipDepth = depth(line); continue; }
    out.push(line);
  }
  return out.join("\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
}

const isAsset = (name) => /\.(?!md$)[a-z0-9]+$/i.test(name);

function unlinkUnshared(body, shared) {
  return String(body).replace(/(!?)\[\[([^\]]+)\]\]/g, (all, bang, inner) => {
    const target = linkTarget(inner);
    if (target === "") return all;
    const base = target.split("/").pop();
    if (isAsset(base) || shared.has(base)) return all;
    if (bang) return "";
    const pipe = inner.indexOf("|");
    return pipe === -1 ? base : inner.slice(pipe + 1);
  });
}

function makeHandout(fm, body, shared) {
  const keep = {};
  for (const k of KEEP_KEYS) if (fm[k] !== undefined && fm[k] !== null && fm[k] !== "") keep[k] = fm[k];
  const clean = unlinkUnshared(stripSecrets(body), shared).replace(/\s+$/, "");
  return `---\n${toYaml(keep)}\n---\n${clean}\n`;
}

module.exports = { KEEP_KEYS, stripSecrets, unlinkUnshared, makeHandout };
```

- [ ] **Step 4: Run to verify pass**

Run: `~/.bun/bin/bun test _System/tools/tests/handouts.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add _System && git commit -m "feat(lib): player handout secret stripping

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Deck of Worlds planner

**Files:**
- Create: `_System/Scripts/lib/deck.js`
- Test: `_System/tools/tests/deck.test.js`

**Interfaces:**
- Consumes: `markdown.escapeCell/oneLine`
- Produces:
  - `SLOTS` = `["landmark","namesake","origin","attribute","advent"]`
  - `BIOMES`
  - `KINDS`: kind → `{type, subtype, label}`
  - `summarize(text): string`
  - `planStack({name, biome, cards: Card[]})`, where `Card = {slot, kind, text, noteName}` and `kind` is one of `KINDS` or `"existing"`. It returns `{notes: spec[], links: {name, connection}[], microsetting: spec}`, and throws on duplicate or missing note names.

- [ ] **Step 1: Write failing tests**

```js
const { test, expect } = require("bun:test");
const deck = require("../../Scripts/lib/deck.js");

const cards = [
  { slot: "landmark", kind: "place", text: "A drowned bell tower. It still rings at low tide.", noteName: "The Drowned Bell" },
  { slot: "namesake", kind: "person", text: "Named for Sister Wren.", noteName: "Sister Wren" },
  { slot: "origin", kind: "existing", text: "Built by the Tide Court.", noteName: "Tide Court" },
  { slot: "advent", kind: "hook", text: "The bell rang at high tide.", noteName: "The Wrong Tide" },
];

test("planStack creates notes, links neighbours and the stack note", () => {
  const plan = deck.planStack({ name: "Saltmarsh Bell", biome: "Swamp", cards });
  expect(plan.notes.map((n) => [n.type, n.subtype, n.name])).toEqual([
    ["place", "landmark", "The Drowned Bell"], ["person", "npc", "Sister Wren"], ["plot", "hook", "The Wrong Tide"],
  ]);
  expect(plan.notes[0].summary).toBe("A drowned bell tower.");
  expect(plan.notes[0].connections).toEqual(["[[Saltmarsh Bell]] (micro-setting: landmark)", "[[Sister Wren]]"]);
  expect(plan.notes[1].connections).toEqual(["[[Saltmarsh Bell]] (micro-setting: namesake)", "[[The Drowned Bell]]", "[[Tide Court]]"]);
  expect(plan.notes[0].vars.intro).toBe("> [!quote] Deck of Worlds: landmark\n> A drowned bell tower. It still rings at low tide.\n\n");
  expect(plan.links).toEqual([{ name: "Tide Court", connection: "[[Saltmarsh Bell]] (micro-setting: origin)" }]);
  const ms = plan.microsetting;
  expect(ms).toMatchObject({ type: "microsetting", name: "Saltmarsh Bell", fields: { region_card: "Swamp",
    cards: ["[[The Drowned Bell]]", "[[Sister Wren]]", "[[Tide Court]]", "[[The Wrong Tide]]"] } });
  expect(ms.vars.cards_table).toContain("| Attribute | — | — |");
  expect(ms.vars.cards_table).toContain("| Origin | Built by the Tide Court. | [[Tide Court]] |");
});

test("planStack rejects duplicate or empty names, and no cards", () => {
  expect(() => deck.planStack({ name: "X", biome: "Swamp", cards: [cards[0], { ...cards[1], noteName: "The Drowned Bell" }] })).toThrow("twice");
  expect(() => deck.planStack({ name: "X", biome: "Swamp", cards: [{ ...cards[0], noteName: " " }] })).toThrow("name");
  expect(() => deck.planStack({ name: "X", biome: "Swamp", cards: [] })).toThrow("at least one");
});

test("summarize takes the first sentence and caps length", () => {
  expect(deck.summarize("One. Two.")).toBe("One.");
  expect(deck.summarize("x".repeat(200)).length).toBe(140);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/deck.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `deck.js`**

```js
// Plans the notes for one Deck of Worlds stack (Region + up to five cards). No card text ships with the vault.
const { escapeCell, oneLine } = require("./markdown");

const SLOTS = ["landmark", "namesake", "origin", "attribute", "advent"];
const BIOMES = ["Coast", "Desert", "Forest", "Hills", "Jungle", "Mountain", "Plains", "Swamp", "Tundra", "Underground", "Urban"];
const KINDS = {
  place: { type: "place", subtype: "landmark", label: "New place" },
  person: { type: "person", subtype: "npc", label: "New person" },
  group: { type: "group", subtype: "power", label: "New group" },
  lore: { type: "lore", subtype: "history", label: "New lore" },
  event: { type: "plot", subtype: "event", label: "New event" },
  hook: { type: "plot", subtype: "hook", label: "New plot hook" },
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function summarize(text, max = 140) {
  const one = oneLine(text);
  const m = one.match(/^.*?[.!?](?=\s|$)/);
  const first = m ? m[0] : one;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…`.slice(0, max) : first;
}

function planStack({ name, biome, cards }) {
  const used = (cards || []).filter((c) => c && c.kind !== "skip");
  if (!used.length) throw new Error("A micro-setting needs at least one card.");
  const seen = new Set();
  for (const c of used) {
    const n = oneLine(c.noteName);
    if (!n) throw new Error(`The ${c.slot} card needs a note name.`);
    if (seen.has(n) && c.kind !== "existing") throw new Error(`"${n}" is used twice in this stack.`);
    seen.add(n);
  }
  const tag = (c) => `[[${name}]] (micro-setting: ${c.slot})`;
  const notes = [];
  const links = [];
  used.forEach((c, i) => {
    if (c.kind === "existing") { links.push({ name: c.noteName, connection: tag(c) }); return; }
    const k = KINDS[c.kind];
    if (!k) throw new Error(`Unknown card kind: ${c.kind}`);
    const connections = [tag(c)];
    if (i > 0) connections.push(`[[${used[i - 1].noteName}]]`);
    if (i < used.length - 1) connections.push(`[[${used[i + 1].noteName}]]`);
    const quoted = String(c.text).trim().split("\n").map((l) => `> ${l}`).join("\n");
    notes.push({ type: k.type, subtype: k.subtype, name: c.noteName, summary: summarize(c.text), connections,
      vars: { intro: `> [!quote] Deck of Worlds: ${c.slot}\n${quoted}\n\n` } });
  });
  const rows = SLOTS.map((slot) => {
    const c = used.find((x) => x.slot === slot);
    return c ? `| ${cap(slot)} | ${escapeCell(oneLine(c.text))} | [[${c.noteName}]] |` : `| ${cap(slot)} | — | — |`;
  });
  const microsetting = {
    type: "microsetting", name, summary: `Deck of Worlds micro-setting (${biome}).`,
    fields: { region_card: biome, cards: used.map((c) => `[[${c.noteName}]]`) },
    connections: used.map((c) => `[[${c.noteName}]]`),
    vars: { cards_table: [`| Card | Text | Became |`, `|---|---|---|`, `| Region | ${biome} | — |`, ...rows].join("\n") },
  };
  return { notes, links, microsetting };
}

module.exports = { SLOTS, BIOMES, KINDS, summarize, planStack };
```

- [ ] **Step 4: Run to verify pass**

Run: `~/.bun/bin/bun test _System/tools/tests/deck.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add _System && git commit -m "feat(lib): Deck of Worlds stack planner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Loader, fake app, and entity-creation commands

**Files:**
- Create: `_System/Scripts/loader.js`, `_System/Scripts/lib/commands.js`, `_System/tools/tests/fake-app.js`
- Test: `_System/tools/tests/commands-create.test.js`

**Interfaces:**
- Consumes: every lib module.
- Produces:
  - `loadWb(app): Promise<{schema, markdown, yaml, infobox, notes, bible, handouts, deck, commands}>`
  - `commands.run(name, params)`: `params` is the QuickAdd params object `{app, quickAddApi, obsidian}`. It catches `CANCEL` silently and shows other errors in an info dialog.
  - `commands.fromTemplater(tp, app, type|null): Promise<string>`
  - Command functions, all `async (ctx)` with `ctx = {app, ui, now: Date}`: `newEntity`, `newCampaign`, `newSession` (this task), plus `refreshInfobox`, `rebuildWorldBible`, `exportHandouts`, `archiveNote`, `removeExamples`, `deckOfWorlds` (Task 9).
  - The `ui` adapter: `{prompt(header, value?), wide(header), suggest(labels, values, placeholder?), confirm(header, text), info(header, text)}`. A cancelled prompt resolves to `null`/`undefined`.
  - `commands.CANCEL`
  - Test helpers:
    - `makeFakeApp(files)`: returns `{app, store}` and preloads every file under `_System/Scripts` and `_System/Templates` from disk.
    - `makeUi(answers)`: `ui.log` records every question.

- [ ] **Step 1: Write the fake app**

`_System/tools/tests/fake-app.js`:
```js
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
```

- [ ] **Step 2: Write failing tests**

`_System/tools/tests/commands-create.test.js`:
```js
const { test, expect } = require("bun:test");
const { makeFakeApp, makeUi } = require("./fake-app.js");

async function boot(files) {
  const { app, store } = makeFakeApp(files);
  const src = store.get("_System/Scripts/loader.js");
  const m = { exports: {} };
  new Function("module", "exports", src)(m, m.exports);
  const wb = await m.exports.loadWb(app);
  return { app, store, wb };
}
const fmOf = (store, p) => Bun.YAML.parse(store.get(p).match(/^---\n([\s\S]*?)\n---/)[1]);

test("loader exposes every lib module", async () => {
  const { wb } = await boot();
  for (const k of ["schema", "markdown", "yaml", "infobox", "notes", "bible", "handouts", "deck", "commands"]) expect(wb[k]).toBeDefined();
});

test("newEntity creates a person in World/People", async () => {
  const { app, store, wb } = await boot();
  const ui = makeUi(["person", "npc", "Mira Vell", "Harbormaster of Rivertown."]);
  await wb.commands.newEntity({ app, ui, now: new Date("2026-09-25T10:00:00") });
  const fm = fmOf(store, "World/People/Mira Vell.md");
  expect(fm).toMatchObject({ type: "person", person_type: "npc", summary: "Harbormaster of Rivertown." });
});

test("newEntity refuses a duplicate name and creates nothing", async () => {
  const { app, store, wb } = await boot({ "World/Places/Mira Vell.md": "---\ntype: place\n---\n" });
  const before = store.size;
  const ui = makeUi(["person", "npc", "Mira Vell", ""]);
  await expect(wb.commands.newEntity({ app, ui, now: new Date() })).rejects.toThrow("already exists");
  expect(store.size).toBe(before);
});

test("cancelling a prompt throws CANCEL and creates nothing", async () => {
  const { app, store, wb } = await boot();
  const before = store.size;
  await expect(wb.commands.newEntity({ app, ui: makeUi(["person", null]), now: new Date() })).rejects.toBe(wb.commands.CANCEL);
  expect(store.size).toBe(before);
});

test("newCampaign makes folders, the campaign note, and becomes the only active campaign", async () => {
  const { app, store, wb } = await boot({ "Campaigns/Old/Old.md": "---\ntype: campaign\nactive: true\n---\n" });
  await wb.commands.newCampaign({ app, ui: makeUi(["Tides", "Shadowdark"]), now: new Date() });
  expect(fmOf(store, "Campaigns/Tides/Tides.md")).toMatchObject({ type: "campaign", active: true, system: "Shadowdark" });
  expect(fmOf(store, "Campaigns/Old/Old.md").active).toBe(false);
  expect(app.vault.getAbstractFileByPath("Campaigns/Tides/Sessions")).not.toBe(null);
  expect(app.vault.getAbstractFileByPath("Campaigns/Tides/Arcs")).not.toBe(null);
});

test("newSession numbers sessions, carries loose threads, and optionally makes a recap", async () => {
  const { app, store, wb } = await boot({
    "Campaigns/Tides/Tides.md": "---\ntype: campaign\nactive: true\n---\n",
    "Campaigns/Tides/Sessions/Tides Session 1.md": "---\ntype: session\ncampaign: \"[[Tides]]\"\nsession_number: 1\n---\n## Loose threads\n- Who rang the bell?\n\n## Connections\n",
  });
  await wb.commands.newSession({ app, ui: makeUi([true]), now: new Date("2026-09-25T10:00:00") });
  const p = "Campaigns/Tides/Sessions/Tides Session 2.md";
  expect(fmOf(store, p)).toMatchObject({ type: "session", session_number: 2, campaign: "[[Tides]]", date: "2026-09-25" });
  expect(store.get(p)).toContain("## Threads carried forward\n- Who rang the bell?");
  expect(store.get(p)).toContain("- Previous: [[Tides Session 1]]");
  expect(fmOf(store, "Campaigns/Tides/Sessions/Tides Session 2 Recap.md")).toMatchObject({ type: "recap", share: true, session: "[[Tides Session 2]]" });
});

test("newSession without any campaign explains what to do", async () => {
  const { app, wb } = await boot();
  await expect(wb.commands.newSession({ app, ui: makeUi([]), now: new Date() })).rejects.toThrow("New campaign");
});

test("fromTemplater infers the type from the folder and returns the note text", async () => {
  const { app, wb } = await boot();
  let renamed = null;
  const tp = {
    file: { path: () => "World/Things/Untitled.md", rename: async (n) => { renamed = n; } },
    system: {
      prompt: async (h) => (h.startsWith("Name") ? "Bell Key" : "Opens the bell."),
      suggester: async (labels, values) => values.find((v) => v === "key_item"),
    },
  };
  const text = await wb.commands.fromTemplater(tp, app, null);
  expect(renamed).toBe("Bell Key");
  expect(text).toContain("thing_type: key_item");
  expect(text).toContain("> [!infobox]+ Bell Key");
});
```

- [ ] **Step 3: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/commands-create.test.js`
Expected: FAIL, `ENOENT _System/Scripts/loader.js` (or undefined `loader.js` in the store).

- [ ] **Step 4: Implement `loader.js`**

```js
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
```

- [ ] **Step 5: Implement `commands.js` (creation half)**

```js
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
```

Two notes on this code:
- `fromTemplater` for `campaign` doesn't set `active: true` (only the QuickAdd command does), because its folders might not exist yet.
- In the newEntity summary prompt, an empty answer (`""`) is fine; `null` is fine too, because the summary is optional and isn't wrapped in `ask`.

- [ ] **Step 6: Run to verify pass**

Run: `~/.bun/bin/bun test _System/tools/tests/commands-create.test.js`
Expected: all pass. The loader test also proves that every lib module only `require`s sibling modules. If one uses a Node built-in, the loader throws `unknown module`.

- [ ] **Step 7: Commit**

```bash
git add _System && git commit -m "feat: vault loader and entity-creation commands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Maintenance, bible, handout, archive, and Deck of Worlds commands

**Files:**
- Modify: `_System/Scripts/lib/commands.js` (add the functions below; extend `module.exports`)
- Test: `_System/tools/tests/commands-maintain.test.js`

**Interfaces:**
- Consumes: the Task 8 helpers (`ask`, `fmOf`, `under`, `ofType`, `ensureFolder`, `readBody`, `assertFree`, `cleanName`, `createEntity`, `stamp`).
- Produces (each `async (ctx)`):
  - `refreshInfobox`: returns the changed count.
  - `rebuildWorldBible`
  - `exportHandouts`: returns `{written, removed}`.
  - `archiveNote`
  - `removeExamples`: returns the count.
  - `deckOfWorlds`: returns the micro-setting file.

- [ ] **Step 1: Write failing tests**

```js
const { test, expect } = require("bun:test");
const { makeFakeApp, makeUi } = require("./fake-app.js");

async function boot(files) {
  const { app, store } = makeFakeApp(files);
  const m = { exports: {} };
  new Function("module", "exports", store.get("_System/Scripts/loader.js"))(m, m.exports);
  return { app, store, wb: await m.exports.loadWb(app) };
}
const NOW = new Date("2026-09-25T10:30:00");
const note = (fm, body = "") => `---\n${fm}\n---\n${body}`;

test("refreshInfobox rewrites only stale boxes and preserves frontmatter text", async () => {
  const fmText = "title: Key\ntype: thing\nthing_type: key_item\nstatus: active\nsummary: x\nrarity: rare  # keep this comment";
  const { app, store, wb } = await boot({ "World/Things/Key.md": note(fmText, "Body\n") });
  const n = await wb.commands.refreshInfobox({ app, ui: makeUi(["vault"]), now: NOW });
  expect(n).toBe(1);
  const text = store.get("World/Things/Key.md");
  expect(text.startsWith(`---\n${fmText}\n---\n> [!infobox]+ Key`)).toBe(true);
  expect(text).toContain("> | **Rarity** | rare |");
  expect(await wb.commands.refreshInfobox({ app, ui: makeUi(["vault"]), now: NOW })).toBe(0);
});

test("rebuildWorldBible replaces only the index", async () => {
  const { app, store, wb } = await boot({
    "World Bible.md": "# World Bible\nMine.\n<!-- WB:INDEX START -->\nold\n<!-- WB:INDEX END -->\n",
    "World/People/Mira.md": note("type: person\nperson_type: npc\nstatus: active\nsummary: Harbormaster."),
  });
  await wb.commands.rebuildWorldBible({ app, ui: makeUi([]), now: NOW });
  const t = store.get("World Bible.md");
  expect(t.startsWith("# World Bible\nMine.\n<!-- WB:INDEX START -->\n_Generated 2026-09-25 10:30")).toBe(true);
  expect(t).toContain("- [[Mira]] — npc · active · Harbormaster.");
  expect(t.endsWith("<!-- WB:INDEX END -->\n")).toBe(true);
});

test("exportHandouts writes shared notes without secrets and removes stale copies", async () => {
  const { app, store, wb } = await boot({
    "World/Places/Rivertown.md": note("title: Rivertown\ntype: place\nshare: true\ntags: [place]", "Ruled by [[Mira]].\n> [!gm] Secret\n> doppelganger\n"),
    "World/People/Mira.md": note("type: person\nshare: false", "x"),
    "Player Handouts/Places/Old.md": "stale",
  });
  const r = await wb.commands.exportHandouts({ app, ui: makeUi([]), now: NOW });
  expect(r).toEqual({ written: 1, removed: 1 });
  const out = store.get("Player Handouts/Places/Rivertown.md");
  expect(out).toContain("Ruled by Mira.");
  expect(out).not.toContain("doppelganger");
  expect(store.has("Player Handouts/Places/Old.md")).toBe(false);
});

test("archiveNote marks archived and moves under Archive/<Family>", async () => {
  const { app, store, wb } = await boot({ "World/People/Mira.md": note("type: person\nstatus: active", "x") });
  app.workspace.activePath = "World/People/Mira.md";
  await wb.commands.archiveNote({ app, ui: makeUi([true]), now: NOW });
  expect(store.has("World/People/Mira.md")).toBe(false);
  expect(store.get("Archive/People/Mira.md")).toContain("status: archived");
});

test("removeExamples deletes only notes tagged example after confirmation", async () => {
  const { app, store, wb } = await boot({
    "World/People/Ex.md": note("type: person\ntags: [person, example]"),
    "World/People/Real.md": note("type: person\ntags: [person]"),
  });
  expect(await wb.commands.removeExamples({ app, ui: makeUi([true]), now: NOW })).toBe(1);
  expect(store.has("World/People/Ex.md")).toBe(false);
  expect(store.has("World/People/Real.md")).toBe(true);
});

test("deckOfWorlds creates linked notes, the stack note, and updates existing notes", async () => {
  const { app, store, wb } = await boot({ "World/Groups/Tide Court.md": note("type: group", "Court.\n\n## Connections\n") });
  const ui = makeUi([
    "Saltmarsh Bell", "Swamp",
    "place", "A drowned bell tower. It rings.", "The Drowned Bell",   // landmark
    "person", "Named for Sister Wren.", "Sister Wren",               // namesake
    "existing", "Built by the Tide Court.", "Tide Court",            // origin
    "skip",                                                           // attribute
    "hook", "The bell rang at high tide.", "The Wrong Tide",         // advent
    false,                                                            // rebuild World Bible?
  ]);
  await wb.commands.deckOfWorlds({ app, ui, now: NOW });
  expect(store.get("World/Places/The Drowned Bell.md")).toContain("> [!quote] Deck of Worlds: landmark");
  expect(store.get("World/People/Sister Wren.md")).toContain("- [[Saltmarsh Bell]] (micro-setting: namesake)");
  expect(store.get("World/Plot/The Wrong Tide.md")).toContain("plot_type: hook");
  expect(store.get("Micro-settings/Saltmarsh Bell.md")).toContain("| Origin | Built by the Tide Court. | [[Tide Court]] |");
  expect(store.get("World/Groups/Tide Court.md")).toContain("## Connections\n- [[Saltmarsh Bell]] (micro-setting: origin)");
});

test("deckOfWorlds creates nothing when a name collides or the user cancels", async () => {
  const { app, store, wb } = await boot({ "World/People/Sister Wren.md": note("type: person") });
  const before = new Map(store);
  const collide = makeUi(["Stack", "Swamp", "place", "t", "New Place", "person", "t", "Sister Wren", "skip", "skip", "skip"]);
  await expect(wb.commands.deckOfWorlds({ app, ui: collide, now: NOW })).rejects.toThrow("already exists");
  expect(new Map(store)).toEqual(before);
  const cancel = makeUi(["Stack", "Swamp", "place", "t", null]);
  await expect(wb.commands.deckOfWorlds({ app, ui: cancel, now: NOW })).rejects.toBe(wb.commands.CANCEL);
  expect(new Map(store)).toEqual(before);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/commands-maintain.test.js`
Expected: FAIL, `wb.commands.refreshInfobox is not a function`.

- [ ] **Step 3: Add the commands to `commands.js`**

Insert the following before `// ---------- entry point for QuickAdd scripts ----------`:
```js
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
  const existing = under(app, schema.CONTENT_ROOTS).map((f) => f.basename).sort();
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
  const bodies = {};
  for (const n of [plan.microsetting, ...plan.notes]) bodies[n.name] = await readBody(app, n.type, n.subtype);
  // 3. Write.
  for (const n of plan.notes) {
    await ensureFolder(app, schema.folderFor(n.type));
    await app.vault.create(`${schema.folderFor(n.type)}/${n.name}.md`, notes.buildNote(n, bodies[n.name]));
  }
  await ensureFolder(app, "Micro-settings");
  const file = await app.vault.create(`Micro-settings/${name}.md`, notes.buildNote(plan.microsetting, bodies[name]));
  for (const l of plan.links) {
    const target = app.metadataCache.getFirstLinkpathDest(l.name, "");
    if (target) await app.vault.process(target, (text) => {
      const { frontmatter, body } = md.splitFrontmatter(text);
      return frontmatter + md.addConnection(body, l.connection);
    });
  }
  if (await ui.confirm("Rebuild the World Bible now?", "Adds the new notes to the index.")) await rebuildWorldBible(ctx);
  await openFile(app, file);
  return file;
}
```

Extend `module.exports` with `refreshInfobox, rebuildWorldBible, exportHandouts, archiveNote, removeExamples, deckOfWorlds`.

- [ ] **Step 4: Run all tests**

Run: `~/.bun/bin/bun test _System/tools/tests`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add _System && git commit -m "feat: infobox refresh, World Bible, handouts, archive, Deck of Worlds commands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: QuickAdd bootstraps, Templater user script, and thin templates

**Files:**
- Create in `_System/Scripts/quickadd/`: `new-entity.js`, `new-campaign.js`, `new-session.js`, `refresh-infobox.js`, `rebuild-world-bible.js`, `deck-of-worlds.js`, `export-handouts.js`, `archive-note.js`, `remove-examples.js`
- Create: `_System/Scripts/templater/wb.js`
- Create in `_System/Templates/`: `Person.md`, `Group.md`, `Place.md`, `Thing.md`, `Lore.md`, `Plot.md`, `Campaign Item.md`, `Micro-setting.md`, `Map.md`, `GM Toolkit Item.md`
- Test: `_System/tools/tests/wiring.test.js`

**Interfaces:**
- Consumes: `commands.run(name, params)` and `commands.fromTemplater(tp, app, type)`.
- Produces: `COMMANDS` (the list in the test below), used by Task 13's QuickAdd config.

- [ ] **Step 1: Write the failing wiring test**

```js
const { test, expect } = require("bun:test");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const commands = require("../../Scripts/lib/commands.js");
const schema = require("../../Scripts/lib/schema.js");
const S = join(__dirname, "../..");

const COMMANDS = {
  "new-entity": "newEntity", "new-campaign": "newCampaign", "new-session": "newSession",
  "refresh-infobox": "refreshInfobox", "rebuild-world-bible": "rebuildWorldBible", "deck-of-worlds": "deckOfWorlds",
  "export-handouts": "exportHandouts", "archive-note": "archiveNote", "remove-examples": "removeExamples",
};

test("each QuickAdd script calls an existing command", () => {
  for (const [file, fn] of Object.entries(COMMANDS)) {
    const src = readFileSync(join(S, "Scripts/quickadd", `${file}.js`), "utf8");
    expect(src).toContain(`wb.commands.run("${fn}", params)`);
    expect(typeof commands[fn]).toBe("function");
  }
});

test("each Templater template calls fromTemplater with a known type or null", () => {
  const TEMPLATES = { Person: "person", Group: "group", Place: "place", Thing: "thing", Lore: "lore", Plot: "plot",
    "Campaign Item": null, "Micro-setting": "microsetting", Map: "map", "GM Toolkit Item": null };
  for (const [name, type] of Object.entries(TEMPLATES)) {
    const src = readFileSync(join(S, "Templates", `${name}.md`), "utf8");
    expect(src).toContain(`fromTemplater(tp, app, ${type === null ? "null" : `"${type}"`})`);
    if (type) expect(schema.TYPES[type]).toBeDefined();
  }
  expect(existsSync(join(S, "Scripts/templater/wb.js"))).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/wiring.test.js`
Expected: FAIL, ENOENT for `new-entity.js`.

- [ ] **Step 3: Create the QuickAdd bootstraps**

All nine are identical except for the command name. `new-entity.js`:
```js
// QuickAdd user script → WB: New entity. Logic lives in _System/Scripts/lib/commands.js.
module.exports = async (params) => {
  const src = await params.app.vault.adapter.read("_System/Scripts/loader.js");
  const m = { exports: {} };
  new Function("module", "exports", src)(m, m.exports);
  const wb = await m.exports.loadWb(params.app);
  await wb.commands.run("newEntity", params);
};
```
Generate the rest with:
```bash
cd _System/Scripts/quickadd
for pair in new-campaign:newCampaign:"New campaign" new-session:newSession:"New session" \
  refresh-infobox:refreshInfobox:"Refresh infobox" rebuild-world-bible:rebuildWorldBible:"Rebuild World Bible" \
  deck-of-worlds:deckOfWorlds:"Deck of Worlds: new micro-setting" export-handouts:exportHandouts:"Export player handouts" \
  archive-note:archiveNote:"Archive note" remove-examples:removeExamples:"Remove example content"; do
  IFS=: read -r file fn label <<< "$pair"
  sed -e "s/newEntity/$fn/" -e "s/WB: New entity/WB: $label/" new-entity.js > "$file.js"
done
cd -
```

- [ ] **Step 4: Create the Templater user script `_System/Scripts/templater/wb.js`**

```js
// Templater user script: `await tp.user.wb()` returns the vault library (see _System/Scripts/loader.js).
module.exports = async function wb() {
  const src = await app.vault.adapter.read("_System/Scripts/loader.js");
  const m = { exports: {} };
  new Function("module", "exports", src)(m, m.exports);
  return m.exports.loadWb(app);
};
```

- [ ] **Step 5: Create the thin templates**

`_System/Templates/Person.md` (the entire file):
```
<%* const wb = await tp.user.wb(); tR += await wb.commands.fromTemplater(tp, app, "person"); -%>
```
Create the others the same way:

| File | Argument |
|---|---|
| `Group.md` | `"group"` |
| `Place.md` | `"place"` |
| `Thing.md` | `"thing"` |
| `Lore.md` | `"lore"` |
| `Plot.md` | `"plot"` |
| `Campaign Item.md` | `null` |
| `Micro-setting.md` | `"microsetting"` |
| `Map.md` | `"map"` |
| `GM Toolkit Item.md` | `null` |

Then delete the `.gitkeep` files in folders that now contain other files: `find . -name .gitkeep -not -path './.git/*' | while read f; do [ "$(ls -A "$(dirname "$f")" | wc -l)" -gt 1 ] && rm "$f"; done`.

- [ ] **Step 6: Run to verify pass**

Run: `~/.bun/bin/bun test _System/tools/tests`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: QuickAdd bootstraps, Templater user script and templates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Vault validator

**Files:**
- Create: `_System/tools/validate.mjs`
- Test: `_System/tools/tests/validate.test.js`

**Interfaces:**
- Consumes: `schema`, `markdown.splitFrontmatter`, `notes.noteIssues`, `bible.START/END`
- Produces:
  - `validateVault(root): {errors: string[], warnings: string[]}`
  - The CLI `bun _System/tools/validate.mjs [root]`, which exits 1 on errors.

- [ ] **Step 1: Write failing tests**

```js
const { test, expect } = require("bun:test");
const { mkdtempSync, mkdirSync, writeFileSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { tmpdir } = require("node:os");
const notes = require("../../Scripts/lib/notes.js");

function vault(files) {
  const root = mkdtempSync(join(tmpdir(), "wbv-"));
  for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), t); }
  return root;
}
const BIBLE = "<!-- WB:INDEX START -->\n<!-- WB:INDEX END -->\n";
const good = notes.buildNote({ type: "person", subtype: "npc", name: "Mira", summary: "ok" }, "{{intro}}x\n\n## Connections\n");

test("a clean vault passes", async () => {
  const { validateVault } = await import("../validate.mjs");
  expect(validateVault(vault({ "World Bible.md": BIBLE, "World/People/Mira.md": good }))).toEqual({ errors: [], warnings: [] });
});

test("reports each rule", async () => {
  const { validateVault } = await import("../validate.mjs");
  const r = validateVault(vault({
    "World/People/NoFm.md": "hello",
    "World/Places/Wrong.md": good.replace("Mira", "Wrong"),
    "World/People/Bad.md": good.replace("person_type: npc", "person_type: dragon"),
    "World/People/Code.md": good + "\n```dataview\nLIST\n```\n",
    "World/People/Empty.md": good.replace("summary: ok", "summary:"),
    "Campaigns/A/Sessions/Deep/x.md": good,
  }));
  expect(r.errors.join("\n")).toContain("World Bible.md: missing");
  expect(r.errors.join("\n")).toContain("World/People/NoFm.md: no frontmatter");
  expect(r.errors.join("\n")).toContain("World/Places/Wrong.md: type person not allowed here");
  expect(r.errors.join("\n")).toContain("World/People/Bad.md: person_type must be one of");
  expect(r.errors.join("\n")).toContain("World/People/Code.md: plugin code in a content note");
  expect(r.errors.join("\n")).toContain("x.md: folder depth 4 exceeds 3");
  expect(r.warnings.join("\n")).toContain("World/People/Empty.md: missing summary");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/validate.test.js`
Expected: FAIL, cannot find `../validate.mjs`.

- [ ] **Step 3: Implement `validate.mjs`**

```js
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
```

- [ ] **Step 4: Run to verify pass**

Run: `~/.bun/bin/bun test _System/tools/tests/validate.test.js`
Expected: all pass. The `x.md` depth case also reports `type person not allowed here`, which is fine; the test only checks for the depth message.

- [ ] **Step 5: Commit**

```bash
git add _System && git commit -m "feat(tools): vault validator

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Plugin and theme download

**Files:**
- Create: `_System/tools/plugins.txt`, `_System/tools/update-plugins.sh`, `THIRD_PARTY_NOTICES.md`, `.obsidian/community-plugins.json`
- Create (downloaded): `.obsidian/plugins/<id>/{main.js,manifest.json,styles.css?}`, `.obsidian/themes/Minimal/{manifest.json,theme.css}`

**Interfaces:**
- Produces: the plugin IDs used in Task 13:
  - `templater-obsidian`
  - `dataview`
  - `quickadd`
  - `calendarium`
  - `obsidian-leaflet-plugin`
  - `obsidian-excalidraw-plugin`
  - `charted-roots`
  - `find-unlinked-files`
  - `tag-wrangler`
  - `obsidian-style-settings`
  - `obsidian-git`

- [ ] **Step 1: Write `_System/tools/plugins.txt`**

```
# id                          github repo                               (theme lines start with "theme")
templater-obsidian            silentvoid13/Templater
dataview                      blacksmithgu/obsidian-dataview
quickadd                      chhoumann/quickadd
calendarium                   javalent/calendarium
obsidian-leaflet-plugin       javalent/obsidian-leaflet
obsidian-excalidraw-plugin    zsviczian/obsidian-excalidraw-plugin
charted-roots                 banisterious/obsidian-charted-roots
find-unlinked-files           vinzent03/find-unlinked-files
tag-wrangler                  pjeby/tag-wrangler
obsidian-style-settings       obsidian-community/obsidian-style-settings
obsidian-git                  vinzent03/obsidian-git
theme Minimal                 kepano/obsidian-minimal
```

- [ ] **Step 2: Write `_System/tools/update-plugins.sh`**

```bash
#!/usr/bin/env bash
# Downloads the latest release of every plugin/theme in plugins.txt into .obsidian/.
# Never touches data.json (plugin settings). Run from anywhere; commit the result.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LIST="$ROOT/_System/tools/plugins.txt"

fetch() { # url dest required(1|0)
  if curl -fsSL "$1" -o "$2.tmp"; then mv "$2.tmp" "$2"
  else rm -f "$2.tmp"; [ "$3" = 1 ] && { echo "FAILED: $1" >&2; return 1; }; fi
  return 0
}

grep -v '^\s*#' "$LIST" | grep -v '^\s*$' | while read -r a b c; do
  if [ "$a" = "theme" ]; then
    dest="$ROOT/.obsidian/themes/$b"; mkdir -p "$dest"
    base="https://github.com/$c/releases/latest/download"
    fetch "$base/manifest.json" "$dest/manifest.json" 1
    fetch "$base/theme.css" "$dest/theme.css" 1
    echo "theme  $b  $(grep -o '"version": *"[^"]*"' "$dest/manifest.json")"
  else
    dest="$ROOT/.obsidian/plugins/$a"; mkdir -p "$dest"
    base="https://github.com/$b/releases/latest/download"
    fetch "$base/main.js" "$dest/main.js" 1
    fetch "$base/manifest.json" "$dest/manifest.json" 1
    fetch "$base/styles.css" "$dest/styles.css" 0
    echo "plugin $a  $(grep -o '"version": *"[^"]*"' "$dest/manifest.json")"
  fi
done
```

- [ ] **Step 3: Run it and check the results**

```bash
chmod +x _System/tools/update-plugins.sh && _System/tools/update-plugins.sh
for d in .obsidian/plugins/*/; do id=$(basename "$d"); mid=$(grep -o '"id": *"[^"]*"' "$d/manifest.json" | sed 's/.*"\([^"]*\)"$/\1/'); [ "$id" = "$mid" ] || echo "ID MISMATCH $id vs $mid"; done
du -sh .obsidian/plugins .obsidian/themes
```
Expected: 11 plugin lines and 1 theme line, no `ID MISMATCH`. The total is roughly 10–30 MB. If a manifest `id` differs from the folder name, rename the folder to the manifest `id` and update `plugins.txt`.

- [ ] **Step 4: Write `.obsidian/community-plugins.json`**

```json
["templater-obsidian","dataview","quickadd","calendarium","obsidian-leaflet-plugin","obsidian-excalidraw-plugin","charted-roots","find-unlinked-files","tag-wrangler","obsidian-style-settings","obsidian-git"]
```

- [ ] **Step 5: Write `THIRD_PARTY_NOTICES.md`**

```markdown
# Third-party software

This vault redistributes unmodified release builds of the following Obsidian plugins and theme under their licenses. Source code for each is at the linked repository.

| Component | Repository | License |
|---|---|---|
| Templater | https://github.com/SilentVoid13/Templater | AGPL-3.0 |
| Dataview | https://github.com/blacksmithgu/obsidian-dataview | MIT |
| QuickAdd | https://github.com/chhoumann/quickadd | MIT |
| Calendarium | https://github.com/javalent/calendarium | MIT |
| Leaflet | https://github.com/javalent/obsidian-leaflet | MIT |
| Excalidraw | https://github.com/zsviczian/obsidian-excalidraw-plugin | AGPL-3.0 |
| Charted Roots | https://github.com/banisterious/obsidian-charted-roots | MIT |
| Find orphaned files and broken links | https://github.com/Vinzent03/find-unlinked-files | MIT |
| Tag Wrangler | https://github.com/pjeby/tag-wrangler | ISC |
| Style Settings | https://github.com/obsidian-community/obsidian-style-settings | MIT |
| Obsidian Git | https://github.com/Vinzent03/obsidian-git | MIT |
| Minimal theme | https://github.com/kepano/obsidian-minimal | MIT |

Deck of Worlds is a product of Hit Point Press. No card content is included in this repository.
```

Before committing, recheck each license: `curl -s https://api.github.com/repos/<repo> | jq -r .license.spdx_id`. For repos that return `null` (Leaflet, Style Settings), check the `license` field in `package.json`. If any says something other than the table, stop and ask the user.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: vendor Obsidian plugins and Minimal theme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Obsidian and plugin configuration

**Files:**
- Create: `.obsidian/app.json`, `.obsidian/appearance.json`, `.obsidian/core-plugins.json`, `.obsidian/graph.json`
- Create: `.obsidian/plugins/<id>/data.json` for templater-obsidian, quickadd, dataview, obsidian-git, find-unlinked-files, obsidian-excalidraw-plugin, calendarium, and charted-roots
- Test: `_System/tools/tests/config.test.js`

**Interfaces:**
- Consumes: the plugin IDs (Task 12), the template file names (Task 10), and the QuickAdd script paths (Task 10).

Most plugins merge `data.json` over their built-in defaults, so write **only the keys that matter**. Before writing each file, confirm the key names exist in the downloaded `main.js` with the `grep` shown. If a key isn't found, search `main.js` for the setting's UI label to find the current key, and record what changed in the commit message.

- [ ] **Step 1: Write the failing config test**

```js
const { test, expect } = require("bun:test");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "../../..");
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

test("every enabled community plugin is vendored", () => {
  for (const id of json(".obsidian/community-plugins.json")) expect(existsSync(join(ROOT, ".obsidian/plugins", id, "main.js"))).toBe(true);
});

test("Templater folder templates point at real templates and folders", () => {
  const t = json(".obsidian/plugins/templater-obsidian/data.json");
  expect(t.templates_folder).toBe("_System/Templates");
  expect(t.user_scripts_folder).toBe("_System/Scripts/templater");
  for (const ft of t.folder_templates) {
    expect(existsSync(join(ROOT, ft.folder))).toBe(true);
    expect(existsSync(join(ROOT, ft.template))).toBe(true);
  }
});

test("QuickAdd macros point at real scripts", () => {
  const q = json(".obsidian/plugins/quickadd/data.json");
  expect(q.choices.length).toBe(9);
  for (const c of q.choices) for (const cmd of c.macro.commands) expect(existsSync(join(ROOT, cmd.path))).toBe(true);
});

test("appearance enables Minimal and every snippet exists", () => {
  const a = json(".obsidian/appearance.json");
  expect(a.cssTheme).toBe("Minimal");
  for (const s of a.enabledCssSnippets) expect(existsSync(join(ROOT, ".obsidian/snippets", `${s}.css`))).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/config.test.js`
Expected: FAIL (ENOENT for the templater `data.json`).

- [ ] **Step 3: Write the core Obsidian config**

`.obsidian/app.json`:
```json
{
  "newFileLocation": "folder",
  "newFileFolderPath": "World",
  "attachmentFolderPath": "Assets",
  "useMarkdownLinks": false,
  "newLinkFormat": "shortest",
  "alwaysUpdateLinks": true,
  "showFrontmatter": true,
  "propertiesInDocument": "visible",
  "userIgnoreFilters": ["docs/", "Player Handouts/", "_System/tools/"]
}
```

`.obsidian/appearance.json`:
```json
{ "cssTheme": "Minimal", "theme": "obsidian", "enabledCssSnippets": ["chronicle", "infobox", "callouts", "gallery"] }
```

`.obsidian/core-plugins.json`:
```json
{
  "file-explorer": true, "global-search": true, "switcher": true, "graph": true, "backlink": true, "canvas": true,
  "outgoing-link": true, "tag-pane": true, "properties": true, "page-preview": true, "templates": false,
  "note-composer": true, "command-palette": true, "editor-status": true, "bookmarks": true, "outline": true,
  "word-count": true, "file-recovery": true, "bases": true, "daily-notes": false, "sync": false, "publish": false
}
```

`.obsidian/graph.json` (the colour groups reproduce the Worldbuilding Vault "wheel"):
```json
{
  "colorGroups": [
    { "query": "tag:#person", "color": { "a": 1, "rgb": 14701138 } },
    { "query": "tag:#group", "color": { "a": 1, "rgb": 14725458 } },
    { "query": "tag:#place", "color": { "a": 1, "rgb": 14733906 } },
    { "query": "tag:#thing", "color": { "a": 1, "rgb": 5431378 } },
    { "query": "tag:#lore", "color": { "a": 1, "rgb": 5395026 } },
    { "query": "tag:#plot", "color": { "a": 1, "rgb": 11032055 } },
    { "query": "tag:#session OR tag:#campaign OR tag:#arc", "color": { "a": 1, "rgb": 9127187 } }
  ],
  "search": "-path:_System -path:\"Player Handouts\" -path:Archive"
}
```

- [ ] **Step 4: Templater `data.json`**

Verify the keys: `grep -o 'trigger_on_file_creation[a-z_]*\|folder_templates\|user_scripts_folder\|templates_folder' .obsidian/plugins/templater-obsidian/main.js | sort -u`

```json
{
  "templates_folder": "_System/Templates",
  "user_scripts_folder": "_System/Scripts/templater",
  "trigger_on_file_creation": true,
  "trigger_on_file_creation_mode": "folder",
  "enable_folder_templates": true,
  "folder_templates": [
    { "folder": "World/People", "template": "_System/Templates/Person.md" },
    { "folder": "World/Groups", "template": "_System/Templates/Group.md" },
    { "folder": "World/Places", "template": "_System/Templates/Place.md" },
    { "folder": "World/Things", "template": "_System/Templates/Thing.md" },
    { "folder": "World/Lore", "template": "_System/Templates/Lore.md" },
    { "folder": "World/Plot", "template": "_System/Templates/Plot.md" },
    { "folder": "Campaigns", "template": "_System/Templates/Campaign Item.md" },
    { "folder": "Micro-settings", "template": "_System/Templates/Micro-setting.md" },
    { "folder": "Maps", "template": "_System/Templates/Map.md" },
    { "folder": "GM Toolkit", "template": "_System/Templates/GM Toolkit Item.md" }
  ],
  "ignore_folders_on_creation": ["_System", "Player Handouts", "Archive", "Assets"],
  "syntax_highlighting": true,
  "auto_jump_to_cursor": false
}
```

- [ ] **Step 5: QuickAdd `data.json`**

Verify the choice and macro format against the downloaded version:
```bash
grep -o '"Macro"' .obsidian/plugins/quickadd/main.js | head -1
grep -o 'infoDialog\|wideInputPrompt\|yesNoPrompt' .obsidian/plugins/quickadd/main.js | sort -u
grep -o 'migrations:{[^}]*}' .obsidian/plugins/quickadd/main.js | head -1
```
Copy the `migrations` object printed by the last command into `data.json` with **every value set to `true`**, so QuickAdd doesn't try to migrate the hand-written choices. If `infoDialog` isn't found, `uiFromQuickAdd` already falls back to `obsidian.Notice`.

Generate the file with Bun, so the IDs are stable and the JSON is valid:
```bash
~/.bun/bin/bun -e '
const cmds = [["new-entity","New entity"],["new-campaign","New campaign"],["new-session","New session"],
  ["refresh-infobox","Refresh infobox"],["rebuild-world-bible","Rebuild World Bible"],
  ["deck-of-worlds","Deck of Worlds: new micro-setting"],["export-handouts","Export player handouts"],
  ["archive-note","Archive note"],["remove-examples","Remove example content"]];
const choices = cmds.map(([f, label]) => ({
  id: `wb-${f}`, name: `WB: ${label}`, type: "Macro", command: true, runOnStartup: false,
  macro: { id: `wb-${f}-macro`, name: `WB: ${label}`, commands: [
    { id: `wb-${f}-script`, name: f, type: "UserScript", path: `_System/Scripts/quickadd/${f}.js`, settings: {} } ] },
}));
const migrations = MIGRATIONS_FROM_GREP; // paste the object from the grep, all values true
await Bun.write(".obsidian/plugins/quickadd/data.json", JSON.stringify({ choices, macros: [], migrations }, null, 2));
'
```
Replace `MIGRATIONS_FROM_GREP` with the literal object before running it; for example, `{migrateToMacroIDFromEmbeddedMacro:true,...}`.

- [ ] **Step 6: The smaller plugin configs**

`.obsidian/plugins/dataview/data.json`:
```json
{ "enableDataviewJs": true, "enableInlineDataviewJs": false, "enableInlineDataview": false, "warnOnEmptyResult": false }
```

`.obsidian/plugins/obsidian-git/data.json`. Verify the keys with `grep -o 'autoSaveInterval\|autoPullOnBoot\|differentIntervalCommitAndPush\|autoPushInterval\|commitMessage\|autoCommitMessage' .obsidian/plugins/obsidian-git/main.js | sort -u`.
```json
{
  "autoSaveInterval": 10,
  "differentIntervalCommitAndPush": false,
  "autoPushInterval": 0,
  "autoPullOnBoot": true,
  "pullBeforePush": true,
  "disablePush": false,
  "autoCommitMessage": "vault backup: {{date}}",
  "commitMessage": "vault backup: {{date}}"
}
```

`.obsidian/plugins/find-unlinked-files/data.json`. Verify with `grep -o 'ignoreDirectories\|ignoreFileTypes\|disableWorkingLinks\|directoriesToIgnore\|filesToIgnore' .obsidian/plugins/find-unlinked-files/main.js | sort -u`, and use whichever directory key exists:
```json
{ "directoriesToIgnore": ["_System", "Assets", "docs", "Player Handouts", ".obsidian"], "filesToIgnore": ["Home.md", "World Bible.md", "README.md", "CLAUDE.md", "THIRD_PARTY_NOTICES.md"] }
```

`.obsidian/plugins/obsidian-excalidraw-plugin/data.json`. Verify with `grep -o '"folder"\|folder:"Excalidraw"' .obsidian/plugins/obsidian-excalidraw-plugin/main.js | head`.
```json
{ "folder": "Assets/Excalidraw", "embedUseExcalidrawFolder": true }
```

- [ ] **Step 7: Calendarium `data.json` (a research step with a fixed fallback)**

1. Find the calendar object shape in the current source:
   ```bash
   curl -s "https://api.github.com/repos/javalent/calendarium/git/trees/main?recursive=1" | jq -r '.tree[].path' | grep -i -E 'preset|schemas?/|types' | head -20
   ```
   Then `curl -sL https://raw.githubusercontent.com/javalent/calendarium/main/<that path>` and read the Gregorian preset.
2. Write `data.json` using the top-level keys shown in the Worldbuilding Vault settings (`autoParse`, `calendars`, `defaultCalendar`, `parseDates`, `eventFrontmatter`, `paths`, `version`, `syncBehavior`):
   - `calendars`: one calendar copied from the Gregorian preset, with `name: "World Calendar"`, `id: "world-calendar"` and `current: {year: 1, month: 0, day: 1}`
   - `defaultCalendar: "world-calendar"`
   - `eventFrontmatter: true`, `autoParse: true`, `parseDates: true`
   - `paths: [["World/Plot", "world-calendar"], ["Campaigns", "world-calendar"]]`, if the preset's type definitions confirm the tuple is `[path, calendarId]`; otherwise `[["/"]]`
   - `version` copied from `manifest.json`
3. **Fallback:** if the calendar shape can't be confirmed within about 15 minutes, commit `data.json` with `"calendars": []` and add a README step: "Calendarium → Create new calendar → from preset → Gregorian → rename to *World Calendar* → set as default". Tell the user this manual step exists.

- [ ] **Step 8: Charted Roots `data.json` (the same approach)**

Find the folder setting key: `grep -o '"Charted Roots/People"' .obsidian/plugins/charted-roots/main.js` confirms the default is there. Then run `grep -o '[a-zA-Z]*[Ff]older[a-zA-Z]*:"Charted Roots/[A-Za-z]*"' .obsidian/plugins/charted-roots/main.js | sort -u` to see the key names. Write:
```json
{ "<peopleFolderKey>": "World/People", "<placesFolderKey>": "World/Places", "<organizationsFolderKey>": "World/Groups", "<eventsFolderKey>": "World/Plot", "autoGenerateCrId": true }
```
Replace each `<…Key>` with the key the grep printed, and drop any that don't exist. Also confirm the `autoGenerateCrId` spelling with `grep -o '[a-zA-Z]*[Cc]r[Ii]d[a-zA-Z]*' main.js | sort -u | head`. **Fallback:** if the keys can't be identified, write no `data.json` and add a README step to set the People folder to `World/People` in the plugin's settings.

- [ ] **Step 9: Run the tests**

Run: `~/.bun/bin/bun test _System/tools/tests/config.test.js`
Expected: the snippet test fails until Task 14; the other three pass. Run it again after Task 14.

- [ ] **Step 10: Commit**

```bash
git add .obsidian _System && git commit -m "chore: Obsidian core and plugin configuration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: CSS snippets (Chronicler look)

**Files:**
- Create: `.obsidian/snippets/chronicle.css`, `infobox.css`, `callouts.css`, `gallery.css`

- [ ] **Step 1: `infobox.css`**

```css
/* [!infobox]: Chronicler-style wiki infobox, floated right on wide panes. */
.callout[data-callout="infobox"] {
  --callout-color: var(--color-base-50);
  --callout-icon: lucide-info;
  float: right; clear: right; width: min(320px, 45%); margin: 0 0 1em 1.5em; padding: 0.5em 0.75em;
  background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 6px;
  font-size: 0.875em;
}
.callout[data-callout="infobox"] .callout-title { justify-content: center; font-size: 1.1em; font-weight: 700; }
.callout[data-callout="infobox"] .callout-title-inner { text-align: center; }
.callout[data-callout="infobox"] img { display: block; margin: 0.25em auto; max-width: 100%; border-radius: 4px; }
.callout[data-callout="infobox"] h6 { text-align: center; margin: 0.5em 0 0.25em; font-size: 0.95em; background: var(--background-modifier-hover); padding: 2px 4px; }
.callout[data-callout="infobox"] table { width: 100%; margin: 0; }
.callout[data-callout="infobox"] thead { display: none; }
.callout[data-callout="infobox"] td { border: none; padding: 2px 4px; vertical-align: top; }
.callout[data-callout="infobox"] td:first-child { width: 40%; }
.callout[data-callout="infobox"] hr { margin: 0.4em 0; }
@media (max-width: 700px) { .callout[data-callout="infobox"] { float: none; width: 100%; margin: 0 0 1em; } }
```

- [ ] **Step 2: `callouts.css`**

```css
/* [!gm]: GM-only secrets (stripped from player handouts). [!spoiler]: player-safe hidden text. */
.callout[data-callout="gm"] { --callout-color: 185, 28, 28; --callout-icon: lucide-eye-off; border-left: 4px solid rgb(185, 28, 28); }
.callout[data-callout="spoiler"] { --callout-color: 100, 116, 139; --callout-icon: lucide-eye; }
.callout[data-callout="spoiler"].is-collapsed .callout-title-inner::after { content: " (click to reveal)"; opacity: 0.6; font-weight: 400; }
.callout[data-callout="quote"] { --callout-icon: lucide-layers; }
```

- [ ] **Step 3: `gallery.css`**

```css
/* [!gallery]: image grid, used by infobox image lists and usable anywhere. */
.callout[data-callout="gallery"] { --callout-icon: lucide-images; background: transparent; border: none; padding: 0; }
.callout[data-callout="gallery"] > .callout-title { display: none; }
.callout[data-callout="gallery"] .callout-content { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
.callout[data-callout="gallery"] .callout-content p { margin: 0; }
.callout[data-callout="gallery"] img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 4px; }
.callout[data-callout="gallery"] em { display: block; text-align: center; font-size: 0.8em; }
```

- [ ] **Step 4: `chronicle.css`**

```css
/* Wiki-style typography: underlined h2 like Chronicler/MediaWiki, compact Connections lists. */
.markdown-rendered h2, .cm-header-2 { border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 0.15em; }
.markdown-rendered h2 + ul { margin-top: 0.25em; }
.markdown-rendered::after { content: ""; display: block; clear: both; }
```

- [ ] **Step 5: Run the config tests**

Run: `~/.bun/bin/bun test _System/tools/tests/config.test.js`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add .obsidian/snippets && git commit -m "feat: Chronicler-style CSS snippets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Vault content (World Bible, CLAUDE.md, dashboards, Bases, map, toolkit, examples)

**Files:**
- Create: `World Bible.md`, `CLAUDE.md`, `Home.md`, `_System/Schema.md`, `_System/Dashboards/Maintenance.md`, `_System/Dashboards/Sessions.md`, `_System/Bases/{People,Groups,Places,Things,Lore,Plot}.base`, `Assets/Maps/placeholder-map.png`, `_System/tools/make-examples.mjs`
- Create (generated): `Maps/World Map.md`, `GM Toolkit/House Rules.md`, `GM Toolkit/Run Sheet.md`, the example notes
- Test: `_System/tools/tests/content.test.js`

**Interfaces:**
- Consumes: `notes.buildNote`, `bible.START/END`, `validateVault`.

- [ ] **Step 1: Write the failing content test**

```js
const { test, expect } = require("bun:test");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "../../..");
const schema = require("../../Scripts/lib/schema.js");

test("the shipped vault validates with zero errors", async () => {
  const { validateVault } = await import("../validate.mjs");
  const { errors } = validateVault(ROOT);
  expect(errors).toEqual([]);
});

test("CLAUDE.md points the AI at the World Bible first", () => {
  const t = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  expect(t).toContain("World Bible.md");
  expect(t).toContain("_System/Schema.md");
});

test("Schema.md documents every type and subtype", () => {
  const t = readFileSync(join(ROOT, "_System/Schema.md"), "utf8");
  for (const [type, def] of Object.entries(schema.TYPES)) {
    expect(t).toContain(`\`${type}\``);
    for (const s of def.subtypes || []) expect(t).toContain(s);
  }
});

test("there is one Base per family", () => {
  const bases = readdirSync(join(ROOT, "_System/Bases"));
  for (const def of Object.values(schema.FAMILIES)) expect(bases).toContain(`${def.label}.base`);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/content.test.js`
Expected: FAIL, `World Bible.md: missing`.

- [ ] **Step 3: Write `World Bible.md`**

```markdown
---
type: bible
tags: [bible]
---
# World Bible

> [!info] How to use this vault (for AI assistants)
> Read this file first. The index below lists every active entity in one line each: name, subtype, status and summary.
> Open individual notes only when you need detail. The rules are in [[CLAUDE]], the frontmatter schema is in `_System/Schema.md`.
> GM-only secrets live in `> [!gm]` callouts inside notes.

## Premise
_One paragraph: what this world and its campaigns are about._

## Tone & pillars
**World in one line:**
**Tone / genre:**
**The villain, and what they actually want:**
**Where the story begins:**
**What breaks first (the inciting incident):**
**What's at stake if the party fails:**
**The one rule of this world nobody breaks:**
**Three words this world should always feel like:**

## Current state
_Active campaign, where the party is, what's in motion right now._

## Open mysteries
_What the players don't know yet, so you don't contradict yourself._

<!-- WB:INDEX START -->
<!-- WB:INDEX END -->
```

- [ ] **Step 4: Write `CLAUDE.md`**

```markdown
# Instructions for AI assistants working in this vault

This is an Obsidian worldbuilding vault for a tabletop RPG. Save tokens: do not read the whole vault.

1. **Always read `World Bible.md` first.** Its generated index lists every active entity in one line (name, subtype, status, summary). The hand-written top describes the premise, tone and current state.
2. **Open individual notes only when you need their details.** Folders map to families: `World/People`, `World/Groups`, `World/Places`, `World/Things`, `World/Lore`, `World/Plot`. Campaigns, arcs and sessions live in `Campaigns/<Campaign>/`. Deck of Worlds stacks are in `Micro-settings/`.
3. **The schema is in `_System/Schema.md`**: frontmatter keys, `<type>_type` subtypes, allowed values.
4. **When you create or edit notes:**
   - Follow the matching body skeleton in `_System/Templates/Bodies/`.
   - Keep `summary` accurate and one line long. It feeds the World Bible.
   - Put secrets in `> [!gm]- GM only` callouts. Anything outside them may be shared with players.
   - Never edit inside a `> [!infobox]` block or between the `WB:INDEX` markers. Ask the user to run **WB: Refresh infobox** and **WB: Rebuild World Bible** afterwards.
   - Never put Dataview, Templater, or other plugin code in content notes. They sync to Foundry VTT as plain text.
   - Use `[[wikilinks]]` to existing note names.
5. **Don't read** `_System/`, `.obsidian/`, `Assets/`, `Archive/`, or `Player Handouts/` unless asked.
```

- [ ] **Step 5: Write `_System/Schema.md`**

The file documents, for every type:
- the folder and subtype key with its values (copied from `schema.js`),
- the infobox fields, and
- the common keys table from the spec (Section 3).

Include a line for each type using its backticked name (for example, `` `person` ``), and list every subtype value so the content test passes. Close with a "Chronicler layout rules" section giving one YAML example each for `header` (above/below), `separator`, `alias`, and `group`, copied from the infobox test fixtures in Task 3.

- [ ] **Step 6: Write the dashboards**

`Home.md`:
````markdown
# Home

**Start here:** [[World Bible]] · [[_System/Dashboards/Maintenance|Maintenance]] · [[_System/Dashboards/Sessions|Sessions]] · [[Maps/World Map|World Map]]

Commands (Ctrl/Cmd+P, type **WB:**): New entity · New campaign · New session · Deck of Worlds · Refresh infobox · Rebuild World Bible · Export player handouts · Archive note

## Recently changed
```dataview
TABLE type, status, summary FROM "World" OR "Campaigns" OR "Micro-settings" SORT file.mtime DESC LIMIT 15
```

## People
![[_System/Bases/People.base]]

## Places
![[_System/Bases/Places.base]]

## Active clocks
```dataview
TABLE stage + "/" + max_stage AS Progress, owner FROM "World/Plot" WHERE plot_type = "clock" AND status = "active"
```
````

`_System/Dashboards/Maintenance.md`:
````markdown
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
````

`_System/Dashboards/Sessions.md`:
````markdown
# Sessions
```dataview
TABLE session_number AS "#", campaign, date, summary FROM "Campaigns" WHERE type = "session" SORT campaign ASC, session_number DESC
```
````

- [ ] **Step 7: Write the six Bases**

Follow the proven syntax from `~/Obsidian/Worldbuilding Vault/Bases/People.base`. `_System/Bases/People.base`:
```yaml
filters:
  and:
    - type == "person"
    - status != "archived"
views:
  - type: table
    name: All
    order: [file.name, person_type, role, faction, location, status, summary]
  - type: table
    name: Player characters
    filters:
      and:
        - person_type == "pc"
    order: [file.name, role, faction, summary]
  - type: table
    name: NPCs
    filters:
      and:
        - person_type == "npc"
    order: [file.name, role, faction, location, summary]
  - type: table
    name: Enemies & monsters
    filters:
      or:
        - person_type == "enemy"
        - person_type == "monster"
    order: [file.name, person_type, location, summary]
```
Write `Groups.base`, `Places.base`, `Things.base`, `Lore.base`, and `Plot.base` in the same way. Each uses `type == "<type>"`, an "All" view ordered `[file.name, <type>_type, status, summary]`, and one view per subtype. `Plot.base` adds `stage, max_stage, owner` to its clock view. Open each one in Obsidian during the smoke test (Task 17) to confirm it parses.

- [ ] **Step 8: Create the placeholder map image**

```bash
python3 - <<'EOF'
import struct, zlib
w, h = 1024, 768
row = b"\x00" + bytes([0xe8, 0xdc, 0xc0]) * w
raw = row * h
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
open("Assets/Maps/placeholder-map.png", "wb").write(png)
EOF
```

- [ ] **Step 9: Write `_System/tools/make-examples.mjs` and run it**

The script generates the example notes, toolkit notes, and World Map with the real lib, so they always match the schema. It's safe to re-run: it skips files that already exist.
```js
#!/usr/bin/env bun
// Generates example content with the vault's own note builder. Re-runnable; skips existing files.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const notes = require("../Scripts/lib/notes.js");
const schema = require("../Scripts/lib/schema.js");
const ROOT = join(import.meta.dir, "../..");

const body = (type, subtype) => {
  for (const p of notes.bodyFile(type, subtype)) if (existsSync(join(ROOT, p))) return readFileSync(join(ROOT, p), "utf8");
  throw new Error(`no body for ${type}`);
};
const C = "Example Campaign";
const ex = { tags: ["example"], campaigns: [`[[${C}]]`] };
const items = [
  [{ type: "campaign", name: C, summary: "A sample campaign. Delete with WB: Remove example content.", fields: { active: true, system: "Any" }, tags: ["example"] }, `Campaigns/${C}`],
  [{ type: "arc", name: "Arc 1 - The Wrong Tide", summary: "The party learns why the bell rings.", fields: { campaign: `[[${C}]]`, order: 1 }, ...ex }, `Campaigns/${C}/Arcs`],
  [{ type: "session", name: `${C} Session 1`, summary: "The party arrives in Rivertown.", fields: { campaign: `[[${C}]]`, session_number: 1, date: "2026-01-01" }, vars: { carried: "- " }, ...ex }, `Campaigns/${C}/Sessions`],
  [{ type: "person", subtype: "npc", name: "Mira Vell", summary: "Harbormaster of Rivertown.", fields: { role: "Harbormaster", location: "[[Rivertown]]", faction: ["[[Tide Court]]"] }, connections: ["[[Rivertown]]", "[[Tide Court]]"], ...ex }],
  [{ type: "group", subtype: "power", name: "Tide Court", summary: "The council that rules the delta.", fields: { leader: "[[Mira Vell]]", headquarters: "[[Rivertown]]" }, ...ex }],
  [{ type: "place", subtype: "settlement", name: "Rivertown", summary: "A free trading city on a river delta.", share: true, fields: { ruler: "[[Tide Court]]", population: 12000 }, ...ex }],
  [{ type: "thing", subtype: "key_item", name: "The Bell Key", summary: "Opens the drowned bell tower.", fields: { owner: "[[Mira Vell]]" }, ...ex }],
  [{ type: "lore", subtype: "deity", name: "The Drowned Mother", summary: "River goddess whose bells call the tide.", ...ex }],
  [{ type: "plot", subtype: "clock", name: "The Rising Water", summary: "Floods reach Rivertown's lower quarter.", fields: { owner: "[[Tide Court]]", stage: 1, max_stage: 6 }, ...ex }],
  [{ type: "plot", subtype: "hook", name: "Bell at High Tide", summary: "The bell rang when it should not have.", ...ex }],
  [{ type: "microsetting", name: "Example Micro-setting", summary: "Shows the Deck of Worlds stack layout.", fields: { region_card: "Swamp" },
     vars: { cards_table: "| Card | Text | Became |\n|---|---|---|\n| Region | Swamp | — |\n| Landmark | _your card text_ | [[Rivertown]] |" }, ...ex }],
  [{ type: "toolkit", name: "House Rules", summary: "Table rules and rulings.", fields: {} }],
  [{ type: "toolkit", name: "Run Sheet", summary: "Checklist for the next session.", fields: {} }],
  [{ type: "map", name: "World Map", summary: "Leaflet map of the world.", fields: {} }],
];
for (const [spec, folder] of items) {
  const dir = folder ?? schema.folderFor(spec.type);
  const path = join(ROOT, dir, `${spec.name}.md`);
  if (existsSync(path)) { console.log(`skip ${dir}/${spec.name}.md`); continue; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, notes.buildNote(spec, body(spec.type, spec.subtype)));
  console.log(`wrote ${dir}/${spec.name}.md`);
}
```
Run: `~/.bun/bin/bun _System/tools/make-examples.mjs`
Then run `~/.bun/bin/bun _System/tools/validate.mjs`. Expected: `0 error(s)`. Warnings about summaries are acceptable only for notes you intentionally left blank.

- [ ] **Step 10: Populate the World Bible index for the shipped state**

There's no Obsidian here, so generate the index with the lib:
```bash
~/.bun/bin/bun -e '
const { readdirSync, readFileSync, writeFileSync, statSync } = require("node:fs");
const { join } = require("node:path");
const bible = require("./_System/Scripts/lib/bible.js");
const { splitFrontmatter } = require("./_System/Scripts/lib/markdown.js");
const entries = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p);
  else if (n.endsWith(".md")) { const { yaml } = splitFrontmatter(readFileSync(p, "utf8")); const fm = yaml ? Bun.YAML.parse(yaml) : null;
    if (fm && fm.type && fm.type !== "bible") entries.push(bible.entryFromFrontmatter(n.replace(/\.md$/, ""), fm)); } } };
for (const r of ["World", "Campaigns", "Micro-settings", "Archive"]) walk(r);
const t = readFileSync("World Bible.md", "utf8");
writeFileSync("World Bible.md", bible.replaceBetweenMarkers(t, bible.buildIndex(entries, "template build")));
'
```

- [ ] **Step 11: Run all tests**

Run: `~/.bun/bin/bun test _System/tools/tests`
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "feat: World Bible, CLAUDE.md, dashboards, Bases, map and example content

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: `sync-template.sh`

**Files:**
- Create: `_System/tools/sync-template.sh`, `_System/tools/tests/sync-template.test.sh`, `_System/tools/tests/sync-template.test.js` (a wrapper so `bun test` runs it)

**Interfaces:**
- Produces: `sync-template.sh [template-url-or-path] [branch]`. It updates the template-owned paths from the template's branch (default `main`), never commits, and exits non-zero if the owned paths have uncommitted changes.

- [ ] **Step 1: Write the failing shell test**

`_System/tools/tests/sync-template.test.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/sync-template.sh"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
git -c init.defaultBranch=main init -q "$T/tpl"; cd "$T/tpl"
mkdir -p _System .obsidian/plugins/quickadd .obsidian/plugins/calendarium World/People
echo v1 > _System/lib.js; echo '{"q":1}' > .obsidian/plugins/quickadd/data.json; echo '{"cal":"tpl"}' > .obsidian/plugins/calendarium/data.json
echo tpl-world > World/People/X.md; echo rules1 > CLAUDE.md
git add -A && git -c user.email=t@t -c user.name=t commit -qm init
git clone -q "$T/tpl" "$T/game"; cd "$T/game"
echo '{"cal":"mine"}' > .obsidian/plugins/calendarium/data.json; echo my-world > World/People/X.md
git -c user.email=t@t -c user.name=t commit -qam "game edits"
cd "$T/tpl"; echo v2 > _System/lib.js; echo '{"q":2}' > .obsidian/plugins/quickadd/data.json; echo '{"cal":"tpl2"}' > .obsidian/plugins/calendarium/data.json; echo rules2 > CLAUDE.md
git -c user.email=t@t -c user.name=t commit -qam v2
cd "$T/game"
"$SCRIPT" "$T/tpl" main >/dev/null
[ "$(cat _System/lib.js)" = v2 ] || { echo "FAIL lib not updated"; exit 1; }
[ "$(cat CLAUDE.md)" = rules2 ] || { echo "FAIL CLAUDE.md not updated"; exit 1; }
grep -q '"q":2' .obsidian/plugins/quickadd/data.json || { echo "FAIL quickadd settings not updated"; exit 1; }
grep -q mine .obsidian/plugins/calendarium/data.json || { echo "FAIL calendarium data overwritten"; exit 1; }
[ "$(cat World/People/X.md)" = my-world ] || { echo "FAIL world content touched"; exit 1; }
git -c user.email=t@t -c user.name=t commit -qam sync
echo dirty >> _System/lib.js
if "$SCRIPT" "$T/tpl" main >/dev/null 2>&1; then echo "FAIL should refuse dirty tree"; exit 1; fi
echo PASS
```

`_System/tools/tests/sync-template.test.js`:
```js
const { test, expect } = require("bun:test");
const { join } = require("node:path");
test("sync-template.sh behaves", () => {
  const r = Bun.spawnSync(["bash", join(__dirname, "sync-template.test.sh")]);
  expect(r.stdout.toString() + r.stderr.toString()).toContain("PASS");
  expect(r.exitCode).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `~/.bun/bin/bun test _System/tools/tests/sync-template.test.js`
Expected: FAIL, since `sync-template.sh` doesn't exist.

- [ ] **Step 3: Implement `_System/tools/sync-template.sh`**

```bash
#!/usr/bin/env bash
# Pulls template-owned files (scripts, templates, plugins, snippets) from the template repo into this game vault.
# World content and per-game plugin data are never touched. Nothing is committed: review with `git diff` first.
set -euo pipefail
SRC="${1:-https://github.com/Crits4Kids/obsidian-worldbuilding-template.git}"
BRANCH="${2:-main}"
cd "$(git rev-parse --show-toplevel)"

OWNED=(_System .obsidian/plugins .obsidian/snippets .obsidian/themes CLAUDE.md docs THIRD_PARTY_NOTICES.md)
# Plugin settings that hold per-game data stay as they are.
KEEP=(calendarium charted-roots obsidian-git obsidian-leaflet-plugin obsidian-excalidraw-plugin obsidian-style-settings)

if [ -n "$(git status --porcelain -- "${OWNED[@]}")" ]; then
  echo "Uncommitted changes in template-owned paths. Commit or stash them first:" >&2
  git status --short -- "${OWNED[@]}" >&2
  exit 1
fi

git fetch --quiet "$SRC" "$BRANCH"
EXCLUDES=()
for id in "${KEEP[@]}"; do EXCLUDES+=(":(exclude).obsidian/plugins/$id/data.json"); done
PRESENT=()
for p in "${OWNED[@]}"; do git cat-file -e "FETCH_HEAD:$p" 2>/dev/null && PRESENT+=("$p"); done
git checkout FETCH_HEAD -- "${PRESENT[@]}" "${EXCLUDES[@]}"
echo "Template files updated from $SRC ($BRANCH). Review, then commit:"
git status --short -- "${OWNED[@]}"
```

- [ ] **Step 4: Run to verify pass**

```bash
chmod +x _System/tools/sync-template.sh _System/tools/tests/sync-template.test.sh
~/.bun/bin/bun test _System/tools/tests/sync-template.test.js
```
Expected: PASS. If `git checkout` rejects the combination of exclude pathspecs and paths, change the checkout line to check out `PRESENT`, then restore the kept files with `git checkout HEAD -- <each kept data.json that exists in HEAD>`. Re-run the test.

- [ ] **Step 5: Commit**

```bash
git add _System/tools && git commit -m "feat(tools): sync-template.sh for pulling template updates into game vaults

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: README, manual checklists, and final verification

**Files:**
- Modify: `README.md` (it currently contains only the title)
- Create: `docs/checklists/obsidian-smoke-test.md`, `docs/checklists/foundry-obsidian-bridge.md`

- [ ] **Step 1: Write `README.md`**

Sections, in order (keep each short and concrete):
1. **What this is**: one paragraph, plus the feature list (Chronicler-style infoboxes, World Bible, Deck of Worlds, Foundry handouts, calendar, maps, family trees, Git backup).
2. **Start a new game**:
   1. On GitHub, click **Use this template → Create a new repository**; make it private.
   2. `git clone <new repo> ~/Obsidian/<Game>`
   3. In Obsidian, **Open folder as vault**.
   4. Click **Trust author and enable plugins**.
   5. Run **WB: Remove example content** (optional).
   6. Run **WB: New campaign**.
   7. Fill in the top of **World Bible**.
3. **Daily use**: a table of the nine `WB:` commands and what each does. Creating a note in a family folder prompts for its details automatically.
4. **Claude Desktop (MCP)**: the config snippet below, and "Claude will read World Bible first because of CLAUDE.md."
   ```json
   "obsidian-<game>": { "command": "npx", "args": ["-y", "@bitbonsai/mcpvault@latest", "/Users/<you>/Obsidian/<Game>"] }
   ```
5. **Foundry VTT (Obsidian Bridge)**:
   - Import `World/`, `Campaigns/`, `Micro-settings/` (GM-only).
   - Run **WB: Export player handouts**, then import `Player Handouts/` as the player-visible folder.
   - Mark a note `share: true` to include it.
   - Don't import `_System/`, `Maps/`, or `Archive/`.
6. **Deck of Worlds**: walk through the command's steps. No card text ships with the vault.
7. **Updating an existing game from the template**: `_System/tools/sync-template.sh`, then `git diff`, then commit. List what it never touches.
8. **Updating plugins**: `_System/tools/update-plugins.sh`, open Obsidian to check, then commit.
9. **Maintainers**: `bun test _System/tools/tests`, `bun _System/tools/validate.mjs`.
10. Any manual steps left over from Task 13's fallbacks (Calendarium, Charted Roots).
11. **Licenses**: this repo is GPL-3.0; plugins are listed in `THIRD_PARTY_NOTICES.md`.

- [ ] **Step 2: Write `docs/checklists/obsidian-smoke-test.md`**

A checkbox list for the user, run in a fresh clone:
1. Open the vault, trust the plugins, and confirm all 11 plugins show as enabled.
2. The Minimal theme and the 4 snippets are active.
3. In `World/Places`, create a note (right-click → New note). The Place prompts appear, the note is renamed, and the infobox renders floated right.
4. Run each of the 9 `WB:` commands once and confirm its result:
   - New entity → note created
   - New campaign → folders created
   - New session → Session 1, with the recap prompt
   - Refresh infobox (Whole vault) → "0 updated" on the second run
   - Rebuild World Bible → index updated
   - Deck of Worlds → run a 2-card stack
   - Export player handouts → `Rivertown` appears in `Player Handouts/Places` without its GM block
   - Archive note → the note moves to `Archive/`
5. Open each `.base` in `_System/Bases`; all six render tables.
6. The Maintenance dashboard renders.
7. The Calendarium calendar "World Calendar" exists, and the "Bell at High Tide" event can be dated.
8. `Maps/World Map` renders the placeholder map.
9. Charted Roots: set `father:` on one example person, then open the family chart.
10. Obsidian Git: the status bar shows the next auto-commit.
11. Link resolution: `[[Rivertown]]` in `World/People/Mira Vell` opens `World/Places/Rivertown.md`, **not** the `Player Handouts` copy. If it opens the copy, report it: the export folder needs to move.

- [ ] **Step 3: Write `docs/checklists/foundry-obsidian-bridge.md`**

A checkbox list:
1. Obsidian Bridge is installed (Foundry v12–v14).
2. Import `World/`: folders appear as journal folders, and `[[links]]` become working UUID links.
3. Check how `[!infobox]` and `[!gm]` render (a blockquote is acceptable). Note what you see.
4. Import `Player Handouts/` into a separate folder. Search the imported text for "GM only"; there should be no hits.
5. Set that folder's ownership to Observer for players.
6. Re-import after editing a note and confirm the conflict warning behaves as documented.

- [ ] **Step 4: Full verification**

```bash
~/.bun/bin/bun test _System/tools/tests
~/.bun/bin/bun _System/tools/validate.mjs
git status --short
```
Expected: all tests pass; `0 error(s)`; clean tree after the commit below.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "docs: README and manual test checklists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Stop and ask the user before any push**

Report the commit list and test output. Ask the user to:
- approve `git push origin main`,
- approve marking the repo as a template (`gh repo edit Crits4Kids/obsidian-worldbuilding-template --template`), and
- run `docs/checklists/obsidian-smoke-test.md` in a fresh clone.

Do not push or change repo settings without an explicit yes.
