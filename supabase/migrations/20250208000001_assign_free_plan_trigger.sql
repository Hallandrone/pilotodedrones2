-- Trigger para asignar plan gratis automáticamente a nuevos usuarios
-- Fecha: 2025-02-08

-- 1. Crear función que se ejecutará cuando se cree un nuevo perfil
CREATE OR REPLACE FUNCTION public.assign_free_plan_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si el usuario ya tiene una suscripción
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = NEW.id
  ) THEN
    -- Crear suscripción gratuita para el nuevo usuario
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_name,
      status,
      payment_method,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'free',
      'active',
      NULL,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger que se ejecuta después de insertar un perfil
DROP TRIGGER IF EXISTS trigger_assign_free_plan ON public.profiles;

CREATE TRIGGER trigger_assign_free_plan
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_free_plan_to_new_user();

COMMENT ON FUNCTION public.assign_free_plan_to_new_user IS 
'Asigna automáticamente el plan gratuito a nuevos usuarios al crear su perfil';

COMMENT ON TRIGGER trigger_assign_free_plan ON public.profiles IS 
'Trigger que asigna plan gratis automáticamente cuando se crea un nuevo perfil';
