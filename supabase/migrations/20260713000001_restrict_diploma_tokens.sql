-- =====================================================================
-- Seguridad diploma_qr_tokens — PARTE 2 de 2: cerrar enumeración (RESTRICTIVA)
-- ---------------------------------------------------------------------
-- ⚠️ ORDEN DE DEPLOY (ventana cero): APLICAR ESTA MIGRACIÓN *DESPUÉS* DE
-- QUE EL FRONTEND NUEVO ESTÉ EN PRODUCCIÓN.
--   1. Aplicar PARTE 1 (get_diploma_by_token) — aditiva, no rompe nada.
--   2. Desplegar el frontend nuevo (usa la RPC para verificar diplomas).
--   3. Aplicar ESTA migración.
-- Si se aplica antes del deploy del front, el front VIEJO (que hace SELECT
-- directo y UPDATE directo sobre diploma_qr_tokens) se rompe: la
-- verificación de diplomas SIN reclamar y la asociación por QR dejarían de
-- funcionar hasta que el front nuevo esté arriba.
--
-- QUÉ HACE:
--   - Reemplaza la policy SELECT enumerable (USING true) por una que solo
--     expone tokens YA reclamados (user_id IS NOT NULL). Los ~1337 tokens
--     sin reclamar dejan de ser enumerables → se cierra el bypass de
--     "enumerar códigos y auto-activarse Pro con diploma ajeno".
--   - Elimina la policy UPDATE de asociación directa: reclamar un código
--     ahora es responsabilidad EXCLUSIVA de claim_diploma_code (SECURITY
--     DEFINER, no depende de esta policy).
--
-- NOTA: la policy INSERT ("Allow insert for authenticated users",
-- WITH CHECK true) NO se toca aquí. Queda pendiente endurecerla a admins
-- en otra pasada (hoy permite a cualquier autenticado insertar tokens).
-- =====================================================================

-- 1) SELECT: solo tokens reclamados son legibles directamente.
--    (perfiles públicos y dashboard filtran por .eq('user_id', ...))
DROP POLICY IF EXISTS "Allow public read access for QR tokens" ON diploma_qr_tokens;

CREATE POLICY "Claimed QR tokens are publicly readable"
  ON diploma_qr_tokens
  FOR SELECT
  USING (user_id IS NOT NULL);

-- 2) UPDATE directo eliminado: el reclamo pasa solo por claim_diploma_code.
DROP POLICY IF EXISTS "Users can associate unassociated QR tokens" ON diploma_qr_tokens;
