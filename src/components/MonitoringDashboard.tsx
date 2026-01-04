// =============================================
// COMPOSANT SUIVI LONGITUDINAL & ALERTES
// =============================================

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle, Activity, Calendar, Pencil, Zap } from "lucide-react";
import { Athlete } from "@/types/athlete";
import { Alert } from "@/types/monitoring";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData } from "@/hooks/useCloudData";
import { toast } from "sonner";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import {
  getVLamaxTestsOnly,
  getRefStatus,
  detectOutliers,
  aggregateMonthlyVLamax,
  computeTrend,
  computeAlerts,
  computeBlockRecommendation,
  getAlertColor,
  getTrendColor
} from "@/lib/monitoring";

interface MonitoringDashboardProps {
  athlete: Athlete;
  // ✅ VLamax et TTE effectifs (source unique de vérité)
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
}

export function MonitoringDashboard({ athlete, vlamaxEffectif, tteEffectif }: MonitoringDashboardProps) {
  const { updateAthlete, refresh } = useAthletes();
  const { snapshots } = useCloudData();

  const [isRefsDialogOpen, setIsRefsDialogOpen] = useState(false);
  const [refsForm, setRefsForm] = useState({
    fcMax: "",
    vma: "",
    ftp: "",
    css: "",
  });

  const vTests = useMemo(() => getVLamaxTestsOnly(athlete), [athlete.tests]);
  const monthly = useMemo(() => aggregateMonthlyVLamax(vTests), [vTests]);
  const trend = useMemo(() => computeTrend(monthly), [monthly]);
  const alerts = useMemo(() => computeAlerts(athlete), [athlete]);
  const recommendation = useMemo(() => computeBlockRecommendation(athlete), [athlete]);
  const refStatus = useMemo(() => getRefStatus(athlete), [athlete.refs]);
  const outliers = useMemo(() => detectOutliers(vTests.map(t => t.vlamax!)), [vTests]);

  // Get active or latest snapshot for the athlete
  const activeSnapshot = useMemo(() => {
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
    if (!athleteSnapshots.length) return null;
    
    // Find active snapshot or get the latest one
    const activeId = (athlete as any).active_snapshot_id;
    if (activeId) {
      const active = athleteSnapshots.find(s => s.id === activeId);
      if (active) return active;
    }
    
    // Fallback to latest snapshot
    return athleteSnapshots.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [snapshots, athlete]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const trendColors = getTrendColor(trend.dir);

  const openRefsDialog = () => {
    // Pre-fill with current values
    const refs = athlete.refs || { fcMax: null, vma: null, ftp: null, css: null };
    setRefsForm({
      fcMax: refs.fcMax != null ? String(refs.fcMax) : "",
      vma: refs.vma != null ? String(refs.vma) : "",
      ftp: refs.ftp != null ? String(refs.ftp) : "",
      css: refs.css != null ? String(refs.css) : "",
    });
    setIsRefsDialogOpen(true);
  };

  const copyFromSnapshot = () => {
    if (!activeSnapshot) {
      toast.error("Aucun snapshot disponible");
      return;
    }
    
    setRefsForm({
      fcMax: activeSnapshot.fc_max != null ? String(activeSnapshot.fc_max) : refsForm.fcMax,
      vma: activeSnapshot.vma != null ? String(activeSnapshot.vma) : refsForm.vma,
      ftp: activeSnapshot.ftp != null ? String(activeSnapshot.ftp) : refsForm.ftp,
      css: activeSnapshot.css != null ? String(activeSnapshot.css) : refsForm.css,
    });
    toast.success("Valeurs copiées depuis le snapshot");
  };

  const handleSaveRefs = async () => {
    const parseNum = (v: string): number | null => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    const newRefs = {
      ...(athlete.refs || {}),
      fcMax: parseNum(refsForm.fcMax),
      vma: parseNum(refsForm.vma),
      ftp: parseNum(refsForm.ftp),
      css: parseNum(refsForm.css),
    };

    const success = await updateAthlete({
      ...athlete,
      refs: newRefs,
    });

    if (success) {
      toast.success("Références enregistrées");
      setIsRefsDialogOpen(false);
      await refresh();
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          Suivi & Alertes – {athlete.nom}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alertes */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertes ({alerts.length})
          </h3>
          
          {alerts.length === 0 ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Aucune alerte critique</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
              ))}
            </div>
          )}
        </div>

        {/* Recommandation bloc */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recommandation bloc (14 jours)
          </h3>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">{recommendation}</p>
          </div>
        </div>

        {/* Tendance */}
        {monthly.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Tendance VLamax</h3>
            <div className={`p-4 rounded-lg border ${trendColors.bg} border-border/50`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{trendColors.icon}</span>
                <div>
                  <p className={`font-medium ${trendColors.text}`}>
                    {trend.dir === "up" && "VLamax en hausse"}
                    {trend.dir === "down" && "VLamax en baisse"}
                    {trend.dir === "stable" && "VLamax stable"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Slope: {trend.slope > 0 ? "+" : ""}{trend.slope.toFixed(3)}/mois
                  </p>
                </div>
                <div className="ml-auto">
                  {trend.dir === "up" && <TrendingUp className="h-6 w-6 text-red-400" />}
                  {trend.dir === "down" && <TrendingDown className="h-6 w-6 text-green-400" />}
                  {trend.dir === "stable" && <Minus className="h-6 w-6 text-blue-400" />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Références */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Références athlète</h3>
            <Button variant="outline" size="sm" onClick={openRefsDialog} className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Modifier les références
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RefBadge label="FCmax" value={refStatus.refs.fcMax} unit="bpm" missing={refStatus.missing.includes("FCmax")} />
            <RefBadge label="VMA" value={refStatus.refs.vma} unit="km/h" missing={refStatus.missing.includes("VMA")} />
            <RefBadge label="FTP" value={refStatus.refs.ftp} unit="W" missing={refStatus.missing.includes("FTP")} />
            <RefBadge label="CSS" value={refStatus.refs.css} unit="s/100m" missing={false} />
          </div>
        </div>

        {/* Évolution mensuelle */}
        {monthly.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Évolution mensuelle VLamax</h3>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Mois</TableHead>
                    <TableHead>VLamax pondérée</TableHead>
                    <TableHead>Confiance</TableHead>
                    <TableHead>N tests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell>{row.vlamax !== null ? row.vlamax.toFixed(2) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={row.confPct >= 70 ? "text-green-400" : row.confPct >= 50 ? "text-amber-400" : "text-red-400"}>
                          {row.confPct}%
                        </Badge>
                      </TableCell>
                      <TableCell>{row.n}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Historique tests brut */}
        {vTests.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Historique tests VLamax (brut)</h3>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>VLamax</TableHead>
                    <TableHead>Fiabilité</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...vTests].reverse().map((t, idxRev) => {
                    const idx = vTests.length - 1 - idxRev;
                    const isOutlier = outliers[idx];
                    
                    return (
                      <TableRow key={idx} className={isOutlier ? "bg-amber-500/5" : ""}>
                        <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                        <TableCell>{t.nom}</TableCell>
                        <TableCell className="font-medium">{t.vlamax?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {Math.round((t.fiabilite ?? 0.5) * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isOutlier && (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 text-xs">
                              ⚠️ outlier
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {vTests.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun test VLamax enregistré.</p>
            <p className="text-sm">Utilisez la bibliothèque de tests pour en ajouter.</p>
          </div>
        )}
      </CardContent>

      {/* Dialog pour modifier les références */}
      <Dialog open={isRefsDialogOpen} onOpenChange={setIsRefsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Modifier les références athlète
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {activeSnapshot && (
              <Button 
                variant="secondary" 
                className="w-full gap-2" 
                onClick={copyFromSnapshot}
              >
                <Zap className="h-4 w-4" />
                Copier depuis le snapshot actif
              </Button>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fcMax">FCmax (bpm)</Label>
                <Input
                  id="fcMax"
                  type="number"
                  placeholder="ex: 185"
                  value={refsForm.fcMax}
                  onChange={(e) => setRefsForm({ ...refsForm, fcMax: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vma">VMA (km/h)</Label>
                <Input
                  id="vma"
                  type="number"
                  step="0.1"
                  placeholder="ex: 18.5"
                  value={refsForm.vma}
                  onChange={(e) => setRefsForm({ ...refsForm, vma: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftp">FTP (W)</Label>
                <Input
                  id="ftp"
                  type="number"
                  placeholder="ex: 280"
                  value={refsForm.ftp}
                  onChange={(e) => setRefsForm({ ...refsForm, ftp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="css">CSS (sec/100m)</Label>
                <Input
                  id="css"
                  type="number"
                  placeholder="ex: 95"
                  value={refsForm.css}
                  onChange={(e) => setRefsForm({ ...refsForm, css: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={handleSaveRefs}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Composant carte alerte
function AlertCard({ alert }: { alert: Alert }) {
  const colors = getAlertColor(alert.level);
  
  return (
    <div className={`p-3 rounded-lg border ${colors.bg} border-border/50`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{colors.icon}</span>
        <div className="flex-1">
          <p className={`font-medium ${colors.text}`}>{alert.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{alert.detail}</p>
        </div>
      </div>
    </div>
  );
}

// Composant badge référence
function RefBadge({ label, value, unit, missing }: { label: string; value: number | null; unit: string; missing: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${missing ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30 border-border/50"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${missing ? "text-amber-400" : ""}`}>
        {value !== null ? `${value} ${unit}` : "—"}
      </p>
      {missing && <p className="text-xs text-amber-400 mt-1">Manquant</p>}
    </div>
  );
}
