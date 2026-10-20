# P0 B-5K — décision coach avant activation (2026-10-18)

Statut : **diagnostic uniquement**. Aucun blocage de génération, aucune modification des séances.

## Constats issus du plan historique du 17/10/2026

La fixture réduite conserve uniquement les séances CAP (jour, durée, titre). Elle ne permet **pas** d'évaluer la charge interne, la densité exacte des fractions, les douleurs, la récupération ni la conformité clinique.

| Signal | Constat | Décision QA provisoire | Condition avant blocage |
|---|---|---|---|
| S1 volume | 115 min CAP, plafond provisoire 72 min | Alerte critique de cohérence | Vérifier que `week1HoursMax` couvre bien la CAP seule, et la valeur d'entrée du profil |
| S3→S4 | 65→125 min CAP | Alerte de progression | Exclure ou contextualiser les semaines de décharge, comparer charge aiguë/historique |
| Over-Under | 6 séances dans le cycle | Revue prioritaire pour débutant | Classifier la structure réelle, pas seulement le titre ; intégrer dose, intensité et phase |
| Seuil norvégien | 2 séances | Revue prioritaire | Vérifier durée de travail au seuil, récupération et progression |
| S1 décharge | Footing de décharge | Signal sémantique, non preuve d'erreur | Historique d'entraînement / fatigue disponible |
| S12 fréquence | 4 sorties CAP incluant la course objectif | Alerte de quota | Définir si la compétition compte dans `sessionsPerWeek` ; considérer les séances très courtes de taper |
| Renforcement | Exclu de la fixture CAP | Non évalué | Définir séparément quota et volume CAP/renforcement/total |

## Contrats à arbitrer

1. **`sessionsPerWeek`** : nombre de séances d'endurance (avec `strengthSessionsPerWeek` en supplément) **ou** total incluant le renforcement ? Ne pas bloquer tant que ce contrat n'est pas établi par le code et la décision coach.
2. **`volumeRamp.week1HoursMax`** : plafond total multisport, plafond CAP ou volume d'endurance ? L'auditeur P0 utilise actuellement un paramètre distinct `week1RunHoursMax`, sans présumer l'équivalence.
3. **`weeklyIncreasePctMax`** : comparaison naïve S(n)/S(n-1) ou enveloppe de progression tenant compte des semaines allégées ? L'auditeur émet un avertissement, jamais un rejet.
4. **Compétition** : intégrer la course à la fréquence et au volume, mais documenter les exceptions éventuelles des semaines d'affûtage.
5. **Séances exigeantes** : la regex actuelle est un *détecteur de candidats* ; un contrôle de sécurité actif doit exploiter la structure finale et la dose.

## Portes de sortie avant production

- CI entièrement verte ; les 6 `it.todo` ne valent pas des tests réussis.
- Fixture complète anonymisée et comparaison à la sortie finale `mergedPlan`.
- Tests de cas limites : décharge et rebond, semaine course, séance courte d'activation, renforcement supplémentaire, absence d'historique, volume nul.
- Contrats de fréquence et de charge validés ; revue coach des faux positifs/faux négatifs.
- Toute politique de blocage devra être une PR distincte, avec contrôle de non-régression sur profils entraînés et triathlon.

**Conclusion :** les anomalies détectées justifient une revue sportive du plan B-5K, mais la fixture réduite et la convention CAP-only ne permettent pas encore une décision automatique de rejet.
