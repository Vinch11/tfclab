# Contrat de feedback prospectif

## Séparation des temps

**Avant séance** : empreinte de l’intention, demande, fiche, dose, domaine plafond, observations attendues, conditions de maintien/retrait. La fiche et ses zones ne sont pas réécrites.

**Après séance** :Observation porte `synthetic:true`, l’empreinte et l’ID de demande, un numéro de séquence, la qualité, sensations, récupération, douleur éventuelle, RPE facultatif, dérive cardiaque avec comparabilité et interprétation, ou test avec méthode connue/inconnue. Aucune de ces réponses ne représente un athlète réel. Aucun accèsNolio ni formulaire de charge.

**Décision** :transition enregistrée avec raison, dose avant/après proposée, observation utilisée, statut de pause et revue coach obligatoire. Aucune écriture du calendrier ou des valeurs physiologiques.

## Priorités exécutées

| Observation synthétique | Décision calculée |
|---|---|
| Douleur ou maladie rapportée, même avec RPEfaible | Pause et avis coach ; aucune conclusion médicale automatisée |
| Pause antérieure | Reste en pause ; une observation positive ne vaut pas levée coach |
| Test fiable contredisant l’hypothèse | Avis coach, pas de changement silencieux de limiteur |
| Contradiction avec méthode inconnue | Avis coach ; incertitude conservée |
| Données manquantes/incertaines | Pas de progression ; avis coach |
| Récupération non acquise | Retrait proposé de la prochaine exposition, pause |
| Effort plus difficile que prévu ou dérive interprétée adverse dans un protocole comparable | Chercher une dose source plus basse dans les contraintes ; sinon avis coach, sans couper artificiellement la fiche |
| Bonne tolérance et récupération déclarées | Maintenir l’essai initial ; pas d’augmentation automatique ni preuve d’adaptation |
| Dérive non comparable mais autres retours utilisables positifs | La dérive n’est pas utilisée pour modifier la dose ; maintien fondé sur les autres retours seulement |

Aucun seuilRPE ou dérive universel. Les interprétations qualitatives sont fournies comme observations synthétiques, pas diagnostiquées par un nouveau questionnaire. L’augmentation automatique de volume, fréquence ou intensité n’est pas implémentée. Une réduction dans la même fiche ou une substitution est proposée uniquement si une dose catalogue valide existe ; elle n’est pas appliquée par ce prototype.

## Non-régression des propositions

Deux substitutions calculées ont une dose inférieure mais échouent aux contrôles historiques avant/après : elles restent **rejetées**. Leur décision effective est avis coach, pas «réparation acceptée». Les alertes nouvelles et précédentes sont archivées intégralement dans `proposalAudits`. Les contrôles de fréquence source, de calendrier et l’absence de nouvelle erreur critique sont indépendants.

Une trajectoire séquentielle par pilote teste : toléré → symptôme → retour positif. Résultat :maintenir → avis coach → avis coach. La pause persiste. Les numéros de séquence déjà consommés et les observations d’une autre demande sont refusés ; aucun doublon n’est ajouté au journal. Les observations non synthétiques sont interdites dans ce périmètreoffline.
