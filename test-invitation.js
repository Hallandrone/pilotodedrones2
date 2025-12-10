// Script de prueba para verificar el envío de invitaciones
// Este script simula el envío de una invitación para diagnosticar problemas

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sncjozwmtjaltoituumx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuY2pvendtdGphbHRvaXR1dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjE5NDIsImV4cCI6MjA3NDI5Nzk0Mn0.VfQ7nSK9MPdWBdWweUyOgvWAfQwRsHzkHcXp41M_2vw'

async function testInvitationEmail() {
	console.log('🧪 Iniciando prueba de envío de invitación...\n')

	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

	// Datos de prueba
	const testData = {
		invitationId: 'test-invitation-id', // Debes reemplazar esto con un ID real
		pilotEmail: 'test@example.com', // Email de prueba
		pilotName: 'Piloto de Prueba',
		companyName: 'Empresa de Prueba',
		message: 'Este es un mensaje de prueba'
	}

	console.log('📦 Datos de prueba:', testData)
	console.log('\n📞 Llamando a la Edge Function...\n')

	try {
		const { data, error } = await supabase.functions.invoke('send-invitation-email', {
			body: testData
		})

		if (error) {
			console.error('❌ Error al llamar a la función:', error)
			console.error('Detalles:', JSON.stringify(error, null, 2))
			return
		}

		console.log('✅ Respuesta de la función:', data)
		console.log('\n🎉 Prueba completada exitosamente!')
	} catch (err) {
		console.error('❌ Error inesperado:', err)
	}
}

// Ejecutar la prueba
testInvitationEmail()
