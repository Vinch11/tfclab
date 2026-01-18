/**
 * Charte Coach – Two For Coaching Lab Method™
 * 
 * Composant affichant la charte officielle pour les coachs.
 * Accessible depuis : Academy, Dashboard (staff), Rapports PDF
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  User,
  BookOpen,
  BarChart3,
  Zap,
  Timer,
  AlertCircle,
  Flag,
  MessageCircle,
  FlaskConical,
  FileCheck
} from 'lucide-react';
import {
  COACH_ROLE,
  DATA_READING_RULES,
  SCORES_USAGE,
  VLAMAX_USAGE,
  TTE_USAGE,
  FATIGUE_RISK_USAGE,
  RACE_READINESS_USAGE,
  ATHLETE_COMMUNICATION,
  LAB_TESTS_LIMITS,
  PROFESSIONAL_RESPONSIBILITY,
  COACH_CHARTER
} from '@/lib/v2/coachCharter';

const sectionIcons: Record<string, React.ReactNode> = {
  role: <User className="h-5 w-5" />,
  reading: <BookOpen className="h-5 w-5" />,
  scores: <BarChart3 className="h-5 w-5" />,
  vlamax: <Zap className="h-5 w-5" />,
  tte: <Timer className="h-5 w-5" />,
  fatigue: <AlertCircle className="h-5 w-5" />,
  race_readiness: <Flag className="h-5 w-5" />,
  communication: <MessageCircle className="h-5 w-5" />,
  lab_tests: <FlaskConical className="h-5 w-5" />,
  responsibility: <FileCheck className="h-5 w-5" />
};

interface CoachCharterProps {
  variant?: 'full' | 'compact' | 'accordion';
  showHeader?: boolean;
  className?: string;
}

export const CoachCharter: React.FC<CoachCharterProps> = ({
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
            {COACH_CHARTER.title}
          </h1>
          <p className="text-muted-foreground">
            {COACH_CHARTER.subtitle}
          </p>
          <Badge variant="outline" className="mt-2">
            {COACH_CHARTER.version}
          </Badge>
        </div>
      )}

      {/* 1. Rôle du Coach */}
      <SectionCard
        icon={sectionIcons.role}
        title={COACH_ROLE.title}
        emoji={COACH_ROLE.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4 whitespace-pre-line">
          "{COACH_ROLE.officialText}"
        </blockquote>
        
        <h4 className="font-semibold mb-3">Le coach est garant de :</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COACH_ROLE.responsibilities.map((resp) => (
            <div key={resp.id} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="font-medium text-foreground">{resp.label}</div>
              <div className="text-sm text-muted-foreground">{resp.description}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 2. Comment lire les données */}
      <SectionCard
        icon={sectionIcons.reading}
        title={DATA_READING_RULES.title}
        emoji={DATA_READING_RULES.icon}
      >
        <div className="space-y-4">
          {DATA_READING_RULES.rules.map((rule) => (
            <div key={rule.number} className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center p-0">
                  {rule.number}
                </Badge>
                <h5 className="font-semibold text-foreground">{rule.title}</h5>
              </div>
              {rule.items.length > 0 && (
                <ul className="ml-11 mb-2 space-y-1">
                  {rule.items.map((item, i) => (
                    <li key={i} className="text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <p className="ml-11 text-sm font-medium text-primary">{rule.emphasis}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 3. Utilisation des scores */}
      <SectionCard
        icon={sectionIcons.scores}
        title={SCORES_USAGE.title}
        emoji={SCORES_USAGE.icon}
      >
        <p className="text-muted-foreground mb-3">
          Les scores ({SCORES_USAGE.examples.join(', ')}) :
        </p>
        <ul className="space-y-2 mb-4">
          {SCORES_USAGE.scoresAre.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {item}
            </li>
          ))}
        </ul>
        
        <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
          <h5 className="font-semibold text-red-600 mb-2">❌ Interdiction d'usage :</h5>
          <ul className="space-y-2">
            {SCORES_USAGE.forbidden.map((item, i) => (
              <li key={i}>
                <div className="font-medium text-foreground">{item.action}</div>
                <div className="text-sm text-muted-foreground">{item.reason}</div>
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>

      {/* 4. VLamax */}
      <SectionCard
        icon={sectionIcons.vlamax}
        title={VLAMAX_USAGE.title}
        emoji={VLAMAX_USAGE.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          {VLAMAX_USAGE.vlamaxIs.map((item, i) => (
            <div key={i} className="p-2 bg-muted rounded text-center text-sm">
              {item}
            </div>
          ))}
        </div>
        
        <div className="space-y-3 mb-4">
          {VLAMAX_USAGE.rules.map((rule, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <div className="font-medium text-foreground mb-1">{rule.rule}</div>
              <ul className="ml-4 space-y-1">
                {rule.items.map((item, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention</AlertTitle>
          <AlertDescription>{VLAMAX_USAGE.warning}</AlertDescription>
        </Alert>
      </SectionCard>

      {/* 5. TTE */}
      <SectionCard
        icon={sectionIcons.tte}
        title={TTE_USAGE.title}
        emoji={TTE_USAGE.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {TTE_USAGE.tteRepresents.map((item, i) => (
            <div key={i} className="p-2 bg-muted rounded text-center text-sm">
              {item}
            </div>
          ))}
        </div>
        
        <div className="space-y-2 mb-4">
          {TTE_USAGE.rules.map((rule, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg flex items-start gap-3 ${
                rule.importance === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                rule.importance === 'high' ? 'bg-orange-500/10 border border-orange-500/20' :
                'bg-muted'
              }`}
            >
              {rule.importance === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />}
              {rule.importance === 'high' && <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />}
              {rule.importance === 'medium' && <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
              <span className="text-foreground">{rule.text}</span>
            </div>
          ))}
        </div>
        
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary">{TTE_USAGE.keyInsight}</p>
        </div>
      </SectionCard>

      {/* 6. Fatigue & Risque */}
      <SectionCard
        icon={sectionIcons.fatigue}
        title={FATIGUE_RISK_USAGE.title}
        emoji={FATIGUE_RISK_USAGE.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="text-sm text-muted-foreground">La fatigue est :</div>
            <div className="font-medium text-green-600">{FATIGUE_RISK_USAGE.fatigueStatement.is}</div>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="text-sm text-muted-foreground">La fatigue n'est pas :</div>
            <div className="font-medium text-red-600">{FATIGUE_RISK_USAGE.fatigueStatement.isNot}</div>
          </div>
        </div>

        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4">
          "{FATIGUE_RISK_USAGE.staffRule}"
        </blockquote>

        <div className="space-y-2 mb-4">
          {FATIGUE_RISK_USAGE.guidelines.map((guideline, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg flex items-center justify-between ${
                guideline.color === 'green' ? 'bg-green-500/10' :
                guideline.color === 'yellow' ? 'bg-yellow-500/10' :
                guideline.color === 'orange' ? 'bg-orange-500/10' :
                'bg-red-500/10'
              }`}
            >
              <span className="font-medium">{guideline.level}</span>
              <span className="text-sm text-muted-foreground">{guideline.action}</span>
            </div>
          ))}
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Risque blessure CAP</AlertTitle>
          <AlertDescription>
            {FATIGUE_RISK_USAGE.injuryRisk.statement}<br />
            <span className="text-xs">{FATIGUE_RISK_USAGE.injuryRisk.implication}</span>
          </AlertDescription>
        </Alert>
      </SectionCard>

      {/* 7. Race Readiness */}
      <SectionCard
        icon={sectionIcons.race_readiness}
        title={RACE_READINESS_USAGE.title}
        emoji={RACE_READINESS_USAGE.icon}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <h5 className="font-semibold text-green-600 mb-2">✅ Sert à :</h5>
            <ul className="space-y-1">
              {RACE_READINESS_USAGE.servesTo.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <h5 className="font-semibold text-red-600 mb-2">❌ Ne sert pas à :</h5>
            <ul className="space-y-1">
              {RACE_READINESS_USAGE.doesNotServeTo.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* 8. Communication */}
      <SectionCard
        icon={sectionIcons.communication}
        title={ATHLETE_COMMUNICATION.title}
        emoji={ATHLETE_COMMUNICATION.icon}
      >
        <h4 className="font-semibold mb-2">Recommandations :</h4>
        <ul className="space-y-1 mb-4">
          {ATHLETE_COMMUNICATION.recommendations.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {item}
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <h5 className="font-semibold text-green-600 mb-2">✅ Phrase recommandée :</h5>
            <p className="text-sm italic mb-2">"{ATHLETE_COMMUNICATION.phraseRecommended.template}"</p>
            <div className="text-xs text-muted-foreground">
              {ATHLETE_COMMUNICATION.phraseRecommended.examples.map((ex, i) => (
                <p key={i} className="mb-1">• {ex}</p>
              ))}
            </div>
          </div>
          <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
            <h5 className="font-semibold text-red-600 mb-2">❌ Phrase à éviter :</h5>
            <p className="text-sm italic mb-2">"{ATHLETE_COMMUNICATION.phraseToAvoid.template}"</p>
            <p className="text-xs text-muted-foreground mb-2">{ATHLETE_COMMUNICATION.phraseToAvoid.why}</p>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Alternatives :</span>
              {ATHLETE_COMMUNICATION.phraseToAvoid.alternatives.map((alt, i) => (
                <p key={i}>• {alt}</p>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 9. Tests labo */}
      <SectionCard
        icon={sectionIcons.lab_tests}
        title={LAB_TESTS_LIMITS.title}
        emoji={LAB_TESTS_LIMITS.icon}
      >
        <h4 className="font-semibold mb-3">Le coach doit recommander un test labo si :</h4>
        <div className="space-y-2 mb-4">
          {LAB_TESTS_LIMITS.recommendLabTestIf.map((item, i) => (
            <div key={i} className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="font-medium text-foreground">{item.trigger}</div>
              <div className="text-sm text-muted-foreground italic">Ex : {item.example}</div>
            </div>
          ))}
        </div>

        <h4 className="font-semibold mb-2 text-destructive">Two For Coaching Lab ne remplace pas :</h4>
        <ul className="space-y-1 mb-4">
          {LAB_TESTS_LIMITS.doesNotReplace.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              {item}
            </li>
          ))}
        </ul>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium text-foreground">{LAB_TESTS_LIMITS.positioning}</p>
        </div>
      </SectionCard>

      {/* 10. Responsabilité */}
      <SectionCard
        icon={sectionIcons.responsibility}
        title={PROFESSIONAL_RESPONSIBILITY.title}
        emoji={PROFESSIONAL_RESPONSIBILITY.icon}
      >
        <blockquote className="border-l-4 border-primary pl-4 italic text-foreground mb-4 whitespace-pre-line">
          "{PROFESSIONAL_RESPONSIBILITY.officialText}"
        </blockquote>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {PROFESSIONAL_RESPONSIBILITY.commitments.map((commitment) => (
            <div key={commitment.id} className="p-3 bg-muted rounded-lg text-center">
              <div className="font-semibold text-foreground text-sm">{commitment.label}</div>
              <div className="text-xs text-muted-foreground">{commitment.description}</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 text-center">
          <p className="text-sm font-medium text-primary">
            {PROFESSIONAL_RESPONSIBILITY.signature}
          </p>
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
          <h2 className="text-xl font-bold text-foreground">{COACH_CHARTER.title}</h2>
          <p className="text-sm text-muted-foreground">{COACH_CHARTER.subtitle}</p>
          <Badge variant="outline">{COACH_CHARTER.version}</Badge>
        </div>
      )}
      
      <Accordion type="single" collapsible className="space-y-2">
        {COACH_CHARTER.sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                {sectionIcons[section.id]}
                <span>{section.icon} {section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-2 pb-4 text-sm text-muted-foreground">
                {section.id === 'role' && COACH_ROLE.officialText}
                {section.id === 'reading' && DATA_READING_RULES.rules.map(r => r.emphasis).join(' • ')}
                {section.id === 'fatigue' && FATIGUE_RISK_USAGE.staffRule}
                {section.id === 'communication' && ATHLETE_COMMUNICATION.phraseRecommended.template}
                {section.id === 'responsibility' && PROFESSIONAL_RESPONSIBILITY.officialText}
                {!['role', 'reading', 'fatigue', 'communication', 'responsibility'].includes(section.id) && 
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
            <CardTitle className="text-lg">{COACH_CHARTER.title}</CardTitle>
            <CardDescription>{COACH_CHARTER.subtitle}</CardDescription>
          </div>
          <Badge variant="outline">{COACH_CHARTER.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <blockquote className="border-l-4 border-primary pl-4 italic text-sm">
          "{COACH_ROLE.officialText}"
        </blockquote>
        <Separator />
        <div className="text-sm">
          <h4 className="font-semibold mb-2">Règles de lecture :</h4>
          <ol className="list-decimal ml-4 space-y-1 text-muted-foreground">
            {DATA_READING_RULES.rules.map((rule) => (
              <li key={rule.number}>{rule.emphasis}</li>
            ))}
          </ol>
        </div>
        <Separator />
        <div className="p-3 bg-muted rounded-lg text-xs text-center">
          <p className="font-medium">{PROFESSIONAL_RESPONSIBILITY.signature}</p>
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

export default CoachCharter;
