// Type-only boundary: no server runtime/credential code reaches Vite.
export type { AthleteDTO, Availability, CalendarDTO, Issue, LinkDTO, PlannedEventDTO,
  Quota, ReadResult, SportDTO, StatusDTO, ZoneDTO, ReadAction, LinkAction }
  from "../../../supabase/functions/_shared/nolio-v2/contracts";
export interface LocalAthlete { id: string; name: string }
export interface NolioV2Api { call<T>(endpoint: "read" | "links", body: Record<string, unknown>): Promise<T> }
