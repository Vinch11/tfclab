import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildSnapshotSheet, type SheetBlockId, type SheetSnapshot } from "@/lib/snapshotSheet";

/**
 * Fiche en lecture : un résumé par bloc. Un appui déplie le bloc (valeurs + source),
 * « Modifier ce bloc » ouvre le formulaire directement sur le bon onglet.
 */
export function SnapshotSheet({ snapshot, onEditBlock }: { snapshot: SheetSnapshot; onEditBlock?: (block: SheetBlockId) => void }) {
  const blocks = buildSnapshotSheet(snapshot);
  const [open, setOpen] = useState<SheetBlockId | null>(null);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {blocks.map(b => {
        const empty = b.rows.length === 0;
        const isOpen = open === b.id;
        return (
          <div key={b.id} className={cn("rounded-lg border border-border bg-background", isOpen && "sm:col-span-2")}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : b.id)}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">{b.title}</span>
                <span className={cn("block truncate text-sm", empty ? "text-muted-foreground" : "font-medium text-foreground")}>{b.summary}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="space-y-2 border-t border-border px-3 py-2">
                {empty ? <p className="text-sm text-muted-foreground">Rien d’enregistré dans ce bloc.</p> : (
                  <dl className="space-y-1.5 text-sm">
                    {b.rows.map(r => (
                      <div key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <dt className="text-muted-foreground">{r.label}</dt>
                        <dd className={cn("text-right font-medium", b.id === "notes" && "w-full whitespace-pre-line text-left font-normal")}>
                          {r.value}{r.source && <span className="ml-1 text-xs font-normal text-muted-foreground">({r.source})</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {onEditBlock && <Button size="sm" variant="outline" className="h-9" onClick={() => onEditBlock(b.id)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Modifier ce bloc</Button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
