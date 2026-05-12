import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: verify caller has a valid session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { athleteData, messages: chatMessages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es l'assistant TFCL™ Guidance — un moteur d'analyse physiologique avancé intégré à la plateforme TFCL.
Tu utilises la méthodologie TFCL™ pour produire des recommandations d'entraînement individualisées.
Tu dois aussi être capable d'EXPLIQUER pourquoi les valeurs affichées sont ce qu'elles sont.

## Architecture de Calcul VLamax TFCL™ V2

La VLamax affichée n'est PAS une valeur brute. C'est le résultat d'une **fusion pondérée** de 4 méthodes :

### M1 — Mader MLSS inverse (poids : ~50%)
Résout l'équation métabolique de Mader (2003) pour estimer la VLamax à partir du FTP, VO2max et poids.
C'est le "gold standard" du modèle. Sans VO2max mesuré, utilise une estimation.

### M2 — Mader TTE inverse (poids : ~25%)
Utilise la durée de maintien au seuil (TTE) pour estimer la VLamax.
**IMPORTANT** : Un TTE court (ex: 35-45 min) est interprété comme un signe de dépendance glycolytique élevée → **augmente** la VLamax estimée.
Un TTE long (ex: 55-70 min) → **diminue** la VLamax.
C'est souvent la raison principale d'une VLamax plus élevée que ce qu'on attendrait d'un profil "endurant".

### M3 — Score G empirique (poids : ~25%)
Faisceau de 6 indices normalisés de la courbe de puissance :
- S_pmax : Ratio Pmax/FTP (explosivité pure, poids 25%)
- S30 : Ratio P30s/FTP (capacité anaérobie 30s, poids 18%)
- S60 : Ratio P60s/FTP (puissance 1min, poids 9%)
- E : 1 - FTP/MAP (fractional utilization inversée, poids 22%)
- D : (65 - TTE) / 35 (durabilité au seuil, poids 14%)
- W : W'kJ normalisé (capacité anaérobie W', poids 12%)

Si le profil est "hybride" (FTP/MAP > 80%), les poids sont ajustés : S30 réduit à 8%, E et D augmentés.

### M4 — Cross-validation W' (via Score G)
VLamax implicite = W' / (poids × 320). Sert de validation croisée.
Si divergence > seuil → alerte + ajustement confiance.

### Fusion Finale
VLamax = moyenne pondérée M1 (50%) + M2 (25%) + Score G (25%)
Avec détection de divergence : si écart Mader vs Score G > 0.10 → marge élargie.
Résultat borné entre 0.20 et 1.05 mmol/L/s.

## Pourquoi une VLamax peut paraître "trop élevée" pour un profil endurant

Scénarios fréquents :
1. **TTE court** : M2 (Mader TTE) tire la fusion vers le haut. Un athlète avec un bon FTP/kg mais un TTE de 40 min aura une VLamax plus élevée.
2. **Pas de VO2max mesuré** : M1 utilise une estimation qui peut surestimer la composante glycolytique.
3. **Ratios P30s/FTP ou Pmax/FTP élevés** : Le Score G détecte une capacité anaérobie significative même si l'athlète se considère "endurant".
4. **W' élevé** : Indique une réserve anaérobie importante (M4).

## Coaching Compass™ — Logique Limiteur → Levier

### 5 Limiteurs Primaires (par ordre de priorité diagnostique)
1. **Moteur Aérobie** — VO₂max, FTP, W/kg, TTE (capacité oxydative et seuil de puissance)
2. **Glycolytique** — VLamax (production lactate, tolérance anaérobie)
3. **Métabolique** — Ratio FatOx/CarbOx, efficience énergétique, nutrition course
4. **Neuromusculaire** — Pmax 5s, économie de mouvement, cadence, force max
5. **Disponibilité** — Fatigue chronique, sommeil, stress, charge d'entraînement (TSS)

