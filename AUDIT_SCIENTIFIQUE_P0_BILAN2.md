# Bilan — Branchement B13/B14 sur les plans réels, étude F7, plan du Lab

**Rien n'est déployé.** Tout est sur la branche de travail, non pushé.

---

## 1. B13/B14 branchés sur les deux pipelines réels (PRIORITÉ ABSOLUE)

### Changement d'architecture : critique vs avertissement
`checkB13` (ex-check unique) est désormais **deux checks distincts**, pour
pouvoir vraiment distinguer les deux niveaux de sévérité demandés :

| Check | Portée | Niveau | Pourquoi |
|---|---|---|---|
| **B13** | Doublon de catalogId + cumul "à jeun" | `critical` | Risque direct : répétition non voulue ou surcharge métabolique que le coach n'a pas validée consciemment |
| **B14** | Cohérence phase/fiche (ex. `enforceTaperWeeks`) | `warning` | Problème d'étiquetage de la périodisation — le contenu de la séance reste valide, pas un risque d'entraînement |

### Branchement sur les plans réels
Les deux checks acceptent maintenant une interface structurelle minimale
(`FinalValidationPlanLike`) satisfaite à la fois par `MergedPlan` (JSON
complet) et `ParsedPlan` (après régénération d'une semaine) — **aucune
conversion, un seul point de calcul partagé** : `computeFinalValidationIssues()`.

Branché aux **deux** pipelines de génération réellement utilisés (confirmé
en cherchant tous les appels à `mergePlanChunks`/`runReconciler` dans le
code, pas seulement celui que j'avais déjà vu) :

1. **Génération complète/fenêtrée** (`useAITrainingPlan.ts`) — juste après
   `mergePlanChunks`, donc après que `runReconciler` a terminé TOUTES ses
   passes (dédoublonnage, `enforceTaperWeeks`, `ensureRaceDaySession`,
   `enforceAthleteConstraints`...). Couvre aussi les plans multi-fenêtres
   (le découpage en fenêtres accumule tous les chunks AVANT ce point).
2. **Régénération d'une seule semaine** (`AITrainingPlanPage.tsx::handleRegenerateWeek`)
   — recalculé sur le plan COMPLET après remplacement de la semaine (pas
   seulement la semaine régénérée), pour détecter une incohérence entre la
   semaine régénérée et le reste du plan existant.

### Visible dans les résultats de validation accessibles au coach
Nouveau champ `ParsedPlan.finalValidationIssues`, rendu dans
`AIPlanViewer.tsx` — **le même composant que le coach voit déjà** pour les
autres avertissements de plan (même pattern que le bandeau existant
"Récap de phases incomplet"). Pas un log, pas une page QA séparée.

- **Incohérence critique présente** → bandeau rouge (`variant="destructive"`),
  message explicite : *"⛔ Incohérence critique détectée — ce plan ne doit
  PAS être considéré comme validé sans vérification."*
- **Avertissements seuls** → bandeau neutre, langage non bloquant.

Il n'existait auparavant AUCUN badge "plan validé" dans cette page qu'une
incohérence critique aurait pu laisser afficher par erreur — le bandeau
rouge est donc la seule et unique affirmation sur la validité du plan à cet
endroit, pas une couche ajoutée par-dessus un signal positif préexistant.

### Découverte en cours de route (transparence)
En cherchant où les résultats de validation étaient DÉJÀ censés être
visibles, j'ai trouvé que deux mécanismes existants
(`sportObjectiveIssues`, `weeklyQuotaIssues` — avec leur propre distinction
critique/avertissement) ne sont en réalité **jamais rendus dans l'UI** —
seulement loggués en console ou exposés comme état de hook inutilisé. Je
ne les ai pas corrigés (hors périmètre de cette demande), mais je le
signale : B13/B14 sont donc, à ma connaissance, le premier mécanisme de ce
type réellement visible par le coach dans cette page.

### Tests
- `checkB13.test.ts` (6 tests, niveau "critical" vérifié)
- `checkB14.test.ts` (6 tests, niveau "warning" vérifié)
- `finalValidation.test.ts` (4 tests — orchestration des deux, y compris le
  cas mixte critique + avertissement simultanés)

### Limite assumée (pas un test end-to-end de rendu)
Je n'ai pas écrit de test React (render) pour vérifier que le bandeau
s'affiche réellement dans le DOM — j'ai vérifié la logique (calcul,
attribution au bon champ, branchement aux deux call sites) par lecture de
code et par `tsc`, pas par un test de composant monté. Si tu veux ce
niveau de garantie, dis-le — c'est un travail supplémentaire distinct.

### Validation globale (ce lot + le précédent)
```
npx tsc --noEmit  → 0 erreur
npx vitest run    → 235 fichiers, 1740 tests, TOUS VERTS
eslint (avant/après git stash, fichiers touchés) → 0 nouvelle erreur/warning
```

### Fichiers touchés dans ce lot
| Fichier | Statut |
|---|---|
| `src/lib/plan/qa/checkB13.ts` | réécrit (scope réduit, critique, type structurel) |
| `src/lib/plan/qa/checkB14.ts` | nouveau (cohérence phase, avertissement) |
| `src/lib/plan/qa/finalValidation.ts` | nouveau (orchestration partagée) |
| `src/lib/plan/qa/checks.ts` | modifié (enregistrement B14) |
| `src/lib/plan/qa/verdict.ts` | modifié (B13 ajouté à `CRITICAL_IDS`) |
| `src/hooks/useAITrainingPlan.ts` | modifié (branchement génération complète) |
| `src/pages/AITrainingPlanPage.tsx` | modifié (branchement régénération semaine) |
| `src/components/AIPlanViewer.tsx` | modifié (bandeau coach) |
| `src/lib/aiPlanParser.ts` | modifié (champ `finalValidationIssues`) |
| tests (`checkB13`, `checkB14`, `finalValidation`) | nouveaux/réécrits |

---

## 2. F7 — Stratégie (pas de code) : contradictions, incertitude, dépendance aux estimations

Conformément à ta demande, **aucune recalibration automatique de VLamax**.
Voici la stratégie en trois volets.

### Volet 1 — Détection des contradictions entre données physiologiques
L'infrastructure existe déjà partiellement : `crossValidateRunMLSS()`
(`runMLSSPredictor.ts`) compare un seuil OBSERVÉ à un seuil PRÉDIT depuis
VLamax+économie, et classe l'écart `ok`/`warning`/`critical`. La stratégie :
généraliser ce principe à d'AUTRES paires de signaux corrélés qui
devraient être cohérents selon le modèle Mader déjà en place, sans jamais
ajuster une valeur :
- VLamax (CAP) vs TTE observé (un TTE anormalement court/long pour la
  VLamax résolue est un signal de contradiction, pas de correction).
- VO2max déclaré vs VMA déclarée (ratio physiologiquement attendu, déjà
  utilisé ailleurs dans le moteur pour d'autres calculs — à vérifier s'il
  existe déjà une fonction dédiée avant d'en écrire une nouvelle).
- FTP déclaré vs VLamax+VO2max (le même calcul que `computeMLSS`/
  `findMLSSPower` permet de vérifier si le FTP déclaré est dans une
  fourchette plausible pour ce couple — purement diagnostique).

Chaque contradiction détectée devient une **alerte affichée au coach**
(pas une correction), avec son explication (quel signal, quel écart,
quelle hypothèse la plus probable — déjà le pattern de
`crossValidateRunMLSS`).

### Volet 2 — Propagation de l'incertitude (sans élargissement automatique)
Le tier de confiance (`VLamaxV2Source` : mesuré/estimé/inféré/manquant,
déjà dans `vlamaxV2Engine.ts`) doit être VISIBLE partout où une valeur
dérivée de VLamax est présentée au coach — pas seulement calculé puis
oublié. Concrètement : chaque carte/export qui affiche une valeur dérivée
(zones, FatMax, projections `adaptationPredictor`) affiche le tier de SA
VLamax source en toutes lettres (badge "mesuré"/"estimé"/"donnée
manquante"), pour que le coach voie lui-même le niveau de confiance et
décide, plutôt que le moteur ajuste silencieusement un calcul à sa place.

### Volet 3 — Réduction de la dépendance aux estimations peu fiables
Plutôt que d'ajuster une valeur estimée peu fiable, réduire le besoin de
s'y fier : quand une décision clé (sélection de séance à fort impact,
projection affichée en gros dans l'UI) repose sur un tier `estimation`/
`unknown`, afficher une invitation explicite à tester — *"Cette
prescription repose sur une VLamax estimée (confiance 0.50) — un test
terrain validerait ce calcul"* — plutôt qu'une correction automatique. Ça
réduit la dépendance en améliorant la DONNÉE SOURCE (via le coach), pas en
bricolant le calcul.

### Pourquoi je n'ai rien codé de plus
Les trois volets ci-dessus touchent de multiples surfaces UI (cartes,
exports, projections) — une vraie implémentation nécessite de décider,
avec toi, QUELLES cartes/décisions sont prioritaires avant d'étendre
`crossValidateRunMLSS`-like à d'autres paires de signaux. Dis-moi si tu
veux que je commence par un volet en particulier.

---

## 3. Performance Validation Lab — plan d'implémentation (RIEN CONSTRUIT)

### Architecture proposée (réutilise l'existant, comme demandé)

```
syntheticProfiles.ts  →  profils (objectif × ambition × PHYSIOLOGIE [nouveau])
useQARunner.ts        →  génère un plan réel par profil × N répétitions
checks.ts (B1-B14)     →  checks structurés par run
verdict.ts             →  verdict agrégé — ÉTENDU pour 4 dimensions (voir §3.3)
[NOUVEAU] diffEngine.ts → compare deux versions du moteur sur la même batterie
```

### 3.1 — Écart à combler avant toute extension
Les 12 `QA_PROFILES` actuels partagent TOUS exactement la même
physiologie (`commonAthlete`) — seul l'objectif/l'ambition varie. Il faut
ajouter une dimension physiologique INDÉPENDANTE de l'objectif.

### 3.2 — Profils proposés pour la V1 (à valider avec toi avant implémentation)

Plutôt que croiser les 12 objectifs existants avec N physiologies (explosion
combinatoire difficile à exécuter/maintenir), je propose pour la V1 : **5
objectifs représentatifs** (un par famille de sport réellement prise en
charge) **× 4 archétypes physiologiques** = 20 profils.

**5 objectifs représentatifs** (couvrent route/trail/vélo/triathlon/débutant) :
- 10K (route pure)
- Trail montagne (terrain technique, D+)
- Ironman 70.3 (multi-sport, doubles séances)
- Triathlon sprint (format court, haute densité)
- Start to Run (débutant, aucune donnée physio avancée au départ)

**4 archétypes physiologiques** (valeurs numériques exactes à discuter
avec toi — ce sont des PROFILS, pas des chiffres déjà arrêtés) :
1. **Complet mesuré** — VLamax labo, VO2max test, FTP mesuré, économie
   connue (cas le plus favorable, sert de référence).
2. **Estimé seul** — aucune mesure labo, tout dérivé de VMA/allure/sprint
   (tier `estimation` partout) — teste la robustesse des reconciliers/
   zones quand rien n'est mesuré (lien direct avec F7 volet 2/3).
3. **Données incomplètes** — plusieurs champs `null` (ex. pas de VO2max,
   pas de poids) — teste les replis documentés (`fallbackReason`,
   politique "Insufficient Data No Fake Defaults").
4. **Atypique** — VLamax très haute + VO2max très haut simultanément (cas
   rare mais physiologiquement possible, cf. garde-fou décorrélation
   `decorrelationGuard.ts`) + âge master (40+, cycle 2:1).

### 3.3 — Critères de qualification (tes 4 dimensions, mappées à des checks concrets)

| Ta dimension | Checks mobilisés | Déjà existant ? |
|---|---|---|
| **Techniquement conforme** | B1-B9 (Zod, continuité semaines, catalogue, volume, format) | ✅ existant |
| **Cohérent charge/récup/progression** | B13 (critique), B14 (avertissement), + règles `planValidator.ts` (polarisation, densité jours durs, pattern charge/décharge) | ✅ B13/B14 tout juste branchés ; le reste existe déjà côté `planValidator.ts` mais n'est pas encore appelé par `useQARunner.ts` — **à brancher aussi pour le Lab** |
| **Adapté aux données/contraintes** | B5 (catalogue injecté), B7/B8 (objectif↔sport, quotas), `enforceAthleteConstraints` (contraintes coach) | ✅ existant |
| **Suffisamment fiable pour le coach** | Verdict agrégé 🟢/🟠/🔴 (`verdict.ts`) — **à étendre** : aujourd'hui binaire par run, pas par (sport × ambition) agrégé sur N runs | ⚠️ à construire |

Pour la 4e dimension, je propose un verdict **par (objectif × ambition)**,
pas par run isolé : sur N répétitions, quel % de runs est 🟢/🟠/🔴 — un
objectif avec 100% de runs 🟢 est "fiable", un objectif avec 30% de 🔴
mérite un audit avant d'être proposé tel quel au coach.

### 3.4 — Mode de comparaison entre deux versions du moteur

Proposition : `diffEngine.ts` prend deux refs (ex. deux commits/branches,
ou deux configurations de feature-flag), fait tourner la MÊME batterie de
profils × N répétitions sur chacune, et compare :
- **Comparaison DÉTERMINISTE, 1:1 acceptable** : structure (continuité des
  semaines, Zod valide, catalogId appartient au catalogue injecté) — ce
  sont des propriétés qui ne dépendent pas du contenu choisi par l'IA.
- **Comparaison par TAUX, jamais 1:1** (ta mise en garde explicite) : tout
  ce qui dépend du contenu réellement généré par l'IA (quelle fiche
  choisie, quel texte) — comparer le **taux d'échec** de chaque check sur
  N répétitions avant vs après, pas une seule paire de runs. Un seuil de
  régression proposé : le taux d'échec d'un check augmente de plus de X
  points de pourcentage (X à discuter, pas une valeur que j'invente seul)
  sur N≥5 répétitions avant de qualifier ça de régression plutôt que de
  variance normale de génération.

### 3.5 — Points bloquants à trancher avant toute implémentation

1. **Coût/volume** : 20 profils × N répétitions × 2 versions = un nombre
   de vraies générations IA (donc de vrais appels payants) potentiellement
   important selon N — quel N minimal acceptable (3 ? 5 ?) et quelle
   fréquence d'exécution (à chaque PR ? sur demande seulement ?).
2. **Mécanisme de bascule entre deux versions du moteur** : comparer "deux
   versions" nécessite de pouvoir exécuter le code des deux — git worktree
   sur deux commits, ou un feature-flag si le changement est assez
   localisé ? Je n'ai pas tranché ce point, il conditionne l'implémentation.
3. **Valeurs numériques exactes des 4 archétypes physiologiques** —
   proposées en §3.2 comme catégories, pas comme chiffres arrêtés ; à
   fixer avec toi (ou un autre coach) pour qu'elles soient réalistes, pas
   inventées par moi sans base clinique.
4. **Brancher `planValidator.ts` dans `useQARunner.ts`** — nécessaire pour
   la dimension "cohérent charge/récup/progression" (aujourd'hui,
   `useQARunner` ne génère et ne checke que via B1-B14, jamais
   `validatePlan`) — un vrai travail d'intégration, pas juste un ajout de
   profils.

**Rien de la section 3 n'a été implémenté — c'est le plan demandé, en
attente de ta validation avant tout code.**
