/**
 * CoachChecklistPage — Checklists tests & données par sport (Run / Tri / Trail)
 * Cochable, persistante par athlète (localStorage), exportable PDF (print).
 *
 * ✅ Saisie inline : pour les items mappés à une colonne snapshot, le coach
 * peut entrer la valeur directement dans la checklist. La valeur est écrite
 * dans le snapshot actif (ou crée un snapshot du jour si absent), ce qui
 * la rend immédiatement utilisable par les moteurs Diagnostic / Décision / Plan.
 */

import { useEffect, useMemo, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ClipboardList, Printer, RotateCcw, Footprints, Bike, Mountain, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData, type DbSnapshot } from "@/contexts/CloudDataContext";
import { TFCLTestingWeekStatusCard } from "@/components/coach/TFCLTestingWeekStatusCard";
import { AMBITION_DEFINITIONS, AMBITION_LEVELS_ORDERED } from "@/types/ambitionLevel";
import { toast } from "sonner";

/**
 * Field mapping vers une colonne snapshot.
 * - read: lit la valeur depuis le snapshot, dans l'unité affichée
 * - write: renvoie un patch partiel snapshot depuis l'unité affichée
 */
type SnapshotFieldSpec = {
  unit: string;
  placeholder?: string;
  step?: string;
  read: (s: DbSnapshot | null) => number | string | null;
  write: (value: number) => Partial<DbSnapshot>;
};

type AthleteFieldSpec = {
  kind: "number" | "date" | "select";
  unit?: string;
  placeholder?: string;
  step?: string;
  options?: { value: string; label: string }[];
  read: (a: any | null) => string | number | null;
  /** Renvoie un objet partiel à fusionner dans l'athlète (clés top-level + `refs`). */
  write: (value: string, athlete: any | null) => Record<string, any>;
};

type Item = {
  id: string;
  label: string;
  test: string;
  encode: string;
  /** Si présent, affiche un input lié au snapshot actif. */
  field?: SnapshotFieldSpec;
  /** Si présent, affiche un input lié à l'athlète (refs ou colonnes). */
  athleteField?: AthleteFieldSpec;
  /** Route applicative pour aller directement à l'écran d'encodage. */
  navigateTo?: string;
  /** Indicateur auto-calculé (Calibration continue). */
  auto?: { done: boolean; info: string };
};

type Section = {
  title: string;
  items: Item[];
};


type Sport = "common" | "run" | "tri" | "trail";

// ============================================================
// Field specs (mapping checklist ↔ colonnes snapshot)
// ============================================================

