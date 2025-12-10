-- Agregar campos para tracking de emails enviados
ALTER TABLE public.company_pilot_invitations
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_company_pilot_invitations_token
ON public.company_pilot_invitations(invitation_token)
WHERE status = 'pending';

COMMENT ON COLUMN public.company_pilot_invitations.email_sent IS 'Indica si se envió el email de invitación';
COMMENT ON COLUMN public.company_pilot_invitations.email_sent_at IS 'Fecha y hora en que se envió el email';
COMMENT ON COLUMN public.company_pilot_invitations.invitation_token IS 'Token único para validar la invitación desde el link del email';
