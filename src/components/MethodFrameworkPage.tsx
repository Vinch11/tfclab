/**
 * Page officielle "Two For Coaching Lab Method™"
 * 
 * Affiche le cadre scientifique complet avec les 3 piliers.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  BookOpen,
  Ruler,
  FlaskConical,
  Lightbulb,
  TrendingUp,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import {
  METHOD_OFFICIAL_POSITIONING,
  PILLAR_MEASURED,
  PILLAR_MODELED,
  PILLAR_ADVISED,
  RANGE_RULE,
  SCORE_DISPLAY_FORMAT,
  DASHBOARD_UI_RULE,
  PERFORMANCE_RANGES,
  type PillarDefinition
} from '@/lib/v2/methodFramework';
import { METHOD_VERSION_DISPLAY } from '@/lib/v2/scientificGovernance';

interface MethodFrameworkPageProps {
  variant?: 'full' | 'compact' | 'pillars-only';
  className?: string;
}

export function MethodFrameworkPage({ 
  variant = 'full',
  className = '' 
}: MethodFrameworkPageProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Two For Coaching Lab Method™</h1>
        <p className="text-muted-foreground">Cadre Scientifique et Opérationnel</p>
        <Badge variant="outline">{METHOD_VERSION_DISPLAY}</Badge>
      </div>

      {/* Positionnement officiel */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Positionnement Officiel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-line leading-relaxed">
            {METHOD_OFFICIAL_POSITIONING.statement}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {METHOD_OFFICIAL_POSITIONING.coreValues.map((value, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Les 3 piliers */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Structure Officielle — 3 Piliers
        </h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <PillarCard pillar={PILLAR_MEASURED} icon={<Ruler className="h-5 w-5" />} />
          <PillarCard pillar={PILLAR_MODELED} icon={<FlaskConical className="h-5 w-5" />} />
          <PillarCard pillar={PILLAR_ADVISED} icon={<Lightbulb className="h-5 w-5" />} />
        </div>
      </div>

      {variant === 'full' && (
        <>
          {/* Règle des plages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                {RANGE_RULE.title}
              </CardTitle>
              <CardDescription>
                Fin des objectifs absolus — Place aux plages contextualisées
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-line">
                  {RANGE_RULE.statement}
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-2">
                {PERFORMANCE_RANGES.map((range) => (
                  <div 
                    key={range.category} 
                    className={`p-3 rounded-lg ${range.bgColor} flex items-center justify-between`}
                  >
                    <div>
                      <span className={`font-medium ${range.color}`}>{range.label}</span>
                      <p className="text-xs text-muted-foreground">{range.description}</p>
                    </div>
                    {range.category === 'realistic' && RANGE_RULE.example && (
                      <Badge variant="outline" className="text-xs">
                        {RANGE_RULE.example.correct.realistic}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  Facteurs de justification :
                </p>
                <div className="flex flex-wrap gap-2">
                  {RANGE_RULE.justificationFactors.map((factor) => (
                    <Badge key={factor.id} variant="outline" className="text-xs">
                      {factor.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Format d'affichage des scores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Affichage des Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-mono">{SCORE_DISPLAY_FORMAT.example}</p>
              </div>
              
              <div className="grid gap-2">
                {SCORE_DISPLAY_FORMAT.requiredElements.map((element, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{element}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Règle Dashboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                {DASHBOARD_UI_RULE.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-line">
                {DASHBOARD_UI_RULE.statement}
              </p>
              
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  Interdit :
                </p>
                <div className="space-y-1">
                  {DASHBOARD_UI_RULE.forbidden.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <span>❌</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================
// COMPOSANT PILIER
// ============================================

function PillarCard({ pillar, icon }: { pillar: PillarDefinition; icon: React.ReactNode }) {
  return (
    <Card className={`border-l-4 ${pillar.bgColor}`} style={{ borderLeftColor: pillar.color.includes('green') ? '#16a34a' : pillar.color.includes('amber') ? '#d97706' : '#2563eb' }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {pillar.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {pillar.description}
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="items" className="border-none">
            <AccordionTrigger className="text-xs py-2">
              Voir les {pillar.items.length} éléments
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1">
                {pillar.items.map((item) => (
                  <div key={item.id} className="text-xs">
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-muted-foreground"> — {item.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <div className={`p-2 rounded text-xs ${pillar.bgColor}`}>
          <p className="italic whitespace-pre-line">{pillar.officialText}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default MethodFrameworkPage;
