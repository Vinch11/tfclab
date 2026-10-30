# TFCLab V3 — carte méthodologique (science ≠ attribution de séances)

**Statut :** matrice éditoriale, non protocole clinique ni preuve d'efficacité de chaque fiche. Les 400 recettes sont des créations TFCLab ; aucune n'est annoncée comme séance textuellement fournie ou officiellement validée par Dan Lorang, Stephen Seiler, Renato Canova ou d'autres entraîneurs.

| Référence méthodologique | Principe utile | Incarnation dans la V3 | Limites explicites |
|---|---|---|---|
| Dan Lorang (entretien coach) | Réponse individuelle, limites de charge, supervision du vécu, décisions non précipitées | Intention unique, prérequis niveau, garde-fous d'arrêt, adaptation bornée, retour au contrôle coach | N'autorise aucune prescription basée sur un statut de laboratoire simulé |
| Seiler, distribution d'intensité | Beaucoup de travail de faible intensité, dose qualitative de séance intense et distribution **hebdomadaire** | Endurance LT1, seuil et VO2 comme familles séparées ; pas de 80/20 imposé séance par séance | Les méta-analyses 2024/2025 ne prouvent pas la supériorité de 80/20 pour chaque athlète |
| Canova, progression du général vers le spécifique | Développer résistance à l'allure de compétition et réexaminer le coût de fatigue des longues séances | Course marathon spécifique, endurance préalable, negative split, terrain et pacing | Ses volumes élite ne sont **pas** transférés tels quels à des amateurs |
| González-Ravé / Pyne, revue natation | Distribution de charge et volume diffèrent selon distance et période | Technique, endurance, CSS, sprint et eau libre séparés | Source en grande partie observationnelle, pas validation de 100 recettes |
| Llanos-Lagos / Ramos-Campo, force/endurance | Charge lourde/combinaisons peuvent soutenir l'économie et la performance de course | Force bilatérale, unilatérale, excentrique, puissance, tronc et contrôle | Niveau de certitude variable ; **pas de garantie de prévention d'une blessure** |
| Entraînement VO₂max récent | Intensité, structure des intervalles et récupération modifient la dose | 4×4, 5×3, 30/30, 40/20, fractions nage, avec récupérations explicites | Ni l'atteinte de VO2max ni le bénéfice ne sont garantis par l'étiquette VO2 |

## Documentation et liens
1. Dan Lorang, entrevue `That Triathlon Show` EP417 : https://scientifictriathlon.com/tts417/ — emphasis on individually tolerable training load, measurement, team and subjective feedback.
2. Seiler, *What is Best Practice for Training Intensity and Duration Distribution in Endurance Athletes?* (2010) : https://pubmed.ncbi.nlm.nih.gov/20861519/
3. Oliveira et al., méta-analyse comparaisons polarisées (2024) : https://pubmed.ncbi.nlm.nih.gov/38717713/
4. Rosenblat et al., méta-analyse IPD sur TID (2025) : https://pubmed.ncbi.nlm.nih.gov/39888556/
5. Canova, synthèse méthodologique documentée (source secondaire, à distinguer d'une publication scientifique évaluée par les pairs) : https://runningscience.co.za/elite-athletes-training-log/renato-canova/
6. González-Ravé et al., revue natation (2021) : https://pubmed.ncbi.nlm.nih.gov/33952709/
7. Papadimitriou et al., revue perspective sprint natation (2026) : https://pubmed.ncbi.nlm.nih.gov/41269307/
8. Llanos-Lagos et al., méta-analyse force et course (2024) : https://pubmed.ncbi.nlm.nih.gov/38627351/
9. Ramos-Campo et al., umbrella review force/endurance (2025) : https://pubmed.ncbi.nlm.nih.gov/40153564/
10. Cove et al., répartition et performances chez cyclistes (2025) : https://pubmed.ncbi.nlm.nih.gov/39788807/

## Décisions TFCLab
- La **doctrine des domaines**, celle de `src/lib/zones/tfclDoctrine.ts`, prime tout pourcentage générique par auteur. Le coach ne « choisit pas le % VMA de Canova ».
- **Une séance prescrite n'est pas un microcycle validé** : fréquence, enchaînements et récupération sont contrôlés séparément.
- **Un limiteur identifié ne se résout pas par un mot-clé de séance**. Le lien entre intention, limiteur, objectif et dose est à examiner et approuver individuellement avant mise en production.
- Le soutien scientifique d'un **principe** n'est pas l'approbation de la **recette et de ses volumes**. D'où `sessionSpecificValidation=false` sur les 400.
- Les protocoles d'affûtage, tests de terrain et récupération ne sont pas interprétés comme des diagnostics MLSS/VLamax mesurés.
