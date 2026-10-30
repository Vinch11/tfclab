# Désaccords et limites de transfert

## Six écarts V21B conservés, corrections séparées

| Référence héritée | Écart | Identité récupérée (pas une nouvelle source inventée) | Constat |
|---|---|---|---|
| THR-01 | WRONG_PROVIDED_AUTHORS | PMID 21487146 ; Beneke R, Leithäuser RM, Ochentel O. ; print/index 2011 ; électronique None | The provided Faude/Kindermann/Meyer attribution does not match the retrieved PMID: Beneke, Leithäuser, Ochentel. Preserve the original; use retrieved identity only in a separately reviewed citation. |
| VLA-03 | UNSUPPORTED_PROVIDED_YEAR | PMID 33137832 ; Quittmann OJ, Schwarz YM, Mester J, Foitschik T, Abel T, Strüder HK. ; print/index 2021 ; électronique 2020-11-02 | Provided 2024 is neither online 2020 nor journal 2021 in the retrieved record. Quarantine the supplied citation year, without altering the handoff. |
| SWIM-01 | ONLINE_PRINT_YEAR_DISTINCTION | PMID 39526869 ; Funai Y, Taba S, Kanegawa Y, Taimura A, Matsunami M. ; print/index 2025 ; électronique 2024-11-11 | Provided 2024 corresponds to electronic publication; journal issue is 2025. Both dates retained, no article substitution. |
| SWIM-03 | ONLINE_PRINT_YEAR_DISTINCTION | PMID 34372755 ; Seifert L, Carmigniani R. ; print/index 2023 ; électronique 2021-08-09 | Provided 2021 corresponds to electronic publication; journal issue is 2023. Both dates retained. |
| IM-03 | ONLINE_PRINT_YEAR_DISTINCTION | PMID 27490817 ; Priego Quesada JI, Pérez-Soriano P, Lucas-Cuevas AG, Salvador Palmer R, Cibrián Ortiz de Anda RM. ; print/index 2017 ; électronique 2016-08-04 | Provided 2016 corresponds to electronic publication; journal issue is 2017. Both dates retained. |
| IM-03 | HANDOFF_JOURNAL_STUDY_TYPE_CONFLICT | PMID 27490817 ; Priego Quesada JI, Pérez-Soriano P, Lucas-Cuevas AG, Salvador Palmer R, Cibrián Ortiz de Anda RM. ; print/index 2017 ; électronique 2016-08-04 | JOURNAL_VERIFICATION_SOURCES.md calls IM-03 an Ironman scoping review, whereas the reference JSON and retrieved article describe an acute bike-fit comfort/fatigue/pain study. The scoping review in this corpus is IM-02; do not silently relabel the original journal row. |

Les dates électronique/numéro imprimé restent distinctes, pas de correction globale arbitraire de l’année. `IDENTITY_CORRECTIVE_REGISTER.json` conserve chaque entrée fournie, identité et provenance archivées. IM-03 a deux écarts distincts : date et type d’étude.

## Trois collisions du relais

REC-02 du relais (PMID 38443585) ≠ REC-02 V21B (32744041). VO2-01 relais (34822448) ≠ V21B (23539308). VO2-02 relais (36314990) ≠ V21B (42237396). Utiliser PMID/DOI/artefact comme identité ; ne jamais réaffecter l’ancien identifiant. La note indépendante reste intacte.

## Protocole et portée

1. **Ancre 3/3 cycliste.** PMID 34822448 utilise une puissance issue de la rampe à 80 % VO2peak, réduite de 5 % pour les cinétiques, et une récupération liée à 85 % GET. « 80 % FTP », Z5 ou VO2peak mesurée ne sont pas interchangeables. L’effet est aigu ; pas de gain chronique établi par cette étude.
2. **4×4 course.** PMID 36314990 est sur tapis à environ 3 degrés, avec ancre MAS ajustée à la réponse cardiaque. Une dose vélo 106–115 % FTP et une récupération 50 % FTP ne reproduisent pas ce protocole. Une fréquence cardiaque donnée ne prouve pas à elle seule l’atteinte mesurée de VO2max.
3. **Seiler.** Le résumé primaire PMID 21812820 décrit 4×4/8/16 à intensité maximale tolérable et deux séances hebdomadaires ; il rapporte des gains plus grands globalement pour 4×8 dans cet échantillon. Les repos complets manquent. Il ne justifie ni un repos 50 % FTP universellement « essentiel », ni une supériorité universelle d’un format, ni l’inefficacité de 4×4.
4. **Basse cadence.** PMID 24550843 : 40 rpm, 5×6 min et ancre HRmax. Les recettes à 50–60 rpm/Z3 ne sont pas identiques. Le bilan négatif de cet essai ne prouve pas l’inefficacité de toutes les méthodes. Les volumes de récupération se contredisent ; aucun dernier repos n’est ajouté pour les réconcilier.
5. **Posture.** PMID 34540268 concerne un fitting et une observation avant/après non contrôlée chez des vététistes. Ni l’équivalence 4×15 et 6×10 en position aéro, ni une tolérance Ironman, ni une récupération de cinq minutes n’y sont démontrées. PMID 27490817 reste au niveau résumé ; ne pas confondre les deux études.
6. **Récupération.** Modalité active/passive pendant une série, présence du dernier repos, retour au calme et séance facile séparée sont quatre questions différentes. Absence de supériorité statistique ne prouve pas équivalence ni non-infériorité.
7. **Tempo/SST.** Les affirmations historiques « 1 h SST = 2 h Z2 », « ROI optimal » et les seuils VLamax associés n’ont pas de preuve primaire ciblée suffisante ici. Elles restent des revendications sources, sans modification de leur contenu ni approbation.
8. **Spécificité Ironman.** Seules les méthodes de PMID 36589784 ont été examinées : 40 km vélo puis 10 km course, sans prolongateurs. Modèles INSCYD et paramètres calculés ne sont pas des mesures directes de laboratoire, ni une validation indépendante des calculs TFCLab. Résultats/discussion non relus intégralement ; aucune conclusion de recette Ironman.
9. **Natation/force.** Pas de transposition CSS crawl aux autres nages ; pas de traduction d’une charge neuromusculaire en zone cardiaque. L’absence de recette dans cette cohorte n’est pas une absence de besoin sportif.
10. **Applicabilité individuelle.** LT1, LT2, MLSS, FTP et CP restent distincts. Une estimation terrain de VLamax n’est pas une mesure directe. Un test frais ne prouve pas la durabilité. Aucune tolérance nutritionnelle, thermique ou posturale ni adaptation future n’est acquise parce qu’une semaine s’est écoulée.

Aucune règle quantitative nouvelle n’est déduite des principes de Lorang. Aucune source historique ni règle de prescription n’est corrigée par ces constats documentaires. Les garde-fous et les quarantaines LCW/nutrition/chaleur déjà archivés restent intégralement conservés.
