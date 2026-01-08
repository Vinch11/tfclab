/**
 * Templates de Programmation Page
 * Displays training templates with optional staff annotations
 * Supports multi-section documents (e.g., Finisher vs Elite plans)
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronLeft, FileText, AlertTriangle, Copy, CheckCircle2, Loader2, User, Layers, Lightbulb, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { PROGRAM_TEMPLATES, getTemplateById } from "@/data/programTemplates";
import { 
  loadProgramTemplateFromDocx, 
  loadProgramSectionsFromDocx,
  clearTemplateCache,
  type TemplateWeek, 
  type TemplateSession,
  type ProgramSection 
} from "@/lib/templates/docxTemplateLoader";
import { 
  generateTemplateAnnotations, 
  getSeverityColor, 
  getSeverityLabel,
  type TemplateAnnotation,
  type AnnotationParams 
} from "@/lib/templates/templateAnnotationEngine";

import { useCloudData, DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif } from "@/lib/raceReadinessEffectif";

function getSportBadgeColor(sport: string | undefined): string {
  if (!sport) return "bg-muted text-muted-foreground";
  const lower = sport.toLowerCase();
  if (lower.includes("natation") || lower.includes("swim") || lower.includes("piscine")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (lower.includes("vélo") || lower.includes("velo") || lower.includes("bike")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (lower.includes("cap") || lower.includes("course") || lower.includes("run") || lower.includes("c.a.p")) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (lower.includes("repos") || lower.includes("off") || lower.includes("mobilité") || lower.includes("soins") || lower.includes("social") || lower.includes("plaisir") || lower.includes("bilan")) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
  if (lower.includes("brick") || lower.includes("vélo + cap") || lower.includes("vélo + run") || lower.includes("activ")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }
  if (lower.includes("ironman") || lower.includes("marche")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-muted text-muted-foreground";
}

// Parse duration from session description (e.g., "1h30", "45'", "2h00")
function parseDurationMinutes(text: string): number {
  if (!text) return 0;
  
  // Match patterns like "1h30", "1h", "45'", "2h00", "1h15 HT"
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const minutes = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return hours * 60 + minutes;
  }
  
  // Match patterns like "45'", "30'"
  const minOnlyMatch = text.match(/(\d+)['′]/);
  if (minOnlyMatch) {
    return parseInt(minOnlyMatch[1], 10);
  }
  
  return 0;
}

// Calculate weekly volume by discipline
function calculateWeeklyVolume(sessions: TemplateSession[]): { swim: number; bike: number; run: number; other: number } {
  let swim = 0;
  let bike = 0;
  let run = 0;
  let other = 0;

  sessions.forEach((session) => {
    const discipline = (session.discipline || session.sport || "").toLowerCase();
    const description = session.details || session.description || "";
    const duration = parseDurationMinutes(description);

    if (discipline.includes("natation") || discipline.includes("swim") || discipline.includes("piscine")) {
      swim += duration;
    } else if (discipline.includes("vélo") || discipline.includes("velo") || discipline.includes("bike")) {
      bike += duration;
    } else if (discipline.includes("c.a.p") || discipline.includes("cap") || discipline.includes("course") || discipline.includes("run")) {
      run += duration;
    } else if (discipline.includes("vélo + cap") || discipline.includes("vélo + run") || discipline.includes("brick")) {
      // Parse brick sessions - try to split or estimate
      const parts = description.split("+");
      if (parts.length >= 2) {
        bike += parseDurationMinutes(parts[0]);
        run += parseDurationMinutes(parts[1]);
      } else {
        // Estimate 70/30 split for brick
        bike += Math.round(duration * 0.7);
        run += Math.round(duration * 0.3);
      }
    } else if (!discipline.includes("repos") && !discipline.includes("off") && duration > 0) {
      other += duration;
    }
  });

  return { swim, bike, run, other };
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}


function getPhaseForWeek(weekNumber: number, totalWeeks: number): { name: string; color: string } {
  const ratio = weekNumber / totalWeeks;
  
  // Last 2 weeks = Taper
  if (weekNumber > totalWeeks - 2) {
    return { name: "Affûtage", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  }
  
  // First 30% = Préparation (base building)
  if (ratio <= 0.3) {
    return { name: "Préparation", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
  }
  
  // 30-70% = Build
  if (ratio <= 0.7) {
    return { name: "Build", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
  }
  
  // 70-90% = Spécifique
  return { name: "Spécifique", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" };
}

function SessionCard({ session }: { session: TemplateSession }) {
  const [expanded, setExpanded] = useState(false);

  const displayDetails = session.details || session.description || "";
  const displayNotes = session.notes || "";

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-start gap-2">
        <Badge className={`shrink-0 text-xs ${getSportBadgeColor(session.discipline || session.sport)}`}>
          {session.discipline || session.sport || "—"}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{session.day}</span>
            {session.title && (
              <span className="text-sm text-muted-foreground">• {session.title}</span>
            )}
          </div>
          {displayDetails && (
            <>
              {displayDetails.length > 80 ? (
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground">
                    {expanded ? displayDetails : displayDetails.slice(0, 80) + "..."}
                  </p>
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    {expanded ? "Réduire" : "Voir détails"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">{displayDetails}</p>
              )}
            </>
          )}
          {displayNotes && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
              💡 {displayNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CoachAdviceCard({ advice }: { advice: string }) {
  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200 mb-2">
              Conseils du Coach
            </p>
            <div className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">
              {advice}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeekVolumeBar({ volume }: { volume: { swim: number; bike: number; run: number; other: number } }) {
  const total = volume.swim + volume.bike + volume.run + volume.other;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {volume.swim > 0 && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          🏊 {formatDuration(volume.swim)}
        </span>
      )}
      {volume.bike > 0 && (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          🚴 {formatDuration(volume.bike)}
        </span>
      )}
      {volume.run > 0 && (
        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
          🏃 {formatDuration(volume.run)}
        </span>
      )}
      <span className="text-muted-foreground ml-1">
        = {formatDuration(total)}
      </span>
    </div>
  );
}

function WeekSection({ week, annotations, totalWeeks }: { week: TemplateWeek; annotations: TemplateAnnotation[]; totalWeeks: number }) {
  const weekAnnotations = annotations.filter((a) => a.weekNumber === week.weekNumber || a.weekNumber === 0);
  const phase = week.phase || getPhaseForWeek(week.weekNumber, totalWeeks).name;
  const phaseStyle = week.phase ? "bg-muted text-muted-foreground" : getPhaseForWeek(week.weekNumber, totalWeeks).color;
  const volume = calculateWeeklyVolume(week.sessions);

  return (
    <AccordionItem value={`week-${week.weekNumber}`} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-col items-start gap-2 w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold">Semaine {week.weekNumber}</span>
            {week.theme && (
              <span className="text-sm text-muted-foreground">— {week.theme}</span>
            )}
            <Badge className={`text-xs ${phaseStyle}`}>
              {phase}
            </Badge>
            {week.coachAdvice && (
              <Lightbulb className="h-4 w-4 text-amber-500" />
            )}
            {weekAnnotations.some((a) => a.severity >= 2) && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <WeekVolumeBar volume={volume} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pt-2 pb-4">
          {week.sessions.map((session, idx) => (
            <SessionCard key={idx} session={session} />
          ))}
          
          {/* Coach Advice Card */}
          {week.coachAdvice && (
            <CoachAdviceCard advice={week.coachAdvice} />
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AnnotationsPanel({ annotations }: { annotations: TemplateAnnotation[] }) {
  if (annotations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span>Aucune alerte détectée pour ce template.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((annotation, idx) => (
        <Card key={idx} className={`border-l-4 ${annotation.severity >= 2 ? "border-l-amber-500" : "border-l-blue-500"}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Badge className={`shrink-0 text-xs ${getSeverityColor(annotation.severity)}`}>
                {getSeverityLabel(annotation.severity)}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{annotation.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{annotation.message}</p>
                <p className="text-xs text-muted-foreground/70 mt-2 italic">{annotation.why}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AthleteContextPanel({
  athlete,
  snapshot,
  vlamaxValue,
  tteValue,
  readinessScore,
}: {
  athlete: DbAthlete;
  snapshot: DbSnapshot | null;
  vlamaxValue: number | null;
  tteValue: number | null;
  readinessScore: number | null;
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{athlete.name}</span>
          <Badge variant="outline" className="text-xs ml-auto">
            {athlete.goal || "IM"}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">VLamax</p>
            <p className="font-mono text-sm font-semibold">
              {vlamaxValue != null ? vlamaxValue.toFixed(2) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">TTE</p>
            <p className="font-mono text-sm font-semibold">
              {tteValue != null ? `${tteValue.toFixed(0)}'` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Readiness</p>
            <p className="font-mono text-sm font-semibold">
              {readinessScore != null ? `${readinessScore.toFixed(0)}%` : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { athletes, snapshots, loading: cloudLoading } = useCloudData();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(PROGRAM_TEMPLATES[0]?.id || "");
  const [weeks, setWeeks] = useState<TemplateWeek[]>([]);
  const [sections, setSections] = useState<ProgramSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [staffMode, setStaffMode] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId]
  );

  // Persist selected athlete
  useEffect(() => {
    const saved = localStorage.getItem("vlab-selected-athlete");
    if (saved && athletes.some((a) => a.id === saved)) {
      setSelectedAthleteId(saved);
    } else if (athletes.length > 0) {
      setSelectedAthleteId(athletes[0].id);
    }
  }, [athletes]);

  // Persist selected section per template
  useEffect(() => {
    if (selectedTemplate && sections.length > 0) {
      const cacheKey = `selectedSection_${selectedTemplate.docxPath}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved && sections.some((s) => s.sectionId === saved)) {
        setSelectedSectionId(saved);
      } else {
        setSelectedSectionId(sections[0].sectionId);
      }
    }
  }, [selectedTemplate, sections]);

  // Save selected section to localStorage
  useEffect(() => {
    if (selectedTemplate && selectedSectionId) {
      const cacheKey = `selectedSection_${selectedTemplate.docxPath}`;
      localStorage.setItem(cacheKey, selectedSectionId);
    }
  }, [selectedTemplate, selectedSectionId]);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );

  const selectedSnapshot = useMemo(() => {
    if (!selectedAthlete) return null;
    const athleteSnapshots = snapshots.filter((s) => s.athlete_id === selectedAthlete.id);
    if (selectedAthlete.active_snapshot_id) {
      return athleteSnapshots.find((s) => s.id === selectedAthlete.active_snapshot_id) || athleteSnapshots[0] || null;
    }
    return athleteSnapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [selectedAthlete, snapshots]);

  // Get weeks to display (from selected section or flat weeks)
  const displayedWeeks = useMemo(() => {
    if (sections.length > 1 && selectedSectionId) {
      const section = sections.find((s) => s.sectionId === selectedSectionId);
      return section?.weeks || [];
    }
    return weeks;
  }, [sections, selectedSectionId, weeks]);

  // Get briefing from current section
  const currentBriefing = useMemo(() => {
    if (sections.length > 0) {
      if (selectedSectionId) {
        const section = sections.find((s) => s.sectionId === selectedSectionId);
        return section?.briefing || null;
      }
      return sections[0]?.briefing || null;
    }
    return null;
  }, [sections, selectedSectionId]);

  // Compute athlete metrics
  const athleteMetrics = useMemo(() => {
    if (!selectedAthlete || !selectedSnapshot) {
      return { vlamaxValue: null, tteValue: null, readinessScore: null, params: null };
    }

    // VLamax effectif
    const vlamaxEffectif = computeVLamaxEffectif({
      athleteId: selectedAthlete.id,
      objectif: selectedAthlete.goal || "IM",
      activeSnapshotId: selectedAthlete.active_snapshot_id,
      tests: [],
      snapshots: [selectedSnapshot],
    });

    // TTE effectif
    const tteEffectif = computeTTEEffectif({
      ftp: selectedSnapshot.ftp,
      tss_7d: selectedSnapshot.tss_7d,
      tte_mode: selectedSnapshot.tte_mode,
      tte_observed_min: selectedSnapshot.tte_observed_min,
      objectif: selectedAthlete.goal || "IM",
    });

    // Race Readiness effectif
    const readinessEffectif = computeRaceReadinessEffectif({
      objectif: selectedAthlete.goal || "IM",
      vlamaxEffectif,
      tteEffectif,
      ftp: selectedSnapshot.ftp,
      poids: selectedSnapshot.weight_kg,
    });

    const params: AnnotationParams = {
      athleteGoal: (selectedAthlete.goal as any) || "IM",
      vlamaxEffectif: vlamaxEffectif.value != null
        ? { value: vlamaxEffectif.value, source: vlamaxEffectif.source, confidence: vlamaxEffectif.confidence }
        : null,
      tteEffectif: tteEffectif.tte_min != null
        ? { value: tteEffectif.tte_min, source: tteEffectif.source, confidence: tteEffectif.confidence }
        : null,
      raceReadiness: { score: readinessEffectif.score, details: readinessEffectif.details as any },
      tss7d: selectedSnapshot.tss_7d,
    };

    return {
      vlamaxValue: vlamaxEffectif.value,
      tteValue: tteEffectif.tte_min,
      readinessScore: readinessEffectif.score,
      params,
    };
  }, [selectedAthlete, selectedSnapshot]);

  // Generate annotations
  const annotations = useMemo(() => {
    if (!staffMode || !athleteMetrics.params) return [];
    return generateTemplateAnnotations(athleteMetrics.params);
  }, [staffMode, athleteMetrics.params]);

  const handleLoadTemplate = async () => {
    const template = getTemplateById(selectedTemplateId);
    if (!template) {
      toast.error("Template introuvable");
      return;
    }

    setIsLoading(true);
    setSections([]);
    setWeeks([]);
    setSelectedSectionId(null);

    try {
      // Handle static templates (pre-loaded data)
      if (template.source === "static" && template.weeks.length > 0) {
        setWeeks(template.weeks);
        setSections([{
          sectionId: "section-1",
          sectionTitle: "Plan principal",
          weeks: template.weeks,
        }]);
        setIsLoaded(true);
        toast.success(`Template chargé: ${template.weeks.length} semaines`);
      } else if (template.multiSections) {
        // Load with multi-section support
        const loadedSections = await loadProgramSectionsFromDocx(template.docxPath);
        setSections(loadedSections);
        
        // Flatten for fallback
        const allWeeks = loadedSections.flatMap((s) => s.weeks);
        setWeeks(allWeeks);
        
        if (loadedSections.length > 0) {
          setSelectedSectionId(loadedSections[0].sectionId);
        }
        
        setIsLoaded(true);
        toast.success(`Template chargé: ${loadedSections.length} plan(s), ${allWeeks.length} semaines`);
      } else {
        // Load as single section (legacy mode)
        const loadedWeeks = await loadProgramTemplateFromDocx(template.docxPath);
        setWeeks(loadedWeeks);
        setSections([{
          sectionId: "section-1",
          sectionTitle: "Plan principal",
          weeks: loadedWeeks,
        }]);
        setIsLoaded(true);
        toast.success(`Template chargé: ${loadedWeeks.length} semaines`);
      }
    } catch (err) {
      console.error("Error loading template:", err);
      toast.error("Erreur lors du chargement du template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyWeek = (week: TemplateWeek) => {
    const text = `Semaine ${week.weekNumber}\n\n` + 
      week.sessions.map((s) => `${s.day} - ${s.sport} - ${s.title}\n${s.details}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Semaine copiée !");
  };

  const handleCopyAll = () => {
    const weeksToExport = displayedWeeks;
    const sectionTitle = sections.length > 1 
      ? sections.find((s) => s.sectionId === selectedSectionId)?.sectionTitle || "Plan"
      : "Plan";
    
    const text = `=== ${sectionTitle} ===\n\n` + weeksToExport.map((week) => 
      `=== Semaine ${week.weekNumber} ===\n\n` + 
      week.sessions.map((s) => `${s.day} - ${s.sport} - ${s.title}\n${s.details}`).join("\n\n")
    ).join("\n\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Plan copié !");
  };

  const handleClearCache = () => {
    clearTemplateCache();
    setWeeks([]);
    setSections([]);
    setSelectedSectionId(null);
    setIsLoaded(false);
    toast.success("Cache vidé");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Templates de Programmation</h1>
              <p className="text-xs text-muted-foreground">Plans staff-grade</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Template Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sélectionner un template prédéfini
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select 
              value={selectedTemplateId} 
              onValueChange={(v) => {
                setSelectedTemplateId(v);
                setIsLoaded(false);
                setWeeks([]);
                setSections([]);
                setSelectedSectionId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un template" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.target})
                    {t.multiSections && " 📑"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleLoadTemplate} disabled={isLoading || !selectedTemplateId}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Charger le template
              </Button>
              {isLoaded && (
                <>
                  <Button variant="outline" onClick={handleCopyAll}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier tout
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearCache}>
                    Vider le cache
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section Selection (if multi-section) */}
        {isLoaded && sections.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Choisir un plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSectionId || ""} onValueChange={setSelectedSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un plan" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.sectionId} value={s.sectionId}>
                      {s.sectionTitle} ({s.weeks.length} semaines)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Staff Mode + Athlete Selection */}
        {isLoaded && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="staff-mode" checked={staffMode} onCheckedChange={setStaffMode} />
                  <Label htmlFor="staff-mode" className="text-sm">Mode Staff (Annotations)</Label>
                </div>
              </div>

              {staffMode && athletes.length > 0 && (
                <div className="space-y-3">
                  <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un athlète" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.goal || "IM"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAthlete && selectedSnapshot && (
                    <AthleteContextPanel
                      athlete={selectedAthlete}
                      snapshot={selectedSnapshot}
                      vlamaxValue={athleteMetrics.vlamaxValue}
                      tteValue={athleteMetrics.tteValue}
                      readinessScore={athleteMetrics.readinessScore}
                    />
                  )}
                </div>
              )}

              {staffMode && !athletes.length && (
                <p className="text-sm text-muted-foreground">Aucun athlète disponible pour les annotations.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Annotations Panel */}
        {isLoaded && staffMode && selectedAthlete && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Annotations Staff</h3>
            <AnnotationsPanel annotations={annotations} />
          </div>
        )}

        {/* Briefing Card */}
        {isLoaded && currentBriefing && (
          <Card className="border-l-4 border-l-primary bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Briefing du Programme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {currentBriefing}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weeks Accordion */}
        {isLoaded && displayedWeeks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {sections.length > 1 && selectedSectionId 
                  ? sections.find((s) => s.sectionId === selectedSectionId)?.sectionTitle 
                  : `${displayedWeeks.length} semaines`}
              </h3>
              {sections.length <= 1 && (
                <Badge variant="outline" className="text-xs">
                  {displayedWeeks.length} semaines
                </Badge>
              )}
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              {displayedWeeks.map((week) => (
                <WeekSection key={week.weekNumber} week={week} annotations={annotations} totalWeeks={displayedWeeks.length} />
              ))}
            </Accordion>
          </div>
        )}

        {/* Empty state */}
        {!isLoaded && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Sélectionnez et chargez un template pour commencer.</p>
          </div>
        )}
      </main>
    </div>
  );
}
