# Roadmap

- [x] TTE vélo/course réintégrés séparément ; VMA sans cible affichée en valeur, sans zéro ni déficit inventé. Diagnostic course autonome : écarts aux cibles internes, pistes de travail, seuil enregistré, économie/découplage et limites ; VO₂max commune exclue du classement triathlon course, TTE global/FTP exclus. 63 tests verts ; Emanuela (TTE course 40/52 min, VMA 14,2 sans cible) et Vince vérifiés connectés sur ordinateur/téléphone sans erreur ; compilation OK, générateurs redéployés. Priorités et contrats des plans inchangés, aucun bilan modifié. Rapports reliés à la même projection et testés ; nouveaux exports PDF réels non parcourus.

- [x] Triathlon : deux compass vélo/course côte à côte dans la même section, mesures propres à chaque sport et classements des plans inchangés. 47 tests verts ; Emanuela triathlon et Vince course vérifiés sur ordinateur/téléphone, données course absentes et cible VMA triathlon non définie signalées sans inventer de valeur.

- [x] Références externes retirées du compass et des rapports à la demande du coach ; cibles, calculs, repères personnels et explications pédagogiques conservés. 44 tests verts, compass et rapports Staff Vince/Emanuela vérifiés sans erreur ; compilation OK et deux générateurs redéployés avec succès.

- [x] Rapport Staff : section factuelle au sommaire avec valeurs du bilan de référence, résultats bruts des tests, efforts critiques par sport, notes de provenance et capteurs/conditions documentés ; aucune certification implicite ni changement des limiteurs. 44 tests verts ; exports Staff Vince/Emanuela et PDF non vides vérifiés, 16 entrées chacun, aucune erreur ; capteurs absents signalés non renseignés. Compilation OK, version synchronisée et deux générateurs redéployés avec succès.

- [x] PDF Staff, Profil Athlète, Performance, Athlète et Découverte alignés sur la projection du compass via `reportPresentation` : valeurs/cibles/sources communes, références course/vélo et TTE séparés, FatMax vélo non convertie en course, durabilité non certifiée, CP/W′ complémentaire sans recalcul indépendant. 93 tests ciblés verts ; dix exports réels Vince/Emanuela ouverts via `/print-preview`, mode impression et PDF non vides vérifiés sans erreur ; compilation OK et deux générateurs redéployés. Aucun bilan ou plan modifié ; classements et commentaires historiques du moteur conservés et modèles complémentaires hors compass non audités scientifiquement.

- [x] Sexe modifiable dans Profil & Références et sauvegarde du profil reliée au Cloud ; omission du sexe dans le mapping du dashboard corrigée. Vince « Homme » sauvegardé et relu après rechargement. W′/TTE/durabilité/FatMax séparés des jauges comparatives Analyse, TTE course non dupliqué en vélo, FatMax vélo non convertie en seuil course, définitions et catégories historiques clarifiées. 39 tests ciblés verts, aperçu connecté sans erreur ni débordement mobile, compilation OK et deux générateurs redéployés. Classements et contrats des plans inchangés ; aucun test physiologique nouveau certifié ni audit exhaustif des autres écrans/exports.

- [x] Séparer les repères course/vélo du compass et des rapports : W′/D′ complémentaires hors radar, références critiques par sport, TTE triathlon séparés, absence course non comblée par watts vélo, seuil course sans conversion FTP ; contrats diagnostic/IA/DET inchangés. 95 tests ciblés + 6 contrôles de version verts ; Vince/Emanuela connectés, ordinateur/téléphone et bilan pré-objectif en mode impression vérifiés sans erreur ; générateurs redéployés avec succès. Aucun bilan/plan modifié ni publication ; rapport Staff complet non parcouru intégralement.

- [x] Import Nolio des records course/vélo par période : puissances séparées, aperçu CP/W′ course et vélo, sélection coach, capteur documenté, ajout au bilan comme estimation sans remplacer les repères existants ni changer les limiteurs ; 54 tests ciblés et 6 contrôles de version verts, aperçu connecté ordinateur/téléphone vérifié avec 128 records réels d'Emanuela, sans sauvegarde. Générateurs redéployés avec succès.
- [ ] Vérifier l’import des records de Vince et la sauvegarde/relecture de son bilan : Vince absent de la liste Nolio accessible au compte connecté ; aucun autre athlète importé dans son bilan.

