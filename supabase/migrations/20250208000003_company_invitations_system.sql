-- Migración para Sistema de Invitaciones de Empresa a Pilotos
-- Fecha: 2025-02-08

-- ============================================
-- 1. TABLA DE INVITACIONES
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_pilot_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pilot_email TEXT NOT NULL,
  pilot_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.company_pilot_invitations IS 'Invitaciones de empresas a pilotos para unirse a su equipo';

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_company_pilot_invitations_company_id 
ON public.company_pilot_invitations(company_id);

CREATE INDEX IF NOT EXISTS idx_company_pilot_invitations_pilot_id 
ON public.company_pilot_invitations(pilot_id);

CREATE INDEX IF NOT EXISTS idx_company_pilot_invitations_status 
ON public.company_pilot_invitations(status) 
WHERE status = 'pending';

-- ============================================
-- 2. TABLA DE NOTIFICACIONES
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notificaciones para usuarios (invitaciones, alertas, etc.)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read 
ON public.notifications(user_id, read) 
WHERE read = FALSE;

-- ============================================
-- 3. FUNCIÓN: ENVIAR INVITACIÓN
-- ============================================
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
  
  -- 4. Buscar piloto por email
  SELECT id, email, full_name, user_type
  INTO pilot_profile
  FROM public.profiles
  WHERE LOWER(email) = pilot_email_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No existe un usuario registrado con ese email'
    );
  END IF;
  
  -- 5. Verificar que es un piloto
  IF pilot_profile.user_type != 'pilot' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El usuario no es un piloto'
    );
  END IF;
  
  -- 6. Verificar que el piloto tiene plan gratis
  IF public.get_user_plan(pilot_profile.id) != 'free' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El piloto ya tiene un plan de pago activo'
    );
  END IF;
  
  -- 7. Verificar que no hay invitación pendiente
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
  
  -- 8. Verificar que el piloto no está ya en la empresa
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
  
  -- 9. Crear invitación
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
    pilot_profile.id,
    company_record.user_id,
    message_param,
    'pending'
  ) RETURNING id INTO invitation_id;
  
  -- 10. Crear notificación para el piloto
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
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', invitation_id,
    'pilot_name', pilot_profile.full_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.send_company_pilot_invitation IS 'Envía invitación de empresa a piloto y crea notificación';

-- ============================================
-- 4. FUNCIÓN: ACEPTAR INVITACIÓN
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_company_invitation(
  invitation_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  invitation_record RECORD;
  company_record RECORD;
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
  
  -- 6. Actualizar invitación
  UPDATE public.company_pilot_invitations
  SET status = 'accepted',
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_id_param;
  
  -- 7. Crear notificación de bienvenida
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    invitation_record.pilot_id,
    'welcome_to_company',
    '¡Bienvenido al equipo!',
    'Ahora tienes acceso a todas las características Pro mientras seas parte del equipo',
    jsonb_build_object(
      'company_id', invitation_record.company_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'company_id', invitation_record.company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.accept_company_invitation IS 'Acepta invitación de empresa y agrega piloto al equipo';

-- ============================================
-- 5. FUNCIÓN: RECHAZAR INVITACIÓN
-- ============================================
CREATE OR REPLACE FUNCTION public.reject_company_invitation(
  invitation_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Obtener invitación
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
  
  -- Verificar permisos
  IF invitation_record.pilot_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permiso para rechazar esta invitación'
    );
  END IF;
  
  -- Actualizar invitación
  UPDATE public.company_pilot_invitations
  SET status = 'rejected',
      responded_at = NOW(),
      updated_at = NOW()
  WHERE id = invitation_id_param;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. POLÍTICAS RLS
-- ============================================

-- Habilitar RLS
ALTER TABLE public.company_pilot_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para company_pilot_invitations
CREATE POLICY "Empresas pueden ver sus invitaciones"
ON public.company_pilot_invitations
FOR SELECT
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
  OR pilot_id = auth.uid()
);

CREATE POLICY "Empresas pueden crear invitaciones"
ON public.company_pilot_invitations
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Empresas pueden cancelar sus invitaciones"
ON public.company_pilot_invitations
FOR UPDATE
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
  OR pilot_id = auth.uid()
);

-- Políticas para notifications
CREATE POLICY "Usuarios pueden ver sus notificaciones"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Usuarios pueden actualizar sus notificaciones"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Sistema puede crear notificaciones"
ON public.notifications
FOR INSERT
WITH CHECK (true);
