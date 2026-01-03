// =============================================
// VLAMAX EXPLANATION CARD - Texte pédagogique
// Explique pourquoi VLamax n'est pas saisissable directement
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, FlaskConical, Calculator, Lock, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface VLamaxExplanationCardProps {
  isStaffMode?: boolean;
  compact?: boolean;
}

export function VLamaxExplanationCard({ isStaffMode = false, compact = false }: VLamaxExplanationCardProps) {
  if (compact) {
    return (
      <Alert className="border-border bg-secondary/30">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Pourquoi la VLamax n'est pas saisissable ?</strong>
          <br />
          La VLamax est calculée automatiquement à partir des données du snapshot pour garantir la cohérence.
          {isStaffMode && (
            <span className="text-primary ml-1">
              Mode Staff : vous pouvez renseigner une VLamax mesurée (lactate).
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          Pourquoi la VLamax n'est pas saisissable ?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          La VLamax est une donnée physiologique complexe qui doit soit être <strong>mesurée en laboratoire</strong>, 
          soit <strong>estimée à partir de tests de terrain</strong>.
        </p>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Pour garantir la <strong>cohérence et la fiabilité</strong> des analyses, 
          Two For Coaching Lab calcule automatiquement la VLamax à partir des données du snapshot 
          (FTP, Pmax 5s, poids).
        </p>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="hierarchy" className="border-border">
            <AccordionTrigger className="text-sm font-medium">
              Hiérarchie des sources VLamax
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                    #1
                  </Badge>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      VLamax mesurée (lactate)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confiance ~95% • Mode Staff uniquement • Verrouille la valeur
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                    #2
                  </Badge>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <FlaskConical className="h-3 w-3" />
                      Test terrain structuré
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confiance ~75% • Sprint 15s, all-out, ramp test
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                    #3
                  </Badge>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calculator className="h-3 w-3" />
                      Estimation via snapshot
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confiance ~55% • Basée sur FTP/kg et Pmax
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="bg-muted text-muted-foreground shrink-0">
                    #4
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">Valeur par défaut</p>
                    <p className="text-xs text-muted-foreground">
                      Confiance faible • Avertissement affiché
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {isStaffMode ? (
          <Alert className="border-primary/30 bg-primary/5">
            <Lock className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm text-primary">Mode Staff activé</AlertTitle>
            <AlertDescription className="text-sm">
              Vous pouvez renseigner une <strong>VLamax mesurée (lactate)</strong> qui deviendra 
              la source prioritaire. Toute estimation automatique sera désactivée.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              En <strong>mode Staff</strong>, il est possible de renseigner une VLamax mesurée 
              qui devient alors la référence principale.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Version inline pour affichage dans les formulaires
export function VLamaxFieldExplanation({ isStaffMode = false }: { isStaffMode?: boolean }) {
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <p className="flex items-center gap-1">
        <Info className="h-3 w-3" />
        La VLamax est calculée automatiquement (FTP, Pmax, poids).
      </p>
      {isStaffMode ? (
        <p className="text-primary">
          Mode Staff : renseignez une VLamax mesurée (lactate) pour verrouiller la valeur.
        </p>
      ) : (
        <p>
          Activez le Mode Staff pour saisir une VLamax mesurée en laboratoire.
        </p>
      )}
    </div>
  );
}
