# DET-ENGINE pour TFCLab 2.1

La distribution du moteur contient `client.mjs`, `manifest.json` et `worker.js.gz`. Le navigateur contrôle la taille et les empreintes SHA-256 avant d’exécuter le calcul dans un Worker. La publication utilise sa propre version. Elle ne déploie aucune fonction Supabase et ne modifie aucune version du moteur IA.

Le client accepte l’action `generate` avec le profil et la configuration que le formulaire vient de construire, et l’action `verify` avec les arguments du précontrôle Nolio V2. La vérification est locale. L’envoi vers le compte Nolio, la synchronisation Garmin et la réalisation par le sportif nécessitent des observations distinctes.

```sh
node release/det/build.mjs release/det/dist
node release/det/tests/offline.mjs
node release/det/tests/chromium.mjs
```

## Recette du contre-la-montre

Le profil de test est synthétique. Le coach dispose de sept heures et de cinq séances hebdomadaires, dont une de renforcement. La FTP de référence est de 180 W. La course A dure 60 minutes. Le premier limiteur du diagnostic est FTP/kg. Le formulaire fige les priorités effectives avant la sélection. Le calendrier refuse une observation d’un autre athlète, une position non confirmée, une semaine de décharge demandée pour un rendez-vous aéro et un objectif de posture supérieur à la tolérance déclarée.

Le précontrôle du plan de huit semaines produit 37 opérations. Celui de la semaine 5 en produit cinq. Le précontrôle de la séance du jeudi en produit une. Aux semaines 5 et 6, la séance dure 60 minutes et contient 31 minutes en position aéro. Le corps Nolio V2 comprend 15 minutes d’échauffement à 72–99 W, deux blocs de 15 min 30 s à 136,8–158,4 W, 4 minutes de récupération entre eux et 10 minutes de retour au calme. Les cibles sont celles du profil synthétique.

## Observation sur montre et sur le terrain

Pour la recette avec un athlète pilote, garder la date, la séance et la version DET ensemble. Sur la montre appairée, ouvrir la séance vélo datée après synchronisation. Comparer la durée des étapes, les deux bornes en watts et la récupération intermédiaire à la séance que Nolio a reçue. Une photo des étapes de la montre suffit pour consigner la réception matérielle.

Pour la revue terrain, comparer à la prescription les tours réellement effectués, la durée tenue en position, les puissances, le RPE sur 10 et le retour du coach sur l’adéquation avec le limiteur prioritaire et la charge habituelle. Reporter aussi toute adaptation nécessaire. Le jeu synthétique ne documente aucune de ces observations et ses puissances ne doivent pas être recopiées sur un autre athlète.
