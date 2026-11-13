# Courbes de tests — données réelles

- Section « Mesures de chaque test » dans le profil Expert : filtres vélo/course, sélection du test et de la mesure, comparaison des tests au même protocole enregistré.
- Observations issues uniquement de `tests.raw`, limitées à l’athlète. Seuil course/puissance cible repris du test lui-même, jamais du bilan actuel.
- Séries `streams.time`, `watts`, `speed` avec unités explicites, `heartrate` : valeurs manquantes conservées ; watts vélo non transposés en course.
- Tentatives sprint affichées par tentative, sans inventer une chronologie ou des concentrations de lactate.
- Les tests actuels de Vince/Emanuela contiennent essentiellement des résumés. Vince dispose de tentatives sprint de 115 m et 83,3 m, comparées dans l’écran ; son seuil 277 s/km et TTE déclaré 35 min n’ont pas de série temporelle enregistrée. Emanuela dispose d’un résultat vélo de 276 W sans série.
- Capteurs inconnus explicités ; même protocole enregistré ne certifie pas conditions/étalonnage comparables. L’évolution réelle complète nécessite les séries originales des tests : elles ne sont ni inventées ni téléchargées automatiquement.
- 13 tests unitaires réussis. Vince comparaison réelle et Emanuela état résumé vérifiés connectés sur ordinateur/téléphone, sans erreur ni débordement. Fonctions des deux générateurs déployées avec succès ; aucun test/bilan/plan modifié, pas de publication.