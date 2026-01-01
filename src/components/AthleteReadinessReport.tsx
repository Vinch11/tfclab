// =============================================
// ATHLETE READINESS REPORT - Vue simple et rassurante
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Lightbulb, Heart, Utensils, Sparkles } from "lucide-react";
import { AthleteReadinessReport as AthleteReadinessData } from "@/lib/athleteReadiness";

interface AthleteReadinessReportProps {
  report: AthleteReadinessData;
  athleteName: string;
  objectif: string;
}

export function AthleteReadinessReport({ report, athleteName, objectif }: AthleteReadinessReportProps) {
  const scoreColorClasses = {
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  const scoreBgClasses = {
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    red: "bg-red-50 border-red-200",
  };

  const scoreTextClasses = {
    green: "text-green-700",
    orange: "text-orange-700",
    red: "text-red-700",
  };

  return (
    <Card className="border-2 shadow-lg overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">VINCE'S LAB</p>
            <CardTitle className="text-2xl font-bold mt-1">Mon État de Forme</CardTitle>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {athleteName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* 1️⃣ Message Principal */}
        <div className={`p-6 rounded-xl border-2 ${scoreBgClasses[report.scoreColor]}`}>
          <p className={`text-xl font-semibold text-center ${scoreTextClasses[report.scoreColor]}`}>
            {report.mainMessage}
          </p>
        </div>

        {/* 2️⃣ Score de Préparation */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full ${scoreColorClasses[report.scoreColor]} flex items-center justify-center shadow-lg`}>
              <span className="text-3xl font-bold text-white">{report.score}%</span>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-lg font-medium ${scoreTextClasses[report.scoreColor]}`}>
              {report.scoreText}
            </p>
          </div>
        </div>

        <Separator />

        {/* 3️⃣ Ce qui est bien préparé */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-lg">Ce qui est bien préparé</h3>
          </div>
          <ul className="space-y-2 pl-7">
            {report.wellPrepared.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 4️⃣ Ce qui doit être surveillé */}
        {report.toWatch.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-lg">Ce qui doit être surveillé</h3>
            </div>
            <ul className="space-y-2 pl-7">
              {report.toWatch.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* 5️⃣ Conseil Clé du Jour J */}
        <div className="bg-primary/5 rounded-xl p-5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-1">Conseil clé le jour J</h3>
              <p className="text-primary font-medium text-lg">
                {report.keyAdvice}
              </p>
            </div>
          </div>
        </div>

        {/* 6️⃣ Nutrition */}
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
          <Utensils className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Nutrition</h4>
            <p className="text-muted-foreground">{report.nutritionMessage}</p>
          </div>
        </div>

        <Separator />

        {/* 7️⃣ Message de Confiance Final */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <Heart className="h-5 w-5 text-red-400" />
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground/80 italic">
            "{report.confidenceMessage}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
