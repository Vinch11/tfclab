import { buildQuotaPromptBlock } from "@/engines/plan/sessionSizingMatrix";
import { buildLayoutPromptBlock, buildWeeklySlotLayout } from "@/engines/plan/weeklySlotLayout";
import type { WeekQuotaEntry } from "./validateWeeklyQuotas";

/** Une régénération conserve le numéro global et les floors déjà individualisés.
 * Le serveur et le réconciliateur client reçoivent exactement la même entrée.
 */
export function buildWeekQuotaTransport(weekNumber: number, entry: WeekQuotaEntry | null, isLcw = false, availableSports?: ReadonlySet<import("@/engines/plan/weeklySlotLayout").LayoutSport>, dayBans?: import("@/engines/plan/weeklySlotLayout").SlotLayoutOptions["dayBans"]) {
  const quotas: Record<number, WeekQuotaEntry> = entry ? {
    [weekNumber]: {
      ...entry,
      layout: buildWeeklySlotLayout(entry.quota, entry.floors, entry.weekType, {
        availableSports,
        dayBans,
        finalStageSport: isLcw ? "run" : undefined,
      }),
    },
  } : {};
  const layout = quotas[weekNumber]?.layout;
  const prompt = entry && layout
    ? `${buildQuotaPromptBlock([weekNumber], quotas)}\n\n${buildLayoutPromptBlock([weekNumber], { [weekNumber]: layout })}`
    : "";
  return { _weeklyQuotas: quotas, _weeklyQuotasPromptByChunk: [prompt] };
}
