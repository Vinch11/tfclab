import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  ChevronLeft, 
  BookOpen, 
  Scale,
  Compass,
  Layers,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Données de la table des constantes physiologiques
const PHYSIOLOGICAL_CONSTANTS = [
  {
    domain: "Économie de course (CAP)",
    constant: "Coût énergétique de la course (ECOR)",
    value: "3.6 – 4.5 J·kg⁻¹·m⁻¹ (≈ 4.0 par défaut)",
    source: "di Prampero, Margaria",
    robustness: "Variable inter-individuelle",
    usage: "Conversion vitesse → puissance métabolique"
  },
  {
    domain: "Cyclisme",
    constant: "Efficacité mécanique",
    value: "20–24 %",
    source: "Coyle, Mader",
    robustness: "Stable",
    usage: "FTP, Pmax, TTE"
  },
  {
    domain: "Seuil aérobie (SV1)",
    constant: "Lactate ≈ 2 mmol/L",
    value: "2 mmol/L",
    source: "Mader, Heck",
    robustness: "Convention",
    usage: "Définition zones Z2–Z3"
  },
  {
    domain: "Seuil anaérobie (SV2 / MLSS)",
    constant: "Lactate ≈ 4 mmol/L",
    value: "4 mmol/L",
    source: "Heck (1985)",
    robustness: "Convention",
    usage: "TTE, endurance spécifique"
  },
  {
    domain: "Métabolisme",
    constant: "Conversion énergie ↔ lactate",
    value: "60–65 J·kg⁻¹ / mmol",
    source: "Mader",
    robustness: "Modélisation",
    usage: "Estimation VLamax"
  },
  {
    domain: "Cinétique VO₂",
    constant: "Part aérobie sur sprint",
    value: "20–35 % de VO₂max",
    source: "Whipp, Billat",
    robustness: "Dépend contexte",
    usage: "Correction VLamax sprint"
  },
  {
    domain: "Alactique (PCr)",
    constant: "Délai phosphocréatine",
    value: "5–7 secondes",
    source: "Bogdanis",
    robustness: "Moyenne population",
    usage: "Tests anaérobies"
  },
  {
    domain: "Endurance au seuil",
    constant: "TTE (MLSS)",
    value: "35–70 minutes",
    source: "Billat, INSCYD",
    robustness: "Concept robuste",
    usage: "Durabilité, Race Readiness"
  },
  {
    domain: "Substrats énergétiques",
    constant: "Relation VLamax ↔ glucides",
    value: "Relation inverse qualitative",
    source: "Mader, San Millán",
    robustness: "Forte",
    usage: "Nutrition prédictive (g/h)"
  },
  {
    domain: "Charge d'entraînement",
    constant: "TSS",
    value: "Modèle Coggan",
    source: "Coggan",
    robustness: "Indirecte",
    usage: "Proxy fatigue / TTE"
  }
];

