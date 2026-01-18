/**
 * LegalDisclaimer — Garde-fous légaux et éthiques
 * 
 * Affiche les disclaimers légaux de manière discrète mais claire:
 * - Pas de diagnostic médical
 * - Pas de prescription thérapeutique
 * - Outil d'aide à la décision sportive
 */

import React from 'react';
import { Info, AlertCircle, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { VALIDATION_TEXTS } from '@/lib/v2/validationFramework';
import { cn } from '@/lib/utils';

// =============================================
// TYPES
// =============================================

interface LegalDisclaimerProps {
  variant?: 'inline' | 'footer' | 'card' | 'tooltip';
  showIcon?: boolean;
  className?: string;
}

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function LegalDisclaimer({ 
  variant = 'inline',
  showIcon = true,
  className 
}: LegalDisclaimerProps) {
  switch (variant) {
    case 'footer':
      return <FooterDisclaimer className={className} />;
    case 'card':
      return <CardDisclaimer showIcon={showIcon} className={className} />;
    case 'tooltip':
      return <TooltipDisclaimer className={className} />;
    default:
      return <InlineDisclaimer showIcon={showIcon} className={className} />;
  }
}

// =============================================
// VARIANTES
// =============================================

function InlineDisclaimer({ 
  showIcon, 
  className 
}: { 
  showIcon?: boolean; 
  className?: string; 
}) {
  return (
    <p className={cn(
      "text-xs text-muted-foreground flex items-start gap-1",
      className
    )}>
      {showIcon && <Info className="h-3 w-3 mt-0.5 shrink-0" />}
      <span>
        Outil d'aide à la décision sportive. Ne fournit aucun diagnostic médical ni prescription.
      </span>
    </p>
  );
}

function FooterDisclaimer({ className }: { className?: string }) {
  return (
    <footer className={cn(
      "mt-8 pt-4 border-t text-center",
      className
    )}>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Two For Coaching Lab™</span>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-1 max-w-md mx-auto">
        {VALIDATION_TEXTS.LEGAL_DISCLAIMER}
      </p>
    </footer>
  );
}

function CardDisclaimer({ 
  showIcon, 
  className 
}: { 
  showIcon?: boolean; 
  className?: string; 
}) {
  return (
    <div className={cn(
      "p-3 bg-muted/30 rounded-lg border border-muted",
      className
    )}>
      <div className="flex items-start gap-2">
        {showIcon && (
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Avertissement légal
          </p>
          <p className="text-xs text-muted-foreground/80">
            {VALIDATION_TEXTS.LEGAL_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}

function TooltipDisclaimer({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={cn(
            "text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1",
            className
          )}>
            <Shield className="h-3 w-3" />
            <span>Avertissement</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{VALIDATION_TEXTS.LEGAL_DISCLAIMER}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================
// POSITIONNEMENT STRATÉGIQUE
// =============================================

export function StrategicPositioning({ className }: { className?: string }) {
  return (
    <div className={cn(
      "p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20",
      className
    )}>
      <blockquote className="text-sm italic text-foreground/80 leading-relaxed">
        "{VALIDATION_TEXTS.STRATEGIC_POSITIONING}"
      </blockquote>
      <p className="text-xs text-muted-foreground mt-2 text-right">
        — Two For Coaching Lab Method™
      </p>
    </div>
  );
}

// =============================================
// PRINCIPE FONDATEUR
// =============================================

export function FoundationalPrinciple({ 
  compact = false,
  className 
}: { 
  compact?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (compact) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className={cn(
            "text-xs text-primary hover:text-primary/80 underline underline-offset-2",
            className
          )}>
            Principe de modélisation
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Principe fondateur</DialogTitle>
            <DialogDescription>
              Two For Coaching Lab Method™
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-line">
              {VALIDATION_TEXTS.FOUNDATIONAL_PRINCIPLE}
            </p>
            <hr />
            <p className="text-xs text-muted-foreground">
              {VALIDATION_TEXTS.COACH_DISCLAIMER}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <div className={cn(
      "p-4 bg-muted/50 rounded-lg border space-y-2",
      className
    )}>
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium">Principe fondateur</h4>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-line">
        {VALIDATION_TEXTS.FOUNDATIONAL_PRINCIPLE}
      </p>
    </div>
  );
}

// =============================================
// COACH DISCLAIMER
// =============================================

export function CoachDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn(
      "text-xs text-muted-foreground italic flex items-center gap-1",
      className
    )}>
      <Info className="h-3 w-3" />
      {VALIDATION_TEXTS.COACH_DISCLAIMER}
    </p>
  );
}
