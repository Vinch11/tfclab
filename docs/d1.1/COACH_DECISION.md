# Décision sportive à soumettre — aucune décision appliquée

État : **EN ATTENTE — DRAFT / NO-GO**. La création d’un modèle paramétrable ne vaut pas autorisation de ses doses.

La règle historique transforme le brick en remplacement de la sortie longue vélo et lui impose `plancher vélo + 20 min`. Origine : `src/engines/plan/weeklySlotLayout.ts:171`, commit `d32e6567d2fc418f16ad8c9a1a3513d0b5578e98` du 14/07/2026. Elle est reprise par `src/lib/plan/validateWeeklyQuotas.ts:79`. Le quota d’un brick hebdomadaire 70.3 age_group vient de `sessionSizingMatrix.ts:100`, commit `57ceeb1eba…`.

Pour les fixtures D1, la rampe de niveau entraîné est abaissée au palier light par le snapshot synthétique à 120 TSS/7j. Le plancher nominal vélo 120 min reçoit `0,60 × 1,10^(semaine−1)` (avec cap et arrondi 5 min existants) : S2 → 80 min ; le placement ajoute 20 → **100 min**. La disponibilité de 10 h n’est pas une preuve de tolérance à ce brick.

La fiche base `BRICK_STAGE1_INTRO` prescrit vélo 45–60 min Z2 facile puis course 15–20 min Z1 très facile, enveloppe 60–90 min. Elle ne couvre ni un vélo de 80 min ni un brick de 100 min. Les références générales Friel / Olbrecht / pratique Lorang du quota ne comportent ici aucune page, protocole ou observation individuelle justifiant exactement le `+20`, son rôle de sortie longue et son application en base dès S2. Les références scientifiques renforcement/taper ne justifient pas ces nombres.

Le coach doit trancher **le rôle du brick en base**, puis les paramètres et leur progression :

1. **Conserver le remplacement de la sortie longue.** Fournir/valider un modèle réellement de base couvrant le plancher vélo de chaque semaine, la course de transition, l’échauffement/retour au calme, les intensités, la transition chronométrée et la tolérance individuelle actuelle. Une nouvelle plage vélo >60 min constitue un nouveau contrat sportif, pas une variante automatiquement héritée de Stage 1. La progression exige un historique d’exposition et de récupération, pas seulement l’écoulement des semaines.
2. **Dissocier brick d’adaptation et sortie longue vélo.** Autoriser explicitement une révision du placement/comptage/quota/budgets pour préserver une vraie sortie longue autonome et un brick court. Cette option n’est pas appliquée : elle change plusieurs contraintes et ne doit pas devenir un simple entraînement supplémentaire ou une compensation automatique.
3. **Conserver tous les contrats actuels.** Le résultat reste refusé : aucune génération de 28 jours ne peut être annoncée sous le conflit démontré.

Décision à renseigner : option retenue, coach/source, date, périmètre objectif/phase/niveau, plages par discipline, intensités/doctrine, règles de progression et conditions individuelles nécessaires. Tant qu’elle manque, aucune modification de quota, de borne ou de phase n’est autorisée par ce document.

Le modèle V2 livré structure uniquement Stage 1 dans ses bornes d’origine ; ses exemples supplémentaires sont synthétiques et ne modifient pas les trois profils D1.
