# Essais conservés et correction de fidélité

DRAFT — NO-GO. Aucun essai n’a modifié une séance historique, une dose ou une règle sportive.

La première intégration documentaire (`evidence/build-1/`, puis `evidence/accepted/`) conservait les 920 textes canoniques V16. Ses tests de copie V16 passaient. La comparaison élargie avec le dernier dossier coach V19 cycle 2 a montré que ce seul critère était insuffisant : les notes de revue documentaire et de modalité ajoutées à V19 n’étaient pas reproduites dans la nouvelle vue V21B.

Cette présentation n’a pas été retenue pour livraison. La correction conserve simultanément :

- le texte canonique V16 exact dans `historicalText` ;
- la vue V19 cycle 2 exacte dans `priorCoachText` et `defaultText` ;
- les 418 vues candidates V19 exactes dans `archivedCandidateViewsUnchanged` ;
- la nouvelle section facultative, ajoutée séparément dans `withOptionalContext`.

La version retenue est `evidence/coach-consolidated/`, avec son rejeu `evidence/coach-consolidated-replay/`. L’audit indépendant et les 24 contrats ont été rejoués après cette correction. Les seules différences avec la première intégration finale sont la présentation coach, sa mesure de couverture et la provenance des entrées. La base scientifique, les 920 lignes de routage, les deux paquets de contexte, les 96 revues, les lacunes et les 15 payloads Nolio restent identiques.

Les premières preuves sont conservées, y compris leurs limites de portée. Les encodages volumineux de certains essais sont compressés sans perte et indexés dans `evidence/lossless-extra-encoding-index.json`. Aucun échec sportif n’est effacé ou reclassé.
