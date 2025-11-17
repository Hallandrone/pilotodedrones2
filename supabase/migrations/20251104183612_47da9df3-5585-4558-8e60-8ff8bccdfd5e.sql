-- Permitir que usuarios anónimos vean suscripciones activas para búsqueda pública
CREATE POLICY "Public can view active subscriptions"
ON user_subscriptions
FOR SELECT
USING (status = 'active');