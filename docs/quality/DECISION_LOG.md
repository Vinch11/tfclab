# Registre des décisions de qualité

Ce registre référence les audits existants, sans les remplacer. Les résultats
d'exécution futurs vont dans des artefacts JSONL en écriture append-only par le
contrôleur, puis sont reliés au commit/PR ; aucun log brut d'athlète.

| Date | Décision | Preuve / portée | État |
|---|---|---|---|
| 2026-10-25 | Conserver les fondations scientifiques et limiteurs existants | Instruction du responsable ; AGENTS et doctrine existante | Autoritaire |
| 2026-10-25 | #406 reste séparée et non fusionnée | HEAD64a5d1c3, brouillon vérifié ; audit de gouvernance sur main ac01beb8 | Aucun changement à #406 |
| 2026-10-25 | Prioriser la fidélité des métriques avant de changer l'entraînement | Rejeu Q1 : S8 95 vs165 min, S12 0 vs87 ; fixture enregistrée | Défaut ouvert, aucune correction moteur dans cette PR |
| 2026-10-25 | Préparer une boucle désactivée et démontrer ses portes offline | Scripts et tests de cette proposition | Revue simulée, coût API0 ; pas un GO scientifique |

Champs requis pour une décision future : missionId, numéro d'itération,
horodatage UTC, contrôleurSHA, baseSHA, candidateSHA, fixture/dossier/prompt/schema
SHA256, modèle/version et identifiant de réponse technique lorsque disponible,
tests/commandes, critères et preuves, verdict, motifs d'arrêt, montant réservé/réel,
run CI/PR et arbitrage humain éventuel. Ne pas recopier le prompt brut, les
raisonnements internes ou les données personnelles dans le journal.

## Configuration Auto-QA confirmée par le responsable

- Maximum : 5 itérations et 5 EUR par mission ; plafond technique de10 appels
  bornés, retries inclus. Durée existante de30 minutes inchangée.
- Fixtures offline uniquement ; sorties en PR brouillon et validation humaine.
- Déploiement, fusion automatique, Gemini payant et modification des données
  athlètes interdits. Aucun changement Nolio ni migration.
- Cette configuration ne vaut pas activation : `apiEnabled=false`, récurrence
  désactivée, template Actions toujours inactif. La conversion des tarifs USD
  vers EUR doit être renseignée et approuvée avant tout éventuel appel.
