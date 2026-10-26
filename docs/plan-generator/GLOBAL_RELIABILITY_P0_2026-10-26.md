# P0 global — fiabilité démontrée et limites opérationnelles

Base : `73fd91ca17bf30b147cd63e32e38d10a5ea3d5eb`. Branche `fix/global-plan-reliability-p0`.

**NO-GO global pour une nouvelle génération réelle et pour une attestation de sécurité sportive.** Les corrections ci-dessous sont implémentées ; les cas impossibles restent bloqués. Une CI verte ne prouve ni la capacité de Gemini à respecter le contrat ni la pertinence scientifique d'une prescription réelle.

## Périmètre et réutilisation

L'inventaire suit `ObjectifType`, les options de `QuickObjectiveSelector`, `AMBITION_DEFINITIONS` et `AMBITION_MAX_BY_LEVEL` : 13 clés, dont `Trail` historique, quatre niveaux manuels et cinq ambitions. Les sondes QA `CyclingPure`/`UltraExtreme` ne sont pas ajoutées aux objectifs UI. `auto` est un mode d'inférence, pas une nouvelle catégorie coach. Le format LCW existant est couvert séparément.

520 configurations couvrent chaque objectif × niveau × ambition × charge connue/inconnue. 80 configurations supplémentaires couvrent 703/IM × les mêmes facteurs en LCW. Les facteurs secondaires (cinq archétypes physiologiques existants, quatre contraintes existantes, préparation courte/native/longue, jalon présent/absent) couvrent toutes les paires dans le noyau, pas toutes les combinaisons conjointes. Les qualités de données sont celles des profils V2 réutilisés ; elles restent partiellement corrélées aux archétypes et ne constituent pas un plan factoriel indépendant. Les contraintes réutilisées exercent le texte reconnu et le terrain ; toutes les formulations libres possibles ne sont pas couvertes.

Travaux conservés : rapports `P0_10K_CATALOGUE_PHASE_CONTRACTS`, `P0_10K_S12_RACE_QUOTA`, contrats séances/PDF, progression coach, fraîcheur historique et persistance. Les tests existants restent exécutés. Aucune taxonomie, méthode physiologique ou estimation n'est remplacée.

## Corrections et preuves

