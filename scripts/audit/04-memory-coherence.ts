/**
 * ═════════════════════════════════════════════════════════════════════════════
 * PASSE 4 — AUDIT COHÉRENCE MÉMOIRE ↔ CODE
 *
 * Pour chaque entrée de `mem://index.md`, vérifie qu'au moins un symbole /
 * fichier / chemin mentionné dans le titre ou la description existe encore
 * dans le repo. Détecte les mémoires orphelines (ex: après suppression
 * `tteV2`/`fatigueV2`/`injuryRiskV2` en F32/F35).
 *
 * Usage : bun run scripts/audit/04-memory-coherence.ts
 * Sortie : /mnt/documents/audit/04-memory-coherence.md
 *
 * Heuristiques :
 *  - Tokens en backticks `foo` extraits de la description
 *  - Chemins de fichier (`src/...`, `mem://...` ignoré)
 *  - Symboles canoniques connus (computeXxx, useXxx, etc.)
 *  - grep -r dans src/ + supabase/functions/ + scripts/
 *
 * Statut :
 *  - OK     : ≥1 token trouvé dans le code
 *  - WARN   : aucun token extractible (description vague)
 *  - ORPHAN : tokens extraits mais aucun trouvé → mémoire à mettre à jour
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ─── 1. Snapshot du mem index (collé manuellement, source = mem://index.md) ──
// Maintenu en parallèle par le script — à régénérer si l'index change.
const MEM_INDEX_PATH = "scripts/audit/04-memory-index-snapshot.md";

const SCAN_ROOTS = ["src", "supabase/functions", "scripts"];
const OUT = "/mnt/documents/audit";
mkdirSync(OUT, { recursive: true });

// ─── 2. Charge & indexe tout le code ────────────────────────────────────────
function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const p = join(dir, name);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx|md|sql)$/.test(name) && !name.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

const allFiles = SCAN_ROOTS.flatMap((r) => walk(r));
console.log(`📂 ${allFiles.length} fichiers indexés`);

// Concatène tout le code en mémoire (acceptable pour ce projet < ~30MB de TS)
const CODE_BLOB = allFiles
  .map((f) => {
    try { return readFileSync(f, "utf8"); } catch { return ""; }
  })
  .join("\n");

// ─── 3. Parse le snapshot mémoire ───────────────────────────────────────────
let memText: string;
try {
  memText = readFileSync(MEM_INDEX_PATH, "utf8");
} catch {
  console.error(
    `❌ Snapshot manquant : ${MEM_INDEX_PATH}\n` +
    `   Régénère-le en copiant le contenu courant de mem://index.md.`
  );
  process.exit(1);
}

type MemEntry = {
  id: string;       // ex: logic/wprime-clamp-traceability
  title: string;
  description: string;
  tokens: string[]; // candidats à grep
};

const entries: MemEntry[] = [];
const lineRegex = /^\s*-\s*\[([^\]]+)\]\(mem:\/\/([^)]+)\)\s*[—–-]\s*(.*)$/;
for (const line of memText.split("\n")) {
  const m = line.match(lineRegex);
  if (!m) continue;
  const [, title, id, description] = m;
  // Tokens candidats :
  //  a) `backticked` identifiers & paths
  //  b) chemins src/... ou supabase/...
  const tokens = new Set<string>();
  for (const t of description.match(/`([^`]+)`/g) ?? []) {
    tokens.add(t.replace(/`/g, "").trim());
  }
  for (const t of description.match(/\b(?:src|supabase|scripts)\/[\w./-]+/g) ?? []) {
    tokens.add(t);
  }
  // Identifiants canoniques évidents (camelCase ≥6 chars)
  for (const t of description.match(/\b[a-z][a-zA-Z]*[A-Z][a-zA-Z]{4,}\b/g) ?? []) {
    if (!["RMSE", "TFCL", "AI", "IA"].includes(t)) tokens.add(t);
  }
  entries.push({ id, title, description, tokens: [...tokens] });
}

console.log(`🧠 ${entries.length} entrées mémoire à auditer`);

// ─── 4. Audit ───────────────────────────────────────────────────────────────
type Status = "OK" | "WARN_NO_TOKENS" | "ORPHAN";
type Result = MemEntry & { status: Status; foundTokens: string[]; missingTokens: string[] };

const results: Result[] = entries.map((e) => {
  if (e.tokens.length === 0) {
    return { ...e, status: "WARN_NO_TOKENS", foundTokens: [], missingTokens: [] };
  }
  const found: string[] = [];
  const missing: string[] = [];
  for (const tok of e.tokens) {
    // Recherche littérale (suffit pour les noms de symboles / chemins)
    if (CODE_BLOB.includes(tok)) found.push(tok);
    else missing.push(tok);
  }
  const status: Status = found.length > 0 ? "OK" : "ORPHAN";
  return { ...e, status, foundTokens: found, missingTokens: missing };
});

// ─── 5. Rapport ─────────────────────────────────────────────────────────────
const orphans = results.filter((r) => r.status === "ORPHAN");
const warns = results.filter((r) => r.status === "WARN_NO_TOKENS");
const ok = results.filter((r) => r.status === "OK");

const lines: string[] = [];
lines.push(`# Audit Passe 4 — Cohérence mémoire ↔ code`);
lines.push(``);
lines.push(`Généré : ${new Date().toISOString()}`);
lines.push(`Fichiers scannés : ${allFiles.length}`);
lines.push(`Entrées mémoire : ${entries.length}`);
lines.push(``);
lines.push(`| Statut | Nombre |`);
lines.push(`|---|---|`);
lines.push(`| ✅ OK | ${ok.length} |`);
lines.push(`| ⚠️ Sans tokens extractibles | ${warns.length} |`);
lines.push(`| 🔴 ORPHELINES (à mettre à jour) | ${orphans.length} |`);
lines.push(``);

if (orphans.length > 0) {
  lines.push(`## 🔴 Mémoires orphelines`);
  lines.push(``);
  lines.push(`Tokens mentionnés dans la description mais introuvables dans le code.`);
  lines.push(``);
  for (const r of orphans) {
    lines.push(`### ${r.title}`);
    lines.push(`- **id** : \`mem://${r.id}\``);
    lines.push(`- **Tokens manquants** : ${r.missingTokens.map((t) => `\`${t}\``).join(", ")}`);
    lines.push(`- **Description** : ${r.description}`);
    lines.push(``);
  }
}

if (warns.length > 0) {
  lines.push(`## ⚠️ Mémoires sans tokens extractibles`);
  lines.push(``);
  lines.push(`Description trop générique pour audit automatique — vérifier manuellement.`);
  lines.push(``);
  for (const r of warns) {
    lines.push(`- \`mem://${r.id}\` — ${r.title}`);
  }
  lines.push(``);
}

lines.push(`## ✅ Mémoires alignées (extrait)`);
lines.push(``);
for (const r of ok.slice(0, 20)) {
  lines.push(`- \`mem://${r.id}\` — ${r.foundTokens.length}/${r.tokens.length} tokens trouvés`);
}
if (ok.length > 20) lines.push(`- … +${ok.length - 20} autres`);

const outPath = join(OUT, "04-memory-coherence.md");
writeFileSync(outPath, lines.join("\n"));
console.log(`📄 Rapport écrit : ${outPath}`);
console.log(`   ✅ OK : ${ok.length} | ⚠️ ${warns.length} | 🔴 ${orphans.length}`);

// Exit non-zéro si des orphelines détectées (utile en CI)
if (orphans.length > 0) {
  console.error(`\n❌ ${orphans.length} mémoire(s) orpheline(s) — voir ${outPath}`);
  process.exit(2);
}
