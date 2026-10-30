# Validation documentaire et technique V21A

DRAFT — NO-GO. Aucun résultat ci-dessous n’atteste l’efficacité d’une séance ou l’admissibilité d’une prescription individuelle.

| Contrôle | Preuve | Portée |
|---|---|---|
| 17 tests positifs/négatifs | [Log final](evidence/contracts-final.txt) | Contrats de rattachement et limites du routage |
| Audit indépendant renforcé | [Résultat final](evidence/independent-final.json) | 920 sources, 2 425 variantes, 418 overlays, extraits, références et 1 309 strates d’usage |
| Extraction de la bibliothèque actuelle | [Preuve](evidence/live-library-proof.json) | Agrégateur réel, objets bruts/effectifs, dépendances |
| Reproductibilité | [Comparaison](evidence/reproducibility.json) | Huit artefacts identiques, octet pour octet |
| Index complémentaires | [Comparaison](evidence/handoff-reproducibility.json) | Trois index identiques, aucune modification des candidats V20 |
| Intégrité avant chantier | [Manifest](baseline-files.json) | 4 108 fichiers antérieurs |
| Contenus antérieurs finaux et nouvelles empreintes | [Clôture](final-integrity.json) | Vérification de livraison, sans cycle supplémentaire |

Commandes documentaires :

```sh
PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v21a-tests.py
PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v21a-independent.py /tmp/v21a-independent-review.json
```

Le vérificateur exige une destination de résultat nouvelle. Il ne modifie pas les preuves. Les constructeurs `v21a-build.py` et `v21a-report.py` sont soumis au registre borné ; ils ne doivent pas être relancés après clôture sous le budget V21A. Les tests et audits purement en lecture peuvent être utilisés pour examiner le dossier, sans nouvelle génération sportive.

Les tentatives exploratoires sont conservées. Le premier classement comptait les composants de récupération comme cibles ; il n’a pas été retenu comme classement d’impact. La version acceptée distingue cible déclarée, composant/justification et périmètre d’objectif, exclut « sans fatigue » comme cible de durabilité et sépare endurance musculaire/aérobie. Aucun contenu, dosage, règle ou avertissement sportif n’a été changé. [Compression sans perte des duplications exploratoires](evidence/exploratory-compression.json).

Le regroupement repose sur des règles lexicales transparentes et ne remplace pas une revue de mécanisme. Le contrôle indépendant vérifie les sources et les comptes ; il ne démontre pas la pertinence scientifique de tous les regroupements. Les lectures V8–V19 sont héritées ; aucune nouvelle lecture bibliographique ou vérification de texte intégral n’est revendiquée.
