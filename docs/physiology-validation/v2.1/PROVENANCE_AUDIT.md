# Contrat par paramètre et conservation historique

Le contrat est `PhysiologicalEvidence` dans `src/lib/physiologyEvidence.ts` ; la matrice détaillée V2 reste applicable aux paramètres calculés. V2.1 corrige la conservation et l'interprétation, sans nouvelle table ni migration.

| Groupe | Unité / discipline | Provenance et incertitude |
| --- | --- | --- |
| VO₂max | ml O₂/kg/min ; discipline connue ou inconnue | Date de test distincte de la date de stockage ; méthode/origine inconnues si non documentées. |
| VLamax | mmol/L/s ; vélo/course séparés | Discipline non assignée conservée sans score ni profil spécifique ; un objectif sportif ne qualifie pas une mesure. Origine labo interne insuffisante pour affirmer une mesure directe. |
| FTP / VMA / CSS | W vélo / km/h course / s/100 m nage | Références effectives bornées ; repli profil attribué à `athlete.refs`, sans héritage des preuves d'un snapshot rejeté. |
| TTE / puissances / anthropométrie | min / W / kg, %, bpm | Champs et moteurs existants ; les inconnues de méthode/date/marge ne deviennent pas des mesures. |
| Score économie | score/100, course | Champ historique conservé ; aucune lecture comme coût O₂, aucune conversion. |
| Coût O₂ | ml O₂/kg/km, course | Valeur explicitement structurée et domaine existant 150–280 ; chaîne narrative seule et enveloppes invalides ne fournissent pas de coût. |
| MLSS | proxy seuil/VMA et prédiction Modèle C distingués | Coût absent → prédiction et comparaison absentes ; proxy disponible conservé. RMSE de cohorte ≠ marge individuelle. |

Les preuves scalaires originales et les preuves des valeurs effectives restent deux objets distincts. Une confiance d'extraction documente l'extraction ; une confiance de moteur reste heuristique. Ni 0,95, ni 0,85, ni une marge interne ne devient une probabilité expérimentale certifiée. Les métadonnées connues sont conservées dans les entrées/paramètres du contexte de plan ; elles ne certifient pas une dose sportive.

## Édition / sérialisation / récupération

1. Enveloppe JSON versionnée dans `coach_notes`, champ existant. Aucun traitement automatique de masse.
2. Date/confiance/source de stockage propres à un paramètre prioritaires, y compris `null` explicite. Date invalide → inconnue ; marge non négative et confiance finie dans [0,1].
3. Modifier une valeur retire sa preuve périmée ; revenir à l'ancienne valeur ne restaure pas son ancienne provenance. Les preuves des paramètres inchangés restent disponibles.
4. Notes seules : texte coach modifiable sans perte des métadonnées valides. Mise à jour scalaire sans notes : invalidation également exécutée.
5. Taille de la **chaîne finale**, pas du seul texte visible : 2 000 accepté, 2 001 refusé avant toute écriture et sans état local divergent. Aucune troncature.
6. Nouvelle enveloppe malformée/dupliquée : refus explicite. Ancienne enveloppe illisible, `null`, tableau ou paramètre invalide : récupération prudente, pas de coût déduit ; chaîne originale préservée lors d'une simple lecture.
7. Hook de sauvegarde avec transport simulé : insert, éditions, rejet sans écriture, démontage/remontage, reprise des valeurs. Le smoke navigateur vérifie séparément sérialisation locale et rapport HTML ; il ne démontre ni RLS ni transaction réseau Supabase.

Les anciennes traces MLSS sont conservées, consultables, distinguées des versions à coût explicite et exclues des comparaisons de dérive incompatibles. Aucun fichier historique V2, aucune ancienne trace, aucune donnée distante réécrits. Les tests V2 historiques sont rejoués.

## Limites maintenues

L'enveloppe partage le budget de 2 000 caractères avec les notes : une importation très détaillée peut nécessiter une réduction explicite du texte par le coach ; ce lot ne crée pas de stockage alternatif. Le contrat ne récupère pas une méthode absente d'une source historique. Les écritures simultanées entre plusieurs onglets/clients n'ont pas de nouvelle stratégie de concurrence ; ce scénario réseau reste non vérifié. Les surfaces legacy et les mini-rapports hors rapport MLSS n'ont pas tous été exercés en navigateur. Les preuves internes et les archives expérimentales restent distinctes.
