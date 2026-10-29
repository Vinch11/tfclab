# V19 — reprise persistante

**DRAFT — NO-GO**, branche `experiment/det-engine`, PR #420. Baseline V18 `b735116a6df87765bf02d5d5c34b1a5c28a845c1`. Checkpoint du cycle 1 poussé : `0fced83ac8840680e47a6f3e65529c2f5bd8d229`.

[État global](state.json) · [Budget non renouvelable](budget-contract.json) · [Cycle 1 scellé](cycle-1/state.json) · [Cycle 2](cycle-2/state.json) · [Résultats](FINAL_RESULTS.md).

Preuve technique consolidée : `docs/det-engine/v19/cycle-2/evidence/validation-3-repair-1`. Les 920 sources, 600 références historiques et preuves V2–V18 restent inchangées. Les deux séries de résultats Ironman archivés conservent leurs erreurs historiques. Les données de profil sont exclusivement synthétiques.

[Reprise détaillée du cycle 2](cycle-2/REPRISE.md), [acceptation expérimentale](cycle-2/acceptance.json), [limitations et décisions humaines](cycle-2/DECISIONS_AND_LIMITS.md), [compatibilité Nolio et refus](cycle-2/NOLIO_SOURCE_PATH.md).

La clôture des deux cycles est enregistrée dans l’état global, avec heures et durée réelles. Maximum 120 minutes communes, deux cycles de 60 minutes au plus ; la deuxième échéance est 00:55:36.478 UTC. Le budget ne se renouvelle pas. Un compteur de crédits n’est pas exposé et aucune consommation exacte n’est revendiquée.

Aucune relance automatique n’existe. Ne pas lancer un troisième cycle ou réexécuter les unités clôturées sous ce budget. Une reprise ultérieure requiert une nouvelle autorisation et un nouveau registre, en conservant intégralement les présents artefacts. Aucun moteur, catalogue ou validateur de production ne peut être modifié dans ce mandat.
