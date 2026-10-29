# Le calendrier historique garde son sens

DRAFT — NO-GO. Scénarios synthétiques uniquement. Transport temporel, compatibilité du créneau, contrôles du bloc et approbation individuelle sont distincts. Aucune dose individuelle ni autorisation d’export approuvée.

Le schéma `src/lib/plan/planSchema.ts:61` impose `durationMin` entier. `v14-calendar.ts:99` renseigne ce champ à partir de la dose planifiée ; `v23-scope.ts` compare sérialisation, séance et sommes. Aucune preuve n’autorise à traiter silencieusement ce champ comme une réserve incluant du temps libre.

Le mode `legacy_exact` exige donc égalité entre exécution et durée historique. Les nages45:55/47:40 et gainages30:34/32:04 ne sont pas directement insérables dans les créneaux natifs35/25min. Les valeurs historiques, erreurs de schéma et comparaisons flottantes V28 sont conservées ; le pont ne les remplace pas par un succès artificiel.

Le mode `synthetic_upper_bound` est nommé et explicitement reconnu dans la fixture complémentaire. Il consomme uniquement les créneaux55/35/85 déjà enregistrés en V28. Il ne modifie aucun `durationMin`, jour, discipline, source ou paramètre historique. Un créneau arbitrairement agrandi, une sémantique non déclarée ou un profil différent sont refusés.

Le moteur réutilise `buildProspectiveCalendar` via la prescription V26, la résolution V28 et les gardes de portée V23. Le pont est un adaptateur de représentation et de validation ; il ne cherche pas une autre répartition ou un second calendrier. Les trois calendriers originaux et leurs décisions sont rejoués à l’identique.

Les secondes d’exercice connues sont comptées séparément. Pour les autres séances de ce scénario unitaire, le pont conserve la réservation et indique exécution inconnue ; il ne transforme pas la somme des réservations en charge réalisée. Les horaires précis sont inconnus par défaut. Des fixtures supplémentaires d’horaires documentés testent absence de conflit, chevauchement et fenêtre trop courte, sans devenir des observations de B.
