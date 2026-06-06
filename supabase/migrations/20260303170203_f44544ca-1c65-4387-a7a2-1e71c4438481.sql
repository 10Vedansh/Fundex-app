
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS income_stability text,
  ADD COLUMN IF NOT EXISTS monthly_emis numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dependents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_insurance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS existing_investments text,
  ADD COLUMN IF NOT EXISTS risk_capacity_score integer;
