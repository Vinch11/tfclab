-- Calibrage 30/30 Billat sur Tlim@vVO2max : nouvelle colonne pour stocker le
-- résultat du test terrain (BILLAT_RUN_TLIM_TEST, protocole Billat 1996 —
-- courir à vVO2max jusqu'à épuisement). Utilisée pour personnaliser le
-- volume (nb de répétitions) des fiches BILLAT_RUN_30_30_INTRO/PRO — cf.
-- src/lib/tlimVolumeCalibration.ts. Absente pour la majorité des athlètes :
-- fallback silencieux sur le calibrage classique (palier fixe existant).
ALTER TABLE public.snapshots ADD COLUMN IF NOT EXISTS tlim_vvo2max_min numeric(5,2) NULL;
