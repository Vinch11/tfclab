# Revue V2.1 — PR #425 — DRAFT / NO-GO

Référence examinée : `bdb204f3fd25253268ffc3e64b13bc19b4db75d0`, branche `experiment/physiology-validation-v2`, base `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`. Les documents V2 restent des archives de cette version ; leurs empreintes ne sont pas réécrites pour leur faire décrire V2.1.

## Anomalies confirmées et corrections minimales

| ID | Comportement initial et preuve | Correction / vérification |
| --- | --- | --- |
| R1 | CI : 246 → 258 erreurs. 13 occurrences `no-explicit-any` introduites, une ancienne supprimée, soit +12 net. JSON ESLint avant/après archivés. | Types des fixtures, callback et entrée du constructeur HTML précisés ; aucune règle désactivée. 245 contre 246 sur la liste finale des fichiers concernés. |
| R2 | VMA 18 → 19 → 18 : la provenance du premier 18 réapparaît. `review-before.txt`, puis reproduction sur worktree figé. | À l'édition scalaire, retirer définitivement la métadonnée de cette valeur devenue périmée, conserver les autres paramètres. Test de sauvegardes successives + remontage du hook. |
| R3 | Date et confiance explicitement `null` par paramètre remplacées par date/confiance globales ; `storageSource` du paramètre ignorée. | Distinguer propriété absente et inconnue explicite. Valeur, unité, discipline, méthode, date, origine, stockage, confiance/fondement et marge restent séparés. |
| R4 | Une enveloppe entrante malformée peut remplacer les métadonnées valides. Dates impossibles, par exemple 2026-02-31, acceptées. | Refus de la sauvegarde de l'enveloppe entrante invalide ; lecture défensive des historiques, contrôle calendaire. Les anciennes chaînes restent consultables et ne sont pas réécrites au chargement. |
| R5 | `updateSnapshot` pouvait dépasser 2 000 caractères après recomposition texte + provenance, contrairement à l'insertion. | Appliquer le schéma de notes existant après recomposition et avant toute écriture ; à 2 000 accepté, à 2 001 refusé sans troncature, écriture DB ou mutation locale. |
| R6 / F3 | Import VLamax « unknown » : champs vélo/course nuls, mais score et profil métaboliques tout de même calculés. | Ne construire ces dérivés que pour un segment explicite admissible ; valeur brute ambiguë conservée dans `unassignedVlamax`. |
| R7 / F3 | LAB sans discipline affecté implicitement d'après l'objectif Marathon/IM. | L'objectif n'établit plus la discipline du test. Discipline structurée requise, ou protocole historique identifiant explicitement vélo/course/natation. Les LAB inconnus ne fournissent plus de VLamax spécifique. |
| R8 / F2 | `test_labo`, catégorie interne de sélection, convertie automatiquement en `direct_measurement` dans la provenance effective. | Sans preuve connue : `unknown`. Si la valeur et la discipline correspondent à une preuve disponible, conserver son origine, sa méthode et sa date ; confiance calculée toujours marquée heuristique. Test rouge distinct `derived-origin-before.txt`. |

Les corrections de contrat ne changent aucune équation, coefficient, calibration, borne scientifique ou calcul de confiance numérique. Un test cycliste historique sans discipline a reçu `sport: "bike"` pour déclarer son intention, sans modifier ses valeurs ni affaiblir son assertion. Les 37 profils QA sont intacts.

## Preuves et portée

- [Reproductions initiales](evidence/review-before.txt) : 9 échecs / 10 assertions ; [origine effective](evidence/derived-origin-before.txt) : échec distinct.
- [Reproduction intégrale sur le SHA initial](evidence/frozen-baseline-reproductions.txt) : tests de revue et sauvegarde exécutés contre les sources initiales, dans un worktree indépendant. Seuls les tests sont copiés : **17 échecs et 5 passes sur 22 assertions**, notamment dépassement des notes et pertes de texte historique ; aucune erreur de chargement ne sert de preuve.
- [Suite V2 + revue](evidence/targeted-final.txt), [37 profils](evidence/qa-37-review.json), [protections release](evidence/release-tests.txt), [build](evidence/build.txt), [typage](evidence/types-final.txt), [smoke Chromium](evidence/browser-smoke.txt).
- [Contrat de provenance et historiques](PROVENANCE_AUDIT.md), [effets MLSS](MLSS_25_IMPACT.md), [décision et risques](GO_NO_GO.md), [reprise reproductible](REPRISE.md).

L'exécution exploratoire de la suite complète a démarré avant la régénération normale de déclaration et pendant les corrections : elle montre les protections de fraîcheur et une assertion rouge ensuite corrigée. Elle a été arrêtée et **ne constitue pas un résultat final**. Le premier smoke sur la page publique a dépassé son délai pendant les travaux concurrents ; le smoke final utilise une page synthétique isolée et les fonctions réelles. Ces essais restent archivés et ne sont pas comptés comme passes.
