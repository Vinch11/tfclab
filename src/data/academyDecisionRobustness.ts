/**
 * Academy Content - Decision Robustness Module
 * 
 * Module pédagogique: "Pourquoi plus de précision ne signifie pas toujours de meilleures décisions"
 */

export const ACADEMY_DECISION_ROBUSTNESS = {
  id: "decision-robustness",
  title: "Décision robuste vs Précision absolue",
  subtitle: "Pourquoi plus de précision ne signifie pas toujours de meilleures décisions",
  icon: "beaker",
  
  introduction: `
La quête de la "précision absolue" est un piège courant dans l'analyse physiologique.
TFCL adopte une approche différente : optimiser la **robustesse décisionnelle** plutôt que la précision maximale.

Ce module explique pourquoi cette approche est plus efficace pour guider l'entraînement au quotidien.
  `.trim(),
  
  sections: [
    {
      title: "La courbe des rendements décroissants",
      content: `
### Le concept clé

La relation entre précision et qualité de décision n'est **pas linéaire**.

- **Au début** : chaque point de précision supplémentaire améliore significativement les décisions
- **Ensuite** : les gains deviennent marginaux
- **Au sommet** : une précision supplémentaire n'apporte presque aucune amélioration décisionnelle

### La formule

\`\`\`
Qualité décision = 100 × (1 - e^(-4.5 × précision))
\`\`\`

Cette fonction exponentielle décroissante reflète une réalité physiologique : 
au-delà d'un certain seuil, les variations de mesure n'impactent plus les choix d'entraînement.
      `.trim(),
    },
    {
      title: "Les trois zones de décision",
      content: `
### Zone 1 : Illusion de précision (0-35%)

**Danger** : Des chiffres isolés sans contexte ni validation.

Exemples :
- Une VLamax "mesurée" sans protocole validé
- Un VO2max estimé par une montre sans étalonnage
- Des zones calculées sur des données obsolètes

**Risque** : Prendre des décisions avec une fausse confiance.

---

### Zone 2 : Décision robuste TFCL (35-75%)

**Optimale** : Plages + confiance + contexte = décisions fiables.

Ce que cela signifie :
- Des valeurs présentées avec leur intervalle de confiance
- Un contexte de calibration (cluster de référence)
- Des indicateurs de cohérence entre métriques
- Une transparence sur les limites

**Résultat** : Des décisions d'entraînement pragmatiques et efficaces.

---

### Zone 3 : Précision absolue (75-100%)

**Tests laboratoire** : Précision maximale pour cas spécifiques.

Quand c'est utile :
- Athlètes élite avant compétition majeure
- Profil physiologiquement atypique à confirmer
- Incohérences majeures à résoudre
- Recherche scientifique

**Rappel** : Le gain décisionnel marginal doit justifier le coût et la complexité.
      `.trim(),
    },
    {
      title: "Quand un test labo est recommandé",
      content: `
### Indicateurs de recommandation

TFCL recommande un test laboratoire dans ces situations :

1. **Score de précision < 55%**
   - Données insuffisantes pour des décisions fiables

2. **Profil outlier**
   - VLamax hors de la plage typique du cluster (P10-P90)
   - Nécessite confirmation par mesure directe

3. **Incohérence majeure détectée**
   - Ex: VLamax très haute + VO2max très haute + TTE très haut
   - Physiologiquement improbable, requiert investigation

4. **Contexte élite + objectif majeur**
   - Ambition Elite + Marathon/Ironman
   - Avec confiance < 70%

### Ce que le test labo apporte

- **Mesure directe** de VO2max, VLamax, seuils lactiques
- **Validation** ou **correction** des estimations
- **Confiance renforcée** pour décisions critiques
      `.trim(),
    },
    {
      title: "Cas pratiques",
      content: `
### Cas 1 : Amateur ambitieux (70.3)

**Profil** : Triathlon depuis 3 ans, objectif PR sur 70.3
**Données** : FTP estimé, VMA test terrain, VLamax estimée
**Score précision** : 52/100

**Recommandation TFCL** :
- Zone "Décision robuste" presque atteinte
- Enrichir avec tests P30/P60/MAP (semaine référence)
- Pas de test labo nécessaire sauf stagnation inexpliquée

---

### Cas 2 : Athlète en plateau

**Profil** : Performeur expérimenté, stagnation depuis 18 mois
**Données** : Toutes les métriques TFCL complètes
**Score précision** : 68/100

**Recommandation TFCL** :
- Précision suffisante, décisions robustes
- Le problème n'est probablement pas la précision des données
- Explorer : récupération, stress, nutrition, monotonie

---

### Cas 3 : Élite préparant Kona

**Profil** : Qualifié Kona, ambition podium Age Group
**Données** : Profil complet mais VLamax outlier (P95)
**Score précision** : 71/100

**Recommandation TFCL** :
- Test labo **recommandé** malgré bon score
- Raison : VLamax hors norme + enjeu élite
- Objectif : confirmer ou corriger avant pic de forme
      `.trim(),
    },
    {
      title: "La philosophie TFCL",
      content: `
### Ce que TFCL fait

✅ Optimise la **robustesse décisionnelle** au quotidien
✅ Présente des **plages de confiance**, pas des certitudes
✅ Indique clairement les **limites** de chaque estimation
✅ Recommande les tests labo **quand c'est justifié**

### Ce que TFCL ne fait pas

❌ Prétendre remplacer les tests laboratoire
❌ Promettre une précision "équivalente"
❌ Cacher les incertitudes

### Le message clé

> "Les tests labo sont utiles lorsque la précision maximale est nécessaire.
> TFCL optimise la robustesse décisionnelle pour les 95% de situations
> où cette précision n'apporte pas de gain significatif."

C'est une question de **rendement** : obtenir le maximum de valeur décisionnelle
avec les données raisonnablement accessibles.
      `.trim(),
    },
  ],
  
  conclusion: `
## À retenir

1. **Plus de précision ≠ meilleures décisions** au-delà d'un certain seuil
2. **La zone TFCL (35-75%)** couvre la grande majorité des besoins d'entraînement
3. **Les tests labo** gardent leur utilité pour les cas spécifiques
4. **La transparence** sur les limites est plus précieuse que de faux chiffres précis

La vraie question n'est pas "Quelle est ma VLamax exacte ?"
mais "Ai-je assez d'information pour prendre une bonne décision d'entraînement ?"
  `.trim(),
};
