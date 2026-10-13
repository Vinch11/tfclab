# ÉTAPE 2 — Protocole final et contrôle budgétaire (pour validation avant lancement)

**Aucun appel payant n'a été lancé.** Ce document répond précisément à ta
demande : protocole complet, vérification du modèle de secours, calcul du
budget sur tes chiffres réels. J'attends ton accord explicite avant de
lancer quoi que ce soit — et une question bloquante reste à trancher
(section 4) avant que je puisse techniquement exécuter quoi que ce soit.

---

## 1. Modèle de secours plus coûteux — vérifié dans le code, pas supposé

Tu demandes qu'il reste désactivé. Vérification précise :

- Il existe bien un `FALLBACK_MODEL = "google/gemini-3.1-pro-preview"`
  (plus cher que Flash), mais **uniquement dans `index.ts`, le chemin
  Markdown legacy** (déclenché quand le retry du modèle principal échoue
  sur ce chemin — lignes 294/921).
- Le chemin JSON (`jsonPlanHandler.ts`/`generateChunkJSON.ts`, celui que
  **le harnais QA utilise systématiquement** — il force
  `_outputFormat: "json"`) route vers `handleJSONPlanRequest` via un
  **retour immédiat** (`index.ts:122`, `return handleJSONPlanRequest(...)`)
  — le code du modèle de secours, plus bas dans le fichier, n'est **jamais
  atteint** depuis ce chemin. Sur `generateChunkJSON.ts`, tous les retries
  (Zod + transitoires) réutilisent explicitement `input.model`
  (`PRIMARY_MODEL = "google/gemini-3.7-flash"`) — aucun changement de
  modèle possible.
- J'ai aussi vérifié l'hypothèse d'un relais JSON→Markdown silencieux en
  cas d'échec (qui aurait pu, lui, atteindre le modèle de secours) : le
  statut `"markdown-fallback-from-json"` existe dans le type
  `PlanGenerationStat`, mais n'est produit par **aucun code actuel** —
  seulement comparé défensivement dans quelques écrans QA. C'est un
  vestige inactif, pas un mécanisme réel.

**Conclusion** : pour ce pilote (généré via le harnais QA, chemin JSON),
le modèle de secours plus coûteux est déjà **structurellement
inatteignable** — pas une simple option déjà désactivée par défaut qu'il
faudrait surveiller, mais un chemin de code qui ne s'exécute jamais ici.
Rien à configurer en plus. Je le signale comme garde-fou confirmé, pas
comme une supposition.

---

## 2. Budget — calculé sur tes chiffres, pas estimé

**Coût mesuré** : 0,15 à 0,27 crédit/chunk. **Solde** : 154 crédits.
**Budget validé pour le pilote** : 10 crédits.

### Chunks de base (1 génération par profil, confirmé par le code — `computeChunkSizing`)

| Profil | Semaines | Chunks | Coût bas (0,15) | Coût haut (0,27) | Cumul haut |
|---|---|---|---|---|---|
| Débutant course | 8 | 2 | 0,30 | 0,54 | 0,54 |
| 10 km confirmé | 10 | 3 | 0,45 | 0,81 | 1,35 |
| Trail Montagne élite | 14 | 3 | 0,45 | 0,81 | 2,16 |
| Marathon ambitieux | 16 | 4 | 0,60 | 1,08 | 3,24 |
| Ironman élite | 16 | 4 | 0,60 | 1,08 | **4,32** |

**Base sans aucun retry : 2,40 à 4,32 crédits** — largement sous le
budget de 10.

### Marge pour les retries — honnête sur les deux scénarios

- **Scénario réaliste** (chaque chunk a besoin de son unique retry Zod,
  le cas le plus fréquent observé dans ce dépôt) : 32 appels au total →
  **4,80 à 8,64 crédits**. Reste sous les 10 crédits, avec 1,36 crédit de
  marge dans le pire des cas.
- **Scénario pire cas théorique** (chaque chunk épuise aussi ses 2
  retries transitoires en plus du retry Zod, soit ×6 par chunk — le pire
  cas déjà documenté dans le code lui-même) : 96 appels → jusqu'à **25,92
  crédits**, ce qui **dépasserait le budget de 10**. Ce scénario est rare
  (les retries transitoires ne se déclenchent que sur erreur réseau/
  rate-limit/troncature) mais je ne le masque pas : le budget de 10
  crédits couvre confortablement l'usage normal et un taux de retry
  élevé, pas une défaillance généralisée du gateway.

