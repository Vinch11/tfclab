/**
 * TestingProtocolsMatrix — Vue d'ensemble des protocoles de testing TFCLab
 * ─────────────────────────────────────────────────────────────────────
 * Pour chaque donnée du snapshot, indique dans quel protocole elle est
 * réellement mesurée, estimée par un modèle, saisie à la main (la page ne
 * calcule rien), ou absente. Construit en auditant directement le code de
 * chaque page (TrackDayPage.tsx, BikeTrackDayPage.tsx, SwimPoolDayPage.tsx,
 * TriTestDayPage.tsx, profilExpress.ts) — pas une description marketing.
 *
 * Même contenu que le PDF "Tableau récapitulatif des protocoles de testing"
 * généré pour le coach, affiché ici directement dans l'app pour une vue
 * d'ensemble en un coup d'œil.
 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

type Status = "ok" | "est" | "man" | "na";

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-success/10 text-success border-success/30" },
  est: { label: "EST.", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400" },
  man: { label: "SAISIE", cls: "bg-primary/10 text-primary border-primary/30" },
  na: { label: "—", cls: "bg-muted text-muted-foreground border-border" },
};

const LEGEND: Array<{ status: Status; desc: string }> = [
  { status: "ok", desc: "mesuré / calculé automatiquement par la page depuis les données du test" },
  { status: "est", desc: "estimé par un modèle (Mader, Score G…) — pas une mesure directe" },
  { status: "man", desc: "saisie manuelle par le coach — la page ne calcule rien" },
  { status: "na", desc: "absent — aucun champ dédié" },
];

const COLUMNS = [
  "Track Day™",
  "Bike Day™",
  "Pool Day™",
  "Tri Test Day™",
  "Profil Rapide (course)",
  "Profil Rapide (vélo)",
];

interface Cell {
  status: Status;
  note?: string;
}

interface MatrixRow {
  label: string;
  cells: Cell[];
}

const ROWS: MatrixRow[] = [
  { label: "Poids (weight_kg)", cells: [{ status: "ok" }, { status: "ok" }, { status: "ok" }, { status: "man" }, { status: "ok" }, { status: "ok" }] },
  { label: "FC repos (fc_repos)", cells: [{ status: "ok" }, { status: "ok" }, { status: "ok" }, { status: "man" }, { status: "na" }, { status: "na" }] },
  { label: "FC max (fc_max)", cells: [{ status: "ok" }, { status: "ok" }, { status: "ok" }, { status: "man" }, { status: "na" }, { status: "na" }] },
  { label: "VMA (vma)", cells: [{ status: "ok" }, { status: "na" }, { status: "na" }, { status: "man" }, { status: "ok" }, { status: "na" }] },
  {
    label: "VLamax course (vlamax_run)",
    cells: [
      { status: "na", note: "Calculé mais délibérément non écrit ici — transmis à un pipeline de fusion séparé (vlamaxCapEstimator) pour éviter de figer une estimation locale." },
      { status: "na" }, { status: "na" }, { status: "man" }, { status: "est" }, { status: "na" },
    ],
  },
  { label: "VLamax vélo (vlamax)", cells: [{ status: "na" }, { status: "est" }, { status: "na" }, { status: "man" }, { status: "na" }, { status: "est" }] },
  {
    label: "VLamax natation",
    cells: [
      { status: "na", note: "Un indice VLamax natation est calculé par la page mais reste uniquement dans le texte libre « notes coach » — aucune colonne snapshot dédiée n'existe pour ce champ, dans aucun protocole." },
      { status: "na", note: "Même limitation : pas de colonne dédiée." },
      { status: "na", note: "Même limitation, y compris sur la fiche qui mesure pourtant le CSS." },
      { status: "man" }, { status: "na" }, { status: "na" },
    ],
  },
  {
    label: "Allure seuil course (pace_threshold_sec_per_km)",
    cells: [
      { status: "ok" }, { status: "na" },
      { status: "na", note: "Aucun champ dédié dans ce protocole, y compris pour une saisie manuelle." },
      { status: "na", note: "Aucun champ dédié dans ce protocole, y compris pour une saisie manuelle." },
      { status: "est" }, { status: "na" },
    ],
  },
  { label: "FTP vélo (ftp)", cells: [{ status: "na" }, { status: "ok" }, { status: "na" }, { status: "man" }, { status: "na" }, { status: "est" }] },
  { label: "CSS natation (css)", cells: [{ status: "na" }, { status: "na" }, { status: "ok" }, { status: "man" }, { status: "na" }, { status: "na" }] },
  {
    label: "VO2max (vo2max)",
    cells: [
      { status: "est" }, { status: "est" }, { status: "na" },
      { status: "est", note: "Dérivé de la VMA tapée manuellement par le coach (vo2max = VMA × 3,5) — Tri Test Day ne calcule rien d'autre lui-même." },
      { status: "est" }, { status: "est" },
    ],
  },
  {
    label: "TTE course (tte_observed_min_run)",
    cells: [
      { status: "est", note: "Le nom du champ contient « observed » mais la valeur est en réalité estimée par une formule simple, jamais mesurée par un effort réel à l'épuisement." },
      { status: "na" }, { status: "na" },
      { status: "na", note: "Aucun champ dédié dans ce protocole." },
      { status: "na" }, { status: "na" },
    ],
  },
  {
    label: "TTE vélo (tte_observed_min)",
    cells: [
      { status: "na" },
      { status: "est", note: "Le nom du champ contient « observed » mais la valeur est en réalité estimée par une formule simple, jamais mesurée par un effort réel à l'épuisement." },
      { status: "na" },
      { status: "na", note: "Aucun champ dédié dans ce protocole." },
      { status: "na" }, { status: "na" },
    ],
  },
  {
    label: "Courbe puissance (P30s/P60s/MAP/Pmax)",
    cells: [
      { status: "na" }, { status: "ok" }, { status: "na" }, { status: "na" },
      { status: "na" },
      { status: "na", note: "Les points de puissance sont utilisés en interne pour dériver le FTP/VLamax du Profil Rapide, mais ne sont pas réécrits dans ces colonnes dédiées." },
    ],
  },
  { label: "Confiance explicite (confidence)", cells: [{ status: "na" }, { status: "na" }, { status: "na" }, { status: "na" }, { status: "ok" }, { status: "ok" }] },
];

const KEY_POINTS = [
  "Tri Test Day™ est la seule colonne presque entièrement en SAISIE : la page ne calcule rien, le coach fait les calculs lui-même et retape les résultats.",
  "Profil Rapide est le seul protocole à porter une confiance explicite — partout ailleurs, des valeurs elles-mêmes estimées (TTE, VLamax) sont écrites sans aucun signal de confiance.",
  "La VLamax natation n'a jamais de colonne dédiée dans aucun protocole, y compris Pool Day qui est censé la mesurer.",
  "Le nom de champ « tte_observed_min(_run) » est trompeur partout où il est rempli — c'est toujours une estimation par formule, jamais une vraie observation.",
];

function StatusBadge({ cell }: { cell: Cell }) {
  const meta = STATUS_META[cell.status];
  const badge = (
    <Badge variant="outline" className={`${meta.cls} font-semibold gap-1 whitespace-nowrap`}>
      {meta.label}
      {cell.note && <Info className="h-3 w-3" />}
    </Badge>
  );
  if (!cell.note) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{cell.note}</TooltipContent>
    </Tooltip>
  );
}

export function TestingProtocolsMatrix() {
  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {LEGEND.map(({ status, desc }) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className={`${STATUS_META[status].cls} font-semibold`}>
                {STATUS_META[status].label}
              </Badge>
              <span>{desc}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left p-2 font-semibold bg-primary/5 sticky left-0">Donnée (champ snapshot)</th>
                {COLUMNS.map((c) => (
                  <th key={c} className="text-center p-2 font-semibold bg-primary/5 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                // Fond explicite (pas "inherit") sur la cellule sticky : une ligne
                // sans classe de fond laisserait le contenu défilé horizontalement
                // apparaître en transparence sous la colonne figée sur mobile.
                const rowBg = i % 2 === 1 ? "bg-muted/40" : "bg-background";
                return (
                  <tr key={row.label} className={rowBg}>
                    <td className={`p-2 text-left whitespace-nowrap sticky left-0 ${rowBg}`}>{row.label}</td>
                    {row.cells.map((cell, j) => (
                      <td key={j} className="p-2 text-center">
                        <StatusBadge cell={cell} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="space-y-1 pt-1 border-t">
          {KEY_POINTS.map((kp) => (
            <li key={kp} className="text-xs text-muted-foreground pl-3 relative before:content-['•'] before:absolute before:left-0">
              {kp}
            </li>
          ))}
        </ul>
      </div>
    </TooltipProvider>
  );
}
