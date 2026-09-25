# Obsidian Worldbuilding Template

A system-agnostic Obsidian vault for running tabletop RPGs, kept in Git. Clone it, open it in Obsidian, trust the plugins, and it's ready to use.

- **Chronicler-style wiki pages.** Each note gets an infobox built from its frontmatter (Chronicler's `title`, `subtitle`, `infobox`, `image` and `layout` keys), plus spoiler and gallery callouts.
- **World Bible.** A single entry point that lists every entity in one line, so Claude (via MCP) reads one file, not the whole vault.
- **Deck of Worlds.** Turn a card stack into linked Place, Person, Group, Lore and Plot notes in one guided command.
- **Foundry VTT.** Built for the Obsidian Bridge module: GM notes stay GM-only, and an export step makes secret-free player handouts.
- **Calendar, maps, family trees.** Calendarium (a "World Calendar" is preconfigured), Leaflet, Charted Roots and Excalidraw.
- **Backups.** Obsidian Git commits and pushes every 10 minutes.

## Start a new game

1. On GitHub, open this repository and click **Use this template → Create a new repository**. Make it private.
2. Clone it: `git clone <your new repo> ~/Obsidian/<Game>`
3. In Obsidian: **Open folder as vault**, pick the folder, then click **Trust author and enable plugins**.
4. **Once per computer:** Settings → Templater → turn on **Trigger Templater on new file creation**. Templater stores this per device, so it can't ship in the repo. Without it, right-click → New note in a family folder gives an empty note; the `WB:` commands work either way.
5. Optional: run **WB: Remove example content** (Ctrl/Cmd+P, type `WB:`).
6. Run **WB: New campaign**.
7. Fill in the top of **World Bible** (premise, tone, current state).

## Daily use

All commands are in the command palette under `WB:`.

| Command | What it does |
|---|---|
| WB: New entity | Asks what you're making (person, place, group, thing, lore, plot, arc, encounter, rumour table, toolkit note, map), then creates it in the right folder with its infobox. |
| WB: New campaign | Creates `Campaigns/<Name>/` with Arcs and Sessions and makes it the active campaign. |
| WB: New session | Creates the next numbered session for the active campaign and carries over last session's loose threads. Optionally creates a player recap. |
| WB: Deck of Worlds: new micro-setting | Card-by-card entry for a Deck of Worlds stack. See below. |
| WB: Refresh infobox | Rebuilds infoboxes from frontmatter (current note, folder, or whole vault). Run it after editing properties. |
| WB: Rebuild World Bible | Regenerates the index in `World Bible.md`. |
| WB: Export player handouts | Copies every note with `share: true` into `Player Handouts/`, removing `[!gm]` callouts, `%%comments%%` and links to unshared notes. |
| WB: Archive note | Marks the current note `archived` and moves it to `Archive/`. |
| WB: Remove example content | Deletes every note tagged `example`. |

Creating a note directly in a family folder (right-click → New note) runs the same prompts automatically.

**Writing conventions:** put secrets in `> [!gm]- GM only` callouts. Keep the `summary` property to one line, because it feeds the World Bible. Don't hand-edit the `[!infobox]` block. The full schema is in [`_System/Schema.md`](_System/Schema.md).

**Dashboards:** [[Home]], `_System/Dashboards/Maintenance` (stale infoboxes, missing summaries), `_System/Dashboards/Sessions`, and a Base per family in `_System/Bases/`.

## Claude Desktop (MCP)

Add this to Claude Desktop's `claude_desktop_config.json` under `mcpServers`, with your own path:

```json
"obsidian-<game>": {
  "command": "npx",
  "args": ["-y", "@bitbonsai/mcpvault@latest", "/Users/<you>/Obsidian/<Game>"]
}
```

`CLAUDE.md` tells Claude to read `World Bible.md` first and open other notes only when it needs them. Run **WB: Rebuild World Bible** after big changes so the index stays current.

## Foundry VTT (Obsidian Bridge)

- **GM-only journals:** import `World/`, `Campaigns/` and `Micro-settings/`.
- **Player journals:** run **WB: Export player handouts**, then import `Player Handouts/` into a separate folder and give players Observer permission on it. Mark a note `share: true` to include it.
- **Don't import** `_System/`, `Maps/` (Leaflet code), `Archive/` or `Assets/` (linked images are uploaded automatically).

## Deck of Worlds

Run **WB: Deck of Worlds: new micro-setting**:

1. Name the micro-setting.
2. Pick the Region card's biome.
3. For each card (Landmark → Namesake → Origin → Attribute → Advent):
   1. Choose what it becomes: a new place, person, group, lore, event or hook; a link to an existing note; or skip.
   2. Paste the card text.
   3. Name the note.

The command then:

- creates the notes with the card text quoted at the top,
- links neighbouring cards to each other,
- writes a stack note in `Micro-settings/`, and
- offers to rebuild the World Bible.

It checks for name clashes before creating anything. No card text ships with this repository.

## Updating a game from the template

From inside a game vault:

```bash
_System/tools/sync-template.sh      # fetches this template's main branch
git diff                            # review
git commit -am "Update from template"
```

It updates `_System/`, plugins, snippets, the theme, `CLAUDE.md`, `docs/` and `THIRD_PARTY_NOTICES.md`. It never touches your world notes or your Calendarium, Charted Roots, Obsidian Git, Leaflet, Excalidraw or Style Settings settings. It refuses to run if template files have uncommitted changes. (Some plugins rewrite their own settings when Obsidian opens, so commit after your first open.) It doesn't delete files removed from the template, and it doesn't enable newly added plugins. Enable those in Settings → Community plugins.

## Updating plugins (template maintainers)

```bash
_System/tools/update-plugins.sh     # downloads the latest release of every plugin + Minimal
```

Open the vault in Obsidian to check everything loads, then commit.

## Maintainers: tests

Requires [Bun](https://bun.sh).

```bash
bun test _System/tools/tests        # unit tests for all vault logic
bun _System/tools/validate.mjs      # checks every content note against the schema
bun _System/tools/make-examples.mjs # regenerates example notes (skips existing)
```

Manual checklists: [`docs/checklists/obsidian-smoke-test.md`](docs/checklists/obsidian-smoke-test.md), [`docs/checklists/foundry-obsidian-bridge.md`](docs/checklists/foundry-obsidian-bridge.md).

## License

GPL-3.0 (see `LICENSE`). The bundled plugins and theme keep their own licenses; see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
