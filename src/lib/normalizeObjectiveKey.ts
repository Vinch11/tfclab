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