const F = {
  weight_kg: {
    unit: "kg",
    step: "0.1",
    read: (s) => s?.weight_kg ?? null,
    write: (v) => ({ weight_kg: v }),
  } satisfies SnapshotFieldSpec,
  fc_max: {
    unit: "bpm",
    step: "1",
    read: (s) => s?.fc_max ?? null,
    write: (v) => ({ fc_max: Math.round(v) }),
  } satisfies SnapshotFieldSpec,
  vma: {
    unit: "km/h",
    step: "0.1",
    read: (s) => s?.vma ?? null,
    write: (v) => ({ vma: v }),
  } satisfies SnapshotFieldSpec,
  seuil_run_kmh: {
    unit: "km/h",
    step: "0.1",
    placeholder: "ex: 16.5",
    read: (s) =>
      s?.pace_threshold_sec_per_km
        ? Math.round((3600 / s.pace_threshold_sec_per_km) * 10) / 10
        : null,
    write: (v) => ({ pace_threshold_sec_per_km: Math.round(3600 / v) }),
  } satisfies SnapshotFieldSpec,
  vo2max: {
    unit: "ml/kg/min",
    step: "0.1",
    read: (s) => s?.vo2max ?? null,
    write: (v) => ({ vo2max: v }),
  } satisfies SnapshotFieldSpec,
  sprint15: {
    unit: "m",
    step: "0.5",
    read: (s) => (s as any)?.sprint_15s_distance ?? null,
    write: (v) => ({ sprint_15s_distance: v } as any),
  } satisfies SnapshotFieldSpec,
  tte_run: {
    unit: "min",
    step: "1",
    read: (s) => (s as any)?.tte_observed_min_run ?? null,
    write: (v) => ({ tte_observed_min_run: Math.round(v) } as any),
  } satisfies SnapshotFieldSpec,
  ftp: {
    unit: "W",
    step: "1",
    read: (s) => s?.ftp ?? null,
    write: (v) => ({ ftp: Math.round(v) }),
  } satisfies SnapshotFieldSpec,
  pmax_5s: {
    unit: "W",
    step: "1",
    read: (s) => s?.pmax_5s ?? null,
    write: (v) => ({ pmax_5s: Math.round(v) }),
  } satisfies SnapshotFieldSpec,
  tte_bike: {
    unit: "min",
    step: "1",
    read: (s) => s?.tte_observed_min ?? null,
    write: (v) => ({ tte_observed_min: Math.round(v) }),
  } satisfies SnapshotFieldSpec,
  vlamax_bike: {
    unit: "mmol/L/s",
    step: "0.01",
    read: (s) => s?.vlamax ?? null,
    write: (v) => ({ vlamax: v }),
  } satisfies SnapshotFieldSpec,
  css: {
    unit: "sec/100m",
    step: "0.1",
    read: (s) => s?.css ?? null,
    write: (v) => ({ css: v }),
  } satisfies SnapshotFieldSpec,
};

// ============================================================
// Sections (avec mapping field optionnel)
// ============================================================

// ============================================================
// Athlete field specs (refs + colonnes athletes)
// ============================================================

