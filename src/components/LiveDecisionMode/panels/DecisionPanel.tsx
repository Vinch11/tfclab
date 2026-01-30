/**
 * DECISION PANEL — Coach decision support
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Clock, VolumeX, Heart, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDecisionColor,
  getDecisionBg,
  type CoachDecision,
  type SuggestedMessage,
} from "@/lib/v2/liveDecisionEngine";

interface DecisionPanelProps {
  decision: CoachDecision;
  suggestedMessages: SuggestedMessage[];
  selectedMessage: string | null;
  onSelectMessage: (msg: string | null) => void;
}

const ACTION_ICONS = {
  silence: VolumeX,
  reassure: Heart,
  instruct: Zap,
  wait: Clock,
};

const ACTION_LABELS = {
  silence: "Garder le silence",
  reassure: "Message rassurant",
  instruct: "Consigne simple",
  wait: "Attendre",
};

export function DecisionPanel({
  decision,
  suggestedMessages,
  selectedMessage,
  onSelectMessage,
}: DecisionPanelProps) {
  const ActionIcon = ACTION_ICONS[decision.suggestedAction];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Décision coach
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Main decision indicator */}
        <div className={cn("p-4 rounded-lg text-center", getDecisionBg(decision.level))}>
          <span className="text-3xl">{decision.icon}</span>
          <p className={cn("font-bold mt-2", getDecisionColor(decision.level))}>
            {decision.label}
          </p>
        </div>

        {/* Justification */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground font-medium mb-1">Lecture TFCL:</p>
          <p className="text-sm">{decision.justification}</p>
        </div>

        {/* Recommended action */}
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            decision.suggestedAction === "silence" && "bg-green-100 dark:bg-green-900/30",
            decision.suggestedAction === "wait" && "bg-yellow-100 dark:bg-yellow-900/30",
            decision.suggestedAction === "reassure" && "bg-blue-100 dark:bg-blue-900/30",
            decision.suggestedAction === "instruct" && "bg-orange-100 dark:bg-orange-900/30"
          )}>
            <ActionIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{ACTION_LABELS[decision.suggestedAction]}</p>
            {decision.waitMinutes && (
              <p className="text-xs text-muted-foreground">
                Réévaluer dans {decision.waitMinutes} min
              </p>
            )}
          </div>
        </div>

        {/* Recommendation */}
        <p className="text-xs text-muted-foreground italic">
          {decision.recommendation}
        </p>

        {/* Suggested messages */}
        {suggestedMessages.length > 0 && (
          <div className="flex-1 flex flex-col">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Messages suggérés
            </p>
            <div className="space-y-2">
              {suggestedMessages.map((msg) => (
                <Button
                  key={msg.id}
                  variant={selectedMessage === msg.text ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left h-auto py-2",
                    msg.tone === "urgent" && !selectedMessage && "border-red-300 text-red-700 dark:text-red-400"
                  )}
                  onClick={() => onSelectMessage(selectedMessage === msg.text ? null : msg.text)}
                >
                  <span className="text-sm">"{msg.text}"</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
