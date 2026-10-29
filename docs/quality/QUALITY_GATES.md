# Portes de passage et arrêts

## Avant toute action

- Défaut retrouvé dans un audit, référence immuable et fixture non identifiante.
- Périmètre de fichiers/commandes approuvé ; sources sensibles hors périmètre.
- Git propre, branches séparées, baseline reproductible, critères figés.
- Données externes approuvées explicitement : ni PDF réel nominatif ni logs bruts
  ne sont envoyés à une API. `store:false` ne constitue pas une garantie ZDR.

## Défauts bloquants

Arrêt sans candidat accepté en cas de régression, nouvelle critique sportive,
échec d'un test pertinent, preuve absente/altérée, contrat modifié pour réussir,
mutation hors périmètre, données personnelles, refus de modèle, dépassement
budgétaire/temporel, comptabilité inconnue ou avis scientifique incertain.
Les contrôles de sécurité restent actifs. Aucune déduplication de problèmes
distincts ni diminution de sévérité n'est une correction acceptable.

`iterate` peut poursuivre seulement si aucune régression/violation grave n'est
présente, si le périmètre est inchangé et si les plafonds restent disponibles.
Une régression arrête la mission ; pas d'essai suivant automatique pour la cacher.

## Limites proposées par mission

`policy.json` enregistre la configuration du responsable : 5 itérations maximum,
5 EUR maximum par mission, fixtures offline uniquement, PR brouillon avec validation
humaine. Les API restent désactivées et la durée de 30 minutes reste inchangée.
Plafond technique : 10 appels bornés
(Codex + revue à chaque itération), 16 000 tokens d'entrée et 4 000 de sortie
par appel. Ces valeurs sont des limites opérationnelles, pas des critères sportifs.

Réserver **avant** chaque appel son coût maximal, avec tarifs approuvés et
compte d'entrée complet du modèle. Convertir les prix USD en EUR avec un taux
conservateur explicite et daté incluant les surcharges applicables ; sans ce taux,
arrêter. Aucun taux 1 USD = 1 EUR implicite. Réconcilier l'usage réel ensuite, raisonnement
compris dans la sortie. Timeout, déconnexion, usage absent : garder la réserve,
aucun retry automatique. Coûts cache ignorés pour borner prudemment. Compter les
retries et demandes de correction de schéma dans les mêmes plafonds.

Une limite de temps n'annule pas nécessairement une facturation déjà engagée.
Les budgets de projet fournisseur ne sont pas supposés être un hard cap. Le CLI
Codex seul ne fournit pas ici une preuve de plafond monétaire par mission :
automatisation payante bloquée tant qu'un courtier d'admission **de chaque requête**
et sa persistance durable ne sont pas implémentés/vérifiés. Les tests du registre
local ne remplacent pas ce courtier réseau.

## Défense en profondeur à installer seulement après autorisation

Tests/candidat dans un conteneur éphémère sans réseau, sans secrets, sans accès
Docker hôte ; dépendances préparées séparément depuis un lockfile. Agent : réseau
limité à l'API autorisée via courtier ; aucun credential Supabase, Lovable, Nolio
ou gateway Gemini. Instructions AGENTS et sandbox ne remplacent pas cette isolation.

Politique, critères, base de comparaison, tests de référence et vérificateur
chargés depuis un commit de contrôle approuvé, hors écriture agent. Le candidat
ne peut modifier ses propres portes. Les fichiers de production sensibles,
doctrine, migrations, workflows, `.env`, intégrations Nolio et métadonnées catalogue
restent hors liste autorisée sans arbitrage humain.

## Sortie

Éligible uniquement à une PR **brouillon**, jamais à la fusion/publication. Joindre
SHA, empreintes, commandes, résultats, verdict scientifique et incertitudes.
Le contrôleur valide la provenance réelle de l'avis : le JSON seul ne l'authentifie
pas. Une revue simulée ne donne jamais un GO scientifique réel.
