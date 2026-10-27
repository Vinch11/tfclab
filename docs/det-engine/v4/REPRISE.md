# Reprise V4

Registre : state.json ; parent V3 immuable. La référence historique reste ../v3/final/candidate.json.gz, vérifiée au démarrage. Les contrats Ironman sont des candidats indépendants ; le corpus trail synthétique retenu est final/trail-retained.json.gz, avec les candidats bruts et leur rejeu.

Les preuves d'exécution gardent leurs chemins temporaires d'origine ; archivedOutputs fournit leur copie durable. Les commandes refusent de compter deux fois une unité terminée, de changer sa preuve silencieusement ou de relancer un processus réservé sans vérification. Les caches temporaires ne sont pas une promesse de persistance : un cache absent est refusé, pas régénéré en prétendant un succès ancien.

Pour une nouvelle session : lire le registre et les empreintes, vérifier l'absence de processus actifs, ouvrir un nouveau registre uniquement sur autorisation explicite, puis référencer les artefacts durables. Ne pas effacer les anciennes tentatives, les refus ou la consommation. Aucun service permanent.

Les plafonds d'exécution restent 3600 secondes, dix unités, trois tentatives par unité, un worker par commande, heap Node de 2048 Mo pour les sous-processus supervisés, douze minutes maximum par commande et jamais plus que le temps restant. Ce n'est pas une limite RSS OS.
