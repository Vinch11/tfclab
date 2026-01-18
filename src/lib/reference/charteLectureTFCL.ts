/**
 * Charte TFCL — Comment lire un rapport
 * Two For Coaching Lab Method™
 * 
 * Charte officielle expliquant la méthodologie et les limites
 * Accessible depuis le rapport PDF, l'Academy et l'Assistant
 */

// =============================================
// CHARTE COMPLÈTE
// =============================================

export const CHARTE_LECTURE_TFCL = {
  id: "charte-lecture-tfcl",
  version: "V2.0",
  title: "Comment lire un rapport Two For Coaching Lab",
  subtitle: "Charte officielle d'interprétation",
  
  sections: [
    {
      id: "types-donnees",
      title: "1. Types de données",
      content: `
**Mesuré (✓)**
Donnée issue d'un test direct (lactate, spirométrie, ergomètre).
Précision : ±2-3%. Source la plus fiable.

**Estimé (~)**
Donnée dérivée d'un test terrain structuré (CP, TTE observé, sprint test).
Précision : ±5-8%. Fiabilité bonne si protocole respecté.

**Modélisé (≈)**
Donnée calculée par algorithme TFCL à partir d'autres métriques.
Précision : ±8-12%. Interprétation prudente requise.

**Règle d'or :**
Plus une donnée est modélisée, plus l'interprétation doit être nuancée.
Une valeur modélisée n'est jamais une vérité absolue.
      `.trim(),
    },
    {
      id: "plages-percentiles",
      title: "2. Plages et percentiles TFCL",
      content: `
**Pourquoi des plages ?**
TFCL n'utilise pas de valeurs cibles uniques car :
- La physiologie est un spectre, pas un point
- Chaque athlète est unique dans son contexte
- Les mesures ont une incertitude inhérente

**Comment lire les percentiles :**
- **P10** : 10% du référentiel est en dessous
- **P25** : 25% du référentiel est en dessous
- **P50** : Médiane (valeur centrale)
- **P75** : 75% du référentiel est en dessous
- **P90** : 90% du référentiel est en dessous

**Zones de lecture :**
- **Zone optimale (P25-P75)** : 50% central — profil typique pour l'objectif
- **Zone basse (P10-P25)** : Valeur dans le quart inférieur
- **Zone haute (P75-P90)** : Valeur dans le quart supérieur
- **Hors plage (<P10 ou >P90)** : Valeur atypique — investiguer

**Important :**
Une valeur "hors plage" n'est pas nécessairement mauvaise.
Elle signifie simplement que le profil est atypique pour ce référentiel.
      `.trim(),
    },
    {
      id: "indice-confiance",
      title: "3. Indice de confiance",
      content: `
**Confiance élevée (≥75%)**
🟢 Données multiples et cohérentes
Marge d'erreur : ±0.03 mmol/L/s
Interprétation : Fiable pour la planification

**Confiance moyenne (55-74%)**
🟡 Données partielles ou estimation terrain
Marge d'erreur : ±0.05 mmol/L/s
Interprétation : Valide avec réserve, confirmation souhaitable

**Confiance faible (<55%)**
🔴 Données limitées ou incohérentes
Marge d'erreur : ±0.08 mmol/L/s
Interprétation : Indicative uniquement, test labo recommandé

**Facteurs améliorant la confiance :**
+ Test lactate laboratoire (+35%)
+ Test terrain structuré (+20%)
+ VO2max connue (+10%)
+ Sexe renseigné (+5%)
+ Objectif clairement défini (+10%)
      `.trim(),
    },
    {
      id: "referentiels",
      title: "4. Référentiels TFCL",
      content: `
**Qu'est-ce qu'un référentiel ?**
Un ensemble de profils physiologiques observés, regroupés par :
- Discipline sportive (triathlon, course, cyclisme)
- Objectif (Ironman, Marathon, 10K, etc.)
- Niveau (Pro, AG Performance, Amateur)
- Sexe (si échantillon suffisant)

**Référentiels disponibles :**

*Triathlon*
- Tri_Pro_Long : Professionnels longue distance
- Tri_AG_Perf_Long : Age groupers performance LD
- Tri_Pro_Short : Professionnels courte distance
- Tri_AG_Sprint : Age groupers sprint/olympique

*Course à pied*
- Elite_Marathon : Marathoniens élite
- Sub3_Marathon : Objectif sub 3h
- Sub330_Marathon : Objectif sub 3h30
- Ultra_Trail : Ultra-trailers

*Cyclisme*
- Elite_Road : Cyclistes route élite
- Amateur_Perf : Cyclistes amateurs performance

**Limites des référentiels :**
- Basés sur observations internes TFCL
- Ne constituent pas une norme médicale
- Évoluent avec les données collectées
      `.trim(),
    },
    {
      id: "limites",
      title: "5. Limites méthodologiques",
      content: `
**Ce que TFCL fait :**
✓ Contextualise les données dans un référentiel sportif
✓ Identifie des directions physiologiques cohérentes
✓ Quantifie l'incertitude des estimations
✓ Fournit une base de discussion coach-athlète

**Ce que TFCL ne fait pas :**
✗ Remplacer un test laboratoire
✗ Garantir des performances
✗ Prescrire des séances d'entraînement
✗ Diagnostiquer des conditions médicales
✗ Se substituer à l'expertise du coach

**Recommandations :**
1. Toujours croiser avec l'observation terrain
2. Privilégier le test labo pour enjeux élevés
3. Réévaluer régulièrement (6-12 semaines)
4. Adapter l'interprétation au contexte individuel
      `.trim(),
    },
    {
      id: "glossaire",
      title: "6. Glossaire",
      content: `
**VLamax (mmol/L/s)**
Taux maximal de production de lactate. Indicateur de capacité glycolytique.
- Basse (<0.30) : Profil aérobie, favorable longue distance
- Moyenne (0.30-0.50) : Profil équilibré
- Haute (>0.50) : Profil glycolytique, favorable courte distance

**TTE (Time to Exhaustion)**
Durée maximale au seuil de puissance critique.
- >55 min : Excellent
- 45-55 min : Bon
- 35-45 min : Moyen
- <35 min : À développer

**VO2max (ml/kg/min)**
Consommation maximale d'oxygène. Capacité aérobie.
- Élite homme : >70
- Bon niveau : 55-70
- Amateur : 40-55

**FTP (Functional Threshold Power)**
Puissance au seuil fonctionnel. Intensité soutenable ~1h.

**Percentile (P)**
Position dans le référentiel. P75 = 75% des profils sont en dessous.

**Référentiel/Cluster**
Groupe de profils similaires utilisé comme base de comparaison.
      `.trim(),
    },
  ],
  
  disclaimerFinal: `
Two For Coaching Lab est un outil d'aide à la décision physiologique.
Il ne remplace pas le jugement du coach, l'observation terrain, 
ni les tests laboratoire pour les enjeux de haut niveau.

Toute valeur présentée est une estimation contextuelle, 
pas une vérité physiologique absolue.
  `.trim(),
};

