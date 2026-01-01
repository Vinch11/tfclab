// =============================================
// ÉCRAN 6 - BLOC 3 SEMAINES (CLOUD, NO NOLIO)
// =============================================

import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext"; // ⚠️ temporaire si tu n'as pas encore un CloudAthleteContext
import { useCloudData } from "@/hooks/useCloudData";
import type { DbSnapshot } from "@/hooks/useCloudData";
import { genererBloc3Semaines, BlocSemaine } from "@/lib/bloc3Semaines";

function pickEffectiveSnapshot(snapshots: DbSnapshot[], athleteId: string, activeSnapshotId?: string | null) {
  const list = snapshots.filter((s) => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find((s) => s.id === activeSnapshotId);
    if (active) return active;
  }
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

function buildCompatAthlete(currentAthlete: any, snapshot: DbSnapshot) {
  const compatSnapshot: any = {
    id: snapshot.id,
    date: snapshot.date,
    sport: "vélo",
    // ✅ FIX 11: null au lieu de 70 (pas de fallback inventé)
    poids: snapshot.weight_kg ?? undefined,
    ftp: snapshot.ftp ?? 0,
    pmax_5s: snapshot.pmax_5s ?? undefined,
    tss_7j: 0,
    vo2max: snapshot.vo2max ?? undefined,
    vma: snapshot.vma ?? undefined,
    css: snapshot.css ?? undefined,
    source: snapshot.source ?? "manual",
  };

  return {
    ...currentAthlete,
    historique: [compatSnapshot],
  };
}

export default function Bloc3SemainesPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots } = useCloudData();

  if (!currentAthlete) {
    return (
      <AppLayout title="Bloc 3 Semaines" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sélectionnez un athlète</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voir les athlètes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const effectiveSnapshot = pickEffectiveSnapshot(
    snapshots as any,
    currentAthlete.id,
    currentAthlete.active_snapshot_id ?? null,
  );

  if (!effectiveSnapshot) {
    return (
      <AppLayout title="Bloc 3 Semaines" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground">Ajoutez un snapshot (manuel) pour générer le bloc</p>
            <Button onClick={() => navigate("/snapshots")} className="mt-4">
              Ajouter un snapshot
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const athleteCompat = buildCompatAthlete(currentAthlete, effectiveSnapshot);
  const bloc = genererBloc3Semaines(athleteCompat);

  if (!bloc) {
    return (
      <AppLayout title="Bloc 3 Semaines" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground">Données insuffisantes pour générer le bloc</p>
            <Button onClick={() => navigate("/snapshots")} className="mt-4">
              Ajouter un snapshot
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const getChargeIcon = (charge: string) => {
    if (charge === "Progressive") return <TrendingUp className="h-4 w-4 text-success" />;
    if (charge === "Consolidation") return <Minus className="h-4 w-4 text-warning" />;
    return <TrendingDown className="h-4 w-4 text-primary" />;
  };

  const getChargeColor = (charge: string) => {
    if (charge === "Progressive") return "success";
    if (charge === "Consolidation") return "warning";
    return "secondary";
  };

  const renderSemaine = (blocSemaine: BlocSemaine) => {
    if (!blocSemaine.semaine) return null;

    return (
      <div className="space-y-3">
        {blocSemaine.semaine.semaine.map((jour: any, i: number) => (
          <div
            key={i}
            className={`p-3 rounded-lg border ${
              jour.estCle ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{jour.jour}</span>
                  {jour.estCle && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      CLÉ
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {jour.nom || jour.type} • {jour.objectif}
                </p>
              </div>
              {jour.intensite && <span className="text-xs text-muted-foreground">{jour.intensite}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppLayout title="Bloc 3 Semaines" showBack>
      <div className="space-y-6 animate-fade-in">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="font-semibold">Priorité: {bloc.priorite}</span>
              </div>
              <Badge variant="secondary">Charge estimée</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {bloc.objectif === "IM" ? "Ironman" : bloc.objectif} • 2 semaines progressives + 1 allégée
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Snapshot: {effectiveSnapshot.date}
              {currentAthlete.active_snapshot_id ? " (actif)" : ""}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="1" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {bloc.semaines.map((s: any) => (
              <TabsTrigger key={s.numeroSemaine} value={s.numeroSemaine.toString()}>
                <div className="flex items-center gap-1">
                  {getChargeIcon(s.charge)}
                  <span>S{s.numeroSemaine}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {bloc.semaines.map((semaine: any) => (
            <TabsContent key={semaine.numeroSemaine} value={semaine.numeroSemaine.toString()}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Semaine {semaine.numeroSemaine}</CardTitle>
                    <Badge variant={getChargeColor(semaine.charge) as any}>{semaine.charge}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{semaine.description}</p>
                  {semaine.tssEstime && (
                    <p className="text-xs text-muted-foreground">Charge estimée: ~{semaine.tssEstime}</p>
                  )}
                </CardHeader>
                <CardContent>{renderSemaine(semaine)}</CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
