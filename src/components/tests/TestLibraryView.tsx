/**
 * Test Library View
 * Display all available test protocols with filtering
 */

import { useMemo } from "react";
import { 
  Bike, 
  PersonStanding,
  Clock,
  Target,
  Zap,
  ChevronRight,
  BadgeCheck,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  IntegratedTestProtocol, 
  TestSport,
  getDifficultyLabel,
  getConfidenceLabel,
  TFCL_REFERENCE_WEEK
} from "@/data/testProtocolsLibrary";

interface TestLibraryViewProps {
  tests: IntegratedTestProtocol[];
  sportFilter: "all" | "bike" | "run";
  onStartTest: (test: IntegratedTestProtocol) => void;
}

export function TestLibraryView({ tests, sportFilter, onStartTest }: TestLibraryViewProps) {
  const filteredTests = useMemo(() => {
    if (sportFilter === "all") return tests;
    return tests.filter(t => t.sport === sportFilter);
  }, [tests, sportFilter]);
  
  const bikeTests = filteredTests.filter(t => t.sport === "bike");
  const runTests = [...filteredTests.filter(t => t.sport === "run")].sort((a, b) => {
    if (a.id === "run_vlamax_sprint_15s_12min") return -1;
    if (b.id === "run_vlamax_sprint_15s_12min") return 1;
    return 0;
  });
  
  const getSportIcon = (sport: TestSport) => {
    switch (sport) {
      case "bike": return <Bike className="w-4 h-4" />;
      case "run": return <PersonStanding className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "VLAMAX": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "TTE": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "FATMAX": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "ECONOMY": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };
  
  const renderTestCard = (test: IntegratedTestProtocol) => {
    const difficulty = getDifficultyLabel(test.difficulty);
    const confidence = getConfidenceLabel(test.reliabilityScore);
    
    return (
      <Card 
        key={test.id} 
        className="cursor-pointer hover:border-primary/50 transition-all group"
        onClick={() => onStartTest(test)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                {getSportIcon(test.sport)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm">{test.shortName}</h3>
                  <Badge variant="outline" className={getCategoryColor(test.category)}>
                    {test.category}
                  </Badge>
                  {test.id === "run_vlamax_sprint_15s_12min" && (
                    <Badge className="bg-primary text-primary-foreground">★ Recommandé</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {test.objective}
                </p>
                
                {/* Metadata */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{test.warmup.reduce((acc, s) => acc + s.durationMin, 0) + test.protocol.length * 5} min</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${difficulty.color}`}>
                    <AlertTriangle className="w-3 h-3" />
                    <span>{difficulty.label}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${confidence.color}`}>
                    <BadgeCheck className="w-3 h-3" />
                    <span>Confiance: {confidence.label}</span>
                  </div>
                </div>
                
                {/* Target Parameters */}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {test.targetParameters.map((param, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {param}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Reference Week Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            {TFCL_REFERENCE_WEEK.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            {TFCL_REFERENCE_WEEK.objective}
          </p>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-green-500 border-green-500/30">
              +{(TFCL_REFERENCE_WEEK.globalConfidenceBoost * 100).toFixed(0)}% confiance globale
            </Badge>
            <Badge variant="outline" className="text-primary border-primary/30">
              {TFCL_REFERENCE_WEEK.days.filter(d => d.type === "test").length} tests en 7 jours
            </Badge>
          </div>
          
          {/* Week Timeline */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {TFCL_REFERENCE_WEEK.days.map((day) => (
              <div 
                key={day.day}
                className={`flex-1 min-w-[60px] p-2 rounded-lg text-center text-xs ${
                  day.type === "test" 
                    ? "bg-primary/10 border border-primary/30" 
                    : day.type === "recovery"
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-muted/50 border border-border"
                }`}
              >
                <div className="font-medium">J{day.day}</div>
                <div className="text-muted-foreground truncate">{day.title}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Bike Tests */}
      {bikeTests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Tests Vélo</h2>
            <Badge variant="secondary">{bikeTests.length}</Badge>
          </div>
          <div className="grid gap-3">
            {bikeTests.map(renderTestCard)}
          </div>
        </div>
      )}
      
      {bikeTests.length > 0 && runTests.length > 0 && (
        <Separator />
      )}
      
      {/* Run Tests */}
      {runTests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PersonStanding className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Tests Course à Pied</h2>
            <Badge variant="secondary">{runTests.length}</Badge>
          </div>
          <div className="grid gap-3">
            {runTests.map(renderTestCard)}
          </div>
        </div>
      )}
      
      {filteredTests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun test disponible pour ce filtre</p>
        </div>
      )}
    </div>
  );
}
