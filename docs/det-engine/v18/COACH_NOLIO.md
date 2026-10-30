# Coach et Nolio — trois niveaux distincts

Dossier expérimental offline — PR #420 en brouillon, **NO-GO**. Aucun plan ou séance individuellement approuvé, aucune revue experte humaine, aucun appel réel Nolio.

Les 920 rendus contiennent toutes les consignes originales, variantes et restrictions. [Consultation coach hors ligne](coach-library.html) ; les chaînes exactes sont aussi archivées dans [evidence/validation-3/build/outputs.jsonl.gz](evidence/validation-3/build/outputs.jsonl.gz).

| Niveau | Résultat | Portée |
|---|---|---|
| Coach TFCLab | 920 | Lecture intégrale, source et inconnues conservées |
| Texte Nolio simulé après gardes | 831 | Contrat local actuel, pas acceptation distante ni prescription individuelle |
| Structuré local | 13 | Ancres et liaisons de domaines explicitement synthétiques |
| Bricks / mixed vers événement mono-discipline | 0 | 87 refus explicites, aucun aplatissement |
| Nolio v2 | 0 | Contrat machine officiel non disponible ; refus |


Les 833 compatibilités de schéma texte V17 ne sont pas toutes des transports admissibles : V18 refuse en plus les deux fiches de course connues contradictoires (`V3_RUN_10K_TEMPO_CRUISE`, `S2R_WALK_RUN_1_2`). Le brick contradictoire était déjà refusé pour sa structure multidisciplinaire. Le résultat passe donc à 831 sans modifier le contrat historique.

Les 13 encodages structurés emploient des ancres de **fixture** (FTP 250 W, vitesse MLSS 12 km/h) et une liaison coach candidate Z1→recovery / Z2→moderate_lt1, fournie explicitement. Les plages viennent exclusivement de `tfclDoctrine.ts`. Ils ne sont ni des zones d’un athlète réel, ni des séances individuellement admises. Le seul nouvel ID exportable localement est `A_TR_FLAT_SUPPORT_END`. Le finish Z3 explicite reste refusé en export machine tant que ses cibles par phase ne sont pas instanciées fidèlement.

Les récupérations finales indéterminées, alternatives non choisies, temps de nage individuels inconnus, cibles manquantes, charges de force et structures multidisciplinaires restent bloquants selon le format demandé. Un refus d’encodage n’efface pas la fiche coach. Aucun appel réseau ou événement Nolio réel n’existe dans cette couche.

Le vérificateur Python développe les répétitions des 13 payloads et compare chaque durée et note à l’IR, puis au total. Pour le texte, il contrôle les descriptions réelles des 831 payloads ; les hashes seuls ne sont pas utilisés comme preuve de non-perte.
