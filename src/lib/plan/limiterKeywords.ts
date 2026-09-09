/**
 * Fix B3 (audit "génération de plan IA") : mots-clés associés au limiteur
 * prioritaire (L1) de l'athlète — mirror EXACT de
 * `supabase/functions/ai-training-plan/sportRatioMatrix.ts::extractLimiterKeywords`
 * (edge function, Deno — non importable depuis le client). Les deux copies
 * doivent rester synchronisées manuellement ; toute évolution de la version
 * serveur (source de vérité pour l'insertion de séance manquante,
 * jsonPlanHandler.ts::matchesLimiter) doit être reportée ici.
 *
 * Le réconciliateur client (planReconciler.ts) n'avait jusqu'ici AUCUNE
 * notion de facteur limitant — contrairement au serveur qui cible
 * explicitement le limiteur L1 à l'insertion. Le client, qui s'exécute
 * APRÈS sur les mêmes chunks (substitutions phase/durée/discipline/quota),
 * pouvait donc remplacer une insertion pertinente sans tenir compte de ce
 * ciblage.
 */
export function extractLimiterKeywords(limiterName: string): string[] {
  const kw: string[] = [];
  const l = limiterName.toLowerCase();
  // VLamax (reduction) = glycolytic suppression, NOT sprint/force (which INCREASE VLamax)
  if (/vlamax/i.test(l)) kw.push("vlamax", "train low", "glycoly", "z2 long", "endurance fond", "aérobie pur", "jeun", "seuil long", "threshold long", "sfr", "force basse cadence", "low cadence");
  if (/tte|time.to.exhaust/i.test(l)) kw.push("tte", "seuil continu", "norvégi", "mlss", "tempo long", "threshold long");
  if (/durabilit/i.test(l)) kw.push("durabilit", "sortie longue", "long run", "brick", "finish rapide", "simulation");
  if (/fatmax|lipid|fat.ox/i.test(l)) kw.push("fatmax", "fat max", "lipid", "oxydation", "glycogène", "gut training");
  if (/econom|running.econ/i.test(l)) kw.push("économie", "cadence", "technique", "gammes", "foulée", "strides", "côte", "sfr");
  if (/ftp|puissance.seuil/i.test(l)) kw.push("ftp", "sweet spot", "over-under", "threshold power", "seuil puissance");
  if (/vo2|vo2max|pma/i.test(l)) kw.push("vo2", "pma", "interval", "30/30", "billat", "hiit");
  if (/vma/i.test(l)) kw.push("vma", "interval", "fractionné", "30/30", "piste", "billat");
  if (/force|renfo/i.test(l)) kw.push("force", "renfo", "muscul", "côte", "sfr", "rønnestad");
  if (/natation|swim|css/i.test(l)) kw.push("natation", "swim", "css", "crawl", "pull");
  if (/sprint|pmax|neuro/i.test(l)) kw.push("sprint", "pmax", "neuro", "explo", "plyo", "force max");
  if (kw.length === 0) {
    kw.push(...l.split(/[\s/,()]+/).filter(w => w.length > 3));
  }
  return kw;
}
