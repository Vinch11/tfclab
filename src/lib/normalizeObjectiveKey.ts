/**
 * Unified objective key normalizer — single source of truth.
 * Used by: planValidator, workoutCatalogBuilder, planConfigBuilder.
 * 
 * The edge function has its own copy (Deno runtime can't import from src/).
 * Keep them in sync manually.
 */
export function normalizeObjectiveKey(obj: string): string {
  const lower = obj.toLowerCase();
  // Order matters: "70.3" before "ironman" to avoid "Ironman 70.3" → "IM"
  if (lower.includes("70.3") || lower === "703") return "703";
  if (lower.includes("ironman") || lower === "im") return "IM";
  // Audit fix — Sprint/Olympic triathlon n'avaient AUCUNE branche ici :
  // l'objectif brut retombait tel quel en fin de fonction (return obj), donc
  // SPORT_RATIO_TARGETS (planValidator.ts) ne trouvait jamais de cible pour
  // ces deux formats et le contrôle de ratio par sport était silencieusement
  // court-circuité (juste "3 sports présents ?"). Reconnaît "Triathlon
  // Sprint"/"Sprint" nu/"Sprint Tri" et l'équivalent Olympique — même
  // logique de détection que sportRatioMatrix.ts (edge function) — mappés
  // vers les clés "Sprint"/"Olympic" déjà utilisées par
  // physiologicalTargets.ts pour les cibles VLamax/TTE/FTP de ces objectifs.
  if (/triath/.test(lower) && /sprint/.test(lower)) return "Sprint";
  if (/triath/.test(lower) && /(olymp|standard|distance ?m)/.test(lower)) return "Olympic";
  if (/^sprint( tri)?$/.test(lower.trim())) return "Sprint";
  if (/^(olymp|olympique|distance ?m|standard)( tri)?$/.test(lower.trim())) return "Olympic";
  if (lower.includes("semi")) return "Semi";
  if (lower.includes("marathon")) return "Marathon";
  // Famous trail races → canonical sub-classes (before generic trail/ultra)
  if (lower.includes("utmb") || lower.includes("tor des") || lower.includes("hardrock") || lower.includes("western states")) return "TrailUltra";
  if (lower.includes("ccc")) return "TrailMountain";
  if (lower.includes("occ") || lower.includes("skyrun") || lower.includes("sky run") || lower.includes("vk ")) return "TrailMountain";
  if (lower.includes("trail") && lower.includes("ultra")) return "TrailUltra";
  if (lower.includes("trail") && (lower.includes("montagne") || lower.includes("mountain"))) return "TrailMountain";
  if (lower.includes("trail") && (lower.includes("court") || lower.includes("short"))) return "TrailShort";
  if (lower.includes("trail")) return "Trail";
  if (lower.includes("ultra")) return "TrailUltra";
  if (lower.includes("10k") || lower.includes("10km") || lower.includes("10 km")) return "10K";
  if (lower.includes("5k") || lower === "5km") return "5K";
  if (lower.includes("start")) return "StartToRun";
  return obj;
}
