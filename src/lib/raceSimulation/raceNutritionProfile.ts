/**
 * Profil de ravitaillement de l'athlète (commun à tous ses bilans), rangé dans athletes.refs :
 * - sweatTest : taux de sueur testé (ml/h) et sueur salée (oui / non / inconnu) ;
 * - raceProducts : ses produits de course (gel, barre, boisson). Un produit absent = produit type.
 * La tolérance glucides reste dans refs.carbTolerance (carbTolerance.ts).
 */
export type ProductKind = "gel" | "bar" | "drink";
export interface RaceProduct { name: string; carbsG: number; sodiumMg: number; /** Boisson : volume de la dose (ml). */ volumeMl?: number }
export type RaceProducts = Record<ProductKind, RaceProduct & { custom: boolean }>;
export interface SweatTest { mlH: number | null; salty: boolean | null; date: string | null }

/** Produits types : gel 25 g, barre 40 g, boisson iso 30 g pour 500 ml (6 %). */
export const DEFAULT_PRODUCTS: Record<ProductKind, RaceProduct> = {
  gel: { name: "Gel", carbsG: 25, sodiumMg: 50 },
  bar: { name: "Barre", carbsG: 40, sodiumMg: 100 },
  drink: { name: "Boisson iso", carbsG: 30, sodiumMg: 300, volumeMl: 500 },
};
export const PRODUCT_LABEL: Record<ProductKind, string> = { gel: "Gel", bar: "Barre", drink: "Boisson" };

const obj = (v: unknown): Record<string, unknown> | null => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const num = (v: unknown, max: number): number | null => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max ? v : null;

export function readSweatTest(refs: unknown): SweatTest | null {
  const v = obj(obj(refs)?.sweatTest);
  if (!v) return null;
  const mlH = num(v.mlH, 3000);
  const salty = typeof v.salty === "boolean" ? v.salty : null;
  if (mlH == null && salty == null) return null;
  return { mlH, salty, date: typeof v.date === "string" ? v.date : null };
}

/** Produits de l'athlète, complétés par les produits types. */
export function readRaceProducts(refs: unknown): RaceProducts {
  const stored = obj(obj(refs)?.raceProducts);
  const out = {} as RaceProducts;
  for (const kind of Object.keys(DEFAULT_PRODUCTS) as ProductKind[]) {
    const p = obj(stored?.[kind]);
    const carbsG = num(p?.carbsG, 200);
    const volumeMl = kind === "drink" ? num(p?.volumeMl, 2000) : null;
    if (p && carbsG != null && (kind !== "drink" || volumeMl != null)) {
      out[kind] = { name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 40) : DEFAULT_PRODUCTS[kind].name,
        carbsG, sodiumMg: typeof p.sodiumMg === "number" && p.sodiumMg >= 0 && p.sodiumMg <= 3000 ? p.sodiumMg : 0,
        ...(volumeMl != null ? { volumeMl } : {}), custom: true };
    } else out[kind] = { ...DEFAULT_PRODUCTS[kind], custom: false };
  }
  return out;
}

export function withNutritionProfile(refs: unknown, patch: { sweatTest?: SweatTest | null; products?: Partial<Record<ProductKind, RaceProduct | null>> }): Record<string, unknown> {
  const base = { ...(obj(refs) ?? {}) };
  if (patch.sweatTest !== undefined) {
    if (!patch.sweatTest || (patch.sweatTest.mlH == null && patch.sweatTest.salty == null)) delete base.sweatTest;
    else base.sweatTest = patch.sweatTest;
  }
  if (patch.products) {
    const current = { ...(obj(base.raceProducts) ?? {}) };
    for (const [k, p] of Object.entries(patch.products)) { if (p) current[k] = p; else delete current[k]; }
    if (Object.keys(current).length) base.raceProducts = current; else delete base.raceProducts;
  }
  return base;
}

export const productText = (p: RaceProduct) => `${p.name} (${p.carbsG} g${p.volumeMl ? ` / ${p.volumeMl} ml` : ""}${p.sodiumMg ? `, ${p.sodiumMg} mg sodium` : ""})`;
