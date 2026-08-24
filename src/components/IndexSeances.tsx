import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WahooWorkoutLibrary } from "@/components/WahooWorkoutLibrary";
import { WahooPersonalizedRecommendations } from "@/components/WahooPersonalizedRecommendations";
import { StaffSessionLibrary } from "@/components/StaffSessionLibrary";
import { WahooPrintableList } from "@/components/WahooPrintableList";
import { Button } from "@/components/ui/button";
import { Sparkles, Library, Dumbbell, Printer, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { syncWorkoutsToCloud, SyncResult } from "@/lib/syncWorkoutsToCloud";
import { toast } from "sonner";

// Legacy types preserved for backwards compatibility
export interface Seance {
  categorie: "A" | "B" | "C" | "D";
  nom: string;
  effet: string;
  contenu: string;
  necessite: "Obligatoire" | "Recommandé" | "Optionnel";
  sport?: "vélo" | "course" | "natation" | "général";
}

// Main component with tabs for personalized recommendations and full library
export function IndexSeancesView() {
  const [activeTab, setActiveTab] = useState<"recommendations" | "wahoo" | "staff" | "print">("recommendations");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncWorkoutsToCloud();
      if (result.success) {
        toast.success(`✅ ${result.inserted} séances synchronisées (${result.deduplicated} doublons supprimés)`, {
          duration: 5000,
        });
      } else {
        toast.error(`Erreur sync: ${result.errors.join(", ")}`, { duration: 8000 });
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisation..." : "Sync DB"}
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Recommandations</span>
            <span className="sm:hidden">Reco</span>
          </TabsTrigger>
          <TabsTrigger value="wahoo" className="gap-2">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Wahoo SYSTM</span>
            <span className="sm:hidden">Wahoo</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Séances Staff</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="print" className="gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimer</span>
            <span className="sm:hidden">Print</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-4">
          <WahooPersonalizedRecommendations />
        </TabsContent>

        <TabsContent value="wahoo" className="mt-4">
          <WahooWorkoutLibrary />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <StaffSessionLibrary />
        </TabsContent>

        <TabsContent value="print" className="mt-4">
          <WahooPrintableList />
        </TabsContent>
      </Tabs>
    </div>
  );
}