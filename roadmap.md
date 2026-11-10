# Roadmap

- [x] Relier l'import Nolio aux séances et au protocole TTE D7 vélo / D6 course : seuil préalable D5, segment horodaté, unités et confirmations coach, durée séparée et provenance ; 34 tests passent, séances et 3638 mesures réelles d'Emanuela lues, refus sans confirmation vérifié ordinateur/mobile, fonction déployée. Aucun bilan enregistré ni publication.
- [ ] Vérifier le préremplissage sur deux vrais tests TTE vélo/course : attend des séances identifiées et validées par le coach avec seuil préalable et arrêt à épuisement ; la séance réelle inspectée n'a pas été déclarée comme test.

- [x] Revue scientifique ciblée des navettes lactate et protocoles norvégiens : fiches relues, deux sources scientifiques, catalogues de sept objectifs inspectés sans IA ; rapport dans docs/revue-lactate-norvegien-2026-11-09.md. Certaines séances norvégiennes simples sont déjà accessibles ; trois IDs du verrou n'existent pas. Aucune règle runtime modifiée.
- [x] Corrections approuvées : intentions sous-seuil / MLSS / VO₂max distinctes, fiches simples clarifiées sans promesse lactique, approbation harmonisée des doubles journées ; 58 tests passent (catalogue et substitutions sur sept objectifs), déclaration fraîche et aperçu sans erreur, fonctions ai-training-plan et ai-training-plan-test déployées avec succès. Aucun plan généré ni site publié.
- [ ] Déblocage automatique de B_RUN_LACTATE_SHUTTLE : bloqué par les exclusions qualitatives « fatigue élevée / VLamax très haute » sans contrat vérifiable dans le signal disponible ; candidature au seuil préparée, aucun seuil numérique inventé.

- [x] Ajouter une première version des modes Nolio « Rapide — à vérifier » et « Tests vérifiés » : lecture adaptée au sport, propositions vélo D1/D3/D5 et course D1/D3, confirmation coach et provenance ; 5 sports/168 records réels lus, préremplissage VMA vérifié sans sauvegarde, saisie manuelle préservée, ordinateur/mobile OK, 21 tests passés, fonctions déployées avec succès.
- [ ] Compléter l'analyse précise des autres journées : répétitions, récupération, seuil, dérive et Pool Day. Contrats d'analyse de protocole encore non validés ; TTE reliée aux streams, paramètres de dates du calendrier et ciblage athlète corrigés, aucune limitation générale des lectures affirmée ; aucun calcul automatique de FTP/CSS ni validation scientifique du test.

- [x] Import Nolio : sélection simultanée des sports et de tous les records ; 5 sports et 103 records réels vérifiés, export et désélection vérifiés, ordinateur/mobile OK, 15 tests réussis ; aucun bilan enregistré ni site publié, fonctions déployées avec succès.

- [x] Ajouter le bilan Nolio v2 par période : records vérifiables, sélection multisport, préremplissage des champs observés vides ; lecture réelle, export et formulaire vérifiés sans sauvegarde ni publication. Les seuils, CSS et tests confirmés ne sont pas déduits des records.

- [x] Préparer hors runtime une couche de prescription et hydratation de commentaires, avec tests locaux (pas un générateur complet).
- [x] Préparer hors runtime une correction candidate du contrat global et des objectifs par semaine, avec tests 33/15 semaines.
- [x] Vérifier les refus de champs prescriptifs et la couverture complète dans les modules hors runtime, plus les prévalidations existantes.
- [x] Appliquer et vérifier le contrat global dans l'aperçu, avec état de fenêtre séparé et objectifs intermédiaires identifiés (parcours fictif ordinateur/téléphone).
- [x] Installer les contrôles de prescription derrière une garde non activée ; vérifier les protections et déployer test puis principale, sans publication ni génération réelle.
- [ ] Activer le remplacement complet de la prescription IA : bloqué par l'absence de contrats explicites par stimulus et d'étapes course couvrant les fiches et les voies trail/LCW ; aucun contournement ni activation globale.
- [x] Préparer le plan de correction avant toute modification des fonctions ou publication.

- [x] Corriger les erreurs de type de `nolio-training-load-daily` signalées par le build.
- [x] Vérifier la fonction concernée et l’état du build (déploiement backend réussi).
- [x] Corriger l'erreur TS2322 (`metricKey: "force"`) dans checkB11TaperOpeners.test.ts.
- [x] Génération complète réussie (profil fictif 10 km → 70.3, 32 sem.) : format Gemini, fiches recalées sur le catalogue, remplacement par fiche équivalente, fiches mobilité/brique, un bloc par requête.
- [x] Corrigé : course B placée sur son vrai jour, fiches dures en semaine de décharge remplacées par une fiche facile du même sport, nouvel essai unique d'un bloc refusé, part des sports mesurée en temps, renforcement exclu de la répartition d'intensité, titres catalogue non ré-étiquetés, cockpit QA sur le plan complet.
- [ ] Qualité sportive restante (plan fictif 70.3, 32 sem.) : trop de séances dures en construction (le gabarit hebdo de l'app prévoit 7 séances clés), vélo sous-dosé et sortie longue vélo absente en base, pas de jour de repos (11 séances + 4 jours doubles), même fiche répétée. Décision coach requise sur le nombre de séances dures par semaine.
- [ ] Publication du site : non autorisée ; le site publié reste verrouillé.

- [x] Onglet « Séances exigeantes » dans la configuration du plan : 7 familles autorisables, désactivées par défaut, prérequis de profil/niveau/heures maintenus, blocages permanents inchangés ; 7 tests passent, fonctions déployées. Plan réel non généré.
