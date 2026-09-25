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
