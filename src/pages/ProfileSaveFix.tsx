import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProfileSaveFix = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const testProfileSave = async () => {
    setLoading(true);
    setMessage('Probando guardado de perfil...');
    setSuccess(false);

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage('❌ No hay usuario logueado');
        return;
      }

      setMessage('👤 Usuario encontrado: ' + user.email);

      // Test profile data
      const testProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Usuario Test',
        email: user.email,
        phone: '+56912345678',
        bio: 'Piloto de drones certificado',
        location: 'Santiago',
        region: 'Metropolitana',
        experience_years: 2,
        specialties: ['Fotografía', 'Inspección'],
        user_type: 'pilot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setMessage('🔍 Verificando perfil existente...');

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        setMessage('🔧 Creando perfil...');
        const { error: createError } = await supabase
          .from('profiles')
          .insert(testProfile);

        if (createError) {
          setMessage('❌ Error creando perfil: ' + createError.message);
          return;
        }

        setMessage('✅ Perfil creado exitosamente');
      } else if (checkError) {
        setMessage('❌ Error verificando perfil: ' + checkError.message);
        return;
      } else {
        // Profile exists, test update
        setMessage('🔧 Probando actualización...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: testProfile.full_name,
            phone: testProfile.phone,
            bio: testProfile.bio,
            location: testProfile.location,
            region: testProfile.region,
            experience_years: testProfile.experience_years,
            specialties: testProfile.specialties,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          setMessage('❌ Error actualizando perfil: ' + updateError.message);
          return;
        }

        setMessage('✅ Perfil actualizado exitosamente');
      }

      setSuccess(true);
      setMessage('🎉 ¡Guardado de perfil funcionando! Redirigiendo...');

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/pilot/profile');
      }, 3000);

    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToProfile = () => {
    navigate('/pilot/profile');
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
          🔧 Solucionar Guardado de Perfil
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Diagnostica y soluciona el problema de guardado de perfil
        </p>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#374151',
          minHeight: '80px'
        }}>
          {message || 'Haz clic en el botón para probar el guardado de perfil'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={testProfileSave}
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
            {loading ? '⏳ Probando...' : '🔧 Probar Guardado de Perfil'}
          </button>

          <button
            onClick={goToProfile}
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
            🚀 Ir a Editar Perfil
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

export default ProfileSaveFix;
