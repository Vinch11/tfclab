import type { PlanReleaseInfo } from "../../supabase/functions/_shared/planReleaseInfo.ts";
export const manifestPath: string;
export function declarationText(info: PlanReleaseInfo): string;
export function readDeclaration(root: string): PlanReleaseInfo;
export function assertSameDeclaration(expected: unknown, actual: unknown): void;
export function calculatePlanRelease(root: string): Promise<{ info: PlanReleaseInfo; catalogJSON: string; catalogueEntries: number }>;
export function checkedPlanRelease(root: string, override?: PlanReleaseInfo): Promise<{ info: PlanReleaseInfo; catalogJSON: string; catalogueEntries: number }>;
