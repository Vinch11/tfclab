# Compilateur V18 et résultats

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

IR `tfcl-recipe-ir-1.1.0`, modèle multimodal `tfcl-multimodal-execution-1.0.0`. L’extension V18 reste séparée du compilateur V17 et de la production. Quantités dimensionnées, séries, répétitions, repos et sources UTF-16 restent vérifiables. Les catégories temporelles gardent la même portée qu’en V17.

Grammaires ajoutées : frontières de mots et secondes typographiques, activité explicitement chronométrée, cycle fermé avec commentaire conservé, séries de cycles avec repos explicitement entre séries, récupération écrite après chaque répétition y compris la dernière, total avec finish inclus, conteneur dont la somme est exacte, alternatives typées non sélectionnées et distance natation séparée d’un paramètre CSS. Les tests de grammaire sont des chaînes syntaxiques, jamais de nouvelles séances ajoutées au catalogue.

Une durée entre répétitions est n−1 uniquement si « entre » est écrit. Un `r=` nu reste inconnu. Les répétitions à durée variable conservent les bornes ; les valeurs partagées d’un même paramètre source restent identiques dans le témoin. Une variante non choisie n’acquiert pas de durée.

| Discipline canonique | Total | Complètes | Partielles | Ambiguës | Contradictoires | Descriptives |
|---|---|---|---|---|---|---|
| bike | 168 | 20 | 49 | 99 | 0 | 0 |
| run | 416 | 55 | 154 | 205 | 2 | 0 |
| swim | 119 | 0 | 35 | 84 | 0 | 0 |
| brick | 55 | 0 | 38 | 16 | 1 | 0 |
| strength | 127 | 0 | 0 | 0 | 0 | 127 |
| trail | 3 | 0 | 3 | 0 | 0 | 0 |
| mixed | 32 | 0 | 8 | 0 | 0 | 24 |

| Mesure | V17 | V18 |
|---|---|---|
| Chronologie générique complète | 67 | 75 |
| Partielle | 299 | 287 |
| Ambiguë | 401 | 404 |
| Contradictoire | 2 | 3 |
| Descriptive / non métabolique | 151 | 151 |
| Rendus coach | 920 | 920 |
| Contrats texte locaux acceptés après gardes | 833 | 831 |
| Encodages structurés locaux, ancres explicitement synthétiques | 12 | 13 |
| Variantes autonomes entièrement structurées | 0 | 0 |
| Liaisons paramétriques locales vérifiées | 0 | 6 |
| Validation scientifique individuelle / experte | 0 | 0 |

IDs nouvellement complets :

- `A_SEMI_TEMPO_LONG` : 60.0 minutes dans le témoin générique.
- `A_TR_FLAT_SUPPORT_END` : 60.0 minutes dans le témoin générique.
- `A_10K_PROGRESSIVE_60` : 60.0 minutes dans le témoin générique.
- `B_RUN_IM_RACE_SIM` : 75.0 minutes dans le témoin générique.
- `B_RUN_TEMPO_PROGRESSIVE` : 50.0 minutes dans le témoin générique.
- `TPL_IM_RUN_LONGUE_DURABILITE` : 90.0 minutes dans le témoin générique.
- `ENR_RUN_TEMPO_PROGRESSIF` : 55.0 minutes dans le témoin générique.
- `V3_RECUP_WALK_NATURE` : 35.0 minutes dans le témoin générique.

Les 67 témoins V17 sont identiques, y compris la présence de l’éducatif optionnel. Tous les 75 témoins sont vérifiés par Python sans importer le compilateur JS. [Preuve](evidence/validation-3/independent.json).

La troisième contradiction est une découverte de source, pas une séance ajoutée ou une baisse du seuil : `S2R_WALK_RUN_1_2` annonce 24–30 minutes ; 5 minutes de marche + 8×(1 minute de trot + 2 minutes de marche) + 5 minutes de marche + 3 minutes de mobilité = **37 minutes**. La source reste intacte et l’export est refusé. Les deux contradictions V17 persistent : brick de 55 minutes actives pour une enveloppe de 30–45, et recette course de 49 minutes pour un minimum annoncé de 50. Ce dernier écart n’est pas présenté comme une minute de danger physiologique.

Les trois fiches dont le champ canonique discipline vaut `trail` restent partielles. Des fiches trail sont aussi classées historiquement `run` ; le gain `A_TR_FLAT_SUPPORT_END` n’est ni une couverture de tous les trails ni un plan trail complet. Aucun nouveau plan n’a été produit.
