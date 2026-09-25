# Vault schema

The code source of truth is `_System/Scripts/lib/schema.js`. This page mirrors it for humans and AI assistants.

## Common frontmatter (every content note)

| Key | Meaning |
|---|---|
| `title` | Display title (Chronicler). Same as the file name. |
| `subtitle` | Line under the title in the infobox (Chronicler). |
| `infobox` | Small header under the infobox image (Chronicler). |
| `image` | One image, or a list for a gallery: `[a.jpg, b.jpg]` or `[[a.jpg, "Caption"], ...]` (Chronicler). |
| `layout` | Optional Chronicler infobox layout rules (see below). |
| `type` | The note type (tables below). |
| `<type>_type` | Subtype, for the six world families only. |
| `status` | `active`, `background` or `archived`. |
| `campaigns` | List of campaign links this note appears in. Empty = world-level. |
| `summary` | **One line.** Feeds the World Bible index. |
| `share` | `true` = copied (without GM secrets) to `Player Handouts/` by **WB: Export player handouts**. |
| `aliases`, `tags` | Standard Obsidian. `tags` always starts with the type. |

Any other key appears as a row in the infobox, in frontmatter order. Keys starting with `cr_` (Charted Roots), `name`, `fc-category`, `fc-display-name`, and `location` on places (Leaflet coordinates) are hidden.

## World families (folder `World/<Label>`)

| Type | Folder | Subtype key | Subtypes | Infobox fields |
|---|---|---|---|---|
| `person` | `World/People` | `person_type` | pc, npc, enemy, monster | role, species, pronouns, faction, location, father, mother, spouse, children, born, died (+ `cr_type: person`, `name` for Charted Roots) |
| `group` | `World/Groups` | `group_type` | power, guild, faith | leader, headquarters, goal, allies, rivals |
| `place` | `World/Places` | `place_type` | region, settlement, building, landmark | region, ruler, population, map (+ optional Leaflet `location: [y, x]`) |
| `thing` | `World/Things` | `thing_type` | magic_item, key_item, mundane_item | owner, location, rarity |
| `lore` | `World/Lore` | `lore_type` | deity, species, plane, history, culture | domain, related |
| `plot` | `World/Plot` | `plot_type` | hook, event, fact, clock | hook: resolved · event: fc-date (Calendarium) · clock: owner, stage, max_stage, trigger |

## Campaign and other types

| Type | Folder | Fields |
|---|---|---|
| `campaign` | `Campaigns/<Campaign>/<Campaign>.md` | system, players, start, active |
| `arc` | `Campaigns/<Campaign>/Arcs/` | campaign, order |
| `session` | `Campaigns/<Campaign>/Sessions/` | campaign, arc, session_number, date, fc-date, players_present |
| `recap` | `Campaigns/<Campaign>/Sessions/` | campaign, session (shared with players by default) |
| `microsetting` | `Micro-settings/` | region_card, cards (Deck of Worlds stack, in order) |
| `encounter` | `GM Toolkit/` | location, threat |
| `rumor_table` | `GM Toolkit/` | location |
| `toolkit` | `GM Toolkit/` | — |
| `map` | `Maps/` | — (contains a Leaflet block; not imported into Foundry) |

## Body conventions

- The note starts with a generated `> [!infobox]` callout. Never edit it by hand; run **WB: Refresh infobox**.
- Secrets go in `> [!gm]- GM only` callouts. `> [!spoiler]` is for player-safe hidden text.
- Links go in `## Connections` as a bullet list of `[[wikilinks]]`.
- No plugin code (Dataview, Templater, Leaflet) in content notes.

## Chronicler layout rules

```yaml
layout:
  - type: alias
    keys: [leader]
    text: Sovereign
  - type: header
    text: Allies
    above: allies_north        # or below: <field>; a list of fields also works
  - type: group
    keys: [allies_north, allies_south]
  - type: separator
    below: [goal]              # or above: <field>
```
