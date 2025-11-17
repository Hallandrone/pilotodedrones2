-- Add rejection_observations field to user_certifications table
ALTER TABLE public.user_certifications
ADD COLUMN IF NOT EXISTS rejection_observations TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_certifications.rejection_observations IS 'Observaciones del administrador al rechazar el certificado';

