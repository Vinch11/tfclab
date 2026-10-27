# #419 — cohérence des phases de fenêtres

Comparaison avec le HEAD initial `3d65f92fb241f30fa96a80d9c4c963ba4a3bb85a`. Aucun modèle, déploiement ou enregistrement de données athlètes. Correction commune aux objectifs ; aucune règle de périodisation spécifique n’est remplacée.

## Cause démontrée et correction

Trois représentations divergeaient :

1. `planWindowRegen` reconstruisait les phases par seuils historiques de position (30/70 %), indépendamment du calendrier individualisé existant (Fondation calculée, limiteurs, ambition, cycles intermédiaires).
2. Il calculait ensuite une phase majoritaire pour la fenêtre. `buildPeriodizationCalendar` la propageait à toutes ses semaines ; les deux handlers JSON faisaient de même pour les contrats catalogue et JSON.
3. Le diagnostic serveur pouvait encore décrire un mini-cycle de la longueur de la fenêtre, contredisant la position dans le plan complet.

La fenêtre transporte maintenant **une tranche du calendrier complet déjà calculé par le moteur**, renumérotée localement. Le prompt, les quotas, la sélection catalogue hebdomadaire, la prévalidation et le contrat JSON consomment cette même tranche. La phase dominante ne sert plus que de fallback pour les anciens contrats dépourvus de calendrier. La génération du calendrier complet, ses seuils, les semaines d’assimilation et la Fondation réduite post-pic ne changent pas. Les anciens calculs de fallback sont conservés pour les configurations historiques non individualisées.

Le prompt d’une fenêtre n’affiche plus des bornes recalculées comme pour un mini-plan. Il conserve les priorités L1/L2 et la restriction VO₂max en Fondation. Les bornes et durées des séances restent contrôlées par les validateurs existants, sans élargissement des phases des fiches.

## Matrice avant/après

| Contrats examinés | Avant | Après |
|---|---:|---:|
| Configurations | 600 | 600 |
| Admissibles aux contrôles disponibles | 82 | 101 |
| Revue coach | 316 | 441 |
| Bloquées | 202 | 58 |
| Refus historiques conservés | 58 | 58 |
| Blocages supplémentaires dus aux phases | 144 | 0 |

Les 144 configurations supplémentaires deviennent **19 admissibles et 125 en revue coach**. Il y avait aussi 15 conflits de phases parmi les 58 configurations déjà impossibles mécaniquement : les conflits de phases y disparaissent, mais leurs refus légitimes restent présents. Au total, les 159 cas comportant un diagnostic de conflit n’en comportent plus aucun.

Les 1 317 semaines dont la phase était altérée par les fenêtres reprennent leur phase du calendrier complet. Comparaison sur les 600 cas : **zéro changement de quota, de plafond de charge, de type de semaine et d’ordre des limiteurs**. Les pools et placements peuvent suivre une phase différente désormais correcte ; ce constat ne vaut pas preuve d’une dose finale produite par un modèle.

Preuves : [comparaison par cas/semaine](prevalidation-evidence/phase-comparison.json), [résumé initial](prevalidation-evidence/before-phases-summary.json), [résumé final](prevalidation-evidence/summary.json), [objectif/format/ambition](prevalidation-evidence/BY_OBJECTIVE_AMBITION.md). Les CSV des semaines et les pools identifiés sont actualisés dans le même dossier, avec leurs SHA-256.

Couverture : 5 km, 10 km, semi, marathon, Sprint, Olympic, 70.3, Ironman, trail court/montagne/ultra, StartToRun et LCW. Les 11 contrats historiques de diversité restent des avertissements ; les cas à charge inconnue conservent leur avertissement coach. Aucune voie trail ne reçoit artificiellement des quotas running.

## Tests et reproduction

* Dix tests ciblés rouges avant correction, verts après ; un test supplémentaire vérifie réellement le second cycle d’une préparation à deux pics et sa Fondation réduite.
* Les deux fonctions serveur vérifient la priorité des phases hebdomadaires sur la majorité de fenêtre, le prompt associé et le maintien des priorités physiologiques.
* Les tests existants de prévalidation conservent les refus de phases incohérentes, de capacité impossible et de dates hors plan : **zéro requête modèle** dans ces tests, `fetch` remplacé et permission réseau Deno absente.
* La matrice conserve les 58 refus et rejoue les 11 avertissements historiques ; une assertion refuse tout nouveau conflit de phases dans les 600 cas. Le comparateur contrôle également les invariants de quotas, charge, types de semaine et limiteurs.

```sh
node scripts/quality/prevalidate-plans-offline.mjs --all --out /tmp/tfcl-phases-after
node scripts/quality/summarize-prevalidation.mjs /tmp/tfcl-phases-after /tmp/tfcl-phases-summary
node scripts/quality/compare-prevalidation-phases.mjs /tmp/tfcl-phases-before/matrix.json /tmp/tfcl-phases-after/matrix.json /tmp/tfcl-phases-comparison
```

Le dossier « before » est la sortie de la même commande de matrice exécutée au HEAD initial ci-dessus, avec les mêmes dépendances et la date synthétique fixée par le runner. Les résultats de ce rejeu initial ont été réutilisés, sans refaire l’audit. La CI et la reproductibilité sont associées au HEAD final dans #419.

## Verdict

**GO technique pour fusion après les quatre checks CI et la reproductibilité verts sur le HEAD final.** Aucune fusion n’est effectuée.

**Pas de GO sportif global ni d’autorisation de génération payante.** Les 58 impossibilités restent bloquées ; les 441 revues doivent être examinées. La couverture de quotas des voies trail et des étapes LCW reste partielle, certaines intentions exactes ne sont pas encodées par créneau et aucune nouvelle réponse Gemini n’a été évaluée. La première prescription réelle nécessite toujours une revue humaine et des versions frontend/serveur compatibles.
