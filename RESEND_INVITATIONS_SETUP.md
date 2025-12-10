# 📧 Sistema de Invitaciones con Resend - Guía Completa

## 🎯 Resumen del Sistema

Este sistema permite a las empresas invitar hasta 4 pilotos a unirse a su equipo. Al aceptar la invitación:
- El piloto recibe **Plan Pro GRATIS** automáticamente
- Se envía un email profesional con Resend
- El piloto puede aceptar desde un link único
- Todo está automatizado

---

## 📋 Archivos Creados

### 1. Edge Function - Envío de Emails
**Archivo**: `supabase/functions/send-invitation-email/index.ts`
- Envía emails usando Resend API
- Diseño HTML responsive y profesional
- Tracking de emails enviados

### 2. Migraciones SQL
**Archivos**:
- `supabase/migrations/20250210000000_add_invitation_email_fields.sql`
  - Agrega campos: `email_sent`, `email_sent_at`, `invitation_token`
  
- `supabase/migrations/20250210000001_accept_invitation_with_pro.sql`
  - Función: `accept_company_invitation_with_pro()` - Activa Plan Pro automáticamente
  - Función: `get_invitation_by_token()` - Obtiene invitación por token

### 3. Frontend
**Archivo**: `src/pages/InvitationAccept.tsx`
- Página completa para aceptar invitaciones
- Diseño atractivo con beneficios del Plan Pro
- Validación de token
- Redirección automática

**Archivo**: `src/App.tsx`
- Ruta agregada: `/invitation/:token`

---

## 🚀 Configuración Paso a Paso

### Paso 1: Configurar Resend

1. **Crear cuenta en Resend**
   - Ve a: https://resend.com
   - Crea una cuenta gratuita
   - Verifica tu dominio `pilotodedrones.cl`

2. **Obtener API Key**
   - En el dashboard de Resend, ve a "API Keys"
   - Crea una nueva API Key
   - Copia la key (empieza con `re_`)

3. **Configurar variables de entorno en Supabase**
   ```bash
   # En Supabase Dashboard → Settings → Edge Functions → Secrets
   RESEND_API_KEY=re_tu_api_key_aqui
   FRONTEND_URL=https://pilotodedrones.cl
   ```

### Paso 2: Aplicar Migraciones

Ejecuta las migraciones en Supabase SQL Editor:

```sql
-- 1. Agregar campos de email
-- Ejecutar: supabase/migrations/20250210000000_add_invitation_email_fields.sql

-- 2. Funciones mejoradas
-- Ejecutar: supabase/migrations/20250210000001_accept_invitation_with_pro.sql
```

### Paso 3: Desplegar Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy send-invitation-email
```

### Paso 4: Configurar DNS de Resend

En tu proveedor de DNS (donde está `pilotodedrones.cl`), agrega estos registros:

```
Tipo: TXT
Nombre: @
Valor: (el que te dé Resend para verificación)

Tipo: TXT  
Nombre: _dmarc
Valor: v=DMARC1; p=none

Tipo: TXT
Nombre: resend._domainkey
Valor: (el que te dé Resend para DKIM)
```

---

## 💻 Uso del Sistema

### Para Empresas (Enviar Invitación)

```typescript
// Desde el componente de gestión de pilotos
const { data, error } = await supabase
  .rpc('send_company_pilot_invitation', {
    company_id_param: companyId,
    pilot_email_param: 'piloto@email.com',
    message_param: 'Mensaje opcional personalizado'
  });

if (data?.success) {
  // Invitación creada, ahora enviar email
  const invitation_id = data.invitation_id;
  
  // Llamar a la Edge Function
  const { data: emailData } = await supabase.functions.invoke('send-invitation-email', {
    body: {
      invitationId: invitation_id,
      pilotEmail: 'piloto@email.com',
      pilotName: 'Nombre del Piloto',
      companyName: 'Mi Empresa',
      message: 'Mensaje opcional'
    }
  });
}
```

### Para Pilotos (Aceptar Invitación)

1. **Recibe email** con link: `https://pilotodedrones.cl/invitation/{token}`
2. **Hace clic** en el botón "Aceptar Invitación"
3. **Si no está logueado**: Se redirige a `/auth?invitation={token}`
4. **Si está logueado**: Acepta automáticamente y activa Plan Pro
5. **Redirige** a `/pilot` con Plan Pro activo

---

## 🎨 Diseño del Email