| Défaut | Première étape défectueuse / preuve | Correction commune | Limite |
|---|---|---|---|
| IDs mixtes perdus | Le dump contient `B_RUN_HILL_TEMPO_3x8` ; le parseur serveur n'acceptait que les majuscules | Un parseur partagé conserve exactement les IDs de ligne ; test sur les 920 fiches | L'ID réel rejeté en S3 n'est pas disponible : aucune attribution à cet ID |
| Référence inconnue déguisée en custom | La normalisation effaçait un ID inconnu non vide | L'ID reste visible et le schéma fermé peut le refuser ; custom sans ID et garde trail conservés dans les deux fonctions | Une hallucination réelle reste un refus légitime |
| Titres/protocoles tronqués | Titre limité à 50 caractères, protocole à 120 ; le validateur compare au contenu complet | Titre et protocole complets, espaces/pipes normalisés ; bornes de durée toujours visibles | Prompt plus long, coût/latence et réponse du modèle non mesurés |
| Durée demandée hors contrat | Instruction ±15 % indépendante des bornes de fiche | L'adaptation doit respecter les bornes et les variantes numériques existantes | Aucun assouplissement du validateur ; impossibilité de garantir le choix du modèle offline |
| Intention fausse après renommage | Z2 inchangée classée différemment par le titre tronqué/accessoire | Comparaison sur la même surface titre-source ; métadonnées structurées et contenu restent prioritaires | Ne constitue pas une analyse sémantique exhaustive des descriptions libres |
| Force / récupération mal classées | Tempo de répétition musculaire interprété comme seuil ; contrôle conversationnel comme test | Réutilisation des familles existantes, priorité au but explicite et au bloc principal facile | Les vrais changements d'intention, de zone, de durée et de structure restent refusés |
| Rotation créant une pénurie | Des fiches simplement proposées dans un chunk précédent étaient exclues ensuite | Préférence de diversité au départage des scores ; aucun filtre sportif relâché | Répétition possible si les meilleures fiches sont rares ; surveillance du plan final maintenue |
| « 25 attendues » ambigu | Compte de diversité des étiquettes CAP sélectionnées, pas quota ni couverture hebdomadaire | Diagnostic explicitement nommé diversité ; contrôles réels de couverture inchangés | Un nombre de fiches distinctes inférieur à la fréquence ne prouve pas seul qu'aucun plan n'est possible |
| Sprint/Olympic privés de natation/vélo | Les clés UI n'étaient pas reconnues par le filtre sport et les exclusions | Normalisation existante partagée : sports triathlon conservés, trail exclu | Test avant : deux échecs ; après : 13 tests verts. La course seule ne gagne pas de vélo obligatoire |
| Disponibilités contredites | Quota ignorant le plafond journalier explicite ; layout ignorant les jours interdits | Plafond resserré uniquement, interdictions transmises au layout initial et à la régénération ; brick respecte interdits vélo/CAP | Le placement glouton peut rester incomplet malgré une solution alternative ; aucune disponibilité inventée |
| Discipline bannie réintroduite | Le plancher CAP taper/race créait deux créneaux malgré un quota CAP nul après interdiction | Ne pas activer ce plancher lorsque run.max=0 ; le plancher existant demeure pour les sports autorisés | Deux tests rouges avant correction ; un conflit de plafond positif reste explicitement diagnostiqué, pas arbitré |
| Affûtage contradictoire | 4/40 couples testés ont des minima maintenus supérieurs au total réduit | Même principe que #417 : total compatible avec fréquences maintenues, jamais supérieur au plafond load ; floors SL et budgets volume inchangés | La contradiction de récupération est distincte et reste ouverte |
| Dépense sur contrat mécaniquement impossible | Minima/total/capacité/layout incohérents avant le modèle | Précontrôle commun initial/régénération, arrêt explicite avant requête ; ne modifie aucun quota pour masquer l'échec | Des configurations auparavant envoyées au modèle sont désormais refusées plus tôt |
| QA triathlon mal routée | Le préparateur pilote reconnaissait les libellés mais pas toutes les clés UI | Même normalisation d'objectif pour le diagnostic synthétique | Correction du harnais, pas preuve d'une modification de prescription réelle |

Les nouvelles assertions ont été exécutées rouges avant les corrections catalogue (4), disponibilités/identité (7), Sprint/Olympic (2) et affûtage (4/40). Les contrôles négatifs vérifient toujours durée hors plage, intensité excessive/diluée, intention réellement différente, phase incompatible, variante non exécutable et compétition officielle mal associée. L'ancien test de caractérisation qui attendait le faux classement « récupération → test » devient une non-régression ; les autres critères ne sont pas abaissés.

## Ce que la chaîne offline exerce réellement

