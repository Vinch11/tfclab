/**
 * TFCL Testing Week Page
 * Main page for the TFCL Reference Week protocol
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
  Beaker,
  Target,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TFCL_TESTING_WEEK, computeTFCLCompletion } from "@/data/tfclTestingWeek";
import { TFCLDayCard } from "./TFCLDayCard";
import { TFCLTestSheet } from "./TFCLTestSheet";
import { TFCLCompletionSummary } from "./TFCLCompletionSummary";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAthletes } from "@/contexts/AthleteContext";
import { AthleteSelector } from "@/components/AthleteSelector";

export function TFCLTestingWeekPage() {
  const navigate = useNavigate();
  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes();
  const { snapshots, getSnapshotsForAthlete, addSnapshot, updateSnapshot } = useCloudDataContext();
  
  const [activeTestDay, setActiveTestDay] = useState<string | null>(null);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );

  const activeSnapshot = useMemo(() => {
    if (!selectedAthlete) return null;
    const athleteSnapshots = getSnapshotsForAthlete(selectedAthlete.id);
    if (selectedAthlete.active_snapshot_id) {
      return athleteSnapshots.find((s) => s.id === selectedAthlete.active_snapshot_id) || athleteSnapshots[0] || null;
    }
    return athleteSnapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [selectedAthlete, getSnapshotsForAthlete]);

  const completionStatus = useMemo(() => {
    if (!activeSnapshot) return null;
    const snap = activeSnapshot as unknown as Record<string, unknown>;
    return computeTFCLCompletion({
      p30s_w: snap.p30s_w as number | null,
      p60s_w: snap.p60s_w as number | null,
      map5min_w: snap.map5min_w as number | null,
      ftp: activeSnapshot.ftp,
      tte_observed_min: activeSnapshot.tte_observed_min,
      protocol_quality: snap.protocol_quality as number | null
    });
  }, [activeSnapshot]);

  const handleCloseTestSheet = () => {
    setActiveTestDay(null);
  };

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
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Beaker className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">
                    {TFCL_TESTING_WEEK.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Protocole de calibration VLamax V2
                  </p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl space-y-6">
        {/* Athlete Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Sélectionner l'athlète
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AthleteSelector
              athletes={athletes}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
            />
            {!selectedAthlete && (
              <p className="text-sm text-muted-foreground mt-2">
                Sélectionnez un athlète pour commencer la semaine de tests
              </p>
            )}
          </CardContent>
        </Card>

        {/* Completion Summary */}
        {selectedAthlete && completionStatus && (
          <TFCLCompletionSummary 
            status={completionStatus} 
            snapshot={activeSnapshot}
          />
        )}

        {/* Description */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {TFCL_TESTING_WEEK.description}
          </AlertDescription>
        </Alert>

        {/* Prerequisites */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="prerequisites" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Prérequis et conditions de validité
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Équipement requis</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {TFCL_TESTING_WEEK.prerequisites.equipment.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Conditions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {TFCL_TESTING_WEEK.prerequisites.conditions.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2 text-orange-500">⚠️ Avertissements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {TFCL_TESTING_WEEK.prerequisites.warnings.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-orange-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Days */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programme de la semaine
          </h2>
          
          <ScrollArea className="w-full">
            <div className="space-y-3">
              {TFCL_TESTING_WEEK.days.map((day) => (
                <TFCLDayCard
                  key={day.dayKey}
                  day={day}
                  onStartTest={() => setActiveTestDay(day.dayKey)}
                  disabled={!selectedAthlete}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </main>

      {/* Test Sheet Modal */}
      {activeTestDay && selectedAthlete && (
        <TFCLTestSheet
          dayKey={activeTestDay}
          athlete={selectedAthlete}
          snapshot={activeSnapshot}
          onClose={handleCloseTestSheet}
          onSave={async (data) => {
            // Save logic will be in TFCLTestSheet
            handleCloseTestSheet();
          }}
        />
      )}
    </div>
  );
}
