# Audit des 25 changements MLSS

Comparaison à trois états : baseline main archivée par V2 → V2 initiale #425 → V2.1. Les 37 fixtures ne sont ni corrigées ni enrichies en coût O₂ fictif. Le fichier [qa-37-review.json](evidence/qa-37-review.json) donne chaque profil, prédiction avant/après, proxy, source effective, alertes et empreintes.

**V2.1 reproduit exactement les sorties V2 archivées** pour les 37 objets MLSS, leurs alertes et les quatre blocs effectifs/limiteurs/readiness/cibles. Les 25 changements décrits sont ceux de la correction F4 par rapport à main, pas 25 nouveaux changements V2.1.

Les 25 prédictions supprimées consommaient des scores dans une fonction attendant un coût O₂ ; elles allaient de 86,2 à 95 %. Leur suppression ne démontre pas que ces niveaux sont physiologiquement impossibles : elle retire une preuve logicielle invalide. Aucune valeur de remplacement n'est injectée.

| Surface | Effet vérifié / conséquence |
| --- | --- |
| Diagnostic | Prédiction et cross-validation nulles ; proxy vitesse seuil/VMA inchangé s'il existe, objet nul si aucune voie admissible. Aucune promotion de l'inconnu vers `ok`. |
| Limiteurs et readiness | Empreintes identiques sur 37 profils ; classement/cibles non améliorés par la disparition d'une comparaison. Catégorie globale indépendante de cette comparaison. |
| Alertes | Seul `B-5K-BEGINNER` perd l'avertissement MLSS fondé sur le faux écart : 92 prédit / 79,9 proxy, Δ−12,1. L'alerte blessure « Élevé (57%) » reste ; catégorie globale **critical**. Ce retrait ne vaut aucune autorisation sportive. |
| Carte / export HTML | Proxy nommé comme tel ; coût inconnu visible ; aucune carte « cohérence validée » ni bloc de cross-validation favorable lorsque la comparaison est absente. Les 37 sorties HTML MLSS sont exercées. |
| Décisions sportives | Les valeurs effectives et cibles QA restent identiques, mais aucun test synthétique ne prouve l'adéquation individuelle d'un plan. Une ancre restante est un proxy, pas un MLSS mesuré ni une validation de dose. |
| Historique | Traces antérieures consultables ; aucune réécriture, aucune conversion rétroactive de score vers coût. Les séries incompatibles ne sont pas confondues avec les nouvelles traces. |

La synthèse n'utilise la cross-validation que pour ajouter un avertissement critique ; son score global vient de la readiness. Le retrait de cet avertissement ne modifie pas son score ou sa catégorie. Les checks ne certifient pas tous les consommateurs externes d'un export : leur traitement d'une donnée absente reste une obligation de contrat.

## Relais DET en lecture seule

V2 avait testé les entrées figées V22 et le relais V23 au SHA `4ec5547875768f8430606401bb750445e381f71f`. Leurs tests sont rejoués. Vérification documentaire complémentaire du dernier #420 : **V24 `24024f6f9f7bc91b4c9a8bdce676d21625eff29b`**, fichier `docs/det-engine/v24/PHYSIOLOGY_HANDOFF_424.md`, sans appliquer ni exécuter de nouvelle dépendance DET.

Le relais V24 distingue déjà candidat corrigé, incertain, absent, et exige vitesse/unité, provenance, date et deux empreintes. Il confirme pour A l'ancre 12,413793 km/h, le proxy 82,8 % conservé et **sept refus course maintenus** après suppression de la fausse comparaison à 95 %. Cet état documentaire n'est pas un rejeu V24 depuis #425.

Adaptations encore nécessaires : consommer un coût explicite, accepter `crossValidation:null` comme indisponibilité, porter les inconnues et les preuves dans le contrat demandé par V24, ne pas présenter la correction de frontière comme fusionnée ou comme certification de la référence/dose. Aucun fichier DET et aucune PR #420/#424 modifiés.
