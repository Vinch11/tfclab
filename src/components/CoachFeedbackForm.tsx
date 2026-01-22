/**
 * Coach Feedback Loop Form
 * Module 10 - Formulaire de validation coach après bloc d'entraînement
 */

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Star,
  MessageSquare,
  TrendingUp,
  Battery
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CoachValidationStatus } from "@/lib/v2/decisionReliabilityEngine";
import { cn } from "@/lib/utils";

interface CoachFeedbackFormProps {
  blockStartDate: string;
  blockEndDate: string;
  athleteName: string;
  onSubmit: (feedback: CoachFeedback) => Promise<void>;
  className?: string;
}

export interface CoachFeedback {
  status: CoachValidationStatus;
  modelCoherenceRating: number; // 1-5
  responseAccuracyRating: number; // 1-5
  observedFatigue: string;
  notes: string;
}

export function CoachFeedbackForm({
  blockStartDate,
  blockEndDate,
  athleteName,
  onSubmit,
  className
}: CoachFeedbackFormProps) {
  const [status, setStatus] = useState<CoachValidationStatus>('pending');
  const [modelCoherence, setModelCoherence] = useState<number>(3);
  const [responseAccuracy, setResponseAccuracy] = useState<number>(3);
  const [observedFatigue, setObservedFatigue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        status,
        modelCoherenceRating: modelCoherence,
        responseAccuracyRating: responseAccuracy,
        observedFatigue,
        notes
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { value: CoachValidationStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'validated', label: 'Validé', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-500' },
    { value: 'adjusted', label: 'Ajusté', icon: <Edit3 className="w-4 h-4" />, color: 'text-yellow-500' },
    { value: 'rejected', label: 'Rejeté', icon: <XCircle className="w-4 h-4" />, color: 'text-red-500' }
  ];

  const renderStars = (value: number, onChange: (v: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={cn(
            "p-1 rounded transition-colors",
            star <= value ? "text-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500/50"
          )}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Validation Coach - Bloc d'Entraînement
        </CardTitle>
        <CardDescription>
          Bloc du {new Date(blockStartDate).toLocaleDateString('fr-FR')} au{' '}
          {new Date(blockEndDate).toLocaleDateString('fr-FR')} • {athleteName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Statut de validation */}
        <div className="space-y-3">
          <Label>Statut de validation</Label>
          <RadioGroup
            value={status}
            onValueChange={(v) => setStatus(v as CoachValidationStatus)}
            className="grid grid-cols-3 gap-3"
          >
            {statusOptions.map((option) => (
              <div key={option.value}>
                <RadioGroupItem
                  value={option.value}
                  id={`status-${option.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`status-${option.value}`}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                    "hover:bg-muted/50"
                  )}
                >
                  <span className={option.color}>{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Cohérence du modèle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Cohérence du modèle avec la réalité
            </Label>
            <Badge variant="outline">{modelCoherence}/5</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Les prédictions TFCL correspondaient-elles aux observations terrain?
          </p>
          {renderStars(modelCoherence, setModelCoherence)}
        </div>

        {/* Réponse de l'athlète */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-green-500" />
              Réponse à l'entraînement
            </Label>
            <Badge variant="outline">{responseAccuracy}/5</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            L'athlète a-t-il progressé comme prévu? Récupéré correctement?
          </p>
          {renderStars(responseAccuracy, setResponseAccuracy)}
        </div>

        {/* Fatigue observée */}
        <div className="space-y-2">
          <Label>Fatigue observée</Label>
          <RadioGroup
            value={observedFatigue}
            onValueChange={setObservedFatigue}
            className="flex flex-wrap gap-2"
          >
            {['Aucune', 'Légère', 'Modérée', 'Importante', 'Surmenage'].map((option) => (
              <div key={option} className="flex items-center">
                <RadioGroupItem
                  value={option}
                  id={`fatigue-${option}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`fatigue-${option}`}
                  className={cn(
                    "px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-all",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                    "hover:bg-muted/50"
                  )}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes et observations</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations sur le bloc, ajustements effectués, points à surveiller..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || status === 'pending'}
          className="w-full"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer le feedback'}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Ce feedback contribue à améliorer les modèles TFCL de manière anonymisée
        </p>
      </CardContent>
    </Card>
  );
}
