-- Add certificate_type column to user_certifications table
-- This allows distinguishing between pilot certificates and company certificates (AOC, CEO)
ALTER TABLE public.user_certifications
ADD COLUMN IF NOT EXISTS certificate_type TEXT DEFAULT 'pilot' CHECK (certificate_type IN ('pilot', 'AOC', 'CEO'));

-- Add comment for documentation
COMMENT ON COLUMN public.user_certifications.certificate_type IS 'Tipo de certificado: pilot (para pilotos), AOC o CEO (para empresas)';

-- Update existing records to have 'pilot' as default type
UPDATE public.user_certifications
SET certificate_type = 'pilot'
WHERE certificate_type IS NULL;