// =============================================
// TEXTES COURTS POUR UI
// =============================================

export const CHARTE_TOOLTIPS = {
  mesure: "Donnée issue d'un test direct (précision ±2-3%)",
  estimation: "Donnée dérivée d'un test terrain (précision ±5-8%)",
  modelisation: "Donnée calculée par algorithme (précision ±8-12%)",
  
  p10: "10% du référentiel est en dessous de cette valeur",
  p25: "25% du référentiel est en dessous (limite basse optimale)",
  p50: "Médiane — valeur centrale du référentiel",
  p75: "75% du référentiel est en dessous (limite haute optimale)",
  p90: "90% du référentiel est en dessous de cette valeur",
  
  confianceHigh: "Données multiples cohérentes (±0.03)",
  confianceMedium: "Données partielles (±0.05)",
  confianceLow: "Données limitées (±0.08) — test labo recommandé",
  
  referentiel: "Groupe de profils similaires utilisé pour contextualiser",
};

// =============================================
// VERSION ASSISTANT
// =============================================

export const CHARTE_ASSISTANT_CONTEXT = `
Tu es l'assistant TFCL. Voici les règles de lecture des rapports :

1. TYPES DE DONNÉES
- Mesuré (✓) : test direct, précision ±2-3%
- Estimé (~) : test terrain, précision ±5-8%
- Modélisé (≈) : algorithme TFCL, précision ±8-12%

2. ZONES TFCL
- Zone optimale = P25-P75 (50% central)
- Zone basse = P10-P25
- Zone haute = P75-P90
- Hors plage = <P10 ou >P90 (atypique)

3. CONFIANCE
- Élevée (≥75%) : fiable, marge ±0.03
- Moyenne (55-74%) : valide avec réserve, marge ±0.05
- Faible (<55%) : indicatif, marge ±0.08, test labo recommandé

4. INTERDICTIONS ABSOLUES
- Ne jamais donner d'objectifs chiffrés uniques
- Ne jamais promettre de performances
- Ne jamais contredire la logique TFCL
- Ne jamais générer de nouvelles valeurs

5. STRUCTURE DE RÉPONSE
1. Contexte objectif
2. Plage de référence TFCL
3. Limite méthodologique
4. Traduction coach
`;

// =============================================
// EXPORT POUR ACADEMY
// =============================================

export const ACADEMY_CHARTE_MODULE = {
  id: "charte-lecture",
  title: "Comment lire un rapport TFCL",
  description: "Charte officielle d'interprétation des données Two For Coaching Lab",
  sections: CHARTE_LECTURE_TFCL.sections.map(s => ({
    title: s.title,
    content: s.content,
  })),
  disclaimer: CHARTE_LECTURE_TFCL.disclaimerFinal,
};
