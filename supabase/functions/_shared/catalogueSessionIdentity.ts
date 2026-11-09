import {
  type CatalogueContract,
  catalogueEligibility,
  checkSessionCatalogue,
  type ContractSession,
  executableCatalogueVariants,
  sessionSportMatchesCard,
} from "./sessionCatalogueContract.ts";
import { evaluateRepairSportingEquivalence, isCompleteRepairWorkoutMetadata, isRecoveryWeekType } from "./repairSportingEquivalence.ts";
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
  if (typeof s.sport !== "string" || !sessionSportMatchesCard(s.sport, card)) return null;
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

/**
 * A referenced card that is not eligible for this week (phase, objective,
 * recovery week…) is swapped for an eligible card of the SAME sport and the
 * SAME sporting role (evaluateRepairSportingEquivalence, operation
 * "replacement"), offered to the model for this chunk, preferably unused in
 * the week and with a duration range containing the requested duration.
 * No candidate → null: the session stays refused, nothing is invented.
 */
export function substituteIneligibleCatalogueSession(
  value: unknown,
  contract: CatalogueContract,
  allowedIds: readonly string[],
  usedInWeek: ReadonlySet<string> = new Set(),
): { session: ContractSession; fromId: string; toId: string } | null {
  if (!value || typeof value !== "object") return null;
  const s = value as ContractSession;
  if (s.custom !== false || typeof s.catalogId !== "string" || isRaceDaySession(s)) return null;
  const card = contract.catalog.find((c) => c.id === s.catalogId);
  if (!isCompleteRepairWorkoutMetadata(card) || catalogueEligibility(card, contract).length === 0) return null;
  if (typeof s.sport !== "string" || !sessionSportMatchesCard(s.sport, card)) return null;
  const allowed = new Set(allowedIds);
  const wanted = typeof s.durationMin === "number" ? s.durationMin : (card.durationMin[0] + card.durationMin[1]) / 2;
  const pool = contract.catalog.filter((c) => c.id !== card.id && allowed.has(c.id) && isCompleteRepairWorkoutMetadata(c) &&
    c.structure?.trim() && !isRaceDaySession({ title: c.title }) && catalogueEligibility(c, contract).length === 0);
  const pick = (cands: typeof pool, extra: Record<string, unknown> = {}) => {
    const ranked = cands.map((c) => ({ c, score: (usedInWeek.has(c.id) ? 1000 : 0) +
      (wanted < c.durationMin[0] ? c.durationMin[0] - wanted : wanted > c.durationMin[1] ? wanted - c.durationMin[1] : 0) }))
      .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id));
    for (const { c } of ranked) {
      const cMax = Math.max(0, ...c.zones.flatMap((z) => [...z.matchAll(/\bZ\s*([1-7])/gi)].map((m) => Number(m[1]))));
      const swapped: ContractSession = { ...s, ...extra, catalogId: c.id, title: c.title, details: c.structure,
        zones: c.mainZoneMax > cMax ? [...c.zones, `Z${c.mainZoneMax}`] : [...c.zones],
        durationMin: Math.min(c.durationMin[1], Math.max(c.durationMin[0], Math.round(wanted))) };
      delete swapped.variantKey;
      const canonical = canonicalizeCatalogueSession(swapped, contract);
      const session = canonical?.session ?? swapped;
      if (checkSessionCatalogue(session, contract).errors.length === 0) return { session, fromId: card.id, toId: c.id };
    }
    return null;
  };
  const sameRole = pick(pool.filter((c) =>
    evaluateRepairSportingEquivalence(card, c, { ...contract, operation: "replacement" }).compatible));
  if (sameRole) return sameRole;
  // Recovery (deload) week: a quality card is refused only because the week
  // is a deload. The deload itself prescribes lower intensity, so the card is
  // replaced by an easy card of the same sport (endurance / recovery /
  // technique, main zone <= Z2) — never by another quality session.
  const reasons = catalogueEligibility(card, contract);
  if (isRecoveryWeekType(contract.weekType) && reasons.every((r) => r.startsWith("recovery_"))) {
    return pick(pool.filter((c) => sessionSportMatchesCard(s.sport, c) && c.mainZoneMax <= 2 &&
      ["endurance_fondamentale", "recuperation", "technique"].includes(c.intentFamily)), { isKeySession: false });
  }
  return null;
}
