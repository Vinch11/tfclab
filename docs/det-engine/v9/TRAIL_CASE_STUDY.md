# Cas pilote — Trail montagne

Données et observations entièrement synthétiques. Calendriers partiels d’une semaine ; aucun plan de course complet ni validation experte.

## Trail_known_history

Objectif :TrailMountain, ambition :competitor, niveau :trained. Diagnostic conservé :`{"executed": true, "confidenceGlobal": 0.5, "dataCompleteness": 0.6, "limiters": [{"metric": "TTE", "priority": 1, "status": "limiting", "value": 45, "target": 57, "weightedImpact": 17.89473684210526}], "uncertainty": ["Données physiologiques incomplètes (60%).", "Confiance diagnostique limitée (50%)."]}`.

Témoin existant :`synthetic-v4:TrailMountain:trained` / `conservative_taper`, 16semaines ; empreinte `c339fb079ee1e1e75ca7b26b5822972c9c44d1331a00b9501af7218902c57ccf`. Mêmes entrées athlète :True, même diagnostic :True. Les différences de contraintes, courses intermédiaires et historique sont conservées dans le JSON. Aucune comparaison entre une semaine et le plan entier n’est présentée comme gain de conformité.

| Jour | Prescription source choisie |
|---|---|
| Lundi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Mardi | A_RUN_Z2_EASY · 35min · zones sourceZ1,Z2 |
| Mercredi | D_TR_REST_MOBILITY · 15min · zones sourceZ1 |
| Jeudi | SEILER_RUN_Z1_EASY_LONG · 70min · zones sourceZ1,Z2 |
| Vendredi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Samedi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Dimanche | Sans dose prescrite ; ne prouve pas une récupération observée |

Volume proposé :120min ; fréquences physiques :`{"swim": 0, "bike": 0, "run": 2, "strength": 1}`. Contraintes mécaniques exécutées :`[]`. Obligations manquantes :`[{"sport": "run", "required": 4, "placed": 2}]`. Prescription complète :**refusée**.

Erreurs historiques sur le préfixe :
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- warning · race_day : ⚠️ Race Week sous-peuplée — S1 : seulement 3 séance(s) réelle(s) sur 4 attendues
- warning · session_density : S1: 3 séances vs cible coach 5 (Δ-2)
- error · lorang_categories : S1 : aucune séance Lorang A (HIT) ni B (seuil) — chaque semaine hors décharge doit en contenir au moins 1
- warning · trail_dplus_presence : 2/2 séances CAP/Trail sans D+ chiffré — chaque séance trail doit mentionner le D+ cible (OBLIGATOIRE, systemPrompt.ts)
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "V9 one-week prefix, not a complete race plan"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage

Les erreurs de couverture/calendrier de compétition attestent notamment que le préfixe n’est pas un plan complet. Les erreurs de dose, continuité, catégories ou quotas restent également visibles ; elles ne sont pas annulées par les passes mécaniques.

Feedback :21scénarios indépendants et1trajectoire séquentielle. Toute observation est étiquetée synthétique. Les profils refusés n’ont pas de réponse à une séance non prescrite simulée.

Proposition rejetée :{'source': 'SEILER_RUN_Z1_EASY_LONG', 'minutes': 70} → {'source': 'A_RUN_Z2_EASY', 'minutes': 35}. Non-régression critique :False. Action effective :coach_review. Aucune application.
## Trail_unknown_history

Objectif :TrailMountain, ambition :competitor, niveau :trained. Diagnostic conservé :`{"executed": true, "confidenceGlobal": 0.5, "dataCompleteness": 0.6, "limiters": [{"metric": "TTE", "priority": 1, "status": "limiting", "value": 45, "target": 57, "weightedImpact": 17.89473684210526}], "uncertainty": ["Données physiologiques incomplètes (60%).", "Confiance diagnostique limitée (50%)."]}`.

Témoin existant :`synthetic-v4:TrailMountain:trained` / `conservative_taper`, 16semaines ; empreinte `c339fb079ee1e1e75ca7b26b5822972c9c44d1331a00b9501af7218902c57ccf`. Mêmes entrées athlète :True, même diagnostic :True. Les différences de contraintes, courses intermédiaires et historique sont conservées dans le JSON. Aucune comparaison entre une semaine et le plan entier n’est présentée comme gain de conformité.

| Jour | Prescription source choisie |
|---|---|
| Lundi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Mardi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Mercredi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Jeudi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Vendredi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Samedi | Sans dose prescrite ; ne prouve pas une récupération observée |
| Dimanche | Sans dose prescrite ; ne prouve pas une récupération observée |

Volume proposé :0min ; fréquences physiques :`{"swim": 0, "bike": 0, "run": 0, "strength": 0}`. Contraintes mécaniques exécutées :`[]`. Obligations manquantes :`[{"sport": "run", "required": 4, "placed": 0}, {"sport": "strength", "required": 1, "placed": 0}]`. Prescription complète :**refusée**.

Erreurs historiques sur le préfixe :
- error · key_sessions : S1: Aucune séance clé détectée (attendu: 2-4 séances d'intensité/semaine)
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- warning · race_day : ⚠️ Race Week sous-peuplée — S1 : seulement 0 séance(s) réelle(s) sur 4 attendues
- error · session_density : S1: 0 séances vs cible coach 5 (Δ-5) — hors tolérance ±1
- warning · strength_sessions_requested : S1: 0 séance(s) de renforcement vs 1 demandée(s) par le coach (Δ-1)
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "V9 one-week prefix, not a complete race plan"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage

Les erreurs de couverture/calendrier de compétition attestent notamment que le préfixe n’est pas un plan complet. Les erreurs de dose, continuité, catégories ou quotas restent également visibles ; elles ne sont pas annulées par les passes mécaniques.

Feedback :0scénarios indépendants et0trajectoire séquentielle. Toute observation est étiquetée synthétique. Les profils refusés n’ont pas de réponse à une séance non prescrite simulée.

Objectif existant :55km,3000D+/2800D−, terrain rocheux, durée déclarée540min. Historique connu :420min/semaine pendant8semaines dans la fixture. Tolérance verticale/excentrique individuelle inconnue : longue sortie spécifique refusée. Les propositions génériques sont un soutien hors exposition verticale attestée, pas une préparation montagne suffisante. Le TTE45min ne justifie pas à lui seul une dose au seuil ; celle-ci reste refusée. Le témoin sans historique n’est pas rendu admissible par le niveau déclaré.
