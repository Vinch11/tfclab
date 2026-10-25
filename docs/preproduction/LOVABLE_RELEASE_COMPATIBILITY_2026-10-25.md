# Publication Lovable — compatibilité sans fausse attestation

Base : main `eaf5455e376f15d84738991a89db7c36c68b406e`. Branche indépendante
`fix/lovable-release-compatibility`. Aucun déploiement, publication, fusion,
appel modèle, migration, donnée athlète ou fichier Nolio modifié. #407 inactive.

## Cause exacte

#406 n'alimentait les marqueurs que dans `prepare-plan-release.mjs` :
réécriture du module serveur dans une copie extraite par Git et variable
`TFCL_PLAN_RELEASE_INFO` injectée au build Vite. Dans les sources ordinaires,
le module Edge et la valeur Vite par défaut restaient non attestés/vides.
Les refus frontend et503 serveur étaient donc conformes au code, mais
incompatibles avec le processus Lovable rapporté : reconstruction depuis le
dépôt, sans ce script. Deux régressions reproduisent les503 sur les deux slugs.

L'ancien booléen `attested` n'était déjà ni une signature ni une attestation
du déploiement fournisseur. Le script vérifiait une source Git locale, des
empreintes et la cohérence d'archives, pas les octets réellement publiés.

## Correction minimale à la frontière de publication

- Une déclaration versionnée `planReleaseManifest.ts` décrit le protocole2,
  les empreintes du contrat, du catalogue effectif, des locks et de chacun des
  trois composants. `releaseId` lie ces éléments. Le fichier est exclu de son
  propre calcul pour éviter une autoréférence ; docs et tests ne font pas partie
  des sources runtime. Les sources frontend TS/JS/JSON/CSS, fonctions et modules
  partagés concernés sont couvertes, ainsi que le calculateur/config Vite.
- Le **build Vite standard** recalcule ces empreintes depuis le checkout réel
  et compare la déclaration. Une déclaration périmée/absente arrête le build.
  Ni Git, ni Deno, ni une variable spéciale, ni un script préalable ne sont
  requis par ce chemin Lovable. Un fichier public `plan-release.json` est émis.
- Les deux fonctions importent la même déclaration TS : un déploiement source
  ordinaire dispose donc des marqueurs sans réécriture préalable. GET
  `?release=1` expose aussi le slug et son empreinte de composant.
- Le frontend vérifie version, identité globale, composants, contrat, catalogue,
  locks et identité du endpoint visé. Aucun POST après un échec du précontrôle.
  Le POST vérifie lui-même identité/contrat/catalogue/locks **avant** lecture du
  corps et accès au modèle. JWT et contrôles sportifs existants sont conservés.
- Protocole précédent, champs manquants, release partiellement restaurée ou
  mauvaise fonction : refus explicite409/503. Aucun fallback de production.
- Le préparateur d'archives reste disponible et réutilise le même calculateur.
  Le vérificateur d'archives contrôle également l'identité2 et ses composants,
  tout en conservant la lecture des anciennes archives1.

Pour un changement runtime futur, le développeur calcule la déclaration avec
`node scripts/preproduction/plan-release-source.mjs --write`, puis commit et CI.
Ce n'est **pas** une opération requise de Lovable à chaque publication : elle
est déjà dans les sources approuvées. Ne jamais saisir des hashes à la main.

## Garanties et limites explicites

| Marqueur | Signification | Ne prouve pas |
|---|---|---|
| `provenance: declared-source`, `attested:false` | Déclaration de sources ; frontend recalcule au build, CI vérifie le fichier embarqué par les fonctions | Octets exécutés par Lovable/Supabase |
| `provenance: archived-source`, `attested:true` historique | Préparateur a extrait un commit et vérifié ses empreintes dans des archives | Signature d'un tiers, publication ou provenance cryptographique du fournisseur |
| `deploymentAttested:false` | Aucune attestation de déploiement revendiquée, même pour les archives | Rien n'est promu en preuve de production par un SHA déclaré |
| `sourceCommit` | Null en build Lovable ordinaire ; renseigné par le préparateur d'archives | Ce champ seul n'autorise jamais une génération |
| Empreintes + releaseId | Identité/cohérence des sources et déclarations selon les contrôles implémentés | Authentification du client, sécurité clinique générale, signature ou sauvegarde de production |

**Limite incontournable :** une fonction ne recalcule pas génériquement le hash
de ses propres sources dans le runtime Supabase. Elle annonce une déclaration
dont la fraîcheur est vérifiée par la CI et le build frontend. Une édition
directe de fonction qui contournerait cette validation pourrait rendre cette
déclaration fausse. Il faut donc publier uniquement les sources d'une révision
CI verte et vérifier les métadonnées/sources réellement déployées. Si Lovable
ne permet pas de garantir ce parcours, **NO-GO**, pas une désactivation du verrou.

