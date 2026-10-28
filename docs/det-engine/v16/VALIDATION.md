# Validation V16 réellement exécutée

| Commande / périmètre | Sortie | Erreur processus | Durée ms |
| --- | --- | --- | --- |
| types | 0 | None | 41963 |
| canonical_contracts | 0 | None | 5417 |
| experimental_regression | 0 | None | 52145 |
| current_v16_study | 0 | None | 23701 |
| historical_regression | 0 | None | 23969 |


Le détail des nombres de fichiers/tests est dans [les logs](evidence/validate-3/commands.json). La suite Node du canonique/présentation/Nolio a passé 26 tests dans validate-3, puis 27 dans la validation complémentaire du garde de limites sources ([reçu](evidence/intensity-guard-validation.json)) ; le fichier d'étude contient 9 tests couvrant 192 sélections exactes et 5520 comparaisons de filtres. Les 30 tests de garde expérimentaux passent (8 fichiers,3 tests d'archivage conditionnels préexistants non exécutés) et les 186 tests historiques ciblés passent (31 fichiers). Les régressions expérimentales ciblées et historiques ciblées sont réellement rejouées par le runner V16, séparément ; aucun compte V14/V15 n'est présenté comme une nouvelle exécution. La régression historique ciblée utilise un garde réseau offline ; aucun appel réel n'est autorisé par ces tests.

La preuve [reproducibility.json](evidence/proof-1/reproducibility.json) compare deux processus indépendants pour les fichiers de migration et deux pour l'étude. Les rendus et payloads texte compatibles sont également sérialisés/rejoués dans les tests. Après le garde de limites d'intensité source, une troisième conversion contrôlée reproduit les sept artefacts à l'identique ([reçu](evidence/post-intensity-guard-verification.json)). Le processus ayant perdu son handle pendant une transition d'environnement reste conservé avec statut de sortie inconnu, sans servir de preuve d'exécution réussie. Le JSON Schema est contrôlé sur les 920 représentations par Python jsonschema 4.26.0, Draft202012Validator :920 valides,0 erreur. Voir [le reçu indépendant](evidence/json-schema-validation.json).

Les 3057 fichiers suivis avant V16 sont vérifiés avant/après. Cela inclut les 600 configurations, les contrats et preuves V2–V15, le catalogue, les validateurs et le moteur de production. Aucun de ces fichiers n'est corrigé par V16.

## Échecs conservés

- Les premiers essais de l'étude avaient une annotation de profil trop large puis un mauvais nom de propriété diagnostic ; les logs de types/étude initiaux et affinés sont conservés. Le champ réel effectifs a été repris sans modifier le diagnostic. Les fixtures TTE montrent aussi explicitement la différence entre un mode non observé hérité et OBSERVED simulé.
- Une tentative de suite expérimentale globale a atteint 180 s ; deux tests V16 y dépassaient le timeout 5 s de la configuration héritée. Cette tentative est rejetée/conservée. Le fichier V16 déclare désormais un timeout 60 s pour ses 192 comparaisons et les études. Les anciennes recherches exhaustives ne sont pas relancées ; les huit fichiers de garde pertinents et les tests historiques catalogue/physiologie/zones sont listés dans les configs V16. La suite applicative entière et les 600 constructions historiques ne sont pas revendiquées comme rejouées.
- Une relecture a identifié que la plage générique d'affichage pouvait dépasser les contraintes chiffrées d'une fiche. Le test de régression échouant est conservé, puis le garde refuse la personnalisation tant que ces contraintes ne sont pas résolues. Les 27 tests Node passent après correction ; aucun domaine, intensité source ou validateur historique n'est modifié.
- Le premier runner a reçu exit 0 **avec EPERM** du sandbox. Il a refusé cette preuve et conservé validate-1/failure.json. La relance contrôlée ne l'efface pas et n'assimile pas 0 à une preuve acceptable si une erreur processus existe.

Aucun validateur historique n'est affaibli, aucun test n'est supprimé ou désactivé pour améliorer le résultat. Un succès technique ne constitue pas une validation scientifique ou une signature coach.
