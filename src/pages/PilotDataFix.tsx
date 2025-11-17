import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PilotDataFix = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const fixPilotData = async () => {
    setLoading(true);
    setMessage('Solucionando datos del piloto...');
    setSuccess(false);

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage('❌ No hay usuario logueado');
        return;
      }

      setMessage('👤 Usuario encontrado: ' + user.email);

      // Check if profile exists
      setMessage('🔍 Verificando perfil...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setMessage('❌ Error de perfil: ' + profileError.message);
        return;
      }

      setMessage('✅ Perfil encontrado: ' + profile.full_name);

      // Check if pilot record exists
      setMessage('🔍 Verificando registro de piloto...');
      const { data: pilotData, error: pilotError } = await supabase
        .from('pilots')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (pilotError && pilotError.code === 'PGRST116') {
        // Pilot record doesn't exist, create it
        setMessage('🔧 Creando registro de piloto...');
        const { error: createPilotError } = await supabase
          .from('pilots')
          .insert({
            user_id: user.id,
            status: 'active',
            created_at: new Date().toISOString()
          });

        if (createPilotError) {
          setMessage('❌ Error creando piloto: ' + createPilotError.message);
          return;
        }

        setMessage('✅ Registro de piloto creado');
      } else if (pilotError) {
        setMessage('❌ Error verificando piloto: ' + pilotError.message);
        return;
      } else {
        setMessage('✅ Registro de piloto ya existe');
      }

      setSuccess(true);
      setMessage('🎉 ¡Datos del piloto solucionados! Redirigiendo...');

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/pilot');
      }, 3000);

    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToPilot = () => {
    navigate('/pilot');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '16px',
          textAlign: 'center',
          color: '#1f2937'
        }}>
          🔧 Solucionar Datos del Piloto
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Soluciona el problema de carga de datos del piloto
        </p>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#374151',
          minHeight: '60px'
        }}>
          {message || 'Haz clic en el botón para solucionar los datos del piloto'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={fixPilotData}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Solucionando...' : '🔧 Solucionar Datos del Piloto'}
          </button>

          <button
            onClick={goToPilot}
            style={{
              background: 'transparent',
              color: '#3b82f6',
              border: '2px solid #3b82f6',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🚀 Ir al Dashboard
          </button>
        </div>

        {success && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '16px',
            textAlign: 'center',
            color: '#065f46',
            fontSize: '14px'
          }}>
            ✅ ¡Problema solucionado! Serás redirigido automáticamente...
          </div>
        )}
      </div>
    </div>
  );
};

export default PilotDataFix;
