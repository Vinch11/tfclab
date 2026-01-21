/**
 * Completed Tests View
 * Display all tests completed by the athlete with results
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Bike, 
  PersonStanding,
  Calendar,
  BadgeCheck,
  Target
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  // All hooks must be called before any conditional returns
  const filteredTests = useMemo(() => {
    let filtered = [...tests];
    if (sportFilter !== "all") {
      filtered = filtered.filter(t => t.sport === sportFilter);
    }
    // Sort by date descending
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests, sportFilter]);
  
  // Group by month - must be before early return
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, TestRecord[]> = {};
    filteredTests.forEach(test => {
      const monthKey = format(new Date(test.date), "MMMM yyyy", { locale: fr });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(test);
    });
    return groups;
  }, [filteredTests]);
  
  const getSportIcon = (sport?: string | null) => {
    switch (sport) {
      case "bike": return <Bike className="w-4 h-4" />;
      case "run": return <PersonStanding className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case "VLAMAX": return "bg-primary/10 text-primary border-primary/20";
      case "TTE": return "bg-accent/10 text-accent-foreground border-accent/20";
      case "FATMAX": return "bg-secondary text-secondary-foreground border-secondary";
      default: return "bg-muted text-muted-foreground";
    }
  };
  
  // Early return AFTER all hooks
  if (filteredTests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucun test réalisé</p>
        <p className="text-sm mt-1">Commencez par un test de la bibliothèque</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
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
            <div className="text-2xl font-bold text-primary">
              {filteredTests.filter(t => t.type === "VLAMAX").length}
            </div>
            <div className="text-xs text-muted-foreground">Tests VLamax</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {filteredTests.filter(t => t.type === "TTE").length}
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
                ? test.raw as Record<string, number> 
                : null;
              
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
                            <Badge variant="outline" className={`text-xs ${getTypeColor(test.type)}`}>
                              {test.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(test.date), "d MMM yyyy", { locale: fr })}</span>
                            <span className={confidence.color}>
                              <BadgeCheck className="w-3 h-3 inline mr-0.5" />
                              {confidence.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Result Preview */}
                      <div className="text-right shrink-0">
                        {test.vlamax && (
                          <div className="text-sm font-medium text-primary">
                            {test.vlamax.toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">mmol/L/s</span>
                          </div>
                        )}
                        {raw?.tte_minutes && (
                          <div className="text-sm font-medium text-primary">
                            {raw.tte_minutes}
                            <span className="text-xs text-muted-foreground ml-1">min TTE</span>
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
