# DET — raccordement des programmes vélo/natation et du triathlon court

Candidat d’ingénierie non prescriptif, à la suite de `fd66314c73ac7801012923299ef354709044d31d` (PR #462). Aucune fusion dans la production TFCLab, aucun envoi Nolio ni attestation scientifique indépendante.

## Périmètre vérifié

| Programme du formulaire partagé | Durée | Disponibilité testée | Priorité effectivement consommée |
| --- | --- | --- | --- |
| Cyclisme FTP | 8 semaines | 7 h, fréquence cycliste déclarée 4 + 1 renforcement | FTP comparée à une cible explicite du coach ; profil cycliste de référence conservé |
| Natation 1500 m / CSS | 8 semaines | 4 h, fréquence natation déclarée 4 + 1 renforcement ; mercredi/samedi indisponibles | CSS comparée à une cible explicite du coach, distincte du TTE |
| Triathlon sprint | 8 semaines | 8 h, fréquence déclarée 8 | VLamax du diagnostic réel de l’app dans le test d’intégration ; VO2max sur le banc V359 |
| Triathlon olympique | 12 semaines | 10 h, fréquence déclarée 9 | VLamax du diagnostic réel de l’app dans le test d’intégration ; TTE sur le banc V359 |

La fréquence déclarée est une entrée du contrat ; les semaines de récupération/affûtage/course sont modulées par le contrat existant. Ces exemples ne prouvent pas toute durée, disponibilité, combinaison de limiteurs ou tous les profils.

Ces quatre clés complètent les huit déjà raccordées : 10 km, semi, marathon, 70.3, Ironman, trail court, trail montagne et ultra. Douze clés de famille ne signifient pas quinze sports : le nombre historique de scénarios couvrait aussi des variantes d’un même objectif.

## Physiologie conservée, cible de programme explicite

Le diagnostic complet reste calculé par le pipeline commun de l’application. Pour les nouveaux programmes dédiés, sa référence est l’objectif existant de l’athlète, explicitement reconnu. Une référence inconnue est refusée : aucun nouvel intitulé n’est normalisé silencieusement en diagnostic 70.3.

La comparaison FTP/CSS est stockée séparément dans `planningGoalContext` avec `origin: explicit_coach_programme_target`, unités, référence actuelle, cible choisie, priorités du profil de référence et `causalLimiterDiagnosis: false`. Le diagnostic original, ses données, ses interdictions et sa décision exécutée sont conservés. La cible n’est ni une nouvelle mesure, ni une identification causale de limiteur, ni une garantie de gain. Les priorités du programme sont explicitement distinguées dans le panneau et l’origine du profil figé. Un changement de cible invalide l’empreinte et les revues liées.

Référence absente, cible absente/invalide/non améliorante, référence incohérente avec l’athlète ou comparaison modifiée : refus. Le formulaire manuel refuse de reconstruire un diagnostic partiel pour ces programmes. Réglage individuel requis dans la page. La table historique de cibles de course de l’IA est ignorée pour ces programmes : pas de cible normative 70.3 empruntée. Aucun appel IA payant dans les tests.

La CSS conserve sa propre clé `css_threshold`. Les allures des autres domaines natation sont déclarées indépendamment avec leur provenance ; pas de transposition automatique entre nages. Les limites sportives existantes restent actives : certains profils conservant des interdictions peuvent encore être refusés si le catalogue ne fournit pas de combinaison conforme.

## Sources et preuves

Les pools contiennent les sources V3 déjà utilisées par les bancs stricts et l’intégration réelle : 28 vélo FTP, 25 natation CSS, 85 sprint et 87 olympique. Leurs empreintes sont figées et recalculées dans V409. Aucune nouvelle séance, dose de source ou qualification scientifique n’est inventée.

La sélection conserve les validations natives, le plafond horaire, la récupération réelle, les horaires sans chevauchement, les phases, décharges mesurées, preuves de qualité exacte et spécificité du pic. Sprint/olympique conservent leurs ratios et quotas propres. VLamax/VMA en priorité triathlon court utilisent une preuve liée aux sources course, avec audit de couverture de 30 % des séances clés ; aucune adaptation physiologique mesurée n’est affirmée.

La revue normale du coach montre les blocs et doses par séance. Chaque composition sprint/olympique demande une confirmation distincte, après lecture des deux sources, pour une transition explicite de 3 minutes. Les compositions et la relecture exacte de l’enregistrement sont conservées séparément dans le stockage append-only existant. Aucune approbation humaine n’est cochée automatiquement.

## Contre-la-montre : point ouvert explicite

`Cyclisme FTP` n’est pas renommé en contre-la-montre. Le CLM a un refus distinct `cycling_tt`, indiquant le contrat manquant : durée d’épreuve et position aéro, avec banc sportif strict dédié. Des sources aéro existent déjà dans V3 (notamment BIKE_057, BIKE_087 et BIKE_088), mais leur présence seule ne prouve pas une préparation CLM complète ni une tolérance individuelle à la position.

Les tests V409 et les tests d’intégration partent de données/revues synthétiques explicitement réservées aux tests. Les modules actifs n’importent pas ces fixtures. La validation des vrais dossiers et l’attestation de publication restent séparées.
