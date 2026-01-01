import { Info, GraduationCap, Target, Shield, BarChart3, BookOpen, Settings, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MethodologyStaffProps {
  onGoToTab?: (tab: string) => void;
}

export function MethodologyStaff({ onGoToTab }: MethodologyStaffProps) {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-4 rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Méthodologie & Mode Staff</h1>
            <p className="text-muted-foreground">Guide scientifique officiel de Vince's Lab</p>
          </div>
        </div>
      </div>

      {/* Indice de Confiance */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            🔬 Indice de confiance – Définition et usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
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
          <p>
            Vince's Lab est un <strong className="text-foreground">outil d'aide à la décision pour coachs et staffs</strong>, basé sur :
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
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
      </div>
    </div>
  );
}
