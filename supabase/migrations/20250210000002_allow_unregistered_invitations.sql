-- Función mejorada para enviar invitación (permite emails no registrados)
CREATE OR REPLACE FUNCTION public.send_company_pilot_invitation(
  company_id_param UUID,
  pilot_email_param TEXT,
  message_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  pilot_profile RECORD;
  company_record RECORD;
  company_user_plan TEXT;
  current_pilot_count INTEGER;
  invitation_id UUID;
  pilot_exists BOOLEAN;
BEGIN
  -- Normalizar email
  pilot_email_param := LOWER(TRIM(pilot_email_param));
  
  -- 1. Verificar que la empresa existe y obtener datos
  SELECT c.*, p.full_name as company_name
  INTO company_record
  FROM public.companies c
  JOIN public.profiles p ON c.user_id = p.id
  WHERE c.id = company_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Empresa no encontrada'
    );
  END IF;
  
  -- 2. Verificar que la empresa tiene plan activo
  company_user_plan := public.get_user_plan(company_record.user_id);
  
  IF company_user_plan NOT IN ('empresa', 'premium') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo empresas con Plan Empresa pueden invitar pilotos'
    );
  END IF;
  
  -- 3. Verificar límite de pilotos (4 máximo)
  SELECT COUNT(*) INTO current_pilot_count
  FROM public.company_pilots
  WHERE company_id = company_id_param;
  
  IF current_pilot_count >= COALESCE(company_record.max_company_pilots, 4) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Has alcanzado el límite máximo de pilotos (4)'
    );
  END IF;
  
  -- 4. Buscar piloto por email (OPCIONAL - puede no existir)
  SELECT id, email, full_name, user_type
  INTO pilot_profile
  FROM public.profiles
  WHERE LOWER(email) = pilot_email_param;
  
  pilot_exists := FOUND;
  
  -- 5. Si el piloto existe, hacer validaciones adicionales
  IF pilot_exists THEN
    -- Verificar que es un piloto
    IF pilot_profile.user_type != 'pilot' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'El usuario no es un piloto'
      );
    END IF;
    
    -- Verificar que el piloto tiene plan gratis
    IF public.get_user_plan(pilot_profile.id) != 'free' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'El piloto ya tiene un plan de pago activo'
      );
    END IF;
    
    -- Verificar que no hay invitación pendiente
    IF EXISTS (
      SELECT 1 FROM public.company_pilot_invitations
      WHERE company_id = company_id_param
        AND pilot_id = pilot_profile.id
        AND status = 'pending'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Ya existe una invitación pendiente para este piloto'
      );
    END IF;
    
    -- Verificar que el piloto no está ya en la empresa
    IF EXISTS (
      SELECT 1 FROM public.company_pilots
      WHERE company_id = company_id_param
        AND pilot_id = pilot_profile.id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Este piloto ya pertenece a tu empresa'
      );
    END IF;
  ELSE
    -- Si no existe, verificar que no haya invitación pendiente con ese email
    IF EXISTS (
      SELECT 1 FROM public.company_pilot_invitations
      WHERE company_id = company_id_param
        AND LOWER(pilot_email) = pilot_email_param
        AND status = 'pending'
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Ya existe una invitación pendiente para este email'
      );
    END IF;
  END IF;
  
  -- 6. Crear invitación
  INSERT INTO public.company_pilot_invitations (
    company_id,
    pilot_email,
    pilot_id,
    invited_by,
    message,
    status
  ) VALUES (
    company_id_param,
    pilot_email_param,
    CASE WHEN pilot_exists THEN pilot_profile.id ELSE NULL END,
    company_record.user_id,
    message_param,
    'pending'
  ) RETURNING id INTO invitation_id;
  
  -- 7. Crear notificación SOLO si el piloto ya existe
  IF pilot_exists THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      pilot_profile.id,
      'company_invitation',
      'Invitación de Empresa',
      company_record.company_name || ' te ha invitado a unirte a su equipo',
      jsonb_build_object(
        'invitation_id', invitation_id,
        'company_id', company_id_param,
        'company_name', company_record.company_name
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', invitation_id,
    'pilot_name', CASE WHEN pilot_exists THEN pilot_profile.full_name ELSE pilot_email_param END,
    'pilot_exists', pilot_exists
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.send_company_pilot_invitation IS 'Envía invitación de empresa a piloto (registrado o no) y crea notificación si existe';
