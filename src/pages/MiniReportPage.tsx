import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { FileDown, Sparkles, ArrowLeft, Info, Calculator, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  computeMiniReport,
  parseTimeToSec,
  type MiniReportInput,
  type ReferenceRaceType,
  type Sex,
  type VocabularyMode,
} from "@/lib/miniReport/computeMiniProfile";
import { buildMiniReportHTML } from "@/lib/miniReport/buildMiniReportHTML";
import { openPrintableHTML } from "@/lib/openPrintableHTML";
import { toast } from "@/hooks/use-toast";

export default function MiniReportPage() {
  const [params] = useSearchParams();

  const [age, setAge] = useState<string>(params.get("age") || "");
  const [sex, setSex] = useState<Sex>((params.get("sex") as Sex) || "M");
  const [vma, setVma] = useState<string>(params.get("vma") || "");
  const [sprint, setSprint] = useState<string>(params.get("sprint") || "");
  const [refType, setRefType] = useState<ReferenceRaceType | "none">(
    (params.get("refType") as ReferenceRaceType) || "none"
  );
  const [refTime, setRefTime] = useState<string>(params.get("refTime") || "");
  const [athleteName, setAthleteName] = useState<string>(params.get("name") || "");
  const [sprintMode, setSprintMode] = useState<"direct" | "100m" | "150m">("direct");
  const [time100m, setTime100m] = useState<string>("");
  const [time150m, setTime150m] = useState<string>("");
  const [vocabularyMode, setVocabularyMode] = useState<VocabularyMode>("expert");

  const computedSprintFromTime = useMemo(() => {
    if (sprintMode === "100m") {
      const t = parseFloat(time100m);
      if (!isFinite(t) || t <= 0) return null;
      return Math.round((100 / t) * 15 * 0.96 * 10) / 10;
    }
    if (sprintMode === "150m") {
      const t = parseFloat(time150m);
      if (!isFinite(t) || t <= 0) return null;
      return Math.round((150 / t) * 15 * 0.94 * 10) / 10;
    }
    return null;
  }, [sprintMode, time100m, time150m]);

  const validation = useMemo(() => {
    const errs: Record<string, string> = {};
    const ageN = parseInt(age, 10);
    const vmaN = parseFloat(vma);
    const sprintN = parseInt(sprint, 10);

    if (!age || isNaN(ageN) || ageN < 12 || ageN > 90) errs.age = "Âge entre 12 et 90 ans";
    if (!vma || isNaN(vmaN) || vmaN < 8 || vmaN > 26) errs.vma = "VMA entre 8 et 26 km/h";
    if (!sprint || isNaN(sprintN) || sprintN < 40 || sprintN > 150) errs.sprint = "Sprint 15s entre 40 et 150 m";

    if (refType !== "none" && refTime) {
      const secs = parseTimeToSec(refTime);
      if (secs == null || secs < 60 * 30 || secs > 60 * 360) {
        errs.refTime = "Format hh:mm:ss ou mm:ss (entre 30 min et 6h)";
      }
    }

    return errs;
  }, [age, vma, sprint, refType, refTime]);

  const isValid = Object.keys(validation).length === 0 && age && vma && sprint;

  function handleGenerate() {
    if (!isValid) {
      toast({ title: "Champs invalides", description: "Vérifie les valeurs saisies.", variant: "destructive" });
      return;
    }

    const input: MiniReportInput = {
      age: parseInt(age, 10),
      sex,
      vmaKmh: parseFloat(vma),
      sprint15sM: parseInt(sprint, 10),
      referenceTimeSec: refType !== "none" && refTime ? parseTimeToSec(refTime) : null,
      referenceRaceType: refType !== "none" ? refType as ReferenceRaceType : null,
      athleteName: athleteName.trim() || null,
      vocabularyMode,
    };

    const result = computeMiniReport(input);
    const html = buildMiniReportHTML(result);
    openPrintableHTML(html, {
      filenameHint: athleteName ? `Mini Rapport - ${athleteName}` : "Mini Rapport Athlète",
      autoPrint: false,
    });
    toast({ title: "Rapport généré", description: "Utilisez Ctrl+P / Cmd+P pour l'enregistrer en PDF." });
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Mini Rapport Athlète</h1>
          </div>
          <p className="text-muted-foreground">
            Profil physiologique simplifié à partir de 4 paramètres terrain. Génère un PDF imprimable
            avec ton type métabolique, tes pistes de travail prioritaires et tes zones Z1-Z7.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tes données</CardTitle>
            <CardDescription>
              4 champs obligatoires + 1 temps de référence facultatif pour affiner l'estimation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="name">Nom (optionnel)</Label>
              <Input
                id="name"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                placeholder="Pour personnaliser le rapport"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Âge *</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="ex: 35"
                  className="mt-1"
                />
                {validation.age && <p className="text-xs text-destructive mt-1">{validation.age}</p>}
              </div>
              <div>
                <Label>Sexe *</Label>
                <RadioGroup value={sex} onValueChange={(v) => setSex(v as Sex)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="M" id="sex-m" />
                    <Label htmlFor="sex-m" className="cursor-pointer font-normal">Homme</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="F" id="sex-f" />
                    <Label htmlFor="sex-f" className="cursor-pointer font-normal">Femme</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vma">VMA (km/h) *</Label>
                <Input
                  id="vma"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={vma}
                  onChange={(e) => setVma(e.target.value)}
                  placeholder="ex: 16.5"
                  className="mt-1"
                />
                {validation.vma && <p className="text-xs text-destructive mt-1">{validation.vma}</p>}
              </div>
              <div>
                <Label htmlFor="sprint">Sprint 15s (mètres) *</Label>
                <Input
                  id="sprint"
                  type="number"
                  inputMode="numeric"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                  placeholder="ex: 95"
                  className="mt-1"
                  disabled={sprintMode !== "direct"}
                />
                {validation.sprint && <p className="text-xs text-destructive mt-1">{validation.sprint}</p>}
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Méthode de mesure du sprint</Label>
                <Badge variant="outline" className="text-xs">Alternative chronométrée</Badge>
              </div>

              <Tabs value={sprintMode} onValueChange={(v) => setSprintMode(v as "direct" | "100m" | "150m")} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="direct" className="text-xs">Distance 15s</TabsTrigger>
                  <TabsTrigger value="100m" className="text-xs">Temps 100m</TabsTrigger>
                  <TabsTrigger value="150m" className="text-xs">Temps 150m</TabsTrigger>
                </TabsList>

                <TabsContent value="direct" className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Saisis directement la distance maximale parcourue en 15 secondes (départ arrêté, à plat).
                  </p>
                </TabsContent>

                <TabsContent value="100m" className="mt-2 space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Temps maximal sur 100m (sec)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="ex: 14.5"
                        value={time100m}
                        onChange={(e) => setTime100m(e.target.value)}
                        className="mt-1 h-9"
                      />
                    </div>
                    {computedSprintFromTime !== null && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9"
                        onClick={() => setSprint(String(Math.round(computedSprintFromTime)))}
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                        Appliquer {computedSprintFromTime} m
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Conversion : (100 / temps) × 15 × 0.96 (correction décélération)
                  </p>
                </TabsContent>

                <TabsContent value="150m" className="mt-2 space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Temps maximal sur 150m (sec)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="ex: 22.0"
                        value={time150m}
                        onChange={(e) => setTime150m(e.target.value)}
                        className="mt-1 h-9"
                      />
                    </div>
                    {computedSprintFromTime !== null && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9"
                        onClick={() => setSprint(String(Math.round(computedSprintFromTime)))}
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                        Appliquer {computedSprintFromTime} m
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Conversion : (150 / temps) × 15 × 0.94 (correction décélération)
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Sprint 15s</strong> : distance maximale parcourue en 15 secondes départ arrêté
                (course à pied, à plat). Comme dans la semaine de tests CAP TFCL, tu peux aussi
                chronométrer un 100m ou 150m maximal — la distance équivalente sera estimée automatiquement.
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label>Temps de référence (optionnel)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Améliore la précision de l'allure au seuil estimée.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select value={refType} onValueChange={(v) => setRefType(v as ReferenceRaceType | "none")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    <SelectItem value="semi">Semi-marathon (21.1 km)</SelectItem>
                    <SelectItem value="20k">20 km</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Input
                    value={refTime}
                    onChange={(e) => setRefTime(e.target.value)}
                    placeholder="hh:mm:ss ou mm:ss"
                    disabled={refType === "none"}
                  />
                  {validation.refTime && <p className="text-xs text-destructive mt-1">{validation.refTime}</p>}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
              <Switch
                id="vocab-toggle"
                checked={vocabularyMode === "beginner"}
                onCheckedChange={(checked) => setVocabularyMode(checked ? "beginner" : "expert")}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="vocab-toggle" className="cursor-pointer text-sm font-medium">
                  Mode débutant — vocabulaire ultra-pédagogique
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {vocabularyMode === "beginner"
                    ? "✓ Le rapport utilisera des analogies simples (« moteur diesel », « brûlure des jambes »), un mini-lexique et zéro jargon technique."
                    : "Active ce mode si tu débutes ou si tu veux partager le rapport avec un athlète qui n'est pas familier avec les termes physiologiques (VLamax, MLSS, glycolyse…)."}
                </p>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!isValid}
              className="w-full"
              size="lg"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Générer le rapport PDF
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Le rapport s'ouvre dans un nouvel onglet. Utilise ensuite <kbd className="px-1.5 py-0.5 rounded border bg-muted">Ctrl+P</kbd> ou <kbd className="px-1.5 py-0.5 rounded border bg-muted">Cmd+P</kbd> pour enregistrer en PDF.
        </p>
      </div>
    </div>
  );
}