const A = {
  height_cm: {
    kind: "number",
    unit: "cm",
    step: "0.5",
    placeholder: "ex: 178",
    read: (a) => a?.refs?.height_cm ?? null,
    write: (v, a) => ({
      refs: { ...(a?.refs ?? {}), height_cm: Number(v) },
    }),
  } satisfies AthleteFieldSpec,
  birth_date: {
    kind: "date",
    placeholder: "AAAA-MM-JJ",
    read: (a) => a?.dateNaissance ?? null,
    write: (v) => ({ dateNaissance: v || null }),
  } satisfies AthleteFieldSpec,
  fc_rest: {
    kind: "number",
    unit: "bpm",
    step: "1",
    placeholder: "ex: 52",
    read: (a) => a?.refs?.fc_rest ?? null,
    write: (v, a) => ({
      refs: { ...(a?.refs ?? {}), fc_rest: Math.round(Number(v)) },
    }),
  } satisfies AthleteFieldSpec,
  sport_main: {
    kind: "select",
    options: [
      { value: "run", label: "Coureur (Route)" },
      { value: "tri", label: "Triathlète" },
      { value: "trail", label: "Trailer" },
    ],
    read: (a) => a?.refs?.sport_main ?? null,
    write: (v, a) => ({
      refs: { ...(a?.refs ?? {}), sport_main: v },
    }),
  } satisfies AthleteFieldSpec,
  race_date: {
    kind: "date",
    read: (a) => a?.refs?.race_date ?? null,
    write: (v, a) => ({
      refs: { ...(a?.refs ?? {}), race_date: v || null },
    }),
  } satisfies AthleteFieldSpec,
  ambition: {
    kind: "select",
    options: AMBITION_LEVELS_ORDERED.map((id) => ({
      value: id,
      label: AMBITION_DEFINITIONS[id].label,
    })),
    read: (a) => a?.ambition ?? a?.refs?.ambition ?? null,
    write: (v, a) => ({
      ambition: v,
      refs: { ...(a?.refs ?? {}), ambition: v },
    }),
  } satisfies AthleteFieldSpec,
  sex: {
    kind: "select",
    options: [
      { value: "M", label: "Homme" },
      { value: "F", label: "Femme" },
    ],
    read: (a) => a?.sexe ?? a?.sex ?? a?.refs?.sexe ?? null,
    write: (v, a) => ({
      sexe: v,
      sex: v,
      refs: { ...(a?.refs ?? {}), sexe: v },
    }),
  } satisfies AthleteFieldSpec,
  experience_level: {
    kind: "select",
    options: [
      { value: "debutant", label: "Débutant (<1 an)" },
      { value: "intermediaire", label: "Intermédiaire (1–3 ans)" },
      { value: "confirme", label: "Confirmé (3–7 ans)" },
      { value: "expert", label: "Expert (>7 ans)" },
    ],
    read: (a) => a?.refs?.experience_level ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), experience_level: v } }),
  } satisfies AthleteFieldSpec,
  tss_7d_habituel: {
    kind: "number",
    unit: "TSS/sem",
    step: "10",
    placeholder: "ex: 450",
    read: (a) => a?.refs?.tss_7d_habituel ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), tss_7d_habituel: Math.round(Number(v)) } }),
  } satisfies AthleteFieldSpec,
  weekly_dplus_target_m: {
    kind: "number",
    unit: "m/sem",
    step: "50",
    placeholder: "ex: 1500",
    read: (a) => a?.refs?.weekly_dplus_target_m ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), weekly_dplus_target_m: Math.round(Number(v)) } }),
  } satisfies AthleteFieldSpec,
  peak_dplus_session_m: {
    kind: "number",
    unit: "m",
    step: "50",
    placeholder: "ex: 1200",
    read: (a) => a?.refs?.peak_dplus_session_m ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), peak_dplus_session_m: Math.round(Number(v)) } }),
  } satisfies AthleteFieldSpec,
  target_time_hours: {
    kind: "number",
    unit: "h",
    step: "0.25",
    placeholder: "ex: 6.5",
    read: (a) => a?.refs?.target_time_hours ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), target_time_hours: Number(v) } }),
  } satisfies AthleteFieldSpec,
  mlss_observed_w: {
    kind: "number",
    unit: "W",
    step: "1",
    placeholder: "ex: 245",
    read: (a) => a?.refs?.mlss_observed_w ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), mlss_observed_w: Math.round(Number(v)) } }),
  } satisfies AthleteFieldSpec,
  lactate_threshold_mmol: {
    kind: "number",
    unit: "mmol/L",
    step: "0.1",
    placeholder: "ex: 4.0",
    read: (a) => a?.refs?.lactate_threshold_mmol ?? null,
    write: (v, a) => ({ refs: { ...(a?.refs ?? {}), lactate_threshold_mmol: Number(v) } }),
  } satisfies AthleteFieldSpec,
};




// ============================================================
// Sections (avec mapping field optionnel)
// ============================================================

const SOCLE: Section = {
  title: "Socle commun (tous athlètes)",
  items: [
    { id: "weight", label: "Poids (kg)", test: "Balance, à jeun le matin", encode: "Snapshot → Poids", field: F.weight_kg, navigateTo: "/" },
    { id: "height", label: "Taille (cm)", test: "Mesure debout sans chaussures", encode: "Profil athlète → Anthropométrie", athleteField: A.height_cm, navigateTo: "/athleteEditPage" },
    { id: "age", label: "Date de naissance", test: "Date de naissance (utilisée pour âge & ajustements masters)", encode: "Profil athlète → Identité", athleteField: A.birth_date, navigateTo: "/athleteEditPage" },
    { id: "fcmax", label: "FC max (bpm)", test: "Test terrain : 3 km échauffement + 2×3 min all-out + 1 min all-out", encode: "Snapshot → FC max", field: F.fc_max, navigateTo: "/" },
    { id: "fcrest", label: "FC repos (bpm)", test: "Moyenne sur 5 matins consécutifs, allongé, avant lever", encode: "Profil → Données physio → FCrepos", athleteField: A.fc_rest, navigateTo: "/athleteEditPage" },
    { id: "sport", label: "Sport principal", test: "Discipline cible (Run / Tri / Trail)", encode: "Profil → Sport principal", athleteField: A.sport_main, navigateTo: "/athleteEditPage" },
    { id: "raceDate", label: "Date de la course objectif", test: "Date officielle de la course A", encode: "Profil → Objectif principal → Date", athleteField: A.race_date, navigateTo: "/athleteEditPage" },
    { id: "ambition", label: "Niveau d'ambition", test: "Découverte / Confirmé / Compétiteur / Qualifiable / Élite", encode: "Profil → Objectif → Ambition", athleteField: A.ambition, navigateTo: "/athleteEditPage" },
  ],
};

