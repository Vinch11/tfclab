# Fiabilité technique et preuve physiologique indépendante

Aucune équation, calibration, borne de modèle ou convention numérique de confiance n'est remplacée. Les douze empreintes de cœur vérifiées précédemment sont recalculées à l'identique, ainsi que les sources des 37 profils QA et les locks.

## Preuves existantes examinées

| Objet | Acquis conservés | Limite de preuve |
| --- | --- | --- |
| Mader N=44, α=1,98, RMSE 3,7 annoncé | Modèle, protections, tests directs/inverses ; historique d'introduction retrouvé par V2 | Les 44 observations appariées et leur protocole/séparation développement-validation ne sont pas disponibles dans les archives examinées. |
| Sprint P4 N=15, RMSE 0,073 annoncé | Formule et conventions de protocole, tests Profil Express/sprint et historique documentés | Les 15 paires terrain/référence et les conditions exactes ne sont pas reconstituées à partir du commentaire. |
| Modèle C 14+3, RMSE 2,64 annoncé | Prédicteur identique, fixture 17, garde de non-régression, tests de domaine | Un test sur la fixture de développement n'est pas une validation hors échantillon. Le RMSE recalculé antérieurement sur cette fixture diffère du RMSE historique ; aucune correction de coefficient n'en est déduite. |
| Validation individuelle | Les méthodes de terrain et modèles existants restent admissibles selon leurs contrats | Aucune nouvelle comparaison individuelle expérimentale, répétabilité ou marge empirique individuelle n'est établie ici. |

[Registre scientifique V2](../v2/SCIENTIFIC_EVIDENCE_REGISTER.md) et ses commits/archives restent la source du détail historique. V2.2 examine le code et les preuves existantes ; elle ne relance pas une calibration ni une collecte de mesures. Les commentaires « Nov 2026 » ne deviennent pas des dates d'observation. Aucun athlète réel n'est utilisé.

**Calibration**, **validation interne**, **validation hors échantillon** et **preuve individuelle** sont quatre niveaux différents. Une bibliographie ou un calcul reproductible ne suffit pas à établir les deux derniers. Cela n'invalide pas les équations existantes par défaut.

## Mesure, estimation, modèle et inconnue

Les preuves d'entrée et les valeurs effectives sont séparées. La provenance raw n'est plus réattribuée à une estimation du seul fait d'une égalité numérique. Une source de stockage n'établit pas la méthode physiologique. Les dates et méthodes explicitement inconnues restent nulles.

La carte MLSS, le rapport et Essentiels distinguent maintenant proxy vitesse seuil/VMA et prédiction % VO₂max ; le score d'économie ne produit plus le coût affiché dans Essentiels. Les inférences VMA/allure informatives restent étiquetées comme telles et ne remplacent pas un coût explicite pour Modèle C. Un accord interne n'est plus présenté dans ces surfaces comme une validation physiologique.

La confiance d'extraction n'est pas une précision de laboratoire. La confiance numérique des moteurs demeure une convention heuristique ; une marge interne ou un RMSE de cohorte ne devient ni intervalle individuel certifié ni probabilité de succès sportif. Le compteur de complétude porte sur les valeurs **disponibles**, pas uniquement les mesures directes.

**C8 subsiste** : la sélection historique d'un scalar vélo stocké l'associe à la catégorie interne labo et à son libellé/confiance/marge, même sans preuve de méthode. Le nouveau contrat de provenance dit alors `unknown`, mais toutes les cartes legacy ne consomment pas cette distinction. Les sorties sont consultables et les chiffres ne sont pas arbitrairement dégradés ; la qualification du rôle « snapshot staff » doit être décidée avant d'affirmer une chaîne scientifiquement qualifiée de bout en bout. Les valeurs 0,95 et ±0,02 ne sont pas déclarées expérimentalement fausses : leur portée réelle n'est simplement pas démontrée pour toute donnée stockée.

## 25 sorties MLSS et 37 profils

Les entrées QA ne reçoivent aucun coût fictif. Le contrôle V2.1 rejoué compare les 37 sorties à l'archive V2 : mêmes effectifs, limiteurs, readiness, cibles, objets MLSS et alertes. Les 25 changements depuis main sont toujours le retrait de prédictions alimentées par le score ; aucune comparaison nulle n'est promue en `ok`. Pour `B-5K-BEGINNER`, proxy 79,9 conservé, avertissement blessure Élevé conservé et catégorie globale critical conservée ; seul l'avertissement issu de la comparaison invalide disparaît.

La convention existante de repli d'allure à 0,90 × VMA dans les zones reste une **estimation marquée**, pas un MLSS observé ni une conversion score→coût. L'approximation reliant une prédiction % VO₂max à une vitesse reste une hypothèse de modèle historique à qualifier scientifiquement ; aucune équation de zone ou doctrine n'est changée dans ce lot.

Les anciennes notes et traces restent consultables. Les traces à unité inconnue ne sont pas réécrites pour leur faire porter un coût explicite ; les tests d'unités et d'historiques sont rejoués. Les 37 profils ne prouvent pas la validité individuelle d'une prescription, et aucun plan IA payant n'est généré.
