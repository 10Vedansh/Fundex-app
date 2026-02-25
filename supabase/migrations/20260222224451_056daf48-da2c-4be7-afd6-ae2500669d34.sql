
-- Add PIN column to profiles table (hashed PIN stored as text)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT NULL;

-- Add PIN set flag for quick checking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_set BOOLEAN DEFAULT false;
