import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { encodeBase64Url } from 'https://deno.land/std@0.220.1/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleTokenInfo {
  iss: string
  azp: string
  aud: string
  sub: string
  email: string
  email_verified: string
  name: string
  picture: string
  given_name: string
  family_name: string
  iat: string
  exp: string
}

interface JWTPayload {
  sub: string
  email: string
  name: string
  picture: string
  role: string
  iat: number
  exp: number
}

// Función para crear JWT
async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  
  const encodedHeader = encodeBase64Url(new TextEncoder().encode(JSON.stringify(header)))
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  
  const data = `${encodedHeader}.${encodedPayload}`
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const encodedSignature = encodeBase64Url(new Uint8Array(signature))
  
  return `${data}.${encodedSignature}`
}

// Función para verificar JWT
async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts
    const data = `${encodedHeader}.${encodedPayload}`
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    // Decodificar la firma
    const signatureBytes = Uint8Array.from(atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(data))
    
    if (!valid) return null
    
    // Decodificar el payload
    const payloadJson = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as JWTPayload
    
    // Verificar expiración
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const JWT_SECRET = Deno.env.get('JWT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!GOOGLE_CLIENT_ID || !JWT_SECRET) {
      throw new Error('Missing required secrets: GOOGLE_CLIENT_ID or JWT_SECRET')
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    // Endpoint para verificar sesión actual
    if (path === 'verify' && req.method === 'POST') {
      const { token } = await req.json()
      
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Token requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const payload = await verifyJWT(token, JWT_SECRET)
      
      if (!payload) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Token inválido o expirado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ valid: true, user: payload }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Endpoint principal de autenticación con Google
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id_token, user_type = 'pilot' } = await req.json()

    if (!id_token) {
      return new Response(
        JSON.stringify({ error: 'id_token es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar id_token con Google
    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`
    )

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text()
      console.error('Error validando token con Google:', errorText)
      return new Response(
        JSON.stringify({ error: 'Token de Google inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const googleData: GoogleTokenInfo = await googleResponse.json()

    // Verificar que el token sea para nuestra aplicación
    if (googleData.aud !== GOOGLE_CLIENT_ID) {
      console.error('Token audience mismatch:', googleData.aud, 'vs', GOOGLE_CLIENT_ID)
      return new Response(
        JSON.stringify({ error: 'Token no válido para esta aplicación' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el email esté verificado
    if (googleData.email_verified !== 'true') {
      return new Response(
        JSON.stringify({ error: 'El email de Google no está verificado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente de Supabase con service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Buscar usuario existente por email
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, avatar_url')
      .eq('email', googleData.email.toLowerCase())
      .maybeSingle()

    let userId: string
    let userRole: string
    let isNewUser = false

    if (existingProfile) {
      // Usuario existe - login
      userId = existingProfile.id
      userRole = existingProfile.user_type || 'pilot'
      
      // Actualizar avatar si no tiene
      if (!existingProfile.avatar_url && googleData.picture) {
        await supabase
          .from('profiles')
          .update({ avatar_url: googleData.picture })
          .eq('id', userId)
      }
      
      console.log('Usuario existente encontrado:', userId)
    } else {
      // Usuario nuevo - registrar
      isNewUser = true
      userId = crypto.randomUUID()
      userRole = user_type

      // Crear perfil
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: googleData.name,
          email: googleData.email.toLowerCase(),
          user_type: user_type,
          avatar_url: googleData.picture || null
        })

      if (createProfileError) {
        console.error('Error creando perfil:', createProfileError)
        return new Response(
          JSON.stringify({ error: 'Error al crear perfil de usuario' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Crear rol
      const { error: createRoleError } = await supabase
        .from('user_roles')
        .insert({
          id: userId,
          role: user_type
        })

      if (createRoleError) {
        console.error('Error creando rol:', createRoleError)
        // Continuar de todos modos, el rol se puede crear después
      }

      // Si es piloto, crear entrada en pilots
      if (user_type === 'pilot') {
        const { error: createPilotError } = await supabase
          .from('pilots')
          .insert({
            user_id: userId,
            status: 'active'
          })

        if (createPilotError) {
          console.error('Error creando piloto:', createPilotError)
        }
      }

      // Crear suscripción gratuita
      const { error: createSubError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_name: 'free',
          status: 'active'
        })

      if (createSubError) {
        console.error('Error creando suscripción:', createSubError)
      }

      console.log('Nuevo usuario creado:', userId)
    }

    // Generar JWT propio
    const now = Math.floor(Date.now() / 1000)
    const jwtPayload: JWTPayload = {
      sub: userId,
      email: googleData.email.toLowerCase(),
      name: googleData.name,
      picture: googleData.picture || '',
      role: userRole,
      iat: now,
      exp: now + (7 * 24 * 60 * 60) // 7 días de expiración
    }

    const jwt = await createJWT(jwtPayload, JWT_SECRET)

    return new Response(
      JSON.stringify({
        success: true,
        token: jwt,
        user: {
          id: userId,
          email: googleData.email,
          name: googleData.name,
          picture: googleData.picture,
          role: userRole
        },
        isNewUser
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error en auth-google:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
