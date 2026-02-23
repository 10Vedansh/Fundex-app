
-- Create OTP records table for phone verification
CREATE TABLE public.otp_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  hashed_otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_records ENABLE ROW LEVEL SECURITY;

-- Only service role can access OTP records (edge functions use service role)
-- No public policies needed since all access is through edge functions

-- Index for efficient lookups
CREATE INDEX idx_otp_records_phone ON public.otp_records(phone_number, verified);

-- Auto-cleanup expired records (optional trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_records WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_otps_trigger
AFTER INSERT ON public.otp_records
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();
