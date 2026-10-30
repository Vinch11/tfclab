# Réévaluation des avertissements V2

La gravité émise reste « warning ». La priorité de revue V3 décrit une conséquence potentielle, sans requalifier automatiquement une convention méthodologique en loi de sécurité.

| Code | Avant réparations V2 | Après V2 | Delta net | Ajouts au fil des 245 réparations | Nature | Priorité de revue | Conséquence |
|---|---:|---:|---:|---:|---|---|---|
| coach_initial_load_unverified | 344 | 344 | 0 | 0 | missing_evidence | context | Charge initiale non vérifiée ; revue humaine nécessaire. |
| minimum_catalogue_dose_exceeds_budget | 64 | 64 | 0 | 0 | catalogue_load_incompatibility | high | Dose catalogue incompatible avec la disponibilité ; recherche ou contrat à revoir. |
| catalogue_slot_duration_unavailable | 310 | 310 | 0 | 0 | catalogue_dose_gap | high | Aucune fiche dans la plage du créneau ; pas de dose inventée. |
| race_duration_unestimated | 217 | 217 | 0 | 0 | missing_evidence | context | Charge de compétition et récupération non attestées. |
| polarization | 586 | 658 | 72 | 143 | intensity_distribution | high | Fatigue et stimulus incompatibles avec la distribution attendue. |
| progression | 328 | 331 | 3 | 10 | load_progression | high | Saut, stagnation ou perte de continuité ; risque dépendant du contexte. |
| lorang_categories | 1010 | 904 | -106 | 6 | intensity_distribution | high | Répartition des catégories TFCL à revoir ; convention méthodologique. |
| anti_repetition | 181 | 215 | 34 | 36 | diversity | medium | Répétition possible ; elle peut aussi être utile, ne démontre pas seule un risque. |
| key_session_self_declaration_mismatch | 3771 | 3859 | 88 | 112 | stimulus_annotation | high | Drapeau clé conservé sur séance facile ; peut masquer une sous-prescription. |
| catalogue_diversity_limited | 11 | 11 | 0 | 0 | catalogue_coverage | medium | Diversité limitée, sans autorisation de dépasser les capacités des fiches. |
| phase_coherence | 182 | 182 | 0 | 0 | periodization | high | Séance ou phase incompatible avec la préparation. |
| sport_ratio | 56 | 56 | 0 | 0 | multisport_balance | high | Durées des disciplines déséquilibrées ; interprétation des bricks limitée. |
| limiter_coherence | 6 | 7 | 1 | 1 | individualization | high | Stimulus incohérent avec les limiteurs identifiés. |
| load_pattern | 8 | 8 | 0 | 0 | mesocycle_recovery | high | Alternance charge/récupération ou affûtage incohérente. |
| key_sessions | 415 | 415 | 0 | 0 | stimulus_specificity | high | Stimuli requis potentiellement absents ou excessifs. |
| ambition_physiology_gap | 61 | 61 | 0 | 0 | feasibility_uncertainty | context | Ambition et capacités à revoir, incertitude non résolue. |
| deterministic_quota_not_available | 1996 | 1996 | 0 | 0 | unsupported_contract | high | Prescription hebdomadaire dédiée non établie, construction non attestée. |
| multiday_event_requires_stage_review | 80 | 80 | 0 | 0 | event_review | context | Épreuves LCW à valider séparément. |
| strength_sessions_requested | 52 | 52 | 0 | 0 | coach_constraint | high | Renforcement demandé par le coach non respecté. |

Les colonnes avant/après incluent aussi les avertissements des refus ; leurs deltas sont nuls. Sur les plans construits seuls : 7026 → 7118 (+92). Les ajouts au fil des réparations sont un cumul d’événements ; des alertes peuvent disparaître lors d’une réparation ultérieure.

188 réparations ajoutent une alerte ; 22 aggravent une hausse interhebdomadaire descriptive ; 6 aggravent une alerte numérique d’intensité. Ces groupes se recoupent. 118 présentent une nouvelle alerte du même code et de la même semaine alors qu’une occurrence bloquante correspondante diminue.

Disposition : 195 réparations restent à revoir, 50 satisfont seulement ce garde-fou relatif. Les matrices V2 ne sont pas réécrites. Les réparations signalées ne sont pas considérées comme approuvées sportivement.

Le journal détaillé lie chaque réparation à son cas, son créneau, ses fiches et les contrôles avant/après ; la reconstruction de chaque plan final V2 a été vérifiée exactement.
