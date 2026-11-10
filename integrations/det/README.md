# Formulaire DET dans TFCLab 2.1

Sur la page de planification, choisir le moteur **DET-ENGINE** dans le sélecteur de la page (à l’étape « Générer le plan »), puis choisir l’athlète et renseigner **Configuration** et **Objectif principal (A)**. L’option **Contre-la-montre vélo** utilise le bilan de l’athlète et permet d’ajuster l’ordre dans **Hiérarchie des Limiteurs**. Le coach renseigne ensuite l’observation en position aéro, les durées tolérées et les semaines visées. **Générer avec DET** calcule le plan dans le navigateur.

Dans le plan CLM, **Guidage Nolio V2** permet de vérifier le plan complet, une semaine ou une séance. Pour une séance, la vue affiche les étapes structurées attendues, la durée, les cibles et le traitement de la dernière récupération. Le contrôle utilise des associations de simulation. Son résultat ne constitue pas un accusé de réception de Nolio ou d’une montre.

La connexion Nolio V2 de cette version de TFCLab 2.1 demande `planned:read` pour le calendrier. L’envoi nécessite une connexion DET disposant aussi de `planned:write`.

Pour vérifier le parcours réel, garder ensemble l’athlète pilote, la date, la version DET et la séance. Après l’envoi sur une connexion Nolio V2 autorisée en écriture, comparer la séance relue sur Nolio et les étapes visibles sur la montre. Après la sortie, relever le temps effectivement tenu en position, la puissance de chaque bloc, le RPE sur 10 et l’avis du coach sur la dose au regard du limiteur prioritaire. Ces observations sont à réaliser avec les valeurs personnelles du pilote.

## Distribution

La distribution du Worker est sous `public/__det/v1/`. Le formulaire se construit avec `node integrations/det/build.mjs public/__det/coach`. Le manifeste `host-release.json` identifie la version du formulaire source et les empreintes de ses fichiers. La recette Chromium part d’un compte synthétique, de lignes de bilan au format de la base, et du menu ordinaire. Elle vérifie le plan et les trois portées de contrôle. Une fois le test réussi, le workflow de la branche DET y enregistre les fichiers exercés.
