# Contrat paramétrique de séance

DRAFT — NO-GO. Tous les cas sont synthétiques. Complétude technique, compatibilité de calendrier, admissibilité individuelle et approbation coach sont distinctes. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée.

Le résolveur `experimental/det-engine/v28-execution.ts` étend V27. Il réutilise V18, les chronologies V27, la résolution V22 des intensités, les gardes de variantes V27, la revalidation V22, la portée V23 et les témoins historiques V24. Il ne sélectionne pas un nouveau plan et ne remplace aucun moteur.

Chaque paramètre porte : clé, valeur, unité, statut, origine, ID source, empreinte canonique, empreinte recette, portée scénario/objectif/phase, date/version du contexte, effets et contrôles à rejouer. L’intégrité est recalculée contre la compilation source et les empreintes. Une mauvaise unité, portée, version, empreinte, clé dupliquée ou donnée runtime mal formée bloque le résultat.

| Paramètre | Effet calculable dans ces scénarios |
|---|---|
| aéro, occurrence finale | 5 ou6 repos300s ; travail3600s inchangé ; différence300s |
| nage, allure par libellé | secondes = mètres/100 × allure déclarée, pour chaque occurrence écrite |
| nage, transition | un événement par frontière déclarée ; aucune transition inconnue remplacée par zéro |
| nage, repos et occurrence | conserve la durée source du repos ; compte selon la convention explicitement fournie |
| force, tempo | répétitions × côtés × tours × secondes/répétition ; les maintiens restent en secondes source |
| force, changement de côté | 15 changements dans ce circuit à deux côtés ;75s avec le paramètre5s |
| force, repos exercice | 15 ou18 événements10s selon la dernière occurrence ; différence30s |
| force, repos tour | 2 ou3 événements60s ; différence60s |
| force, transitions périphériques | deux événements5s ;10s, sans réduire les5min de chaque périphérie source |
| force, charge et composition | mode poids du corps déclaré ; repos cumulés seulement sous convention additive explicite ; aucune conversion en zone cardiaque |

Ce tableau décrit l’effet technique des valeurs de test. Il n’attribue aucun bénéfice physiologique à une seconde ou un repos supplémentaire. Toute modification rejoue les dix familles de contrôles portées dans les paramètres ; le résultat du bloc reste une sortie distincte.

`known` signifie valeur explicitement déclarée dans son contexte, jamais mesure scientifiquement vérifiée. `unknown` et `proposed` restent non exécutables. `authorized` ou origine coach exigent une décision documentaire exacte et un vérificateur humain externe ; ce vérificateur n’est jamais fourni par le harnais offline. Une simulation ne peut autoriser un document. Aucun mécanisme nouveau n’approuve une dose individuelle.

Les textes originaux bruts, la structure canonique enrichie et la variante sont séparés. Les phases originales et enrichies sont également affichées : l’élargissement historique base/build→peak ne vaut pas autorisation du protocole original en peak. Le nouveau garde complémentaire vérifie les deux ; il ne change pas le validateur historique.

Les intensités vélo proviennent exclusivement de la doctrine TFCLab et du binding candidat V22, appliqués à l’ancre native synthétique. Les allures de nage sont des paramètres par libellé exact, non un transfert CSS. Les charges de force sont neuromusculaires, sans zone cardiaque.

Les sorties indépendantes sont `technically_complete_in_scenario`, `compatible_with_reserved_slot`, `candidate_requires_coach_policy`, `individually_admissible`, `approved_by_coach`, plus les contrôles de prérequis, capacité et récupération. Les deux derniers restent faux/non établis. Un objet complet n’est ni une tolérance démontrée ni une prescription autorisée.

Le budget logistique de minutes réservées ne prouve pas une dose active. La chronologie exacte est en secondes. Le pont actuel vers le plan historique refuse les durées fractionnaires ; aucune minute fictive n’est ajoutée pour les rendre entières. Toutes les propositions restent séparées du calendrier retenu, y compris celles sans nouvelle erreur.
