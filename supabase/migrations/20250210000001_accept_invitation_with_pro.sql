-- Función mejorada para aceptar invitación y activar Plan Pro automáticamente
CREATE OR REPLACE FUNCTION public.accept_company_invitation_with_pro(
  invitation_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  invitation_record RECORD;
  company_record RECORD;
  pilot_user_id UUID;
BEGIN
  -- 1. Obtener invitación
  SELECT * INTO invitation_record
  FROM public.company_pilot_invitations
  WHERE id = invitation_id_param
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitación no encontrada o ya procesada'
    );
  END IF;
  
  -- 2. Verificar que quien acepta es el piloto invitado
  IF invitation_record.pilot_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permiso para aceptar esta invitación'
    );
  END IF;
  
  -- 3. Obtener datos de la empresa
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = invitation_record.company_id;
  
  -- 4. Verificar límite de pilotos nuevamente
  IF NOT public.can_add_company_pilot(invitation_record.company_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La empresa ha alcanzado su límite de pilotos'
    );
  END IF;
  
  -- 5. Agregar piloto a la empresa
  INSERT INTO public.company_pilots (company_id, pilot_id)
  VALUES (invitation_record.company_id, invitation_record.pilot_id);
  
  -- 6. ACTIVAR PLAN PRO AUTOMÁTICAMENTE
  -- Primero verificar si ya tiene suscripción
  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = invitation_record.pilot_id
  ) THEN
    -- Actualizar suscripción existente a Pro
    UPDATE public.user_subscriptions
    SET 
      plan_name = 'pro',
      status = 'active',
      renewal_date = NOW() + INTERVAL '1 year',
      payment_method = 'company_sponsored',
      updated_at = NOW()
    WHERE user_id = invitation_record.pilot_id;
  ELSE
    -- Crear nueva suscripción Pro
    INSERT INTO public.user_subscriptions (
      user_id,
      plan_name,
      status,
      renewal_date,
      payment_method
    ) VALUES (
      invitation_record.pilot_id,
      'pro',
      'active',
      NOW() + INTERVAL '1 year',
      'company_sponsored'
    );
  END IF;
  
  -- 7. Actualizar invitación
  UPDATE public.company_pilot_invitations
  SET status = 'accepted',
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_id_param;
  
  -- 8. Crear notificación de bienvenida
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    invitation_record.pilot_id,
    'welcome_to_company',
    '¡Bienvenido al equipo! Plan Pro Activado',
    'Ahora tienes acceso a todas las características Pro mientras seas parte del equipo',
    jsonb_build_object(
      'company_id', invitation_record.company_id,
      'plan_activated', 'pro'
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'company_id', invitation_record.company_id,
    'plan_activated', 'pro'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.accept_company_invitation_with_pro IS 'Acepta invitación de empresa, agrega piloto al equipo y activa Plan Pro automáticamente';

-- Función para obtener invitación por token (para el link del email)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(
  token_param UUID
)
RETURNS JSONB AS $$
DECLARE
  invitation_record RECORD;
  company_name TEXT;
BEGIN
  -- Buscar invitación por token
  SELECT 
    cpi.*,
    c.company_name,
    p.full_name as pilot_name
  INTO invitation_record
  FROM public.company_pilot_invitations cpi
  JOIN public.companies c ON cpi.company_id = c.id
  LEFT JOIN public.profiles p ON cpi.pilot_id = p.id
  WHERE cpi.invitation_token = token_param
    AND cpi.status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitación no encontrada o ya procesada'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'company_name', invitation_record.company_name,
      'pilot_email', invitation_record.pilot_email,
      'pilot_name', invitation_record.pilot_name,
      'message', invitation_record.message,
      'invited_at', invitation_record.invited_at
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_invitation_by_token IS 'Obtiene detalles de invitación por token para mostrar en página de aceptación';
