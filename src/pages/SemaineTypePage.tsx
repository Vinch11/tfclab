// =============================================
// ÉCRAN 5 - SEMAINE TYPE
// =============================================

import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, Calendar, AlertCircle, Dumbbell, Coffee, Zap } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { genererSemaineType, JourSemaine } from "@/lib/semaineGenerator";
import { toast } from "sonner";

export default function SemaineTypePage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();

  if (!currentAthlete) {
    return (
      <AppLayout title="Semaine Type" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sélectionnez un athlète</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voir les athlètes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const semaine = genererSemaineType(currentAthlete);

  if (!semaine) {
    return (
      <AppLayout title="Semaine Type" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground">
              Ajoutez des données NOLIO pour générer la semaine
            </p>
            <Button onClick={() => navigate("/snapshot")} className="mt-4">
              Ajouter des données
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const getJourIcon = (jour: JourSemaine) => {
    if (jour.estCle) return <Dumbbell className="h-4 w-4 text-primary" />;
    if (jour.type === "Repos" || jour.type === "Z1") return <Coffee className="h-4 w-4 text-muted-foreground" />;
    return <Zap className="h-4 w-4 text-accent" />;
  };

  const handleCopy = () => {
    const text = semaine.semaine
      .map((j) => `${j.jour}: ${j.nom || j.type} - ${j.objectif}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Semaine copiée");
  };

  return (
    <AppLayout title="Semaine Type" showBack>
      <div className="space-y-6 animate-fade-in">
        {/* Résumé */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold">Priorité: {semaine.priorite}</span>
              </div>
              <Badge variant="secondary">{semaine.nbSeancesCles} clés</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>VLamax: {semaine.vlamax.toFixed(2)}</span>
              <span>TTE: {semaine.tte} min</span>
              <span>Volume: {semaine.volumeTotal}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liste des jours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Programme hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {semaine.semaine.map((jour, index) => (
                <AccordionItem key={index} value={jour.jour}>
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      {getJourIcon(jour)}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{jour.jour}</span>
                          {jour.estCle && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              CLÉ
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {jour.nom || jour.type}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-2 pl-7">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Objectif:</span>
                        <span className="text-sm">{jour.objectif}</span>
                      </div>
                      {jour.intensite && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Intensité:</span>
                          <span className="text-sm">{jour.intensite}</span>
                        </div>
                      )}
                      {jour.duree && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Durée:</span>
                          <span className="text-sm">{jour.duree}</span>
                        </div>
                      )}
                      {jour.format && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Format:</span>
                          <span className="text-sm">{jour.format}</span>
                        </div>
                      )}
                      {jour.contenu && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Contenu:</span>
                          <span className="text-sm">{jour.contenu}</span>
                        </div>
                      )}
                      {jour.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {jour.description}
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Action */}
        <Button onClick={handleCopy} className="w-full gap-2" variant="outline">
          <Copy className="h-4 w-4" />
          Copier pour NOLIO
        </Button>
      </div>
    </AppLayout>
  );
}
