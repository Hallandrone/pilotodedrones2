import { supabase } from "@/integrations/supabase/client";

export async function debugUserAuth() {
  console.log('🔍 Iniciando diagnóstico de autenticación...');
  
  try {
    // 1. Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error de sesión:', sessionError);
      return;
    }
    
    if (!session?.user) {
      console.error('❌ No hay usuario en la sesión');
      return;
    }
    
    console.log('✅ Usuario encontrado:', {
      id: session.user.id,
      email: session.user.email,
      metadata: session.user.user_metadata
    });
    
    // 2. Verificar perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error al obtener perfil:', profileError);
    } else if (profile) {
      console.log('✅ Perfil encontrado:', profile);
    } else {
      console.log('⚠️ Perfil no encontrado');
    }
    
    // 3. Verificar rol
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (roleError) {
      console.error('❌ Error al obtener rol:', roleError);
    } else if (role) {
      console.log('✅ Rol encontrado:', role);
    } else {
      console.log('⚠️ Rol no encontrado');
    }
    
    // 4. Intentar crear rol si no existe
    if (!role && !roleError) {
      console.log('🔧 Intentando crear rol...');
      
      const { error: createRoleError } = await supabase
        .from('user_roles')
        .insert({
          id: session.user.id,
          role: 'pilot'
        });
      
      if (createRoleError) {
        console.error('❌ Error al crear rol:', createRoleError);
      } else {
        console.log('✅ Rol creado exitosamente');
      }
    }
    
    // 5. Intentar crear perfil si no existe
    if (!profile && !profileError) {
      console.log('🔧 Intentando crear perfil...');
      
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email,
          user_type: 'pilot'
        });
      
      if (createProfileError) {
        console.error('❌ Error al crear perfil:', createProfileError);
      } else {
        console.log('✅ Perfil creado exitosamente');
      }
    }
    
    console.log('🎯 Diagnóstico completado. Revisa los logs arriba.');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Hacer la función disponible globalmente para debugging
if (typeof window !== 'undefined') {
  (window as any).debugUserAuth = debugUserAuth;
}