Les contrats sont comparés sur la fonction appelée ; la recette opérationnelle
doit contrôler **les deux** fonctions avant d'ouvrir le service. Leur empreinte
n'est pas le deploymentId Supabase, qui reste une preuve fournisseur distincte.
Le runtime cible, la politique d'installation des dépendances depuis le lock
et le checkout complet doivent être confirmés. Aucun accès management ou job
réel de publication Lovable n'a été utilisé pour les prétendre vérifiés.

## Tests et preuve de non-régression

| Cas | Attendu |
|---|---|
| Source ordinaire, deux fonctions | Métadonnées200, provenance déclarée, aucun appel modèle ; garde POST compatible réussit |
| Vite standard sans variables de préparation | Build réussit et émet les marqueurs déclarés ; étape ajoutée au workflow existant d'artefacts |
| Checkout fictif sans `.git` | Recalcul identique à la déclaration,920 fiches, aucune préparation Git requise |
| Contrat source ou catalogue effectif modifié | Build refuse la déclaration périmée ; aucun élargissement de critères |
| Release/contrat/catalogue/lock/composant divergents | Précontrôle refuse ; POST incompatible refusé avant lecture du corps |
| Marqueurs absents/incomplets, mauvais slug, protocole1 | Refus explicite, aucun fallback production et aucun POST |
| Rollback cohérent2 simulé | Ancien ensemble2 accepté ; mélange avec nouveau ensemble refusé |
| Ancien protocole1 | Mélange1/2 refusé ; lecture des anciennes archives conservée ; restauration réelle non effectuée |
| Archives2 mélangées/corrompues | Vérificateur refuse même lorsque certains checksums sont cohérents |

Local : deux tests rouges avant correction ;26 tests ciblés verts, six tests
d'archives verts, build ordinaire réussi, deux entrées Deno compilables et huit
tests Deno diagnostics/mockés verts. Suite frontend complète pendant le travail :
359 fichiers,2642 tests verts,6TODO ; le test supplémentaire final et le commit
exact sont validés par la CI de la PR. Types frontend/config Vite et lint ciblé
vérifiés. Les limites et essais intermédiaires restent dans les preuves locales
(environnement Node du test incompatible avec setup DOM, typage du plugin Vite,
spawn tar refusé par sandbox puis même test autorisé). Aucun test sportif ni
seuil n'a été assoupli. Le workflow existant vérifie aussi deux builds archivés.

## Procédure Lovable — uniquement après autorisations distinctes

1. Faire revoir la PR et attendre quatre checks CI + workflow d'artefacts verts
   sur son HEAD exact. Fusion uniquement après autorisation. Revalider les
   marqueurs si un rebase modifie les sources runtime ; pas de modification
   directe Lovable non validée pendant cette release.
2. Conserver la publication frontend complète et les sources/versionnements
   des deux fonctions de l'ensemble sain précédent. Un export DB ne remplace
   pas ces composants. Confirmer le rollback fournisseur et le runtime cible.
3. Après autorisation de déploiement : synchroniser Lovable sur cette révision
   approuvée, avec checkout complet et dépendances respectant les locks.
   Build standard `npm run build` ou `bun run build` ; ne pas définir de faux
   `TFCL_PLAN_RELEASE_INFO`. Le préparateur reste facultatif pour archives/CI.
4. Publier les deux fonctions et le frontend de cet ensemble, dans une fenêtre
   où les générations restent suspendues. Un composant manquant doit rester
   bloquant, pas déclencher un essai payant ou un assouplissement.
5. Lire `/plan-release.json` et, après identification du code installé, les
   deux GET `?release=1` avec l'authentification habituelle. Comparer releaseId,
   contrat/catalogue/locks et trois composants ; confirmer séparément les
   publications/deploymentIds et sources du fournisseur. Cache neuf puis cache
   existant : l'ancien frontend ne doit pas accepter le nouvel ensemble.
6. Recette synthétique sans modèle : profil/test, plan existant, sauvegarde,
   fermeture/réouverture, édition, récupération, export/rapport, PDF natif et
   revue sportive. Aucune écriture distante autorisée par cette préparation.

Rollback : restaurer l'**ensemble complet** sain. Le test de rollback2 est
synthétique, pas une restauration de production. Pour un retour au protocole1,
restaurer son frontend et ses deux fonctions/artefacts réellement fonctionnels,
sans mélange ; reconstruire simplement eaf5455 depuis Lovable reproduirait son
blocage initial. Si le fournisseur ne permet pas la restauration nécessaire,
le rollback et la mise en service restent NO-GO.

**Verdict : correction technique préparée pour revue ; NO-GO production tant que
les sources/versions réellement publiées, la chaîne Lovable et le rollback ne
sont pas attestés et que les autorisations de fusion/publication manquent.**