const RUN: Section = {
  title: "Coureur (Route / 5K → Marathon)",
  items: [
    { id: "vma", label: "VMA (km/h)", test: "VAMEVAL ou 5 min all-out après 15 min d'échauffement", encode: "Snapshot → VMA", field: F.vma, navigateTo: "/diagnostic/testing-week-cap" },
    { id: "seuil_run", label: "Vitesse au seuil (km/h)", test: "30 min all-out (CP30) ou chrono 10 km récent (<8 sem)", encode: "Snapshot → Pace seuil (auto sec/km)", field: F.seuil_run_kmh, navigateTo: "/diagnostic/testing-week-cap" },
    { id: "vo2max", label: "VO₂max (ml/kg/min)", test: "Auto-calculé depuis VMA (≈ VMA × 3.5) ou test labo direct", encode: "Snapshot → VO₂max", field: F.vo2max, navigateTo: "/diagnostic/testing-week-cap" },
    { id: "sprint15", label: "Sprint 15s (distance, m)", test: "2 km échauffement + 3×15 s all-out plat, départ lancé. Meilleure distance", encode: "Snapshot → Sprint 15s", field: F.sprint15, navigateTo: "/diagnostic/testing-week-cap" },
    { id: "tte_run", label: "TTE à l'allure seuil (min)", test: "Tenir le plus longtemps possible à l'allure seuil (objectif >40 min)", encode: "Snapshot → TTE Run", field: F.tte_run, navigateTo: "/diagnostic/testing-week-cap" },
    { id: "economy", label: "Économie de course (ml/kg/km)", test: "Auto-calculé depuis FIT", encode: "Auto depuis import FIT", navigateTo: "/diagnostic/tests" },
    { id: "race_ref", label: "Course de référence récente", test: "Chrono officiel <8 semaines sur 10K / semi / marathon", encode: "Profil → Records personnels", navigateTo: "/athleteEditPage" },
  ],
};

const TRI: Section = {
  title: "Triathlète (Sprint → Ironman)",
  items: [
    { id: "ftp", label: "FTP vélo (W)", test: "Test 20 min all-out × 0.95", encode: "Snapshot → FTP", field: F.ftp, navigateTo: "/diagnostic/testing-week-tfcl" },
    { id: "pmax5", label: "Puissance max 5s (W)", test: "Sprint vélo 5 s départ lancé, meilleur de 3 essais", encode: "Snapshot → Pmax 5s", field: F.pmax_5s, navigateTo: "/diagnostic/testing-week-tfcl" },
    
    { id: "tte_bike", label: "TTE vélo à FTP (min)", test: "Tenir le plus longtemps possible à FTP (objectif >40 min)", encode: "Snapshot → TTE Bike", field: F.tte_bike, navigateTo: "/diagnostic/testing-week-tfcl" },
    { id: "vlamax_bike", label: "VLamax vélo (mmol/L/s)", test: "Sprint vélo 15 s (calculé ou estimé multi-sources)", encode: "Snapshot → VLamax", field: F.vlamax_bike, navigateTo: "/diagnostic/vlamax" },
    { id: "css", label: "CSS natation (sec/100m)", test: "400 m + 200 m all-out, CSS = (D400−D200)/2", encode: "Snapshot → CSS", field: F.css, navigateTo: "/" },
    { id: "vo2_bike", label: "VO₂max vélo (ml/kg/min)", test: "Auto depuis FTP + poids, ou test labo direct", encode: "Snapshot → VO₂max", field: F.vo2max, navigateTo: "/diagnostic/testing-week-tfcl" },
    { id: "run_subset", label: "Données coureur (VMA + seuil + sprint 15s)", test: "Voir checklist Coureur (sport secondaire)", encode: "Voir onglet Coureur" },
  ],
};