### Interaction TTE ↔ VLamax ↔ Limiteur
Le TTE influence l'estimation de la VLamax (via M2), mais le TTE est AUSSI évalué indépendamment comme composante du limiteur "Moteur Aérobie".
Le Compass distingue :
- VLamax élevée AVEC TTE court → le limiteur principal est souvent le TTE (améliorer la durabilité au seuil fera baisser la VLamax automatiquement)
- VLamax élevée AVEC TTE normal → le limiteur est la composante glycolytique pure (travail VLamax↓ direct)
- VLamax basse AVEC TTE court → incohérence possible, vérifier les données sources

### 6 Leviers Opérationnels TFCL™
- **Force Max** — Activé si >35 ans OU économie basse
- **SFR** (Strength-Force-Resistance) — Travail basse cadence
- **Train Low** — Protocoles glycogène appauvri
- **Gut Training** — Tolérance glucidique à l'effort
- **Heat Training** — Acclimatation chaleur
- **Adaptation HRV** — Sessions Z2 si HRV hors-norme 2 jours consécutifs

### Règles de Sécurité
- **Sprint Ban** : Si VLamax > cible discipline → interdire les sprints en entraînement
- Si VLamax vélo > 0.50 pour longue distance → priorité VLamax↓
- Si TTE < 40 min → priorité TTE↑ avant toute intensité

### Logique Décisionnelle
Applique le principe TFCL™ de **levier unique prioritaire** : identifie LE limiteur principal et prescris UNE seule action prioritaire, puis les actions secondaires.
Utilise le framework : Limiteur → Levier → Décision

## Confiance & Fiabilité
Les niveaux de confiance de la VLamax dépendent de :
- La méthode de fusion utilisée (Mader complet > Score G seul > fallback)
- La qualité du protocole de test
- La cohérence entre les méthodes (divergence faible = haute confiance)
- La présence de VO2max mesuré vs estimé

