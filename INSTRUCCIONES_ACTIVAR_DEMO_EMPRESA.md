# Activar Suscripción Premium para Demo Empresa

## Instrucciones para ejecutar el script

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, ve a **SQL Editor**
4. Crea una nueva query
5. Copia y pega el contenido del archivo `activate_demo_company_premium.sql`
6. Haz clic en **Run** o presiona `Ctrl+Enter`

### Opción 2: Script SQL Rápido

Si prefieres un script más simple, ejecuta esto directamente en el SQL Editor:

```sql
-- Activar suscripción premium para demo empresa
INSERT INTO user_subscriptions (
  user_id,
  plan_name,
  status,
  start_date,
  renewal_date,
  payment_provider
)
SELECT 
  id,
  'empresa',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  'manual'
FROM profiles
WHERE email = 'demo@empresa.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_name = 'empresa',
  status = 'active',
  start_date = NOW(),
  renewal_date = NOW() + INTERVAL '1 year',
  updated_at = NOW();
```

### Verificar que funcionó

Después de ejecutar el script, verifica con esta query:

```sql
SELECT 
  p.email,
  p.user_type,
  us.plan_name,
  us.status,
  us.renewal_date
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.email = 'demo@empresa.com';
```

Deberías ver:
- **email**: demo@empresa.com
- **user_type**: company
- **plan_name**: empresa
- **status**: active
- **renewal_date**: fecha de hoy + 1 año

## Credenciales de acceso

- **Email**: demo@empresa.com
- **Password**: demoempresa123
- **Acceso**: [http://localhost:5173/demo](http://localhost:5173/demo) → Seleccionar "Perfil Demo Empresa"

## Funcionalidades que ahora estarán disponibles

Con la suscripción premium activa, el perfil demo empresa podrá:

✅ Acceder al dashboard completo de empresa
✅ Gestionar pilotos de la empresa
✅ Ver condiciones meteorológicas en tiempo real
✅ Perfil público visible
✅ Código QR personalizado
✅ Todas las funcionalidades premium

## Notas

- La suscripción está configurada para renovarse en 1 año
- El proveedor de pago está marcado como "manual" (para cuentas demo)
- Si el usuario ya tenía una suscripción, será reemplazada por esta nueva
