# Compass : comparer le profil à un objectif explicite

## Résultat et périmètre

Le panneau principal compare un chrono choisi par le coach aux capacités renseignées et aux résultats déjà stockés. Les scores historiques restent accessibles, mais ne sont plus présentés au premier plan comme un taux de préparation. Le temps prédit est renommé « Projection du profil ».

L'objectif est sauvegardé dans `athlete.refs.compassPerformance[objectif:ambition]`, via la mise à jour d'athlète existante et ses contrôles d'accès. Une modification d'athlète ou d'ambition ne réutilise pas le brouillon précédent. Pas de migration SQL, service payant, envoi Nolio ni modification des plans.

## Les quatre chantiers

1. **Références extraites** : cinq groupes marathon Gordon 2017 et cinq groupes semi Nikolaidis/Knechtle 2023. Le registre expose effectif global, sexe, âge disponible, protocole, source et limites. Les valeurs sont des moyennes et écarts-types observés, jamais des percentiles ou minima requis. Assis 2024 (13 triathlètes) et Hunter/Muniz-Pumares 2025 (18 marathoniens) documentent les limites du transfert et l'intérêt de mesurer la durabilité.
2. **Profils par performance** : sélection par chrono explicite sur la même épreuve, pas par correspondance arbitraire « compétiteur → moyenne ». Les groupes semi masculins ne sont pas appliqués aux femmes. Aucune référence adulte pour un mineur ou un âge absent. L'âge affiché n'est pas un ajustement statistique. Les données actuelles ne constituent pas une norme par âge/sexe.
3. **Capacités confrontées** : allure cible, fraction de VMA, écart au seuil et chrono enregistré sur la même distance. Pour un triathlon, seul un split course explicite permet le calcul d'allure. Un modèle de sensibilité marathon combine vitesse et coût en oxygène publié ; ce n'est pas une exigence de VO₂max. L'économie réelle, la tenue après fatigue et les autres disciplines restent à confirmer. Le score d'économie existant n'est jamais traité comme un coût en oxygène.
4. **Lecture coach** : écarts en unités réelles, incohérences à vérifier, observations manquantes, sources accessibles. Le verdict « limitant probable » nécessite des observations indépendantes : VMA et ratio dérivé seuil/VMA ne comptent plus comme deux preuves. Les extrapolations ne suffisent pas à ce verdict.

## Traçabilité numérique

