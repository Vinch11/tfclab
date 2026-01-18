/**
 * Two For Coaching Lab Method™ — Définition Officielle
 * 
 * Composant affichant la méthode complète avec ses 4 niveaux hiérarchiques.
 * Accessible depuis : Academy, Dashboard (staff), Rapports PDF
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Brain,
  Layers,
  Building2,
  Zap,
  Timer,
  TrendingUp,
  Shield,
  User,
  AlertCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import {
  METHOD_PHILOSOPHY,
  METHOD_LEVELS,
  SCIENTIFIC_PILLARS,
  VLAMAX_POSITIONING,
  TTE_POSITIONING,
  REALISTIC_RANGES,
  SAFEGUARDS,
  COACH_CENTRAL_ROLE,
  METHOD_LIMITS,
  TRACEABILITY_EVOLUTION,
  METHOD_DEFINITION,
  type MethodLevel
} from '@/lib/v2/methodDefinition';

const sectionIcons: Record<string, React.ReactNode> = {
  philosophy: <Brain className="h-5 w-5" />,
  levels: <Layers className="h-5 w-5" />,
  pillars: <Building2 className="h-5 w-5" />,
  vlamax: <Zap className="h-5 w-5" />,
  tte: <Timer className="h-5 w-5" />,
  ranges: <TrendingUp className="h-5 w-5" />,
  safeguards: <Shield className="h-5 w-5" />,
  coach_role: <User className="h-5 w-5" />,
  limits: <AlertCircle className="h-5 w-5" />,
  traceability: <FileText className="h-5 w-5" />
};

interface MethodDefinitionProps {
  variant?: 'full' | 'compact' | 'accordion' | 'levels-only';
  showHeader?: boolean;
  className?: string;
}

export const MethodDefinitionComponent: React.FC<MethodDefinitionProps> = ({
  variant = 'full',
  showHeader = true,
  className = ''
}) => {
  if (variant === 'levels-only') {
    return <LevelsOnlyVariant className={className} />;
  }

  if (variant === 'accordion') {
    return <AccordionVariant showHeader={showHeader} className={className} />;
  }

  if (variant === 'compact') {
    return <CompactVariant className={className} />;
  }

  return <FullVariant showHeader={showHeader} className={className} />;
};

// ============================================
// LEVELS CARD COMPONENT
// ============================================

const LevelCard: React.FC<{ level: MethodLevel }> = ({ level }) => {
  const colorClasses = {
    green: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15',
    orange: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15',
    blue: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15',
    purple: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15'
  };

  const badgeClasses = {
    green: 'bg-green-500/20 text-green-600 border-green-500/30',
    orange: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    blue: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-600 border-purple-500/30'
  };

  return (
    <div className={`p-4 rounded-lg border transition-colors ${colorClasses[level.color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0 font-bold">
            {level.level}
          </Badge>
          <span className="text-xl">{level.icon}</span>
        </div>
        {level.badge && (
          <Badge className={badgeClasses[level.color as keyof typeof badgeClasses]}>
            {level.badge}
          </Badge>
        )}
      </div>
      
      <h4 className="font-bold text-foreground mb-1">{level.title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{level.subtitle}</p>
      
      <ul className="space-y-1 mb-3">
        {level.examples.map((example, i) => (
          <li key={i} className="text-sm flex items-center gap-2 text-foreground">
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            {example}
          </li>
        ))}
      </ul>
      
      <div className="pt-2 border-t border-current/10">
        <p className="text-sm font-medium text-foreground">{level.rule}</p>
      </div>
      
      {level.disclaimer && (
        <Alert className="mt-3 py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">{level.disclaimer}</AlertDescription>
        </Alert>
      )}
    </div>
  );
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
            {METHOD_DEFINITION.title}
          </h1>
          <p className="text-muted-foreground">
            {METHOD_DEFINITION.subtitle}
          </p>
          <Badge variant="outline" className="mt-2">
            {METHOD_DEFINITION.version}
          </Badge>
        </div>
      )}

      {/* 1. Philosophie */}
      <SectionCard
        icon={sectionIcons.philosophy}
        title={METHOD_PHILOSOPHY.title}
        emoji={METHOD_PHILOSOPHY.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4 whitespace-pre-line">
          "{METHOD_PHILOSOPHY.officialText}"
        </blockquote>
        
        <h4 className="font-semibold mb-3">Principes fondamentaux :</h4>
        <div className="space-y-2">
          {METHOD_PHILOSOPHY.fundamentalPrinciples.map((principle) => (
            <div key={principle.id} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground">{principle.principle}</div>
                <div className="text-sm text-muted-foreground">{principle.description}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 2. Structure Logique — 4 Niveaux */}
      <SectionCard
        icon={sectionIcons.levels}
        title="Structure Logique — 4 Niveaux"
        emoji="📐"
      >
        <p className="text-muted-foreground mb-4">
          La méthode repose sur une lecture en 4 niveaux hiérarchisés :
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METHOD_LEVELS.map((level) => (
            <LevelCard key={level.id} level={level} />
          ))}
        </div>
      </SectionCard>

      {/* 3. Piliers Scientifiques */}
      <SectionCard
        icon={sectionIcons.pillars}
        title={SCIENTIFIC_PILLARS.title}
        emoji={SCIENTIFIC_PILLARS.icon}
      >
        <p className="text-muted-foreground mb-4">{SCIENTIFIC_PILLARS.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {SCIENTIFIC_PILLARS.pillars.map((pillar) => (
            <div key={pillar.id} className="p-3 border rounded-lg">
              <div className="font-semibold text-foreground">{pillar.name}</div>
              <div className="text-xs text-muted-foreground mb-1">
                Réf : {pillar.references.join(', ')}
              </div>
              <div className="text-sm text-muted-foreground">{pillar.description}</div>
            </div>
          ))}
        </div>
        
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground">
          "{SCIENTIFIC_PILLARS.keyStatement}"
        </blockquote>
      </SectionCard>

      {/* 4. VLamax */}
      <SectionCard
        icon={sectionIcons.vlamax}
        title={VLAMAX_POSITIONING.title}
        emoji={VLAMAX_POSITIONING.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <h5 className="font-semibold text-green-600 mb-2">✅ Utilisé comme :</h5>
            <ul className="space-y-2">
              {VLAMAX_POSITIONING.usedAs.map((item, i) => (
                <li key={i}>
                  <div className="font-medium text-foreground">{item.use}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <h5 className="font-semibold text-red-600 mb-2">❌ Jamais utilisé comme :</h5>
            <ul className="space-y-1">
              {VLAMAX_POSITIONING.neverUsedAs.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4 text-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">{VLAMAX_POSITIONING.methodRule}</p>
        </div>
      </SectionCard>

      {/* 5. TTE */}
      <SectionCard
        icon={sectionIcons.tte}
        title={TTE_POSITIONING.title}
        emoji={TTE_POSITIONING.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {TTE_POSITIONING.consideredAs.map((item, i) => (
            <div key={i} className="p-3 bg-muted rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>

        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4">
          "{TTE_POSITIONING.methodRule}"
        </blockquote>

        <div className="space-y-2">
          {TTE_POSITIONING.implications.map((impl, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-medium">{impl.context}</span>
              <Badge variant="outline" className="text-xs">{impl.importance}</Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 6. Plages Réalistes */}
      <SectionCard
        icon={sectionIcons.ranges}
        title={REALISTIC_RANGES.title}
        emoji={REALISTIC_RANGES.icon}
      >
        <p className="text-muted-foreground mb-4">{REALISTIC_RANGES.principle}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {REALISTIC_RANGES.rangeTypes.map((range) => (
            <div 
              key={range.id} 
              className={`p-3 rounded-lg border ${
                range.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
                range.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="font-semibold text-foreground">{range.name}</div>
              <div className="text-sm text-muted-foreground">{range.description}</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-muted rounded-lg mb-4">
          <h5 className="font-semibold mb-2">Exemple : {REALISTIC_RANGES.example.metric}</h5>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 bg-green-500/20 rounded">{REALISTIC_RANGES.example.realistic}</div>
            <div className="p-2 bg-yellow-500/20 rounded">{REALISTIC_RANGES.example.ambitious}</div>
            <div className="p-2 bg-red-500/20 rounded">{REALISTIC_RANGES.example.elite}</div>
          </div>
        </div>

        <h5 className="font-semibold mb-2">Chaque plage est justifiée par :</h5>
        <ul className="grid grid-cols-2 gap-2">
          {REALISTIC_RANGES.justifiedBy.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* 7. Garde-fous */}
      <SectionCard
        icon={sectionIcons.safeguards}
        title={SAFEGUARDS.title}
        emoji={SAFEGUARDS.icon}
      >
        <p className="text-muted-foreground mb-4">{SAFEGUARDS.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {SAFEGUARDS.safeguards.map((safeguard) => (
            <div key={safeguard.id} className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="font-semibold text-foreground">{safeguard.name}</div>
              <div className="text-sm text-muted-foreground">{safeguard.description}</div>
            </div>
          ))}
        </div>
        
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="font-medium">{SAFEGUARDS.keyStatement}</AlertDescription>
        </Alert>
      </SectionCard>

      {/* 8. Rôle du Coach */}
      <SectionCard
        icon={sectionIcons.coach_role}
        title={COACH_CENTRAL_ROLE.title}
        emoji={COACH_CENTRAL_ROLE.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4 whitespace-pre-line">
          "{COACH_CENTRAL_ROLE.officialText}"
        </blockquote>
        
        <h4 className="font-semibold mb-3">Le coach reste :</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COACH_CENTRAL_ROLE.coachRemains.map((item) => (
            <div key={item.role} className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
              <div className="font-semibold text-foreground">{item.role}</div>
              <div className="text-sm text-muted-foreground">{item.description}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 9. Limites */}
      <SectionCard
        icon={sectionIcons.limits}
        title={METHOD_LIMITS.title}
        emoji={METHOD_LIMITS.icon}
      >
        <div className="space-y-2 mb-4">
          {METHOD_LIMITS.limitations.map((item, i) => (
            <div key={i} className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
              <div className="font-medium text-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                {item.limitation}
              </div>
              <div className="text-sm text-muted-foreground ml-6">{item.when}</div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="font-semibold text-foreground">{METHOD_LIMITS.keyStatement}</p>
        </div>
      </SectionCard>

      {/* 10. Traçabilité */}
      <SectionCard
        icon={sectionIcons.traceability}
        title={TRACEABILITY_EVOLUTION.title}
        emoji={TRACEABILITY_EVOLUTION.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-semibold mb-2">Chaque analyse doit indiquer :</h5>
            <ul className="space-y-1">
              {TRACEABILITY_EVOLUTION.analysisRequirements.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-2">La méthode est évolutive :</h5>
            <ul className="space-y-2">
              {TRACEABILITY_EVOLUTION.evolutionPrinciples.map((item, i) => (
                <li key={i}>
                  <div className="font-medium text-foreground">{item.principle}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center border border-primary/20">
          <Badge variant="outline" className="text-sm">
            {TRACEABILITY_EVOLUTION.versionStatement}
          </Badge>
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================
// LEVELS ONLY VARIANT
// ============================================

const LevelsOnlyVariant: React.FC<{ className: string }> = ({ className }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-bold text-center mb-4">Structure d'analyse — 4 Niveaux</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METHOD_LEVELS.map((level) => (
          <LevelCard key={level.id} level={level} />
        ))}
      </div>
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
          <h2 className="text-xl font-bold text-foreground">{METHOD_DEFINITION.title}</h2>
          <p className="text-sm text-muted-foreground">{METHOD_DEFINITION.subtitle}</p>
          <Badge variant="outline">{METHOD_DEFINITION.version}</Badge>
        </div>
      )}
      
      <Accordion type="single" collapsible className="space-y-2">
        {METHOD_DEFINITION.sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                {sectionIcons[section.id]}
                <span>{section.icon} {section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 pb-4 text-sm text-muted-foreground">
                {section.id === 'philosophy' && METHOD_PHILOSOPHY.officialText}
                {section.id === 'levels' && "Mesuré → Modélisé → Interprété → Conseillé"}
                {section.id === 'pillars' && SCIENTIFIC_PILLARS.keyStatement}
                {section.id === 'coach_role' && COACH_CENTRAL_ROLE.officialText}
                {section.id === 'limits' && METHOD_LIMITS.keyStatement}
                {section.id === 'safeguards' && SAFEGUARDS.keyStatement}
                {!['philosophy', 'levels', 'pillars', 'coach_role', 'limits', 'safeguards'].includes(section.id) && 
                  "Voir le document complet pour plus de détails."}
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
            <CardTitle className="text-lg">{METHOD_DEFINITION.title}</CardTitle>
            <CardDescription>{METHOD_DEFINITION.subtitle}</CardDescription>
          </div>
          <Badge variant="outline">{METHOD_DEFINITION.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <blockquote className="border-l-4 border-primary pl-4 italic text-sm">
          "{METHOD_PHILOSOPHY.officialText}"
        </blockquote>
        <Separator />
        <div>
          <h4 className="font-semibold mb-2 text-sm">4 Niveaux de lecture :</h4>
          <div className="grid grid-cols-2 gap-2">
            {METHOD_LEVELS.map((level) => (
              <div key={level.id} className="text-xs p-2 rounded bg-muted">
                <span className="font-bold">{level.level}.</span> {level.badge}
              </div>
            ))}
          </div>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground text-center">
          {SCIENTIFIC_PILLARS.keyStatement}
        </p>
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
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, emoji, children }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle className="text-lg">
            {emoji} {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default MethodDefinitionComponent;
