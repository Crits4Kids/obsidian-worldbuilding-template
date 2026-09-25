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
