-- Add force_development_mode column to snapshots table
-- Stores whether to show intense workouts even with moderate fatigue
ALTER TABLE public.snapshots 
ADD COLUMN force_development_mode boolean DEFAULT false;