# TFCLab — migration complète de bibliothèque V1 → V2 (proposition contrôlée)

**Statut : DRAFT / NO-GO.** Aucun remplacement V1 ni activation de génération.
Les 20 modèles V2 existants restent un pilote, pas une couverture complète.

## Décision d'architecture
- Conserver l'intégralité de la bibliothèque V1 en lecture seule pendant la migration.
- Construire des **familles V2 paramétrables** plutôt que reproduire une fiche V2 pour chaque V1.
- Toute fiche V1 doit recevoir une disposition explicite : `mapped_reviewed`, `needs_metadata`, `specialized_keep_v1`, `duplicate`, ou `unsafe_or_obsolete`. Aucune migration silencieuse.
- Un mappage doit conserver : ID source, sport, objectif, phase, durée minimale/maximale, structure/chronologie, intensité, récupérations, prérequis, limites et justification scientifique. Aucun changement de stimulus basé sur le titre, la catégorie A/B/C/D ou le statut de créneau clé.

## Ordre de livraison (périmètre fermé)
**M0 — inventaire** : `auditV2Migration()` compte toutes les fiches V1, les duplications, sports, intention documentée ou manquante, et le pilote V2. La CI doit publier ces chiffres. Pas de seuil inventé.

**M1 — métadonnées et provenance** : attribuer une intention vérifiée aux fiches prioritaires sans extrapoler depuis la catégorie ou le nom. Les fiches non documentées restent exclues des prescriptions exigeant un stimulus précis.

**M2 — familles V2 prioritaires** : endurance, récupération, seuil/MLSS (sans équivalence FTP/MLSS présumée), VO2, technique, neuromusculaire, force, brick, compétition, natation chronométrée, trail/dénivelé, débutants et taper. Validation de durée exacte et des étapes; ancrages individuels vérifiés ou refus.

**M3 — intégration contrôlée au moteur** : un contrat de créneau explicite indique stimulus requis, sport, dose, contraintes et preuve. Générer d'abord les candidats compatibles, puis optimiser ensemble durée, charge et calendrier; ne pas réparer après coup un mauvais choix.

**M4 — preuves de sortie** : rejouer les 3 profils 70.3 sur 12 semaines, vérifier tous les contrôles natifs et l'absence de régression, puis étendre à 5k/10k/semi/marathon, sprint/olympique/IM, trail, débutants. Le succès ne se mesure pas au vert CI seul, mais aux plans admis et contrôlables.

## Conditions GO / NO-GO
- GO pour étendre *une famille expérimentale* : provenance et intentions documentées, entraînement paramétrique testé, exactitude temporelle, sécurité des prérequis, aucune régression sur cas gelés.
- GO moteur coach-only : plan complet 12 semaines acceptable sur profils tests, dose individuelle soumise au coach, sauvegarde/édition/réouverture restaurées vérifiées sur projet isolé, et intégrations export sous autorisation explicite.
- Sinon **NO-GO** clair avec motif actionnable. Aucun effacement/assouplissement des erreurs pour rendre les tests verts.

**Non-objectifs immédiats :** nouveau moteur physiologique, nouveau questionnaire de charge, import Nolio, migration Supabase production, refonte UI, remplacement global d'un coup.
