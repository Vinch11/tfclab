// =============================================
// CONTEXT PACKET - Assistant Two For Coaching Lab
// Source of truth pour le contexte runtime
// =============================================

import { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";
import { getAthleteAmbition } from "@/types/ambitionLevel";
import { computeVLamaxEffectif, type VLamaxEffectif, computeTTEEffectif, type TTEEffectif } from "@/engines/diagnostic";
import { getEffectiveRefs, computeFtpKg } from "@/lib/effectiveRefs";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import { computeNutritionEstimate, NutritionEstimate } from "@/lib/nutritionPredictive";
import { 
  suggestWahooWorkouts, 
  computeWahooNeeds,
  type SuggestionEngineOutput,
  type SuggestionEngineContext,
  type NeedAnalysis,
  type WahooSuggestion 
} from "@/lib/wahoo/wahooSuggestionEngine";
import { 
  WAHOO_WORKOUTS, 
  matchWahooSession,
  type WahooWorkoutMapping 
} from "@/data/wahooMapping";
import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, type PotentielInput, type PotentielResult, computePotentielSignature } from "@/lib/potentielPhysiologiqueEffectif";

// Re-export types for external use
export type { PotentielResult as PotentielSignatureResult };

// =============================================
// TYPES
// =============================================

export interface MissingField {
  field: string;
  label: string;
  whereToFix: string;
  impact: "high" | "medium" | "low";
}

export interface AssistantContextPacket {
  // Module actuel
  currentModule: string;
  
  // Athlète
  athlete: {
    id: string | null;
    name: string | null;
    goal: string | null;
    age: number | null;
  };
  
  // Snapshot actif
  activeSnapshot: {
    exists: boolean;
    date: string | null;
    source: string | null;
  };
  
  // Métriques effectifs (avec source et confiance)
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  potentielPhysiologique: PotentielPhysiologiqueEffectif | null;
  
  // Potentiel Physiologique Signature (nouveau système Potentiel × Disponibilité)
  potentielPhysiologiqueSignature: PotentielResult | null;
  
  // Charge récente
  chargeRecente: {
    tss7d: number | null;
    status: "légère" | "modérée" | "élevée" | "très élevée" | null;
    confidence: number;
  };
  
  // Risque blessure CAP
  injuryRiskRun: {
    level: "faible" | "modéré" | "élevé" | null;
    driftPct: number | null;
    reason: string | null;
  };
  
  // Nutrition prédictive
  nutritionPred: NutritionEstimate | null;
  
  // Données dérivées
  derived: {
    ftp: number | null;
    ftpKg: number | null;
    poids: number | null;
    fcMax: number | null;
    vo2max: number | null;
    vma: number | null;
  };
  
  // Champs manquants (pour guider l'utilisateur)
  missingFields: MissingField[];
  
  // Robustesse globale
  robustness: {
    level: "robuste" | "prudent" | "indicatif";
    averageConfidence: number;
  };
  
  // Wahoo SYSTM context
  wahooContext: {
    suggestions: WahooSuggestion[];
    needAnalysis: NeedAnalysis | null;
    diagnosticSummary: string | null;
    focusWorkoutId: string | null;
    focusWorkout: WahooWorkoutMapping | null;
  };
}

// =============================================
// FONCTIONS DE CALCUL
// =============================================

function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function computeChargeRecenteStatus(tss7d: number | null): "légère" | "modérée" | "élevée" | "très élevée" | null {
  if (tss7d === null) return null;
  if (tss7d < 300) return "légère";
  if (tss7d < 500) return "modérée";
  if (tss7d < 700) return "élevée";
  return "très élevée";
}

