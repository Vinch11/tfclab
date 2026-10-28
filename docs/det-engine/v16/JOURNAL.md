# Journal V16 — dix unités bornées

Début : 28 octobre 2026 à 19:26 UTC. Échéance : 20:26 UTC. Branche `experiment/det-engine`, baseline `e9fd91a6e9d4eb3cf2c59d708818e5901ae69d07`. Aucun coût externe, aucun processus permanent. Les états logiciels « passé » signifient tâche technique achevée, pas validation sportive.

| Unité | Hypothèse / travail | Résultat mesuré et décision |
| --- | --- | --- |
| 1 — Inventaire | L'agrégateur et ses tableaux construits doivent pouvoir être recensés sans supposer le nombre annoncé. | 920 occurrences et IDs uniques, 22 groupes, 29 dépendances. Égalité intégrale avec le module réellement chargé. Conservé. |
| 2 — Schéma | Une représentation versionnée peut garder les contenus, inconnues et statuts séparés. | Zod et JSON Schema V2 ; 920 représentations valides, sans approbation automatique. Conservé. |
| 3 — Conversion | Une transformation intégrale et sa reconversion peuvent être déterministes et sans perte. | 920 objets avant/après enrichissement conservés ; 920 reconversions identiques ; variantes/IDs/empreintes préservés. Conservé. |
| 4 — Audit | Les contrôles connus doivent être réutilisés, sans transformer une limite de parseur en défaut sportif. | Audit V13/V14 sur 920 fiches ; conflit brick 55 min actives contre 30–45 annoncées reproduit ; 779 grammaires non couvertes par V13. Registre joint et CSV global. Conservé sans correction sportive de source. |
| 5 — Coach | Les consignes doivent survivre au rendu sans imposer les métadonnées internes. | 920 rendus contrôlés ; 14 exemples Markdown, 3 HTML offline ; mapping Nolio interne gardé dans le canonique. Intensité inconnue ou convention documentée, aucune dose optimale inventée. Conservé. |
| 6 — Nolio | Une compatibilité locale doit être distinguée d'un export réel ou d'un workout structuré fidèle. | 833 contrats texte v1 simulés ; 87 refus brick/mixed ; 0 recette source certifiée en workout structuré par V16 ; cible API v2 refusée explicitement. Conservé comme adaptateur de fixtures. |
| 7 — Physiologie | Une variation pertinente doit pouvoir changer la priorité, sans fabriquer une nouvelle capacité. | VLamax modifie le classement et certaines offres ; TTE correctement marqué OBSERVED dans la fiction modifie les limiteurs. Plafonds inchangés et dépendances manuelles visibles. Aucun lien complet dose→adaptation attesté. Conservé comme preuve de portée limitée. |
| 8 — Validation | Les invariants doivent tenir avec les gardes existants. | Typage, 26 tests Node, 9 tests V16, 30 gardes antérieurs et 186 tests historiques ciblés passent ; 3 archivages conditionnels préexistants non exécutés. Conservé. |
| 9 — Preuves / dossier | Deux processus indépendants doivent reproduire migration et étude ; le dossier doit être examinable. | Sept fichiers de migration et une étude identiques au rejeu, schéma indépendant 920/920, dossier et index complets. Conservé ; aucune revue humaine annoncée. |
| 10 — Publication expérimentale | Les preuves peuvent être enregistrées et la PR actualisée sans toucher à la production. | Voir state.json et publication-proof.json pour l'état distant effectivement vérifié. Brouillon et NO-GO obligatoires. |

## Essais rejetés et corrections techniques

L'extracteur a d'abord refusé une dépendance pure locale partagée, puis rencontré une méthode console non exposée dans son contexte. La dépendance est maintenant répertoriée et l'environnement console minimal complet ; aucun accès réseau/processus n'a été ajouté au contexte d'extraction.

L'étude initiale a révélé une annotation trop large, puis un accès au mauvais nom de propriété du diagnostic. Le champ réel `effectifs` a été repris et le typage/runtime revérifiés. Ces erreurs appartenaient au nouveau harnais ; aucun code de diagnostic ou validateur historique n'a été corrigé pour les masquer. Les logs initiaux, affinés et corrigés restent présents.

La tentative de validation 1 a reçu une erreur EPERM du sandbox malgré une sortie 0 : rejetée. La tentative 2 a atteint 180 secondes pendant la suite de recherche expérimentale globale ; deux tests V16 y dépassaient aussi le timeout historique de cinq secondes : rejetée. Les preuves sont dans `validate-1` et `validate-2`. La tentative 3 garde les tests V16 avec leur timeout explicite de 60 secondes, les huit fichiers de garde concernés et les tests historiques catalogue/physiologie/zones : elle passe. Aucun résultat de la suite interrompue n'est agrégé comme succès, aucune assertion sportive n'est assouplie.

Le signalement initial de tous les `mixed` comme bricks a été remplacé par une classification fidèle aux catégories sources : 63 fiches de sport brick ou catégorie Brique conservent leur contrôle de composantes, 25 autres mixed gardent une incertitude de modalité. Le double-run classé Brique reste mono-discipline dans la source ; sa catégorie n'est pas une preuve de composantes vélo. Les 87 refus Nolio pour sport brick/mixed restent inchangés ; aucune admissibilité n'est gagnée en supprimant une alerte.

## État scientifique

Aucune des conversions n'est une validation scientifique ou individuelle. Les références sont des mentions de source non vérifiées. Les conditions et calendriers V14–V15, les 600 références et les 3057 fichiers antérieurs restent intacts. Les réévaluations futures ne deviennent pas satisfaites. La couche canonique reste parallèle et non activée ; les décisions sportives ambiguës restent candidates à revue.

## Complément de revue avant publication

Un test de régression supplémentaire a démontré qu'une plage d'affichage générique pouvait dépasser le plafond chiffré de la fiche SEILER. Ce résultat défavorable est archivé dans `intensity-source-regression-rejected.txt`. Le rendu personnalisé refuse désormais une recette avec pourcentages source non résolus, plutôt que d'écraser ces limites. Les valeurs affichables concernent seulement le stimulus principal ; elles ne remplacent pas les autres parties. Les 27 tests Node passent, puis une troisième conversion vérifiée reproduit les sept artefacts de référence à l'identique. Cette correction relève de l'unité 5, pas d'une nouvelle doctrine ou unité de travail.

Pendant cette vérification, l'environnement a été transitoirement indisponible et le handle du processus précédent a été perdu. Ses sorties restent conservées avec statut de sortie inconnu ; une exécution distincte a obtenu un reçu complet. Aucun redémarrage du registre, aucune adaptation acquise ni reprise permanente n'est prétendu.

Le bundle source conserve aussi les commentaires des modules et les types/doctrine, sans attribuer automatiquement leurs références scientifiques à toutes les séances. Le catalogue de production reste intact.

Clôture V16 : dix unités achevées en 48 min 13 s ; état `completed_no_go`. Source `8091a13d2f2333ac674a9c14534a451d75e62d45` poussée et PR #420 vérifiée ouverte, en brouillon et non fusionnée. Le point de contrôle distant précède le commit de clôture documentaire. Aucun service permanent ou redémarrage automatique.
