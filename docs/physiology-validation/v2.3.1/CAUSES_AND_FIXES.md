# Cinq causes et correctifs ciblés

## A1 — catégorie technique prise pour méthode

`isLabMeasuredVlamaxTest`, `isLabMeasuredVlamaxSnapshot` et le résolveur utilisaient des mots-clés, parfois le seul type LAB. Les noms historiques des helpers sont conservés, mais leur décision utilise désormais `hasDocumentedLactateReference` : le qualificateur vérifie le sujet courant, la discipline, la quantité, l'unité, la valeur, la méthode, la date d'observation et les références de source/mesures primaires. Seul un protocole lactate dérivé cohérent déclenche cette priorité CAP.

Les voies de calcul existantes restent disponibles. Les références brutes classifiées restent des replis consultables lorsqu'aucun modèle admissible n'est disponible. Aucun coefficient, formule ou poids de l'estimateur n'est changé. Le résolveur restitue la qualification séparément ; le mapper de cycle la conserve et le prédicteur d'adaptation reçoit la provenance du snapshot. Les imports de notes structurées emploient le lecteur existant, sans migration.

Le scalar vélo Staff conserve sa convention interne historique de sélection et de confiance ; elle n'établit toujours aucune preuve laboratoire ou admissibilité individuelle. Cette conservation est distincte du défaut CAP de priorité textuelle.

## A2 — identité attendue fournie par le cache lui-même

`requalifyReference`, `scientificReferenceLabel` et l'incertitude reçoivent désormais le sujet externe explicitement. L'identité et la discipline ne sont plus déduites de la qualification à vérifier. En l'absence de contexte courant, repli unknown / not_established.

Les consommateurs directs — carte unifiée, carte V2, graphique, enveloppes/badges, recommandations et rapports/exports — transmettent le contexte courant lorsqu'il est disponible. Les anciennes signatures restent appelables, mais sans ce contexte elles ne peuvent plus déclarer une provenance documentée. Cela peut réduire la richesse d'un libellé dans une intégration ancienne ; cela ne modifie pas la valeur ni son score interne valide. Les parents qui n'ont pas d'identité ne doivent pas la reconstruire à partir de la preuve stockée.

## A3 — nature confondue avec origine

Le mapper partagé `qualifiedScientificOrigin` utilise la méthode qualifiée : terrain → field_estimate ; modèle → model_inference ; coach → coach_declared ; incomplet → unknown. Une VLamax dérivée d'un protocole lactate est une inférence calculée/estimée issue des mesures primaires, pas une mesure directe du flux glycolytique. La méthode détaillée reste dans la qualification. Le modèle de nature estimated reste model_inference. L'enveloppe d'un modèle documenté reste MODELLED, même si sa nature est estimated.

## A4 — confiance dans la forme TypeScript d'un JSON

Le normaliseur d'enveloppe valide à l'exécution objet/primitive, listes de raisons/recommandations, bornes finies ordonnées, valeur et score, chaînes et identifiant de métrique. Les qualifications primitives/tableaux/corrompues ne sont pas des preuves. Une unité affichée incompatible ne peut pas hériter de la qualification. Les notes non textuelles ne déclenchent plus split lors de leur lecture.

Le normaliseur produit une nouvelle vue. Aucun cache ou historique n'est réécrit ; les nombres et scores valides sont conservés. Une valeur absente/invalide devient indisponible dans la vue. Aucun catch générique n'absorbe une erreur du moteur physiologique.

## A5 — terminologie partiellement corrigée

Le titre et la description de LabAthleteValidator contredisaient son champ déjà nommé « référence déclarée ». Ils distinguent maintenant mesures primaires de lactate, VLamax dérivée, import et validation indépendante. Cette carte est accessible depuis LiteratureCohortPage ; le test rend le composant réel.

## Tests historiques, sans modification des entrées scientifiques

Les archives et les 37 profils ne sont pas réécrits. Les assertions anciennes qui exigeaient la priorité d'une simple mention lab sont corrigées explicitement, en gardant leurs entrées : deux contrôles du résolveur deviennent des contrôles négatifs de priorité/boost ; la déclaration V2.1 reste attachée au brut et ne qualifie pas une autre valeur de modèle ; le stockage V2.2 reste attaché au brut et n'est pas transmis à un résultat différent. Le rendu documentaire positif V2.3 reçoit désormais l'identité courante explicite ; le test Chromium fournit aussi l'identité externe au rapport. Les nombres de ces fixtures ne sont pas modifiés pour obtenir des tests verts.

Les fichiers QA de référence, leurs hashes et leurs oracles numériques restent inchangés. Les nouvelles références documentaires sont uniquement des fixtures synthétiques explicites, pas de nouvelles observations scientifiques.
