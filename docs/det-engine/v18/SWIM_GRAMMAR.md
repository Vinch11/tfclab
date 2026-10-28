# Natation — structure, distance et temps individuel

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

Les 119 sources ont un modèle natation dédié : distances, répétitions, repos écrits, termes de nage et d’éducatifs, cibles relatives et inconnues. 40 occurrences techniques et 54 mentions de cible CSS sont conservées avec offsets.

Une seconde de décalage CSS n’est pas une seconde d’exécution de la séance. L’absence de nage par défaut reste explicite. Une CSS crawl ne permet pas de chronométrer dos, brasse, papillon, multi-nages ou éducatifs.

Trois squelettes de protocole source sont complets selon la grammaire distance/temps écrite, sans témoin de durée individuelle :

- `A_SWIM_TRI_OPEN_WATER_SIMU`.
- `A_SWIM_CONTINUOUS_2K`.
- `A_SWIM_STEADY_STATE_2500`.


`A_SWIM_CONTINUOUS_2K` contient réellement 400 m multi-nages + 2 000 m continus + 200 m dos, soit 2 600 m écrits. Le titre « 2K » ne réduit pas la séance à 2 000 m. La répartition interne du multi-nages et le choix de certains éducatifs demeurent des consignes source ouvertes à la revue ; ces trois structures ne sont pas des prescriptions individuellement exécutables.

Le scénario distance→temps requiert une référence explicitement propre à la nage, avec unité et provenance. Un exemple purement synthétique de 200 m crawl à 100 s/100 m vaut 200 s arithmétiques ; il n’atteste ni capacité, ni récupération, ni respect du créneau avec les autres parties. Les éducatifs refusent la réutilisation de cette référence. Les repos finaux non précisés restent ambigus et bloquent l’export machine qui exige leur nombre.

Aucune fiche natation n’est ajoutée au compte des 75 chronologies complètes. [Exemple coach](examples/A_SWIM_CONTINUOUS_2K.md).
