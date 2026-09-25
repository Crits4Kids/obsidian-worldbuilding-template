# Obsidian smoke test

Run this in a **fresh clone** after changing plugins, scripts or config.

- [ ] Open the folder as a vault → **Trust author and enable plugins**. Settings → Community plugins shows all 11 enabled.
- [ ] Appearance: Minimal is active; the snippets `chronicle`, `infobox`, `callouts` and `gallery` are enabled.
- [ ] `World/Places` → right-click → New note. The Place prompts appear, the note is renamed, and the infobox renders floated right.
- [ ] **WB: New entity** → Person / NPC. The note is created in `World/People` and opened.
- [ ] **WB: New campaign** creates `Campaigns/<Name>/` with `Arcs/` and `Sessions/`.
- [ ] **WB: New session** creates `<Campaign> Session 1` and offers a recap.
- [ ] **WB: Refresh infobox** → Whole vault. The second run reports 0 updated.
- [ ] **WB: Rebuild World Bible** updates the index between the markers.
- [ ] **WB: Deck of Worlds** with a 2-card stack creates both notes plus the `Micro-settings/` stack note, all linked.
- [ ] **WB: Export player handouts** creates `Player Handouts/Places/Rivertown.md`, which has no `[!gm]` block.
- [ ] **WB: Archive note** on a test note moves it to `Archive/<Family>/` with `status: archived`.
- [ ] Each `.base` in `_System/Bases/` opens and shows a table.
- [ ] `_System/Dashboards/Maintenance` renders ("Everything is up to date" on a clean vault).
- [ ] Calendarium: "World Calendar" exists and is the default. Give the event `Bell at High Tide` a date and it shows on the calendar.
- [ ] `Maps/World Map` renders the placeholder map.
- [ ] Charted Roots: set `father: "[[Mira Vell]]"` on a new person, then right-click → Open family chart.
- [ ] Obsidian Git: the status bar shows the git status; Source Control view works.
- [ ] **Link resolution:** in `World/People/Mira Vell`, click `[[Rivertown]]`. It opens `World/Places/Rivertown.md`, **not** the copy in `Player Handouts/`. If it opens the copy, report it: the export folder needs to move.
