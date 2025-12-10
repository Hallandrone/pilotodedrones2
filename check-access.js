
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://sncjozwmtjaltoituumx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuY2pvendtdGphbHRvaXR1dW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjE5NDIsImV4cCI6MjA3NDI5Nzk0Mn0.VfQ7nSK9MPdWBdWweUyOgvWAfQwRsHzkHcXp41M_2vw'

async function checkInvitationAccess() {
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
	const invitationId = 'a06d56e8-7ade-4023-9a70-1620cdb271f8' // ID de la captura de pantalla

	console.log(`🔍 Intentando leer invitación ${invitationId} como anónimo...`)

	const { data, error } = await supabase
		.from('company_pilot_invitations')
		.select('*')
		.eq('id', invitationId)
		.single()

	if (error) {
		console.error('❌ Error:', error)
	} else {
		console.log('✅ Invitación encontrada:', data)
	}
}

checkInvitationAccess()
