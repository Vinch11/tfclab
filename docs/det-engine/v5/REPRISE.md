# Reprise V5

Lire `state.json`, les manifestes et le rapport avant toute reprise. Le registre V4 reste immuable et le budget V5 est nouveau, explicitement autorisé ; il n'efface aucune tentative antérieure.

Le superviseur `scripts/det-engine/v5-supervisor.mjs` réserve l'unité et sa tentative avant lancement, écrit atomiquement l'état, capture la commande, l'empreinte des sources et la sortie. Dix noms fixes, trois tentatives par unité au maximum, échéance absolue de 3600 secondes, commande au plus douze minutes et jamais au-delà du temps restant. Heap Node 2048 Mo ; Vitest un worker par commande. Ce plafond heap ne constitue pas une limite RSS du système.

Une unité active/interrompue exige la vérification des processus et preuves avant reprise ; elle n'est pas relancée aveuglément. Les nouvelles preuves de cache vérifient aussi les octets et la liste complète des artefacts structurés, y compris les plans et rejeux imbriqués. Un ancien succès sans cette empreinte ne peut pas être repris comme preuve de cache : vérifier le manifeste final ou exécuter une nouvelle révision autorisée. Une unité passée identique peut être vérifiée sans nouvelle exécution ; une révision exige un motif explicite et conserve les tentatives. Les comparaisons utilisent des chemins d'artefacts distincts, sans écraser les résultats antérieurs.

Une session ultérieure requiert son autorisation et son registre propres. Aucun démon ni promesse de relance automatique. Une commande ne peut pas contourner l'échéance parce qu'elle réutilise un nom d'unité.

Les artefacts historiques restent dans V3/V4 ; les calendriers synthétiques, candidats bruts et propositions rejetées sont séparés sous `evidence/`. Les jeux de tests n'utilisent aucune donnée personnelle réelle.

La publication GitHub est une unité externe manuelle, réservée dans le même registre, avec preuve de branche, commits, statut brouillon et absence de fusion. Elle ne lance ni workflow de production ni déploiement.

V5 est clos : dix unités terminées. Une reprise corrective exige une nouvelle autorisation et un nouveau registre ; le contrôleur refuse une mission déjà close. Le dernier commit de clôture ne modifie que la documentation et les preuves.
