/**
 * Two For Coaching Lab Method™ v1.0 — Référentiel Officiel
 * 
 * Composant affichant le document fondateur complet.
 * Accessible depuis : Academy, Dashboard, Rapports PDF
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  BookOpen, 
  Brain, 
  BarChart3, 
  FlaskConical, 
  Target, 
  ArrowRightLeft,
  Flag,
  Scale,
  Handshake,
  Tag
} from 'lucide-react';
import {
  OFFICIAL_INTRODUCTION,
  FOUNDING_PHILOSOPHY,
  MEASURED_DATA,
  MODELED_DATA,
  CONFIDENCE_INDICES,
  APPLICATION_OUTPUTS,
  POTENTIEL_DEFINITION,
  APP_CAPABILITIES,
  RESPONSIBILITY_ETHICS,
  VERSIONING_STATEMENT,
  OFFICIAL_REFERENCE_DOCUMENT
} from '@/lib/v2/officialReference';

const sectionIcons: Record<string, React.ReactNode> = {
  introduction: <BookOpen className="h-5 w-5" />,
  philosophy: <Brain className="h-5 w-5" />,
  measured: <BarChart3 className="h-5 w-5" />,
  modeled: <FlaskConical className="h-5 w-5" />,
  confidence: <Target className="h-5 w-5" />,
  outputs: <ArrowRightLeft className="h-5 w-5" />,
  race_readiness: <Flag className="h-5 w-5" />,
  capabilities: <Scale className="h-5 w-5" />,
  ethics: <Handshake className="h-5 w-5" />,
  versioning: <Tag className="h-5 w-5" />
};

interface OfficialReferenceDocumentProps {
  variant?: 'full' | 'compact' | 'accordion';
  showHeader?: boolean;
  className?: string;
}

export const OfficialReferenceDocument: React.FC<OfficialReferenceDocumentProps> = ({
  variant = 'full',
  showHeader = true,
  className = ''
}) => {
  if (variant === 'accordion') {
    return <AccordionVariant showHeader={showHeader} className={className} />;
  }

  if (variant === 'compact') {
    return <CompactVariant className={className} />;
  }

  return <FullVariant showHeader={showHeader} className={className} />;
};

// ============================================
// FULL VARIANT
// ============================================

const FullVariant: React.FC<{ showHeader: boolean; className: string }> = ({ showHeader, className }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {showHeader && (
        <div className="text-center space-y-2 pb-4 border-b">
          <h1 className="text-2xl font-bold text-foreground">
            {OFFICIAL_REFERENCE_DOCUMENT.title}
          </h1>
          <p className="text-muted-foreground">
            {OFFICIAL_REFERENCE_DOCUMENT.subtitle}
          </p>
          <Badge variant="outline" className="mt-2">
            {OFFICIAL_REFERENCE_DOCUMENT.version}
          </Badge>
        </div>
      )}

      {/* 1. Introduction */}
      <SectionCard
        icon={sectionIcons.introduction}
        title={OFFICIAL_INTRODUCTION.title}
        emoji={OFFICIAL_INTRODUCTION.icon}
      >
        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
          {OFFICIAL_INTRODUCTION.text}
        </p>
      </SectionCard>

      {/* 2. Philosophie */}
      <SectionCard
        icon={sectionIcons.philosophy}
        title={FOUNDING_PHILOSOPHY.title}
        emoji={FOUNDING_PHILOSOPHY.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4">
          "{FOUNDING_PHILOSOPHY.centralPrinciple}"
        </blockquote>
        
        <h4 className="font-semibold mb-3">Les 4 piliers :</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {FOUNDING_PHILOSOPHY.pillars.map((pillar) => (
            <div key={pillar.id} className="p-3 bg-muted rounded-lg">
              <div className="font-medium text-foreground">{pillar.name}</div>
              <div className="text-sm text-muted-foreground">{pillar.description}</div>
            </div>
          ))}
        </div>

        <h4 className="font-semibold mb-2 text-destructive">L'app ne cherche jamais à :</h4>
        <ul className="space-y-1">
          {FOUNDING_PHILOSOPHY.neverDoes.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* 3. Données mesurées */}
      <SectionCard
        icon={sectionIcons.measured}
        title={MEASURED_DATA.title}
        emoji={MEASURED_DATA.icon}
        badge={<Badge className="bg-green-500/20 text-green-600 border-green-500/30">{MEASURED_DATA.badge}</Badge>}
      >
        <p className="text-sm text-muted-foreground mb-3">{MEASURED_DATA.subtitle}</p>
        <div className="space-y-2 mb-4">
          {MEASURED_DATA.items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-2 rounded bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">{item.name}</div>
                <div className="text-sm text-muted-foreground">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {MEASURED_DATA.disclaimer}
          </p>
        </div>
      </SectionCard>

      {/* 4. Données modélisées */}
      <SectionCard
        icon={sectionIcons.modeled}
        title={MODELED_DATA.title}
        emoji={MODELED_DATA.icon}
        badge={<Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">{MODELED_DATA.badge}</Badge>}
      >
        <p className="text-sm text-muted-foreground mb-3">{MODELED_DATA.subtitle}</p>
        <div className="space-y-4 mb-4">
          {MODELED_DATA.models.map((model) => (
            <div key={model.id} className="p-4 border rounded-lg bg-orange-500/5 border-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-foreground">{model.name}</h5>
                <Badge variant="outline" className="text-xs">{model.confidenceRange}</Badge>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {model.warning}
              </p>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Estimé via :</span>
                <ul className="ml-4 mt-1 list-disc">
                  {model.estimatedFrom.map((source, i) => (
                    <li key={i}>{source}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Base scientifique : {model.scientificBasis}
              </p>
            </div>
          ))}
        </div>
        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
            {MODELED_DATA.disclaimer}
          </p>
        </div>
      </SectionCard>

      {/* 5. Indices de confiance */}
      <SectionCard
        icon={sectionIcons.confidence}
        title={CONFIDENCE_INDICES.title}
        emoji={CONFIDENCE_INDICES.icon}
      >
        <p className="text-muted-foreground mb-4">{CONFIDENCE_INDICES.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {CONFIDENCE_INDICES.components.map((comp) => (
            <div key={comp.id} className="p-3 bg-muted rounded-lg text-center">
              <div className="font-semibold text-foreground">{comp.name}</div>
              <div className="text-sm text-muted-foreground">{comp.description}</div>
            </div>
          ))}
        </div>
        
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4">
          "{CONFIDENCE_INDICES.rule}"
        </blockquote>

        <div className="space-y-2">
          {CONFIDENCE_INDICES.levels.map((level) => (
            <div key={level.range} className="flex items-center gap-3 p-2 rounded bg-muted">
              <Badge 
                variant="outline" 
                className={`min-w-[80px] justify-center ${
                  level.color === 'green' ? 'border-green-500 text-green-600' :
                  level.color === 'yellow' ? 'border-yellow-500 text-yellow-600' :
                  level.color === 'orange' ? 'border-orange-500 text-orange-600' :
                  'border-red-500 text-red-600'
                }`}
              >
                {level.range}
              </Badge>
              <div>
                <span className="font-medium">{level.label}</span>
                <span className="text-muted-foreground text-sm ml-2">— {level.description}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 6. Sorties */}
      <SectionCard
        icon={sectionIcons.outputs}
        title={APPLICATION_OUTPUTS.title}
        emoji={APPLICATION_OUTPUTS.icon}
      >
        <p className="text-muted-foreground mb-4">{APPLICATION_OUTPUTS.rule}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {APPLICATION_OUTPUTS.formats.map((format) => (
            <div key={format.id} className="p-3 border rounded-lg">
              <div className="font-semibold text-foreground">{format.name}</div>
              <div className="text-sm text-muted-foreground font-mono">{format.example}</div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h5 className="font-semibold mb-2">Exemple de sortie :</h5>
          <p className="text-foreground">
            <span className="font-medium">{APPLICATION_OUTPUTS.exampleOutput.metric} :</span>{' '}
            <span className="text-primary font-mono">{APPLICATION_OUTPUTS.exampleOutput.realisticRange}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            Zone ambitieuse possible {APPLICATION_OUTPUTS.exampleOutput.condition} :{' '}
            <span className="text-primary font-mono">{APPLICATION_OUTPUTS.exampleOutput.ambitiousRange}</span>
          </p>
        </div>
      </SectionCard>

      {/* 7. Potentiel Physiologique */}
      <SectionCard
        icon={sectionIcons.race_readiness}
        title={POTENTIEL_DEFINITION.title}
        emoji={POTENTIEL_DEFINITION.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4">
          "{POTENTIEL_DEFINITION.mainStatement}"
        </blockquote>
        
        <h4 className="font-semibold mb-2">Il synthétise :</h4>
        <ul className="space-y-1 mb-4">
          {POTENTIEL_DEFINITION.synthesizes.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {item}
            </li>
          ))}
        </ul>

        <h4 className="font-semibold mb-2 text-destructive">Il ne remplace jamais :</h4>
        <ul className="space-y-1">
          {POTENTIEL_DEFINITION.neverReplaces.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* 8. Capabilities */}
      <SectionCard
        icon={sectionIcons.capabilities}
        title={APP_CAPABILITIES.title}
        emoji={APP_CAPABILITIES.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <h4 className="font-semibold mb-3 text-green-600">{APP_CAPABILITIES.does.title}</h4>
            <ul className="space-y-2">
              {APP_CAPABILITIES.does.items.map((item, i) => (
                <li key={i}>
                  <div className="font-medium text-foreground">{item.verb}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <h4 className="font-semibold mb-3 text-red-600">{APP_CAPABILITIES.doesNot.title}</h4>
            <ul className="space-y-2">
              {APP_CAPABILITIES.doesNot.items.map((item, i) => (
                <li key={i}>
                  <div className="font-medium text-foreground">{item.verb}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* 9. Ethics */}
      <SectionCard
        icon={sectionIcons.ethics}
        title={RESPONSIBILITY_ETHICS.title}
        emoji={RESPONSIBILITY_ETHICS.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4 whitespace-pre-line">
          "{RESPONSIBILITY_ETHICS.mainStatement}"
        </blockquote>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {RESPONSIBILITY_ETHICS.principles.map((principle) => (
            <div key={principle.id} className="p-3 bg-muted rounded-lg text-center">
              <div className="font-semibold text-foreground text-sm">{principle.name}</div>
              <div className="text-xs text-muted-foreground">{principle.description}</div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-muted rounded-lg border">
          <p className="text-xs text-muted-foreground">
            {RESPONSIBILITY_ETHICS.legalDisclaimer}
          </p>
        </div>
      </SectionCard>

      {/* 10. Versioning */}
      <SectionCard
        icon={sectionIcons.versioning}
        title={VERSIONING_STATEMENT.title}
        emoji={VERSIONING_STATEMENT.icon}
      >
        <div className="text-center p-6 bg-muted rounded-lg">
          <Badge variant="outline" className="mb-3 text-lg px-4 py-1">
            {VERSIONING_STATEMENT.fullName}
          </Badge>
          <p className="text-muted-foreground whitespace-pre-line">
            {VERSIONING_STATEMENT.statement}
          </p>
          <div className="mt-4 text-xs text-muted-foreground">
            Dernière mise à jour : {VERSIONING_STATEMENT.lastUpdate}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================
// ACCORDION VARIANT
// ============================================

const AccordionVariant: React.FC<{ showHeader: boolean; className: string }> = ({ showHeader, className }) => {
  return (
    <div className={className}>
      {showHeader && (
        <div className="text-center space-y-2 pb-4 mb-4 border-b">
          <h2 className="text-xl font-bold text-foreground">
            {OFFICIAL_REFERENCE_DOCUMENT.title}
          </h2>
          <Badge variant="outline">{OFFICIAL_REFERENCE_DOCUMENT.version}</Badge>
        </div>
      )}
      
      <Accordion type="single" collapsible className="space-y-2">
        {OFFICIAL_REFERENCE_DOCUMENT.sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                {sectionIcons[section.id]}
                <span>{section.icon} {section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 pb-4">
                {/* Simplified content for accordion */}
                {section.id === 'introduction' && (
                  <p className="text-muted-foreground">{OFFICIAL_INTRODUCTION.text}</p>
                )}
                {section.id === 'philosophy' && (
                  <blockquote className="border-l-4 border-primary pl-4 italic">
                    "{FOUNDING_PHILOSOPHY.centralPrinciple}"
                  </blockquote>
                )}
                {section.id === 'ethics' && (
                  <p className="text-muted-foreground">{RESPONSIBILITY_ETHICS.mainStatement}</p>
                )}
                {section.id === 'versioning' && (
                  <p className="text-muted-foreground">{VERSIONING_STATEMENT.statement}</p>
                )}
                {!['introduction', 'philosophy', 'ethics', 'versioning'].includes(section.id) && (
                  <p className="text-muted-foreground text-sm">
                    Voir le document complet pour plus de détails.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

// ============================================
// COMPACT VARIANT
// ============================================

const CompactVariant: React.FC<{ className: string }> = ({ className }) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{OFFICIAL_REFERENCE_DOCUMENT.title}</CardTitle>
            <CardDescription>{OFFICIAL_REFERENCE_DOCUMENT.subtitle}</CardDescription>
          </div>
          <Badge variant="outline">{OFFICIAL_REFERENCE_DOCUMENT.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {OFFICIAL_INTRODUCTION.text}
        </p>
        <Separator />
        <blockquote className="border-l-4 border-primary pl-4 italic text-sm">
          "{FOUNDING_PHILOSOPHY.centralPrinciple}"
        </blockquote>
        <Separator />
        <p className="text-sm text-muted-foreground">
          {RESPONSIBILITY_ETHICS.mainStatement}
        </p>
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {VERSIONING_STATEMENT.statement}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  emoji: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, emoji, badge, children }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle className="text-lg">
              {emoji} {title}
            </CardTitle>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default OfficialReferenceDocument;
