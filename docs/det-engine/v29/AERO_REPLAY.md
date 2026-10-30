# Aéro :85 et90minutes restent deux scénarios

DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.

| Scénario | Travail | Repos | Exécution s | Réservation s | Dépassement s | Bloc sans nouveau défaut |
|---|---|---|---|---|---|---|
| aero_between | 6×600s | 5 | 5100 | 5100 | 0 | oui |
| aero_after_each | 6×600s | 6 | 5400 | 5100 | 300 | non |
| aero_unknown | 6×600s | inconnu | inconnu | 5100 | inconnu | non |


Les événements de travail et récupération conservent leurs cibles de puissance V28 calculées par la doctrine existante depuisFTP265W. Aucun passage à4×15min, aucune nouvelle tolérance posturale, aucune récupération finale choisie d’après la taille du créneau.

La convention entre répétitions fait85min et ne crée pas de nouveau défaut de bloc. Après chaque répétition,90min dépassent le créneau85min de300s : refus conservé. Sans convention, le total reste inconnu. Le fait qu’un scénario de test soit techniquement transportable ne constitue ni choix de convention par le coach ni approbation individuelle.
