import { useState } from "react";
import { CheckCircle2, Circle, Trophy, ChevronDown, Bike, Shirt, Utensils, Brain, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface ChecklistCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: ChecklistItem[];
}

const initialCategories: ChecklistCategory[] = [
  {
    id: "equipment",
    name: "Équipement Vélo",
    icon: Bike,
    color: "text-primary",
    items: [
      { id: "bike-check", label: "Révision vélo complète", checked: false },
      { id: "tires", label: "Pneus vérifiés (pression, usure)", checked: false },
      { id: "brakes", label: "Freins réglés et testés", checked: false },
      { id: "chain", label: "Chaîne lubrifiée", checked: false },
      { id: "cleats", label: "Cales vérifiées", checked: false },
      { id: "computer", label: "Compteur chargé et configuré", checked: false },
      { id: "spare-tube", label: "Chambre de rechange + démonte-pneus", checked: false },
      { id: "pump", label: "Mini pompe ou CO2", checked: false },
    ],
  },
  {
    id: "clothing",
    name: "Tenue",
    icon: Shirt,
    color: "text-accent",
    items: [
      { id: "jersey", label: "Maillot de course", checked: false },
      { id: "bibs", label: "Cuissard", checked: false },
      { id: "helmet", label: "Casque (vérifié)", checked: false },
      { id: "glasses", label: "Lunettes", checked: false },
      { id: "shoes", label: "Chaussures vélo", checked: false },
      { id: "gloves", label: "Gants", checked: false },
      { id: "arm-warmers", label: "Manchettes (si météo)", checked: false },
      { id: "rain-jacket", label: "Veste pluie (si météo)", checked: false },
    ],
  },
  {
    id: "nutrition",
    name: "Nutrition",
    icon: Utensils,
    color: "text-success",
    items: [
      { id: "bottles", label: "Bidons préparés", checked: false },
      { id: "gels", label: "Gels / Barres", checked: false },
      { id: "electrolytes", label: "Électrolytes", checked: false },
      { id: "pre-race", label: "Repas pré-course planifié", checked: false },
      { id: "caffeine", label: "Caféine (si habitude)", checked: false },
      { id: "race-plan", label: "Plan nutrition course établi", checked: false },
    ],
  },
  {
    id: "mental",
    name: "Préparation Mentale",
    icon: Brain,
    color: "text-purple-400",
    items: [
      { id: "course-recon", label: "Parcours reconnu / analysé", checked: false },
      { id: "strategy", label: "Stratégie de course définie", checked: false },
      { id: "objectives", label: "Objectifs clairs (A, B, C)", checked: false },
      { id: "visualization", label: "Visualisation effectuée", checked: false },
      { id: "sleep", label: "Sommeil optimisé J-2 et J-1", checked: false },
      { id: "warmup", label: "Protocole échauffement planifié", checked: false },
    ],
  },
  {
    id: "logistics",
    name: "Logistique",
    icon: Wrench,
    color: "text-warning",
    items: [
      { id: "registration", label: "Inscription confirmée", checked: false },
      { id: "license", label: "Licence / Documents", checked: false },
      { id: "transport", label: "Transport vélo organisé", checked: false },
      { id: "accommodation", label: "Hébergement réservé", checked: false },
      { id: "directions", label: "Itinéraire vérifié", checked: false },
      { id: "timing", label: "Horaires notés (retrait dossard, départ)", checked: false },
    ],
  },
];

export function RaceChecklist() {
  const [categories, setCategories] = useState<ChecklistCategory[]>(initialCategories);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("equipment");

  const toggleItem = (categoryId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : cat
      )
    );
  };

  const getCategoryProgress = (category: ChecklistCategory) => {
    const checked = category.items.filter((item) => item.checked).length;
    return { checked, total: category.items.length, percentage: (checked / category.items.length) * 100 };
  };

  const totalProgress = categories.reduce(
    (acc, cat) => {
      const progress = getCategoryProgress(cat);
      return { checked: acc.checked + progress.checked, total: acc.total + progress.total };
    },
    { checked: 0, total: 0 }
  );

  const isRaceReady = totalProgress.checked === totalProgress.total;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-xl", isRaceReady ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Race Ready Checklist</h2>
            <p className="text-sm text-muted-foreground">Préparez votre course sereinement</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-foreground">
            {totalProgress.checked}/{totalProgress.total}
          </div>
          <div className={cn("text-sm font-medium", isRaceReady ? "text-success" : "text-muted-foreground")}>
            {isRaceReady ? "Race Ready! 🏆" : `${Math.round((totalProgress.checked / totalProgress.total) * 100)}% prêt`}
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isRaceReady ? "bg-success" : "bg-gradient-to-r from-primary to-accent"
            )}
            style={{ width: `${(totalProgress.checked / totalProgress.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const progress = getCategoryProgress(category);
          const isExpanded = expandedCategory === category.id;
          const isComplete = progress.checked === progress.total;

          return (
            <div
              key={category.id}
              className={cn(
                "border border-border rounded-xl overflow-hidden transition-all duration-300",
                isComplete && "border-success/30 bg-success/5"
              )}
            >
              <div
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-secondary", category.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground">{category.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", isComplete ? "bg-success" : "bg-primary")}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {progress.checked}/{progress.total}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 animate-fade-in">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(category.id, item.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
                        "hover:bg-secondary/50",
                        item.checked && "bg-success/10"
                      )}
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          "text-sm transition-all",
                          item.checked ? "text-muted-foreground line-through" : "text-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
