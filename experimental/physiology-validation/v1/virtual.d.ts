declare module "physiology:diagnostic-candidate" {
  export const computeDiagnostic: (input: import("@/engines/diagnostic/types").DiagnosticInput & {
    runningEconomyCostMlKgKm?: number | null;
  }) => import("@/engines/diagnostic/types").AthleteDiagnostic;
}
