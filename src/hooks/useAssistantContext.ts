// =============================================
// HOOK - Contexte Assistant
// Fournit le contexte athlète au chatbot
// =============================================

import { useMemo } from "react";
import { useCloudData, DbAthlete, DbSnapshot } from "@/contexts/CloudDataContext";
import { computeVLamaxEffectif, type VLamaxEffectif, computeTTEEffectif, type TTEEffectif } from "@/engines/diagnostic";
import { getEffectiveRefs, computeFtpKg, EffectiveRefs } from "@/lib/effectiveRefs";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { computeNutritionEstimate, NutritionEstimate } from "@/lib/nutritionPredictive";

// =============================================
// TYPES
// =============================================

export interface AssistantAthleteContext {
  // Athlète
  athleteId: string | null;
  athleteName: string | null;
  objectif: string | null;
  
  // Snapshot actif
  hasActiveSnapshot: boolean;
  snapshotDate: string | null;
  snapshotSource: string | null;
  
  // Métriques effectifs
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  
  // Données dérivées
  ftp: number | null;
  ftpKg: number | null;
  poids: number | null;
  fcMax: number | null;
  vo2max: number | null;
  
  // Charge et risques
  tss7d: number | null;
  crrStatus: string | null;
  
  // Nutrition prédictive
  nutritionEstimate: NutritionEstimate | null;
  
  // Page actuelle
  currentPage: string;
}

export interface AssistantContextForAI {
  summary: string;      // Résumé texte pour le prompt AI
  raw: AssistantAthleteContext;  // Données brutes
}

// =============================================
// HOOK
// =============================================

