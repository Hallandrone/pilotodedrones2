-- Políticas RLS para validar límite de pilotos en empresas
-- Fecha: 2025-02-08

-- 1. Crear función para verificar si una empresa puede agregar más pilotos
CREATE OR REPLACE FUNCTION public.can_add_company_pilot(company_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_pilot_count INTEGER;
  max_pilots INTEGER;
  company_user_id UUID;
  company_plan TEXT;
BEGIN
  -- Obtener user_id de la empresa
  SELECT user_id INTO company_user_id
  FROM public.companies
  WHERE id = company_id_param;
  
  IF company_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar que la empresa tenga plan Empresa activo
  company_plan := public.get_user_plan(company_user_id);
  
  IF company_plan NOT IN ('empresa', 'premium') THEN
    RETURN FALSE;
  END IF;
  
  -- Obtener límite de pilotos (default 4)
  SELECT COALESCE(max_company_pilots, 4) INTO max_pilots
  FROM public.companies
  WHERE id = company_id_param;
  
  -- Contar pilotos actuales
  SELECT COUNT(*) INTO current_pilot_count
  FROM public.company_pilots
  WHERE company_id = company_id_param;
  
  -- Verificar si puede agregar más pilotos
  RETURN current_pilot_count < max_pilots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_add_company_pilot IS 
'Verifica si una empresa puede agregar más pilotos (límite de 4 para Plan Empresa)';

-- 2. Crear función para verificar si un piloto puede ser agregado a una empresa
CREATE OR REPLACE FUNCTION public.can_pilot_join_company(pilot_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pilot_plan TEXT;
BEGIN
  -- Obtener plan del piloto
  pilot_plan := public.get_user_plan(pilot_user_id);
  
  -- El piloto debe tener plan gratis para poder ser agregado a una empresa
  -- Si tiene plan Pro o Empresa, no puede ser agregado
  RETURN pilot_plan = 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_pilot_join_company IS 
'Verifica si un piloto puede ser agregado a una empresa (debe tener plan gratis)';

-- 3. Actualizar política RLS para company_pilots - INSERT
DROP POLICY IF EXISTS "Company can add pilots with limits" ON public.company_pilots;

CREATE POLICY "Company can add pilots with limits"
ON public.company_pilots
FOR INSERT
WITH CHECK (
  -- Verificar que el usuario autenticado sea el dueño de la empresa
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = company_id
    AND user_id = auth.uid()
  )
  -- Verificar que la empresa pueda agregar más pilotos
  AND public.can_add_company_pilot(company_id)
  -- Verificar que el piloto tenga plan gratis
  AND public.can_pilot_join_company(
    (SELECT user_id FROM public.pilots WHERE id = pilot_id)
  )
);

-- 4. Política para que empresas puedan ver sus pilotos
DROP POLICY IF EXISTS "Company can view their pilots" ON public.company_pilots;

CREATE POLICY "Company can view their pilots"
ON public.company_pilots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = company_id
    AND user_id = auth.uid()
  )
);

-- 5. Política para que empresas puedan eliminar pilotos
DROP POLICY IF EXISTS "Company can remove pilots" ON public.company_pilots;

CREATE POLICY "Company can remove pilots"
ON public.company_pilots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = company_id
    AND user_id = auth.uid()
  )
);

-- 6. Política para que admins puedan ver todos los pilotos de empresas
DROP POLICY IF EXISTS "Admins can view all company pilots" ON public.company_pilots;

CREATE POLICY "Admins can view all company pilots"
ON public.company_pilots
FOR SELECT
USING (
  public.is_admin(auth.uid())
);

COMMENT ON POLICY "Company can add pilots with limits" ON public.company_pilots IS 
'Permite a empresas agregar pilotos con validación de límite (4) y plan gratis del piloto';
