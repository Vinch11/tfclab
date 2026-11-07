# Résultats CI et vérifications de clôture

## Stabilisation publiée

SHA **`fdc65c27abf84ba0aa1bf444f22ea3f9340aea65`**, run [40905793499](https://github.com/Vinch11/tfclab/actions/runs/40905793499).

| Check GitHub | Avant V2.1 | Stabilisation |
| --- | --- | --- |
| ESLint | Échec, 246 → 258 | **Succès, 246 → 245**, confirmé dans le log du job |
| TypeScript / Vitest | Succès | **Succès**, suite complète CI ; aucun délai ou validateur historique modifié |
| Playwright | Succès | **Succès, 11 tests**, configuration Chromium/WebKit intacte |
| Deno | Succès | **Succès**, aucun fichier de moteur Edge modifié |

[Snapshot avant](evidence/github-checks-before.json) et [snapshot après stabilisation](evidence/github-checks-stabilization.json) conservent les quatre conclusions, URLs, SHA et dates des jobs.

## Dernier complément de confiance

Une assertion supplémentaire reproduit ensuite sur ce SHA le repli indu de la confiance par paramètre vers la confiance globale : [preuve rouge](evidence/global-confidence-before.txt). La correction conserve cette confiance globale dans le snapshot et laisse le paramètre sans preuve à `null`. Elle n'altère aucune confiance calculée par les moteurs physiologiques.

Vérifications après ce complément : **97 tests V2/revue/release**, TypeScript et build, déclaration normalement régénérée. Les trois derniers fichiers TS modifiés ne présentent aucune erreur ESLint ; la comparaison totale reste 245 ≤ 246. Les logs sont `closure-verification.txt`, `types-closure.txt`, `build-final.txt`, `release-refresh-final.txt`. Les 37 profils sont rejoués par la suite de clôture.

La CI est également observée sur le commit final publié. Son SHA et les **quatre conclusions finales** sont consignés dans le corps actualisé de [#425](https://github.com/Vinch11/tfclab/pull/425), avec lien vers les jobs. Le run ci-dessus atteste le premier commit, et ne se substitue pas aux checks du dernier commit. Aucune relance de workflow ni contournement de validation demandés ; seuls les pushs autorisés de la PR déclenchent son workflow normal.

Le timeout local FIT reste visible dans le rapport, même après le succès de la suite complète CI. Son rejeu isolé passe sans modification. Les ensembles de tests se recouvrent ; ne pas additionner les compteurs de runs différents.
