# A1 — préparation de la première revue scientifique OpenAI

**Adaptateur implémenté, désactivé ; aucune requête OpenAI exécutée.** Les
tests emploient uniquement des transports mockés. Aucun moteur, test
physiologique, taxonomie, donnée athlète, Nolio ou déploiement modifié.

## Références et contrôles de #407

Base A1 : #407, `2515fa8f6ae81d4c19c183ef467509cc36b8e945`. PR A1 empilée
sur cette branche ; #406 reste brouillon/non fusionnée à
`64a5d1c3bf48b56bf7e895de92f677ca0dac3641`.

[Run40223180338](https://github.com/Vinch11/tfclab/actions/runs/40223180338) :
Vitest/TypeScript, Deno, ESLint et Playwright verts après une relance du seul
job Playwright. L'essai initial échouait sur le PDF court,
`e2e/print-plan-export.spec.ts:102`, comme en P4. Le succès de la relance ne
résout pas cette instabilité ; aucun test PDF n'a été modifié.

Le workflow ne déclare que **quatre** jobs. Le cinquième check demandé n'est
pas identifié ; clarification demandée au responsable. Sa présence/réussite
n'est pas attestée et ce point de validation reste ouvert. Aucune fusion.

## Client API et limites

`scripts/quality/a1/adapter.mjs`, hors application et fonctions Edge :

1. Réserve le pire coût autorisé dans un registre privé avant tout réseau.
2. Compte le payload complet par `POST /v1/responses/input_tokens`.
3. Si le compte respecte la borne : `POST /v1/responses`, JSON Schema strict,
   `store:false`, sans outils, conversation précédente ou redirection autorisée.
4. Valide le JSON avec Zod, les citations exactes, l'identité du dossier et
   la couverture des critères ; compare ensuite aux références expertes locales.

Politique **A1 seulement**, `a1-policy.json` : désactivée, non autorisée,
**0USD par défaut, 3 évaluations/itérations, 30minutes**, 16k tokens d'entrée,
4k de sortie, 60s maximum par requête. Au plus deux requêtes par évaluation
(comptage puis réponse), donc six HTTP par mission ; aucun retry automatique.
La clé seule ne suffit pas : activation, autorisation enregistrée, budget
positif, tarifs et modèle sont aussi nécessaires. Même le comptage est bloqué
sans ces conditions.

Verrou exclusif, écriture atomique avant réseau, plafonds et origine temporelle
persistés : reprise d'un même identifiant sans remise à zéro. Configuration
modifiée = arrêt. Erreur/timeout conserve toute la réservation et arrête la
mission. Modèle différent, usage manquant, refus, sortie tronquée, tool call,
JSON incorrect, citation inventée ou désaccord expert = arrêt sans contournement.
Les raisonnements internes et corps d'erreur fournisseur ne sont jamais exposés
ou persistés. Le journal conserve seulement codes, hashes, compteurs et coûts.

Le budget global préparé de5EUR/5itérations de #407 n'est pas activé ni converti
implicitement. La consigne A1 plus récente impose0USD/3itérations pour A1.
Un futur budget positif devra être explicitement autorisé avec ses tarifs et
sa compatibilité avec les autres plafonds. Aucun taux de change inventé.

Les champs d'admission `authorized/authorizationId` ne sont **pas une signature
cryptographique humaine**. L'opérateur est responsable de leur provenance. Cet
outil local n'est pas un service multi-tenant ni une protection contre son
propriétaire supprimant lui-même le registre. Une boucle autonome nécessiterait
encore un contrôleur authentifié, une isolation et une provenance vérifiée.

## Cas disponibles et attentes expertes

Registre fermé : pas d'objet athlète, fichier arbitraire, URL ou prompt libre.
Les cinq sources sont épinglées par hash dans `a1-approved-sources.json` ;
un contenu changé au même chemin est refusé jusqu'à revue de cette liste.
Nom, âge, sexe, poids, dates et objets bruts ne sont pas transmis. Les nombres
physiologiques sont ceux du profil **synthétique**, pas des données personnelles.
Les textes libres proviennent exclusivement de cette fixture approuvée.

| ID | Source existante et portée | Attente experte |
|---|---|---|
| ref-01 | Génération B-5K enregistrée du15/10, 12semaines/45séances actives ; niveau débutant, VMA/VO2/seuil estimé, objectif5km, contraintes structurées | Classement historique, confiance globale, leviers et catalogue du run absents : causalité individuelle/équivalence exhaustive incertaines |
| ref-02 | S1 PDF : brique aérobie/base liée à race-pace Build/Peak | Incompatibilité ; citer prescription ET fiche |
| ref-03 | S4 : Sweet Spot Fondation avec fiche Build | Phase incompatible |
| ref-04 | S6 : brique Z1–Z2 avec fiche intense | Incompatibilité de prescription/fiche |
| ref-05 | S10 : CAP95min avec fiche100–150min | Écart de durée, sans fabriquer une nouvelle durée |
| ref-06 | Variante numérique explicitement sélectionnée, 60min Z2 dans40–70min en Build | Contrôle négatif : pas de faux défaut catalogue/critique factuelle inventée |
| ref-07 | Legacy sans durée enregistrée | Durée non évaluable ; ni durée ni incompatibilité inventées |

Ref-02 à07 sont des extraits des tests existants, **pas six générations**.
Les quatre fiches sont exportées du catalogue effectif ; le test les compare
champ par champ au `WorkoutLibrary` courant. La variante de contrôle reste
une preuve séparée ; aucune métadonnée bibliothèque n'est modifiée.

**Aucune fixture retrouvée ne réunit une sortie réellement enregistrée et tout
son diagnostic historique classé/fiabilisé.** Les tests causaux synthétiques
ne sont pas ce contexte historique. Les rattacher après coup au plan enregistré
fabriquerait une provenance. Une revue partielle est préparée, pas une
qualification complète de l'individualisation.

## Qualité et limites de l'évaluateur

Critères identiques au contrat scientifique existant ; statuts `met`, `violated`,
`uncertain`. Chaque justification cite ID et sous-chaîne exacte de la preuve.
Observations séparées en `fact`, `hypothesis`, `not_evaluable` : statuts de
preuve, pas nouvelle taxonomie de limiteurs. Un résultat favorable n'autorise
ni fusion ni publication.

Les réponses attendues ne sont jamais envoyées au modèle. La comparaison
locale détecte conflit connu manqué, variante correcte déclarée incompatible,
preuve manquante transformée en certitude et comparaison sans ses deux sources.
Les tests mutent des avis fabriqués pour vérifier ces portes : **ils ne
mesurent pas la précision d'un modèle réel**. Une citation exacte atteste son
existence, pas l'implication scientifique de la conclusion. L'accord aux
références limitées ne vaut pas validation clinique générale.

Validation locale : 55tests ciblés sur trois fichiers (adaptateur A1, contrat
catalogue, traçabilité physiologique existante), TypeScript complet et ESLint
du nouveau test. Aucun appel réseau réel dans ces tests ; les erreurs de
transport, refus, reprise de registre et désaccords sont injectés par mocks.

## Préparation offline reproductible

```sh
npx vitest run --maxWorkers=2 src/test/__audit__/a1Evaluator.test.ts
node scripts/quality/a1/cli.mjs list
node scripts/quality/a1/cli.mjs prepare ref-01 /tmp/tfcl-a1-ref01.json
node scripts/quality/a1/cli.mjs prepare ref-05 /tmp/tfcl-a1-ref05.json
```

Fichiers de sortie nouveaux uniquement, sans écrasement. `prepare` ne contacte
rien et affiche seulement hashes et compteurs. Dossiers : sources, empreintes,
preuves précisément localisées et hash global. Tout changement les invalide.
Le résultat réel et le registre lient aussi un `requestHash` au prompt, schéma,
modèle et payload exacts, sans inclure la clé API ; le CLI joint le SHA du checkout.
Sur un checkout propre, `node scripts/quality/a1/cli.mjs evaluate ref-06`
doit s'arrêter avec `api_disabled` et code2, sans clé ni réseau requis.
Le CLI refuse un worktree sale avant toute évaluation.

## Coût et intervention humaine avant le premier appel

Modèle et tarifs non configurés. Exemple aux tarifs Standard courts déjà
documentés dans #407 : 10USD/M entrée et50USD/M sortie donnent une réservation
16k/4k de **0,36USD** par évaluation, **1,08USD** pour trois. À2/10USD/M :
0,072 puis0,216USD. Ce sont des exemples, pas un devis ou une conversion EUR.
Tarifs, version réellement accessible, surcharges et budget sont à confirmer.

Ref-01 représente49323octets avant enveloppe/schéma ; son compte réel
dépend du modèle et reste non exécuté. Au-delà de16k tokens : arrêt avant
génération, sans tronquer silencieusement le plan. Les4k de sortie incluent
le raisonnement facturé : une réponse incomplète reste un échec sans retry.

Avant une exécution future, le responsable doit :

1. Identifier le cinquième check et arbitrer le risque PDF ; aucune fusion implicite.
2. Choisir les cas et accepter leur portée ; pour la causalité complète,
   fournir un export synthétique/anonymisé déjà existant avec diagnostic,
   rangs, confiances et contraintes **au moment de la génération**.
3. Autoriser explicitement modèle/version, tarifs, budget et mission bornée.
   Utiliser seulement une identité OpenAI déjà gérée. Aucun secret créé ou
   demandé ici, aucune clé à coller dans le chat.
4. Fournir hors dépôt configuration et registre privé stable ; jamais de
   secret en argument, fichier versionné ou journal.
5. Examiner le premier vrai avis avant toute suite. Un désaccord expert n'est
   pas automatiquement un nouveau bug moteur.

Sources officielles : [Responses structurées](https://developers.openai.com/api/docs/guides/structured-outputs),
[comptage](https://developers.openai.com/api/docs/guides/token-counting),
[rétention](https://developers.openai.com/api/docs/guides/your-data).
`store:false` n'est pas une attestation ZDR ; aucune donnée personnelle ne doit
être envoyée plutôt que de supposer sa suppression par le fournisseur.

## Verdict

GO pour préparation et tests offline. **NO-GO pour déclencher l'appel payant** :
autorisation, clé/modèle/tarifs/budget non réunis ; précision réelle du modèle
non mesurée, causalité individuelle complète non évaluable sur ce corpus.
La mission s'arrête après livraison, sans changement du moteur, déploiement,
fusion, Nolio, migration, écriture athlète ou nouvel appel Gemini.
