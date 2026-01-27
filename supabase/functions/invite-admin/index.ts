import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://pilotodedrones.cl'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders })
	}

	try {
		// 1. Security Check
		const authHeader = req.headers.get('Authorization')
		if (!authHeader) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
		const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

		if (authError || !user) {
			return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

		// Verify Caller Role (Must be Super Admin)
		const { data: roleData } = await supabaseAdmin
			.from('user_roles')
			.select('role')
			.eq('id', user.id)
			.single()

		if (roleData?.role !== 'super_admin') {
			return new Response(JSON.stringify({ error: 'Permisos insuficientes. Solo Super Admins pueden invitar.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		// 2. Process Request
		const { email, full_name, permissions } = await req.json()

		if (!email || !permissions) {
			return new Response(JSON.stringify({ error: 'Faltan datos requeridos (email, permissions)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
		}

		// Normalize email
		const cleanEmail = email.toLowerCase().trim()
		const invitedBy = user.id // Checked from auth, secure.

		// 3. Check if User Exists (via Profiles)
		const { data: profile } = await supabaseAdmin
			.from('profiles')
			.select('id, full_name, email')
			.eq('email', cleanEmail)
			.single()

		let emailSubject = '';
		let emailHtml = '';
		let message = '';

		if (profile) {
			// --- USER EXISTS ---
			console.log('User exists:', profile.id)

			// Upgrade Role
			const { data: currentRole } = await supabaseAdmin.from('user_roles').select('role').eq('id', profile.id).single()

			if (currentRole?.role !== 'super_admin') {
				await supabaseAdmin.from('user_roles').upsert({ id: profile.id, role: 'admin' })
			}

			// Update Permissions
			await supabaseAdmin.from('user_permissions').delete().eq('user_id', profile.id)

			if (permissions.length > 0) {
				const perms = permissions.map((p: string) => ({
					user_id: profile.id,
					permission: p,
					granted_by: invitedBy
				}))
				await supabaseAdmin.from('user_permissions').insert(perms)
			}

			// Email
			emailSubject = 'Nuevo Acceso de Administrador en Piloto de Drones'
			emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="background-color: #083b4e; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Piloto de Drones</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Hola ${profile.full_name || 'Usuario'},</h2>
          <p>Se te han otorgado o actualizado tus privilegios de <strong>Administrador</strong> en la plataforma.</p>
          <p>Ahora puedes iniciar sesión con tu cuenta actual y acceder al Panel de Administración.</p>
          
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin-top:0;"><strong>Tus permisos asignados:</strong></p>
            <ul style="margin-bottom:0;">
              ${permissions.map((p: string) => `<li style="text-transform: capitalize;">${p.replace(/_/g, ' ')}</li>`).join('')}
            </ul>
          </div>

          <a href="${FRONTEND_URL}/auth" style="display: inline-block; background-color: #00b3f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir al Dashboard</a>
        </div>
      </body>
      </html>
      `
			message = 'Accesos actualizados y usuario notificado';

		} else {
			// --- USER DOES NOT EXIST ---
			console.log('User does not exist, creating invitation')

			// Upsert Invitation
			const { error: inviteError } = await supabaseAdmin
				.from('admin_invitations')
				.upsert({
					email: cleanEmail,
					permissions: permissions,
					invited_by: invitedBy,
					updated_at: new Date().toISOString()
				}, { onConflict: 'email' })

			if (inviteError) {
				console.error('Invitation Insert Error:', inviteError);
				throw inviteError
			}

			// Email
			emailSubject = 'Invitación para Administrar Piloto de Drones'
			emailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="background-color: #083b4e; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Piloto de Drones</h1>
        </div>
        <div style="padding: 20px;">
          <h2>${full_name ? `Hola ${full_name},` : '¡Hola!'}</h2>
          <p>Has recibido una invitación para formar parte del equipo de Administradores de <strong>Piloto de Drones</strong>.</p>
          <p>Para activar tu cuenta y recibir tus accesos, por favor regístrate haciendo clic en el botón de abajo. <strong>Es importante que uses este mismo correo electrónico: ${cleanEmail}</strong></p>
          
          <div style="background: #e6f7ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00b3f3;">
            <p style="margin:0;"><strong>Nota:</strong> No necesitas una contraseña temporal. Crea tu propia contraseña durante el registro.</p>
          </div>

          <a href="${FRONTEND_URL}/auth?email=${cleanEmail}&type=admin_invite" style="display: inline-block; background-color: #00b3f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Crear mi Cuenta</a>
        </div>
      </body>
      </html>
      `
			message = 'Invitación enviada correctamente';
		}

		// Send via Resend
		if (RESEND_API_KEY) {
			await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${RESEND_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					from: 'Piloto de Drones <invitaciones@pilotodedrones.cl>',
					to: cleanEmail,
					subject: emailSubject,
					html: emailHtml
				})
			})
		}

		return new Response(
			JSON.stringify({ success: true, message }),
			{ status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
		)

	} catch (error: any) {
		console.error('Function error:', error)
		return new Response(
			JSON.stringify({ error: error.message || 'Server Error' }),
			{ status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
		)
	}
})
