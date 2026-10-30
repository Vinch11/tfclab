# Contrat #425 — lecture seule, précontrôle expérimental

#425 est lu au SHA `4d8c788fa94c870c6dd327583c1e256b32f2bdf8`, sans import de fichiers dans les calculateurs et sans hypothèse de fusion. Les contenus récupérés, leurs vrais SHA Git et leurs SHA-256 recalculés sont conservés dans `evidence/pr425-*.json`. L'heure de consignation est distinguée d'une mesure physiologique.

`consumeRunCostV26` complète le contrat V25, sans modifier ce dernier : provenance course explicite, qualification documentée du contexte synthétique, liaison sujet/entrées et domaine du coût déjà défini par #425 (150–280). Le contrat V25 conserve les contrôles d'unité, méthode, date, revendication exacte, artefact et empreinte des entrées. Aucun score n'est transformé en coût ; aucune valeur n'est créée ni clampée pour rendre une référence admissible.

| Sonde préenregistrée | Décision attendue | Portée |
|---|---|---|
| Coût correctement typé et documenté | Contexte séparé à examiner | Valeur 200 réellement présente dans la fixture source #424 déjà archivée V25 ; aucun résultat individuel approuvé |
| Coût incertain | Hold | L'incertitude n'est pas effacée par une unité correcte |
| Coût absent | Hold | Ni score, moyenne ni coefficient substitué |
| Discipline unknown | Hold | Ne pas déduire run d'une unité ou de l'objectif triathlon |
| Valeur historique non attestée | Hold | Une confiance heuristique0,95 ne démontre ni mesure labo, ni qualité de méthode |

La sonde positive est une déclaration **synthétique de contrat**, liée à un artefact et des entrées séparés. Elle ne valide pas l'origine scientifique réelle d'un coût ou d'une VLamax et ne constitue pas un adaptateur de production des snapshots #425. Les métadonnées #425 seules ne fournissent toujours pas toutes les preuves exigées par DET. Les dates de validité de la fixture sont des paramètres expérimentaux hérités V25, pas une durée universelle de validité des tests.

Les unités `ml O2/kg/km` de #425 et `ml_O2/kg/km` du contrat DET doivent être mises en correspondance explicitement dans un futur raccord ; V26 ne fait aucune normalisation permissive d'une unité inconnue. Le précontrôle V26 consomme l'enveloppe interne V25 déjà typée. Aucun changement de VLamax, VO₂max, VMA ou FTP ne vient améliorer les cas A/B/C.

A ne reçoit jamais le 200 de cette sonde. Ses sept refus course et ses cibles manquantes restent inchangés. Les résultats natifs de la branche DET et le contexte documentaire de transfert sont séparés ; aucun correctif #425 n'est supposé actif.

C8 demeure un blocage de qualification : le scalar historique vélo peut encore être étiqueté « mesurée labo » alors que sa provenance scientifique est inconnue. Le JSON d'observation lu dans #425 est conservé. La persistance Supabase réelle et RLS demeurent NON VALIDÉES. Aucune requête Supabase/Nolio, aucun calculateur modifié, aucune approbation individuelle.

**DRAFT — NO-GO.**
