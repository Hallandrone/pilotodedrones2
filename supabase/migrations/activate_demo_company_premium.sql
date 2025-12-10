-- ============================================
-- ACTIVAR SUSCRIPCIÓN PREMIUM DEMO EMPRESA
-- ============================================
-- Este script activa la suscripción premium para la cuenta demo empresa
-- en producción (pilotodedrones.cl)

-- PASO 1: Activar suscripción premium
INSERT INTO user_subscriptions (
  user_id,
  plan_name,
  status,
  renewal_date,
  payment_method
)
SELECT 
  id,
  'empresa',              -- Plan empresa (premium)
  'active',               -- Estado activo
  NOW() + INTERVAL '1 year',  -- Renovación en 1 año
  'manual'                -- Método de pago manual (para demos)
FROM profiles 
WHERE email = 'demo@empresa.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
  plan_name = 'empresa',
  status = 'active',
  renewal_date = NOW() + INTERVAL '1 year',
  payment_method = 'manual',
  updated_at = NOW();

-- PASO 2: Verificar que se activó correctamente
SELECT 
  p.email,
  p.user_type,
  p.full_name,
  us.plan_name,
  us.status,
  us.renewal_date,
  us.payment_method,
  us.created_at,
  us.updated_at
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.email = 'demo@empresa.com';

-- RESULTADO ESPERADO:
-- ✓ email: demo@empresa.com
-- ✓ user_type: company
-- ✓ plan_name: empresa
-- ✓ status: active
-- ✓ renewal_date: (fecha actual + 1 año)
-- ✓ payment_method: manual
