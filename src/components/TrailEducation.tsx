import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mountain, ArrowLeft, Heart, Gauge, Target, Dumbbell, AlertTriangle, BookOpen } from "lucide-react";
import { isTrailGoal, ObjectifType } from "@/types/athlete";

interface TrailEducationSection {
  h: string;
  icon: React.ReactNode;
  p: string[];
  bullets?: string[];
}

const getTrailEducationContent = (): { title: string; sections: TrailEducationSection[] } => ({
  title: "Branche Trail (20–80 km) — cadre scientifique & utilisation",
  sections: [
    {
      h: "Positionnement",
      icon: <Mountain className="h-5 w-5" />,
      p: [
        "Cette branche est optimisée pour les trails jusqu'à 80 km (trail court 20–40 km et trail long 40–80 km).",
        "Sur ces formats, l'intensité relative reste élevée : la VO₂max, l'économie de course et la tolérance à l'effort en montée sont déterminantes.",
        "L'application propose une aide à la décision terrain : les valeurs sont des estimations, interprétées avec un indice de confiance."
      ]
    },
    {
      h: "Pourquoi l'allure est secondaire en trail",
      icon: <Gauge className="h-5 w-5" />,
      p: [
        "En trail, l'allure varie fortement avec la pente, le terrain, l'altitude et la technicité. Une même intensité physiologique peut produire des allures très différentes.",
        "La prescription se fait donc prioritairement via : (1) la fréquence cardiaque, (2) la perception d'effort (RPE), et (3) des repères de terrain (capacité à parler, relâchement, respiration).",
        "L'allure reste informative sur les portions roulantes ou pour les relances, mais elle ne doit pas être la référence principale."
      ]
    },
    {
      h: "Comment utiliser les zones (trail)",
      icon: <Heart className="h-5 w-5" />,
      p: [
        "Zones Cardiaques (FCmax) : référence principale pour les sorties longues, les séances d'endurance et les tempos en montée.",
        "Zones VMA (si VMA route connue) : utiles pour les côtes courtes, les relances et certaines séances de qualité, mais à adapter selon le terrain.",
        "Objectif pratique : maintenir l'intensité physiologique (zone) malgré les variations de pente plutôt que maintenir une allure fixe."
      ],
      bullets: [
        "Endurance trail : Z1–Z2 (parler facilement, effort contrôlé).",
        "Tempo montée : Z3–Z4a (dur contrôlé, respiration soutenue).",
        "Côtes courtes / relances : Z4b–Z5 (courtes, propres, récupération complète)."
      ]
    },
    {
      h: "Interprétation VLamax & VO₂max en trail (≤ 80 km)",
      icon: <Target className="h-5 w-5" />,
      p: [
        "Sur trail court/long, la VO₂max (capacité aérobie) et l'économie (technique, force, efficience en montée/descente) influencent fortement la performance.",
        "La VLamax reste pertinente : une VLamax très élevée peut pénaliser l'efficacité aérobie sur effort long, tandis qu'une VLamax trop basse peut limiter les relances et la capacité à encaisser les changements de rythme.",
        "Vince's Lab utilise la VLamax estimée et un score synthétique (SPM) pour guider la répartition des séances A/B/C/D, sans remplacer l'expertise coach."
      ]
    },
    {
      h: "Structure d'entraînement recommandée",
      icon: <Dumbbell className="h-5 w-5" />,
      p: [
        "A — Endurance : volume et base aérobie, sorties longues avec D+ modéré, progressifs si l'athlète est frais.",
        "B — Intensité : nécessaire sur ≤ 80 km (côtes courtes, tempo montée, fartlek trail), mais dosée selon fatigue et confiance du modèle.",
        "C — Force & technique : force spécifique (montée), tolérance excentrique (descente), technique d'appuis, économie.",
        "D — Récupération : indispensable (terrain souple, mobilité, vélo facile)."
      ],
      bullets: [
        "Trail court : davantage de B (relances/puissance aérobie).",
        "Trail long : davantage de A + C (résistance mécanique, D+).",
        "Pas de logique 'ultra' : priorité à la qualité contrôlée et à l'économie."
      ]
    },
    {
      h: "Bonnes pratiques de testing (trail)",
      icon: <BookOpen className="h-5 w-5" />,
      p: [
        "Réaliser les tests (VLamax, VMA/FTP/FCmax) dans des conditions comparables (fatigue, capteurs, météo, terrain).",
        "Éviter les tests dans les 24–48h suivant une grosse séance excentrique (descente) ou une charge très élevée.",
        "Plusieurs tests cohérents augmentent la fiabilité : l'indice de confiance doit guider l'ampleur des ajustements."
      ]
    },
    {
      h: "Limites & responsabilité",
      icon: <AlertTriangle className="h-5 w-5" />,
      p: [
        "Les estimations sont basées sur des données terrain et comportent une incertitude. L'application fournit un indice de confiance pour la quantifier.",
        "Vince's Lab est un outil d'aide à la décision et ne remplace pas un avis médical ni un protocole de laboratoire lorsque nécessaire.",
        "Le coach reste responsable de l'interprétation et de l'adaptation au contexte (fatigue, blessures, conditions, calendrier)."
      ]
    }
  ]
});

interface TrailEducationProps {
  onBack?: () => void;
}

export const TrailEducation = ({ onBack }: TrailEducationProps) => {
  const content = getTrailEducationContent();

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">{content.title}</h1>
        </div>
      </div>

      <div className="grid gap-4">
        {content.sections.map((section, idx) => (
          <Card key={idx} className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-primary">{section.icon}</span>
                {section.h}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.p.map((paragraph, pIdx) => (
                <p key={pIdx} className="text-sm text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Encart contextuel pour afficher sur le profil athlète si objectif trail
interface TrailEducationBannerProps {
  objectif: ObjectifType;
  onOpenEducation: () => void;
}

export const TrailEducationBanner = ({ objectif, onOpenEducation }: TrailEducationBannerProps) => {
  if (!isTrailGoal(objectif)) return null;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Mountain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm">Trail (20–80 km) — repères</h3>
            <p className="text-xs text-muted-foreground">
              En trail, l'intensité se pilote surtout en <strong>FC</strong> et <strong>RPE</strong>. 
              L'allure varie avec pente/terrain. La branche trail de Vince's Lab est optimisée pour <strong>20–80 km</strong> (pas ultra).
            </p>
            <Button variant="outline" size="sm" onClick={onOpenEducation} className="mt-2">
              <BookOpen className="h-4 w-4 mr-2" />
              Lire le cadre scientifique Trail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrailEducation;
