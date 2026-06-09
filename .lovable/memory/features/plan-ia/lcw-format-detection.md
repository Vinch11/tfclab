---
name: LCW (Long Course Weekend) Format Detection
description: Détecte raceName "Long Course Weekend"/"LCW" et injecte bloc prompt 70.3 format 3 jours éclaté (back-to-back overnight au lieu de bricks T2, pacing +3%, nutrition inter-étapes)
type: feature
---

# LCW Format 3-Jours — Adaptation Prompt 70.3

## Détection
Dans `supabase/functions/ai-training-plan/promptHelpers.ts`, le bloc "DURABILITÉ + RACE-SIM 70.3" (amb elite/competitor/podium) inspecte :
- `config.raceGoals[*].raceName`
- `config.raceName`
- `config.objective`

Regex : `/long\s*course\s*weekend|\blcw\b/i`

## Adaptations injectées (6 règles)
1. **Briques T2 → Back-to-back overnight** : remplacer `B_703_BRICK_RACE_PACE` (vélo→run enchaîné) par gros vélo samedi + long run dimanche.
2. **Répétition générale étalée** : pas de simu 4h continue → natation ven soir + vélo sam + run dim.
3. **Pacing vélo plus agressif** : 80-85% → 85-88% FTP (pas de fatigue centrale immédiate).
4. **Nutrition inter-étapes prioritaire** : recharge glycogénique agressive ven soir + sam après-midi.
5. **Conserver "CAP Z2 Fatigued"** lendemain de charge — prépare exactement le dim LCW.
6. **Race Week sur 3 jours** : 3 entrées "COURSE OBJECTIF — Étape Nat/Vélo/Course".

## Pourquoi
LCW Wales/Belgium = format historique à étapes (Ven nat / Sam vélo / Dim run), distinct du 70.3 continu. Paradigme = course à étapes avec récup nuit incomplète, pas effort 4-6h continu.
