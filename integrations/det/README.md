# Formulaire DET dans TFCLab 2.1

Sur la page de planification, choisir le moteur **DET-ENGINE** dans le sélecteur de la page (à l’étape « Générer le plan »), puis choisir l’athlète et renseigner **Configuration** et **Objectif principal (A)**. L’option **Contre-la-montre vélo** utilise le bilan de l’athlète et permet d’ajuster l’ordre dans **Hiérarchie des Limiteurs**. Le coach renseigne ensuite l’observation en position aéro, les durées tolérées et les semaines visées. **Générer avec DET** calcule le plan dans le navigateur.

Dans chaque plan DET, **Guidage Nolio V2** permet de vérifier le plan complet, une semaine ou une séance. Pour une séance, la vue affiche les étapes structurées attendues, la durée, les cibles et le traitement de la dernière récupération. Le contrôle utilise des associations de simulation. Son résultat ne constitue pas un accusé de réception de Nolio ou d’une montre.

Pour un marathon chronométré, le champ DET associe le temps visé à la course A. En reprise, le coach peut enregistrer les durées de sortie longue tolérées pour cet athlète et cette préparation. Pour le trail, chaque cible d’effort sur le terrain est rattachée à une sortie observée, au parcours et aux fiches V3 concernées. Le coach peut renseigner les fiches en plusieurs fois et revoir les séances qui restent sans cible.

La connexion Nolio habituelle de TFCLab 2.1 demande `planned:read`. **Compte et athlète Nolio** permet au coach de consulter sa connexion d’export DET, d’autoriser les droits de lecture et d’écriture et de choisir le profil Nolio correspondant à l’athlète affiché. **Exporter le plan**, **la semaine** ou **la séance** archive la version choisie, vérifie ses références, envoie le lot sélectionné et relit les activités. Chaque tentative reprend le même journal. Le service DET doit être installé sur le projet Supabase du site. La distribution indépendante comprend `det-nolio-connect`, `det-nolio-callback` et `det-nolio-export`. Le protocole de déploiement figure dans [le dossier du moteur DET](https://github.com/Vinch11/tfclab/blob/release/det-fiabilite-coach-21/release/det/backend.md).

Pour vérifier le parcours réel, garder ensemble l’athlète pilote, la date, la version DET et la séance. Après l’envoi sur une connexion Nolio V2 autorisée en écriture, comparer la séance relue sur Nolio et les étapes visibles sur la montre. Après la sortie, relever le temps effectivement tenu en position, la puissance de chaque bloc, le RPE sur 10 et l’avis du coach sur la dose au regard du limiteur prioritaire. Ces observations sont à réaliser avec les valeurs personnelles du pilote.

## Distribution

La distribution du Worker est sous `public/__det/v1/`. Le formulaire se construit avec `node integrations/det/build.mjs public/__det/coach`. Le manifeste `host-release.json` identifie la version du formulaire source et les empreintes de ses fichiers. La recette Chromium part d’un compte synthétique, de lignes de bilan au format de la base, et du menu ordinaire. Elle vérifie le plan et les trois portées de contrôle. Une fois le test réussi, le workflow de la branche DET y enregistre les fichiers exercés.

Pour **Start to Run**, le formulaire indique comment ouvrir le protocole marche-course standard dans la planification de TFCLab. En reprise, une case vide donne lieu à une demande précise. Le chiffre zéro indique une absence de pratique. Le coach peut fixer un plafond futur de sortie longue inférieur à une sortie déjà tolérée.

Après un envoi, **Identifiants d’envoi et de relecture Nolio** affiche la version du plan, la séance datée, l’identifiant conservé à l’écriture et celui rendu par Nolio à la lecture. Cette liste apparaît lorsque Nolio a renvoyé les mêmes activités avec les étapes attendues. La synchronisation et les étapes visibles sur la montre du pilote se constatent ensuite sur l’appareil.

Le formulaire publié utilise les trois fichiers de la version vérifiée sous un chemin propre au moteur et à son client. Le même chemin sert à la génération et au précontrôle Nolio lorsqu’un navigateur a déjà mis en cache une ancienne version de DET.
