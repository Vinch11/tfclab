# Tests et limites de validation V21B

DRAFT — NO-GO. Couche documentaire expérimentale ; aucune prescription, dose, récupération, intensité ou règle historique modifiée.

| Contrôle exécuté | Résultat / preuve |
|---|---|
| Vérificateur ZIP fourni | [PASS](evidence/verify-handoff.txt), empreintes du manifeste conservées |
| Contrats V21B | [24 tests passent](evidence/contracts-coach-final.txt), dont huit assimilations interdites testées en sous-cas |
| Audit indépendant | [Résultat final](evidence/independent-coach-final.json), sans importer le constructeur ni la porte d’admission V21B |
| Rejeu déterministe | 11 artefacts identiques, octet pour octet, depuis la réponse publique figée |
| Sources historiques | 4 203 fichiers antérieurs inchangés, 920 IDs, 2 425 variantes, 600 cas archivés |
| Coach | 920 textes canoniques V16, 920 vues V19 et 418 vues candidates exactes, section facultative distincte |
| Nolio | 15 payloads expérimentaux exacts, aucune bibliographie ajoutée |
| Ironman | Deux baselines intactes ; blocages historiques conservés |

Les huit contrôles portent sur des déclarations structurées : non-interchangeabilité LT1/LT2/MLSS/FTP/CP ; estimation terrain VLamax distincte de la mesure labo ; pas de durabilité depuis un test frais ; CSS non transférée entre nages ; dernière récupération non supposée ; 4×15 non équivalent automatiquement à 6×10 ; tolérances non présumées ; progression non acquise par le passage du temps. Ils ne prétendent pas reconnaître toute ambiguïté en langage naturel ni valider la vérité scientifique d’un texte.

Les tests rejettent hash absent/factice, réponse substituée, citation ou affirmation modifiée, source périmée, variante inconnue, titre seul, accès intégral non effectué, approbation et dose exacte non établie. Les deux paquets passent le schéma V21A **inchangé**, importé comme fonction pure ; aucun contrôleur ou unité V21A n’est relancé.

Les quatre contrats ajoutés après la première passe vérifient aussi la conservation de la population, du protocole, du résultat documentaire, des limites et des inconnues ; ils refusent une variante implicite ou une modification de contenu dissimulée derrière une empreinte correcte. Les premiers logs sont conservés. Aucun échec sportif n’est déclassé ni supprimé.

```sh
PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v21b-tests.py
PYTHONDONTWRITEBYTECODE=1 python scripts/det-engine/v21b-independent.py /tmp/v21b-review-proof.json
```

Le résultat d’audit exige un fichier de sortie nouveau. Les constructeurs et le récupérateur réseau restent soumis au budget V21B et ne doivent pas être relancés après clôture sous ce registre. Les validations sportives historiques ne sont pas réexécutées : l’intégrité atteste la conservation des comportements et preuves antérieurs, sans nouvelle attestation sportive générale.

La première présentation V21B conservait V16 mais omettait les notes de revue ajoutées à V19. Elle a été écartée avant livraison ; `evidence/coach-consolidated/` et son rejeu conservent les deux couches et les 418 vues candidates. Le registre conserve les essais précédents. Les données scientifiques, les doses et les 15 payloads Nolio n’ont pas changé lors de cette correction.

Le contrôle de format Git complet retourne 2 pour les fins de ligne CRLF et blancs de fin de fichier des documents fournis. Les fichiers rédigés passent ce contrôle. Les [résultats complets](evidence/whitespace-check.json) et le [log](evidence/whitespace-check.txt) sont conservés ; le corpus original n’est pas reformaté pour masquer ces signalements, car ses empreintes doivent rester exactes. Les 24 contrats fonctionnels passent indépendamment de ce contrôle de format.