function computeInjuryRisk(driftPct: number | null, vlamaxEffectif: VLamaxEffectif | null, tteEffectif: TTEEffectif | null): {
  level: "faible" | "modéré" | "élevé" | null;
  reason: string | null;
} {
  let riskLevel: "faible" | "modéré" | "élevé" | null = null;
  let reason: string | null = null;
  
  // Risque basé sur la dérive cardiaque
  if (driftPct !== null) {
    if (driftPct > 10) {
      riskLevel = "élevé";
      reason = `Dérive cardiaque élevée (${driftPct.toFixed(1)}% > 10%)`;
    } else if (driftPct > 5) {
      riskLevel = "modéré";
      reason = `Dérive cardiaque modérée (${driftPct.toFixed(1)}%)`;
    } else {
      riskLevel = "faible";
      reason = `Dérive cardiaque normale (${driftPct.toFixed(1)}%)`;
    }
  }
  
  // Aggravation si profil "fragile" (VLamax haute + TTE bas)
  if (vlamaxEffectif?.value && tteEffectif) {
    const vlamaxHigh = vlamaxEffectif.value > 0.5;
    const tteLow = tteEffectif.status === "critical";
    if (vlamaxHigh && tteLow) {
      if (riskLevel === "modéré") riskLevel = "élevé";
      reason = (reason || "") + " + profil fragile (VLamax haute, TTE bas)";
    }
  }
  
  return { level: riskLevel, reason };
}

function identifyMissingFields(
  athlete: DbAthlete | null,
  snapshot: DbSnapshot | null
): MissingField[] {
  const missing: MissingField[] = [];
  
  if (!athlete) {
    missing.push({
      field: "athlete",
      label: "Athlète",
      whereToFix: "Sélectionne un athlète dans le menu principal",
      impact: "high"
    });
    return missing; // Pas la peine de continuer
  }
  
  if (!snapshot) {
    missing.push({
      field: "snapshot",
      label: "Snapshot actif",
      whereToFix: "Va dans l'onglet Snapshots > Nouveau Snapshot",
      impact: "high"
    });
    return missing;
  }
  
  // Champs snapshot
  if (snapshot.ftp === null) {
    missing.push({
      field: "ftp",
      label: "FTP (puissance seuil)",
      whereToFix: "Modifie le snapshot actif ou ajoute un test",
      impact: "high"
    });
  }
  
  if (snapshot.weight_kg === null) {
    missing.push({
      field: "weight_kg",
      label: "Poids",
      whereToFix: "Modifie le snapshot actif",
      impact: "medium"
    });
  }
  
  if (snapshot.fc_max === null) {
    missing.push({
      field: "fc_max",
      label: "FC Max",
      whereToFix: "Modifie le snapshot actif ou les Références athlète",
      impact: "medium"
    });
  }
  
  if (snapshot.tss_7d === null) {
    missing.push({
      field: "tss_7d",
      label: "TSS 7 jours (charge récente)",
      whereToFix: "Modifie le snapshot actif",
      impact: "medium"
    });
  }
  
  if (snapshot.vlamax === null) {
    missing.push({
      field: "vlamax",
      label: "VLamax (mesurée)",
      whereToFix: "Réalise un test VLamax ou importe un rapport labo",
      impact: "medium"
    });
  }
  
  if (snapshot.vma === null) {
    missing.push({
      field: "vma",
      label: "VMA",
      whereToFix: "Modifie le snapshot actif",
      impact: "low"
    });
  }
  
  return missing;
}

