# P0 10 km — cohérence catalogue, phases et layout

Base : `039a872834ee0cce8d3cdc5466e3c90446e7ec6f`. Branche : `fix/10k-catalogue-phase-contracts`.
Aucun appel modèle, accès aux données athlètes, déploiement ou modification Nolio.

## Preuves et limites

Paramètres déclarés de l'incident : 12 semaines à partir du 26/10/2026, A 10 km le 17/01/2027, B jalon le 19/12/2026, niveau manuel light, ambition demandée competitor, heures et charge actuelle inconnues, priorités VLamax/FatMax/VMA/VO₂max/W′. La résolution offline donne age_group ; l'ambition réellement exécutée n'est pas attestée par les compteurs disponibles.

Traces communiquées : 54/54/36/70 fiches admissibles S1–4, deux réponses complètes rejetées (intention 6 puis 7 ; durée 5 puis 1 ; intensité 4 dans la première ; phase S4 dans les deux). Les fiches effectivement rejetées et leurs prescriptions sont inconnues. Les exemples ci-dessous prouvent des défauts du code ; ils n'attribuent pas chacun des refus réels à une fiche déterminée.

## Matrice avant/après

| Incident | Cause démontrée / avant | Correction minimale / après | Preuve déterministe |
|---|---|---|---|
| Fausses alertes de pool | `totalSessions` était parcouru comme un sport, avec zéro candidat correspondant | Seules les six disciplines connues participent à `missingSports`. Les minima par sport et tous les filtres existants restent actifs ; le total reste contrôlé par le validateur de quotas | Un pool suffisant avec quota global passe ; une natation obligatoire absente reste signalée |
| S4 Fondation/Build | Le prompt utilisait la Fondation calculée de quatre semaines ; le contrat serveur recalculait 30 % de 12, donc Build dès S4 | Extraction de l'arithmétique existante du prompt en fonction partagée ; calendrier moteur transmis dans les quotas, utilisé pour le catalogue, le layout, la réconciliation, la normalisation, le diagnostic et la régénération | Prompt et deux fonctions : Fondation S1–4, Build S5–9, spécifique S10–11, affûtage S12 ; adapter conserve les quotas |
| Faux refus d'intention Z2 | `A_RUN_Z2_EASY` était classée technique à cause de mots accessoires ; `SEILER_RUN_Z1_EASY_LONG` test à cause du test de conversation. Un renommage rendait le premier contrat contradictoire | Métadonnée physiologique existante `moderate_lt1` renseignée pour ces deux fiches seulement, justifiée par leur bloc principal. Aucune durée, zone, phase ou variante élargie ; pas de changement global du classifieur | Renommage Z2 inchangé accepté ; véritable intention technique, dépassement de zone et durée hors plage toujours refusés |
| Vélo facultatif imposé | Le midpoint arrondi du quota bike 0–1 donnait une séance ; le pool route ne contenait pas de vélo | Le layout reçoit les sports du pool admissible de la semaine ; une discipline dont le minimum est zéro n'est plus imposée si elle est absente | Quatre CAP et aucun vélo forcé ; minima obligatoires et comportement sans information de couverture préservés |

Les nouveaux tests ciblés ont été exécutés avant correction : quatre échecs frontend et un échec serveur (S4). Après correction, les mêmes assertions passent. Les attentes d'un ancien test affirmant que la fiche désormais relue n'avait pas de métadonnée ont été remplacées par une vraie fiche synthétique non auditée ; le repli historique reste testé.

## Contrats conservés

- Les règles de calcul de Fondation, Chantier/Consolidation, spécifique et affûtage sont extraites, pas remplacées. Les objectifs/volumes du récap détaillé sont conservés lorsqu'ils concordent avec le calendrier moteur. Un ancien plan sans calendrier garde le repli historique.
- La cadence d'assimilation n'est pas changée : quatre semaines par défaut, trois à partir de 40 ans, ou choix explicite existant. Les âges 32/50 de la reproduction sont fictifs ; l'âge réel n'est pas déduit.
- La phase et le type de semaine restent deux axes : S11 peut être spécifique avec une charge d'affûtage. Aucun changement de récupération pour forcer une égalité artificielle.
- Les règles d'intensité, de durée, d'équivalence, les compétitions officielles, les garde-fous de charge et l'ordre des limiteurs restent actifs. Aucune charge mesurée n'est fabriquée à partir de la référence interne de quatre heures.
- Les minima requis ne sont jamais supprimés pour faire disparaître un défaut de catalogue. L'absence d'un sport obligatoire reste une erreur.

## Reproduction offline

```sh
node scripts/quality/replay-10k-catalogue-contracts.mjs /tmp/tenk-replay.json
npx vitest run src/engines/plan/__tests__/tenKCatalogueContracts.test.ts
npx tsc --noEmit -p tsconfig.app.json
deno test --allow-read --allow-env supabase/functions/ai-training-plan supabase/functions/ai-training-plan-test
```

Le replay utilise le vrai constructeur de catalogue et les vrais quotas. Il produit les identifiants, durées, phases, familles et motifs d'exclusion de chaque candidat synthétique, sur les douze semaines, pour les deux cadences. Historique de rotation, interdits et IDs réels manquants ne sont pas inventés. Le pool rejoué n'est donc pas présenté comme le payload historique.

S1–4 : 70/70/70/47 admissibles pour l'âge fictif 32 ; 70/70/47/70 pour 50. Plus aucun faux sport `totalSessions`, aucun vélo forcé. Ces nombres ne remplacent pas les 54/54/36/70 observés lors de l'incident.

## Limites ouvertes — avant nouvelle génération

**Contradiction préexistante démontrée en S12** : avec la matrice 10K age_group et sa référence interne, le minimum CAP reste 4 mais le total de semaine de course est plafonné à 3. Le layout protège le minimum et conserve 4 séances. Le pool synthétique de cette semaine signale aussi un minimum CAP non couvert. Ces problèmes n'expliquent pas l'échec historique limité au bloc 1, mais empêchent de déclarer les douze semaines pleinement cohérentes. Ils ne sont pas corrigés en abaissant arbitrairement les quotas dans cette PR ; décision sportive ciblée nécessaire.

La seule correction d'intention ne garantit pas que toutes les fiches de la bibliothèque ont des métadonnées parfaites. Les véritables refus de durée/intensité observés peuvent encore survenir si le modèle ne respecte pas les contraintes. Aucun plan complet ni qualité générale d'une sortie future de modèle n'est attesté par des tests logiciels.

**Décision** : GO pour revue/fusion des quatre corrections si CI et reproductibilité vertes ; NO-GO pour une nouvelle génération payante de douze semaines tant que le contrat S12 reste contradictoire. Avant une génération contrôlée : arbitrer ce cas, valider le plan de charge initiale inconnu par le coach, autoriser explicitement publication coordonnée et appel payant, attester les trois composants sur la même release, conserver le diagnostic assaini de toute tentative. Aucune de ces actions n'est exécutée ici.

## Vérification logicielle

Résultats définitifs et liens CI consignés dans la PR au HEAD exact. Aucun workflow n'est ajouté ou activé ; reproductibilité exécutée avec le workflow offline existant. Le manifeste de sources est régénéré pour conserver le verrou de compatibilité.
