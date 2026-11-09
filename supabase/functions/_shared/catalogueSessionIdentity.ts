import {
  type CatalogueContract,
  catalogueEligibility,
  checkSessionCatalogue,
  type ContractSession,
  executableCatalogueVariants,
} from "./sessionCatalogueContract.ts";
import { isCompleteRepairWorkoutMetadata, normalizeRepairSport } from "./repairSportingEquivalence.ts";
import { isRaceDaySession } from "./raceDayIdentity.ts";
/** Narrow presentation repair, before acceptance: no sport/dose/protocol/ID substitution. */
export function restoreCatalogueTitleForExactProtocol(
  value: unknown,
  contract: CatalogueContract,
): ContractSession | null {
  if (!value || typeof value !== "object") return null;
  const s = value as ContractSession;
  if (
    s.custom !== false || typeof s.catalogId !== "string" ||
    typeof s.title !== "string" || typeof s.details !== "string" ||
    typeof s.sport !== "string" || typeof s.durationMin !== "number" ||
    !Array.isArray(s.zones) || !s.zones.every((z) => typeof z === "string") ||
    s.variantKey !== undefined || isRaceDaySession(s)
  ) return null;
  const current = checkSessionCatalogue(s, contract);
  if (
    current.unknown.length || current.errors.length !== 1 ||
    current.errors[0] !== "catalogue_physiological_intent"
  ) return null;
  const card = contract.catalog.find((c) => c.id === s.catalogId);
  if (!card?.structure?.trim() || isRaceDaySession({ title: card.title })) {
    return null;
  }
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
  if (
    normalized(s.details) !== normalized(card.structure) ||
    JSON.stringify([...s.zones].sort()) !==
      JSON.stringify([...card.zones].sort())
  ) return null;
  const restored = { ...s, title: card.title };
  const checked = checkSessionCatalogue(restored, contract);
  return checked.errors.length === 0 && checked.unknown.length === 0
    ? restored
    : null;
}

/**
 * Prescription owned by the catalogue card (AGENTS.md: reviewed catalogue
 * contracts own prescription fields; AI cannot alter them).
 *
 * When the model references an eligible card of the same sport, the card's
 * title, protocol, zones and validated duration range replace what the model
 * wrote. Duration is kept when inside the executable range, otherwise brought
 * to the nearest validated bound. Nothing is invented: ineligible cards,
 * sport mismatches, race days or cards without a protocol are left untouched
 * so the existing validation still rejects them.
 */
export function canonicalizeCatalogueSession(
  value: unknown,
  contract: CatalogueContract,
): { session: ContractSession; changed: string[] } | null {
  if (!value || typeof value !== "object") return null;
  const s = value as ContractSession;
  if (s.custom !== false || typeof s.catalogId !== "string" || isRaceDaySession(s)) return null;
  const card = contract.catalog.find((c) => c.id === s.catalogId);
  if (!isCompleteRepairWorkoutMetadata(card) || !card.structure?.trim() || isRaceDaySession({ title: card.title })) return null;
  if (catalogueEligibility(card, contract).length) return null;
  if (typeof s.sport !== "string" || normalizeRepairSport(s.sport) !== normalizeRepairSport(card.sport)) return null;
  if (checkSessionCatalogue(s, contract).errors.length === 0 && checkSessionCatalogue(s, contract).unknown.length === 0) return null;
  const changed: string[] = [];
  const variants = executableCatalogueVariants(card, contract.objective);
  let variantKey = s.variantKey;
  if (variantKey !== undefined && !(variantKey in variants)) { variantKey = undefined; changed.push("variantKey"); }
  const vm = variantKey ? variants[variantKey].match(/(\d+)\s*[–-]\s*(\d+)/) : null;
  const range: [number, number] = vm ? [Number(vm[1]), Number(vm[2])] : card.durationMin;
  const ai = typeof s.durationMin === "number" && Number.isFinite(s.durationMin) ? Math.round(s.durationMin) : Math.round((range[0] + range[1]) / 2);
  const durationMin = Math.min(range[1], Math.max(range[0], ai));
  if (durationMin !== s.durationMin) changed.push("durationMin");
  if (s.title !== card.title) changed.push("title");
  if ((s.details ?? "") !== card.structure) changed.push("details");
  // The card's declared main zone is part of its prescription even when its
  // zone list only names the warm-up/cool-down zones.
  const cardMax = Math.max(0, ...card.zones.flatMap((z) => [...z.matchAll(/\bZ\s*([1-7])/gi)].map((m) => Number(m[1]))));
  const zones = card.mainZoneMax > cardMax ? [...card.zones, `Z${card.mainZoneMax}`] : [...card.zones];
  if (JSON.stringify(s.zones ?? []) !== JSON.stringify(zones)) changed.push("zones");
  const session: ContractSession = { ...s, title: card.title, details: card.structure, zones, durationMin };
  if (variantKey === undefined) delete session.variantKey; else session.variantKey = variantKey;
  const checked = checkSessionCatalogue(session, contract);
  return checked.errors.length === 0 ? { session, changed } : null;
}
