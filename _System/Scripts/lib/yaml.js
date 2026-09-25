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
