-- Ajouter la date de naissance aux athlètes
ALTER TABLE public.athletes 
ADD COLUMN birth_date date NULL;

-- Commentaire explicatif
COMMENT ON COLUMN public.athletes.birth_date IS 'Date de naissance pour calcul AAI (Age Adjustment Index)';