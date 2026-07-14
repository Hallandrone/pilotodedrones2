-- =====================================================================
-- RPC: claim_diploma_code — reclamar código de diploma y activar Pro
-- ---------------------------------------------------------------------
-- Cambio de modelo de negocio: el plan Pro deja de venderse al público.
-- Ahora es EXCLUSIVO para alumnos de "Academia Drone Chile" y se activa
-- con el código del diploma (un token de 8 caracteres impreso en el
-- diploma / codificado en su QR).
--
-- Por qué una RPC SECURITY DEFINER:
-- Cerramos hace poco un bypass de pago eliminando las políticas RLS de
-- escritura del usuario sobre user_subscriptions. El cliente ya NO puede
-- escribir plan_name/status directo. Esta función corre con privilegios
-- del owner y es el ÚNICO camino por el que un usuario normal puede pasar
-- a plan_name='pro' — y solo si presenta un código de diploma válido y
-- sin reclamar. Toda la lógica de validación vive acá, no en el frontend.
--
-- Idempotente: si el usuario ya reclamó ESE mismo código, re-asegura su
-- plan Pro y responde ok (para que reintentos / doble scan no fallen).
--
-- Contrato de retorno (jsonb):
--   { success: true }                                   -> reclamado ok
--   { success: true, already_claimed_by_me: true }      -> ya era mío
--   { success: false, error: 'invalid_code' }           -> vacío/no auth/no existe
--   { success: false, error: 'already_claimed' }        -> lo tiene otro usuario
-- =====================================================================

CREATE OR REPLACE FUNCTION public.claim_diploma_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_token diploma_qr_tokens%ROWTYPE;
BEGIN
  -- 1. Normalizar: sin espacios ni guiones, mayúsculas.
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));

  -- 2. Código vacío o usuario no autenticado -> inválido.
  IF v_code = '' OR v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- 3. Buscar el token (case-insensitive).
  SELECT * INTO v_token
  FROM diploma_qr_tokens
  WHERE upper(token) = v_code
  LIMIT 1;

  -- 4. No existe -> inválido.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- 5. Reclamado por OTRO usuario -> ya utilizado.
  IF v_token.user_id IS NOT NULL AND v_token.user_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  -- 6. Ya reclamado por MÍ -> idempotente: reaseguro el plan y salgo.
  IF v_token.user_id = v_uid THEN
    INSERT INTO user_subscriptions (user_id, plan_name, status, payment_method, renewal_date, updated_at)
    VALUES (v_uid, 'pro', 'active', 'academy_diploma', NULL, now())
    ON CONFLICT (user_id) DO UPDATE
      SET plan_name = 'pro',
          status = 'active',
          payment_method = 'academy_diploma',
          renewal_date = NULL,
          updated_at = now();

    RETURN jsonb_build_object('success', true, 'already_claimed_by_me', true);
  END IF;

  -- 7. Sin reclamar -> asociarlo a mí y activar Pro.
  UPDATE diploma_qr_tokens
  SET user_id = v_uid,
      associated_at = now(),
      updated_at = now()
  WHERE id = v_token.id;

  INSERT INTO user_subscriptions (user_id, plan_name, status, payment_method, renewal_date, updated_at)
  VALUES (v_uid, 'pro', 'active', 'academy_diploma', NULL, now())
  ON CONFLICT (user_id) DO UPDATE
    SET plan_name = 'pro',
        status = 'active',
        payment_method = 'academy_diploma',
        renewal_date = NULL,
        updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Permisos: solo usuarios autenticados pueden ejecutarla.
REVOKE EXECUTE ON FUNCTION public.claim_diploma_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_diploma_code(text) TO authenticated;
