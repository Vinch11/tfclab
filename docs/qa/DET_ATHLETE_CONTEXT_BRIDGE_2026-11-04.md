# Parcours coach simple — fiche athlète → DET / IA (QA, 2026-11-04)

Base : `78297e07377a2d9448d29d877c76ad7f531cf33a`. QA uniquement ; aucune donnée réelle copiée, aucun appel Nolio, aucune IA payante, aucune session usurpée, aucune écriture de plan/calendrier réel. Release QA recalculée `381c2de9…cabf` (non attestée) ; `ai-training-plan` + `ai-training-plan-test` redéployées.

## Ce qui change
- `src/lib/det/athleteDetBridge.ts` : pont pur. Reprend uniquement les valeurs de la fiche (`getEffectiveRefs` + profil physiologique effectif) avec origine et date ; VMA→m/s = conversion d'unité exacte. La fiche ne dit pas si c'est une mesure : le coach choisit mesure/estimation (+ incertitude), jamais d'upgrade. Valeur absente ⇒ demande nommée. Blessure jamais déduite de l'absence de signalement.
- Limiteurs : ordre du diagnostic de l'app (`rankPrescriptionGaps`), restreint aux limiteurs éligibles DET ; non-guidants affichés ; ordre coach tracé dans la provenance.
- `src/lib/det/familySourcePools.ts` : pool de séances par famille (listes exactes des scénarios CI) avec empreinte figée ; toute modification de la bibliothèque ⇒ refus nommé « nouvelle revue du pool ». `independentScientificReview: false`.
- Vérifications athlète : 6–11 confirmations + 2 listes dédupliquées (prérequis, contre-indications) au lieu d'une grille par séance ; un élément non rempli/présent écarte les séances concernées (jamais l'inverse). Trace append-only dans `det_coach_review_contexts`.
- Horaires : une heure par sport + jours, ou heure différente selon le jour. Fuseau du navigateur proposé, signalé.
- `AthleteDetSimplePanel` dans la page de planification ; l'ancienne grille reste sous « Avancé ». Changement d'athlète/objectif/budget ⇒ annulation des actions en cours et sortie effacée. Aucune bascule DET→IA.

## Résultats testés (`athleteDetBridge.test.ts`, 16/16, enregistrements synthétiques au format du dépôt)
| Cas | Résultat |
|---|---|
| Semi 8 sem./6 h, profil A, horaires variant selon le jour, ordre coach inversé | ACCEPTÉ (solveur + validateurs), ordre coach et provenance fiche tracés |
| Semi 8 sem./6 h, profil B (femme, VLamax 0,45) | ACCEPTÉ |
| Semi 8 sem./6 h, même heure tous les jours | REFUS moteur `det_v3_recovery_safe_slot_unfillable` semaine 7 |
| 70.3 12 sem./9 h depuis la fiche + allures natation saisies | ACCEPTÉ |
| 10 km | non raccordé, message clair, aucun moteur |
| Marathon via le pont | non testé par ce pont (accepté par le chemin coach existant) |

Toujours refusés (inchangé) : semi 30 sem., Ironman 13/14 h. Non connectés : 10 km, 5 km, trail, triathlon court et autres familles du registre synthétique.

Suites : 122 fichiers / 834 tests DET-plan-revue passés (refus inclus), `tsgo` OK, ESLint 0 erreur. Chromium local déconnecté : pages à froid et rechargées, sans erreur. Le parcours connecté n'a PAS été exercé par l'agent (pas de session coach).

## Limites
- Les allures natation par domaine et les plages sprint n'existent pas dans la fiche : le coach les saisit.
- Le pool de séances est une admission d'ingénierie (CI), pas une qualification scientifique ; plan non prescriptif, aucune attestation.

## Prochain test coach (Coach A, QA)
1. Planification IA → athlète QA, objectif Semi-marathon, 8 semaines, 6 h.
2. Choisir DET, indiquer mesure/estimation pour chaque valeur reprise, compléter les manques.
3. Horaires (heure différente selon le jour si besoin), cocher les vérifications, « Générer avec DET Engine ».
4. Enregistrer, rouvrir, revue et export communs.

## Point de contrôle du relecteur

Source QA immuable : `9f58db4fef117ad9d12c250c48f18d80bcf0dcb8`. Rapport et code documentaire relus via connecteur. Les 834 tests sont rapportés par le builder, pas réexécutés indépendamment ici. Aucun parcours authentifié n'est attesté. Le raccordement complet reste en cours : marathon via ce pont, autres distances et trail, semi long et Ironman. Aucune nouvelle autorisation sportive ou de production.
