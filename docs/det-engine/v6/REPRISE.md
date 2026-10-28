# Reprise V6

Parent immuable : `../v5/state.json`. Le nouveau budget V6 ne réinitialise aucune preuve V5. Lire `state.json`, `provenance.json`, les manifestes et le journal avant toute reprise.

Le superviseur réutilise les gardes de V5 : échéance absolue de 3 600 secondes, dix noms d'unités fixes, au plus trois tentatives par unité, commande au plus douze minutes et jamais au-delà du temps restant, heap Node de 2 048 Mo et un worker Vitest par commande. Le heap n'est pas une limite RSS du système. Une unité active exige la vérification de ses processus et preuves ; elle n'est jamais relancée aveuglément.

Les sorties structurées, plans et rejeux sont empreintés. Un cache ne remplace pas une preuve manquante, modifiée ou issue de sources différentes. Une révision exige un motif explicite et conserve les tentatives. Une mission close est refusée par le garde de budget.

Les scripts V6 ne déclenchent pas de processus permanent, d'appel de modèle ou d'action de production. La publication GitHub est une unité externe manuelle dans le même registre, avec reçu de branche, statut brouillon et absence de fusion.

Après clôture, une nouvelle session corrective exige une autorisation et un registre propres. Aucun service ne relance automatiquement le chantier. Les contrôles restent distincts : technique, règles sportives existantes, contrats expérimentaux, inconnues et revue experte.
