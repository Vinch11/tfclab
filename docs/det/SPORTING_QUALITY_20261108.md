# Qualité sportive du parcours DET normal — 8 novembre 2026

## Demande et contrat conservé

Le plan initial croise cinq entrées de l'application : objectif, ambition
effective, profil physiologique figé, limiteurs identifiés et niveau
d'entraînement actuel renseigné par le coach. L'assimilation ne doit pas être
inventée depuis la VMA, le chrono ou les heures visées. Elle sert aux adaptations
ultérieures, ou à la construction initiale lorsqu'elle est explicitement donnée
par le coach. Aucun score d'assimilation ni nouvelle échelle n'est fabriqué ici.

La même entrée figée IA/DET et son empreinte sont conservées. Les restrictions
négatives, ancres, limites de volume, quotas et sources restent actives.

## Défauts reproduits avant correction

Base examinée : `a51a81d8fa5a296a57dbfe8dd6f3e5b540c4c1ee`, branche de #466.
Le test de construction/export existant passait malgré des séances
d'initiation pour un coureur entraîné et un affûtage dépourvu d'intensité.
Quatre contrôles sportifs du nouveau cas de référence échouaient avant
correction : contexte des sources, espacement, spécifique marathon et maintien
du volume jusqu'à l'affûtage.

## Corrections

- Le contexte d'une fiche est vérifié séparément de son niveau minimum
  d'admission : initiation, autre épreuve, protocole post-course, chaleur non
  déclarée et méthode nécessitant plusieurs séances ne sont pas interchangeables.
- Le calendrier des efforts exigeants est contrôlé depuis leurs blocs réels,
  y compris entre semaines. Les heures exactes manquantes restent inconnues.
- La sélection course utilise des doses calculables et les bornes de recettes
  existantes. Elle répartit le budget disponible au lieu de systématiquement
  préférer les doses courtes. La sortie longue réutilise le départ individualisé
  et la rampe existante, sans distance kilométrique obligatoire.
- Le spécifique marathon/semi peut occuper une séance clé ou une sortie longue.
  Son volume progresse selon la place dans la préparation et les combinaisons
  réellement admissibles. L'affûtage et la semaine de course gardent un rappel.
- Le limiteur primaire exige une correspondance avec une dose réelle selon les
  critères existants du moteur, puis un contrôle indépendant après substitutions
  (20 min seuil, 8 min VO2 ou 40 min aérobie selon le mécanisme applicable).
  Les associations de catalogue ne deviennent pas une adaptation mesurée.
- Une tolérance de construction de 10 % tient compte des recettes discrètes
  pour la continuité du volume et, lors d'un changement de phase seulement, de
  la dose spécifique (par exemple 95 → 92 min). Il ne s'agit pas d'une loi
  physiologique d'assimilation. Les plafonds et contrôles existants restent requis.
- Un chrono explicitement saisi fournit l'allure de ses blocs spécifiques si
  elle appartient au domaine du profil. Une cible incompatible reste non résolue,
  sans nouvelle ambition ou allure substituée. Sans chrono, le modèle existant
  conserve ses plages.
- Huit compositions de renforcement pour coureurs entraînés complètent les
  circuits d'initiation : séries, répétitions et récupérations explicites, charges
  prescrites au RPE, entretien puis activation. Technique et matériel restent
  des prérequis, les kilogrammes et le 1RM ne sont jamais inventés. Les 800
  sources historiques et les dispositions des 920 imports restent inchangées.

Le constructeur partagé sait conserver la dose course pendant l'affûtage pour
la planification normale IA/app-profile. Le moteur strict conserve explicitement
la disposition d'activation liée aux anciens scénarios revus, tant que ces
dispositions ne sont pas requalifiées. Aucun validateur strict n'a été assoupli.
Le macrocalendrier partagé est conservé ; le type taper/race gouverne le contexte
opérationnel des prescriptions et leurs libellés dans le plan normal.

## Cas marathon de référence, synthétique

Coach : entraîné, compétiteur, 8 h disponibles, fréquence Auto, 2 renforts,
2 séances maximum par jour. Profil : 42 ans, VMA 18 km/h, allure seuil 240 s/km.
Objectif : 187 min au marathon. Aucun athlète réel ni envoi provider.

