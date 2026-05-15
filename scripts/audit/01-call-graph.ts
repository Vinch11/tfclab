/**
 * Audit Passe 1 — Cartographie statique
 *
 * Génère :
 *  - audit/01-call-graph.md  : graphe d'appels des moteurs principaux
 *  - audit/01-call-graph.mmd : diagramme Mermaid
 *  - audit/01-metric-sources.md : pour chaque métrique clé, qui la calcule / lit / écrit
 *  - audit/01-snapshot-mappers.md : tous les endroits qui transforment un Snapshot
 *
 * Aucune IA, 100% statique (regex AST-light).
 *
 * Usage : bun run scripts/audit/01-call-graph.ts
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src";
const OUT = "/mnt/documents/audit";
mkdirSync(OUT, { recursive: true });

// --- 1. Collecte des fichiers TS/TSX -------------------------------------
function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}
const files = walk(ROOT);
console.log(`📂 ${files.length} fichiers scannés`);

// --- 2. Index des exports / imports --------------------------------------
type FileInfo = {
  path: string;
  exports: string[];
  imports: { from: string; names: string[] }[];
  content: string;
};

const fileMap = new Map<string, FileInfo>();
for (const f of files) {
  const content = readFileSync(f, "utf8");
  const exports: string[] = [];
  const imports: FileInfo["imports"] = [];

  // exports nommés
  for (const m of content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+(\w+)/g)) {
    exports.push(m[1]);
  }
  // export { a, b }
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const n of m[1].split(",")) {
      const cleaned = n.trim().split(/\s+as\s+/)[0];
      if (cleaned) exports.push(cleaned);
    }
  }
  // imports
  for (const m of content.matchAll(/import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+["']([^"']+)["']/g)) {
    const names = m[1]
      ? m[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean)
      : [m[2]];
    imports.push({ from: m[3], names });
  }

  fileMap.set(f, { path: f, exports, imports, content });
}

// --- 3. Moteurs cibles ---------------------------------------------------
const TARGETS = [
  "src/engines/diagnostic/computeDiagnostic.ts",
  "src/engines/decision",
  "src/engines/plan",
  "src/lib/vlamaxEffectif.ts",
  "src/lib/vlamaxResolver.ts",
  "src/lib/v2", // moteur V2
  "src/lib/mapSnapshotToV2.ts",
  "src/lib/thresholds",
  "src/lib/runningEconomy.ts",
  "src/lib/physiologicalTargets.ts",
  "src/lib/calibration",
  "src/lib/miniReport",
];

// Trouve qui importe un fichier donné
function importersOf(targetPath: string): string[] {
  const out: string[] = [];
  const targetNorm = targetPath.replace(/\\/g, "/").replace(/^src\//, "@/").replace(/\.tsx?$/, "");
  for (const f of fileMap.values()) {
    for (const imp of f.imports) {
      const resolved = imp.from
        .replace(/^@\//, "src/")
        .replace(/\.tsx?$/, "");
      const targetCmp = targetPath.replace(/\.tsx?$/, "");
      if (
        imp.from === targetNorm ||
        resolved === targetCmp ||
        resolved + "/index" === targetCmp ||
        targetCmp.endsWith(resolved)
      ) {
        out.push(f.path);
        break;
      }
    }
  }
  return [...new Set(out)];
}

// --- 4. Génère 01-call-graph.md ------------------------------------------
const lines: string[] = [];
lines.push("# Audit — Cartographie statique\n");
lines.push(`Généré le ${new Date().toISOString()}\n`);
lines.push(`Fichiers scannés : **${files.length}**\n`);

lines.push("## Moteurs cibles et leurs consommateurs\n");
for (const t of TARGETS) {
  let label = t;
  let importers: string[] = [];
  try {
    if (statSync(t).isDirectory()) {
      // dossier : agrège les importateurs de tous ses fichiers
      const inner = walk(t);
      const set = new Set<string>();
      for (const f of inner) importersOf(f).forEach((x) => set.add(x));
      importers = [...set].filter((x) => !x.startsWith(t));
    } else {
      importers = importersOf(t);
    }
  } catch {
    lines.push(`### ⚠️ ${label} — introuvable\n`);
    continue;
  }
  lines.push(`### \`${label}\`\n`);
  lines.push(`Importateurs (${importers.length}) :\n`);
  for (const i of importers.slice(0, 50)) lines.push(`- \`${i}\``);
  if (importers.length > 50) lines.push(`- _... +${importers.length - 50} autres_`);
  lines.push("");
}

writeFileSync(join(OUT, "01-call-graph.md"), lines.join("\n"));

// --- 5. Index des sources par métrique -----------------------------------
const METRICS: Record<string, RegExp[]> = {
  "VLamax (run)": [/vlamax_run/i, /vlamaxRun/i, /vlamaxCapEstimator/i],
  "VLamax (bike)": [/vlamax(?!_run)(?!Cap)/i, /vlamaxBike/i, /scoreG/i],
  "VO2max": [/vo2max/i],
  "MLSS / Seuil": [/MLSS/i, /seuil[A-Z]/i, /threshold(?!s\.)/i],
  "Critical Power / W'": [/criticalPower/i, /\bCP\b/, /wPrime/i, /\bw_prime\b/i],
  "Running Economy": [/runningEconomy/i, /\bRE\b(?!_)/, /economieCourse/i],
  "FatMax": [/fatmax/i, /FatMax/],
  "Limiteurs": [/limiter/i, /detectLimiter/i, /bottleneck/i],
  "EWMA / Lissage": [/EWMA/i, /ewma/i, /smoothing/i],
};

const mLines: string[] = [];
mLines.push("# Audit — Sources par métrique\n");
mLines.push(`Généré le ${new Date().toISOString()}\n`);

for (const [metric, patterns] of Object.entries(METRICS)) {
  mLines.push(`## ${metric}\n`);
  const hits: { file: string; matches: number }[] = [];
  for (const f of fileMap.values()) {
    let count = 0;
    for (const p of patterns) {
      const m = f.content.match(new RegExp(p.source, "gi"));
      if (m) count += m.length;
    }
    if (count > 0) hits.push({ file: f.path, matches: count });
  }
  hits.sort((a, b) => b.matches - a.matches);
  mLines.push(`Fichiers concernés : **${hits.length}**\n`);
  mLines.push("| Fichier | Occurrences |");
  mLines.push("|---|---|");
  for (const h of hits.slice(0, 25)) {
    mLines.push(`| \`${h.file}\` | ${h.matches} |`);
  }
  if (hits.length > 25) mLines.push(`| _... +${hits.length - 25} autres_ | |`);
  mLines.push("");
}
writeFileSync(join(OUT, "01-metric-sources.md"), mLines.join("\n"));

// --- 6. Snapshot mappers -------------------------------------------------
const sLines: string[] = [];
sLines.push("# Audit — Mappers de Snapshot\n");
sLines.push(`Généré le ${new Date().toISOString()}\n\n`);
sLines.push("Recherche des points qui transforment un Snapshot en input moteur.\n");
sLines.push("**Objectif** : repérer toute transformation manuelle qui contournerait `mapSnapshotToV2`.\n\n");

const SNAPSHOT_PATTERNS = [
  /mapSnapshotToV2/g,
  /snapshot\s*\.\s*vlamax/g,
  /snapshot\s*\.\s*sprint_15s/g,
  /snapshot\s*\.\s*vma/gi,
  /from\s+["'].*mapSnapshotToV2/g,
];

const mapperHits: { file: string; uses: string[] }[] = [];
for (const f of fileMap.values()) {
  const uses: string[] = [];
  for (const p of SNAPSHOT_PATTERNS) {
    const m = f.content.match(p);
    if (m) uses.push(`${p.source} (×${m.length})`);
  }
  if (uses.length > 0) mapperHits.push({ file: f.path, uses });
}
mapperHits.sort((a, b) => b.uses.length - a.uses.length);

sLines.push("| Fichier | Patterns trouvés |");
sLines.push("|---|---|");
for (const h of mapperHits) {
  sLines.push(`| \`${h.file}\` | ${h.uses.join(", ")} |`);
}
writeFileSync(join(OUT, "01-snapshot-mappers.md"), sLines.join("\n"));

// --- 7. Mermaid : flux 3-engines + VLamax --------------------------------
const mermaid = `graph TD
  Snapshot[Snapshot DB] -->|mapSnapshotToV2| V2[lib/v2 inputs]
  Snapshot -->|legacy mappers| LEGACY[⚠ direct field access]

  V2 --> DIAG[engines/diagnostic/computeDiagnostic]
  LEGACY -.contournement.-> DIAG

  DIAG --> DECISION[engines/decision]
  DECISION --> PLAN[engines/plan]

  V2 --> VLAMAX[vlamaxEffectif]
  VLAMAX -->|cap estimator| CAP[vlamaxCapEstimator]
  VLAMAX -->|score G fallback| SCOREG[vlamaxRunV2Enhanced]
  VLAMAX -->|EWMA bike| BIKE[vlamaxBikeV2Enhanced]
  VLAMAX -->|bypass cap| RESOLVER[vlamaxResolver]

  RESOLVER --> DIAG
  RESOLVER --> MINI[lib/miniReport]
  RESOLVER --> ASSIST[lib/assistant context]

  DIAG --> THRESH[lib/thresholds — MLSS/CP/W']
  DIAG --> ECON[lib/runningEconomy]
  DIAG --> TARGETS[lib/physiologicalTargets]

  classDef warn fill:#fde68a,stroke:#92400e,color:#451a03
  class LEGACY warn
`;
writeFileSync(join(OUT, "01-call-graph.mmd"), mermaid);

console.log("✅ Cartographie générée dans /mnt/documents/audit/");
console.log("   - 01-call-graph.md");
console.log("   - 01-call-graph.mmd");
console.log("   - 01-metric-sources.md");
console.log("   - 01-snapshot-mappers.md");
