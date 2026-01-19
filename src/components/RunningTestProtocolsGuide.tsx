import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Timer, 
  Ruler, 
  Zap, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";

interface ProtocolStep {
  step: number;
  action: string;
  duration?: string;
  note?: string;
}

interface TestProtocol {
  id: string;
  name: string;
  icon: React.ReactNode;
  purpose: string;
  equipment: string[];
  duration: string;
  difficulty: "Facile" | "Modéré" | "Difficile";
  steps: ProtocolStep[];
  tips: string[];
  interpretation: string;
  exampleValues: { level: string; value: string }[];
}

const protocols: TestProtocol[] = [
  {
    id: "threshold-pace",
    name: "Allure Seuil (SL2)",
    icon: <Timer className="w-5 h-5" />,
    purpose: "Déterminer l'allure que vous pouvez tenir environ 1 heure en course à pied, correspondant au seuil lactique 2.",
    equipment: ["Montre GPS", "Piste 400m ou parcours plat mesuré", "Cardiofréquencemètre (optionnel)"],
    duration: "30-60 min",
    difficulty: "Modéré",
    steps: [
      { step: 1, action: "Échauffement progressif", duration: "15 min", note: "Footing + gammes" },
      { step: 2, action: "Test : courir 30 minutes à effort constant et soutenu", duration: "30 min", note: "Effort 'confortablement difficile' - vous pouvez parler par phrases courtes" },
      { step: 3, action: "Notez votre allure moyenne sur les 30 minutes", note: "Ignorez les 5 premières minutes si démarrage trop rapide" },
      { step: 4, action: "Retour au calme", duration: "10 min" },
    ],
    tips: [
      "Terrain plat obligatoire pour la précision",
      "Évitez le vent fort ou la chaleur excessive",
      "Faites ce test reposé (pas de séance dure la veille)",
      "L'allure doit être régulière du début à la fin",
    ],
    interpretation: "L'allure moyenne correspond à votre seuil lactique. Pour un test de 30 min, vous pouvez ajouter ~5-10 s/km pour estimer l'allure tenable sur 1h.",
    exampleValues: [
      { level: "Débutant", value: "6:00-7:00/km (360-420s)" },
      { level: "Intermédiaire", value: "4:30-5:30/km (270-330s)" },
      { level: "Avancé", value: "3:45-4:15/km (225-255s)" },
      { level: "Élite", value: "3:00-3:30/km (180-210s)" },
    ],
  },
  {
    id: "sprint-15s",
    name: "Sprint 15 secondes",
    icon: <Zap className="w-5 h-5" />,
    purpose: "Mesurer la puissance anaérobie lactique maximale en course à pied via la distance parcourue en sprint.",
    equipment: ["Piste 400m ou terrain plat", "Chronomètre précis", "Cônes de marquage", "Assistant pour chronométrer"],
    duration: "20 min",
    difficulty: "Difficile",
    steps: [
      { step: 1, action: "Échauffement complet", duration: "15 min", note: "Footing + 3-4 accélérations progressives" },
      { step: 2, action: "Repos debout", duration: "3 min" },
      { step: 3, action: "Départ arrêté : sprint MAXIMAL pendant exactement 15 secondes", note: "Votre assistant siffle le départ et l'arrêt" },
      { step: 4, action: "Marquez l'endroit exact où vous étiez à 15s", note: "Utilisez un cône ou marque au sol" },
      { step: 5, action: "Mesurez la distance parcourue avec précision (mètre ruban)", note: "Du point de départ au point d'arrêt" },
      { step: 6, action: "Repos complet", duration: "5 min" },
      { step: 7, action: "Répétez 2-3 fois et gardez la meilleure distance" },
    ],
    tips: [
      "Sprint réellement MAXIMAL dès le départ",
      "Évitez de regarder le chrono pendant l'effort",
      "Surface dure et régulière (piste synthétique idéale)",
      "Chaussures à pointes recommandées",
      "Ne freinez pas avant le signal - maintenez l'effort",
    ],
    interpretation: "Cette distance reflète votre capacité glycolytique maximale. Une distance élevée indique une VLamax potentiellement haute.",
    exampleValues: [
      { level: "Débutant", value: "65-75 m" },
      { level: "Intermédiaire", value: "75-85 m" },
      { level: "Avancé", value: "85-95 m" },
      { level: "Élite", value: "95-110 m" },
    ],
  },
  {
    id: "running-power-max",
    name: "Puissance Max Course",
    icon: <Zap className="w-5 h-5" />,
    purpose: "Déterminer la puissance maximale en course à pied lors d'un effort explosif très court.",
    equipment: ["Capteur de puissance running (Stryd, Garmin, Coros)", "Piste ou terrain plat", "Montre compatible"],
    duration: "25 min",
    difficulty: "Difficile",
    steps: [
      { step: 1, action: "Échauffement complet avec gammes", duration: "15 min" },
      { step: 2, action: "3 accélérations progressives de 10s", duration: "5 min", note: "60% → 80% → 95% de l'effort max" },
      { step: 3, action: "Repos complet debout", duration: "3 min" },
      { step: 4, action: "Sprint MAXIMAL de 5-8 secondes", note: "Départ arrêté ou lancé" },
      { step: 5, action: "Notez la puissance max instantanée affichée", note: "Pic de puissance sur la montre" },
      { step: 6, action: "Repos", duration: "5 min" },
      { step: 7, action: "Répétez 2-3 fois, gardez la valeur la plus haute" },
    ],
    tips: [
      "Assurez-vous que le capteur est bien calibré",
      "Le terrain doit être parfaitement plat",
      "Sprint explosif avec bonne technique de course",
      "Évitez les sprints en côte (fausse les données)",
    ],
    interpretation: "Reflète votre capacité de production de force maximale en course. Utile pour estimer la VLamax CAP via le ratio avec la puissance seuil.",
    exampleValues: [
      { level: "Débutant", value: "350-450 W" },
      { level: "Intermédiaire", value: "450-550 W" },
      { level: "Avancé", value: "550-700 W" },
      { level: "Élite", value: "700-900 W" },
    ],
  },
  {
    id: "running-power-threshold",
    name: "Puissance Seuil Course (rFTP)",
    icon: <Target className="w-5 h-5" />,
    purpose: "Déterminer la puissance que vous pouvez maintenir environ 1 heure, équivalent au FTP en course à pied.",
    equipment: ["Capteur de puissance running", "Parcours plat ou piste", "Montre compatible"],
    duration: "45-60 min",
    difficulty: "Modéré",
    steps: [
      { step: 1, action: "Échauffement", duration: "15 min" },
      { step: 2, action: "Test : courir 20 minutes à effort maximal soutenable", duration: "20 min", note: "Même sensation que le test d'allure seuil" },
      { step: 3, action: "Notez la puissance moyenne sur les 20 minutes" },
      { step: 4, action: "Calculez : rFTP = Puissance moyenne × 0.95", note: "Facteur de correction pour extrapoler à 1h" },
      { step: 5, action: "Retour au calme", duration: "10 min" },
    ],
    tips: [
      "Même jour et conditions que le test d'allure seuil idéalement",
      "Effort régulier - évitez les variations de puissance",
      "Le terrain doit être plat et constant",
      "Calibrez votre capteur avant le test",
    ],
    interpretation: "Le ratio Pmax/rFTP aide à estimer la VLamax CAP. Un ratio élevé (>1.8) suggère une VLamax haute.",
    exampleValues: [
      { level: "Débutant", value: "200-250 W" },
      { level: "Intermédiaire", value: "250-300 W" },
      { level: "Avancé", value: "300-380 W" },
      { level: "Élite", value: "380-450 W" },
    ],
  },
];

