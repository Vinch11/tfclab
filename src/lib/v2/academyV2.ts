/**
 * Academy V2 — Module "Two For Coaching Lab V2 — Fondements scientifiques"
 * 
 * Contenu pédagogique pour expliquer :
 * - Hypothèses du modèle V2
 * - Limites et incertitudes
 * - Comment lire une plage plutôt qu'un chiffre
 * - Quand un test labo devient indispensable
 */

import { SCIENTIFIC_REFERENCES } from './scientificConfig';

// =============================================
// MODULE ACADEMY V2
// =============================================

export const ACADEMY_V2_MODULE = {
  id: 'v2_scientific',
  title: 'Two For Coaching Lab V2 — Fondements scientifiques',
  description: 'Comprendre les hypothèses, limites et incertitudes du modèle V2.',
  icon: '🧬',
  
  chapters: [
    {
      id: 'v2_hypothesis',
      title: '1. Hypothèses du modèle V2',
      content: `## Hypothèses scientifiques

Le modèle V2 repose sur plusieurs hypothèses issues de la littérature scientifique :

### Relation VLamax – Performance
**Hypothèse** : La VLamax (capacité glycolytique maximale) est un déterminant clé de la performance en endurance.

**Fondement** : Travaux de Mader & Heck (1986-2006) sur la modélisation du métabolisme lactique.

**Limite** : La VLamax est difficile à mesurer directement sans test lactate invasif.

### Relation TTE – Durabilité
**Hypothèse** : Le Time To Exhaustion au seuil (TTE) reflète la capacité à maintenir une intensité élevée sur la durée.

**Fondement** : Concept de "critical power" de Jones & Burnley (2009).

**Limite** : Le TTE est influencé par de nombreux facteurs (motivation, conditions, nutrition).

### Charge et Adaptation
**Hypothèse** : La charge d'entraînement (TSS) est un proxy de l'adaptation physiologique.

**Fondement** : Modèles de charge de Banister, Impellizzeri et al.

**Limite** : Le TSS ne distingue pas la qualité de la charge de sa quantité.`,
    },
    {
      id: 'v2_limits',
      title: '2. Limites explicites du modèle',
      content: `## Ce que le modèle V2 ne fait PAS

### Mesure directe
❌ Le modèle V2 ne mesure pas directement la physiologie interne.
Il **estime** des paramètres à partir de données observables.

### Prédiction absolue
❌ Le modèle V2 ne prédit pas avec certitude la performance future.
Il fournit des **plages réalistes** avec un niveau de confiance.

### Diagnostic médical
❌ Le modèle V2 n'est pas un outil de diagnostic médical.
Tout signe de blessure ou surmenage doit être évalué par un professionnel.

### Automatisation
❌ Le modèle V2 ne génère pas automatiquement de plans d'entraînement.
Il **informe** le coach qui prend la décision finale.

## Incertitudes quantifiées

Chaque estimation V2 est accompagnée de :
- **Plage réaliste** : valeurs probables
- **Niveau de confiance** (0-1) : fiabilité de l'estimation
- **Sources utilisées** : données ayant contribué au calcul`,
    },
    {
      id: 'v2_ranges',
      title: '3. Lire une plage plutôt qu\'un chiffre',
      content: `## Pourquoi afficher des plages ?

### Le problème des valeurs uniques
Une VLamax de "0.42" suggère une précision que le modèle n'a pas.
La vraie valeur pourrait être 0.38, 0.45, ou même 0.50 selon la marge d'erreur.

### La solution : plages avec confiance
**Exemple VLamax V2 :**
- Valeur centrale : 0.42 mmol/L/s
- Plage réaliste : 0.38 – 0.46
- Confiance : 0.72

**Interprétation :**
"Avec 72% de confiance, la VLamax est probablement entre 0.38 et 0.46."

### Règle de décision
Ne changez pas de stratégie pour une différence **dans** la plage d'incertitude.
Changez de stratégie quand les plages **ne se chevauchent plus**.

**Exemple :**
- Avant : VLamax 0.40 ± 0.05 (0.35-0.45)
- Après : VLamax 0.35 ± 0.05 (0.30-0.40)
- → Les plages se chevauchent → Pas de changement de profil confirmé

**Contre-exemple :**
- Avant : VLamax 0.50 ± 0.04 (0.46-0.54)
- Après : VLamax 0.38 ± 0.04 (0.34-0.42)
- → Les plages ne se chevauchent pas → Évolution confirmée`,
    },
    {
      id: 'v2_confidence',
      title: '4. Comprendre les niveaux de confiance',
      content: `## Échelle de confiance V2

### 🔬 Très élevée (0.90-0.95)
**Source** : Mesure laboratoire directe
**Action** : Base solide pour la planification

### 📏 Élevée (0.75-0.89)
**Source** : Test terrain structuré
**Action** : Confiance pour les décisions importantes

### 📊 Modérée (0.60-0.74)
**Source** : Estimation multi-sources
**Action** : Prudence, croiser avec terrain

### ⚠️ Limitée (0.45-0.59)
**Source** : Estimation approximative
**Action** : Indicatif seulement, confirmer avec test

### ❓ Faible (< 0.45)
**Source** : Données insuffisantes
**Action** : Ne pas baser de décision majeure

## Impact sur les décisions

| Confiance | Changer de phase ? | Ajuster intensité ? | Modifier objectif ? |
|-----------|-------------------|---------------------|---------------------|
| > 0.80    | ✅ Oui            | ✅ Oui              | ✅ Oui              |
| 0.65-0.80 | ⚠️ Avec prudence  | ✅ Oui              | ⚠️ Avec prudence    |
| 0.50-0.65 | ❌ Non            | ⚠️ Avec prudence    | ❌ Non              |
| < 0.50    | ❌ Non            | ❌ Non              | ❌ Non              |`,
    },
    {
      id: 'v2_uncertainty',
      title: '5. Décider malgré l\'incertitude',
      content: `## Stratégies de décision

### Stratégie 1 : Triangulation
Croiser plusieurs indicateurs plutôt que se fier à un seul.

**Exemple :**
VLamax V2 dit "0.48" mais TTE V2 dit "55 min" et les sensations terrain sont bonnes.
→ Le profil est probablement plus endurant que la VLamax seule le suggère.

### Stratégie 2 : Décision réversible
Privilégier les choix ajustables plutôt que les changements radicaux.

**Bon exemple :**
"On teste 2 semaines de Z2 longue, on réévalue."

**Mauvais exemple :**
"On change complètement le plan sur 12 semaines."

### Stratégie 3 : Seuil d'action
Ne pas agir sur de petites variations dans la plage d'incertitude.

**Bon exemple :**
"On ajuste si l'écart dépasse ±10% sur 3 semaines consécutives."

**Mauvais exemple :**
"La VLamax a bougé de 0.02, on modifie tout."

### Stratégie 4 : Le coach décide
L'outil aide à voir, le coach décide.
Aucune donnée ne remplace l'observation terrain et le dialogue avec l'athlète.`,
    },
    {
      id: 'v2_when_lab',
      title: '6. Quand un test labo devient indispensable',
      content: `## Signaux déclencheurs

Le modèle V2 peut recommander un test laboratoire quand :

### 1. Confiance globale insuffisante
- Confiance moyenne < 0.50 sur plusieurs métriques clés
- Trop de données manquantes ou anciennes

### 2. Incohérence modèle ↔ terrain
- VLamax estimée basse mais performances sprint élevées
- TTE élevé mais dérive cardiaque importante
- Potentiel Physiologique haute mais sensations médiocres

### 3. Plateau inexpliqué
- Stagnation > 6 semaines sans explication
- Régression malgré charge adaptée
- Fatigue persistante

### 4. Objectif majeur
- Préparation Ironman / Marathon élite
- Besoin de précision maximale
- Budget temps/argent disponible

### 5. Retour de blessure/maladie
- Recalibrer les références
- Vérifier l'état de récupération
- Adapter les cibles

## Complémentarité optimale

**V2 entre les tests :** Suivi continu, détection de tendances
**Test labo ponctuel :** Calibration précise, levée de doutes

Les deux approches se renforcent mutuellement.`,
    },
    {
      id: 'v2_references',
      title: '7. Références scientifiques',
      content: `## Sources bibliographiques du modèle V2

### VLamax & Métabolisme glycolytique
${SCIENTIFIC_REFERENCES.VLAMAX.map(r => `- ${r}`).join('\n')}

### TTE & Endurance critique
${SCIENTIFIC_REFERENCES.TTE.map(r => `- ${r}`).join('\n')}

### Fatigue & Monitoring
${SCIENTIFIC_REFERENCES.FATIGUE.map(r => `- ${r}`).join('\n')}

### Nutrition d'effort
${SCIENTIFIC_REFERENCES.NUTRITION.map(r => `- ${r}`).join('\n')}

### Économie de course
${SCIENTIFIC_REFERENCES.ECONOMY.map(r => `- ${r}`).join('\n')}

---

**Note :** Le modèle Two For Coaching Lab V2 s'inspire de ces travaux mais constitue une implémentation indépendante, originale et propriétaire. Il ne prétend pas reproduire exactement les méthodes décrites dans ces publications.`,
    }
  ]
};
