# Sélection physiologique exécutée

DRAFT — NO-GO. Cas synthétiques. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée. Quatre semaines ne constituent pas une préparation Ironman complète.

`deriveV26Intentions` réutilise `deriveV22StimulusRequests` et les vrais résultats de `prepareTrainingPlanContext` / `computeDiagnostic`. Les raw inputs A/B/C restent inchangés. La liaison explicite levier → intention de source est une convention expérimentale inspectable, pas une équation de dose. La provenance vélo repose sur les tests vélo déclarés dans les fixtures ; une provenance non disponible ne se déduit pas de l'objectif triathlon.

`searchV26Stimuli` parcourt les 920 enregistrements déjà convertis. Une correspondance exige `original.effective.physiology.primary/secondary` et la discipline ; elle ne se déduit jamais de `title`. Les sources sans ce champ ne sont pas réputées inefficaces : leur intention nécessite un rattachement explicite revu. Cette couverture volontairement stricte réduit les faux positifs ; aucune migration de catalogue n'est relancée.

Pour chaque correspondance, les recettes historiques et leurs overlays éditoriaux sont séparés. Les filtres `evaluateCanonicalOffer` / `evaluateV18ReviewOffer`, les minima sources, l'instanciateur V18, les domaines de `tfclDoctrine.ts`, les capacités et les restrictions existantes sont réutilisés. Les conventions de dernier repos restent des overlays non approuvés. Un témoin de durée minimum est une démonstration arithmétique ; ce n'est pas une dose choisie pour l'athlète.

Ordre partiel publié : options qui passent les filtres connus / protocoles incomplets / options bloquées ou différées. Aucune pondération. Les ex æquo sont conservés ; l'ordre lexical sert seulement à stabiliser l'affichage. La liste de revue documentaire exige structure et mécanisme plausible ; elle ne supprime aucun bloqueur.

`buildV26Prescription` calcule cette demande avant `buildV25Prescription`, puis applique l'opt-in coach existant et les contrôles V23 sur les quatre semaines. Les correspondances aux slots existants et les témoins aux vraies durées 120/130/145/105 sont exposés séparément. Un remplacement non validé n'est pas inséré dans le calendrier.

Avant : le catalogue d'offres A contenait des familles de métadonnées telles que yoga ou travail respiratoire, sans prouver qu'elles soient un protocole VO₂ vélo ; le calendrier utilisait ses listes fixes. Après : des sources vélo portant une intention explicite sont trouvées, leurs recettes effectivement structurées sont confrontées aux règles, et la non-insertion est expliquée. B confirme une exposition longue déjà présente, sans ajouter de minutes pour satisfaire un levier.

Les textes quantitatifs automatiques des leviers TFCL (HIIT, +10 %, etc.) restent archivés comme résultats natifs : V26 ne les adopte pas comme règles quantitatives.