export function useAssistantContext(
  selectedAthleteId: string | null,
  currentPage: string = "dashboard"
): AssistantContextForAI {
  const { athletes, snapshots, tests } = useCloudData();
  
  const context = useMemo<AssistantAthleteContext>(() => {
    // Pas d'athlète sélectionné
    if (!selectedAthleteId) {
      return {
        athleteId: null,
        athleteName: null,
        objectif: null,
        hasActiveSnapshot: false,
        snapshotDate: null,
        snapshotSource: null,
        vlamaxEffectif: null,
        tteEffectif: null,
        ftp: null,
        ftpKg: null,
        poids: null,
        fcMax: null,
        vo2max: null,
        tss7d: null,
        crrStatus: null,
        nutritionEstimate: null,
        currentPage,
      };
    }
    
    // Trouver l'athlète
    const athlete = athletes.find(a => a.id === selectedAthleteId);
    if (!athlete) {
      return {
        athleteId: selectedAthleteId,
        athleteName: null,
        objectif: null,
        hasActiveSnapshot: false,
        snapshotDate: null,
        snapshotSource: null,
        vlamaxEffectif: null,
        tteEffectif: null,
        ftp: null,
        ftpKg: null,
        poids: null,
        fcMax: null,
        vo2max: null,
        tss7d: null,
        crrStatus: null,
        nutritionEstimate: null,
        currentPage,
      };
    }
    
    // Trouver le snapshot effectif
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === selectedAthleteId);
    let effectiveSnapshot: DbSnapshot | null = null;
    
    if (athleteSnapshots.length > 0) {
      if (athlete.active_snapshot_id) {
        effectiveSnapshot = athleteSnapshots.find(s => s.id === athlete.active_snapshot_id) || null;
      }
      if (!effectiveSnapshot) {
        effectiveSnapshot = [...athleteSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
      }
    }
    
    // Effective refs
    const effectiveRefs = getEffectiveRefs(athlete, snapshots);
    const ftpKg = computeFtpKg(effectiveRefs);
    
    // VLamax effectif
    const vlamaxEffectif = computeVLamaxEffectif({
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
      snapshots: snapshots.map(s => ({
        id: s.id,
        athlete_id: s.athlete_id,
        date: s.date,
        vlamax: s.vlamax,
        vlamax_run: (s as any).vlamax_run ?? null, // ✅ requis pour routing CAP
        ftp: s.ftp,
        pmax_5s: s.pmax_5s,
        weight_kg: s.weight_kg,
        sport_main: s.sport_main,
        p30s_w: s.p30s_w,
        p60s_w: s.p60s_w,
        map5min_w: s.map5min_w,
        tte_observed_min: s.tte_observed_min,
        protocol_quality: s.protocol_quality,
        objectif: s.objectif,
        vo2max: s.vo2max,
      })),
    });
    
    // TTE effectif
    const tteEffectif = effectiveSnapshot ? computeTTEEffectif({
      ftp: effectiveSnapshot.ftp ?? null,
      tss_7d: effectiveSnapshot.tss_7d ?? null,
      tte_mode: effectiveSnapshot.tte_mode ?? "LOAD",
      tte_observed_min: effectiveSnapshot.tte_observed_min ?? null,
      objectif: athlete.goal || "IM",
    }) : null;
    
    // Potentiel Physiologique effectif
    // Calculer l'âge de l'athlète
    const athleteAge = athlete.birth_date ? (() => {
      const birthDate = new Date(athlete.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    })() : null;
    
    // CRR status
    const tss7d = effectiveSnapshot?.tss_7d ?? null;
    let crrStatus: string | null = null;
    if (tss7d !== null) {
      if (tss7d < 300) crrStatus = "légère";
      else if (tss7d < 500) crrStatus = "modérée";
      else if (tss7d < 700) crrStatus = "élevée";
      else crrStatus = "très élevée";
    }
    
    // Nutrition estimate
    const nutritionEstimate = computeNutritionEstimate({
      vlamax: vlamaxEffectif.value,
      objectif: athlete.goal || "IM",
      tteMin: tteEffectif?.tte_min ?? null,
      tteTarget: tteEffectif?.target ?? null,
    });
    
    return {
      athleteId: athlete.id,
      athleteName: athlete.name,
      objectif: athlete.goal,
      hasActiveSnapshot: !!effectiveSnapshot,
      snapshotDate: effectiveSnapshot?.date ?? null,
      snapshotSource: effectiveSnapshot?.source ?? null,
      vlamaxEffectif,
      tteEffectif,
      ftp: effectiveRefs.ftp ?? null,
      ftpKg,
      poids: effectiveRefs.weightKg ?? null,
      fcMax: effectiveRefs.fcMax ?? null,
      vo2max: effectiveSnapshot?.vo2max ?? null,
      tss7d,
      crrStatus,
      nutritionEstimate,
      currentPage,
    };
  }, [selectedAthleteId, athletes, snapshots, tests, currentPage]);
  
  // Générer le résumé pour le prompt AI
  const summary = useMemo(() => {
    if (!context.athleteName) {
      return "Aucun athlète sélectionné.";
    }
    
    const parts: string[] = [];
    
    parts.push(`Athlète: ${context.athleteName}`);
    parts.push(`Objectif: ${context.objectif || "non défini"}`);
    parts.push(`Page actuelle: ${context.currentPage}`);
    
    if (context.hasActiveSnapshot) {
      parts.push(`Snapshot actif: ${context.snapshotDate} (source: ${context.snapshotSource})`);
    } else {
      parts.push("Aucun snapshot actif.");
    }
    
    // VLamax
    if (context.vlamaxEffectif) {
      const v = context.vlamaxEffectif;
      if (v.value !== null) {
        parts.push(`VLamax: ${v.value.toFixed(2)} mmol/L/s (source: ${v.source}, confiance: ${(v.confidence * 100).toFixed(0)}%)`);
      } else {
        parts.push("VLamax: non disponible");
      }
    }
    
    // TTE
    if (context.tteEffectif) {
      const t = context.tteEffectif;
      parts.push(`TTE: ${t.tte_min} min (source: ${t.source}, confiance: ${(t.confidence * 100).toFixed(0)}%, cible: ${t.target} min, statut: ${t.status})`);
    }
    
    // (Potentiel Physiologique removed)
    
    // Autres métriques
    if (context.ftp !== null) parts.push(`FTP: ${context.ftp}W`);
    if (context.ftpKg !== null) parts.push(`FTP/kg: ${context.ftpKg.toFixed(2)} W/kg`);
    if (context.poids !== null) parts.push(`Poids: ${context.poids}kg`);
    if (context.fcMax !== null) parts.push(`FCmax: ${context.fcMax} bpm`);
    if (context.tss7d !== null) parts.push(`Charge 7j: ${context.tss7d} TSS (${context.crrStatus})`);
    
    // Nutrition
    if (context.nutritionEstimate) {
      const n = context.nutritionEstimate;
      parts.push(`Nutrition prédictive: ${n.carbsMin}–${n.carbsMax}g/h glucides, risque: ${n.riskLevel}`);
    }
    
    return parts.join("\n");
  }, [context]);
  
  return {
    summary,
    raw: context,
  };
}

// =============================================
// FORMATAGE POUR AFFICHAGE UI (Mode Contexte)
// =============================================

export function formatContextForDisplay(context: AssistantAthleteContext): { label: string; value: string; status?: "ok" | "warning" | "error" }[] {
  const items: { label: string; value: string; status?: "ok" | "warning" | "error" }[] = [];
  
  items.push({ label: "Athlète", value: context.athleteName || "Non sélectionné" });
  items.push({ label: "Objectif", value: context.objectif || "Non défini" });
  items.push({ label: "Page", value: context.currentPage });
  
  if (context.hasActiveSnapshot) {
    items.push({ label: "Snapshot", value: `${context.snapshotDate} (${context.snapshotSource})`, status: "ok" });
  } else {
    items.push({ label: "Snapshot", value: "Aucun", status: "warning" });
  }
  
  // VLamax
  if (context.vlamaxEffectif && context.vlamaxEffectif.value !== null) {
    const v = context.vlamaxEffectif;
    const status = v.confidence >= 0.7 ? "ok" : v.confidence >= 0.4 ? "warning" : "error";
    items.push({ 
      label: "VLamax", 
      value: `${v.value.toFixed(2)} (${v.source}, ${(v.confidence * 100).toFixed(0)}%)`,
      status 
    });
  } else {
    items.push({ label: "VLamax", value: "Non disponible", status: "error" });
  }
  
  // TTE
  if (context.tteEffectif) {
    const t = context.tteEffectif;
    const status = t.status === "ok" ? "ok" : t.status === "warning" ? "warning" : "error";
    items.push({ 
      label: "TTE", 
      value: `${t.tte_min} min (${t.source}, cible: ${t.target})`,
      status 
    });
  }
  
  // (Potentiel Physiologique removed)
  
  // Autres
  if (context.ftp !== null) items.push({ label: "FTP", value: `${context.ftp}W` });
  if (context.ftpKg !== null) items.push({ label: "FTP/kg", value: `${context.ftpKg.toFixed(2)} W/kg` });
  if (context.poids !== null) items.push({ label: "Poids", value: `${context.poids}kg` });
  if (context.tss7d !== null) {
    const status = context.tss7d > 700 ? "error" : context.tss7d > 500 ? "warning" : "ok";
    items.push({ label: "Charge 7j", value: `${context.tss7d} TSS`, status });
  }
  
  return items;
}
