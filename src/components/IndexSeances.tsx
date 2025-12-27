import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, PersonStanding, Waves, Heart, Dumbbell, Timer, Sparkles, Zap } from "lucide-react";

interface Seance {
  categorie: "A" | "B" | "C" | "D";
  nom: string;
  effet: string;
  contenu: string;
  necessite: "Obligatoire" | "Recommandé" | "Optionnel";
  sport?: "vélo" | "course" | "natation" | "général";
}

const IndexSeances: Seance[] = [
  { categorie: "A", nom: "Endurance Longue Vélo", effet: "Améliore endurance aérobie", contenu: "Vélo 60-90min Z2", necessite: "Obligatoire", sport: "vélo" },
  { categorie: "A", nom: "Endurance Longue Course", effet: "Renforce système cardiorespiratoire", contenu: "Course 50-70min Z2", necessite: "Obligatoire", sport: "course" },
  { categorie: "B", nom: "Sprint Vélo", effet: "Développe VLamax et puissance", contenu: "Sprint 5-10s répété 3-5 fois", necessite: "Recommandé", sport: "vélo" },
  { categorie: "B", nom: "Fractionné Course", effet: "Améliore VO2max", contenu: "4-6x4min intensité Z5", necessite: "Recommandé", sport: "course" },
  { categorie: "C", nom: "Natation Technique", effet: "Améliore technique et endurance spécifique", contenu: "20-30min drills + 10min sprints", necessite: "Optionnel", sport: "natation" },
  { categorie: "C", nom: "Vélo Tempo", effet: "Améliore seuil anaérobie", contenu: "45min Z3", necessite: "Recommandé", sport: "vélo" },
  { categorie: "D", nom: "Récupération Active", effet: "Favorise récupération et adaptation", contenu: "30-40min Z1 vélo ou course", necessite: "Obligatoire", sport: "général" },
  { categorie: "D", nom: "Stretching / Mobility", effet: "Prévention blessures, souplesse", contenu: "15-20min étirements / mobilité", necessite: "Optionnel", sport: "général" },
];

const getCategorieColor = (cat: string) => {
  switch (cat) {
    case "A": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "B": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "C": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "D": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const getNecessiteColor = (nec: string) => {
  switch (nec) {
    case "Obligatoire": return "bg-red-500/20 text-red-400";
    case "Recommandé": return "bg-yellow-500/20 text-yellow-400";
    case "Optionnel": return "bg-slate-500/20 text-slate-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const getSportIcon = (sport?: string) => {
  switch (sport) {
    case "vélo": return <Bike className="h-4 w-4" />;
    case "course": return <PersonStanding className="h-4 w-4" />;
    case "natation": return <Waves className="h-4 w-4" />;
    default: return <Heart className="h-4 w-4" />;
  }
};

const getCategorieIcon = (cat: string) => {
  switch (cat) {
    case "A": return <Timer className="h-5 w-5" />;
    case "B": return <Zap className="h-5 w-5" />;
    case "C": return <Dumbbell className="h-5 w-5" />;
    case "D": return <Sparkles className="h-5 w-5" />;
    default: return null;
  }
};

export function IndexSeancesView() {
  const categories = ["A", "B", "C", "D"] as const;
  const categorieLabels = {
    A: "Fondamentales",
    B: "Développement",
    C: "Spécifiques",
    D: "Récupération",
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Index des Séances</h2>
        <p className="text-muted-foreground">Classification A/B/C/D des séances d'entraînement</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {categories.map((cat) => (
          <div key={cat} className={`p-3 rounded-lg border ${getCategorieColor(cat)} flex items-center gap-2`}>
            {getCategorieIcon(cat)}
            <div>
              <span className="font-bold text-lg">{cat}</span>
              <p className="text-xs opacity-80">{categorieLabels[cat]}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {IndexSeances.map((seance, idx) => (
          <Card key={idx} className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getCategorieColor(seance.categorie)}>
                    {seance.categorie}
                  </Badge>
                  <span className="text-muted-foreground">{getSportIcon(seance.sport)}</span>
                </div>
                <Badge variant="outline" className={getNecessiteColor(seance.necessite)}>
                  {seance.necessite}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{seance.nom}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Effet</span>
                <p className="text-sm text-foreground">{seance.effet}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Contenu</span>
                <p className="text-sm text-primary font-medium">{seance.contenu}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