| Indicateur | Résultat reproduit |
|---|---|
| Allure des blocs marathon | 265,9 s/km, soit environ 4 min 26 s/km, cible coach distincte d'une mesure |
| Course au pic / dernière semaine de charge S13 | 426 min, soit 7 h 06 |
| S14 / S15, course hors force | 243 / 201 min, soit 4 h 03 / 3 h 21 |
| S16, entraînement hors course officielle | 114 min, soit 1 h 54 ; durée de l'épreuve non inventée |
| Spécifique S5 / S7 / S8 / S10-S11-S13 | 12 / 30 / 45 / 60 min par semaine de charge |
| Rappels spécifiques S14 / S15 / S16 | 10 / 10 / 10 min |
| Sortie longue S1 / S2 / S4 / S13 | 90 / 95 / 110 / 150 min |
| Initiation, chaleur non déclarée, efforts exigeants consécutifs | Aucun dans ce cas |
| Priorité explicite du coach | Réordonnancement VLamax conservé et doses correspondantes vérifiées |

Ces chiffres démontrent les propriétés testées de cette préparation synthétique.
Ils ne démontrent pas qu'un athlète réel réalisera 3 h 07, ni que chaque préparation
produite par l'application est sportivement validée.

## Affichage et projections

- Les vitesses course sont présentées en min/km sans modifier les valeurs
  archivées ; la vérification de catalogue accepte aussi l'ancien texte m/s.
- Le PDF compare une allure à une allure et réutilise le comparateur existant
  pour calculer les écarts. Les références populationnelles restent descriptives.
- Récupération, affûtage et compétition portent leurs vrais libellés. La priorité
  globale du profil est distincte du chantier du bloc.
- Les scores de durabilité et d'économie restent dans leur échelle 0–100 ; les
  deltas affichés suivent le plafonnement. Les projections restent des scénarios
  théoriques : ni une preuve du contenu du plan, ni des gains garantis. L'égalité
  de trois projections LT2 n'est pas, à elle seule, la preuve d'une constante.

## Validation et limites

Version intégrée vérifiée : `5052a32`, avec les correctifs IA de `9e7bded`.
Déclaration de source fraîche :
`f1c7260fcd507f5db075987bd2f6d543dd4c494ea9cdaf10ebbb26a7889b6958` ;
`attested=false`, aucune attestation de déploiement.

- TypeScript application et configuration Vite : réussis.
- ESLint des 25 fichiers TypeScript modifiés : réussi, aucune erreur.
- Compilation Vite 5.4.19 et PWA : réussie.
- Contrôles ciblés du marathon réel dans le pipeline normal, sources complètes
  et PDF : 48 tests réussis dans trois suites. Les cas sont synthétiques.
- Marathon 16/40 semaines et contrôles de proposition : 43 tests réussis dans
  deux suites (chevauchement avec le groupe précédent, ne pas additionner).
- Parcours stricts course et familles dédiées : 20 contrôles réussis dans les
  deux suites V358/V359 relancées après conservation des dispositions revues.
- Exécution frontend globale : 4 423 réussis, 6 échecs, 1 ignoré et 6 todo,
  sur 501 fichiers. Cinq échecs sont des délais de test de 5 s ; le sixième est
  le refus moteur du semi de 30 semaines pendant cette exécution parallèle.
- Relance séquentielle des trois suites concernées : 70 réussis et un autre
  dépassement de 5 s. Ce dernier cas réussit seul, sans modifier son délai ni
  ses assertions (2,34 s de test). Chacun des six cas initialement échoués a
  réussi à la relance. **Cela ne constitue pas une exécution globale verte** :
  la stabilité sous concurrence et la CI du candidat restent à confirmer.

Les tests n'effectuent aucun achat IA, aucune génération Lovable payante et aucun
envoi Nolio. L'ancienne archive de l'athlète n'est pas réécrite.

Le navigateur local ne dispose pas de Chromium. L'installation officielle a
reçu un document HTML de 195 octets à la place de l'archive ; les essais
Playwright ne constituent donc pas une validation navigateur réussie.

Les nouvelles compositions de force sont des candidates originales, sans
validation scientifique indépendante de leur dose exacte. Soutien de principe :
https://pubmed.ncbi.nlm.nih.gov/38165636/ ; cela ne valide ni un pourcentage de
gain individuel ni l'équivalence RPE–1RM.

Une revue sportive sur le profil réel et un nouvel essai QA restent nécessaires.
Ce correctif ne publie pas l'application et ne déploie pas les fonctions backend.

## Transmission du correctif

Branche : `fix/det-sporting-quality-20261108`, à comparer à
`fix/tfclab-finalization-20261108` (PR #466, base `9e7bded`).
Après le premier refus automatique, le coach a explicitement autorisé la
transmission au dépôt `Vinch11/tfclab` et la création d'une PR brouillon.
Le terminal ne disposant pas d'authentification GitHub, la transmission utilise
le connecteur GitHub et un commit contenant le même arbre de fichiers vérifié.
La fusion et le déploiement ne font pas partie de cette transmission.