- Les 600 cas exécutent diagnostic, décision, configuration, ambition effective, périodisation, quotas quand disponibles, individualisation des floors, catalogue, admissibilité par semaine, layout et faisabilité. Les filtres sport/exclusions et le signal de risque utilisent les fonctions de production. L'historique de rotation entre plans est vide ; le départage utilise un seed fixe. Les journaux exportés contiennent seulement paramètres synthétiques, enums, compteurs et IDs publics ; pas de dossiers athlètes.
- Le catalogue sélectionné est vérifié contre son propre contrat canonique ; **ce n'est pas une sélection de séances ni un plan généré**. Aucun remplissage conforme aux quotas n'est fabriqué pour simuler Gemini. La fenêtre multi-objectifs segmentée et tous les chemins de régénération ne sont pas intégralement rejoués par cette matrice.
- Corpus complet : une sortie modèle 5 km de 12 semaines déjà archivée, reprise à l'étape fusionnée (les chunks bruts ne sont pas disponibles), puis adaptateur, post-traitements actuels, validation, édition locale, persistance JSON simulée, rechargement, Markdown et vrai générateur HTML PDF. Son défaut bloquant doit rester détecté.
- Start-to-Run : vraie voie statique existante de 12 semaines, trois dosages renforcement. Elle n'est pas traitée comme une génération IA. Le validateur générique fait apparaître des alertes de contrat, dont des attentes de course/renforcement non représentatives de cette voie ; elles ne sont pas transformées en défauts physiologiques prouvés. Aucun protocole S2R modifié.
- Tests `useCloudData.persistence` existants : hook réel avec transport mémoire, fermeture/réouverture, champs structurés, tests/profils et échec de sauvegarde conservant l'ancienne version. Cela **n'atteste pas la base réelle**, ses politiques ou son rollback.
- Export : HTML produit par l'exporteur réel, pas impression native Safari ni pagination PDF attestée. Les contrôles sportifs indépendants déjà écrits conservent leurs fixtures positives/négatives, explicitement authored et non assimilées à une sortie modèle complète.
- Limiteurs : tests contrôlés sur huit objectifs, indépendance du niveau coach, ordre manuel des seuls limiteurs réellement identifiés, absence de charge mesurée inventée, effet sur le classement catalogue à cas constant. La traduction effective dans les séances d'une nouvelle réponse modèle reste non attestée. Un profil sans écart identifié n'acquiert pas de limiteur artificiel.

## Lecture des matrices

`global-p0-evidence/matrix.csv` : une ligne par configuration. `summary.json` : agrégation par objectif et niveau. `matrix.jsonl` : compteurs et détail hebdomadaire, phases, types, tailles de pools et motifs d'exclusion. `replay.json` : plans complets disponibles, origine et limites des étapes traversées.

Le CSV est échappé selon RFC 4180 : 600 lignes × 18 colonnes relues avec le parseur CSV standard Python, avec restitution exacte de tous les diagnostics JSON (`csv-validation.json`).

Les compteurs de précontrôle et de quota peuvent décrire la même contradiction. **Ne pas les additionner comme un nombre d'incidents distincts ou de violations de sécurité.** Le résumé compte les configurations touchées. `minimum_catalogue_dose_exceeds_budget` est un signal de faisabilité selon les bornes canoniques, pas une preuve d'impossibilité avec toutes les variantes/custom. Les pénuries portent sur les fiches distinctes ; répétition autorisée et custom ne sont pas assimilés à des fiches supplémentaires.

Les zéros en trail ne sont pas un GO : cette voie n'a pas la matrice déterministe de quotas/rampe de la route. Ses prescriptions complètes, progression, dénivelé, récupération et incertitudes restent à vérifier sur sorties enregistrées. Aucune règle 10 km ne lui est appliquée.

### Résultats locaux reproductibles

600 configurations préparées ; 520 au noyau et 80 LCW. Toutes les paires des facteurs secondaires du noyau sont couvertes. Aucun appel réseau dans la matrice/relecture. Les quatre régressions mesurées (plafond quotidien, jours interdits, IDs perdus, conflit du contrat canonique) sont à zéro après correction.

| Objectif / voie | Configurations | Cas bloqués mécaniquement | Cas avec manque de fiches distinctes | Signal dose minimale | Verdict de capacité / sécurité / science |
|---|---:|---:|---:|---:|---|
| 703 | 80 | 48 | 10 | 18 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| IM | 80 | 48 | 18 | 16 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| Sprint | 40 | 8 | 1 | 2 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| Olympic | 40 | 10 | 2 | 9 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| Marathon | 40 | 12 | 15 | 0 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| Semi | 40 | 12 | 6 | 2 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| 5K | 40 | 12 | 0 | 0 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| 10K | 40 | 12 | 0 | 1 | NO-GO global ; sorties complètes supplémentaires et revue requises |
| StartToRun | 40 | 0 | 0 | 0 | NO-GO global ; voie statique testée, contrat générique à clarifier |
| Trail | 40 | 0 | 0 | 0 | NO-GO global ; contrôles déterministes partiels |
| TrailShort | 40 | 0 | 0 | 0 | NO-GO global ; contrôles déterministes partiels |
| TrailMountain | 40 | 0 | 0 | 0 | NO-GO global ; contrôles déterministes partiels |
| TrailUltra | 40 | 0 | 0 | 0 | NO-GO global ; contrôles déterministes partiels |