const TRAIL: Section = {
  title: "Trailer (Court → Ultra / Mountain)",
  items: [
    { id: "v_up", label: "Vitesse ascensionnelle au seuil (m/h)", test: "Côte régulière 5–8% pendant 20 min all-out", encode: "Diagnostic → Tests → V↑ seuil", navigateTo: "/diagnostic/tests" },
    { id: "sprint_uphill", label: "Sprint côte 30s (m)", test: "Sprint montée raide (8–12%) 30 s all-out, distance parcourue", encode: "Diagnostic → Tests → Sprint côte", navigateTo: "/diagnostic/tests" },
    { id: "weekly_dplus", label: "Charge D+ hebdo habituelle (m)", test: "Moyenne D+ des 4 dernières semaines (Strava/Garmin)", encode: "Profil → Trail → D+ hebdo", navigateTo: "/athleteEditPage" },
    { id: "max_dplus_session", label: "D+ max sur une séance (m)", test: "Plus gros D+ encaissé en sortie longue récente (3 mois)", encode: "Profil → Trail → D+ max séance", navigateTo: "/athleteEditPage" },
    { id: "race_profile", label: "Profil course objectif (km / D+ / altitude max)", test: "Trace GPX officielle de la course", encode: "Profil → Objectif Trail → Profil course", navigateTo: "/athleteEditPage" },
    { id: "target_time", label: "Temps cible (h:min)", test: "Estimation réaliste basée sur courses similaires", encode: "Profil → Objectif → Temps cible", navigateTo: "/athleteEditPage" },
    { id: "eccentric_eco", label: "Économie excentrique (descente)", test: "Auto depuis FIT : dérive FC sur descentes longues", encode: "Auto depuis FIT", navigateTo: "/diagnostic/tests" },
    { id: "fatigue_descent", label: "Fatigue post-descente (subjectif 1–10)", test: "Note ressentie 24 h après sortie longue avec D−", encode: "Snapshot quotidien → Fatigue", navigateTo: "/" },
    { id: "run_subset_trail", label: "Données coureur (VMA + seuil + sprint 15s)", test: "Voir checklist Coureur (base aérobie)", encode: "Voir onglet Coureur" },
  ],
};

const CALIB: Section = {
  title: "Calibration continue (recommandé)",
  items: [
    { id: "fit_sync", label: "Import FIT régulier (Strava / Garmin)", test: "Auto-import ou upload manuel séances clés", encode: "Diagnostic → Tests → Import FIT", navigateTo: "/diagnostic/tests" },
    { id: "lab_lactate", label: "Test lactate labo (1×/an)", test: "Test incrémental lactate en laboratoire (référence VLamax + MLSS)", encode: "Diagnostic → Tests → Import labo", navigateTo: "/diagnostic/tests" },
    { id: "snapshot_daily", label: "Snapshot quotidien (fatigue, sommeil, RPE)", test: "Saisie matinale 30 s : état général, sommeil, douleur", encode: "Dashboard → Snapshot du jour", navigateTo: "/" },
    { id: "field_test", label: "Test terrain tous les 6–8 sem", test: "VMA / FTP / Sprint 15s pour calibration continue VLamax 42j", encode: "Diagnostic → Tests", navigateTo: "/diagnostic/tests" },
  ],
};

const SECTIONS_BY_SPORT: Record<Exclude<Sport, "common">, Section[]> = {
  run: [SOCLE, RUN, CALIB],
  tri: [SOCLE, TRI, RUN, CALIB],
  trail: [SOCLE, TRAIL, RUN, CALIB],
};

