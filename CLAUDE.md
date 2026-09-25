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
