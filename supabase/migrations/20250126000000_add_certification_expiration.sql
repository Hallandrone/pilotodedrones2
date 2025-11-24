-- Agregar campos de validación anual a la tabla pilots
ALTER TABLE public.pilots
ADD COLUMN IF NOT EXISTS certification_validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS certification_expires_at TIMESTAMP WITH TIME ZONE;

-- Agregar comentarios
COMMENT ON COLUMN public.pilots.certification_validated_at IS 'Fecha de última validación profesional del piloto';
COMMENT ON COLUMN public.pilots.certification_expires_at IS 'Fecha de expiración de la validación (1 año después de la validación)';

-- Crear función para verificar si la certificación está vigente
CREATE OR REPLACE FUNCTION public.is_certification_valid(pilot_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    certification_status = true 
    AND certification_expires_at IS NOT NULL 
    AND certification_expires_at > NOW()
  FROM public.pilots
  WHERE user_id = pilot_user_id;
$$;

-- Crear índice para búsquedas eficientes de certificaciones próximas a vencer
CREATE INDEX IF NOT EXISTS idx_pilots_certification_expires_at 
ON public.pilots(certification_expires_at) 
WHERE certification_status = true;

