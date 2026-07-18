/**
 * Panneau self-test du filet de réparation JSON conservatrice.
 * - Client-only, ne consomme aucun crédit gateway.
 * - Miroir exact de la logique edge (voir jsonRepairSelfTest.ts pour la note d'alignement).
 * - But : prouver POSITIVEMENT que le filet répare bien virgule traînante /
 *   BOM / rééquilibrage ≤3, complémentaire du monitoring passif en prod.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runJsonRepairSelfTest, type RepairTestResult } from "@/lib/plan/qa/jsonRepairSelfTest";

export function JsonRepairSelfTestPanel() {
  const [results, setResults] = useState<RepairTestResult[] | null>(null);
  const passCount = results?.filter(r => r.pass).length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Filet réparation JSON — self-test (négatif)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Injecte 5 payloads volontairement malformés (virgule traînante, BOM,
          accolades manquantes, combo, irréparable) et vérifie que la logique
          <code className="mx-1">conservativeJsonRepair</code> se comporte comme
          attendu. Client-only, aucun appel gateway.
        </p>
        <Button size="sm" onClick={() => setResults(runJsonRepairSelfTest())}>
          Lancer le self-test
        </Button>
        {results && (
          <div className="space-y-2">
            <div className="text-sm">
              <b>{passCount}/{results.length}</b> passing
            </div>
            <ul className="space-y-1 text-xs">
              {results.map(r => (
                <li key={r.name} className="rounded border border-border/60 p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.pass ? "default" : "destructive"}>
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">{r.detail}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
