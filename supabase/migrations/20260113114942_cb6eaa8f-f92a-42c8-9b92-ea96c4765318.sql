-- Ajouter la colonne sex à la table athletes
ALTER TABLE public.athletes 
ADD COLUMN sex TEXT CHECK (sex IN ('M', 'F'));