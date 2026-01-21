/**
 * Completed Tests View
 * Display all tests completed by the athlete with results and calibration impact
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Bike, 
  PersonStanding,
  Calendar,
  BadgeCheck,
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { getConfidenceLabel } from "@/data/testProtocolsLibrary";

interface TestRecord {
  id: string;
  athlete_id: string;
  type: string;
  name: string;
  sport?: string | null;
  date: string;
  reliability?: number | null;
  vlamax?: number | null;
  raw?: unknown;
}

interface CompletedTestsViewProps {
  tests: TestRecord[];
  sportFilter: "all" | "bike" | "run";
}

export function CompletedTestsView({ tests, sportFilter }: CompletedTestsViewProps) {
  const filteredTests = useMemo(() => {
    let filtered = [...tests];
    if (sportFilter !== "all") {
      filtered = filtered.filter(t => t.sport === sportFilter);
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests, sportFilter]);
  
  // Group by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, TestRecord[]> = {};
    filteredTests.forEach(test => {
      const monthKey = format(new Date(test.date), "MMMM yyyy", { locale: fr });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(test);
    });
    return groups;
  }, [filteredTests]);
  
  // Calculate calibration impact summary
  const calibrationSummary = useMemo(() => {
    let vlamaxTests = 0;
    let tteTests = 0;
    let fatmaxTests = 0;
    let economyTests = 0;
    let totalConfidenceBoost = 0;
    let lastVlamax: number | null = null;
    let lastTTE: number | null = null;
    
    filteredTests.forEach(test => {
      const raw = (typeof test.raw === 'object' && test.raw !== null) 
        ? test.raw as Record<string, any> 
        : null;
      
      const category = raw?.category || test.type;
      
      if (category === "VLAMAX" || test.type.toLowerCase().includes("vlamax")) {
        vlamaxTests++;
        if (test.vlamax) lastVlamax = test.vlamax;
        else if (raw?.estimatedVlamax) lastVlamax = raw.estimatedVlamax;
        totalConfidenceBoost += 0.15;
      }
      if (category === "TTE" || test.type.toLowerCase().includes("tte")) {
        tteTests++;
        if (raw?.tte_minutes) lastTTE = raw.tte_minutes;
        totalConfidenceBoost += 0.20;
      }
      if (category === "FATMAX" || test.type.toLowerCase().includes("fatmax")) {
        fatmaxTests++;
        totalConfidenceBoost += 0.10;
      }
      if (category === "ECONOMY" || test.type.toLowerCase().includes("economy")) {
        economyTests++;
        totalConfidenceBoost += 0.10;
      }
      
      // Add custom tfclImpact if available
      if (raw?.tfclImpact) {
        const impacts = raw.tfclImpact as Array<{ confidenceBoost: number }>;
        // Override with actual values from test
        totalConfidenceBoost = Math.max(totalConfidenceBoost, 
          impacts.reduce((acc, i) => acc + i.confidenceBoost, 0));
      }
    });
    
    return {
      vlamaxTests,
      tteTests,
      fatmaxTests,
      economyTests,
      totalConfidenceBoost: Math.min(totalConfidenceBoost, 0.50), // Cap at 50%
      lastVlamax,
      lastTTE,
      hasData: vlamaxTests > 0 || tteTests > 0 || fatmaxTests > 0 || economyTests > 0
    };
  }, [filteredTests]);
  
  const getSportIcon = (sport?: string | null) => {
    switch (sport) {
      case "bike": return <Bike className="w-4 h-4" />;
      case "run": return <PersonStanding className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };
  
  const getCategoryColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("VLAMAX")) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (t.includes("TTE")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (t.includes("FATMAX")) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (t.includes("ECONOMY")) return "bg-green-500/10 text-green-500 border-green-500/20";
    return "bg-muted text-muted-foreground";
  };
  
  const getImpactDescription = (test: TestRecord) => {
    const raw = (typeof test.raw === 'object' && test.raw !== null) 
      ? test.raw as Record<string, any> 
      : null;
    
    const category = raw?.category || test.type.toUpperCase();
    const impacts: string[] = [];
    
    if (category.includes("VLAMAX")) {
      impacts.push("VLamax calibrée");
      if (raw?.sprintRatio) impacts.push(`SR: ${raw.sprintRatio.toFixed(2)}`);
    }
    if (category.includes("TTE")) {
      impacts.push("TTE calibré");
      if (raw?.tteCategory) impacts.push(`Catégorie: ${raw.tteCategory}`);
    }
    if (category.includes("FATMAX")) {
      impacts.push("FatMax zone définie");
    }
    if (category.includes("ECONOMY")) {
      impacts.push("Économie calibrée");
    }
    
    return impacts;
  };
  
  if (filteredTests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucun test réalisé</p>
        <p className="text-sm mt-1">Commencez par un test de la bibliothèque pour alimenter vos calculs</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Calibration Impact Summary */}
      {calibrationSummary.hasData && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Impact sur les Calculs TFCL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Les tests réalisés affinent directement les modèles VLamax, TTE et la confiance globale du profil.
            </p>
            
            {/* Confidence Boost Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Boost de confiance totale</span>
                <span className="font-medium text-primary">
                  +{(calibrationSummary.totalConfidenceBoost * 100).toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={calibrationSummary.totalConfidenceBoost * 200} 
                className="h-2"
              />
            </div>
            
            {/* Parameter Impacts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {calibrationSummary.vlamaxTests > 0 && (
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                  <div className="text-lg font-bold text-purple-500">
                    {calibrationSummary.lastVlamax?.toFixed(2) || calibrationSummary.vlamaxTests}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {calibrationSummary.lastVlamax ? "VLamax" : "tests VLamax"}
                  </div>
                </div>
              )}
              {calibrationSummary.tteTests > 0 && (
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="text-lg font-bold text-blue-500">
                    {calibrationSummary.lastTTE || calibrationSummary.tteTests}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {calibrationSummary.lastTTE ? "min TTE" : "tests TTE"}
                  </div>
                </div>
              )}
              {calibrationSummary.fatmaxTests > 0 && (
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                  <div className="text-lg font-bold text-orange-500">{calibrationSummary.fatmaxTests}</div>
                  <div className="text-xs text-muted-foreground">tests FatMax</div>
                </div>
              )}
              {calibrationSummary.economyTests > 0 && (
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <div className="text-lg font-bold text-green-500">{calibrationSummary.economyTests}</div>
                  <div className="text-xs text-muted-foreground">tests Économie</div>
                </div>
              )}
            </div>
            
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Ces résultats sont utilisés dans le Dashboard avec le toggle AVANT/APRÈS pour comparer modèle vs terrain.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{filteredTests.length}</div>
            <div className="text-xs text-muted-foreground">Tests réalisés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {calibrationSummary.vlamaxTests}
            </div>
            <div className="text-xs text-muted-foreground">Tests VLamax</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {calibrationSummary.tteTests}
            </div>
            <div className="text-xs text-muted-foreground">Tests TTE</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {filteredTests.filter(t => (t.reliability || 0) >= 0.8).length}
            </div>
            <div className="text-xs text-muted-foreground">Haute confiance</div>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      {/* Tests by Month */}
      {Object.entries(groupedByMonth).map(([month, monthTests]) => (
        <div key={month} className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-medium text-sm capitalize">{month}</h3>
            <Badge variant="secondary" className="text-xs">{monthTests.length}</Badge>
          </div>
          
          <div className="grid gap-2">
            {monthTests.map(test => {
              const confidence = getConfidenceLabel(test.reliability || 0);
              const raw = (typeof test.raw === 'object' && test.raw !== null) 
                ? test.raw as Record<string, any> 
                : null;
              const impacts = getImpactDescription(test);
              
              return (
                <Card key={test.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
                          {getSportIcon(test.sport)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{test.name}</span>
                            <Badge variant="outline" className={`text-xs ${getCategoryColor(test.type)}`}>
                              {raw?.category || test.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(test.date), "d MMM yyyy", { locale: fr })}</span>
                            <span className={confidence.color}>
                              <BadgeCheck className="w-3 h-3 inline mr-0.5" />
                              {confidence.label}
                            </span>
                          </div>
                          
                          {/* Impact Pills */}
                          {impacts.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <ArrowRight className="w-3 h-3 text-green-500" />
                              {impacts.map((impact, i) => (
                                <Badge key={i} variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                  {impact}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Result Preview */}
                      <div className="text-right shrink-0">
                        {test.vlamax && (
                          <div className="text-sm font-medium text-purple-500">
                            {test.vlamax.toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">mmol/L/s</span>
                          </div>
                        )}
                        {raw?.estimatedVlamax && !test.vlamax && (
                          <div className="text-sm font-medium text-purple-500">
                            {raw.estimatedVlamax.toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">mmol/L/s</span>
                          </div>
                        )}
                        {raw?.tte_minutes && (
                          <div className="text-sm font-medium text-blue-500">
                            {raw.tte_minutes}
                            <span className="text-xs text-muted-foreground ml-1">min TTE</span>
                          </div>
                        )}
                        {raw?.fatmaxW && (
                          <div className="text-sm font-medium text-orange-500">
                            {raw.fatmaxW}
                            <span className="text-xs text-muted-foreground ml-1">W FatMax</span>
                          </div>
                        )}
                        {raw?.economyScore && (
                          <div className="text-sm font-medium text-green-500">
                            {raw.economyScore}
                            <span className="text-xs text-muted-foreground ml-1">score</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
