# Prescription contrôlée et contrat global du Plan IA

## Résultat attendu

L’application prescrit et organise les séances à partir des fiches admissibles ; l’IA explique les choix sans modifier leur intention, leur intensité ni leur dose. Le coach conserve la décision finale. Cette correction vise la conformité du plan, pas une garantie de réponse physiologique individuelle.

## 1. Contrat complet toujours visible

- Conserver le rapport global de préparation pendant toute la génération, y compris après un échec.
- Pour le cas signalé, afficher les **33 semaines** du plan Ironman, et séparément la fenêtre en cours **S1–S15**.
- Identifier les contrôles propres à une course intermédiaire : objectif, date et semaines concernées. L’alerte Marathon ne doit pas sembler concerner l’Ironman final.
- Vérifier que les alertes de fenêtre sont rattachées à leurs semaines globales, sans effacer les alertes globales ni celles des fenêtres précédentes.

## 2. Prescription par l’application

- Réutiliser le calendrier, les quotas, les disponibilités, la récupération, les planchers individualisés et les contrats catalogue existants.
- Choisir les fiches et leurs doses admissibles **avant** l’appel IA, selon la discipline, la phase, le rôle et l’intention physiologique, les limiteurs et le niveau déclaré.
- Répartir les créneaux par les règles existantes ; utiliser la diversité pour départager des candidats compatibles, jamais pour remplacer un stimulus nécessaire.
- Adapter uniquement dans les plages et variantes numériques explicitement validées pour l’objectif. Ne pas transformer une variante en prose en permission de modifier le protocole.
- Si aucune prescription compatible ne satisfait les contraintes, arrêter avant l’appel payant avec un motif précis. Ne pas remplir automatiquement les plafonds et ne pas inventer de tolérance à la charge.
- L’IA reçoit des références de séances prescrites et rédige le récapitulatif et les explications. Les champs prescriptifs affichés proviennent du catalogue et des décisions applicatives, pas du texte IA.
- Ne pas laisser les séances « custom » contourner cette séparation : toute exception non prescrite par l’application reste explicitement soumise au coach et bloquée pour une diffusion automatique.

## 3. Format IA et refus sûrs

- Simplifier le format demandé pour les références et les explications, au lieu d’envoyer un schéma combinant tous les protocoles catalogue.
- Tester localement les refus du format et le traitement des réponses avec des appels simulés.
- Une réponse en JSON sans enforcement du fournisseur ne donne aucun droit de modifier une prescription. Rejeter les références inconnues, dupliquées, manquantes ou appartenant à une autre semaine.
- Ne pas présenter le refus de format Gemini comme la cause démontrée des échecs sportifs : la conformité sera garantie par les contrôles applicatifs indépendamment du fournisseur.

## 4. Vérification du plan complet

- Après assemblage, vérifier la couverture exacte de toutes les semaines, leur ordre, les prescriptions, les quotas, la progression, les courses intermédiaires, la récupération et l’affûtage final.
- Maintenir les contrôles bloquants avant sauvegarde et la validation coach quand la charge initiale est inconnue.
- Préserver les voies spécifiques trail et LCW, ainsi que la maintenance vélo/natation du cycle course intermédiaire d’un triathlon. Ne pas appliquer les règles 10 km aux autres disciplines.

## Vérifications sans coût IA ni données réelles

- Tests du cas **33 semaines / S1–S15**, avec Marathon intermédiaire du **28/02/2027** et Ironman final du **27/06/2027**, uniquement à partir de fixtures locales.
- Tests de référence de prescription falsifiée, dose hors variante, intensité changée, séance manquante ou dupliquée et semaine déplacée.
- Tests de charge inconnue restant soumise au coach et de contradiction dans une fenêtre tardive bloquant tout appel IA.
- Non-régressions représentatives : **5 km, 10 km, semi-marathon, marathon, trail, Half-Ironman et Ironman**, plus la voie LCW et les transitions multi-objectifs.
- Vérification visuelle du contrat dans un parcours local sans écriture athlète, sans sauvegarde et sans appel IA. Une recette locale ne valide pas un plan réel généré.

## Limites opérationnelles

**Aucune génération réelle, écriture athlète, sauvegarde de plan, migration, publication, synchronisation catalogue ou modification Nolio.**

La correction du générateur touche les fonctions partagées par l’aperçu et le site publié : il n’existe pas de backend de recette séparé. Leur code ne sera pas modifié ni déployé tant qu’une autorisation explicite de déploiement coordonné n’aura pas été donnée. Préparer d’abord le changement et ses tests côté projet ; les fonctions et la mise à jour des marqueurs de version seront traitées ensemble lors de l’étape autorisée. Ne pas contourner le verrou de compatibilité pour tester.

## Détails techniques

- Séparer l’état global de prévalidation et l’état de fenêtre dans `useAITrainingPlan`, aujourd’hui remplacés par le même `setPrevalidation`.
- Introduire une couche pure de prescription réutilisant `prepareGenerationContracts`, le layout hebdomadaire et les métadonnées catalogue ; enregistrer la règle structurelle dans `AGENTS.md`.
- Intégrer ensuite les références prescrites et leur hydratation à `generateChunkJSON`, `jsonPlanHandler` et au contrat de sortie des deux fonctions, avec validation indépendante du fournisseur.
- Conserver les validations catalogue, les règles de compatibilité sportive, la fusion des quotas et le verrou releaseId. Mettre à jour la déclaration de version par le script existant seulement au stade compatible avec le déploiement autorisé.
- Livrer un bilan séparant corrections communes, voies spécifiques, tests effectivement exécutés et génération réelle restant non vérifiée.