function DifficultyBadge({ difficulty }: { difficulty: TestProtocol["difficulty"] }) {
  const colors = {
    "Facile": "bg-green-500/10 text-green-500 border-green-500/20",
    "Modéré": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "Difficile": "bg-red-500/10 text-red-500 border-red-500/20",
  };
  return (
    <Badge variant="outline" className={colors[difficulty]}>
      {difficulty}
    </Badge>
  );
}

function ProtocolCard({ protocol }: { protocol: TestProtocol }) {
  return (
    <AccordionItem value={protocol.id} className="border rounded-lg px-4 mb-2">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {protocol.icon}
          </div>
          <div>
            <div className="font-medium">{protocol.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <Timer className="w-3 h-3" />
              {protocol.duration}
              <DifficultyBadge difficulty={protocol.difficulty} />
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-4">
        {/* Objectif */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            Objectif
          </h4>
          <p className="text-sm text-muted-foreground">{protocol.purpose}</p>
        </div>

        {/* Équipement */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <Ruler className="w-4 h-4 text-primary" />
            Équipement nécessaire
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {protocol.equipment.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Étapes */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Protocole étape par étape
          </h4>
          <div className="space-y-2">
            {protocol.steps.map((step) => (
              <div key={step.step} className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                  {step.step}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.action}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                    {step.duration && (
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {step.duration}
                      </span>
                    )}
                    {step.note && (
                      <span className="italic">({step.note})</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conseils */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Conseils importants
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            {protocol.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Interprétation */}
        <div className="p-3 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-500" />
            Interprétation
          </h4>
          <p className="text-sm text-muted-foreground">{protocol.interpretation}</p>
        </div>

        {/* Valeurs de référence */}
        <div>
          <h4 className="text-sm font-medium mb-2">📊 Valeurs de référence</h4>
          <div className="grid grid-cols-2 gap-2">
            {protocol.exampleValues.map((ref, i) => (
              <div key={i} className="text-xs p-2 rounded bg-muted/30">
                <span className="font-medium">{ref.level}:</span>
                <span className="text-muted-foreground ml-1">{ref.value}</span>
              </div>
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface RunningTestProtocolsGuideProps {
  trigger?: React.ReactNode;
}

export function RunningTestProtocolsGuide({ trigger }: RunningTestProtocolsGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Guide des tests CAP
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Comment mesurer mes données CAP
          </DialogTitle>
          <DialogDescription>
            Protocoles de test détaillés pour alimenter l'estimation VLamax CAP
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>💡 Conseil :</strong> Vous n'avez pas besoin de tous les tests. 
              L'allure seuil + VMA suffisent pour une première estimation. 
              Ajoutez le sprint 15s ou les données de puissance pour plus de précision.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {protocols.map((protocol) => (
              <ProtocolCard key={protocol.id} protocol={protocol} />
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