El email incluye:
- ✅ Header con gradiente azul
- ✅ Logo de Piloto de Drones
- ✅ Mensaje personalizado (opcional)
- ✅ Lista de beneficios del Plan Pro
- ✅ Botón CTA grande y atractivo
- ✅ Link alternativo (por si el botón no funciona)
- ✅ Footer con contacto y copyright
- ✅ Totalmente responsive (móvil y desktop)

---

## 🔒 Seguridad

- ✅ Tokens únicos (UUID) por invitación
- ✅ Validación de permisos en RLS
- ✅ Verificación de límite de 4 pilotos
- ✅ Solo pilotos con plan gratis pueden ser invitados
- ✅ Tokens expiran al ser usados (status cambia a 'accepted')

---

## 📊 Base de Datos

### Tabla: `company_pilot_invitations`

```sql
Columnas principales:
- id: UUID (PK)
- company_id: UUID (FK → companies)
- pilot_email: TEXT
- pilot_id: UUID (FK → profiles)
- status: TEXT ('pending', 'accepted', 'rejected', 'cancelled')
- invitation_token: UUID (único)
- email_sent: BOOLEAN
- email_sent_at: TIMESTAMPTZ
- message: TEXT
- invited_at: TIMESTAMPTZ
- responded_at: TIMESTAMPTZ
```

---

## 🧪 Testing

### Test Local (sin enviar email real)

```typescript
// Crear invitación sin enviar email
const { data } = await supabase
  .rpc('send_company_pilot_invitation', {
    company_id_param: 'company-uuid',
    pilot_email_param: 'test@test.com'
  });

console.log('Token de invitación:', data.invitation_id);
// Visita: http://localhost:5173/invitation/{invitation_id}
```

### Test de Email (Resend Sandbox)

En desarrollo, Resend solo envía a emails verificados. Para testing:
1. Verifica tu email personal en Resend
2. Envía invitaciones a ese email
3. Revisa que lleguen correctamente

---

## 📈 Monitoreo

### Ver invitaciones pendientes

```sql
SELECT 
  cpi.id,
  cpi.pilot_email,
  c.company_name,
  cpi.email_sent,
  cpi.invited_at,
  cpi.status
FROM company_pilot_invitations cpi
JOIN companies c ON cpi.company_id = c.id
WHERE cpi.status = 'pending'
ORDER BY cpi.invited_at DESC;
```

### Ver pilotos con Plan Pro por empresa

```sql
SELECT 
  p.full_name,
  p.email,
  us.plan_name,
  us.status,
  c.company_name
FROM company_pilots cp
JOIN profiles p ON cp.pilot_id = p.id
JOIN user_subscriptions us ON p.id = us.user_id
JOIN companies c ON cp.company_id = c.id
WHERE us.plan_name = 'pro'
  AND us.payment_method = 'company_sponsored';
```

---

## 🐛 Troubleshooting

### Email no se envía

1. **Verificar API Key**
   ```bash
   # En Supabase Dashboard
   Settings → Edge Functions → Secrets
   # Verificar que RESEND_API_KEY esté configurada
   ```

2. **Ver logs de Edge Function**
   ```bash
   supabase functions logs send-invitation-email
   ```

3. **Verificar dominio en Resend**
   - Dashboard de Resend → Domains
   - Verificar que `pilotodedrones.cl` esté verificado

### Invitación no se acepta

1. **Verificar token**
   ```sql
   SELECT * FROM company_pilot_invitations 
   WHERE invitation_token = 'token-uuid';
   ```

2. **Verificar límite de pilotos**
   ```sql
   SELECT COUNT(*) FROM company_pilots 
   WHERE company_id = 'company-uuid';
   -- Debe ser < 4
   ```

### Plan Pro no se activa

1. **Verificar función**
   ```sql
   SELECT public.accept_company_invitation_with_pro('invitation-uuid');
   ```

2. **Ver suscripción**
   ```sql
   SELECT * FROM user_subscriptions 
   WHERE user_id = 'pilot-uuid';
   ```

---

## 📝 Notas Importantes

- ⚠️ **Límite de 4 pilotos** por empresa (configurable en `companies.max_company_pilots`)
- ⚠️ **Plan Pro gratis** solo mientras el piloto esté en la empresa
- ⚠️ Si el piloto sale de la empresa, su plan vuelve a "free"
- ⚠️ Resend tiene límite de 100 emails/día en plan gratuito
- ⚠️ En producción, configura SPF, DKIM y DMARC correctamente

---

## 🎉 ¡Listo!

El sistema está completamente configurado. Solo falta:
1. ✅ Configurar Resend API Key
2. ✅ Aplicar migraciones
3. ✅ Desplegar Edge Function
4. ✅ Probar con una invitación real

**Contacto**: soporte@pilotodedrones.cl
