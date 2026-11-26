/**
 * Bibliothèque de produits de course du coach : elle se construit toute seule.
 * Chaque produit enregistré dans la fiche d'un athlète y entre (ou la met à jour s'il porte le même nom),
 * puis se choisit pour les autres athlètes. Rangée dans profiles.layout_preferences.raceProductLibrary
 * (réglages propres au coach, déjà protégés par la RLS) ; les produits déjà présents dans les fiches
 * de ses athlètes s'y ajoutent à la lecture.
 */
import { readRaceProducts, type ProductKind, type RaceProduct } from "./raceNutritionProfile";

export interface LibraryProduct extends RaceProduct { kind: ProductKind; updatedAt: string | null }
const KINDS: ProductKind[] = ["gel", "bar", "drink"];
const keyOf = (kind: ProductKind, name: string) => `${kind}:${name.trim().toLowerCase().replace(/\s+/g, " ")}`;
const obj = (v: unknown): Record<string, unknown> | null => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;

export function readLibrary(layoutPreferences: unknown): LibraryProduct[] {
  const list = obj(layoutPreferences)?.raceProductLibrary;
  if (!Array.isArray(list)) return [];
  const out: LibraryProduct[] = [];
  for (const raw of list) {
    const p = obj(raw);
    if (!p || !KINDS.includes(p.kind as ProductKind) || typeof p.name !== "string" || !p.name.trim()) continue;
    const kind = p.kind as ProductKind;
    const carbsG = typeof p.carbsG === "number" && p.carbsG > 0 && p.carbsG <= 200 ? p.carbsG : null;
    const volumeMl = typeof p.volumeMl === "number" && p.volumeMl > 0 && p.volumeMl <= 2000 ? p.volumeMl : null;
    if (carbsG == null || (kind === "drink" && volumeMl == null)) continue;
    out.push({ kind, name: p.name.trim().slice(0, 40), carbsG, sodiumMg: typeof p.sodiumMg === "number" && p.sodiumMg >= 0 && p.sodiumMg <= 3000 ? p.sodiumMg : 0,
      ...(kind === "drink" ? { volumeMl: volumeMl! } : {}), updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : null });
  }
  return out;
}

/** Ajoute ou met à jour (même type et même nom) les produits donnés ; le plus récent l'emporte. */
export function upsertLibrary(lib: LibraryProduct[], products: Partial<Record<ProductKind, RaceProduct | null>>, today: string): LibraryProduct[] {
  const map = new Map(lib.map(p => [keyOf(p.kind, p.name), p]));
  for (const kind of KINDS) {
    const p = products[kind];
    if (!p || !(p.carbsG > 0) || (kind === "drink" && !(p.volumeMl && p.volumeMl > 0))) continue;
    map.set(keyOf(kind, p.name), { kind, name: p.name.trim(), carbsG: p.carbsG, sodiumMg: p.sodiumMg ?? 0, ...(kind === "drink" ? { volumeMl: p.volumeMl } : {}), updatedAt: today });
  }
  return [...map.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, "fr"));
}

/** Bibliothèque complète : la liste rangée + les produits des fiches de tous les athlètes du coach. */
export function combinedLibrary(stored: LibraryProduct[], athletesRefs: unknown[]): LibraryProduct[] {
  let lib = stored;
  const known = new Set(stored.map(p => keyOf(p.kind, p.name)));
  for (const refs of athletesRefs) {
    const prods = readRaceProducts(refs);
    const extra: Partial<Record<ProductKind, RaceProduct>> = {};
    for (const kind of KINDS) if (prods[kind].custom && !known.has(keyOf(kind, prods[kind].name))) { extra[kind] = prods[kind]; known.add(keyOf(kind, prods[kind].name)); }
    if (Object.keys(extra).length) lib = upsertLibrary(lib, extra, "");
  }
  return lib.map(p => (p.updatedAt === "" ? { ...p, updatedAt: null } : p));
}

export const libraryLabel = (p: LibraryProduct) => `${p.name} · ${p.carbsG} g${p.volumeMl ? ` / ${p.volumeMl} ml` : ""}${p.sodiumMg ? ` · ${p.sodiumMg} mg Na` : ""}`;
