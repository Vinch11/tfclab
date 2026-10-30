# Classification des conditions — périmètre et conséquences

**104 = créneaux conditionnels, pas 104 contre-indications ni 104 examens distincts.** Les deux modèles natifs comportent 318/317 occurrences de conditions. Toutes les occurrences et leurs textes V14 sont conservés : aucune suppression, résolution ou modification de sévérité. Le CSV et conditions.jsonl permettent une revue ligne par ligne, avec pointeur vers la preuve d’origine.

Le classement ci-dessous décrit le travail attendu. Il ne change aucun état V14. Une condition de suivi courant reste obligatoire à son échéance ; elle n’est ni une erreur de construction aujourd’hui, ni une preuve de récupération obtenue. Les catégories secondaires conservent les dépendances des conditions composées. Seule la catégorie primaire est comptée pour éviter le double comptage.

| Profil/modèle | Créneaux conditionnels | Occurrences | Individuelles | Techniques/catalogue | Réévaluations futures | Suivis courants |
|---|---|---|---|---|---|---|
| IM_aerobic_history/native_floor_conditional | 104 | 318 | 60 | 110 | 50 | 98 |
| IM_aerobic_history/hold_current_envelope | 104 | 312 | 60 | 110 | 44 | 98 |
| IM_aerobic_history/blockwise_reassessment | 104 | 318 | 60 | 110 | 50 | 98 |
| IM_balanced_history/native_floor_conditional | 104 | 317 | 60 | 110 | 49 | 98 |
| IM_balanced_history/hold_current_envelope | 104 | 312 | 60 | 110 | 44 | 98 |
| IM_balanced_history/blockwise_reassessment | 104 | 318 | 60 | 110 | 50 | 98 |

## Familles et conséquences pratiques

| Condition V14 | Objet de preuve | Catégories | Conséquence |
|---|---|---|---|
| protocol_time | Temps complet de tous les éléments et exécution individuelle dans le créneau | Technique + individuel | Une plage catalogue seule ne confirme pas la faisabilité. Ne pas tronquer distances, répétitions ou repos. |
| swim_execution | Maîtrise des nages/éducatifs, protocole complet, épaules et effort | Individuel + suivi | CSS crawl ne chronomètre pas dos/brasse/éducatifs ; aucune valeur manquante n’est inventée. |
| movement_competence | Compétence et charge des exercices effectivement prescrits | Individuel + suivi | Le plafond générique 40 min de soutien ne prouve ni technique ni tolérance d’un circuit précis. |
| posture_response | Tolérance des bouts aéro et réponse cervicale/lombaire | Individuel + suivi | 120 min de vélo générique ne démontrent pas 60 min en position aéro. |
| prerequisite:ventilateur | Lieu et matériel pertinents pour la fiche | Technique/contexte | La fiche évite le home-trainer sans ventilateur. Clarifier la portée si sortie dehors ; ne pas lever ici le prérequis extrait par V14. |
| catalogue_unknown | Métadonnée manquante, ici intensité non déclarée du soutien yoga | Technique/catalogue | Incertitude de représentation ; ne pas créer du HIT ou demander une mesure métabolique fictive pour faire disparaître le signal. |
| relative_source_context | Contexte réel précédent conforme au placement de la fiche | Technique + suivi | Le calendrier prévu est contrôlé ; un changement réel ou une réponse adverse demande une nouvelle revue. |
| whole_week_interaction | Expositions cumulées ET historique nutrition/hydratation adapté aux efforts | Individuel initial, puis réévaluation/suivi | Une condition composée ne devient pas un simple suivi : les prérequis initiaux et le contexte hebdomadaire restent nécessaires. |
| capacity | Capacité actuelle 75/90 min vs cible future 90/95/100 | Réévaluation + individuel | Pas à démontrer avant S1 pour autoriser la réflexion sur le bloc initial ; à établir avant la dose concernée. Une insuffisance constatée refuse cette dose. |
| recovery | Retours qualitatifs et symptômes avant les expositions concernées | Suivi courant obligatoire | 98 occurrences par modèle ; pas 98 nouvelles analyses de laboratoire. Absence ou réponse adverse n’autorise aucune progression. |

Les questions répétées peuvent être documentées dans un même dossier lorsque source, dose, contexte et individu correspondent. Les clés de regroupement sont un index documentaire, pas un mécanisme de validation en lot : toutes les occurrences restent présentes. Les preuves datées de capacité et de récupération ne sont pas remplacées par une attestation statique applicable à seize semaines.

## Ce qui est réellement bloquant, réversible ou simplement à suivre

| Situation | Nature | Décision |
|---|---|---|
| Protocole individuel/temps/compétence absent pour la première exposition | Preuve indispensable manquante | Garder le créneau conditionnel ; une prescription immédiate non conditionnelle n’est pas étayée |
| Récupération d’une séance future non encore observée | Suivi normalement futur | Prévoir responsable, indicateur et décision ; ne pas compter l’absence de cette observation aujourd’hui comme une erreur de construction |
| Dose arrivée à échéance au-dessus de l’enveloppe explicitement réévaluée | Non-admissibilité de cette dose dans ce contexte | Refuser la dose, puis revoir une alternative complète et ses écarts ; ce n’est pas une incapacité physiologique définitive |
| Réponse adverse, douleur ou fatigue non résolue | Suspension, pas simple donnée administrative | Ne pas compenser ailleurs ni substituer automatiquement une dose prétendument sûre |
| Recette complète incompatible avec durée/phase/calendrier fixé | Incompatibilité de la configuration versionnée | Impossible en gardant simultanément ces contraintes ; corriger explicitement la configuration ou changer de source, jamais attendre une adaptation pour résoudre une contradiction mathématique |
| Brick V13 :55 min actives pour maximum annoncé 45 | Exemple archivé de contradiction source/contrat, non utilisé dans les calendriers V14 | Un meilleur athlète ne réduit pas 55 min prescrites à 45 ; overlay candidat séparé, temps total toujours inconnu |
| Durée de compétition inconnue pour le schéma d’export | Blocage technique du calendrier complet | Ne pas inventer une durée ou une compétition 0 min ; ce point n’empêche pas l’audit technique séparé du premier bloc |

**Aucune contre-indication médicale permanente ni incompatibilité irréversible d’un athlète n’est établie dans ces profils synthétiques.** Les hardFailures V14 sont nuls dans les calendriers initiaux ; cela ne prouve pas l’absence de tout risque. Les scénarios sans gain/adverses restent des fictions distinctes. «Irréversible» ne peut ici qualifier qu’une contradiction tant que ses hypothèses fixes restent inchangées, pas une personne.