Les lignes 703/IM incluent 40 cas continuous et 40 LCW chacune. Le détail par niveau et les configurations exactes sont dans `summary.json` et `matrix.csv`. Un cas sans blocage mécanique n'est pas un plan généré conforme.

Parcours offline ciblé : **9 fichiers / 111 tests verts**. Affûtage + matrice historique + non-régression race : **106 tests verts**. Disponibilités, layout et affûtage après correction du sport banni : **79 tests verts**. TypeScript app : vert. Deno production : **340/340** ; fonction test : **338/338**. Les quatre jobs CI et la reproductibilité du HEAD sont suivis dans la PR ; ne pas assimiler un résultat local à un résultat GitHub.

Plans complets disponibles : 5 km archivé, 12 semaines, **1 erreur / 18 avertissements** au validateur courant ; Start-to-Run full **5/47**, light **16/47**, none **16/43** au validateur générique. Ces comptes conservent les anomalies au lieu de fabriquer une conformité et ne sont pas une expertise sportive du protocole statique. Le rapport de replay indique les règles précises.

## Blocages résiduels et arbitrages nécessaires

1. **Récupération triathlon** : réduction globale du nombre de séances et minima par sport encore incompatibles sur certaines lignes. Exemple reproductible IM world_class : des minima exigent huit séances effectives pour un plafond de sept en récupération. L'affûtage corrigé ne résout pas cette règle distincte. Choisir comment préserver récupération et spécificité nécessite l'arbitrage du coach ; aucune insertion/suppression ou hausse du plafond de récupération n'est inventée.
2. **Disponibilités / placement** : configurations réellement trop étroites ou algorithme de placement ne trouvant pas de disposition satisfaisante. Le diagnostic distingue capacité impossible et layout incomplet, sans prétendre que toute disposition alternative a été recherchée. Pour un premier usage, ne retenir qu'une configuration sans blocage mécanique et faire revoir le calendrier ; pas de contournement du précontrôle.
3. **Pools et dose** : les cas de manque par sport ou de dose minimale trop haute nécessitent une revue des fiches/variantes précises. Pas d'ajout artificiel ni de métadonnées élargies. La matrice fournit les semaines et compteurs d'exclusion ; elle ne prouve pas que toutes les intentions requises sont couvertes dans une prescription finale.
4. **Preuves de plans complets insuffisantes** : pas de sortie modèle complète enregistrée pour la majorité des familles/variantes de cette matrice. Les refus réels du deuxième 10 km n'ont toujours pas d'ID ni de protocole individuel récupérable. Il faut un export assaini des réponses/diagnostics existants ou, après décision séparée, une génération contrôlée explicitement autorisée. Aucun appel n'est effectué ici.
5. **Revue scientifique et recette coach** : revoir les premières prescriptions, les incertitudes physiologiques, l'enchaînement des qualités/récupérations et le rapport aux limiteurs ; recette de sauvegarde sur données fictives et PDF natif à compléter dans l'environnement publié. Aucun accès/écriture à la production dans cette mission.

## Reproduction et suite

```sh
# Dépendances verrouillées déjà installées ; aucun service de génération appelé
node scripts/quality/validate-planning-offline.mjs /tmp/tfcl-global-offline
node_modules/.bin/tsc --noEmit -p tsconfig.app.json
node_modules/.bin/vitest run
# Deno installé, imports préalablement mis en cache : pas d'accès réseau
# deno test --cached-only --allow-read --allow-env supabase/functions/ai-training-plan
# deno test --cached-only --allow-read --allow-env supabase/functions/ai-training-plan-test
```

La PR reste en brouillon et non fusionnée. Aucune publication, migration, modification Nolio/donnée athlète ou activation de #407/#408. Pas de GO global déduit des tests. Les corrections communes sont séparées de la correction de routage Sprint/Olympic ; les voies trail et S2R conservent leurs spécificités et leurs limites de preuve.