function computeRobustness(confidences: number[]): {
  level: "robuste" | "prudent" | "indicatif";
  averageConfidence: number;
} {
  if (confidences.length === 0) {
    return { level: "indicatif", averageConfidence: 0 };
  }
  
  const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  
  if (avg >= 0.7) {
    return { level: "robuste", averageConfidence: avg };
  } else if (avg >= 0.4) {
    return { level: "prudent", averageConfidence: avg };
  }
  return { level: "indicatif", averageConfidence: avg };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export interface GetAssistantContextParams {
  currentModule: string;
  selectedAthleteId: string | null;
  athletes: DbAthlete[];
  snapshots: DbSnapshot[];
  tests: DbTest[];
  focusWahooWorkoutId?: string | null;
  focusWahooWorkoutName?: string | null;
}

export function getAssistantContext(params: GetAssistantContextParams): AssistantContextPacket {
  const { currentModule, selectedAthleteId, athletes, snapshots, tests, focusWahooWorkoutId, focusWahooWorkoutName } = params;
  
  // Athlète sélectionné
  const athlete = selectedAthleteId 
    ? athletes.find(a => a.id === selectedAthleteId) || null 
    : null;
  
  // Snapshot effectif
  let effectiveSnapshot: DbSnapshot | null = null;
  if (athlete) {
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
    if (athleteSnapshots.length > 0) {
      if (athlete.active_snapshot_id) {
        effectiveSnapshot = athleteSnapshots.find(s => s.id === athlete.active_snapshot_id) || null;
      }
      if (!effectiveSnapshot) {
        effectiveSnapshot = [...athleteSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
      }
    }
  }
  
  // Refs effectifs
  const effectiveRefs = athlete ? getEffectiveRefs(athlete, snapshots) : null;
  const ftpKg = effectiveRefs ? computeFtpKg(effectiveRefs) : null;
  
  // VLamax effectif
  const vlamaxEffectif = athlete ? computeVLamaxEffectif({
    athleteId: athlete.id,
    objectif: athlete.goal || "IM",
    activeSnapshotId: athlete.active_snapshot_id,
    tests: tests.map(t => ({
      athlete_id: t.athlete_id,
      vlamax: t.vlamax,
      date: t.date,
      type: t.type,
      name: t.name,
    })),
    snapshots: snapshots.map(mapSnapshotToV2),
  }) : null;
  
  // Calculer l'âge de l'athlète (utilisé par TTE F33 et Potentiel Physiologique)
  const athleteAge = athlete?.birth_date ? (() => {
    const birthDate = new Date(athlete.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  })() : null;

  // TTE effectif
  const tteEffectif = effectiveSnapshot ? computeTTEEffectif({
    ftp: effectiveSnapshot.ftp ?? null,
    tss_7d: effectiveSnapshot.tss_7d ?? null,
    tte_mode: effectiveSnapshot.tte_mode ?? "LOAD",
    tte_observed_min: effectiveSnapshot.tte_observed_min ?? null,
    tte_observed_min_run: (effectiveSnapshot as any).tte_observed_min_run ?? null ?? null,
    objectif: athlete?.goal || "IM",
    age: athleteAge, // F33
  }) : null;

  // Potentiel Physiologique
  
  const potentielPhysiologique = tteEffectif && vlamaxEffectif ? computePotentielEffectif({
    objectif: athlete?.goal || "IM",
    vlamaxEffectif,
    tteEffectif,
    ftp: effectiveRefs?.ftp ?? null,
    poids: effectiveRefs?.weightKg ?? null,
    fatigue_ok: true,
    seance_specifique_validee: false,
    fcMax: effectiveRefs?.fcMax ?? null,
    deriveCardiaque: effectiveSnapshot?.run_hr_drift_pct ?? null,
    // ✅ Ajout âge pour uniformisation avec Compass
    athleteAge,
  }) : null;
  
  // Charge récente
  const tss7d = effectiveSnapshot?.tss_7d ?? null;
  const chargeStatus = computeChargeRecenteStatus(tss7d);
  
  // Risque blessure CAP
  const driftPct = effectiveSnapshot?.run_hr_drift_pct ?? null;
  const injuryRisk = computeInjuryRisk(driftPct, vlamaxEffectif, tteEffectif);
  
  // Nutrition prédictive
  const nutritionPred = vlamaxEffectif ? computeNutritionEstimate({
    vlamax: vlamaxEffectif.value,
    objectif: athlete?.goal || "IM",
    tteMin: tteEffectif?.tte_min ?? null,
    tteTarget: tteEffectif?.target ?? null,
  }) : null;
  
  // Potentiel Physiologique Signature (nouveau système Potentiel × Disponibilité)
  let potentielPhysiologiqueSignature: PotentielResult | null = null;
  if (athlete?.goal) {
    // Construire l'input pour le calcul
    const signatureInput: PotentielInput = {
      objectif: athlete.goal || "IM",
      vlamaxValue: vlamaxEffectif?.value ?? 0.40,
      vlamaxConfidence: vlamaxEffectif?.confidence ?? 0.5,
      tteMin: tteEffectif?.tte_min ?? 30,
      tteConfidence: tteEffectif?.confidence ?? 0.5,
      ftpKg: effectiveRefs?.ftp && effectiveRefs?.weightKg ? effectiveRefs.ftp / effectiveRefs.weightKg : null,
      vo2max: effectiveSnapshot?.vo2max ?? null,
    };
    
    potentielPhysiologiqueSignature = computePotentielSignature(signatureInput);
  }
  // Champs manquants
  const missingFields = identifyMissingFields(athlete, effectiveSnapshot);
  
  // Robustesse
  const confidences: number[] = [];
  if (vlamaxEffectif) confidences.push(vlamaxEffectif.confidence);
  if (tteEffectif) confidences.push(tteEffectif.confidence);
  if (potentielPhysiologique) confidences.push(potentielPhysiologique.confidence);
  const robustness = computeRobustness(confidences);
  
  // Wahoo SYSTM context
  let wahooSuggestions: WahooSuggestion[] = [];
  let wahooNeedAnalysis: NeedAnalysis | null = null;
  let wahooDiagnostic: string | null = null;
  
  if (vlamaxEffectif && tteEffectif && athlete?.goal) {
    const wahooCtx: SuggestionEngineContext = {
      objectif: athlete.goal,
      sportFocus: "tri",
      vlamaxEffectif: {
        value: vlamaxEffectif.value,
        confidence: vlamaxEffectif.confidence,
        source: vlamaxEffectif.source,
      },
      tteEffectif: {
        value: tteEffectif.tte_min,
        confidence: tteEffectif.confidence,
        source: tteEffectif.source,
      },
      potentielPhysiologique: {
        score: potentielPhysiologique?.score ?? null,
        details: {
          endurance: potentielPhysiologique?.details.endurance,
          vlamax: potentielPhysiologique?.details.vlamax,
          fraicheur: potentielPhysiologique?.details.fraicheur,
          puissance: potentielPhysiologique?.details.puissance,
        },
      },
      CRR: { value: tss7d, confidence: tss7d !== null ? 0.8 : 0.3 },
      injuryRiskRun: injuryRisk.level ? {
        level: injuryRisk.level,
        score: injuryRisk.level === "élevé" ? 8 : injuryRisk.level === "modéré" ? 5 : 2,
      } : undefined,
    };
    
    const wahooOutput = suggestWahooWorkouts(wahooCtx);
    wahooSuggestions = wahooOutput.suggestions;
    wahooNeedAnalysis = wahooOutput.needAnalysis;
    wahooDiagnostic = wahooOutput.diagnosticSummary;
  }
  
  // Focus workout (si spécifié)
  let focusWorkout: WahooWorkoutMapping | null = null;
  if (focusWahooWorkoutId) {
    focusWorkout = WAHOO_WORKOUTS.find(w => w.wahoo_id === focusWahooWorkoutId) || null;
  } else if (focusWahooWorkoutName) {
    const match = matchWahooSession(focusWahooWorkoutName);
    if (match.matched && match.workout) {
      focusWorkout = match.workout;
    }
  }
  
  return {
    currentModule,
    athlete: {
      id: athlete?.id ?? null,
      name: athlete?.name ?? null,
      goal: athlete?.goal ?? null,
      age: computeAge(athlete?.birth_date ?? null),
    },
    activeSnapshot: {
      exists: !!effectiveSnapshot,
      date: effectiveSnapshot?.date ?? null,
      source: effectiveSnapshot?.source ?? null,
    },
    vlamaxEffectif,
    tteEffectif,
    potentielPhysiologique,
    potentielPhysiologiqueSignature,
    chargeRecente: {
      tss7d,
      status: chargeStatus,
      confidence: tss7d !== null ? 0.9 : 0,
    },
    injuryRiskRun: {
      level: injuryRisk.level,
      driftPct,
      reason: injuryRisk.reason,
    },
    nutritionPred,
    derived: {
      ftp: effectiveRefs?.ftp ?? null,
      ftpKg,
      poids: effectiveRefs?.weightKg ?? null,
      fcMax: effectiveRefs?.fcMax ?? null,
      vo2max: effectiveSnapshot?.vo2max ?? null,
      vma: effectiveSnapshot?.vma ?? null,
    },
    missingFields,
    robustness,
    wahooContext: {
      suggestions: wahooSuggestions,
      needAnalysis: wahooNeedAnalysis,
      diagnosticSummary: wahooDiagnostic,
      focusWorkoutId: focusWahooWorkoutId || focusWorkout?.wahoo_id || null,
      focusWorkout,
    },
  };
}

// =============================================
// FORMATAGE POUR LE PROMPT AI
// =============================================

export function formatContextForPrompt(context: AssistantContextPacket): string {
  const parts: string[] = [];
  
  // Module
  parts.push(`## Module actuel: ${context.currentModule}`);
  
  // Athlète
  if (context.athlete.name) {
    parts.push(`## Athlète: ${context.athlete.name}`);
    parts.push(`- Objectif: ${context.athlete.goal || "non défini"}`);
    if (context.athlete.age) parts.push(`- Âge: ${context.athlete.age} ans`);
  } else {
    parts.push(`## Athlète: Aucun sélectionné`);
  }
  
  // Snapshot
  if (context.activeSnapshot.exists) {
    parts.push(`## Snapshot actif: ${context.activeSnapshot.date} (source: ${context.activeSnapshot.source})`);
  } else {
    parts.push(`## Snapshot: Aucun snapshot actif`);
  }
  
  // VLamax
  if (context.vlamaxEffectif) {
    const v = context.vlamaxEffectif;
    if (v.value !== null) {
      parts.push(`## VLamax: ${v.value.toFixed(2)} mmol/L/s`);
      parts.push(`- Source: ${v.source}`);
      parts.push(`- Confiance: ${(v.confidence * 100).toFixed(0)}%`);
      parts.push(`- Label: ${v.label}`);
    } else {
      parts.push(`## VLamax: Non disponible (source: ${v.source})`);
    }
  }
  
  // TTE
  if (context.tteEffectif) {
    const t = context.tteEffectif;
    parts.push(`## TTE: ${t.tte_min} min`);
    parts.push(`- Source: ${t.source}`);
    parts.push(`- Confiance: ${(t.confidence * 100).toFixed(0)}%`);
    parts.push(`- Cible: ${t.target} min`);
    parts.push(`- Statut: ${t.status}`);
  }
  
  // Potentiel Physiologique (ancien système)
  if (context.potentielPhysiologique) {
    const r = context.potentielPhysiologique;
    parts.push(`## Potentiel Physiologique Legacy: ${r.score}/100 (${r.label})`);
    parts.push(`- Confiance: ${(r.confidence * 100).toFixed(0)}%`);
  }
  
  // Potentiel Physiologique Signature (nouveau système Potentiel × Disponibilité)
  if (context.potentielPhysiologiqueSignature) {
    const rr = context.potentielPhysiologiqueSignature;
    parts.push(`\n## RACE READINESS SIGNATURE (Potentiel × Disponibilité → Décision)`);
    parts.push(`### Potentiel Physiologique: ${rr.potentialLabel} (score: ${rr.potentialScore}/100)`);
    if (rr.potentialReasons.length > 0) {
      parts.push(`Raisons: ${rr.potentialReasons.join(", ")}`);
    }
    parts.push(`### Disponibilité/Fraîcheur: ${rr.availabilityLabel} (score: ${rr.availabilityScore}/100)`);
    if (rr.availabilityReasons.length > 0) {
      parts.push(`Raisons: ${rr.availabilityReasons.join(", ")}`);
    }
    parts.push(`### DÉCISION: ${rr.decisionIcon} ${rr.decisionLabel}`);
    parts.push(`- Zone: ${rr.decisionZone.toUpperCase()}`);
    parts.push(`- Statut: ${((rr.recommendation as any)?.status ?? '').toUpperCase()}`);
    parts.push(`- Titre: ${((rr.recommendation as any)?.title ?? rr.recommendation)}`);
    parts.push(`- Message: ${((rr.recommendation as any)?.message ?? '')}`);
    parts.push(`- Actions recommandées:`);
    for (const action of ((rr.recommendation as any)?.actions ?? [])) {
      parts.push(`  • ${action}`);
    }
    parts.push(`- Confiance données: ${rr.confidenceLabel}`);
    if (rr.confidenceReasons.length > 0) {
      parts.push(`- Limitations: ${rr.confidenceReasons.join(", ")}`);
    }
  }
  
  // Charge récente
  if (context.chargeRecente.tss7d !== null) {
    parts.push(`## Charge 7j: ${context.chargeRecente.tss7d} TSS (${context.chargeRecente.status})`);
  }
  
  // Risque blessure
  if (context.injuryRiskRun.level) {
    parts.push(`## Risque blessure CAP: ${context.injuryRiskRun.level}`);
    if (context.injuryRiskRun.reason) {
      parts.push(`- Raison: ${context.injuryRiskRun.reason}`);
    }
  }
  
  // Nutrition
  if (context.nutritionPred) {
    const n = context.nutritionPred;
    parts.push(`## Nutrition prédictive: ${n.carbsMin}-${n.carbsMax}g/h glucides`);
    parts.push(`- Risque glycolytique: ${n.riskLevel}`);
  }
  
  // Données dérivées
  const d = context.derived;
  if (d.ftp !== null) parts.push(`## FTP: ${d.ftp}W`);
  if (d.ftpKg !== null) parts.push(`## FTP/kg: ${d.ftpKg.toFixed(2)} W/kg`);
  if (d.poids !== null) parts.push(`## Poids: ${d.poids}kg`);
  if (d.fcMax !== null) parts.push(`## FC Max: ${d.fcMax} bpm`);
  if (d.vma !== null || d.vo2max !== null) {
    parts.push(`## Running (pour analyse de course)`);
    if (d.vma !== null) parts.push(`- VMA: ${d.vma} km/h`);
    if (d.vo2max !== null) parts.push(`- VO2max: ${d.vo2max} ml/kg/min`);
  }
  
  
  // Champs manquants
  if (context.missingFields.length > 0) {
    parts.push(`## CHAMPS MANQUANTS (à renseigner):`);
    for (const m of context.missingFields) {
      parts.push(`- ${m.label}: ${m.whereToFix}`);
    }
  }
  
  // Robustesse
  parts.push(`## Robustesse globale: ${context.robustness.level} (confiance moyenne: ${(context.robustness.averageConfidence * 100).toFixed(0)}%)`);
  
  // Wahoo SYSTM context
  if (context.wahooContext.suggestions.length > 0 || context.wahooContext.focusWorkout) {
    parts.push(`\n## WAHOO SYSTM - CONTEXTE`);
    
    // Diagnostic
    if (context.wahooContext.diagnosticSummary) {
      parts.push(`Diagnostic: ${context.wahooContext.diagnosticSummary}`);
    }
    
    // Besoins identifiés
    if (context.wahooContext.needAnalysis && context.wahooContext.needAnalysis.needs.length > 0) {
      parts.push(`Besoins physiologiques identifiés: ${context.wahooContext.needAnalysis.needs.join(", ")}`);
      for (const rationale of context.wahooContext.needAnalysis.rationale) {
        parts.push(`- ${rationale}`);
      }
    }
    
    // Suggestions actives
    if (context.wahooContext.suggestions.length > 0) {
      parts.push(`\nSuggestions Wahoo (max 3):`);
      for (const s of context.wahooContext.suggestions) {
        parts.push(`- ${s.wahoo_name} (${s.target_need})`);
        parts.push(`  Effets: ${s.expected_effects.join(", ")}`);
        parts.push(`  Pourquoi: ${s.why}`);
        if (s.cautions.length > 0) {
          parts.push(`  Précautions: ${s.cautions.join("; ")}`);
        }
      }
    }
    
    // Focus workout (si question spécifique)
    if (context.wahooContext.focusWorkout) {
      const fw = context.wahooContext.focusWorkout;
      parts.push(`\n## SÉANCE WAHOO EN FOCUS: ${fw.wahoo_name}`);
      parts.push(`- Catégorie: ${fw.category}`);
      parts.push(`- Axe principal: ${fw.primary_axis}`);
      parts.push(`- Effet VLamax: ${fw.vlamax_effect}`);
      parts.push(`- Effet TTE: ${fw.tte_effect}`);
      parts.push(`- Niveau risque: ${fw.risk_level}/3`);
      parts.push(`- Annotation staff: ${fw.staff_annotation}`);
      if (fw.contraindications && fw.contraindications.length > 0) {
        parts.push(`- Contre-indications: ${fw.contraindications.join(", ")}`);
      }
      parts.push(`- Aliases: ${fw.aliases.join(", ")}`);
    }
  }
  
  return parts.join('\n');
}

// =============================================
// FORMATAGE POUR AFFICHAGE UI
// =============================================

export interface ContextDisplayItem {
  label: string;
  value: string;
  status?: "ok" | "warning" | "error";
  confidence?: number;
}

export function formatContextForDisplay(context: AssistantContextPacket): ContextDisplayItem[] {
  const items: ContextDisplayItem[] = [];
  
  // Athlète
  items.push({
    label: "Athlète",
    value: context.athlete.name || "Non sélectionné",
    status: context.athlete.name ? "ok" : "error"
  });
  
  items.push({
    label: "Objectif",
    value: context.athlete.goal || "Non défini"
  });
  
  items.push({
    label: "Module",
    value: context.currentModule
  });
  
  // Snapshot
  if (context.activeSnapshot.exists) {
    items.push({
      label: "Snapshot",
      value: `${context.activeSnapshot.date} (${context.activeSnapshot.source})`,
      status: "ok"
    });
  } else {
    items.push({
      label: "Snapshot",
      value: "Aucun",
      status: "warning"
    });
  }
  
  // VLamax
  if (context.vlamaxEffectif && context.vlamaxEffectif.value !== null) {
    const v = context.vlamaxEffectif;
    items.push({
      label: "VLamax",
      value: `${v.value.toFixed(2)} mmol/L/s (${v.source})`,
      status: v.confidence >= 0.7 ? "ok" : v.confidence >= 0.4 ? "warning" : "error",
      confidence: v.confidence
    });
  } else if (context.vlamaxEffectif) {
    items.push({
      label: "VLamax",
      value: `Non disponible (${context.vlamaxEffectif.source})`,
      status: "error"
    });
  }
  
  // TTE
  if (context.tteEffectif) {
    const t = context.tteEffectif;
    items.push({
      label: "TTE",
      value: `${t.tte_min} min (${t.source}, cible: ${t.target})`,
      status: t.status === "ok" ? "ok" : t.status === "warning" ? "warning" : "error",
      confidence: t.confidence
    });
  }
  
  // Potentiel Physiologique
  if (context.potentielPhysiologique) {
    const r = context.potentielPhysiologique;
    items.push({
      label: "Potentiel Physiologique",
      value: `${r.score}/100 (${r.label})`,
      status: r.score >= 80 ? "ok" : r.score >= 60 ? "warning" : "error",
      confidence: r.confidence
    });
  }
  
  // Charge
  if (context.chargeRecente.tss7d !== null) {
    const status = context.chargeRecente.tss7d > 700 ? "error" : 
                   context.chargeRecente.tss7d > 500 ? "warning" : "ok";
    items.push({
      label: "Charge 7j",
      value: `${context.chargeRecente.tss7d} TSS (${context.chargeRecente.status})`,
      status
    });
  }
  
  // Risque blessure
  if (context.injuryRiskRun.level) {
    items.push({
      label: "Risque blessure CAP",
      value: context.injuryRiskRun.level,
      status: context.injuryRiskRun.level === "faible" ? "ok" : 
              context.injuryRiskRun.level === "modéré" ? "warning" : "error"
    });
  }
  
  // Données dérivées
  if (context.derived.ftp !== null) {
    items.push({ label: "FTP", value: `${context.derived.ftp}W` });
  }
  if (context.derived.ftpKg !== null) {
    items.push({ label: "FTP/kg", value: `${context.derived.ftpKg.toFixed(2)} W/kg` });
  }
  if (context.derived.poids !== null) {
    items.push({ label: "Poids", value: `${context.derived.poids}kg` });
  }
  
  // Robustesse
  items.push({
    label: "Robustesse",
    value: `${context.robustness.level} (${(context.robustness.averageConfidence * 100).toFixed(0)}%)`,
    status: context.robustness.level === "robuste" ? "ok" : 
            context.robustness.level === "prudent" ? "warning" : "error"
  });
  
  // Champs manquants
  if (context.missingFields.length > 0) {
    items.push({
      label: "Champs manquants",
      value: `${context.missingFields.length} champ(s)`,
      status: context.missingFields.some(m => m.impact === "high") ? "error" : "warning"
    });
  }
  
  return items;
}
