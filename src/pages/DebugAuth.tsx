import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserRole } from "@/lib/auth-utils";

const DebugAuth = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setDebugInfo({ error: 'No user found' });
        return;
      }

      const debugData: any = {
        userId: user.id,
        userEmail: user.email,
        userMetadata: user.user_metadata,
        rawUserMetadata: user.user_metadata
      };

      // Check profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      debugData.profile = {
        data: profileData,
        error: profileError
      };

      // Check user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('id', user.id)
        .single();

      debugData.role = {
        data: roleData,
        error: roleError
      };

      // Try getUserRole function
      const roleFromFunction = await getUserRole(user.id);
      debugData.roleFromFunction = roleFromFunction;

      setDebugInfo(debugData);
    } catch (error) {
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const createRoleManually = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_roles')
        .insert({
          id: user.id,
          role: 'pilot'
        });

      if (error) {
        console.error('Error creating role:', error);
        alert('Error: ' + error.message);
      } else {
        alert('Role created successfully!');
        runDebug();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error);
    }
  };

  const createProfileManually = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
          email: user.email,
          user_type: 'pilot'
        });

      if (error) {
        console.error('Error creating profile:', error);
        alert('Error: ' + error.message);
      } else {
        alert('Profile created successfully!');
        runDebug();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error);
    }
  };

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Debug de Autenticación</CardTitle>
            <CardDescription>
              Información de debug para diagnosticar problemas de roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={runDebug} disabled={loading}>
                {loading ? 'Cargando...' : 'Actualizar Debug'}
              </Button>
              <Button onClick={createProfileManually} variant="outline">
                Crear Perfil Manualmente
              </Button>
              <Button onClick={createRoleManually} variant="outline">
                Crear Rol Manualmente
              </Button>
            </div>

            {debugInfo && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Información del Usuario:</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Perfil</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {debugInfo.profile?.data ? (
                        <div className="space-y-2">
                          <Badge className="bg-green-100 text-green-800">Existe</Badge>
                          <p className="text-sm">Tipo: {debugInfo.profile.data.user_type}</p>
                          <p className="text-sm">Nombre: {debugInfo.profile.data.full_name}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Badge className="bg-red-100 text-red-800">No existe</Badge>
                          <p className="text-sm text-red-600">
                            Error: {debugInfo.profile?.error?.message || 'No encontrado'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Rol</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {debugInfo.role?.data ? (
                        <div className="space-y-2">
                          <Badge className="bg-green-100 text-green-800">Existe</Badge>
                          <p className="text-sm">Rol: {debugInfo.role.data.role}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Badge className="bg-red-100 text-red-800">No existe</Badge>
                          <p className="text-sm text-red-600">
                            Error: {debugInfo.role?.error?.message || 'No encontrado'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Resultado de getUserRole():</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(debugInfo.roleFromFunction, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugAuth;
