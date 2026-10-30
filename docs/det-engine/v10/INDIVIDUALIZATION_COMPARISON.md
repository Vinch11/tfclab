# Comparaison d’individualisation

Les spécifications synthétiques sont figées dans v10-fixtures.ts avant l’inspection du catalogue ; l’empreinte et l’heure sont dans evidence/preregistration.json et sont revérifiées. Les historiques matérialisés sont explicitement des dossiers fictifs, pas des mesures instrumentées ni des données ajoutées à un athlète historique.

Les deux profilsIronman ont :objectifIM, ambitionfinisher, niveautrained, mêmes jours disponibles, deux séances au plus par jour, un jour complet sans entraînement et600min déclarées par semaine. La protection initiale existante limite réellement les deux à480min. Elle n’a pas été relevée pour faire réussir la construction.

| Profil | VLamax estimée du diagnostic | Priorité de discipline dans le dossier synthétique | Plafond longue vélo/course min | Natation min | Vélo min | Course min | Soutien min |
|---|---:|---|---|---:|---:|---:|---:|
| IM_aerobic_history | 0.35 | bike | 180/75 | 80 | 260 | 110 | 30 |
| IM_balanced_history | 0.55 | run | 150/90 | 95 | 195 | 160 | 30 |

La différence des doses provient des priorités de discipline documentées par les observations fictives, des plafonds de séance et des contraintes conjointes. Le diagnostic sélectionne une hypothèse de soutien aérobie modéré ; aucune baisse de VLamax n’est annoncée. Les valeurs sont des estimations de profil, pas assimilées à des mesures de laboratoire.

Un témoin factoriel conserve l’historique et les priorités du premier cas et change seulement les données physiologiques vers celles du second : les doses restent identiques lorsque le même limiteur demeure classé. Cela évite de fabriquer une relation numérique VLamax→minutes. Cette limitation est explicite : le prototype n’établit pas une réponse-dose quantitative indépendante de l’interprétation coach.

Le témoin IM_insufficient garde l’enveloppe et l’historique mais retire le diagnostic/limiteur classable : il reste refusé avant allocation. Le niveau qualitatif ne remplace pas cette preuve. Les historiques et profils ne sont pas modifiés après découverte d’un conflit ; le contrat endurance_only reste en échec.

## Nature des justifications

| Élément | Statut |
|---|---|
| Orientation profil/historique/stimulus/retour | Pratique documentée deLorang, sourceV8L175/L417 |
| Distribution et durabilité | Résultats/contextesR25 etM21, sans ratio ou progression universels |
| Bornes catalogue et floors | Conventions programmatiques exécutées |
| Enveloppes et priorités de discipline | Entrées synthétiques préenregistrées, pas des observations réelles |
| Appariement et remplissage prioritaire | Hypothèse méthodologiqueTFCL candidate |
| Adaptation physiologique obtenue | Non observée ; aucune validation clinique |
