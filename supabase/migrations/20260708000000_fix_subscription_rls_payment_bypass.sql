-- =====================================================================
-- FIX CRÍTICO DE SEGURIDAD: bypass de pago en user_subscriptions
-- ---------------------------------------------------------------------
-- Problema: las políticas RLS "Users can update/insert their own
-- subscription" permitían que cualquier usuario autenticado escribiera
-- plan_name/status de SU PROPIA fila desde el navegador, activándose
-- el plan Pro sin pagar (o poniendo en 'active' un pending_payment que
-- ya tenía plan_name='profesional').
--
-- Solución: se eliminan esas dos políticas permisivas. Los usuarios ya
-- NO pueden escribir directo en la tabla. Cancelar/reanudar pasa por dos
-- funciones controladas (SECURITY DEFINER) que solo tocan el `status`
-- de la propia fila y nunca el `plan_name`.
--
-- Intactos: políticas de admin (is_admin) y de service_role (webhook).
-- =====================================================================

-- 1. Cerrar el hoyo: quitar las políticas de escritura del usuario normal
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;

-- 2. RPC: cancelar MI suscripción
--    Solo mi fila, solo si está activa. Nunca toca plan_name.
CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
RETURNS public.user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.user_subscriptions;
BEGIN
  UPDATE public.user_subscriptions
  SET status = 'cancelled',
      updated_at = now()
  WHERE user_id = auth.uid()
    AND status = 'active'
  RETURNING * INTO updated_row;

  RETURN updated_row; -- NULL si no había suscripción activa
END;
$$;

-- 3. RPC: reanudar MI suscripción
--    Solo si estaba 'cancelled' Y sigue vigente (ya fue pagada).
--    Esto impide reactivar un 'pending_payment' que nunca se pagó.
CREATE OR REPLACE FUNCTION public.resume_my_subscription()
RETURNS public.user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.user_subscriptions;
BEGIN
  UPDATE public.user_subscriptions
  SET status = 'active',
      updated_at = now()
  WHERE user_id = auth.uid()
    AND status = 'cancelled'
    AND renewal_date IS NOT NULL
    AND renewal_date > now()
  RETURNING * INTO updated_row;

  RETURN updated_row; -- NULL si no había nada vigente que reanudar
END;
$$;

-- 4. Permisos de ejecución: solo usuarios autenticados
REVOKE EXECUTE ON FUNCTION public.cancel_my_subscription() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resume_my_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_my_subscription() TO authenticated;
