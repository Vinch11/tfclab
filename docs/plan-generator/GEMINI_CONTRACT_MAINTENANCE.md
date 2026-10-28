# Maintenance ciblée des contrats Gemini — post-#422

Référence : `2be587a76c3545f5cb62863afe5844c0db88a507`. Corrections communes aux deux Edge Functions ; aucune modification de périodisation, quotas, dose, coefficients physiologiques, limiteurs ou catalogue. Aucun changement DET-ENGINE.

## Avant / après

| Défaut démontré avant correction | Correction minimale | Preuve déterministe |
|---|---|---|
| Prompt et Zod acceptent `variantKey`, absent du schéma fournisseur | Même inventaire de variantes **numériques exécutables**, filtré par semaine, fiche admissible et objectif, pour le prompt et le schéma. Clé optionnelle seulement sur une référence catalogue ; Zod vérifie toujours son association à la fiche/semaine et la dose réelle | Capture du vrai body construit avec fetch mocké : enum `10K` présente, variante Marathon/prose exclue ; 30 min admises avec variante 25–35, hors plage refusé ; clé conservée après normalisation, merge, adaptation et sauvegarde/rechargement synthétique |
| Une clé explicite non exécutable donne seulement « non vérifié » | Une variante explicitement invalide est refusée (`catalogue_variant_unavailable`), sans élargissement ni réinterprétation en séance standard. Le contexte historique sans contrat conserve son repli de forme ; la génération actuelle fournit les contrats hebdomadaires | Variante prose, mauvais objectif, mauvaise durée et variante sur événement custom refusés |
| Le corps HTTP400 pouvait être repris dans le log de repli, puis sa raison disparaissait du diagnostic assaini | Vocabulaire fermé : HTTP400, code fournisseur reconnu, chemin de paramètre validé, mots-clés techniques reconnus. Aucun message libre ni valeur copiée ; preuve conservée après assainissement serveur, client et export | Canary personnel/médical absent des logs et exports ; code `INVALID_ARGUMENT`, paramètre `response_format.json_schema.schema` et keyword `additionalProperties` conservés. Champs inconnus restent inconnus |
| Faux conflit d’intention après renommage, protocole source inchangé | Avant acceptation, restauration du **seul titre source** si ID connu, référence non custom, protocole strictement identique après espaces, mêmes zones, aucune variante, aucun autre refus/élément non vérifié ; revalidation après restauration. Jamais de changement d’ID, dose, sport ou protocole | Cas rouge « Endurance + éducatifs » avec protocole source Z2 identique devient vert ; réparation tracée `catalogue_title_restored_exact_protocol`. Vrais changements d’intention/intensité/durée et IDs inconnus toujours refusés |

Les quatre contrats ci-dessus ont été reproduits par des tests rouges avant les corrections fonctionnelles. Une attente initiale de test concernant HTTP403 a été rectifiée : le mécanisme historique réessaie les erreurs gateway trois fois ; il ne bascule pas en JSON-object. Ce comportement n’est pas modifié et n’est pas présenté comme un défaut corrigé.

## HTTP400 : garanties et limites

Le parcours reste explicite : essai `json_schema`, repli `json_object` sur HTTP400, puis validation Zod. Le second essai sportif utilise encore ce même parcours ; aucune optimisation de négociation non démontrée n’est introduite. Les HTTP non-400 ne passent pas dans le repli JSON-object ; les retries transitoires historiques restent inchangés.

Les logs ne reprennent plus les 300 premiers caractères du corps fournisseur. Les diagnostics ne permettent d’identifier un paramètre exact que si le fournisseur le fournit dans un champ reconnu ; sinon seuls les mots-clés autorisés sont conservés. Aucun champ absent n’est inventé. Le type de format effectivement utilisé et le statut `constrained` sont conservés dans l’export assaini.

**Non résolu :** le paramètre réellement refusé pendant la troisième recette et les IDs/doses/protocoles de ses séances rejetées restent inconnus. Ces corrections ne constituent pas une attribution rétrospective de tous les refus à un faux positif. Le modèle n’est pas réputé appliquer toutes les contraintes sportives dans son schéma fournisseur : Zod et les contrôles finaux restent obligatoires.

## Accès aux réparateurs : pas de contournement

La restauration de présentation démontrée est exécutée **avant** le refus initial, avec preuve d’identité de protocole et revalidation. Une sortie ainsi acceptée retrouve le chemin normal merge → réparateurs sportifs → réconciliation/validation.

Les réparateurs aval existants ne sont pas appliqués à un JSON invalide ou à une prescription physiologiquement incompatible. Aucun catch général ne convertit un refus sportif en succès. Leurs suites de non-régression existantes (SL, séances clés, équivalence, phases, floors, bricks) sont exécutées avec les suites serveur complètes.

## Validation reproductible

- `catalogueGatewayMaintenance.test.ts` dans les deux fonctions : variantes, identité, réparation étroite, vrais refus, HTTP400/repli et confidentialité, HTTP403 sans repli, course officielle préservée.
- `gatewayPrivacyMaintenance.test.ts` : champs fournisseur non fiables, vocabulaire fermé et inventaires de variantes pour 5K, 10K, semi, marathon, trail montagne, 70.3, Ironman.
- `geminiContractMaintenance.test.ts` frontend : contrat Zod client, merge, adaptation, rechargement JSON synthétique et export assaini.
- Suites complètes Deno et CI frontend/Playwright ; reproductibilité offline et build Lovable sur le HEAD exact de PR. Résultats finaux liés dans la PR.

Commandes sans Gemini (fetch mocké dans les tests de génération) :

```sh
deno test --allow-read --allow-env supabase/functions/ai-training-plan/
deno test --allow-read --allow-env supabase/functions/ai-training-plan-test/
node node_modules/vitest/vitest.mjs run src/lib/plan/__tests__/geminiContractMaintenance.test.ts src/lib/plan/__tests__/sessionCatalogueContract.test.ts
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
```

L’environnement local emploie Deno 2.9.6, configuration `{"nodeModulesDir":"none","lock":false}`, et les dépendances de test en cache. La CI utilise les commandes déclarées du dépôt. Aucune génération payante ni donnée réelle n’est nécessaire.

## Verdict

GO pour revue de la maintenance si CI/reproductibilité vertes. Pas de garantie de génération complète, pas de GO scientifique général et pas de nouvel appel payant sans autorisation. Une sélection déterministe globale n’est pas implémentée. Aucun déploiement, publication, migration, modification de données athlètes ou Nolio ; PR brouillon, sans fusion.
