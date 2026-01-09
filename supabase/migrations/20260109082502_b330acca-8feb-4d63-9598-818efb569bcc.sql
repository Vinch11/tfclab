-- Add layout_preferences column to profiles table for storing section order preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS layout_preferences JSONB DEFAULT '{}'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.layout_preferences IS 'Stores user preferences for section ordering in different tabs (Profil, Evolution, etc.)';