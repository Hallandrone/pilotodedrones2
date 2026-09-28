-- =====================================================================
-- unlink_diploma_code: solo administradores
-- ---------------------------------------------------------------------
-- La versión anterior dejaba que el propio alumno desvinculara su diploma
-- desde su perfil. Se decide que solo lo hagan quienes gestionan diplomas
-- (super_admin, o admin con create_diplomas), desde el historial. El resto
-- del comportamiento no cambia: el diploma sigue válido, el QR queda libre
-- y, si el alumno queda sin diplomas y su Pro venía de un diploma, vuelve a
-- Free. Cada desvinculación se registra en diploma_unlinks.
--
-- Retorno (jsonb):
--   { success: true, plan_downgraded: bool }
--   { success: false, error: 'not_found' | 'not_claimed' | 'forbidden' }
-- =====================================================================
CREATE OR REPLACE FUNCTION public.unlink_diploma_code(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_token public.diploma_qr_tokens%ROWTYPE;
  v_owner uuid;
  v_downgraded boolean := false;
BEGIN
  IF NOT public.can_manage_diplomas(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_token
  FROM public.diploma_qr_tokens
  WHERE upper(token) = upper(regexp_replace(coalesce(p_token, ''), '[\s-]', '', 'g'))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_token.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_claimed');
  END IF;

  v_owner := v_token.user_id;

  UPDATE public.diploma_qr_tokens
  SET user_id = NULL,
      associated_at = NULL,
      updated_at = now()
  WHERE id = v_token.id;

  -- Sin más diplomas asociados y con Pro de academia -> vuelve a Free.
  IF NOT EXISTS (SELECT 1 FROM public.diploma_qr_tokens t WHERE t.user_id = v_owner) THEN
    UPDATE public.user_subscriptions
    SET plan_name = 'free',
        status = 'active',
        payment_method = NULL,
        renewal_date = NULL,
        updated_at = now()
    WHERE user_id = v_owner
      AND plan_name = 'pro'
      AND payment_method = 'academy_diploma';
    v_downgraded := FOUND;
  END IF;

  INSERT INTO public.diploma_unlinks (token_id, token, diploma_id, previous_user_id, unlinked_by, plan_downgraded)
  VALUES (v_token.id, v_token.token, v_token.diploma_id, v_owner, v_uid, v_downgraded);

  RETURN jsonb_build_object('success', true, 'plan_downgraded', v_downgraded);
END;
$$;

REVOKE ALL ON FUNCTION public.unlink_diploma_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlink_diploma_code(text) TO authenticated;
