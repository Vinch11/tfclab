# DET V3.60 — trois références trail complètes

**Les trois références trail passent leurs contrôles complets en CI.** Les quinze
familles précédentes passent également sur le même code : **18 familles représentées
par 31 calendriers synthétiques complets, soit 468 semaines**. Les trois trails
ajoutent 48 semaines aux 420 semaines déjà couvertes. Un refus n'est jamais compté
comme une réussite.

Code exact testé : `61a14ee3ccbd6a55b0a864b59f3e210dfe6a62e1`.
Le commit de publication de ce rapport ne modifie que la documentation et les
preuves JSON, sans changement du code testé.

| Référence | Horizon | Épreuve synthétique | D+ / D− de l'épreuve | Disponibilité d'entraînement | Limiteur primaire |
| --- | ---: | --- | --- | --- | --- |
| trail-short-12w | 12 semaines | 25 km | 800 / 800 m | 7 h/semaine | VO2 |
| trail-mountain-16w | 16 semaines | 55 km | 3 000 / 2 800 m | 9 h/semaine | TTE |
| trail-ultra-20w | 20 semaines | 100 km | 6 000 / 6 500 m | 12 h/semaine | TTE |

Chaque témoin comporte l'ensemble de ses semaines, avec quotas trail dédiés,
renforcement, parcours liés aux sources V3, contrôle des minutes structurées,
D+ et D− séparés, progression bornée par le coach, vraies décharges, jours de
repos, horaires confirmés, récupération et absence de chevauchement. Les ratios
course/vélo sont contrôlés en nombre de séances et en minutes sur les semaines
de charge. La couverture du limiteur primaire porte sur toutes les séances clés.

Aucune séance n'a été ajoutée à V3 pour ces trois témoins. Les adaptations de
RUN_136 et RUN_085 restent dans les bornes de leurs recettes et sont déclarées
séparément. Voir le [fondement scientifique et ses limites](SCIENTIFIC_BASIS.md).

Le contrôle natif de durée d'affûtage reprend maintenant sa propre source de
vérité : trois semaines pré-course et la semaine contenant l'épreuve peuvent
former un bloc de quatre semaines. Cette borne n'est étendue que lorsqu'une
vraie course termine le bloc. Une activation « Race Day » ne suffit pas. Les
contrôles natifs de contenu restent en vigueur. Dans le contrat expérimental,
un seul faux négatif lexical de spécificité peut être réconcilié après preuve
complète source/dose/parcours ; le constat natif initial reste archivé.

Les tests négatifs doivent refuser : D− inconnu, géométrie périmée, mauvais athlète,
dose divergente, exposition en descente inconnue, tolérance insuffisante, repères
terrain manquants, preuve de peak indisponible, dépassement du dénivelé autorisé
et absence d'accord pour les deux courses consécutives du week-end. Un calendrier
complet corrompu après sélection doit également perdre son certificat.

Ce résultat demeure une **acceptation automatique de références synthétiques**.
Il ne vaut pas accord sportif humain, validation scientifique d'une séance
complète ou validation de toutes les préparations trail. Aucune fusion,
publication, prescription réelle ou écriture dans une application d'athlète.

## Exécutions et preuves

- [CI générale : 5/5 jobs réussis](https://github.com/Vinch11/tfclab/actions/runs/41688256173) : TypeScript/frontend, suite DET, ESLint, Deno et Playwright. Suite DET : **507 tests réussis, 7 ignorés ; 81 fichiers réussis, 1 ignoré**. Les tests ignorés ne constituent pas une preuve supplémentaire.
- [Trail : 17 tests réussis, aucun ignoré](https://github.com/Vinch11/tfclab/actions/runs/41688255777), TypeScript et contre-calcul Python réussis ; le vérificateur indépendant refuse aussi quatre corruptions de ses entrées.
- [Marathons : quatre références complètes et refus préservés](https://github.com/Vinch11/tfclab/actions/runs/41688255964).
- [Dix semi/10 km et sept références 70.3/Ironman](https://github.com/Vinch11/tfclab/actions/runs/41688255849).
- [Sept références des six autres familles et contre-calcul indépendant](https://github.com/Vinch11/tfclab/actions/runs/41688255790).

| Témoin trail | Maximum de minutes d'entraînement/semaine | Sortie la plus longue | Maximum hebdomadaire D+ / D− | Minimum de minutes faciles en charge | Couverture primaire de toutes les clés |
| --- | ---: | ---: | --- | ---: | ---: |
| Court | 390 | 129 min | 820 / 810 m | 87,36 % | 50 % |
| Montagne | 538 | 157 min | 1 480 / 1 400 m | 85,85 % | 50 % |
| Ultra | 570 | 190 min | 1 830 / 1 850 m | 86,93 % | 50 % |

Ces dénivelés correspondent à l'entraînement synthétique, et ne représentent
pas le dénivelé entier de l'épreuve. La disponibilité déclarée est un plafond,
pas un volume à remplir artificiellement. Le pourcentage facile est calculé sur
toutes les minutes d'endurance, temps non classé inclus au dénominateur.

La [matrice complète](VALIDATION_MATRIX.json) identifie les dix-huit familles.
Les [31 références et empreintes d'archives CI](COMPLETE_REFERENCE_EVIDENCE.json)
permettent de relier chaque résultat à son exécution. Les
[trois calendriers trail complets](TRAIL_REFERENCE_CALENDARS.json) sont conservés
avec leurs parcours, contextes, variantes et preuves ; ils peuvent être
contre-vérifiés sans le solveur :

```sh
python3 scripts/det-engine/verify_trail_calendars.py docs/det-engine/v360/TRAIL_REFERENCE_CALENDARS.json
```
