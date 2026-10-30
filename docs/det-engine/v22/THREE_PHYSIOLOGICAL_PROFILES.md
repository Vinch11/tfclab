# Trois profils synthétiques préenregistrés

Même objectif IM, ambition finisher, niveau qualitatif trained, budget disponible 10 h/semaine, 16 semaines jusqu’à la course. Le bloc demandé couvre quatre semaines à partir du 2 novembre 2026 ; course déclarée le 21 février 2027. Disponible mardi–dimanche, lundi repos, au plus deux séances par jour. Mêmes enveloppes synthétiques déclarées : vélo long 180 min, course longue 90 min ; autres séances vélo120/course75/nage75/support40. Historique fictif de huit semaines à 600 min, pas de conversion TSS→heures.

Ces enveloppes sont des hypothèses de cas coach préenregistrées, pas des capacités mesurées chez une personne ni la preuve qu’une recette précise est tolérée. La force chargée, la tolérance posturale et les temps de nage de chaque geste ne sont pas attestés.

| Profil | VO₂max brute | FTP W | VMA km/h | Allure seuil s/km | CSS crawl s/100 m | TTE effectif / origine | Ordre brut des limiteurs | Décision TFCL calculée |
|---|---:|---:|---:|---:|---:|---|---|---|
| A_aerobic | 40 | 265 | 15 | 290 | 115 | 65 / observed | VLamax > VO2max | Focus Intervalles VO₂max |
| B_sustainability | 60 | 265 | 18 | 235 | 105 | 28 / observed | TTE > VLamax | Focus Volume Z2 / Endurance |
| C_uncertain | None | None | None | None | None | 0 / unknown | TTE | Focus Volume Z2 / Endurance |

## Interprétation et limites

- **A : capacité aérobie relativement limitante.** Le moteur conserve VLamax en premier dans son classement brut et VO₂max en second, puis choisit effectivement le levier VO₂. Aucun ordre souhaité n’est saisi après sortie. Il détecte aussi un conflit critique entre seuil course observé et modèle ; les sept réservations course sont refusées dans la couche V22, sans remplacer l’ancre par une valeur favorable.
- **B : maintien d’intensité vélo limitant.** Le TTE synthétique observé de 28 min est utilisé tel quel. Ce test n’est pas une mesure de durabilité Ironman. La sortie historique « développer la durabilité » reste une formulation brute, pas une preuve. Le conflit course est un avertissement, pas supprimé.
- **C : données manquantes.** La sortie historique contient TTE=0/source unknown et un texte « déficit100% ». V22 refuse de consommer ce zéro comme un déficit physiologique mesuré. Aucune FTP, allure seuil ou CSS de remplacement n’est fabriquée.

## Préenregistrement et transport

`inputs.json` n’a plus changé après le premier passage. Son empreinte figure dans `evidence/preregistration.json` ; `baseline-1/registered-full-inputs.json` a été écrit avant les appels aux diagnostics. Le champ textuel initial `registeredAt` porte un horaire nominal erroné, postérieur au premier passage ; il n’est pas utilisé comme preuve chronologique. Les horodatages réels de fichiers et les entrées complètes conservées rendent cette erreur explicite. Aucun résultat physiologique brut n’a été ajusté pour obtenir les sorties souhaitées.

Le transport expérimental corrige deux problèmes d’interface, sans changer les nombres : `observed` est relayé vers l’énumération existante `OBSERVED`, et la VLamax est calculée depuis un test terrain synthétique via computeVLamaxEffectif plutôt que présentée comme une mesure lactate de laboratoire. Le premier passage, où les deux TTE devenaient38 et la source VLamax était mal qualifiée, reste archivé.