- [x] Préparer le plan de revue du compass : présentation et provenance d'abord, hiérarchie prescriptive conservée ; toute évolution scientifique du diagnostic soumise à une validation séparée.
- [x] Revue de présentation du compass : projection en lecture seule, TTE/robustesse séparés, provenance et W′ manquant clarifiés, ordre coach affiché distinctement ; propositions non activées dans docs/compass-review-2026-11-12.md.

- [x] Envoyer la périodisation et les chantiers en cycles Nolio v2 : aperçu daté, confirmation athlète, collisions préservées et lecture après création ; quatre cycles du dernier plan Vince réellement créés et relus dans Nolio, reconnus ensuite sans doublon sur téléphone ; 11 tests verts, fonction déployée avec succès. Aucune séance envoyée ou modifiée, aucune génération IA ni publication.

- [x] Corriger l’ordre coach dans génération/rapport/sauvegarde : VO₂max et VMA distincts, stimulus partagé explicite, ordre récent prioritaire sur la politique restaurée ; écarts de durée catalogue en avertissement. 165 tests ciblés verts ; plan réel de Vince chargé, changement d’ordre visible dans le rapport et « Sauvegarder quand même » vérifiés en session connectée, sans confirmer l’écriture. Deux fonctions du générateur déployées avec succès ; aucune génération IA ni publication.

- [x] Objectif athlète courant : le 10 km de Vince prime sur l’ancien Long Course Weekend dans les caches de préparation et les zones courantes ; brouillon incompatible conservé avec reprise explicite, historique inchangé, propagation du changement au contexte partagé ; 18 tests et scénario navigateur vérifiés, fonctions déployées. Aucun plan généré ni donnée athlète modifiée.
- [x] Repères critiques : calculs course/vélo avec provenance, étude temporaire accessible depuis bilan/profil et sélection Nolio, export et sollicitation d’un effort continu ; 76 tests ciblés verts, parcours connecté avec efforts fictifs vérifié sur ordinateur/mobile, accord annulé après modification, aucune sauvegarde ni publication.
- [ ] Vérifier les repères critiques sur des tests Nolio réels identifiés par le coach : aucune séance réelle n’a été déclarée arbitrairement comme test confirmé.
- [ ] Enregistrement structuré et utilisation dans les plans : migration et écritures athlète non autorisées ; activation des variantes après validation sportive distincte.

- [x] Fiabiliser la configuration : renforcement explicite 0/3, doubles 0/1 et maintien sélectionné dans les contrats déterministes ; tests comportementaux verts.
- [x] Stabiliser dates, objectifs, trail et choix coach dans les configurations simple/groupée/régénération ; priorités B/C non promues en pics complets, contrôle d'objectif absent conservé.
- [x] Harmoniser ambition, décharge, terrain et autorisations serveur ; 1496 tests frontend, 378 tests fonction principale et 367 tests miroir verts ; aperçu connecté : renforcement 0 puis 3 avec doubles 0, changement du précontrôle vérifié. Fonctions déployées avec succès, déclaration fraîche ; aucune génération IA ni donnée athlète enregistrée. Détail et limites : docs/corrections-impact-configuration-plan-2026-11-10.md.
- [ ] Vérifier un plan complet réellement généré : autorisation distincte requise pour les appels payants ; aucune donnée athlète écrite ni publication.

- [x] Auditer l’impact de tous les domaines de configuration : rapport `docs/audit-impact-configuration-plan-2026-11-10.md`, 245 tests frontend et 64 tests générateur réussis, sept profils prévalidés sans IA ; contradictions renforcement/doubles/maintien reproduites. Aucun générateur modifié, aucune génération réelle ni publication.

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

## Séances précises (plan 2026-11-11)
- [x] Étape 1 — tranches de durée → durée unique (génération complète)
- [x] Étape 1b — tranches converties à l’ouverture des plans enregistrés
- [ ] Étape 2 — structure Nolio depuis le texte réel du plan (fait) ; reste : envoi réel d’une semaine sur Vince par le coach
- [x] Étape 3 — quotas d’allure de course (avertissements) actifs
- [x] Étape 4 — fiche d'un autre objectif retirée des séances clés + avertissement
