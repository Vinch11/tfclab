import { Info, GraduationCap, Target, Shield, BarChart3, BookOpen, Settings, ChevronRight, ExternalLink, Bike, Footprints, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MethodologyStaffProps {
  onGoToTab?: (tab: string) => void;
}

export function MethodologyStaff({ onGoToTab }: MethodologyStaffProps) {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-8">
      {/* Header principal */}
      <div className="glass-card p-6 border-primary/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">🧠 Méthodologie scientifique — Two For Coaching Lab</h1>
            <p className="text-muted-foreground">Référentiel officiel d'interprétation physiologique pour coachs et staff</p>
          </div>
        </div>
        <Separator className="my-4" />
        <p className="text-sm text-muted-foreground">
          Two For Coaching Lab est un laboratoire de performance destiné aux coachs et staffs d'endurance.
          L'application ne fournit pas de vérité absolue, mais des indicateurs physiologiques cohérents permettant de comprendre 
          comment un athlète produit, soutient et utilise son énergie selon son objectif.
          Toutes les analyses sont contextualisées, pondérées par la discipline et la distance, et conçues pour soutenir la décision humaine — jamais la remplacer.
        </p>
      </div>

      {/* Messages clés - Positionnement */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            ⚡ Messages clés à retenir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Race Readiness est un outil staff</strong>, pondéré par l'objectif de course
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">VLamax et TTE n'ont pas de valeur universelle</strong> — ils dépendent du sport et de l'objectif
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Vélo et course à pied</strong> obéissent à des logiques physiologiques différentes
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Two For Coaching Lab structure la décision du coach</strong>, il ne la remplace pas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1 : Race Readiness */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            🎯 Race Readiness — Score de préparation pondéré
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Définition</h4>
            <p className="text-muted-foreground text-sm">
              Le score Race Readiness combine quatre dimensions physiologiques pour estimer la capacité de l'athlète 
              à performer sur son objectif de course. <strong className="text-foreground">Ce n'est pas un prédicteur de performance</strong>, 
              mais un indicateur de cohérence entre le profil physiologique actuel et les exigences de l'objectif.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Composantes du score</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">VLamax (Moteur glycolytique)</p>
                <p className="text-xs text-muted-foreground mt-1">Capacité anaérobie lactique — doit être dans la plage cible</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">TTE (Endurance au seuil)</p>
                <p className="text-xs text-muted-foreground mt-1">Time To Exhaustion — temps tenable à FTP/CSS</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">FTP/kg (Puissance relative)</p>
                <p className="text-xs text-muted-foreground mt-1">Puissance ou allure au seuil rapportée au poids</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="font-medium text-foreground text-sm">Fraîcheur</p>
                <p className="text-xs text-muted-foreground mt-1">État de fatigue, séance spécifique validée</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Pondération par objectif</h4>
            <p className="text-muted-foreground text-sm mb-3">
              Le poids de chaque composante varie selon l'objectif. Un Ironman valorise davantage l'endurance (TTE) 
              et un VLamax bas, tandis qu'un 70.3 privilégie la puissance relative.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-foreground">Objectif</th>
                    <th className="text-center py-2 px-2 text-foreground">VLamax</th>
                    <th className="text-center py-2 px-2 text-foreground">TTE</th>
                    <th className="text-center py-2 px-2 text-foreground">FTP/kg</th>
                    <th className="text-center py-2 px-2 text-foreground">Fraîcheur</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">Ironman / Ultra</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">20%</td>
                    <td className="text-center py-2 px-2">20%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">70.3 / Half</td>
                    <td className="text-center py-2 px-2">25%</td>
                    <td className="text-center py-2 px-2">25%</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">20%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">Marathon / Semi</td>
                    <td className="text-center py-2 px-2">20%</td>
                    <td className="text-center py-2 px-2">35%</td>
                    <td className="text-center py-2 px-2">30%</td>
                    <td className="text-center py-2 px-2">15%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Trail</td>
                    <td className="text-center py-2 px-2">25%</td>
                    <td className="text-center py-2 px-2">35%</td>
                    <td className="text-center py-2 px-2">20%</td>
                    <td className="text-center py-2 px-2">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">⚠️ Interprétation</strong> : Un score de 75 pour un Ironman et un score de 75 pour un 70.3 
              ne signifient pas la même chose. Le score est <strong className="text-foreground">relatif à l'objectif déclaré</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 : VLamax */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            ⚡ VLamax — Capacité glycolytique maximale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Définition</h4>
            <p className="text-muted-foreground text-sm">
              VLamax (mmol/L/s) représente la vitesse maximale de production de lactate par la voie glycolytique. 
              C'est un indicateur du "moteur anaérobie" de l'athlète. Une VLamax élevée favorise les efforts courts et intenses, 
              une VLamax basse favorise l'endurance et l'économie métabolique.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Plages cibles selon l'objectif</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="font-medium text-foreground text-sm">Ironman / Ultra-endurance</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.25 – 0.40 mmol/L/s</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="font-medium text-foreground text-sm">70.3 / Half Distance</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.25 – 0.45 mmol/L/s</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="font-medium text-foreground text-sm">Marathon / Semi-marathon</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.30 – 0.50 mmol/L/s</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="font-medium text-foreground text-sm">Trail</p>
                <p className="text-xs text-muted-foreground mt-1">Cible : 0.25 – 0.45 mmol/L/s</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <h4 className="font-semibold text-foreground mb-2">💡 VLamax Effectif</h4>
            <p className="text-sm text-muted-foreground">
              Vince's Lab calcule une <strong className="text-foreground">VLamax Effectif</strong> qui priorise les tests terrain (fiabilité haute) 
              puis les snapshots si aucun test n'est disponible. L'indice de confiance reflète la qualité de la source.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">⚠️ Attention</strong> : Une VLamax "trop basse" peut indiquer un manque de capacité à relancer, 
              problématique en trail ou en course avec variations de rythme. L'optimum dépend du profil de course.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3 : TTE */}
      <Card className="border-warning/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <Info className="w-5 h-5" />
            </div>
            ⏱️ TTE — Time To Exhaustion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Définition</h4>
            <p className="text-muted-foreground text-sm">
              Le TTE (Time To Exhaustion) représente le temps maximal théorique qu'un athlète peut tenir à son seuil fonctionnel 
              (FTP en vélo, CSS en natation, allure seuil en course à pied). C'est un marqueur clé de l'endurance au seuil.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Cibles selon l'objectif</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">Ironman</p>
                <p className="font-bold text-foreground">55+ min</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">70.3</p>
                <p className="font-bold text-foreground">50+ min</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">Marathon</p>
                <p className="font-bold text-foreground">50+ min</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-center">
                <p className="text-xs text-muted-foreground">Trail</p>
                <p className="font-bold text-foreground">55+ min</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <h4 className="font-semibold text-foreground mb-2">💡 TTE Effectif</h4>
            <p className="text-sm text-muted-foreground">
              Le TTE Effectif est calculé soit à partir d'une observation directe (test terrain ou course), 
              soit estimé via un modèle basé sur la charge d'entraînement (TSS/7j) et le profil métabolique.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">📊 Méthode PRO</strong> : Lorsque le mode TTE Pro est activé, 
              le calcul intègre le modèle de Dan Lorang pour une estimation plus précise basée sur VLamax et VO2max.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4 : Vélo vs Course à pied - APPROFONDI */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bike className="w-5 h-5" />
            </div>
            🚴‍♂️ Vélo vs 🏃‍♂️ Course à pied — Comprendre les différences physiologiques clés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* 1️⃣ Introduction */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary">1️⃣</span> Le vélo et la course à pied ne sollicitent pas le métabolisme de la même façon
            </h4>
            <p className="text-muted-foreground text-sm">
              Dans Vince's Lab, les indicateurs VLamax, TTE et Race Readiness doivent toujours être interprétés 
              en tenant compte du sport pratiqué.
            </p>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 mt-3">
              <p className="text-sm text-foreground font-medium">
                ➡️ Une même valeur physiologique n'a PAS la même signification en vélo et en course à pied.
              </p>
            </div>
          </div>

          <Separator />

          {/* 2️⃣ Économie de mouvement */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">2️⃣</span> Économie de mouvement : la grande différence clé
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bike className="w-5 h-5 text-primary" />
                  <h5 className="font-semibold text-foreground">Vélo</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Mouvement contraint, mécanique et très stable</li>
                  <li>• Rendement élevé et mesurable directement via la puissance</li>
                  <li>• L'économie est principalement liée au rendement neuromusculaire et au positionnement</li>
                  <li>• Deux athlètes avec la même FTP et le même VLamax auront souvent des performances proches</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-primary/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ Le vélo est un sport <strong>hautement prédictible</strong> physiologiquement
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Footprints className="w-5 h-5 text-accent" />
                  <h5 className="font-semibold text-foreground">Course à pied</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Mouvement libre, impactant, très dépendant de la technique</li>
                  <li>• L'économie de course varie énormément entre deux athlètes au même VO₂max</li>
                  <li>• La fatigue musculaire et tendineuse joue un rôle majeur</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-accent/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ En CAP, <strong>l'économie de course est souvent plus déterminante</strong> que le VO₂max ou le VLamax
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 3️⃣ Dérive physiologique */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">3️⃣</span> Dérive physiologique et fatigue périphérique
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bike className="w-5 h-5 text-primary" />
                  <h5 className="font-semibold text-foreground">Vélo</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Dérive cardiaque généralement lente</li>
                  <li>• Charge mécanique faible (pas d'impact)</li>
                  <li>• La limitation est surtout métabolique (substrats, VLamax, TTE)</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-success/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ Le TTE est un <strong>excellent indicateur</strong> de performance vélo longue durée
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Footprints className="w-5 h-5 text-accent" />
                  <h5 className="font-semibold text-foreground">Course à pied</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Dérive cardiaque plus rapide à intensité équivalente</li>
                  <li>• Accumulation de fatigue musculaire excentrique</li>
                  <li>• Dégradation progressive de l'économie de course</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-warning/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ En CAP, un TTE élevé <strong>ne garantit PAS</strong> la capacité à maintenir l'allure cible
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 4️⃣ Nutrition */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">4️⃣</span> Nutrition : un impact différent selon le sport
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bike className="w-5 h-5 text-primary" />
                  <h5 className="font-semibold text-foreground">Vélo</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Apports glucidiques élevés possibles (80–120 g/h)</li>
                  <li>• Absorption facilitée par la position et l'absence d'impact</li>
                  <li>• VLamax élevé = consommation de glucides plus rapide</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-primary/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ En vélo, la nutrition peut <strong>compenser partiellement</strong> un VLamax élevé
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Footprints className="w-5 h-5 text-accent" />
                  <h5 className="font-semibold text-foreground">Course à pied</h5>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Apports glucidiques plus limités (60–90 g/h maximum)</li>
                  <li>• Tolérance digestive plus faible</li>
                  <li>• Impact mécanique qui limite l'oxydation des graisses à haute intensité</li>
                </ul>
                <div className="mt-3 p-2 rounded bg-destructive/10">
                  <p className="text-xs text-foreground font-medium">
                    ➡️ En CAP, un VLamax trop élevé devient <strong>rapidement pénalisant</strong> sur longue distance
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 5️⃣ Conséquences dans Vince's Lab */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">5️⃣</span> Conséquences directes dans Vince's Lab
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Le <strong className="text-foreground">Race Readiness est pondéré</strong> par l'objectif ET par le sport
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Les seuils "idéaux" de VLamax <strong className="text-foreground">ne sont PAS identiques</strong> vélo vs CAP
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Le TTE est <strong className="text-foreground">plus fiable en vélo</strong> qu'en course à pied
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Les décisions finales doivent toujours être <strong className="text-foreground">validées par le coach</strong>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 6️⃣ Message clé staff */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="text-primary">6️⃣</span> Message clé pour le staff
            </h4>
            
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-3">
                🧠 <strong className="text-foreground">Vince's Lab ne cherche pas à donner un score universel.</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-2">Il fournit :</p>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• des indicateurs physiologiques cohérents</li>
                <li>• un cadre d'analyse structuré</li>
                <li>• une aide à la décision spécifique au sport et à l'objectif</li>
              </ul>
              <div className="mt-4 p-3 rounded bg-warning/10 border border-warning/20">
                <p className="text-sm text-foreground font-medium">
                  👉 L'expertise du coach reste centrale, surtout en course à pied.
                </p>
              </div>
            </div>
          </div>

          {/* Mention finale */}
          <div className="p-4 rounded-lg bg-secondary border border-border">
            <p className="text-sm text-muted-foreground italic text-center">
              "Les modèles physiologiques sont plus robustes en vélo qu'en course à pied.<br />
              Vince's Lab adapte donc ses interprétations pour respecter la réalité du terrain."
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Indice de Confiance */}
      <Card className="border-success/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <Shield className="w-5 h-5" />
            </div>
            🔬 Indice de confiance – Définition et usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p className="text-sm">
            L'indice de confiance indique le <strong className="text-foreground">niveau de fiabilité scientifique</strong> des valeurs affichées dans Vince's Lab (VLamax, TTE, Race Readiness).
            Il ne mesure pas la performance de l'athlète, mais la <strong className="text-foreground">qualité des données</strong> utilisées pour produire l'analyse.
          </p>
          
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm">
              <strong className="text-foreground">Une valeur élevée signifie</strong> que le résultat repose sur :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>des tests terrain structurés,</li>
              <li>des protocoles connus,</li>
              <li>ou des snapshots complets et cohérents.</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm">
              <strong className="text-foreground">Une valeur plus faible indique</strong> que la donnée est :
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>estimée indirectement,</li>
              <li>ou calculée à partir de modèles physiologiques et de charge d'entraînement.</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-secondary border border-border">
            <p className="text-sm">
              👉 L'indice de confiance est <strong className="text-foreground">calculé automatiquement</strong> et ne peut pas être modifié manuellement.
            </p>
            <p className="text-sm mt-2">
              👉 Il augmente lorsque le staff <strong className="text-foreground">ajoute des tests</strong>, précise les protocoles, ou enrichit les snapshots.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Échelle de l'indice de confiance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            📊 Échelle de l'indice de confiance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <Badge className="bg-success text-success-foreground">0.95 – 1.00</Badge>
                <span className="text-sm text-foreground">Test laboratoire ou test terrain très fiable</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10">
              <div className="flex items-center gap-3">
                <Badge className="bg-success/80 text-success-foreground">0.80 – 0.94</Badge>
                <span className="text-sm text-foreground">Test terrain structuré avec protocole identifié</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-3">
                <Badge className="bg-warning text-warning-foreground">0.65 – 0.79</Badge>
                <span className="text-sm text-foreground">Snapshot complet</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
              <div className="flex items-center gap-3">
                <Badge className="bg-warning/80 text-warning-foreground">0.45 – 0.64</Badge>
                <span className="text-sm text-foreground">Estimation indirecte</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-3">
                <Badge className="bg-destructive text-destructive-foreground">&lt; 0.45</Badge>
                <span className="text-sm text-foreground">Données incomplètes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Philosophie scientifique */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            🧠 Philosophie scientifique de Vince's Lab
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p className="text-sm">
            Vince's Lab est un <strong className="text-foreground">outil d'aide à la décision pour coachs et staffs</strong>, basé sur :
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
            <li>la physiologie de l'effort,</li>
            <li>les interactions <strong className="text-foreground">FTP – VLamax – TTE</strong>,</li>
            <li>l'adaptation à l'objectif de course.</li>
          </ul>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-4">
            <p className="text-sm">
              ⚠️ L'application <strong className="text-foreground">ne prédit pas la performance</strong>, elle structure l'analyse physiologique pour <strong className="text-foreground">guider les décisions d'entraînement</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mode Staff / Expert */}
      <Card className="border-warning/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <Settings className="w-5 h-5" />
            </div>
            👨‍💼 Mode Staff / Expert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary" />
              Activation
            </h4>
            <p className="text-sm text-muted-foreground">
              Accessible via un toggle "Mode Staff" dans les paramètres ou le dashboard.
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-semibold text-foreground mb-3">✅ Quand le mode est activé</h4>
            <p className="text-sm text-muted-foreground mb-2">Afficher :</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>source des données (test / snapshot / estimation),</li>
              <li>indice de confiance chiffré,</li>
              <li>labels de qualité,</li>
              <li>valeurs effectives (VLamax effectif, TTE effectif).</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-secondary border border-border">
            <h4 className="font-semibold text-foreground mb-3">🔒 Quand le mode est désactivé</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Interface simplifiée</li>
              <li>Lecture grand public</li>
              <li>Pas de jargon scientifique</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-sm text-muted-foreground">
              ⚠️ Le Mode Staff <strong className="text-foreground">n'influence jamais les calculs</strong>, uniquement l'affichage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Badges automatiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            🏷️ Badges automatiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
              <Badge className="bg-success text-success-foreground">🟢 High Data Quality</Badge>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Badge className="bg-warning text-warning-foreground">🟡 Estimated</Badge>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <Badge className="bg-destructive text-destructive-foreground">🔴 Low Confidence – Add Tests</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liens vers les sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <ExternalLink className="w-5 h-5" />
            </div>
            🔗 Accès rapide aux scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onGoToTab?.("dashboard")}
              className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Race Readiness</span>
              </div>
              <p className="text-xs text-muted-foreground">Score de préparation global pondéré selon l'objectif</p>
            </button>
            
            <button
              onClick={() => onGoToTab?.("vlamax")}
              className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                <span className="font-medium text-foreground">VLamax</span>
              </div>
              <p className="text-xs text-muted-foreground">Capacité glycolytique et profil métabolique</p>
            </button>
            
            <button
              onClick={() => onGoToTab?.("vlamax")}
              className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-warning" />
                <span className="font-medium text-foreground">TTE</span>
              </div>
              <p className="text-xs text-muted-foreground">Time To Exhaustion – Endurance au seuil</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Message clé final */}
      <div className="glass-card p-6 border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">🏁 Message clé</h3>
        </div>
        <p className="text-muted-foreground text-center text-lg italic">
          « Vince's Lab aide le staff à identifier la <strong className="text-foreground">priorité physiologique réelle</strong> de l'athlète, 
          avec un <strong className="text-foreground">niveau de confiance clairement affiché</strong>. »
        </p>
        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground text-center">
          Ce référentiel est la documentation officielle de Vince's Lab. 
          Pour toute question d'interprétation, référez-vous à ce document.
        </p>
      </div>
    </div>
  );
}