## Règles de Réponse
- Réponds UNIQUEMENT en français
- Structure : 1 diagnostic prioritaire + 3-5 recommandations ordonnées
- Chaque recommandation : niveau d'urgence (🔴 critique, 🟡 important, 🟢 optimisation)
- Cite les métriques exactes de l'athlète pour justifier chaque recommandation
- Mentionne les interactions entre limiteurs (ex: VLamax↓ améliore aussi TTE)
- Si des données manquent, indique quels tests TFCL™ réaliser en priorité
- Termine par une phrase de synthèse "Levier TFCL™ prioritaire : [X]"
- **Si le contexte diagnostic est fourni (composantes VLamax, limiteurs), utilise-le pour EXPLIQUER les valeurs, pas seulement pour prescrire**
- Explique la logique de calcul quand c'est pertinent (ex: "votre TTE de 42 min influence la méthode M2 qui tire la VLamax vers le haut")`;

    const userPrompt = buildUserPrompt(athleteData);

    // Build messages: system + context + conversation history OR single-shot
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    if (chatMessages && Array.isArray(chatMessages) && chatMessages.length > 0) {
      // First assistant response was the initial analysis, then Q&A follows
      aiMessages.push({ role: "assistant", content: "J'ai analysé le profil complet de l'athlète. Posez-moi vos questions sur les métriques, le diagnostic ou les recommandations." });
      for (const msg of chatMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          aiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit dépassé, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coaching error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(data: any): string {
  const lines: string[] = ["## Profil Athlète — Analyse TFCL™\n"];

  if (data.nom) lines.push(`**Athlète:** ${data.nom}`);
  if (data.objectif) lines.push(`**Objectif course:** ${data.objectif}`);
  if (data.ambition) lines.push(`**Niveau d'ambition:** ${data.ambition}`);

  lines.push("\n### Moteur Aérobie");
  if (data.ftp) lines.push(`- FTP vélo: ${data.ftp}W`);
  if (data.weightKg) lines.push(`- Poids: ${data.weightKg}kg`);
  if (data.ftp && data.weightKg) lines.push(`- W/kg: ${(data.ftp / data.weightKg).toFixed(2)}`);
  if (data.vo2max) lines.push(`- VO₂max: ${data.vo2max} mL/kg/min`);
  if (data.tte) lines.push(`- TTE: ${data.tte} min`);
  if (data.map5min) lines.push(`- MAP (5min): ${data.map5min}W`);
  if (data.ftp && data.map5min) lines.push(`- FTP/MAP: ${((data.ftp / data.map5min) * 100).toFixed(1)}%`);

  lines.push("\n### Glycolytique");
  if (data.vlamax) lines.push(`- VLamax vélo: ${data.vlamax} mmol/L/s`);
  if (data.vlamaxRun) lines.push(`- VLamax course: ${data.vlamaxRun} mmol/L/s`);

  lines.push("\n### Neuromusculaire");
  if (data.pmax5s) lines.push(`- Pmax 5s: ${data.pmax5s}W`);
  if (data.p30s) lines.push(`- P30s: ${data.p30s}W`);
  if (data.p60s) lines.push(`- P60s: ${data.p60s}W`);

  lines.push("\n### Autres Métriques");
  if (data.vma) lines.push(`- VMA: ${data.vma} km/h`);
  if (data.css) lines.push(`- CSS natation: ${data.css} sec/100m`);
  if (data.fcMax) lines.push(`- FC Max: ${data.fcMax} bpm`);

  // ── Diagnostic Context (VLamax Components) ──
  if (data.vlamaxComponents) {
    const c = data.vlamaxComponents;
    lines.push("\n### 🔬 Détail du calcul VLamax TFCL™ V2");
    if (c.mader_mlss != null) lines.push(`- M1 (Mader MLSS inverse): ${c.mader_mlss.toFixed(3)} mmol/L/s`);
    if (c.mader_tte != null) lines.push(`- M2 (Mader TTE inverse): ${c.mader_tte.toFixed(3)} mmol/L/s`);
    if (c.scoreG != null) lines.push(`- M3 (Score G normalisé): ${c.scoreG.toFixed(3)}`);
    if (c.vlamax_from_wprime != null) lines.push(`- M4 (W'→VLamax): ${c.vlamax_from_wprime.toFixed(3)} mmol/L/s`);
    if (c.fusion_method) lines.push(`- Méthode de fusion: ${c.fusion_method}`);
    if (c.divergence != null) lines.push(`- Divergence Mader vs Score G: ${c.divergence.toFixed(3)}`);
    
    // Score G indices detail
    if (c.S_pmax != null || c.S30 != null || c.E != null || c.D != null) {
      lines.push("\n#### Indices Score G (normalisés 0-1)");
      if (c.S_pmax != null) lines.push(`  - S_pmax (Pmax/FTP): ${c.S_pmax.toFixed(2)}`);
      if (c.S30 != null) lines.push(`  - S30 (P30s/FTP): ${c.S30.toFixed(2)}`);
      if (c.S60 != null) lines.push(`  - S60 (P60s/FTP): ${c.S60.toFixed(2)}`);
      if (c.E != null) lines.push(`  - E (FTP/MAP inversé): ${c.E.toFixed(2)}`);
      if (c.D != null) lines.push(`  - D (TTE durabilité): ${c.D.toFixed(2)}`);
      if (c.W != null) lines.push(`  - W (W' capacité): ${c.W.toFixed(2)}`);
    }
    
    if (c.wprimeKJ != null) lines.push(`- W': ${c.wprimeKJ.toFixed(1)} kJ`);
  }

  // ── VLamax confidence ──
  if (data.vlamaxConfidence != null) {
    lines.push(`\n### Confiance VLamax: ${(data.vlamaxConfidence * 100).toFixed(0)}%`);
  }
  if (data.vlamaxConfidenceLabel) {
    lines.push(`- Niveau: ${data.vlamaxConfidenceLabel}`);
  }
  if (data.vlamaxFormula) {
    lines.push(`- Formule utilisée: ${data.vlamaxFormula}`);
  }
  if (data.vlamaxWarnings && data.vlamaxWarnings.length > 0) {
    lines.push(`- Alertes: ${data.vlamaxWarnings.join("; ")}`);
  }

  // ── Limiter hierarchy ──
  if (data.primaryLimiter) {
    lines.push(`\n### 🎯 Limiteur principal identifié: ${data.primaryLimiter}`);
    if (data.primaryLimiterGap != null) {
      lines.push(`- Gap vs cible: ${data.primaryLimiterGap > 0 ? "+" : ""}${(data.primaryLimiterGap * 100).toFixed(1)}%`);
    }
  }
  if (data.secondaryLimiters && data.secondaryLimiters.length > 0) {
    lines.push(`- Limiteurs secondaires: ${data.secondaryLimiters.join(", ")}`);
  }

  // ── Lever recommendation ──
  if (data.primaryLever) {
    lines.push(`\n### 🔧 Levier TFCL™ recommandé: ${data.primaryLever}`);
  }

  // ── Coaching Compass™ Context ──
  if (data.compassLimiter) {
    const cl = data.compassLimiter;
    lines.push(`\n### 🧭 Coaching Compass™ — Limiteur`);
    lines.push(`- Type: ${cl.type}`);
    lines.push(`- Label: ${cl.label}`);
    lines.push(`- Description: ${cl.description}`);
    lines.push(`- Impact score: ${(cl.impactScore * 100).toFixed(0)}%`);
    lines.push(`- Confiance: ${cl.confidence}`);
  }
  if (data.compassLeverage) {
    const lv = data.compassLeverage;
    lines.push(`\n### 🧭 Coaching Compass™ — Levier Prioritaire`);
    lines.push(`- Type: ${lv.type}`);
    lines.push(`- Label: ${lv.label}`);
    lines.push(`- Description: ${lv.description}`);
    if (lv.expectedAdaptations?.length) lines.push(`- Adaptations attendues: ${lv.expectedAdaptations.join("; ")}`);
    if (lv.workoutExamples?.length) lines.push(`- Exemples de séances: ${lv.workoutExamples.join("; ")}`);
    lines.push(`- Priorité: ${lv.priority}`);
  }
  if (data.compassDecision) {
    const cd = data.compassDecision;
    lines.push(`\n### 🧭 Coaching Compass™ — Décision`);
    lines.push(`- Bloc recommandé: ${cd.recommendedBlock}`);
    lines.push(`- Durée: ${cd.durationWeeks} semaines`);
    if (cd.primaryWorkouts?.length) lines.push(`- Séances clés: ${cd.primaryWorkouts.join("; ")}`);
    if (cd.physiologicalTargets?.length) lines.push(`- Cibles physio: ${cd.physiologicalTargets.join("; ")}`);
    if (cd.prohibitions?.length) lines.push(`- Interdictions: ${cd.prohibitions.join("; ")}`);
    lines.push(`- Message athlète: ${cd.athleteMessage}`);
    lines.push(`- Justification coach: ${cd.coachRationale}`);
  }
  if (data.compassReadiness) {
    const cr = data.compassReadiness;
    lines.push(`\n### 🧭 Coaching Compass™ — Potentiel Physiologique`);
    lines.push(`- Potentiel: ${cr.potential}/100`);
    lines.push(`- Disponibilité: ${cr.availability}/100`);
    lines.push(`- Facteur gouvernant: ${cr.governingFactor}`);
  }

  if (data.snapshotCount) lines.push(`\n**Historique:** ${data.snapshotCount} snapshot(s) enregistré(s)`);
  if (data.lastSnapshotAge !== undefined) lines.push(`**Fraîcheur données:** dernier snapshot il y a ${data.lastSnapshotAge} jours`);

  lines.push("\n---\nApplique le cadre TFCL™ : identifie le limiteur prioritaire, prescris le levier opérationnel, et génère les recommandations ordonnées. Si des données de diagnostic détaillées sont fournies (composantes VLamax, limiteurs), utilise-les pour EXPLIQUER les résultats en plus de prescrire.");
  return lines.join("\n");
}