// ============================================================
// Inline field input
// ============================================================

function InlineFieldInput({
  field,
  snapshot,
  onCommit,
  disabled,
}: {
  field: SnapshotFieldSpec;
  snapshot: DbSnapshot | null;
  onCommit: (patch: Partial<DbSnapshot>) => Promise<void>;
  disabled?: boolean;
}) {
  const current = field.read(snapshot);
  const [val, setVal] = useState<string>(current != null ? String(current) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(current != null ? String(current) : "");
  }, [current]);

  const commit = async () => {
    const trimmed = val.trim();
    if (trimmed === "") return;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) {
      toast.error("Valeur invalide");
      return;
    }
    if (current != null && Number(current) === num) return; // no change
    setSaving(true);
    try {
      await onCommit(field.write(num));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 print:hidden">
      <Input
        type="number"
        inputMode="decimal"
        step={field.step ?? "any"}
        placeholder={field.placeholder ?? "—"}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={disabled || saving}
        className="h-8 w-28 text-sm"
      />
      <span className="text-xs text-muted-foreground">{field.unit}</span>
      {current != null && (
        <span className="inline-flex items-center text-xs text-green-600 dark:text-green-500 ml-1">
          <CheckCircle2 className="h-3.5 w-3.5 mr-0.5" /> enregistré
        </span>
      )}
    </div>
  );
}

function InlineAthleteFieldInput({
  field,
  athlete,
  onCommit,
  disabled,
}: {
  field: AthleteFieldSpec;
  athlete: any | null;
  onCommit: (patch: Record<string, any>) => Promise<void>;
  disabled?: boolean;
}) {
  const current = field.read(athlete);
  const [val, setVal] = useState<string>(current != null ? String(current) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(current != null ? String(current) : "");
  }, [current]);

  const commit = async (nextVal?: string) => {
    const raw = (nextVal ?? val).trim();
    if (raw === "") return;
    if (current != null && String(current) === raw) return;
    if (field.kind === "number" && !Number.isFinite(Number(raw))) {
      toast.error("Valeur invalide");
      return;
    }
    setSaving(true);
    try {
      await onCommit(field.write(raw, athlete));
    } finally {
      setSaving(false);
    }
  };

  const filled = current != null && current !== "";

  return (
    <div className="flex items-center gap-1.5 mt-2 print:hidden">
      {field.kind === "select" ? (
        <select
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            commit(e.target.value);
          }}
          disabled={disabled || saving}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">— choisir —</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={field.kind === "date" ? "date" : "number"}
          inputMode={field.kind === "number" ? "decimal" : undefined}
          step={field.kind === "number" ? field.step ?? "any" : undefined}
          placeholder={field.placeholder ?? "—"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          disabled={disabled || saving}
          className="h-8 w-36 text-sm"
        />
      )}
      {field.unit && <span className="text-xs text-muted-foreground">{field.unit}</span>}
      {filled && (
        <span className="inline-flex items-center text-xs text-green-600 dark:text-green-500 ml-1">
          <CheckCircle2 className="h-3.5 w-3.5 mr-0.5" /> enregistré
        </span>
      )}
    </div>
  );
}

