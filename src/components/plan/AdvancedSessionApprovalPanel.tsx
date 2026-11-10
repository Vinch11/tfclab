/**
 * AdvancedSessionApprovalPanel — approbation coach NOMINATIVE des séances avancées.
 *
 * Certaines fiches (tests maximaux, sprints all-out, doubles journées,
 * protocoles lactate, charges lourdes) ne sont jamais proposées à l'IA sans une
 * décision explicite du coach, fiche par fiche. Ce panneau est le seul endroit
 * où cette décision se prend.
 *
 * Il n'applique aucune règle de sécurité lui-même :
 *  - la liste vient de `groupApprovableAdvancedSessions()` (liste fermée dérivée
 *    des tables d'audit — les fiches à sélection automatique bloquée n'y
 *    figurent jamais) ;
 *  - les conditions affichées sont le texte RÉEL de la fiche (`when`/`avoid`) ;
 *  - l'effet annoncé vient de `evaluateAdvancedSessionApproval`, donc du verdict
 *    du garde-fou lui-même pour le profil de cet athlète.
 *
 * Composant contrôlé : l'état (fiches approuvées, ouverture) vit dans la page.
 */

import { ChevronDown, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  evaluateAdvancedSessionApproval,
  type AdvancedSessionProfileSignal,
} from "@/lib/plan/advancedSessionApproval";
import {
  groupApprovableAdvancedSessions,
  type ApprovableAdvancedSession,
} from "@/lib/plan/advancedSessionApprovalCatalog";

