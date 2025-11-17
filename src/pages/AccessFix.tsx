import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AccessFix = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const fixAccess = async () => {
    setLoading(true);
    setMessage('Solucionando acceso...');
    setSuccess(false);

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setMessage('❌ No hay usuario logueado');
        return;
      }

      setMessage('👤 Usuario encontrado: ' + user.email);

      // Check and fix profile
      setMessage('🔍 Verificando perfil...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        setMessage('🔧 Creando perfil...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            email: user.email,
            user_type: 'pilot'
          });

        if (createProfileError) {
          setMessage('❌ Error creando perfil: ' + createProfileError.message);
          return;
        }
        setMessage('✅ Perfil creado');
      } else if (profileError) {
        setMessage('❌ Error verificando perfil: ' + profileError.message);
        return;
      } else {
        setMessage('✅ Perfil encontrado: ' + profile.full_name);
      }

      // Check and fix role
      setMessage('🔍 Verificando rol...');
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Emails que deben tener rol de admin automáticamente
      const adminEmails = [
        'web@alvarocofre.dev',
        'cofre@live.cl',
        'hahumada@academiadronchile.cl'
      ];
      const shouldBeAdmin = adminEmails.some(email => 
        user.email?.toLowerCase() === email.toLowerCase()
      );

      if (roleError && roleError.code === 'PGRST116') {
        setMessage('🔧 Creando rol...');
        const initialRole = shouldBeAdmin ? 'super_admin' : 'pilot';
        const { error: createRoleError } = await supabase
          .from('user_roles')
          .insert({
            id: user.id,
            role: initialRole
          });

        if (createRoleError) {
          setMessage('❌ Error creando rol: ' + createRoleError.message);
          return;
        }
        setMessage(`✅ Rol creado: ${initialRole}`);
      } else if (roleError) {
        setMessage('❌ Error verificando rol: ' + roleError.message);
        return;
      } else {
        setMessage('✅ Rol encontrado: ' + role.role);
        
        // Si el usuario debería ser admin pero no lo es, actualizar
        if (shouldBeAdmin && role.role !== 'admin' && role.role !== 'super_admin') {
          setMessage('🔧 Actualizando rol a super_admin...');
          const { error: updateRoleError } = await supabase
            .from('user_roles')
            .update({ role: 'super_admin' })
            .eq('id', user.id);

          if (updateRoleError) {
            setMessage('❌ Error actualizando rol: ' + updateRoleError.message);
            return;
          }
          setMessage('✅ Rol actualizado a super_admin');
        }
      }

      // Check and fix pilot record
      setMessage('🔍 Verificando registro de piloto...');
      const { data: pilotData, error: pilotError } = await supabase
        .from('pilots')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (pilotError && pilotError.code === 'PGRST116') {
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
        setMessage('✅ Registro de piloto encontrado');
      }

      setSuccess(true);
      
      // Verificar el rol final para decidir a dónde redirigir
      const { data: finalRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (finalRole?.role === 'admin' || finalRole?.role === 'super_admin') {
        setMessage('🎉 ¡Acceso solucionado! Redirigiendo al dashboard de administrador...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setMessage('🎉 ¡Acceso solucionado! Redirigiendo al dashboard de piloto...');
        setTimeout(() => {
          navigate('/pilot');
        }, 2000);
      }

    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToPilot = () => {
    navigate('/pilot');
  };

  const goToAuth = () => {
    navigate('/auth');
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
          🔧 Solucionar Acceso
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          Soluciona el problema de acceso denegado
        </p>

        <div style={{
          background: '#f3f4f6',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#374151',
          minHeight: '100px'
        }}>
          {message || 'Haz clic en el botón para solucionar el acceso'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={fixAccess}
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
            {loading ? '⏳ Solucionando...' : '🔧 Solucionar Acceso'}
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

          <button
            onClick={goToAuth}
            style={{
              background: 'transparent',
              color: '#6b7280',
              border: '2px solid #6b7280',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🔄 Volver a Login
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

export default AccessFix;
