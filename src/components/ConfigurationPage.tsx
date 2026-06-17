/**
 * Configuration Page - Gestion des thèmes et préférences utilisateur
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Palette, Check, LayoutDashboard, Trophy, BookOpen, Link2, CheckCircle2, RefreshCw, AlertCircle, Download } from "lucide-react";
import { useTheme, THEME_CONFIG, THEME_ORDER, Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { AdvancedLayoutEditor } from "./AdvancedLayoutEditor";
import { ReportSectionOrderEditor } from "./ReportSectionOrderEditor";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useGettingStartedVisibility } from "./GettingStartedChecklist";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { NolioLinkAthletesDialog } from "./NolioLinkAthletesDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LinkedAthlete = { id: string; name: string; nolio_id: number };

export function ConfigurationPage() {
  const { theme, setTheme, themeConfig } = useTheme();
  const { preferences, setPreference } = useUserPreferences();
  const gettingStartedVisibility = useGettingStartedVisibility();
  const { user, session } = useAuth();

  const [nolioConnected, setNolioConnected] = useState(false);
  const [nolioLoading, setNolioLoading] = useState(false);
  const [nolioJustConnected, setNolioJustConnected] = useState(false);
  const [nolioSyncing, setNolioSyncing] = useState(false);
  const [nolioSyncError, setNolioSyncError] = useState<string | null>(null);
  const [nolioSyncSuccess, setNolioSyncSuccess] = useState<{ count: number; linkedTotal: number; message: string } | null>(null);
  const [nolioLastSyncAt, setNolioLastSyncAt] = useState<string | null>(null);
  const [nolioLinkOpen, setNolioLinkOpen] = useState(false);

  const [nolioMetricsLoading, setNolioMetricsLoading] = useState(false);
  const [nolioMetricsError, setNolioMetricsError] = useState<string | null>(null);
  const [nolioMetricsSuccess, setNolioMetricsSuccess] = useState<{ created: number; updated: number; message: string } | null>(null);

  const [nolioRecordsLoading, setNolioRecordsLoading] = useState(false);
  const [nolioRecordsResult, setNolioRecordsResult] = useState<{ message: string; isError: boolean } | null>(null);

  const [linkedAthletes, setLinkedAthletes] = useState<LinkedAthlete[]>([]);
  const [syncTarget, setSyncTarget] = useState<string>("all");
  const [metricsTarget, setMetricsTarget] = useState<string>("all");

  // Détecte ?nolio=connected dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("nolio") === "connected") {
      setNolioJustConnected(true);
      toast({ title: "Nolio connecté avec succès", description: "Votre compte Nolio est maintenant lié." });
      // Nettoie l'URL
      params.delete("nolio");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Vérifie si un token Nolio valide existe
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("nolio_tokens")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load nolio token status", error);
        return;
      }
      setNolioConnected(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, nolioJustConnected]);

  // Charge la date de dernière synchro réussie
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("nolio_sync_log")
        .select("synced_at")
        .eq("user_id", user.id)
        .eq("status", "success")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load last sync", error);
        return;
      }
      setNolioLastSyncAt(data?.synced_at ?? null);
    })();
    return () => { cancelled = true; };
  }, [user, nolioSyncSuccess, nolioMetricsSuccess]);

  // Charge la liste des athlètes liés à Nolio (nolio_id non null)
  useEffect(() => {
    if (!user || !nolioConnected) { setLinkedAthletes([]); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select("id, name, nolio_id")
        .eq("coach_id", user.id)
        .not("nolio_id", "is", null)
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) { console.error("Failed to load linked athletes", error); return; }
      setLinkedAthletes(((data ?? []) as Array<{ id: string; name: string; nolio_id: number }>).map(a => ({
        id: a.id, name: a.name, nolio_id: Number(a.nolio_id),
      })));
    })();
    return () => { cancelled = true; };
  }, [user, nolioConnected, nolioSyncSuccess, nolioMetricsSuccess]);

  const handleConnectNolio = async () => {
    if (!session?.access_token) {
      toast({ title: "Connexion requise", description: "Veuillez vous connecter pour lier Nolio.", variant: "destructive" });
      return;
    }
    setNolioLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("nolio-oauth/start", {
        method: "GET",
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("URL OAuth manquante");
      window.location.href = url;
    } catch (e) {
      console.error("Nolio connect failed", e);
      toast({ title: "Erreur Nolio", description: (e as Error).message ?? "Impossible de démarrer l'authentification.", variant: "destructive" });
      setNolioLoading(false);
    }
  };

  const handleDisconnectNolio = async () => {
    if (!user) return;
    setNolioLoading(true);
    const { error } = await supabase.from("nolio_tokens").delete().eq("user_id", user.id);
    setNolioLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setNolioConnected(false);
    toast({ title: "Nolio déconnecté" });
  };
  const handleSyncNolio = async () => {
    if (!session?.access_token) return;
    setNolioSyncing(true);
    setNolioSyncError(null);
    setNolioSyncSuccess(null);
    try {
      const target = linkedAthletes.find(a => a.id === syncTarget);
      const body = target ? { athlete_id: target.id, nolio_id: target.nolio_id } : {};
      const { data, error } = await supabase.functions.invoke("nolio-sync", { method: "POST", body });
      if (error) throw error;
      const count = (data as { athletes_count?: number })?.athletes_count ?? 0;
      const linkedTotal = (data as { linked_total?: number })?.linked_total ?? 0;
      const message =
        (data as { message?: string })?.message ??
        (target
          ? `${target.name} — ${count} mis à jour`
          : `Synchronisation réussie — ${linkedTotal} athlètes liés à Nolio, ${count} mis à jour`);
      const ok = (data as { ok?: boolean })?.ok ?? true;
      if (!ok) {
        const errs = (data as { errors?: string[] })?.errors?.join(" | ") ?? "Erreur inconnue";
        throw new Error(errs);
      }
      setNolioSyncSuccess({ count, linkedTotal, message });
      toast({ title: "Synchronisation réussie", description: message });
    } catch (e) {
      const msg = (e as Error).message ?? "Échec de la synchronisation";
      console.error("Nolio sync failed", e);
      setNolioSyncError(msg);
      toast({ title: "Erreur de synchronisation", description: msg, variant: "destructive" });
    } finally {
      setNolioSyncing(false);
    }
  };

  const handleImportNolioMetrics = async () => {
    if (!session?.access_token) return;
    setNolioMetricsLoading(true);
    setNolioMetricsError(null);
    setNolioMetricsSuccess(null);
    try {
      const target = linkedAthletes.find(a => a.id === metricsTarget);
      const body = target ? { athlete_id: target.id, nolio_id: target.nolio_id } : {};
      const { data, error } = await supabase.functions.invoke("nolio-metrics", { method: "POST", body });
      if (error) throw error;
      const ok = (data as { ok?: boolean })?.ok ?? true;
      if (!ok) {
        const errs = (data as { warnings?: string[] })?.warnings?.join(" | ") ?? "Erreur inconnue";
        throw new Error(errs);
      }
      const created = (data as { created?: number })?.created ?? 0;
      const updated = (data as { updated?: number })?.updated ?? 0;
      const totalChanged = created + updated;
      const prefix = target ? `${target.name} — ` : "";
      if (totalChanged > 0) {
        const message = `${prefix}${created} snapshot${created > 1 ? "s" : ""} créé${created > 1 ? "s" : ""}${updated > 0 ? `, ${updated} mis à jour` : ""}`;
        setNolioMetricsSuccess({ created, updated, message });
        toast({ title: "Métriques importées", description: message });
      } else {
        const message = `${prefix}Aucune nouvelle métrique détectée`;
        setNolioMetricsSuccess({ created: 0, updated: 0, message });
        toast({ title: "Métriques à jour", description: message });
      }
    } catch (e) {
      const msg = (e as Error).message ?? "Échec de l'import des métriques";
      console.error("Nolio metrics import failed", e);
      setNolioMetricsError(msg);
      toast({ title: "Erreur d'import", description: msg, variant: "destructive" });
    } finally {
      setNolioMetricsLoading(false);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return iso;
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Configuration</CardTitle>
              <CardDescription>
                Personnalisez l'apparence et les préférences de l'application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section Thèmes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Thèmes</CardTitle>
          </div>
          <CardDescription>
            Choisissez le thème visuel qui vous convient le mieux
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEME_ORDER.map((themeKey) => {
              const config = themeConfig[themeKey];
              const isActive = theme === themeKey;
              
              return (
                <button
                  key={themeKey}
                  onClick={() => setTheme(themeKey)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all duration-300",
                    "hover:shadow-lg hover:scale-[1.02]",
                    isActive
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  {/* Badge actif */}
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Check className="w-3 h-3" />
                        Actif
                      </Badge>
                    </div>
                  )}

                  {/* Preview du thème */}
                  <ThemePreview themeKey={themeKey} />

                  {/* Infos du thème */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{config.icon}</span>
                      <h3 className="font-semibold text-lg">{config.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section Layout Preferences - Éditeur Avancé */}
      <AdvancedLayoutEditor />

      {/* Section Ordre des Sections du Rapport */}
      <ReportSectionOrderEditor />

      {/* Section Intégration Nolio */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Intégration Nolio</CardTitle>
          </div>
          <CardDescription>
            Connectez votre compte Nolio pour synchroniser vos entraînements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {nolioJustConnected && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Nolio connecté avec succès</span>
            </div>
          )}

          {nolioConnected ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <Label className="font-medium text-base">✅ Nolio connecté</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Votre compte Nolio est lié à TFC Lab.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectNolio}
                  disabled={nolioLoading}
                >
                  Déconnecter
                </Button>
              </div>

              {/* Bouton synchronisation */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <RefreshCw className={cn("w-5 h-5 text-primary", nolioSyncing && "animate-spin")} />
                  </div>
                  <div>
                    <Label className="font-medium text-base">Synchroniser les données Nolio</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {nolioLastSyncAt
                        ? `Dernière synchro : ${formatLastSync(nolioLastSyncAt)}`
                        : "Aucune synchronisation effectuée pour le moment."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={syncTarget} onValueChange={setSyncTarget}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Choisir une cible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les athlètes liés à Nolio</SelectItem>
                      {linkedAthletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSyncNolio} disabled={nolioSyncing}>
                    {nolioSyncing ? "Synchronisation..." : "Synchroniser"}
                  </Button>
                </div>
              </div>


              {/* Liaison manuelle des athlètes Nolio */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label className="font-medium text-base">Lier les athlètes Nolio</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Associez manuellement chaque athlète TFCLab à son compte Nolio.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setNolioLinkOpen(true)}>
                  Lier les athlètes Nolio
                </Button>
              </div>

              {/* Importer les métriques Nolio */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Download className={cn("w-5 h-5 text-primary", nolioMetricsLoading && "animate-bounce")} />
                  </div>
                  <div>
                    <Label className="font-medium text-base">Importer les métriques Nolio</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Récupère les dernières métriques de chaque athlète lié et crée des snapshots.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={metricsTarget} onValueChange={setMetricsTarget}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Choisir une cible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les athlètes liés à Nolio</SelectItem>
                      {linkedAthletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleImportNolioMetrics} disabled={nolioMetricsLoading}>
                    {nolioMetricsLoading ? "Import en cours..." : "Importer"}
                  </Button>
                </div>
              </div>


              {nolioSyncSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {nolioSyncSuccess.message}
                  </span>
                </div>
              )}
              {nolioSyncError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{nolioSyncError}</span>
                </div>
              )}
              {nolioMetricsSuccess && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border",
                  nolioMetricsSuccess.created + nolioMetricsSuccess.updated > 0
                    ? "bg-success/10 border-success/30 text-success"
                    : "bg-primary/10 border-primary/30 text-primary"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{nolioMetricsSuccess.message}</span>
                </div>
              )}
              {nolioMetricsError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{nolioMetricsError}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label className="font-medium text-base">Connecter Nolio</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Autorisez TFC Lab à accéder à votre compte Nolio via OAuth2.
                  </p>
                </div>
              </div>
              <Button onClick={handleConnectNolio} disabled={nolioLoading}>
                {nolioLoading ? "Connexion..." : "Connecter Nolio"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <NolioLinkAthletesDialog open={nolioLinkOpen} onOpenChange={setNolioLinkOpen} />


      {/* Section Préférences d'affichage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Préférences d'affichage</CardTitle>
          </div>
          <CardDescription>
            Personnalisez le comportement par défaut des composants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Potentiel Physiologique compact mode */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium text-base">Potentiel Physiologique — Mode compact</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Affiche une version résumée sur le Dashboard avec possibilité d'étendre les détails
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.potentielPhysiologiqueCompactMode ?? true}
              onCheckedChange={(checked) => setPreference('potentielPhysiologiqueCompactMode', checked)}
              className="ml-4"
            />
          </div>

          <Separator />

          {/* Staff mode info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border">
            <div>
              <Label className="font-medium">Mode Coach (Staff)</Label>
              <p className="text-sm text-muted-foreground">
                Affiche les informations détaillées pour les coachs
              </p>
            </div>
            <Badge variant="outline">Via Dashboard</Badge>
          </div>

          <Separator />

          {/* Getting Started Guide */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium text-base">Guide "Bien démarrer"</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {gettingStartedVisibility.isHidden 
                    ? "Le guide d'aide au démarrage est actuellement masqué"
                    : "Le guide d'aide au démarrage est visible sur le dashboard"}
                </p>
              </div>
            </div>
            <Button
              variant={gettingStartedVisibility.isHidden ? "default" : "outline"}
              size="sm"
              onClick={gettingStartedVisibility.isHidden ? gettingStartedVisibility.show : gettingStartedVisibility.hide}
              className="ml-4"
            >
              {gettingStartedVisibility.isHidden ? "Afficher" : "Masquer"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center py-2">
            TWO FOR COACHING LAB™ — Version TFCL-V2.0
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Preview visuel miniature du thème */
function ThemePreview({ themeKey }: { themeKey: Theme }) {
  const previewStyles: Record<Theme, { bg: string; card: string; primary: string; accent: string }> = {
    dark: {
      bg: "bg-[hsl(222,47%,8%)]",
      card: "bg-[hsl(222,47%,11%)]",
      primary: "bg-[hsl(180,80%,55%)]",
      accent: "bg-[hsl(25,95%,55%)]",
    },
    light: {
      bg: "bg-[hsl(220,25%,96%)]",
      card: "bg-white",
      primary: "bg-[hsl(220,65%,35%)]",
      accent: "bg-[hsl(45,90%,48%)]",
    },
    emerald: {
      bg: "bg-[hsl(225,30%,7%)]",
      card: "bg-[hsl(225,25%,10%)]",
      primary: "bg-[hsl(175,55%,48%)]",
      accent: "bg-[hsl(28,70%,52%)]",
    },
  };

  const styles = previewStyles[themeKey];

  return (
    <div className={cn("rounded-lg p-3 h-24", styles.bg)}>
      <div className={cn("rounded-md p-2 h-full flex gap-2", styles.card)}>
        <div className={cn("w-3 rounded-sm", styles.primary)} />
        <div className="flex-1 space-y-1.5">
          <div className={cn("h-2 w-12 rounded-full", styles.primary)} />
          <div className="flex gap-1">
            <div className={cn("h-6 w-8 rounded", styles.accent, "opacity-60")} />
            <div className={cn("h-6 w-8 rounded", styles.primary, "opacity-40")} />
          </div>
          <div className="h-1.5 w-16 rounded-full bg-gray-400/30" />
        </div>
      </div>
    </div>
  );
}
