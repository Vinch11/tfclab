import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Zap, 
  Timer, 
  Target, 
  Flame, 
  Activity, 
  BookOpen, 
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  Heart,
  Clock,
  Shield
} from "lucide-react";
import { AGE_METHODOLOGY } from "@/lib/ageAdjustment";

// =============================================
// PAGE "COMPRENDRE MES SCORES"
// Regroupe toutes les explications pédagogiques
// =============================================

export default function ComprendreScoresPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Comprendre mes scores
        </h1>
        <p className="text-muted-foreground">
          Guide complet pour interpréter vos métriques physiologiques et optimiser votre préparation.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section VLamax */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5 text-yellow-500" />
              VLamax – Vitesse maximale de production de lactate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Le VLamax (ou VLa max) mesure la puissance de votre système anaérobie glycolytique, 
              c'est-à-dire votre capacité à produire de l'énergie rapidement à partir des glucides.
            </p>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="interpretation">
                <AccordionTrigger className="text-sm font-medium">
                  📊 Comment interpréter le VLamax ?
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                      <Badge variant="outline" className="bg-green-500/20 text-green-700">{"< 0.30"}</Badge>
                      <span className="text-sm">Profil très endurant – idéal pour Ironman/Ultra</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700">0.30 – 0.40</Badge>
                      <span className="text-sm">Équilibré – polyvalent pour 70.3 / Marathon</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-700">0.40 – 0.50</Badge>
                      <span className="text-sm">Glycolytique – favorise les efforts courts</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                      <Badge variant="outline" className="bg-red-500/20 text-red-700">{"> 0.50"}</Badge>
                      <span className="text-sm">Très glycolytique – adapté sprints/explosivité</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="impact">
                <AccordionTrigger className="text-sm font-medium">
                  💡 Impact sur la performance
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>VLamax élevé</strong> → consommation glucidique importante = risque de défaillance énergétique sur longue distance</li>
                    <li>• <strong>VLamax bas</strong> → meilleure utilisation des graisses = économie de glycogène</li>
                    <li>• La cible dépend de votre objectif : ce qui est bon pour un sprinteur est mauvais pour un Ironman</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="sources">
                <AccordionTrigger className="text-sm font-medium">
                  🔬 Sources de données (hiérarchie)
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li><strong>Test lactate</strong> – mesure directe en laboratoire (gold standard)</li>
                    <li><strong>Test terrain</strong> – protocole sprint/récup validé</li>
                    <li><strong>Estimation snapshot</strong> – calcul basé sur FTP/Pmax</li>
                    <li><strong>Valeur par défaut</strong> – estimation générique selon l'objectif</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section TTE */}
        <Card className="border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Timer className="w-5 h-5 text-blue-500" />
              TTE – Time To Exhaustion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Le TTE représente la durée maximale pendant laquelle vous pouvez maintenir une intensité 
              donnée (généralement au seuil). C'est un indicateur clé de l'endurance.
            </p>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="interpretation">
                <AccordionTrigger className="text-sm font-medium">
                  📊 Comment interpréter le TTE ?
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                      <Badge variant="outline" className="bg-red-500/20 text-red-700">{"< 30 min"}</Badge>
                      <span className="text-sm">Insuffisant pour longue distance</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-700">30 – 45 min</Badge>
                      <span className="text-sm">Correct pour formats courts</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700">45 – 60 min</Badge>
                      <span className="text-sm">Bon pour 70.3 / Marathon</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                      <Badge variant="outline" className="bg-green-500/20 text-green-700">{"> 60 min"}</Badge>
                      <span className="text-sm">Excellent – prêt pour Ironman</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="calcul">
                <AccordionTrigger className="text-sm font-medium">
                  ⚙️ Comment est-il calculé ?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Mode OBSERVED</strong> → test réel effectué (valeur directe)</li>
                    <li>• <strong>Mode LOAD</strong> → estimation basée sur la charge d'entraînement (TSS)</li>
                    <li>• Le TTE estimé tient compte du volume et de l'intensité des 7 derniers jours</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section Risque Glycolytique */}
        <Card className="border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Risque Glycolytique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Le risque glycolytique est un indicateur de la dépendance de l'athlète aux glucides 
              à l'intensité cible de son objectif.
            </p>
            
            <Alert className="bg-muted/50">
              <Info className="w-4 h-4" />
              <AlertDescription>
                Cet indicateur n'est pas un jugement de performance, mais un outil d'aide à la décision 
                pour orienter l'entraînement et la stratégie nutritionnelle.
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="composantes">
                <AccordionTrigger className="text-sm font-medium">
                  🧩 Composantes du risque
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>VLamax</strong> – vitesse de production du lactate</li>
                    <li>• <strong>TTE</strong> – capacité à maintenir une intensité élevée</li>
                    <li>• <strong>Durée et intensité</strong> de l'épreuve visée</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    Un risque élevé signifie que l'athlète utilise rapidement ses réserves de glucides 
                    et peut rencontrer une baisse de performance si la nutrition et l'endurance ne sont pas adaptées.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="echelle">
                <AccordionTrigger className="text-sm font-medium">
                  📊 Échelle du risque
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                      <Badge variant="outline" className="bg-green-500/20 text-green-700">0 – 25</Badge>
                      <span className="text-sm"><strong>Faible</strong> → profil endurant, faible dépendance glucidique</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-700">26 – 50</Badge>
                      <span className="text-sm"><strong>Modéré</strong> → équilibre correct, nutrition stratégique</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-700">51 – 75</Badge>
                      <span className="text-sm"><strong>Élevé</strong> → dépendance glucidique importante</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                      <Badge variant="outline" className="bg-red-500/20 text-red-700">76 – 100</Badge>
                      <span className="text-sm"><strong>Critique</strong> → risque de défaillance énergétique</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="utilite">
                <AccordionTrigger className="text-sm font-medium">
                  🎯 Utilité pratique
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Orienter l'entraînement (endurance vs glycolytique)</li>
                    <li>• Ajuster la stratégie nutritionnelle</li>
                    <li>• Sécuriser la performance le jour de course</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section Race Readiness */}
        <Card className="border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="w-5 h-5 text-green-500" />
              Race Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Race Readiness est un outil d'aide à la décision destiné aux coachs et staffs. 
              Il évalue la cohérence entre le profil physiologique actuel de l'athlète et les exigences de son objectif.
            </p>
            
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Ce score ne constitue ni une prédiction de performance ni une garantie de résultat. 
                Il doit être interprété avec le contexte d'entraînement.
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="piliers">
                <AccordionTrigger className="text-sm font-medium">
                  🏛️ Les 4 piliers du score
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        VLamax effectif
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Indique la dominance glucidique vs lipidique. Interprété différemment selon la distance.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Puissance / Allure durable
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        FTP ou allure seuil – toujours interprétée en lien avec le TTE.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Timer className="w-4 h-4 text-blue-500" />
                        TTE effectif
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tolérance à l'effort prolongé. Central pour longue distance.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-500" />
                        Objectif sportif
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ironman ≠ Sprint ≠ Marathon. La pondération dépend explicitement de l'objectif.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="confiance">
                <AccordionTrigger className="text-sm font-medium">
                  📈 Indice de confiance
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Un indice de confiance accompagne chaque score pour indiquer la robustesse de l'analyse :
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• <strong>{">"} 80%</strong> – Données fiables, score exploitable</li>
                    <li>• <strong>60-80%</strong> – Données partielles, interpréter avec prudence</li>
                    <li>• <strong>{"<"} 60%</strong> – Données insuffisantes, compléter le profil</li>
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    La confiance diminue de 1% par semaine depuis le dernier test.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section Économie de Course */}
        <Card className="border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="w-5 h-5 text-purple-500" />
              Économie de Course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              En course à pied, la performance dépend autant de l'économie de mouvement que des capacités métaboliques. 
              Une mauvaise économie augmente la consommation énergétique et les besoins nutritionnels.
            </p>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="definition">
                <AccordionTrigger className="text-sm font-medium">
                  📖 Définition opérationnelle
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    L'économie de course représente le coût énergétique pour maintenir une allure donnée.
                    À VLamax et VO₂max égaux, l'athlète le plus économique :
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Performe mieux</li>
                    <li>• Consomme moins de glucides</li>
                    <li>• Fatigue moins vite</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="donnees">
                <AccordionTrigger className="text-sm font-medium">
                  📊 Données utilisées
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Allure à une intensité donnée (ex : allure marathon)</li>
                    <li>• Fréquence cardiaque associée</li>
                    <li>• Stabilité de la FC dans le temps (dérive)</li>
                    <li>• Historique de charge (TTE effectif)</li>
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    Aucune mesure de laboratoire obligatoire.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section Nutrition Prédictive */}
        <Card className="border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Heart className="w-5 h-5 text-pink-500" />
              Nutrition Prédictive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Les besoins glucidiques sont estimés à partir des caractéristiques physiologiques de l'athlète 
              (VLamax, endurance, économie de mouvement).
            </p>
            
            <Alert className="bg-muted/50">
              <Info className="w-4 h-4" />
              <AlertDescription>
                Ces valeurs sont des plages recommandées, destinées à guider la stratégie nutritionnelle 
                et non à remplacer les tests terrain.
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="principes">
                <AccordionTrigger className="text-sm font-medium">
                  🧬 Principes clés
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>VLamax élevé</strong> → forte combustion glucidique</li>
                    <li>• <strong>TTE élevé</strong> → meilleure capacité à soutenir une intensité</li>
                    <li>• <strong>Économie faible</strong> → surcoût énergétique</li>
                    <li>• <strong>CAP {">"} Vélo</strong> → contrainte mécanique + digestive plus élevée</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section Fondements Scientifiques */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="w-5 h-5 text-muted-foreground" />
              Fondements scientifiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Cette méthodologie s'appuie sur des modèles énergétiques reconnus et des données terrain validées :
              </p>
              <ul className="space-y-1">
                <li>• Modèles énergétiques (Mader, INSCYD-like)</li>
                <li>• Relations VLamax ↔ oxydation glucidique</li>
                <li>• Concepts utilisés par Dan Lorang, WKO, INSCYD</li>
                <li>• Données terrain + logique staff (pas de boîte noire)</li>
              </ul>
              <Alert className="mt-4 bg-muted/30">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <AlertDescription>
                  L'objectif est la transparence : chaque score est explicable et chaque recommandation est justifiée.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Section Âge */}
        <Card className="border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5 text-orange-500" />
              {AGE_METHODOLOGY.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-line">
              {AGE_METHODOLOGY.mainText}
            </p>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="principles">
                <AccordionTrigger className="text-sm font-medium">
                  📋 Principes clés
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid gap-2">
                    {AGE_METHODOLOGY.principles.map((principle, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{principle}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="how-it-works">
                <AccordionTrigger className="text-sm font-medium">
                  ⚙️ Comment ça fonctionne ?
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                      <Badge variant="outline" className="text-green-600 border-green-500/30">{"< 30 ans"}</Badge>
                      <span className="text-sm">Référence – interprétation standard</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                      <Badge variant="outline" className="text-blue-600 border-blue-500/30">30-39 ans</Badge>
                      <span className="text-sm">Léger ajustement des cibles et risques</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
                      <Badge variant="outline" className="text-orange-600 border-orange-500/30">40-49 ans</Badge>
                      <span className="text-sm">Priorité sur la fraîcheur et la nutrition</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                      <Badge variant="outline" className="text-red-600 border-red-500/30">50+ ans</Badge>
                      <span className="text-sm">Interprétation conservative, recommandations adaptées</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="staff-note">
                <AccordionTrigger className="text-sm font-medium">
                  👨‍⚕️ Note pour les coachs
                </AccordionTrigger>
                <AccordionContent>
                  <Alert className="bg-muted/50">
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      {AGE_METHODOLOGY.staffNote}
                    </AlertDescription>
                  </Alert>
                  <p className="text-xs text-muted-foreground mt-3">
                    {AGE_METHODOLOGY.disclaimer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
