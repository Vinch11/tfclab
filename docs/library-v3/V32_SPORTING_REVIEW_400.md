# TFCLab — V3.2 : qualification sportive individuelle des 400 recettes

**31 octobre 2026 — branche expérimentale PR #448 → PR #446.**

## Portée et limites des preuves

Cet audit est une **préqualification sportive source par source**, non une validation
scientifique indépendante ni une autorisation de prescription à un athlète réel.
Il traite 400 fiches uniques, à partir de leurs **blocs effectivement structurés**,
pas du titre seul ni d'un catalogue fictif. Les empreintes de sources sont des
contrôles de dérive reproductibles, **pas des signatures scientifiques**.

| État de source | Nombre | Signification |
|---|---:|---|
| `source_prequalified_pending_coach_review` | 397 | Structure, cible physiologique et prérequis de source suffisamment cohérents pour ouvrir une revue individuelle; **aucune approbation athlète** |
| `source_blocked` | 3 | Stimulus source non justifiable tel que libellé : accès refusé au pilote, même avec accord coach |
| Prescription prête à publier sans validation du calendrier | **0** | Interdit par contrat, quel que soit le profil |

Chaque ID possède sa propre entrée dans
[`v32SportingReviewLedger.json`](../../scripts/library-v3/v32SportingReviewLedger.json):
sport, titre, intention, domaine, cible physiologique, plancher de niveau, phases,
récupération, chronologie du bloc principal, repères personnels nécessaires,
préconditions de sécurité, motifs de blocage et contrôle de dérive.

### Trois refus documentés, à ne pas contourner

- **`V3P_BIKE_024`** : `neuromuscular` pour une activation contrôlée de
  **60 secondes**, non maximale. Une telle séance ne prouve pas la production
  d'un stimulus alactique pur; corriger le domaine/intention nécessite un
  arbitrage sportif sur l'objectif d'affûtage, pas un simple renommage.
- **`V3P_SWIM_020`** : répétitions **50 m rapides et techniques**, sans preuve
  de temps d'effort compatible avec une séance strictement alactique.
- **`V3P_SWIM_083`** : sprint **50 m** avec récupération longue. La distance
  seule ne prouve pas le caractère exclusivement neuromusculaire du stimulus.

Pour ces trois sources : **NO-GO source**. La source doit être corrigée et
réauditée, ou rester écartée. Ne pas relâcher le contrôle pour obtenir 400/400
verts.

### Vingt-cinq corrections sportives de fiches déjà effectuées

- **11 séances sous-seuil** reclassées en `sub_threshold` au lieu de
  `mlss` : le domaine physiologique et l'intention sont cohérents. Le
  regroupement informatique large « seuil » ne rend PAS ces séances
  équivalentes à du MLSS mesuré.
- **`V3P_BIKE_009`** : over-under avec tempo + VO₂max requalifié en
  `mixed_intensity`, et exclu des substitutions automatiques réservées à
  un stimulus VO₂ ou seuil unique.
- **`V3P_STRENGTH_016`** : Copenhagen / adducteurs isométriques
  reclassés en `strength_endurance` plutôt qu'en force maximale.
- **11 fiches tests** sans conditions de protocole complétées :
  consignes coach, standardisation de mesure et sécurité de la discipline.
  Les tests CSS 400 m et 200 m séparés ne prouvent PAS seuls une CSS;
  l'utilisation des composants exige la preuve d'un protocole couplé.
- **20 fiches renforcement pilotes** : matériel requis explicité;
  **27 artéfacts de précision** proches d'une seconde entière normalisés
  (5 fiches) sans augmenter la charge.

## Prescription individuelle : contrat strict

[`qualifyForAthlete.ts`](../../scripts/library-v3/qualifyForAthlete.ts)
vérifie, pour chaque recette soumise :
1. accord explicite du coach **pour cette fiche et cet athlète**;
2. niveau d'entraînement déclaré, objectif/phase, état de fatigue, charge
   qualitative et risque de blessure examiné;
3. preuve de revue de chaque prérequis, contre-indication et règle d'arrêt;
4. équipement, surface/terrain, nage surveillée et tolérance aux impacts;
5. repères physiologiques ou, pour un test de terrain, protocole d'effort
   contrôlé (le test peut précisément servir à découvrir le seuil manquant);
6. secondes d'exécution vérifiées; pas de CSS, tempo répétition, FTP ou durée
   supposés et pas d'arrondi silencieux en minutes pour l'ancien moteur.

Le résultat éventuellement positif est **`individual_candidate_requires_full_plan_validation`** :
il autorise seulement le passage au moteur de calendrier, pas un export.
La sortie indique **`publishable=false` dans tous les cas**.

Les validations encore indispensables dans DET-ENGINE sont la récupération
*entre* séances avec horaires fiables, la charge et progression hebdomadaires,
la répartition sportive, les séances-clés, les décharges, les limiteurs réels,
les contraintes de blessure et le jour de course. Aucune case de la V3 ne
dispense de ces contrôles.

## Audits et non-régression

- 400/400 sources et fiches du registre, source diff interdite sans dossier de
  revue mis à jour.
- Contrat scientifique V3.1, classes physiologiques distinctes, doses exactes,
  plages et intensités non inventées, refus des inconnues.
- Scénarios synthétiques : absence d'accord coach pour les 400; exemple vélo
  admis **uniquement comme candidat**; source bloquée; 70.3 appliqué à IM;
  test CSS non couplé; contre-indications non examinées; empreinte altérée.
- Atelier coach autonome synchronisé à l'identique avec les 400 sources;
  les trois sources bloquées ne peuvent être ajoutées/restaurées en brouillon.
- Ancien adaptateur pilote : source bloquée ou durée fractionnaire non
  arrondie, refus explicite. Les anciens fichiers sources restent candidats.

**Verdict sportif : 397 sources préqualifiées sous conditions, 3 bloquées,
0 autorisation individuelle attestée. NO-GO prescription réelle et production
jusqu'aux validations coach et DET-ENGINE séparées.**

Aucun changement des équations de profilage physiologique, aucune migration,
aucun envoi Nolio, aucune écriture Supabase, aucune fusion.
