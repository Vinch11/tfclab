import type { LinkDTO } from "./contracts.ts";
export interface LinkStore {
  ownsAthlete(coach: string, athlete: string): Promise<boolean>;
  get(
    coach: string,
    connection: string,
    athlete: string,
  ): Promise<LinkDTO | null>;
  associate(
    coach: string,
    connection: string,
    athlete: string,
    remote: string,
  ): Promise<LinkDTO>;
  unlink(coach: string, connection: string, athlete: string): Promise<void>;
}
