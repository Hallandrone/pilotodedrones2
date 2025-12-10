-- Activar suscripción premium para la cuenta demo empresa
-- Email: demo@empresa.com

-- Primero, obtener el user_id del usuario demo empresa
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Buscar el user_id del usuario demo empresa
  SELECT id INTO demo_user_id
  FROM profiles
  WHERE email = 'demo@empresa.com'
  LIMIT 1;

  -- Si el usuario existe
  IF demo_user_id IS NOT NULL THEN
    
    -- Eliminar cualquier suscripción existente para evitar duplicados
    DELETE FROM user_subscriptions
    WHERE user_id = demo_user_id;

    -- Crear una nueva suscripción activa con plan empresa
    INSERT INTO user_subscriptions (
      user_id,
      plan_name,
      status,
      start_date,
      renewal_date,
      payment_provider,
      created_at,
      updated_at
    ) VALUES (
      demo_user_id,
      'empresa',  -- Plan empresa (premium)
      'active',   -- Estado activo
      NOW(),      -- Fecha de inicio: ahora
      NOW() + INTERVAL '1 year',  -- Renovación en 1 año
      'manual',   -- Proveedor manual (para cuentas demo)
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Suscripción premium activada para usuario demo empresa (%))', demo_user_id;
  ELSE
    RAISE NOTICE 'Usuario demo empresa no encontrado. Asegúrate de crear la cuenta primero.';
  END IF;
END $$;

-- Verificar que la suscripción se creó correctamente
SELECT 
  p.email,
  p.user_type,
  us.plan_name,
  us.status,
  us.start_date,
  us.renewal_date
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.email = 'demo@empresa.com';
