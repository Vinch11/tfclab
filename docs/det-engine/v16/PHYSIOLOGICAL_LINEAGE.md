# Chaîne physiologique TFCLab → DET-ENGINE

L'audit statique est traçable par fichier/ligne/SHA dans [lineage-source-map.json](evidence/lineage-source-map.json). Les exécutions sur fixtures se trouvent dans `integration-study.json`, sans consultation d'athlète réel.

| Maillon | Lien réellement présent | Limite de preuve |
| --- | --- | --- |
| Tests terrain → références | La page lit tests et snapshots ; VLamax effectif reçoit les tests via un précalcul. FTP/VMA/CSS proviennent de getEffectiveRefs (snapshot/profil). | Un enregistrement de test n'alimente pas automatiquement toutes les références ; méthode/date/source doivent être vérifiées. |
| Profil → limiteurs | computeDiagnostic et limiteur unifié calculent valeurs, impacts, ordre et incertitudes. | Les valeurs des fixtures sont fictives, pas de mesures individuelles validées. |
| Limiteurs → adaptations | prepareTrainingPlanContext exécute computeDecision et transmet leviers/prohibitions/strategyContext. | Une recommandation stratégique n'est pas encore une dose optimale. |
| Adaptations → catalogue | Le builder réutilise l'ordre des limiteurs, ses patterns et garde-fous. Les 25 métadonnées explicites sont conservées ; les autres restent inconnues. | Classification par motifs héritée ≠ attribution scientifique relue. |
| Intention → dose V10/V14 | Rôles essentiels, minima sources, budget et remplissage borné par priorité. | focusSport et capacités de séance viennent du cas synthétique manuel, pas d'une formule terrain→dose validée. |
| Dose → calendrier | V14 place des réservations conditionnelles et contrôle les 16 semaines. | 104 créneaux conditionnels ne deviennent pas approuvés par la conversion. |
| Réaction → réévaluation | États et simulations favorables/défavorables/inconnues V14, suivi V15 conservés. | Aucune adaptation observée réelle, aucun feedback de production branché à une prescription autonome. |

## Sensibilités réellement exécutées

Même cas IM, niveau/budget/disponibilité et plafonds individuels hérités constants ; seul le paramètre décrit change. Horloge des tests fixée au 28/10/2026. Les valeurs représentent des fixtures déclarées, jamais des capacités réelles acquises. La sensibilité commence au résultat estimé de test déjà stocké (champ `vlamax`), pas au chrono du sprint, aux lactatémies ou à la reconstruction d’un protocole brut. L’acquisition et le calcul terrain amont ne sont pas rejoués ; la classification source `test` du moteur reste une sortie logicielle, pas une validation scientifique indépendante.

| Fixture | VLamax effective | TTE effectif / source | Limiteurs transmis | Offres vélo long |
| --- | --- | --- | --- | --- |
| field_test_low | 0.2 | 43 / estimated | TTE, FTP/kg, VO2max | 3 |
| field_test_high | 0.9 | 43 / estimated | VLamax, TTE, FTP/kg, VO2max | 2 |
| tte_short | 0.2 | 20 / observed | TTE, FTP/kg, VO2max | 3 |
| tte_long | 0.2 | 60 / observed | FTP/kg, VO2max | 3 |
| recent_fatigue | 0.2 | 43 / estimated | TTE, FTP/kg, VO2max | 3 |


VLamax 0,2→0,9 ajoute VLamax en tête et le levier force-endurance, et change le domaine d'offres vélo long 3→2. Le stimulus principal de base reste modéré : pas de dose haute intensité imposée pour créer une différence. Les plafonds identiques restent identiques, car une estimation modifiée ne prouve pas une tolérance de durée supérieure.

Le contrôle initial héritait `tteMode=synthetic_estimate` : une valeur brute 45 ne devient pas une observation et le moteur calcule 43 estimé. Dans les deux fixtures supplémentaires déclarées `OBSERVED` **au sein de la simulation seulement**,20 et 60 sont correctement transmis : à 60, TTE disparaît des limiteurs. Cela vérifie le contrat de provenance ; cela ne transforme pas une fiction en observation réelle.

L'état fresh→high modifie l'indice de fatigue dans le diagnostic. Dans ces cas, il ne change pas automatiquement les plafonds ni les offres : **la réponse dose/récupération n'est donc pas causalement démontrée de bout en bout**. Il faut conserver ce manque, pas annoncer une adaptation autonome aboutie. La suppression des données de limiteur maintient le refus `limiter_missing`.

L'affichage d'intensité canonique utilise seulement un domaine explicite et un repère avec provenance : une FTP synthétique 250→300 modifie la plage en watts, sans modifier la durée. Domaine absent, seuil course absent ou borne VO₂ individuelle absente ⇒ inconnu. Aucun %VMA neuf ni optimum quantitatif n'est inventé. Une limite chiffrée propre à la source (par exemple 55–72%FTP et exceptions terrain de SEILER_BIKE_Z1_LONG) bloque la personnalisation générique jusqu'à résolution spécifique : la plage plus large de la doctrine ne l'écrase pas.

## Résistance à la fatigue : trois notions séparées

| Notion | Disponibilité auditée | Ce qu'elle ne prouve pas |
| --- | --- | --- |
| Niveau qualitatif coach | trainingLevel existe et est transmis | Durabilité longue ou assimilation de la semaine |
| État de fatigue récent | fatigue_state, check-ins sommeil/fatigue/douleur/courbatures ; indice effectif | Capacité stable à résister à la fatigue |
| Résistance présumée | TTE, proxies chronos/dérive et conventions peuvent l'éclairer | Durabilité multisport/posture/excentrique démontrée |
| Assimilation observée | Réponses/récupération V11–V15 sont synthétiques ; pas de réaction réelle lue ici | Adaptation acquise du seul passage des semaines |
| Appréciation qualitative dédiée du coach | Aucun champ dédié transmis à DET-ENGINE trouvé dans les contrats audités ; coach_notes existe en texte libre | Les notes ne sont pas parsées comme preuve positive de durabilité |

Pas de nouveau questionnaire. Un futur lien de preuve devrait préciser auteur/date, discipline, contexte et durée, observation citée, incertitude et portée ; un avis présumé doit rester distinct d'une exposition effectivement assimilée. Aucun tel lien réel n'est créé en V16.

Les principes documentés L175/L417 (besoin du moment, contexte, équilibre, feedback), M21 (durabilité distincte d'un seuil frais) et les réserves scientifiques V8/V15 motivent cette séparation. Ils ne sont pas transformés en quotas ou taux universels. Aucune nouvelle attribution bibliographique individuelle n'est fabriquée.
