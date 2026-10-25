# Coach-only — persistance et prescriptions

Référence : #409 `e593dcb360ac375773b99c068f1f3a5b206abbc0`, main distant
`ac01beb8a09b43d73e8d445dea791fac14577e5a`. Branche isolée
`fix/coach-plan-reload`, dépendante de #409. Aucun déploiement, fusion, modèle,
migration, Nolio ou écriture de données réelles. #407 reste inactive.

## Correction démontrée

L'archive `plan_versions.plan_json` conserve le plan structuré courant. Au
chargement explicite, `applyLoadedVersion` ne réutilisait ce JSON que si
`weeklyQuotas` existait. Sans quotas, il reparsait `_markdown`, qui ne transporte
pas tous les champs : durée prescrite, custom, zones, clé, variante, ID catalogue.
C'est une altération de la vue rechargée, pas une corruption démontrée de la base.

Le chargement réutilise désormais le JSON lorsque sa structure de plan est
exploitable, sans condition de quotas. Une copie indépendante prévient les
mutations de l'archive. Les archives Markdown seules restent sur le chemin
historique ; les champs historiquement absents ne sont pas inventés. Ni les
prescriptions, ni les validations, ni la sélection explicite des versions ne
changent. Le post-traitement existant reste actif.

Trois tests comportementaux échouaient avec l'ancien critère ; ils passent
avec la correction. Le premier essai comportait aussi un échec de chemin de
fichier dans le test de câblage, corrigé séparément : ce n'était pas un bug produit.

## Preuves et limites de persistance

| Parcours | Preuve offline | Limite |
|---|---|---|
| Plan historique sans quotas | Fixture enregistrée débutant, sérialisation, deux réouvertures, dose S8=165min | Ne certifie pas Supabase distant ni l'impression native |
| Édition puis récupération | Champs édités conservés ; test composant remplacement → archive → démontage → chargement → export et diagnostic | Transport PDF mocké ; pas un navigateur fermé réellement |
| Profil, tests, plan | Hook cloud réel, transport en mémoire : mise à jour snapshot, ajout test, sauvegarde plan puis remontage ; références et fiabilité conservées | Pas de validation du serveur, des RLS, de la concurrence ou de sa durabilité |
| Refus de sauvegarde | Réponse d'erreur simulée : retour false, ancien plan local et stocké intacts | Coupure après écriture avec réponse perdue non reproduite |
| Rapport physiologique | Tests existants de calcul, cibles et limiteurs réutilisés | Rapport final imprimé et identité du profil à vérifier par le coach |

La table générique `plans` du hook cloud et `plan_versions` utilisé par la page
de génération sont des chemins distincts. Le test du hook ne vaut pas preuve
d'une transaction réelle sur `plan_versions`. Le test de récupération valide
la frontière JSON de l'archive et son câblage à la page. Aucune garantie absolue
d'absence de perte n'est délivrée sans recette du stockage réellement publié.

Les limiteurs calculés sont dérivés du profil/diagnostic, pas une collection de
lignes sauvegardées indépendante. Une récupération des mesures ne prouve pas à
elle seule la restitution du classement coach historique. Sa conservation
complète, notamment après changement de navigateur, reste à qualifier.

Validation locale : suite complète 355 fichiers, 2612 tests verts, 6 TODO ;
puis test composant complété après cette suite (2/2 verts). Les deux nouveaux
fichiers de persistance totalisent 9 tests verts. TypeScript frontend vert.
Lint : aucun problème dans les nouveaux fichiers ; page existante inchangée
à 58 erreurs/22 avertissements avant/après, composant de test sans erreur.
Les TODO et cette dette de lint ne sont pas comptés comme résolus. La CI de la
PR associe ses résultats au commit exact livré.

## Validation sportive conservée

Les audits Q1, #405 et #409 restent les références ; pas de nouvelle taxonomie,
de modification physiologique, de protocole ou d'audit général.

- 10km, semi, marathon, Ironman : profils existants ; diagnostic/décision et
  influence déterministe des limiteurs sur le catalogue initial testés dans #409.
  Ce n'est pas une certification de la dose finale des plans individuels.
- Quatre incompatibilités du PDF70.3 déjà couvertes par #405 : brique aérobie
  associée au race-pace, Sweet Spot Fondation/Build, brique Z2 de décharge
  associée à une fiche intense, CAP95min avec fiche100–150. Refus explicites
  conservés ; ni fiche élargie ni durée gonflée.
- Fixture débutant enregistrée : progression, récupération et distribution
  déjà examinées en Q1. Totaux structurés corrigés dans #409. Une séance clé
  n'est pas nécessairement une séance intense ; les alertes du laboratoire
  fondées sur ce raccourci restent à interpréter, sans retoucher la prescription.
- Quotas historiques incomplets, seuilS1, choix initiaux historiques et thèmes
  suspects : absence de traces suffisantes ; aucune nouvelle cause inventée.

Aucune nouvelle prescription inappropriée suffisamment démontrée n'a été
identifiée dans ce lot. La correction évite de perdre, lors de la récupération,
les données nécessaires à son évaluation. Le score logiciel ne remplace pas
la revue coach des intensités, volumes, composantes de bricks, progressions,
récupérations, phases et réponse aux limiteurs classés.

## Conditions minimales de mise en service

GO : essais offline et revue coach des cas existants.
NO-GO : attestation globale des sauvegardes de production et des plans individuels.

Avant le premier usage réel :

1. Autoriser les fusions retenues, séparément du déploiement. Ce lot dépend de
   #409 ; #406/#407 ne sont pas fusionnées implicitement.
2. Attester les versions publiées et disposer de sauvegardes restaurables ;
   autoriser une publication cohérente si nécessaire. Blocages P4 conservés,
   pas réaudités ici et aucun nouvel audit de confidentialité.
3. Recette sur cas synthétique dans un environnement autorisé : saisir profil
   et test, choisir profil actif, vérifier fiabilité/limiteurs, éditer séance,
   enregistrer, fermer, rouvrir, charger explicitement la version, comparer
   toutes les valeurs et dates, réexporter rapport et plan. Toute écriture de
   recette distante nécessite une autorisation distincte ; aucun athlète réel.
4. Recette d'échec réseau/stockage et reprise sans écraser la dernière version ;
   impression native Safari/desktop. Ne pas traiter le cache local évictable
   comme une sauvegarde durable.
5. Revue sportive manuelle du premier plan de chaque profil ; aucune génération
   payante autorisée par cette checklist, aucune transmission Nolio effectuée.

La confidentialité n'a pas été étendue dans ce chantier ; protections héritées
conservées. Risque résiduel principal : ces tests mockés n'attestent ni la version
déployée ni le comportement sous concurrence ou coupure du stockage réel.
