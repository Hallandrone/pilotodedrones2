-- Migración para sistema de tres planes: Gratis, Pro, Empresa
-- Fecha: 2025-02-08

-- 1. Actualizar constraint de plan_name para incluir 'free'
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_name_check;

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_name_check 
CHECK (plan_name IN ('free', 'basic', 'pro', 'premium', 'profesional', 'empresa'));

-- 2. Agregar campo para límite de pilotos en empresas
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS max_company_pilots INTEGER DEFAULT 4;

COMMENT ON COLUMN public.companies.max_company_pilots IS 'Número máximo de pilotos que puede agregar la empresa (Plan Empresa = 4)';

-- 3. Crear función para obtener el plan actual de un usuario
CREATE OR REPLACE FUNCTION public.get_user_plan(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  user_plan TEXT;
BEGIN
  -- Buscar suscripción activa del usuario
  SELECT plan_name INTO user_plan
  FROM public.user_subscriptions
  WHERE user_id = user_id_param
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Si no tiene suscripción activa, retornar 'free'
  IF user_plan IS NULL THEN
    RETURN 'free';
  END IF;
  
  RETURN user_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_plan IS 'Retorna el plan actual del usuario (free, pro, empresa, etc.)';

-- 4. Crear función para verificar si usuario tiene acceso a una característica
CREATE OR REPLACE FUNCTION public.check_plan_feature(
  user_id_param UUID,
  feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
BEGIN
  -- Obtener plan del usuario
  user_plan := public.get_user_plan(user_id_param);
  
  -- Características por plan
  CASE feature_name
    -- Características disponibles para todos (free, pro, empresa)
    WHEN 'public_profile' THEN RETURN TRUE;
    WHEN 'qr_code' THEN RETURN TRUE;
    WHEN 'search_visibility' THEN RETURN TRUE;
    
    -- Características solo para Pro y Empresa
    WHEN 'certificates' THEN RETURN user_plan IN ('pro', 'premium', 'profesional', 'empresa');
    WHEN 'flight_logs' THEN RETURN user_plan IN ('pro', 'premium', 'profesional', 'empresa');
    WHEN 'weather_data' THEN RETURN user_plan IN ('pro', 'premium', 'profesional', 'empresa');
    WHEN 'custom_url' THEN RETURN user_plan IN ('pro', 'premium', 'profesional', 'empresa');
    WHEN 'featured_profile' THEN RETURN user_plan IN ('pro', 'premium', 'profesional', 'empresa');
    WHEN 'certified_badge' THEN RETURN user_plan IN ('pro', 'premium', 'profesional', 'empresa');
    
    -- Características solo para Empresa
    WHEN 'company_pilots' THEN RETURN user_plan IN ('empresa', 'premium');
    WHEN 'company_badge' THEN RETURN user_plan IN ('empresa', 'premium');
    WHEN 'featured_recommendations' THEN RETURN user_plan IN ('empresa', 'premium');
    WHEN 'whatsapp_support' THEN RETURN user_plan IN ('empresa', 'premium');
    WHEN 'profile_views' THEN RETURN user_plan IN ('empresa', 'premium');
    WHEN 'contact_leads' THEN RETURN user_plan IN ('empresa', 'premium');
    
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_plan_feature IS 'Verifica si un usuario tiene acceso a una característica específica según su plan';

-- 5. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_status 
ON public.user_subscriptions(user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_name 
ON public.user_subscriptions(plan_name);

-- 6. Agregar comentarios para documentación
COMMENT ON CONSTRAINT user_subscriptions_plan_name_check ON public.user_subscriptions IS 
'Planes disponibles: free (gratis), pro/profesional ($14.990), empresa/premium ($39.990)';
