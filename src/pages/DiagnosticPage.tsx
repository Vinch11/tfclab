/**
 * DiagnosticPage — Hub des analyses physiologiques
 * Regroupe : Tests, VLamax, Zones Métaboliques, Testing Weeks
 */

import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FlaskConical,
  ArrowRight,
  Stethoscope,
  Footprints,
  Bike,
  BookOpen,
  ClipboardList,
  Timer,
  Bike as BikeIcon,
  Waves,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AuditAthletesPanel } from "@/components/AuditAthletesPanel";
import { ScientificAuditReportButton } from "@/components/ScientificAuditReportButton";
import { InscydPoffe2024ValidationCard } from "@/components/InscydPoffe2024ValidationCard";
import { useAthletes } from "@/contexts/AthleteContext";
import {
  openFullDiagnosticDossierPrint,
  type DossierSport,
} from "@/lib/diagnostic/buildDiagnosticProtocolHTML";
import {
  openTestingWeekDossierPrint,
  type TestingWeekSport,
} from "@/lib/diagnostic/buildTestingWeekProtocolHTML";
import { buildCompactTriathlonNolioSessions } from "@/lib/diagnostic/testingWeekNolioSessions";
import {
  mergeTestingWeekSnapshots,
  buildConsolidatedSnapshotPayload,
  TESTING_FIELDS,
  TESTING_FIELD_LABELS,
  type MergedTestingSnapshot,
} from "@/lib/testingWeekSnapshotMerge";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderDown, Send, Loader2, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sections = [
  {
    id: "tests",
    title: "Tests & Protocoles",
    description: "Import FIT, détection protocole, calcul FTP, analyse dérive cardiaque",
    icon: FlaskConical,
    route: "/diagnostic/tests",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "testing-week-tfcl",
    title: "Semaine de Test TFCL",
    description: "Protocole vélo : 5 jours pour calibrer votre profil métabolique",
    icon: Bike,
    route: "/diagnostic/testing-week-tfcl",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "testing-week-cap",
    title: "Semaine de Test CAP",
    description: "Tests VMA, seuil, économie de course et durabilité",
    icon: Footprints,
    route: "/diagnostic/testing-week-cap",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "track-day",
    title: "TFCL Track Day™",
    description: "Protocole piste complet en 2h — VMA, VLamax, Seuil, TTE en une seule séance",
    icon: Timer,
    route: "/diagnostic/track-day",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "bike-track-day",
    title: "🚴 TFCL Bike Day™",
    description: "Protocole vélo 2h — FTP, VLamax, MAP, W' en une séance",
    icon: BikeIcon,
    route: "/diagnostic/bike-track-day",
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
  },
  {
    id: "swim-pool-day",
    title: "🏊 TFCL Pool Day™",
    description: "Protocole piscine 1h30 — CSS, VLamax nage, capacité aérobie",
    icon: Waves,
    route: "/diagnostic/swim-pool-day",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    id: "tri-test-day",
    title: "⚡ TFCL Tri Test Day™",
    description: "Protocole triathlon combiné — profil complet en 2 séances",
    icon: Zap,
    route: "/diagnostic/tri-test-day",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: "coach-checklist",
    title: "Checklist Coach",
    description: "Tests à faire passer & données à encoder par sport (Run / Tri / Trail), cochable et imprimable",
    icon: ClipboardList,
    route: "/diagnostic/coach-checklist",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "cohort-literature",
    title: "Cohorte Littérature (IA)",
    description: "Extraction IA de profils de référence depuis la littérature scientifique (Mader, Heck, Beneke…)",
    icon: BookOpen,
    route: "/diagnostic/cohort-literature",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  const { currentAthlete } = useAthletes();
  const [dossierSport, setDossierSport] = useState<DossierSport>("triathlon");
  const [dossierAthleteName, setDossierAthleteName] = useState<string>("");
  const [testingWeekSport, setTestingWeekSport] = useState<TestingWeekSport>("triathlon");
  const [nolioId, setNolioId] = useState<number | null>(null);
  const [nolioDay1Date, setNolioDay1Date] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [nolioSending, setNolioSending] = useState(false);

  useEffect(() => {
    setDossierAthleteName(currentAthlete?.name ?? "");
  }, [currentAthlete?.id, currentAthlete?.name]);

  useEffect(() => {
    if (!currentAthlete?.id) { setNolioId(null); return; }
    let cancelled = false;
    supabase
      .from("athletes")
      .select("nolio_id")
      .eq("id", currentAthlete.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const raw = (data as { nolio_id?: number | null } | null)?.nolio_id;
        setNolioId(typeof raw === "number" ? raw : null);
      });
    return () => { cancelled = true; };
  }, [currentAthlete?.id]);

  async function handleSendTestingWeekToNolio() {
    if (!currentAthlete) { toast.error("Sélectionnez un athlète"); return; }
    if (!nolioId) { toast.error("Cet athlète n'est pas lié à un compte Nolio"); return; }
    setNolioSending(true);
    try {
      const sessions = buildCompactTriathlonNolioSessions();
      const { data, error } = await supabase.functions.invoke("nolio-send-plan", {
        body: {
          athlete_id: currentAthlete.id,
          nolio_athlete_id: nolioId,
          planStartDate: nolioDay1Date,
          sessions,
        },
      });
      if (error) throw error;
      const result = data as { sent?: number; errors?: { status: number; detail?: string }[] } | null;
      const sentCount = result?.sent ?? 0;
      const errs = result?.errors ?? [];
      if (errs.length === 0 && sentCount > 0) {
        toast.success(`${sentCount} séances du calendrier de test envoyées vers Nolio ✅`);
      } else if (sentCount > 0) {
        toast.warning(
          `${sentCount} envoyées · ${errs.length} échec(s) — ${errs.slice(0, 2).map((e) => `${e.status} ${e.detail ?? ""}`).join(" | ")}`.slice(0, 240),
        );
      } else {
        toast.error(
          `Aucune séance envoyée — ${errs.slice(0, 2).map((e) => `${e.status} ${e.detail ?? ""}`).join(" | ")}`.slice(0, 240),
        );
      }
    } catch (e) {
      toast.error(`Erreur Nolio : ${(e as Error).message ?? "inconnue"}`);
    } finally {
      setNolioSending(false);
    }
  }

  // --- Consolidation semaine de test → snapshot unique ---
  const { snapshots, addSnapshot, setActiveSnapshot } = useCloudDataContext();
  const [consolidationSince, setConsolidationSince] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 21);
    return d.toISOString().slice(0, 10);
  });
  const [consolidationPreview, setConsolidationPreview] = useState<MergedTestingSnapshot | null>(null);
  const [consolidationSaving, setConsolidationSaving] = useState(false);

  function handlePreviewConsolidation() {
    if (!currentAthlete) { toast.error("Sélectionnez un athlète"); return; }
    const merged = mergeTestingWeekSnapshots(currentAthlete.id, snapshots, consolidationSince);
    setConsolidationPreview(merged);
    if (Object.keys(merged.fields).length === 0) {
      toast.warning("Aucun résultat de test trouvé depuis cette date pour cet athlète.");
    }
  }

  async function handleConfirmConsolidation() {
    if (!currentAthlete || !consolidationPreview) return;
    setConsolidationSaving(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const payload = buildConsolidatedSnapshotPayload(consolidationPreview, todayISO);
      const created = await addSnapshot(payload);
      if (!created) { toast.error("Échec de la création du snapshot consolidé"); return; }
      const activated = await setActiveSnapshot(currentAthlete.id, created.id);
      if (!activated) {
        toast.warning("Snapshot consolidé créé, mais échec de son activation — activez-le manuellement.");
      } else {
        toast.success("Snapshot complet créé et activé ✅");
      }
      setConsolidationPreview(null);
    } finally {
      setConsolidationSaving(false);
    }
  }

  // --- Sonde diagnostic Nolio (read-only) — séances réalisées ---
  const [probeResult, setProbeResult] = useState<string | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);

  async function handleRunNolioProbe() {
    if (!currentAthlete) { toast.error("Sélectionnez un athlète"); return; }
    if (!nolioId) { toast.error("Cet athlète n'est pas lié à un compte Nolio"); return; }
    setProbeLoading(true);
    setProbeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("nolio-training-probe", {
        body: { nolio_athlete_id: nolioId, limit: 5 },
      });
      if (error) throw error;
      setProbeResult(JSON.stringify(data, null, 2));
    } catch (e) {
      const context = (e as { context?: Response }).context;
      let detail = (e as Error).message ?? "inconnue";
      if (context) {
        try {
          const body = await context.clone().json();
          detail = body?.error ?? JSON.stringify(body);
          setProbeResult(JSON.stringify(body, null, 2));
        } catch {
          // corps non-JSON, on garde le message générique
        }
      }
      toast.error(`Erreur sonde Nolio : ${detail}`);
    } finally {
      setProbeLoading(false);
    }
  }

  async function handleCopyProbeResult() {
    if (!probeResult) return;
    try {
      await navigator.clipboard.writeText(probeResult);
      toast.success("Copié dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier automatiquement — sélectionnez le texte manuellement");
    }
  }

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);


  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header - compact on mobile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Diagnostic</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Analyses physiologiques & protocoles</p>
          </div>
        </div>

        {/* Section Cards - single column on mobile */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className="group cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => navigate(section.route)}
              >
                <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
                  <div className="flex items-center sm:items-start justify-between">
                    <div className="flex items-center gap-2.5 sm:block">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${section.color}`} />
                      </div>
                      <CardTitle className="text-sm sm:text-base sm:mt-3">{section.title}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Export dossier complet PDF (page de garde + fiches + synthèse) */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderDown className="h-5 w-5 text-primary" />
              📁 Exporter le dossier complet PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Génère un seul document imprimable avec page de garde, fiches de tests papier et synthèse finale.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="dossier-athlete" className="text-xs">Nom de l'athlète</Label>
                <Input
                  id="dossier-athlete"
                  value={dossierAthleteName}
                  onChange={(e) => setDossierAthleteName(e.target.value)}
                  placeholder="Nom Prénom"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dossier-sport" className="text-xs">Sport principal</Label>
                <select
                  id="dossier-sport"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={dossierSport}
                  onChange={(e) => setDossierSport(e.target.value as DossierSport)}
                >
                  <option value="triathlon">Triathlon</option>
                  <option value="course">Course à pied</option>
                  <option value="cyclisme">Cyclisme</option>
                </select>
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                openFullDiagnosticDossierPrint(
                  dossierAthleteName.trim() || undefined,
                  dossierSport,
                )
              }
            >
              <FolderDown className="h-4 w-4 mr-2" />
              Générer le dossier complet
            </Button>
            <p className="text-[10px] text-muted-foreground italic">
              S'ouvre dans un nouvel onglet — utilisez Ctrl+P (Cmd+P) puis "Enregistrer en PDF".
            </p>
          </CardContent>
        </Card>

        {/* Export semaine de test officielle PDF (mêmes tests/données que TFCLTestingWeekPage/CAPTestingWeekPage) */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderDown className="h-5 w-5 text-primary" />
              🧪 Exporter la semaine de test officielle (protocole complet)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Version papier du protocole officiel (9 jours vélo D-1 à D8, 9 jours course D-1 à D8) exactement utilisé par "Semaine de Test TFCL" et "Semaine de Test CAP" — mêmes tests, mêmes données à enregistrer que dans l'app, pour remplir le snapshot précisément.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="testing-week-athlete" className="text-xs">Nom de l'athlète</Label>
                <Input
                  id="testing-week-athlete"
                  value={dossierAthleteName}
                  onChange={(e) => setDossierAthleteName(e.target.value)}
                  placeholder="Nom Prénom"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="testing-week-sport" className="text-xs">Sport</Label>
                <select
                  id="testing-week-sport"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={testingWeekSport}
                  onChange={(e) => setTestingWeekSport(e.target.value as TestingWeekSport)}
                >
                  <option value="triathlon">Triathlon (vélo + course)</option>
                  <option value="triathlon-compact">Triathlon compact — 18 jours (+ natation)</option>
                  <option value="run">Course à pied seule</option>
                  <option value="bike">Vélo seul</option>
                </select>
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                openTestingWeekDossierPrint(
                  testingWeekSport,
                  dossierAthleteName.trim() || undefined,
                )
              }
            >
              <FolderDown className="h-4 w-4 mr-2" />
              Générer la semaine de test
            </Button>
            <p className="text-[10px] text-muted-foreground italic">
              S'ouvre dans un nouvel onglet — utilisez Ctrl+P (Cmd+P) puis "Enregistrer en PDF".
            </p>

            {testingWeekSport === "triathlon-compact" && (
              <div className="mt-3 space-y-2 rounded-md border border-primary/30 bg-background/60 p-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Envoie les 18 jours du calendrier compact (vélo + course + natation) dans le calendrier Nolio de <strong>{currentAthlete?.name ?? "l'athlète sélectionné"}</strong>, un par un, comme un plan classique. Aucune cible chiffrée (FTP/VMA/CSS pas encore connues) — chaque séance porte le protocole complet en description, à suivre au chronomètre.
                </p>
                <div className="grid gap-3 sm:grid-cols-3 items-end">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="nolio-day1-date" className="text-xs">Date du Jour 1</Label>
                    <Input
                      id="nolio-day1-date"
                      type="date"
                      value={nolioDay1Date}
                      onChange={(e) => setNolioDay1Date(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={!currentAthlete || !nolioId || nolioSending}
                    onClick={handleSendTestingWeekToNolio}
                  >
                    {nolioSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Envoyer vers Nolio
                  </Button>
                </div>
                {!currentAthlete && (
                  <p className="text-[10px] text-destructive">Sélectionnez un athlète pour activer l'envoi.</p>
                )}
                {currentAthlete && !nolioId && (
                  <p className="text-[10px] text-destructive">Cet athlète n'est pas lié à un compte Nolio.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consolidation de la semaine de test en un snapshot unique */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              🧬 Consolider la semaine de test en un snapshot complet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Les tests vélo (semaine TFCL), course (semaine CAP) et natation (Pool Day) enregistrent leurs résultats séparément et peuvent finir éparpillés sur plusieurs profils selon l'ordre des tests. Cette action relit tous les résultats de l'athlète depuis une date de départ, retient la valeur la plus récente pour chaque mesure, puis crée <strong>un seul</strong> nouveau profil consolidé — activé automatiquement.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 items-end">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="consolidation-since" className="text-xs">Résultats depuis le</Label>
                <Input
                  id="consolidation-since"
                  type="date"
                  value={consolidationSince}
                  onChange={(e) => { setConsolidationSince(e.target.value); setConsolidationPreview(null); }}
                />
              </div>
              <Button
                variant="outline"
                disabled={!currentAthlete}
                onClick={handlePreviewConsolidation}
              >
                Aperçu
              </Button>
            </div>
            {!currentAthlete && (
              <p className="text-[10px] text-destructive">Sélectionnez un athlète pour prévisualiser.</p>
            )}

            {consolidationPreview && (
              <div className="space-y-3 rounded-md border border-primary/30 bg-background/60 p-3">
                {Object.keys(consolidationPreview.fields).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun résultat trouvé depuis cette date.</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(consolidationPreview.fields).length} mesure(s) retenue(s), depuis {consolidationPreview.contributingSnapshots.length} profil(s) source(s).
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="pr-2 py-1">Mesure</th>
                            <th className="pr-2 py-1">Valeur retenue</th>
                            <th className="py-1">Origine</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TESTING_FIELDS.filter((f) => f in consolidationPreview.fields).map((field) => (
                            <tr key={field} className="border-t border-border/40">
                              <td className="pr-2 py-1">{TESTING_FIELD_LABELS[field]}</td>
                              <td className="pr-2 py-1 font-medium tabular-nums">
                                {String(consolidationPreview.fields[field])}
                              </td>
                              <td className="py-1 text-muted-foreground">
                                {consolidationPreview.fieldOrigins[field]?.date} · {consolidationPreview.fieldOrigins[field]?.source}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={consolidationSaving}
                      onClick={handleConfirmConsolidation}
                    >
                      {consolidationSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                      Valider et créer le snapshot complet
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sonde diagnostic Nolio (temporaire) — inspecte le JSON brut des séances réalisées */}
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FlaskConical className="h-5 w-5 text-primary" />
              🔬 Sonde diagnostic Nolio (temporaire)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Lit les 5 dernières séances <strong>réalisées</strong> sur Nolio pour <strong>{currentAthlete?.name ?? "l'athlète sélectionné"}</strong> et affiche le JSON brut, sans rien écrire en base. Sert à vérifier ce que Nolio renvoie vraiment (puissance/allure/FC détaillées ? <code>id_partner</code> ré-émis ?) avant de décider si un pull-back automatique vers le snapshot est possible.
            </p>
            <Button
              variant="outline"
              disabled={!currentAthlete || !nolioId || probeLoading}
              onClick={handleRunNolioProbe}
            >
              {probeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
              Sonder Nolio
            </Button>
            {!currentAthlete && (
              <p className="text-[10px] text-destructive">Sélectionnez un athlète pour lancer la sonde.</p>
            )}
            {currentAthlete && !nolioId && (
              <p className="text-[10px] text-destructive">Cet athlète n'est pas lié à un compte Nolio.</p>
            )}
            {probeResult && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={handleCopyProbeResult}>
                    Copier le JSON
                  </Button>
                </div>
                <pre className="max-h-96 overflow-auto rounded-md border border-border/40 bg-background/60 p-3 text-[10px] leading-snug whitespace-pre-wrap break-all">
                  {probeResult}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rapport d'audit scientifique signé (toutes traces consolidées) */}
        <ScientificAuditReportButton />

        {/* Audit de cohérence des profils athlètes */}
        <AuditAthletesPanel />

        {/* Référence externe de validation MLSS bike (Poffé 2024, N=29, r=0.99) */}
        <InscydPoffe2024ValidationCard />

        {/* Info - compact on mobile */}
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Les résultats alimentent le <span className="font-medium text-foreground">TFCL Coaching Compass™</span> et les décisions coaching.
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
