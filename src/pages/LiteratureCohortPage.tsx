import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen, Sparkles, Trash2 } from "lucide-react";
import { LabAthleteValidator } from "@/components/calibration/LabAthleteValidator";
import { LiteratureSearchWidget } from "@/components/calibration/LiteratureSearchWidget";

type Version = {
  id: string;
  version: string;
  description: string | null;
  model: string;
  total_profiles: number;
  total_studies: number;
  created_at: string;
};

type Profile = {
  id: string;
  study_author: string;
  study_year: number | null;
  study_title: string | null;
  cohort_label: string | null;
  sport: string;
  sex: string | null;
  level: string | null;
  vo2max: number | null;
  ftp_w_kg: number | null;
  vlamax: number | null;
  mlss_pct: number | null;
  vma_kmh: number | null;
  running_economy: number | null;
};

export default function LiteratureCohortPage() {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [focus, setFocus] = useState("endurance général : cyclisme + course + triathlon, tous niveaux");
  const [targetCount, setTargetCount] = useState(30);
  const [model, setModel] = useState("google/gemini-2.5-pro");

  const loadVersions = async () => {
    const { data, error } = await supabase
      .from("literature_cohort_versions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setVersions(data || []);
    if (!selectedId && data && data.length > 0) setSelectedId(data[0].id);
  };

  const loadProfiles = async (versionId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("literature_cohort_profiles")
      .select("*")
      .eq("version_id", versionId)
      .order("study_year", { ascending: false });
    setLoading(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setProfiles((data as Profile[]) || []);
  };

  useEffect(() => { loadVersions(); }, []);
  useEffect(() => { if (selectedId) loadProfiles(selectedId); }, [selectedId]);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-literature-cohort", {
        body: { focus, targetCount, model },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Cohorte extraite",
        description: `${data.total_profiles} profils issus de ${data.total_studies} études (version ${data.version}).`,
      });
      await loadVersions();
      setSelectedId(data.version_id);
    } catch (e: any) {
      toast({ title: "Échec extraction", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette version ?")) return;
    const { error } = await supabase.from("literature_cohort_versions").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Version supprimée" });
    setSelectedId(null);
    await loadVersions();
  };

  const stats = useMemo(() => {
    if (profiles.length === 0) return null;
    const has = (k: keyof Profile) => profiles.filter((p) => p[k] != null).length;
    const mean = (k: keyof Profile) => {
      const vals = profiles.map((p) => p[k]).filter((v): v is number => typeof v === "number");
      return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    return {
      vo2max: { n: has("vo2max"), mean: mean("vo2max") },
      vlamax: { n: has("vlamax"), mean: mean("vlamax") },
      mlss: { n: has("mlss_pct"), mean: mean("mlss_pct") },
      ftpKg: { n: has("ftp_w_kg"), mean: mean("ftp_w_kg") },
      vma: { n: has("vma_kmh"), mean: mean("vma_kmh") },
      re: { n: has("running_economy"), mean: mean("running_economy") },
    };
  }, [profiles]);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Cohorte Littérature Scientifique</h1>
          <p className="text-sm text-muted-foreground">
            Extraction IA de cohortes de référence depuis la littérature publiée (Mader, Heck, Beneke, Skiba, Pallarés…)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Nouvelle extraction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Général", value: "endurance général : cyclisme + course + triathlon, tous niveaux", n: 30 },
              { label: "Run / CAP (combler trous)", value: "course à pied — VMA, vVO2max, économie de course (mlO2/kg/km), MLSS run, VLamax run, sprint anaérobie 6-30s, pace seuil", n: 40 },
              { label: "Bike anchors", value: "cyclisme — FTP, VLamax bike, MLSS, Pmax 5s, profil de puissance critique CP/W'", n: 30 },
              { label: "Triathlon LD", value: "triathlon longue distance — durabilité, FTP, VLamax bike, économie de course, fractional utilization", n: 30 },
            ].map((p) => (
              <Button key={p.label} variant="outline" size="sm" type="button"
                onClick={() => { setFocus(p.value); setTargetCount(p.n); }}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Focus thématique</Label>
              <Input value={focus} onChange={(e) => setFocus(e.target.value)} />
            </div>
            <div>
              <Label>Nombre cible (10-60)</Label>
              <Input
                type="number"
                min={10}
                max={60}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
              />
            </div>
            <div className="md:col-span-3">
              <Label>Modèle IA</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (recommandé, précision)</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (rapide, moins précis)</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (alternatif)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleExtract} disabled={extracting} className="w-full md:w-auto">
            {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {extracting ? "Extraction en cours (30-90 s)…" : "Lancer l'extraction"}
          </Button>
          <p className="text-xs text-muted-foreground">
            ⚠ L'IA extrait depuis sa connaissance des publications. Vérifiez les DOI avant tout usage formel.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Versions disponibles ({versions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune version. Lancez une extraction.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                    selectedId === v.id ? "bg-muted border-primary" : ""
                  }`}
                  onClick={() => setSelectedId(v.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{v.version}</Badge>
                      <Badge variant="secondary">{v.model.split("/")[1]}</Badge>
                      <span className="text-sm font-medium">{v.total_profiles} profils</span>
                      <span className="text-xs text-muted-foreground">{v.total_studies} études</span>
                    </div>
                    {v.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{v.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <>
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistiques agrégées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                  {[
                    { k: "VO2max", s: stats.vo2max, unit: "ml/kg/min", d: 1 },
                    { k: "VLamax", s: stats.vlamax, unit: "mmol/L/s", d: 2 },
                    { k: "MLSS%", s: stats.mlss, unit: "%FTP", d: 2 },
                    { k: "FTP/kg", s: stats.ftpKg, unit: "W/kg", d: 2 },
                    { k: "VMA", s: stats.vma, unit: "km/h", d: 1 },
                    { k: "RE", s: stats.re, unit: "ml/kg/km", d: 1 },
                  ].map(({ k, s, unit, d }) => (
                    <div key={k} className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">{k}</div>
                      <div className="font-semibold">
                        {s.mean != null ? s.mean.toFixed(d) : "—"} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">N={s.n}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profils ({profiles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Étude</TableHead>
                        <TableHead>Sport</TableHead>
                        <TableHead>Niveau</TableHead>
                        <TableHead className="text-right">VO2max</TableHead>
                        <TableHead className="text-right">FTP/kg</TableHead>
                        <TableHead className="text-right">VLamax</TableHead>
                        <TableHead className="text-right">MLSS%</TableHead>
                        <TableHead className="text-right">VMA</TableHead>
                        <TableHead className="text-right">RE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="text-xs font-medium">{p.study_author}{p.study_year ? ` (${p.study_year})` : ""}</div>
                            {p.cohort_label && <div className="text-xs text-muted-foreground">{p.cohort_label}</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline">{p.sport}</Badge></TableCell>
                          <TableCell className="text-xs">{p.level}{p.sex ? ` · ${p.sex}` : ""}</TableCell>
                          <TableCell className="text-right text-xs">{p.vo2max?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{p.ftp_w_kg?.toFixed(2) ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{p.vlamax?.toFixed(2) ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{p.mlss_pct ? (p.mlss_pct * 100).toFixed(0) + "%" : "—"}</TableCell>
                          <TableCell className="text-right text-xs">{p.vma_kmh?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right text-xs">{p.running_economy?.toFixed(1) ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <LiteratureSearchWidget />
          <LabAthleteValidator />
        </>
      )}
    </div>
  );
}
