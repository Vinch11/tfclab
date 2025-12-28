// =============================================
// COMPOSANT SUIVI LONGITUDINAL & ALERTES
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle, Activity, Calendar } from "lucide-react";
import { Athlete } from "@/types/athlete";
import { Alert } from "@/types/monitoring";
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
}

export function MonitoringDashboard({ athlete }: MonitoringDashboardProps) {
  const vTests = useMemo(() => getVLamaxTestsOnly(athlete), [athlete.tests]);
  const monthly = useMemo(() => aggregateMonthlyVLamax(vTests), [vTests]);
  const trend = useMemo(() => computeTrend(monthly), [monthly]);
  const alerts = useMemo(() => computeAlerts(athlete), [athlete]);
  const recommendation = useMemo(() => computeBlockRecommendation(athlete), [athlete]);
  const refStatus = useMemo(() => getRefStatus(athlete), [athlete.refs]);
  const outliers = useMemo(() => detectOutliers(vTests.map(t => t.vlamax!)), [vTests]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const trendColors = getTrendColor(trend.dir);

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
          <h3 className="text-sm font-medium text-muted-foreground">Références athlète</h3>
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
