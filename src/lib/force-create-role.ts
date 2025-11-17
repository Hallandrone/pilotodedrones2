import { supabase } from "@/integrations/supabase/client";

export async function forceCreatePilotRole() {
  try {
    console.log('🔧 Forzando creación de rol de piloto...');
    
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ No hay usuario logueado');
      return false;
    }
    
    console.log('👤 Usuario encontrado:', user.id, user.email);
    
    // Verificar si ya existe el rol
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (existingRole) {
      console.log('✅ Rol ya existe:', existingRole);
      return true;
    }
    
    // Crear perfil si no existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!existingProfile) {
      console.log('🔧 Creando perfil...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email,
          user_type: 'pilot'
        });
      
      if (profileError) {
        console.error('❌ Error creando perfil:', profileError);
        return false;
      }
      console.log('✅ Perfil creado');
    } else {
      console.log('✅ Perfil ya existe');
    }
    
    // Crear rol
    console.log('🔧 Creando rol de piloto...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        id: user.id,
        role: 'pilot'
      });
    
    if (roleError) {
      console.error('❌ Error creando rol:', roleError);
      return false;
    }
    
    console.log('✅ Rol de piloto creado exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error general:', error);
    return false;
  }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  (window as any).forceCreatePilotRole = forceCreatePilotRole;
}
