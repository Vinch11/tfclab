/** DEV + QA backend only: floating in-app link to the read-only RLS audit. No API call. */
import { Link } from "react-router-dom";
import { isExpectedQaOrigin } from "@/pages/__qa/ReadOnlyRlsAuditPage";

export function shouldShowQaRlsAuditLink(dev: boolean, backendUrl: string | undefined): boolean {
  return dev && isExpectedQaOrigin(backendUrl);
}

export function QaRlsAuditLink() {
  if (!shouldShowQaRlsAuditLink(import.meta.env.DEV, import.meta.env.VITE_SUPABASE_URL)) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2">
      <Link
        to="/__qa/rls-audit"
        data-testid="qa-rls-audit-link"
        className="rounded-md border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg min-h-[44px] flex items-center"
      >
        QA — Audit RLS
      </Link>
      <Link
        to="/__qa/det-lab"
        data-testid="qa-det-lab-link"
        className="rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground shadow-lg min-h-[44px] flex items-center"
      >
        QA — Labo DET
      </Link>
      <Link
        to="/__qa/coach-a-recipe"
        data-testid="qa-coach-a-recipe-link"
        className="rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground shadow-lg min-h-[44px] flex items-center"
      >
        QA — Recette Coach A
      </Link>
      <Link
        to="/__qa/pilot-review"
        data-testid="qa-pilot-review-link"
        className="rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground shadow-lg min-h-[44px] flex items-center"
      >
        QA — Revue pilote
      </Link>
    </div>
  );
}