function ChecklistView({
  sport,
  sections,
  checked,
  onToggle,
  snapshot,
  onCommitField,
  athlete,
  onCommitAthleteField,
  canEdit,
}: {
  sport: string;
  sections: Section[];
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  snapshot: DbSnapshot | null;
  onCommitField: (patch: Partial<DbSnapshot>) => Promise<void>;
  athlete: any | null;
  onCommitAthleteField: (patch: Record<string, any>) => Promise<void>;
  canEdit: boolean;
}) {
  const navigate = useNavigate();
  // Auto-check: un item avec field rempli est considéré comme fait
  const effectiveChecked = useMemo(() => {
    const out: Record<string, boolean> = { ...checked };
    for (const section of sections) {
      for (const item of section.items) {
        if (item.field) {
          const v = item.field.read(snapshot);
          if (v != null && v !== "") out[`${sport}:${item.id}`] = true;
        }
        if (item.athleteField) {
          const v = item.athleteField.read(athlete);
          if (v != null && v !== "") out[`${sport}:${item.id}`] = true;
        }
      }
    }
    return out;
  }, [checked, sections, snapshot, athlete, sport]);

  const allIds = sections.flatMap((s) => s.items.map((i) => `${sport}:${i.id}`));
  const doneCount = allIds.filter((id) => effectiveChecked[id]).length;
  const total = allIds.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const quality =
    pct < 40
      ? { label: "🔴 Insuffisant", color: "text-red-500" }
      : pct < 70
      ? { label: "🟡 Basique", color: "text-yellow-500" }
      : pct < 90
      ? { label: "🟢 Fiable", color: "text-green-500" }
      : { label: "🔵 Élite", color: "text-blue-500" };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 px-4 flex items-center gap-4 print:hidden">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">Progression</span>
              <span className={`text-sm font-semibold ${quality.color}`}>
                {doneCount}/{total} — {quality.label}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.items.map((item) => {
              const key = `${sport}:${item.id}`;
              const isChecked = !!effectiveChecked[key];
              return (
                <div
                  key={item.id}
                  className="flex gap-3 items-start p-3 rounded-lg border border-border/50 hover:border-border transition"
                >
                  <Checkbox
                    id={key}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={key}
                      className={`font-medium text-sm cursor-pointer block ${
                        isChecked ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-foreground/70">Test :</span> {item.test}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-primary/80">
                        <span className="font-medium">→ Encoder :</span> {item.encode}
                      </p>
                      {item.navigateTo && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs print:hidden"
                          onClick={() => {
                            if (item.navigateTo!.startsWith("/athleteEditPage") && athlete?.id) {
                              navigate(`/athlete/${athlete.id}`);
                            } else {
                              navigate(item.navigateTo!);
                            }
                          }}
                        >
                          Aller <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                    {item.field && (
                      <InlineFieldInput
                        field={item.field}
                        snapshot={snapshot}
                        onCommit={onCommitField}
                        disabled={!canEdit}
                      />
                    )}
                    {item.athleteField && (
                      <InlineAthleteFieldInput
                        field={item.athleteField}
                        athlete={athlete}
                        onCommit={onCommitAthleteField}
                        disabled={!canEdit}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CoachChecklistPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(
    () => localStorage.getItem("vlab-staff-mode") === "true"
  );
  const { currentAthlete, updateAthlete } = useAthletes();
  const { snapshots, addSnapshot, updateSnapshot, setActiveSnapshot } = useCloudData();

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);

  const athleteId = currentAthlete?.id ?? null;
  const athleteName = currentAthlete?.nom ?? currentAthlete?.name ?? "Athlète";
  const storageKey = `coach-checklist:${athleteId ?? "default"}`;

  // ===== Résolution du snapshot actif =====
  const activeSnapshot = useMemo<DbSnapshot | null>(() => {
    if (!athleteId) return null;
    const own = snapshots.filter((s) => s.athlete_id === athleteId);
    if (own.length === 0) return null;
    const activeId = currentAthlete?.active_snapshot_id;
    if (activeId) {
      const found = own.find((s) => s.id === activeId);
      if (found) return found;
    }
    // Fallback : snapshot le plus récent
    return [...own].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0] ?? null;
  }, [snapshots, athleteId, currentAthlete?.active_snapshot_id]);

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const reset = () => {
    if (!confirm("Réinitialiser toutes les cases pour cet athlète ?")) return;
    setChecked({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  // ===== Écriture d'un champ dans le snapshot =====
  const commitField = async (patch: Partial<DbSnapshot>) => {
    if (!athleteId) {
      toast.error("Sélectionnez un athlète avant de saisir une valeur");
      return;
    }
    if (activeSnapshot) {
      const ok = await updateSnapshot(activeSnapshot.id, patch);
      if (ok) toast.success("Snapshot mis à jour");
    } else {
      // Crée un snapshot du jour, source "checklist"
      const today = new Date().toISOString().slice(0, 10);
      const created = await addSnapshot({
        athlete_id: athleteId,
        coach_id: "" as any, // override par useCloudData.addSnapshot
        date: today,
        source: "checklist" as any,
        coach_notes: "Snapshot créé depuis la Checklist Coach",
        ...patch,
      } as any);
      if (created) {
        await setActiveSnapshot(athleteId, created.id);
      }
    }
  };

  // ===== Écriture d'un champ dans l'athlète (colonnes + refs) =====
  const commitAthleteField = async (patch: Record<string, any>) => {
    if (!currentAthlete) {
      toast.error("Sélectionnez un athlète avant de saisir une valeur");
      return;
    }
    const next: any = { ...currentAthlete, ...patch };
    if (patch.refs) {
      next.refs = { ...(currentAthlete.refs ?? {}), ...patch.refs };
    }
    const ok = await updateAthlete(next);
    if (ok) toast.success("Profil athlète mis à jour");
  };

  const [sportTab, setSportTab] = useState<Exclude<Sport, "common">>("run");

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Checklist Coach</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tests à faire passer & données à encoder — saisie directe possible
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimer / PDF
            </Button>
          </div>
        </div>

        {/* Athlete badge */}
        <Card className="border-primary/20 bg-primary/5 print:bg-white print:border-black">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">
              Checklist pour : <span className="font-semibold">{athleteName}</span>
            </span>
            <Badge variant="outline" className="text-xs">
              Sport : {sportTab.toUpperCase()}
            </Badge>
            {activeSnapshot ? (
              <Badge variant="secondary" className="text-xs">
                Snapshot lié : {activeSnapshot.date}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Aucun snapshot — sera créé à la 1ʳᵉ saisie
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* TFCL Testing Week status — visible at top, badge precision */}
        <TFCLTestingWeekStatusCard snapshot={activeSnapshot as any} sport={sportTab} />


        {/* Tabs */}
        <Tabs value={sportTab} onValueChange={(v) => setSportTab(v as Exclude<Sport, "common">)}>
          <TabsList className="grid w-full grid-cols-3 print:hidden">
            <TabsTrigger value="run" className="gap-1.5">
              <Footprints className="h-4 w-4" /> Coureur
            </TabsTrigger>
            <TabsTrigger value="tri" className="gap-1.5">
              <Bike className="h-4 w-4" /> Triathlète
            </TabsTrigger>
            <TabsTrigger value="trail" className="gap-1.5">
              <Mountain className="h-4 w-4" /> Trailer
            </TabsTrigger>
          </TabsList>

          {(["run", "tri", "trail"] as const).map((s) => (
            <TabsContent key={s} value={s} className="mt-4">
              <ChecklistView
                sport={s}
                sections={SECTIONS_BY_SPORT[s]}
                checked={checked}
                onToggle={toggle}
                snapshot={activeSnapshot}
                onCommitField={commitField}
                athlete={currentAthlete}
                onCommitAthleteField={commitAthleteField}
                canEdit={!!athleteId}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Quality legend */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Niveaux de qualité du profil</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1 text-muted-foreground">
            <div>🔴 <strong>Insuffisant</strong> (&lt;40%) — Socle incomplet, "Données insuffisantes"</div>
            <div>🟡 <strong>Basique</strong> (40–70%) — Diagnostic OK, plan IA en mode prudent</div>
            <div>🟢 <strong>Fiable</strong> (70–90%) — Plan IA pleine puissance, simulation ±3%</div>
            <div>🔵 <strong>Élite</strong> (&gt;90%) — Calibration continue VLamax 42j, INSCYD-grade</div>
            <div className="pt-2 text-foreground/80">
              💡 Les champs avec un input sont liés au <strong>snapshot actif</strong> : la valeur saisie est immédiatement utilisée par les moteurs Diagnostic / Décision / Plan.
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
