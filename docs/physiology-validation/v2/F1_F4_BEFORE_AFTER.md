# F1–F4 — avant/après et impacts

Référence : [#424](https://github.com/Vinch11/tfclab/pull/424), commit final V1 `36a8f2f69c07248aa4e08bbc4bb322e9ae4c759d`, **non modifié**. Les reproductions ont été reprises dans `src/**/__tests__/physiologyValidationV2.*`, sans fusion de la branche V1.

| Défaut | Avant reproduit | Après V2 | Éléments conservés |
| --- | --- | --- | --- |
| F1 — bornes profil | FTP profil −1, 501, NaN ou infini admise ; division FTP/kg relaie la valeur | Profil valide uniquement si nombre fini et dans les bornes existantes du helper ; sinon null/source none | Sept bornes inchangées ; snapshot actif prioritaire ; aucune mutation des entrées ni valeur de remplacement |
| F2 — provenance | `getSourceLabel("snapshot")` → « Mesuré (snapshot) », même pour Profil Express estimé | « Stocké (snapshot) » ; nature scientifique séparée dans les métadonnées | Valeur, priorité et autres libellés inchangés |
| F3 — snapshot labo | VLamax run 0,42 écrite dans `vlamax` vélo ; discipline calculée mais perdue ; source non transmise | Run → `vlamax_run`, bike → `vlamax`, source conservée. Tri/inconnu → aucune affectation ; valeur récupérable dans `unassignedVlamax` | Valeur, date de rapport, confiance d'extraction, notes et données brutes ; aucun sport déduit de la seule présence d'une VMA |
| F3 — test LAB lié | Une valeur vélo/tri/nage/inconnue pouvait être utilisée pour la course ; un test course pouvait contaminer le pivot vélo | Discipline structurée transportée par `mapTestToV2`, filtrée avant le choix du test ; import mixte ne crée pas une valeur LAB assignée | Données historiques non réécrites ; comportement natation historique conservé ; anciens tests sans discipline explicite restent traités comme auparavant |
| F4 — score/coût | Score 65/100 envoyé au prédicteur comme coût puis borné à 150 ; VLa=0,5 → 93,7 % | Coût explicite 200 → 83,2 % avec la **même formule** ; sans coût valide, pas de prédiction | Score pour les limiteurs, voie seuil/VMA, formules Mader, CP/W′, VLa, TTE et estimations CE d'affichage distinctes |

## Portée du coût O₂

`DiagnosticInput.runningEconomyCostMlKgKm` est optionnel, distinct de `runEconomyScore` (0–100). Admission : nombre fini dans le domaine **déjà utilisé par le prédicteur, 150–280 ml O₂/kg/km**. Ce n'est pas une nouvelle borne de physiologie universelle : hors domaine, V2 refuse cette prédiction plutôt que d'extrapoler ou de borner silencieusement un score.

Le coût issu du champ éditable d'import `running_economy` est conservé dans une enveloppe versionnée du champ notes existant, avec unité et discipline. Pas de nouvelle colonne, migration, conversion score→coût ni reconstruction automatique des anciens imports. Une ancienne note libre « Économie : 200 » ne suffit pas à établir le contrat et reste inconnue pour ce calcul.

Les consommateurs raccordés sont le diagnostic, Running Profile, sa trace, les zones dérivées, la section MLSS des Essentiels et l'export staff. Le résolveur CE simplifié reste disponible pour ses estimations d'affichage : ses coefficients n'ont pas été remplacés et il n'est pas promu implicitement en mesure O₂.

## Continuité historique

Les nouvelles traces MLSS portent une version et une unité explicite. Les anciennes traces sans unité restent consultables ; leur coût ambigu et leurs prédictions dépendantes ne sont plus utilisés pour calculer une dérive. VLamax et proxies observés admissibles restent utilisables. Aucune suppression ou réécriture de traces réelles effectuée, aucun seuil de dérive modifié.

## Non-régression et changements attendus

[Avant QA](evidence/qa-before.json) est capturé avec les sources immuables de main ; [après](evidence/qa-after.json) appelle les sources V2. Les quatre blocs sont comparés par SHA, pas à une seconde copie du calcul corrigé.

- 37/37 : effectifs, limiteurs, readiness et cibles identiques.
- 25/37 : sortie MLSS différente, parce que la prédiction n'avait aucun coût explicite.
- 1/37 : alertes différentes ; ce retrait n'est pas un nouvel avis scientifique favorable.
- Proxies seuil/VMA disponibles inchangés ; aucune fixture réécrite.

Liste par profil et valeurs exactes : [qa-differences.json](evidence/qa-differences.json). Pour DET A/B : 82,8 et 85,1 restent les valeurs effectives ; les prédictions 95 et comparaisons artificielles disparaissent sans introduire CE=200 dans ces cas.

Limite conservée : schéma de sauvegarde FTP 50–600 W et références effectives 50–500 W ont des contrats différents préexistants. V2 ne les harmonise pas arbitrairement ; les profils au-delà des bornes effectives deviennent inconnus dans ce helper, pas « physiologiquement impossibles ».
