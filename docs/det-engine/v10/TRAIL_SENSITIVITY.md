# Sensibilitétrail — tolérance synthétique documentée ou inconnue

Même fixtureV4 TrailMountain trained/competitor :55km,3000D+/2800D−, terrain rocheux. Le volume récent existant borne le microcycle à420min, sous600min de disponibilité. Aucune ancienne donnée n’est remplie.

La variante documentée ajoute séparément une enveloppe fictive préenregistrée :8semaines, maximum de séance180min/1000D+/1000D−, maximum hebdomadaire2000D+/2000D− et espacement de deux jours entre expositions verticales connues. Ces nombres sont des limites de cas coach fictif, pas des seuils universels de sécurité.

Sans preuve de tolérance, le domaine de la longue séance spécifique reste vide et le microcycle est refusé. Avec preuve synthétique, la longue source montagne devient admissible et les cinq rôles peuvent être placés.

## Trail_documented

Statut technique :constructed. Budget déclaré :600min ; plafond exécuté :420min ; utilisation :420min ; reliquat :0min.

| Jour | Séances source, dose et rôle |
|---|---|
| Lundi | Aucune dose programmée ; ne prouve pas une récupération observée |
| Mardi | A_TR_SL_MONTAGNE_BASE · 180min · long · zonesZ1,Z2 |
| Mercredi | D_TR_REST_MOBILITY · 15min · skill · zonesZ1 |
| Jeudi | A_RUN_Z2_EASY · 65min · endurance · zonesZ1,Z2 |
| Vendredi | Aucune dose programmée ; ne prouve pas une récupération observée |
| Samedi | SEILER_RUN_Z1_EASY_LONG · 70min · endurance · zonesZ1,Z2 |
| Dimanche | LYDIARD_RUN_AEROBIC_BASE_LONG · 90min · endurance · zonesZ1,Z2 |

| Rôle | Adaptation hypothétique | Dose min/choisie/max | Priorité |
|---|---|---|---:|
| Trail_documented:run:0 | aerobic foundation plus terrain specificity; not direct threshold-dose or measured durability | 120/180/180 | 0 |
| Trail_documented:run:1 | aerobic foundation plus terrain specificity; not direct threshold-dose or measured durability | 35/65/90 | 1 |
| Trail_documented:run:2 | aerobic foundation plus terrain specificity; not direct threshold-dose or measured durability | 70/70/90 | 1 |
| Trail_documented:run:3 | aerobic foundation plus terrain specificity; not direct threshold-dose or measured durability | 90/90/90 | 1 |
| Trail_documented:strength:0 | movement support, no force-dose efficacy claim | 15/15/25 | 12 |

Les minima sont réservés avant les extensions ; chaque extension et le reliquat sont enregistrés dans allocationLog. Les contrôles de phase, catalogue, niveau, contexte source et prérequis restent actifs. Les domaines d’intensité sont ceux de la doctrineTFCL.

Contrôles candidat :[]. Couverture :unknown_vertical_total. Les sources d’endurance longue et de position restent distinctes ; aucun brick non mesuré n’est utilisé.

### Contrôles historiques inchangés

Les routines de plan complet sont aussi appelées sur le microcycle de sept jours dans le contexte de préparation. Les erreurs restent brutes :
- error · race_day : 🏁 Jour de course absent — S1 ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"
- error · lorang_categories : S1 : aucune séance Lorang A (HIT) ni B (seuil) — chaque semaine hors décharge doit en contenir au moins 1
- warning · trail_dplus_presence : 3/4 séances CAP/Trail sans D+ chiffré — chaque séance trail doit mentionner le D+ cible (OBLIGATOIRE, systemPrompt.ts)
- error · title_format : Titre H1 non conforme au gabarit RÈGLE #0 : "Préfixe expérimental semaine1"
- warning · key_session_self_declaration_mismatch : S1: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "Sortie longue montagne base — volume D+ progressif"
- error · calendar_coverage : Contrat sportif existant non respecté : calendar_coverage

**Limite de portée** : certaines routines déduisent une semaine de compétition d’un préfixe d’une semaine. L’absence d’erreur d’intensité ne prouve donc pas le passage du contrôle de phasebase historique. Les métriques et cet avertissement sont conservés dans legacyWeekMetrics/coverageWarning. Les contrôles source de zones, les quotas et les contraintes du candidat sont séparés ; aucune routine historique n’a été modifiée ou désactivée.

Le titre du préfixe n’est pas celui d’un plan complet ; son erreur de format est conservée. Un microcycle complet n’est ni un planIronman complet ni une conformité aux anciens validateurs de plan complet. Aucune revue experte ou tolérance clinique n’est attestée.

Les jours sans séance, l’espacement candidat des longues et les récupérations explicitement écrites dans les fiches sont visibles. Les sensations, RPE, alimentation, récupération réelle et effets d’interférence restent à observer ; ils ne sont pas déduits des minutes.

## Inconnue bloquante conservée

Doses connues :850D+ et780D−. Sources sans dénivelé complet :`A_RUN_Z2_EASY, SEILER_RUN_Z1_EASY_LONG, LYDIARD_RUN_AEROBIC_BASE_LONG`. Aucun zéro fictif n’est attribué à ces séances. La somme connue n’est pas la somme totale et ne prouve pas que le plafond hebdomadaire est respecté.

Le statut est donc **microcycle assemblé, bilan vertical inconnu**. La réparation automatique reste refusée tant que cette couverture est incomplète. L’effet musculaire excentrique, la technicité réellement parcourue et la tolérance observée ne sont pas déduits du niveau ou du simple fait qu’une séance figure au programme. Aucune attestationtrail complète n’est revendiquée.
