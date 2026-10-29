# Défauts reproduits et candidats expérimentaux

**Aucun fichier de production modifié.** Les trois premiers candidats sont des adaptateurs isolés ; F4 est une proposition de patch du contrat, évaluée en mémoire par le harnais expérimental. Aucun candidat importé par l'application. Ils sont préparés pour revue, sans migration, correction de données existantes ni activation.

## F1 — Le repli profil contourne les bornes des snapshots

- **Avant :** `getEffectiveRefs({refs:{ftp:-1}}, [])` renvoie −1 W ; 501 W, `NaN` et `Infinity` sont aussi acceptés dès lors que `typeof === number`. Avec 70 kg, la division relaie une référence invalide.
- **Pourquoi incorrect :** le même helper valide déjà FTP snapshot entre 50 et 500 W et promet des références valides/null. La provenance profil ne justifie pas de contourner ces protections logicielles.
- **Reproduction :** quatre tests rouges dans [avant F1–F3](evidence/confirmed-defects-before.txt), [confirmed-defects.test.ts](../../../experimental/physiology-validation/v1/confirmed-defects.test.ts).
- **Candidat :** [candidates.ts](../../../experimental/physiology-validation/v1/candidates.ts) filtre les références de profil avec **les sept bornes déjà existantes**, vérifie la finitude puis délègue au calcul original. Ni équation ni priorité des snapshots modifiée.
- **Impacts vérifiés :** chaque référence valide aux bornes basses conservée ; snapshot actif ancien toujours prioritaire ; entrées non mutées ; valeur invalide→null/source none/FTPkg null. Limite : table de bornes du candidat à intégrer au helper commun lors d'une éventuelle revue, pour éviter la duplication durable.

## F2 — Le stockage en snapshot est affiché comme mesure

- **Avant :** `getSourceLabel("snapshot")` renvoie `Mesuré (snapshot)`. `AthleteRefsPanel.tsx` rend ce libellé y compris pour une estimation `profil_express` stockée dans un snapshot.
- **Pourquoi incorrect :** nature scientifique et emplacement de stockage sont deux propriétés différentes ; Profil Express déclare explicitement que ses résultats sont estimés.
- **Reproduction :** une assertion rouge dans l'artefact F1–F3.
- **Candidat :** libellé neutre `Stocké (snapshot)` ; valeurs et autres libellés inchangés.
- **Impacts vérifiés :** statut profil/absent conservé. Pas de nouveau système d'affichage de provenance scientifique et pas de test React visuel dans cette correction : elle répare seulement l'affirmation erronée du helper.

## F3 — L'import laboratoire course écrit VLamax dans le champ vélo

- **Avant :** `mapExtractToSnapshot` calcule une variable `sportMain` mais ne la retourne pas ; écrit toujours `vlamax`, jamais `vlamax_run` ni `vlamax_source`. Une extraction synthétique sport=run/VLamax=0,42/source=lab perd donc discipline et source.
- **Pourquoi incorrect :** `mapSnapshotToV2` et le verrou CAP attendent précisément `vlamax_run` et une provenance labo explicite. La valeur mesurée ne doit pas être routée vers le pivot vélo. `LabImportDialog` utilise directement ce payload ; un test lié optionnel ne répare pas le snapshot lui-même.
- **Reproduction :** une assertion rouge dans l'artefact F1–F3 ; fixture créée avec `createEmptyLabExtract`, sans PDF réel.
- **Candidat :** si discipline explicite run, écrit `sport_main=run`, `vlamax_run`, garde la source déclarée et laisse `vlamax=null`. Bike explicite conserve le champ vélo. Tri/inconnu restent inchangés pour revue du segment ; aucune mesure labo inventée si la source est absente.
- **Impacts vérifiés :** valeur 0,42, date, confiance d'import conservées ; mapper V2→effectif CAP verrouillé→diagnostic précalculé→planification préserve la valeur et son objet de confiance. [Artefact](evidence/candidate-run-lab-to-plan.json). Le verrou 0,95 vient de la convention du moteur pour source labo, pas d'une validation réelle de cette fixture.
- **Limites :** pas de reprise des imports historiques, de traitement automatique des rapports mixtes, ni de preuve que tout champ d'un PDF labo est une mesure directe.

## F4 — Un score d'économie est transmis comme coût O₂ au Modèle C

- **Avant :** `SnapshotManager`/`runningEconomySnapshot.ts` définissent un score 0–100. `computeRunMLSSFromInput` passe `input.runEconomyScore` au prédicteur qui attend ml O₂/kg/km. Pour VLa=0,5 et score=65, CE est borné à 150, donnant **93,7 %** avec confiance 0,75. Un coût explicite de 200 donne **83,2 %**, confiance 0,85. Sans coût réel, aucune de ces conversions du score n'est justifiée.
- **Pourquoi incorrect :** erreur de contrat/unité, pas divergence entre méthodes scientifiques. Un score de qualité ne se convertit pas en consommation d'oxygène par bornage.
- **Reproduction :** [trois attentes rouges](evidence/economy-contract-before.txt) : absence de CE, CE explicite, seuil observé sans fausse cross-validation. [Avant-après](evidence/economy-contract.json).
- **Candidat :** [economy-contract.patch](../../../experimental/physiology-validation/v1/economy-contract.patch) ajoute un coût optionnel distinct dans `DiagnosticInput` et remplace uniquement les deux arguments CE du helper MLSS. `runEconomyScore` demeure utilisé par le limiteur et la complétude. Aucun coefficient modifié ; aucun producteur automatique de CE ajouté.
- **Validation technique :** `git apply --check` passe sans appliquer le patch ; [harnais](../../../experimental/physiology-validation/v1/vitest.config.ts) charge une copie **en mémoire** du diagnostic avec les deux substitutions ciblées, sans toucher au fichier source. [Tests](../../../experimental/physiology-validation/v1/economy-contract.test.ts).
- **Impacts :** CE absent→prédiction/cross-validation absentes ; seuil/VMA existant reste prioritaire. Les 37 profils QA conservent effectifs, limiteurs, readiness et cibles ; les prédictions/alertes liées au MLSS peuvent changer. Pas de généralisation automatique aux lecteurs parallèles de CE ni aux traces persistées.
- **Condition de reprise :** relier un vrai coût unitaire/provenancé s'il existe et auditer les traces MLSS anciennes, sans les réécrire dans V1. Le contrat candidat est volontairement non branché : les appelants actuels ne renseignent pas ce nouveau champ.

## Ce qui n'est pas déclaré défaut nouveau de formule

RMSE historique non reproduit sur la fixture actuelle, provenance de calibration incomplète, incertitudes aplaties et consolidation sans manifeste structuré sont des limites de preuve/contrat consignées. Elles ne justifient ni recalibration automatique ni remplacement d'équation. Les erreurs historiques déjà corrigées et testées n'ont pas été rouvertes.

**Résultats :** F1–F3, 6 rouges/5 verts sur production ; F4, 3 rouges sur production. Candidats et contrôles de chaîne finaux : **55 tests verts** dans [l'exécution retenue](evidence/experimental-tests-final-expanded.txt).
