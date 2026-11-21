import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

export function FieldReviewPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <details className="field-review group min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg font-semibold focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={20} /></span>
      <span className="min-w-0 flex-1">{title}</span>
      <ChevronDown aria-hidden="true" size={18} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
    </summary>
    <div className="mt-4 space-y-4 border-t pt-4">{children}</div>
  </details>;
}
