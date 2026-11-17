# 100%lab — graphiques recalés sur Nolio et TFCL

## Objectif
Les graphiques du 100%lab doivent ressembler à l'athlète : des courbes recalées sur ses vraies données Nolio et ses résultats TFCL, plutôt que des courbes génériques.

## Ce qui sera corrigé
1. **Lactate** : revoir le calcul de production et d'élimination pour que les deux courbes se croisent au MLSS, comme dans un vrai profil métabolique. Le calcul sera vérifié sur les profils de référence existants avant d'être affiché.
2. **Seuils** : LT1, MLSS et FatMax seront recalculés à partir du modèle recalé, puis comparés aux valeurs du bilan. Un écart important sera signalé.
3. **Valeurs incohérentes** : un contrôle croisé vérifiera FTP, VO₂max, VLamax, records et tests. Les contradictions seront montrées, jamais masquées.
4. **Courbes trop lisses** : les points réels de l'athlète seront affichés et serviront à ajuster la courbe.

## Données Nolio utilisées
- **Courbe puissance-durée** : meilleurs efforts de 1 s à 60 min sur la période choisie. Ils servent à recaler VLamax, VO₂max et la puissance au seuil.
- **Fréquence cardiaque** : relation FC/puissance et FC/allure sur les séances stables, pour placer LT1 et le seuil.
- **Dérive aérobie** : découplage FC/puissance sur les sorties longues, pour placer LT1 et FatMax.
- **Séances de test** : les tests repérés sont analysés un par un, avec le même badge que le remplissage du bilan (test trouvé / à vérifier).

## Recalage
- Le modèle TFCL est ajusté pour coller au mieux aux données Nolio, avec un indicateur d'écart entre le modèle et le réel.
- Le recalage reste propre à la page 100%lab : il ne modifie ni le bilan, ni le Compass, ni les plans.
- Course et vélo restent séparés : aucune valeur vélo ne passe en course.

## Vérification
- Emanuela et Vince, vélo et course, ordinateur et téléphone.
- Tests sur le croisement du lactate, l'ordre des seuils et le recalage.

## Détails techniques
- Lecture Nolio côté serveur avec la liaison athlète déjà stockée (fonctions existantes) : courbe puissance-durée et séries FC/puissance des séances récentes, résumées par minute.
- Ajustement par moindres carrés de VO₂max, VLamax et du coefficient d'élimination du modèle Mader sur la courbe puissance-durée, borné par les garde-fous existants.
- Pas d'écriture en base. Le design Bevel est conservé.
