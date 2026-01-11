import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WahooWorkoutLibrary } from "@/components/WahooWorkoutLibrary";
import { WahooPersonalizedRecommendations } from "@/components/WahooPersonalizedRecommendations";
import { Sparkles, Library } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"recommendations" | "library">("recommendations");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Recommandations
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <Library className="h-4 w-4" />
            Bibliothèque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-4">
          <WahooPersonalizedRecommendations />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <WahooWorkoutLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
