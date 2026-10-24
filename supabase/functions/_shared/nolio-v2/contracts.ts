// Consultation DTOs only. No physiological model and no credential in this contract.
export type Availability = "complete" | "partial" | "denied" | "unavailable";
export type EventKind =
  | "training"
  | "competition"
  | "cycle"
  | "note"
  | "message"
  | "quiz";
export const calendarCollections = {
  training: "trainings",
  competition: "competitions",
  cycle: "cycles",
  note: "notes",
  message: "messages",
  quiz: "quizzes",
} as const;
export interface Quota {
  hourlyLimit: number;
  hourlyRemaining: number;
  dailyLimit: number;
  dailyRemaining: number;
}
export interface Issue {
  code: string;
  status: number;
  retryAfter: number | null;
}
export interface ReadResult<T> {
  availability: Availability;
  data: T;
  issue: Issue | null;
  nextCursor: string | null;
  quota: Quota | null;
}
export interface AthleteDTO {
  id: string;
  name: string;
  hasApiAccess: boolean;
}
export interface SportDTO {
  id: string;
  name: string;
  active: boolean | null;
}
export interface ZoneDTO {
  stream: string;
  content: unknown;
}
export interface PlannedEventDTO {
  id: string;
  kind: EventKind;
  name: string;
  date: string;
  endDate: string | null;
  time: string | null;
  sport: string | null;
  durationSeconds: number | null;
  distanceKm: number | null;
  hasStructuredWorkout: boolean;
  restricted: boolean;
}
export interface LinkDTO {
  id: string;
  athleteId: string;
  nolioUserId: string;
  accessStatus: string;
  lastVerifiedAt: string;
}
export interface StatusDTO {
  mode: "mock";
  applicationType: "personal";
  scopes: string[];
  quota: Quota;
}
export interface CalendarDTO {
  from: string;
  to: string;
  collections: Record<EventKind, ReadResult<PlannedEventDTO[]>>;
}
export type ReadAction =
  | { action: "status" | "athletes" }
  | { action: "sports" | "zones"; athleteId: string }
  | { action: "calendar"; athleteId: string; from: string; to: string };
export type LinkAction =
  | { action: "get" | "unlink"; athleteId: string }
  | {
    action: "associate";
    athleteId: string;
    nolioUserId: string;
    confirmed: true;
  };