### Méthode de contrôle — processus, pas un seuil codé en dur

Je n'ai pas de mécanisme fiable pour faire avorter automatiquement une
génération en cours au franchissement d'un seuil en crédits (aucune API
de solde en temps réel n'est câblée dans ce dépôt). Le contrôle proposé :

1. **Un profil à la fois**, jamais en lot — ordre : Débutant (2 chunks) →
   10K (3) → Trail Montagne (3) → Marathon (4) → Ironman (4).
2. Après **chaque** profil : je rapporte le nombre réel d'appels effectués
   (chunks + retries observés dans les logs), converti en fourchette de
   crédits (0,15-0,27 × N), et le cumul depuis le début du pilote.
3. **Point d'arrêt strict** : si le cumul estimé dépasse 8 crédits à un
   moment donné (marge de sécurité sous les 10 validés), j'arrête et
   t'attends avant de continuer, même si le profil en cours n'est pas
   terminé.
4. Toute erreur, retry en boucle, ou comportement anormal → arrêt
   immédiat et rapport, avant de continuer.

---

## 3. Protocole complet — rappel consolidé (déjà détaillé, inchangé)

- **Dimension A (fiabilité technique)** et **dimension B (qualité
  d'entraînement, 9 points physiologiques)** + grille dédiée aux mauvaises
  décisions d'entraînement : déjà livrées (rapport précédent), aucun
  changement nécessaire.
- **Correctif Lorang de secours** (zones absentes → catégorie non
  certaine) : déjà fait et testé (18 tests verts).
- **Archivage anonymisé** : un JSON par run
  (`docs/qa-corpus/mode-b-pilot/<date>_<profil>_run1.json`), plan +
  diagnostics `validatePlan` + usage mesuré, aucune donnée personnelle
  (profils synthétiques), aucun secret. Emplacement proposé par défaut
  sauf objection de ta part.

### Point méthodologique ajouté cette fois — évaluation indépendante des scores internes

Pour répondre précisément à "chaque plan évalué indépendamment des scores
internes de TFCLab" : la relecture de la **dimension B** sera rédigée
**avant** toute consultation du score/grade/issues de `validatePlan()` —
pour éviter le biais d'ancrage ("le validateur dit que c'est bon, donc je
cherche moins"). La comparaison avec le verdict interne (`score`, `grade`,
`issues`) n'intervient **qu'après**, comme un point de contrôle croisé
("conformité technique vs qualité sportive — écart constaté"), jamais
comme la référence de départ. C'est déjà la logique du gabarit de rapport
par profil (section 7 : l'écart est une sortie du rapport, pas une entrée).

---

## 4. Point bloquant restant — à trancher avant tout lancement

Je n'ai **aucune clé `LOVABLE_API_KEY` ni accès Supabase** dans cet
environnement (vérifié : aucune variable d'environnement présente). Même
avec le budget validé, **je ne peux pas techniquement déclencher les
appels moi-même depuis cette session**. Deux options :

- **A.** Tu lances les 5 générations depuis l'app déployée (harnais QA,
  profils filtrés sur les 5 demandés), un profil à la fois selon l'ordre
  ci-dessus, et tu me transmets après chaque profil : le plan généré
  (JSON) + les logs de consommation (tokens si le gateway les a renvoyés,
  sinon le nombre d'appels/retries visible côté Supabase). Je fais
  l'analyse complète (A+B, qualification) après chaque transmission.
- **B.** Tu me donnes un accès (clé/environnement) pour que je les lance
  moi-même avec le contrôle du point 2 ci-dessus, strictement dans la
  limite validée.

---

## Ce qui attend ta validation avant tout lancement

1. Le protocole ci-dessus (section 3) et le calcul de budget (section 2) —
   confirme que ça correspond à ce que tu attends.
2. Le point d'arrêt à 8 crédits (marge sous tes 10 validés) — à ajuster
   si tu préfères un autre seuil.
3. Le choix d'exécution (option A ou B, section 4).
4. L'emplacement d'archivage (`docs/qa-corpus/mode-b-pilot/`) — à
   confirmer ou changer.

Je ne lance rien tant que ces points ne sont pas tranchés.