export default function AcademyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">🧠 Academy</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Référentiel scientifique officiel</p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        <Accordion type="multiple" defaultValue={["fondements", "constantes", "hierarchie", "legal", "philosophie"]} className="space-y-4">
          
          {/* SECTION 1 — Fondements scientifiques */}
          <AccordionItem value="fondements" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">📘 Fondements scientifiques de Two For Coaching Lab</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 sm:p-6">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Two For Coaching Lab est une application d'aide à la décision destinée aux coachs et athlètes d'endurance.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Elle s'appuie sur des modèles physiologiques issus de la littérature scientifique internationale, 
                    en particulier l'école allemande de physiologie de l'exercice (Mader, Heck, Billat), ainsi que sur 
                    des travaux plus récents en métabolisme, économie de locomotion et durabilité de la performance.
                  </p>
                  <Separator className="my-4" />
                  <p className="text-foreground font-medium leading-relaxed text-sm sm:text-base">
                    L'application ne cherche pas à prédire la performance, mais à éclairer les décisions d'entraînement 
                    en rendant visibles les compromis physiologiques (performance, fatigue, risque).
                  </p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 2 — Table des constantes */}
          <AccordionItem value="constantes" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/50 text-accent-foreground">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">📊 Constantes physiologiques utilisées dans Two For Coaching Lab</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="overflow-x-auto -mx-4 px-4">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Domaine physiologique</TableHead>
                      <TableHead className="font-semibold">Constante utilisée</TableHead>
                      <TableHead className="font-semibold">Valeur de référence</TableHead>
                      <TableHead className="font-semibold">Source scientifique</TableHead>
                      <TableHead className="font-semibold">Robustesse</TableHead>
                      <TableHead className="font-semibold">Utilisation dans l'app</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PHYSIOLOGICAL_CONSTANTS.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">{row.domain}</TableCell>
                        <TableCell className="text-muted-foreground">{row.constant}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{row.value}</TableCell>
                        <TableCell className="text-muted-foreground italic">{row.source}</TableCell>
                        <TableCell className="text-muted-foreground">{row.robustness}</TableCell>
                        <TableCell className="text-muted-foreground">{row.usage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 3 — Hiérarchie des données */}
          <AccordionItem value="hierarchie" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">📐 Hiérarchie des données utilisées par l'app</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-secondary/30 bg-secondary/5">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Two For Coaching Lab applique une hiérarchie stricte des sources de données afin de limiter les erreurs d'interprétation :
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">1</span>
                      <div>
                        <p className="font-medium text-foreground">Mesures directes</p>
                        <p className="text-sm text-muted-foreground">Tests terrain structurés, tests laboratoire</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/80 text-primary-foreground text-sm font-bold shrink-0">2</span>
                      <div>
                        <p className="font-medium text-foreground">Observations terrain</p>
                        <p className="text-sm text-muted-foreground">TTE observé, dérive cardiaque, durabilité</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/60 text-primary-foreground text-sm font-bold shrink-0">3</span>
                      <div>
                        <p className="font-medium text-foreground">Estimations modélisées</p>
                        <p className="text-sm text-muted-foreground">VLamax, TTE, nutrition prédictive</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">4</span>
                      <div>
                        <p className="font-medium text-foreground">Valeurs par défaut</p>
                        <p className="text-sm text-muted-foreground">Uniquement en absence totale de données</p>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  
                  <p className="text-foreground font-medium leading-relaxed text-sm sm:text-base">
                    Chaque indicateur affiché dans l'application est associé à un indice de confiance reflétant cette hiérarchie.
                  </p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 4 — Cadre légal & limites */}
          <AccordionItem value="legal" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">⚖️ Cadre scientifique et limites d'utilisation</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    <strong className="text-foreground">Two For Coaching Lab est un outil d'aide à la décision.</strong>
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Il ne remplace ni un test physiologique en laboratoire, ni un avis médical, ni l'expertise d'un coach.
                  </p>
                  
                  <Separator />
                  
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    Les valeurs de VLamax, TTE, Race Readiness, nutrition prédictive et indices de risque sont des 
                    <strong className="text-foreground"> estimations probabilistes</strong> basées sur des modèles reconnus, 
                    mais dépendantes du contexte individuel (fatigue, stress, âge, discipline, historique).
                  </p>

                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <p className="text-foreground font-semibold text-center text-sm sm:text-base">
                        Les décisions finales d'entraînement appartiennent toujours au coach et à l'athlète.
                      </p>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 5 — Philosophie */}
          <AccordionItem value="philosophie" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="font-semibold text-left">🧭 Philosophie Two For Coaching Lab</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4 sm:p-6 space-y-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      <strong className="text-foreground">Nous ne cherchons pas à automatiser l'entraînement.</strong>
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      Nous cherchons à rendre visibles les mécanismes physiologiques, les compromis et les risques.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                      Two For Coaching Lab structure l'information, explique le "pourquoi", et laisse le contrôle humain au centre du processus.
                    </p>
                  </div>

                  <Separator />

                  {/* Citation finale en évidence */}
                  <Card className="border-2 border-primary/40 bg-primary/10">
                    <CardContent className="p-6 sm:p-8">
                      <blockquote className="text-center space-y-2">
                        <p className="text-lg sm:text-xl font-semibold text-foreground italic">
                          "Nous n'essayons pas de prédire la performance,
                        </p>
                        <p className="text-lg sm:text-xl font-semibold text-foreground italic">
                          nous essayons d'éclairer la décision d'entraînement."
                        </p>
                      </blockquote>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </main>
    </div>
  );
}
