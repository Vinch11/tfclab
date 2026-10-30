# Validation sportive et technique

**DRAFT — NO-GO. Zéro dose individuelle ou plan sportivement approuvé.** Les mêmes validateurs historiques sont exécutés sans modification ; leurs résultats complets sont conservés.

| Vérification réellement exécutée | Résultat |
|---|---|
| Tests V22 | 27 passent, même ensemble au build et au rejeu |
| Non-régression | 175 passent, 5 tests conditionnels d’archivage antérieur non activés ; 12 fichiers |
| TypeScript | tsc --noEmit -p experimental/det-engine/tsconfig.json : code0 |
| Contrôle indépendant stdlib | 90 réservations,84 jours,30 doses par profil ; fréquences, disponibilité, restes, sources et arithmétique |
| Vues numériques de domaines | 42 vérifiées indépendamment, aucune dose optimale ou temps métabolique observé déduit |
| Reproductibilité | 4 fichiers logiques identiques, trois résultats et entrées complètes ; empreintes du code exécuté stables |
| Conservation | 4 514 anciens fichiers identiques ; seules3 extensions expérimentales opt-in ; archives V2–V21C intactes |
| Références conservées | 920 IDs,2425 variantes,600 configurations,96 chronologies/51 IDs,418 vues,15 fixtures Nolio |

## Les quatre erreurs historiques restantes par profil

- `race_day` : contrôle de préparation complète cherchant la course en dernière semaine du plan4 ; la course réelle déclarée reste en semaine16, hors du bloc.
- `calendar_coverage` : le contrat complet attend16 semaines, le bloc en fournit4.
- `triathlon_discipline_continuity` et `triathlon_training_frequency` : l’audit complet inclut les semaines5–16 absentes. Le contrôle indépendant du préfixe1–4 confirme les fréquences exactes natives pour chaque sport et semaine.

Ces erreurs de portée restent des erreurs dans la lecture brute : elles ne sont ni désactivées, ni reclassifiées dans le validateur, ni comptées comme un succès historique. La couverture codée en dur « all16weeks » dans le validateur V14 est également conservée dans l’objet brut, avec une annotation de portée réelle4/28 dans le résultat V22. Aucun départ de course fictif ajouté en S4.

## Avertissements restant visibles

| Profil | Par code |
|---|---|

| A_aerobic | {'layout_drift': 19, 'limiter_coherence': 1, 'calendar_incoherence': 1, 'anti_repetition': 11, 'key_session_self_declaration_mismatch': 3, 'catalogue_prescription_unverified': 1} |
| B_sustainability | {'layout_drift': 19, 'calendar_incoherence': 1, 'anti_repetition': 11, 'key_session_self_declaration_mismatch': 3, 'catalogue_prescription_unverified': 1} |
| C_uncertain | {'layout_drift': 19, 'calendar_incoherence': 1, 'anti_repetition': 12, 'key_session_self_declaration_mismatch': 4, 'catalogue_prescription_unverified': 1} |

Les19 layout_drift par profil sont conservés : l’indépendant prouve disponibilité, fréquence et espacement, pas l’équivalence physiologique de chaque modèle de disposition. Les répétitions restent visibles et la diversité n’est pas artificiellement créée. Les réservations utilisent des sources complètes conservées, mais pas nécessairement des recettes exécutables au créneau choisi ; le contrat canonique laisse ces cas conditionnels.

A garde7 refus d’ancre course critique. C garde26 refus de références, plus4 supports conditionnels. B a30 réservations conditionnelles. Chaque profil conserve les inconnues de nage, force, posture, récupération, variantes et interactions. Les dix témoins canoniques A/B et onze C à la dose réservée attestent seulement une assignation technique de durée, pas une preuve individuelle.

## Feedback et non-acquisition des adaptations

Neuf scénarios synthétiques au total : inconnu, adverse, récupération documentée pour le vélo long S2. Un compte rendu favorable dans l’enveloppe déjà déclarée fait passer5 conditions à3, sans donner de capacité nouvelle. Les trois restantes portent sur ventilation native/canonique et variante. Inconnu reste en attente ; douleur/récupération incomplète interdit. Les calendriers avant/après feedback sont identiques ; le bloc entier ne reçoit aucune autorisation.

Les données de réaction réellement observées sont nulles. Les seuils natifs de progression/volume restent des conventions TFCL, pas une preuve universelle de sécurité. Les7 premières réservations course A ne sont pas débloquées en changeant une valeur ou un seuil. Les erreurs des plans Ironman V20/V21C restent intégralement conservées par empreinte.

## Limites de couverture

Les 600 cas historiques ne sont pas reconstruits. La non-régression couvre les fonctions existantes de diagnostic, zones, objectifs, dimensionnement, allocation, blocs, feedback et conditions prospectives ; elle n’atteste pas des plans complets pour toutes les disciplines. La partie nouvelle de construction concerne uniquement ces3 profils IM et leur bloc de base4 semaines. Pas de nouvelle recherche bibliographique ni d’appel Gemini/Nolio. Le sender, les920 fiches et les validateurs de production restent inchangés.
