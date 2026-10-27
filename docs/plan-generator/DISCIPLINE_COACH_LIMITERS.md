# Limiteurs par discipline et Profil coach — corrections post-#421

Référence : main `4ae69e47b99224cc4a06c8a1c1a7deec72119220`. Tests uniquement synthétiques/offline ; aucune génération ni écriture de données athlètes.

## Causes démontrées et corrections

| Incident | Première cause démontrée | Correction | Preuve reproductible |
|---|---|---|---|
| W′ cycliste prioritaire en CAP | Le bridge lit les puissances cyclistes ; le classement unifié ne distinguait pas leur applicabilité | Le gap W′ conserve valeur, cible, statut, impact et qualité ; provenance `bike`, applicabilité CAP fausse. Classement, stratégie, readiness et consommateurs de prescription respectent ce statut | `disciplineCoachLimiters.test.ts` : échec avant correction ; valeurs historiques inchangées, priorités CAP indépendantes du W′ cycliste |
| VMA absente → retour à FTP | Le mode running dépendait de la présence d’une VMA | L’objectif détermine le sport ; VMA absente reste inconnue | Même suite : reproduction rouge avant correction, pas de substitution FTP |
| Consignes CP/W′ encore injectées en CAP | Le prompt initial et les rappels des chunks prescrivaient les repos W′bal sans vérifier le sport | Applicabilité commune, liée au cycle `catalogObjective` puis à l’objectif. Consignes CP/W′ absentes en CAP ; conservées en triathlon. Une note explique leur provenance cycliste | `promptHelpers.disciplineCP.test.ts`, dans les deux fonctions : deux tests rouges avant correction ; initial, cycle intermédiaire, chunks/retries et calcul brut inchangé |
| Liste automatique tronquée par le formulaire | L’adaptateur remplaçait la liste par les seuls champs principal/secondaire | Adaptateur pur partagé : liste complète par défaut ; promotions/réordonnancement conservent les autres ; seules les exclusions explicites retirent une priorité | Test rouge initial : cinq métriques deviennent une ; test vert après correction ; UI teste valeurs brutes VMA, réordonnancement et exclusions |
| Choix coach perdus/incohérents entre parcours | Les validations et certaines reconstructions reprenaient le diagnostic automatique | Même configuration effective pour prévalidation, génération, régénération, affichage et validation avant sauvegarde ; sélection explicite utilisée pour les clés de validation | Tests adaptateur → prévalidation et validation finale ; réouverture du formulaire ; politique locale validée distincte du brouillon |

Les reproductions démontrent les chemins du code. Elles ne constituent pas une attestation des paramètres ou du classement exact de la recette réelle, dont aucun payload n’a été fourni.

## Applicabilité physiologique

- **CAP/trail** : VMA et métriques spécifiques CAP restent prioritaires selon les règles existantes. Une mesure manquante ne devient pas une mesure cycliste.
- **Cyclisme** : CP, FTP et W′ ici proviennent des puissances cyclistes. W′ reste dans le bilan ; son calcul, ses cibles et les exclusions de mauvaise qualité ne changent pas.
- **Triathlon/LCW** : le W′ cycliste reste admissible pour le volet vélo. Les consignes CP/W′ sont conservées dans les prompts de ces objectifs. Cette correction ne prétend pas qu’une mesure vélo quantifie une capacité CAP.
- **Indicateurs transversaux** : les règles TFCL existantes de capacité aérobie, métabolisme, disponibilité et récupération sont conservées, avec leurs incertitudes/provenances. Aucun nouveau transfert scientifique entre modalités n’est introduit.

## Choix explicites du coach

Le formulaire montre la liste applicable complète. Les flèches réordonnent, les cases décochées excluent explicitement. Les anciens champs principal/secondaire deviennent des promotions optionnelles ; « Je ne sais pas » n’efface pas le diagnostic. Tout exclure empêche l’envoi.

Les anciens brouillons à un seul choix ne sont pas interprétés comme une exclusion des autres métriques. Le brouillon reste local ; une politique explicitement enregistrée/générée est distincte, indexée par ID d’athlète et objectif. Elle conserve aussi les interdictions explicites existantes. Ouvrir un brouillon ne l’active pas. Les erreurs d’enregistrement explicite sont visibles.

**Limite de persistance :** ce mécanisme est local au navigateur ; pas de synchronisation multiappareil ni de migration. Aucune ancienne version de plan n’est réécrite. La compatibilité avec des champs d’applicabilité historiquement absents est conservée ; les nouveaux diagnostics les recalculent.

## Validation

Commandes depuis le checkout de la PR :

```sh
node node_modules/vitest/vitest.mjs run src/lib/plan/__tests__/disciplineCoachLimiters.test.ts src/lib/plan/__tests__/coachLimiterPolicyStorage.test.ts src/components/__tests__/CoachProfileForm.limiterSelection.test.tsx
TFCL_PREVALIDATION_MATRIX=/tmp/limiter-matrix node node_modules/vitest/vitest.mjs run src/qa/sports-plan-lab/__tests__/prevalidationMatrix.test.ts
deno test --config /tmp/p418-deno.json --allow-read --allow-env supabase/functions/ai-training-plan/
deno test --config /tmp/p418-deno.json --allow-read --allow-env supabase/functions/ai-training-plan-test/
```

La configuration Deno offline utilisée : `{"nodeModulesDir":"none","lock":false}` ; dépendances déjà en cache. Les tests serveur simulent les appels réseau ; aucun Gemini exécuté.

- Suite frontend complète locale : **389 fichiers, 3055 tests réussis**, 1 ignoré et 6 TODO. Contrôles finaux sur le HEAD de PR : voir CI liée au commit.
- Tests ciblés client : **29 réussis** ; serveur : **358 + 354 réussis** dans les deux fonctions.
- Matrice existante : **600 configurations**, **77 admissibles / 465 revue coach / 58 bloquées**, mêmes statuts cas par cas que la référence #421. Les refus légitimes, les avertissements de charge inconnue et les contrats historiques de diversité sont conservés.
- Couverture matrice : 5K, 10K, semi, marathon, StartToRun, trail/short/mountain/ultra, Sprint/Olympic, 70.3 et Ironman, y compris formats LCW. Quatre niveaux, ambitions existantes et charge connue/inconnue.
- La matrice historique ne fournit pas de W′ mesuré ; les nouveaux tests utilisent donc aussi le vrai calcul CP offline depuis les mêmes champs de puissance que le bridge de la page, jusqu’à la prévalidation pour running, trail et triathlon.

Aucune modification de quotas, catalogue, cibles, coefficients, taxonomie, données physiologiques stockées ou garde-fous sportifs. Aucun workflow ajouté/modifié. Deux logs de payload coach existants sont retirés pour ne pas journaliser les nouvelles sélections.

## Verdict et recette restante

**GO technique pour revue de cette correction**, sous réserve des checks du HEAD. **Pas de GO scientifique global ni de publication automatique.** Les tests ne prouvent ni la qualité d’un plan Gemini complet ni la validité universelle des cibles physiologiques.

Avant une génération réelle autorisée : vérifier dans le même navigateur la liste complète CAP, le W′ cycliste secondaire dans le bilan, une exclusion/réorganisation volontaire, fermeture/réouverture, prévalidation et diagnostic transmis. Refaire le contrôle triathlon : W′ pertinent conservé. Une nouvelle génération payante, une fusion ou une publication nécessitent une autorisation distincte.