interface Props {
  /** Fiches actuellement approuvées (IDs en majuscules, déjà filtrés par la page). */
  approvedIds: readonly string[];
  onChange: (ids: string[]) => void;
  /**
   * Profil tel que le garde-fou le verra à la génération. `null` = pas encore
   * résoluble (aucun diagnostic) : on n'annonce alors ni effet ni blocage.
   */
  profile: AdvancedSessionProfileSignal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LEVEL_LABELS: Readonly<Record<string, string>> = {
  untrained: "Pas du tout entraîné",
  light: "Un peu entraîné",
  trained: "Bien entraîné",
  highly_trained: "Très chargé",
};

const RELIABLE_SOURCES = new Set(["manual", "auto-tss"]);
const CAUTION_LEVELS = new Set(["untrained", "light"]);

function formatDuration([min, max]: [number, number]): string {
  return min === max ? `${min} min` : `${min}–${max} min`;
}

function blockerText(session: ApprovableAdvancedSession, profile: AdvancedSessionProfileSignal): string | null {
  const evaluation = evaluateAdvancedSessionApproval(session.id, profile);
  if (evaluation.effective) return null;
  switch (evaluation.blocker) {
    case "insufficient_level":
      return `Sans effet pour ce profil : la fiche exige un niveau « ${
        LEVEL_LABELS[evaluation.minimumTrainingLevel ?? ""] ?? evaluation.minimumTrainingLevel
      } » ou plus.`;
    case "insufficient_hours":
      return `Sans effet pour ce profil : la fiche exige au moins ${evaluation.minimumWeeklyHours} h/sem.`;
    case "beginner_level":
      return "Sans effet pour ce profil : fiche fermée à un niveau débutant, même approuvée.";
    default:
      // Profil non vérifié : expliqué une seule fois, en tête de panneau.
      return null;
  }
}

export function AdvancedSessionApprovalPanel({ approvedIds, onChange, profile, open, onOpenChange }: Props) {
  const groups = groupApprovableAdvancedSessions();
  const approved = new Set(approvedIds.map(id => id.toUpperCase()));
  const count = approved.size;

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(approved);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next].sort());
  };

  const profileUnverified = profile != null && !RELIABLE_SOURCES.has(profile.trainingLevelSource);
  const profileCaution = profile != null && !profileUnverified && CAUTION_LEVELS.has(profile.trainingLevel);

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 p-2 text-left text-xs font-medium"
          aria-label="Séances avancées — approbation coach"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Séances avancées — approbation coach</span>
          <Badge variant={count > 0 ? "default" : "outline"} className="text-[10px]">
            {count === 0 ? "Aucune approuvée" : `${count} approuvée${count > 1 ? "s" : ""}`}
          </Badge>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 border-t border-amber-500/30 p-2">
        <p className="text-[10px] leading-tight text-muted-foreground">
          Ces fiches (tests maximaux, sprints, doubles journées, protocoles lactate, charges lourdes) ne sont
          jamais proposées à l'IA sans ta décision, fiche par fiche. En cochant une fiche, tu attestes avoir lu ses
          conditions ci-dessous et juger <strong>cet athlète</strong> prêt à la réaliser. L'approbation rend la
          fiche éligible au plan IA ; elle ne garantit pas qu'elle sera programmée, et elle ne s'applique ni au
          moteur déterministe ni au mode multi-athlètes.
        </p>

        {profile == null && (
          <p className="text-[10px] leading-tight text-muted-foreground" data-testid="advanced-approval-profile-pending">
            Le profil de niveau de cet athlète n'est pas encore résolu : l'effet de chaque approbation sera vérifié
            au moment de la génération.
          </p>
        )}

        {profileUnverified && (
          <p
            role="alert"
            className="rounded border border-destructive/40 bg-destructive/10 p-2 text-[10px] leading-tight"
            data-testid="advanced-approval-profile-unverified"
          >
            Niveau d'entraînement non vérifié (« Auto » sans TSS 7j exploitable) : tes approbations n'auront
            <strong> aucun effet</strong>. Choisis un niveau d'entraînement manuel ou renseigne le TSS 7j dans le
            snapshot — une approbation ne remplace jamais cette preuve de profil.
          </p>
        )}

        {profileCaution && (
          <p
            className="rounded border border-amber-500/50 bg-amber-500/10 p-2 text-[10px] leading-tight"
            data-testid="advanced-approval-profile-caution"
          >
            Niveau effectif « {LEVEL_LABELS[profile.trainingLevel] ?? profile.trainingLevel} » : ces séances sont
            exigeantes. Sauf mention contraire sous la fiche, ton approbation les rend éligibles malgré ce
            niveau — relis chaque fiche avant de cocher.
          </p>
        )}

        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {groups.map(group => (
            <section key={group.group} className="space-y-1.5" aria-label={group.label}>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label} · {group.sessions.length}
              </h4>
              {group.sessions.map(session => {
                const inputId = `advanced-approval-${session.id}`;
                const isChecked = approved.has(session.id);
                const blocker = profile ? blockerText(session, profile) : null;
                return (
                  <div
                    key={session.id}
                    className="flex items-start gap-2 rounded border border-border/60 bg-background/60 p-2"
                  >
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={value => toggle(session.id, value === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label htmlFor={inputId} className="block cursor-pointer text-xs font-medium leading-snug">
                        {session.label}
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-mono">{session.id}</span> · {formatDuration(session.durationMin)}
                        {session.minimumTrainingLevel && (
                          <> · niveau minimal « {LEVEL_LABELS[session.minimumTrainingLevel]} »</>
                        )}
                        {session.minimumWeeklyHours != null && <> · au moins {session.minimumWeeklyHours} h/sem</>}
                      </p>
                      {session.when && (
                        <p className="text-[10px] leading-tight">
                          <span className="font-medium">Quand :</span> {session.when}
                        </p>
                      )}
                      {session.avoid && (
                        <p className="text-[10px] leading-tight">
                          <span className="font-medium">À éviter :</span> {session.avoid}
                        </p>
                      )}
                      {blocker && (
                        <p className="text-[10px] font-medium leading-tight text-destructive">{blocker}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] leading-tight text-muted-foreground">
            Les fiches d'hypoxie, d'exposition à la chaleur et la navette lactate course au seuil ne sont pas
            approuvables ici : leurs conditions ne sont pas vérifiables par l'application, elles restent en
            programmation manuelle uniquement. Les approbations sont propres à cet athlète : elles ne sont jamais
            reportées sur un autre.
          </p>
          {count > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-6 shrink-0 px-2 text-[10px]" onClick={() => onChange([])}>
              Tout décocher
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