- [Gordon et al., 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5703178/), DOI 10.2147/OAJSM.S141657, tableau 1. 97 coureurs, 63 hommes/34 femmes, âge 42,4 ± 9,9 ans. Groupes 150–180, 180–210, 210–240, 240–270, >270 minutes. VO₂max : 63,3±7,7 ; 55,7±4,8 ; 53,2±4,6 ; 53,0±8,6 ; 46,5±5,2. Vitesse LT2 : 15,5±0,7 ; 13,8±0,7 ; 13,1±1,6 ; 12,7±2,1 ; 10,9±1,2 km/h. Coût au LT2 : 204,2±17,3 ; 205,2±10,0 ; 208±14 ; 204,4±7,7 ; 214,3±13,7 ml/kg/km. Convention informatique aux bornes partagées : intervalle fermé à gauche, ouvert à droite ; ce choix ne prouve pas une rupture physiologique.
- [Nikolaidis & Knechtle, 2023](https://www.excli.de/vol22/2023-6198/2023-6198.htm), DOI 10.17179/excli2023-6198, [tableau 1 original](https://www.excli.de/vol22/2023-6198/2023-6198.t1.png). 134 hommes, déjà marathoniens, 44,2±8,7 ans. Semi 73–92 (n27), 93–99 (n27), 100–107 (n27), 108–117 (n27), 118–160 min (n26). VO₂max : 54,5±7,5 ; 51,9±5,8 ; 48,1±7,0 ; 45,7±6,3 ; 41,3±7,0. Les interstices entre intervalles publiés ne sont pas interpolés. Pas de transfert aux femmes ni de normes primo-finisher.
- [Assis et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC10950087/), DOI 10.2147/OAJSM.S453875, tableau 2, premier temps : VO₂max 56,3±5,56 ; vitesse aérobie maximale 16,69±1,65 km/h. Tapis, pas vélo. Sans strate de chrono ou de classement : aucune cible « podium IM » dérivée.
- [Hunter & Muniz-Pumares, 2025](https://onlinelibrary.wiley.com/doi/10.1002/ejsc.70073), DOI 10.1002/ejsc.70073. 18 marathoniens ; seuil avant/après 90 min 12,8±2,0 → 12,1±2,2 km/h. Contexte de durabilité, sans seuil individuel universel.

## Ce qui n'est pas démontré

Pas de percentile physiologique par catégorie d'âge ni de profil idéal universel ; pas d'estimation validée de probabilité de podium ; pas d'attribution causale automatique du chrono à un facteur. La relation « meilleur profil → meilleure performance » ne suffit pas à prouver qu'améliorer une métrique donnée fera gagner un temps déterminé.

Les chronos de classement exigeraient un jeu de résultats documenté par épreuve, année, sexe et catégorie. Les normes physiologiques conditionnelles exigeraient des observations individuelles suffisamment nombreuses, puis une validation hors échantillon. Les cohortes publiées actuellement intégrées ne fournissent pas cette couverture. Aucun diagnostic individuel d'Emanuela n'a été validé dans cette recette synthétique.

## Validation

Tests des frontières, sexe/âge, valeurs manquantes, séparation objectif/prédiction, absence de transfert triathlon, sauvegarde et isolation d'athlète, et indépendance des preuves. Le test de dépendances interdit aux nouveaux comparateurs d'alimenter les moteurs IA/DET ou le classement des limiteurs. Le harness navigateur utilise uniquement deux athlètes fictifs et n'est accessible qu'en développement.

## Extension à tous les objectifs de l'application

Les 13 objectifs disposent d'une lecture propre : IM, 703, Sprint, Olympic, 5K, 10K, Semi, Marathon, StartToRun, Trail, TrailShort, TrailMountain, TrailUltra.

- Triathlon : splits natation/vélo/course, somme compatible avec le chrono total, temps restant pour transitions ; allure natation face à la CSS, vitesse vélo descriptive et puissance envisagée par le coach face à la FTP. Pas de conversion automatique vitesse → watts ni de pourcentage de préparation. Les formats affichés sont des distances de référence, à vérifier pour l'épreuve réelle.
- Route courte : allure cible, VMA, seuil et performance enregistrée sur la même distance ; aucune cohorte marathon appliquée au 5 ou 10 km.
- Trail : distance et D+ saisis, moyenne descriptive, exigences de montée/descente/technicité et fatigue. Aucun équivalent plat supposé.
- StartToRun : durée continue visée et tolérance/récupération à vérifier, sans distance arbitraire ni norme de compétition.

[Barbosa et al. 2023](https://www.mdpi.com/2227-9032/11/4/622), tableaux 1–2 : 20 femmes et 20 hommes en triathlon olympique. Femmes : âge 42,7±7,3 ans, VO₂max 49,7±7,6, MAS 14,9±1,8 km/h, chrono 9489±1357 s. Hommes : 43,7±9,3 ans, VO₂max 54,6±5,0, MAS 17,1±1,6, chrono 8825±920 s. Mesures sur tapis et groupes descriptifs par sexe, sans seuil de podium, transfert Ironman ni percentile d'âge.

[Étude trail 2019](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.00506/full) : 17 coureurs entraînés, tests en laboratoire et terrain. Elle justifie d'examiner séparément montées et descentes ; elle ne fournit pas une cible physiologique universelle pour un ultra.

Cette extension couvre les parcours de comparaison, pas une validation scientifique universelle des cibles. Les normes conditionnelles manquantes restent explicitement manquantes.

## Interprétation du bilan métabolique

Le test de sprint avec prélèvement renseigne sur l’accumulation de lactate sanguin dans la discipline testée. Une estimation par puissance ou allure reste visible et demande une confirmation. Le classement automatique écarte aussi le FatMax calculé à partir du même profil et les durées au seuil déduites de la charge ou des records. Une observation indépendante de FatMax conserve sa place si sa provenance est renseignée. Les cibles internes servent à proposer au coach des facteurs à examiner.

- Wackerhage, Kabasakalis, Seiler & Heck (2025). Distinction entre modèle musculaire, accumulation sanguine et protocole de sprint. [Sports Medicine](https://doi.org/10.1007/s40279-025-02259-6).
- Poffé, Van Dael & Van Schuylenbergh (2024). Comparaison du MLSS à vélo avec des essais à charge constante. Les méthodes décrivent 31 cyclistes recrutés et 29 analysés après deux exclusions. Biais moyen de +4,6 W, écarts individuels de 3,1 à 7,3 % chez 12 participants. La précision propre à TFCLab reste à déterminer. [Frontiers in Sports and Active Living](https://doi.org/10.3389/fspor.2024.1376876).
