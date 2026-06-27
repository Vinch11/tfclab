// =============================================
// SNAPSHOT - Analyse Two For Coaching Lab™
// =============================================

export interface Snapshot {
  id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  source: "manual" | "nolio" | "import" | "finisher-express";
  cycle_tag?: string;
  confidence?: number; // 0-1
  
  // Références physiologiques
  fc_max?: number;
  vma?: number;
  ftp?: number;
  css?: number;
  vo2max?: number;
  vlamax_run?: number; // VLamax CAP (mmol/L/s), distinct de vlamax (vélo)
  vlamax?: number;
  weight_kg?: number;
  fat_pct?: number;
  pmax_5s?: number;
  
  // Indicateurs calculés
  metabolic_profile?: string;
  metabolic_score?: number;
  
  // Notes
  coach_notes?: string;
  
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface MetabolicProfile {
  profile: string;
  score: number | null;
}

// Calcule le profil métabolique à partir de VLamax et VO2max
export function deriveMetabolicProfile(vlamax: number | null, vo2max: number | null): MetabolicProfile {
  if (vlamax == null && vo2max == null) {
    return { profile: "Inconnu", score: null };
  }
  
  const v = vlamax ?? 0.38; // centre par défaut
  const o = vo2max ?? 55;
  
  // Score: 0-100 (plus haut = aérobie favorable)
  const score = Math.max(0, Math.min(100, 65 + (o - 55) * 1.2 - (v - 0.38) * 120));
  
  let profile = "Mixte";
  if (v >= 0.45) profile = "Glycolytique (VLamax haute)";
  if (v <= 0.30) profile = "Oxydatif (VLamax basse)";
  if (score >= 75) profile = "Aérobie très favorable";
  if (score <= 45) profile = "Aérobie limitée / glycolyse dominante";
  
  return { profile, score: Math.round(score) };
}

// Génère des insights Two For Coaching Lab™ basés sur le snapshot et l'objectif
export function generateTwoForCoachingInsights(
  snapshot: Snapshot,
  goal: string
): string[] {
  const insights: string[] = [];
  const v = snapshot.vlamax;
  const vo2 = snapshot.vo2max;
  const ftp = snapshot.ftp;
  const vma = snapshot.vma;
  
  const { profile, score } = deriveMetabolicProfile(v ?? null, vo2 ?? null);
  
  // 1) Confiance
  if (snapshot.confidence != null) {
    if (snapshot.confidence < 0.6) {
      insights.push("⚠️ Confiance faible : privilégier tendances + retours terrain avant de modifier fortement la stratégie.");
    } else {
      insights.push("✅ Confiance correcte : les ajustements de distribution A/B/C/D peuvent être appliqués avec plus de certitude.");
    }
  }
  
  // 2) Profil métabolique
  insights.push(`🧠 Profil : ${profile}${score != null ? ` (score ${score}/100)` : ""}.`);
  
  // 3) Règles par objectif
  const upperGoal = (goal || "").toLowerCase();
  
  if (v != null) {
    if (upperGoal.includes("ironman") || upperGoal.includes("im") || upperGoal.includes("half") || upperGoal.includes("703")) {
      if (v >= 0.45) {
        insights.push("🎯 Triathlon long : VLamax élevée → risque de coût glycolytique sur durée. Priorité : A (endurance) + tempo Z3 contrôlé, limiter B très lactique.");
      }
      if (v <= 0.30) {
        insights.push("🎯 Triathlon long : VLamax basse → excellent pour durée, mais surveiller la capacité de relance. Ajouter B court 'propre' (côtes/30–60s) à petite dose.");
      }
    }
    
    if (upperGoal.includes("marathon") || upperGoal.includes("semi")) {
      if (v >= 0.45) {
        insights.push("🎯 Marathon/semi : VLamax élevée → priorité à l'économie + seuil (Z3/Z4a) + volume A. B oui, mais court et contrôlé.");
      }
      if (v <= 0.30) {
        insights.push("🎯 Marathon/semi : VLamax basse → bon pour tenir longtemps, ajouter blocs au seuil + quelques relances pour préserver la vitesse/économie.");
      }
    }
    
    if (upperGoal.includes("trail")) {
      if (v >= 0.45) {
        insights.push("🎯 Trail : VLamax élevée → travailler endurance en montée + tempo côte, limiter les séances très explosives si fatigue.");
      }
      if (v <= 0.30) {
        insights.push("🎯 Trail : VLamax basse → très bon pour effort long, ajouter côtes courtes/relances pour répondre aux changements de rythme.");
      }
    }
  }
  
  // 4) Cohérence refs
  if (vo2 != null && vo2 < 45) {
    insights.push("🔧 VO₂ estimée basse : bloc de développement aérobie (B type VO2 en côte/3') peut être pertinent.");
  }
  
  if (ftp != null && snapshot.weight_kg != null) {
    const ftpKg = ftp / snapshot.weight_kg;
    if (ftpKg < 2.8) {
      insights.push("🔧 FTP relatif faible : prioriser volume A + tempo, limiter surcharge B si récupération insuffisante.");
    }
  }
  
  if (vma != null && vma < 14) {
    insights.push("🔧 VMA faible : intégrer du travail technique/économie + progressifs plutôt que trop de lactique.");
  }
  
  // 5) Notes coach
  const notes = (snapshot.coach_notes || "").toLowerCase();
  if (notes.includes("fatigue") || notes.includes("douleur") || notes.includes("mal")) {
    insights.push("🛑 Notes coach indiquent fatigue/douleur : adapter immédiatement (plus de D, réduire B, garder du mouvement doux).");
  }
  
  return insights;
}

/** @deprecated Use generateTwoForCoachingInsights instead */
export const generateLorangInsights = generateTwoForCoachingInsights;

// Calcule le delta entre deux valeurs
export function calculateDelta(a: number | null | undefined, b: number | null | undefined): string {
  if (a == null || b == null) return "—";
  const d = b - a;
  const sign = d > 0 ? "+" : "";
  return `${sign}${Math.round(d * 100) / 100}`;
}

// Formate une valeur avec unité
export function formatValue(v: number | null | undefined, unit?: string): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = (Math.round(v * 100) / 100).toString();
  return unit ? `${s} ${unit}` : s;
}
