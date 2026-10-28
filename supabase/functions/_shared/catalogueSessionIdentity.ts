import {
  type CatalogueContract,
  checkSessionCatalogue,
  type ContractSession,
} from "./sessionCatalogueContract.ts";
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
