# Frontière de qualification et DET — NO-GO maintenu

Aucun fichier DET modifié. Le contrat V25 examiné dans V2.2 reste une référence en lecture seule ; aucun nouveau moteur ni calendrier n'est intégré.

Les paramètres physiologiques des traces et du contexte de plan transportent désormais la qualification des références VLamax brutes et effectives. Un scalar inconnu ne devient pas mesure par son nom, son stockage, sa catégorie ou son score interne. Même une revendication raw `direct_measurement` est requalifiée avant le handoff ; le raw original reste intact pour l'audit.

| État | Interprétation admissible |
| --- | --- |
| `unknown` / `not_established` | Aucune admissibilité scientifique supérieure déduite ; méthode/date/marge ne sont pas comblées. |
| `documented_context` / `documented_context_only` | Contexte documentaire déclaré ; source non vérifiée indépendamment. Ni validation individuelle, ni dose approuvée. |
| Score interne 0,95 ou marge ±0,02 | Heuristique/calcul hérités ; pas probabilité ou borne expérimentale individuelle à transférer. |
| Incertitude rapportée | Source et fondement conservés, statut non vérifié indépendamment ; aucune assimilation automatique à `individualErrorBound` certifié. |

Tous les objets générés gardent `individualValidityEstablished:false` et `individualDoseApproved:false`. Les vieux labels/flags stockés ne peuvent imposer une approbation à la qualification recalculée.

Le raccord futur doit encore vérifier revendication exacte, sujet, quantité/unité/discipline, méthode, dates, artefact source et registre vérifié, conformément aux exigences DET. Aucune date d'expiration, empreinte de source vérifiée ou approbation coach n'est inventée ici. Un intégrateur qui lit le champ legacy sans la qualification ne bénéficie d'aucun GO.

Les valeurs numériques peuvent continuer d'alimenter les calculs historiques compatibles ; cela ne lève aucun refus sportif, plafond individuel ou contrainte de récupération. Le résultat documentaire n'approuve aucune prescription. Les inconnues et conditions de sécurité doivent rester visibles et opérantes dans une future intégration autorisée séparément.
