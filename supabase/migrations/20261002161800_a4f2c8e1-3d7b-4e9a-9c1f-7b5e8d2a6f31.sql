-- Logo d'application personnalisable par coach : stocké en data URL (base64)
-- directement sur le profil, pas de bucket Storage existant dans ce projet.
-- NULL = logo par défaut (src/assets/logo-2fc.png). RLS déjà couverte par les
-- policies "own profile" existantes sur public.profiles (SELECT/UPDATE scopées
-- auth.uid() = user_id) — aucune policy additionnelle nécessaire.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url text NULL;
