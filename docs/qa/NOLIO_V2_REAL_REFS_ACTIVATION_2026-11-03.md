# Nolio V2 QA — lecture réelle et activation confirmées, 3 novembre 2026

Le coach a ouvert la page QA dans son navigateur, lu les références chez Nolio puis activé l'association. Les captures utilisateur sont confirmées par des projections agrégées en base, sans consultation des jetons ou identifiants d'athlète Nolio.

| Contrôle réel | Résultat |
| --- | --- |
| Autorisation et consentement | confirmés |
| Sports lus | 97 |
| Sports admissibles aux séances structurées | 27 |
| Exercices lus | 242, état loaded |
| Connexions actives pour le coach/athlète QA | 1 |
| État de l'autorisation | active |
| Jeton | génération 1, refresh idle |
| Preuve de simulation serveur Nolio | absente |
| Preuve de création dans le calendrier Nolio | absente |
| Renouvellement du jeton réellement exécuté | non prouvé |

Dernière lecture des références relevée : 2026-11-03T14:43:19.657091Z. L'activation locale n'envoie rien à Nolio. Elle ne vaut pas validation sportive ni autorisation d'exporter un plan réel.

L'incident initial du logo HTML a disparu lors du nouvel essai utilisateur ; sa cause précise reste non observée dans ce navigateur. Le renforcement du démarrage demandé dans Lovable reste à vérifier séparément.

Prochaine vérification : une seule séance technique en mode dry_run forcé côté serveur, avec aucun chemin vers une écriture réelle, puis confirmation explicite du retour de validation. L'endpoint actuel nolio-v2-send-plan appelle le chemin d'envoi : il ne doit pas être utilisé comme un simulateur tant qu'une entrée dédiée n'est pas préparée.

Aucune capture contenant des références privées n'est ajoutée au dépôt. Aucun main, TFCLab v2.1, V1, prescription, publication ni envoi réel de cette étape.
