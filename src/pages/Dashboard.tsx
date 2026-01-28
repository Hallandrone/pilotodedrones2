import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Logo from "@/components/ui/logo";
import { Users } from "@/components/dashboard/Users";
import { Pilots } from "@/components/dashboard/Pilots";
import { Companies } from "@/components/dashboard/Companies";
import { Configuration } from "@/components/dashboard/Configuration";
import { BannerConfiguration } from "@/components/dashboard/BannerConfiguration";
import AdminCertificates from "./AdminCertificates";
import DiplomaGenerator from "./DiplomaGenerator";
import UserProfile from "./UserProfile";
import AdminFeedback from "./AdminFeedback";
import { Notifications } from "@/components/dashboard/Notifications";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Loader2, UserCog } from "lucide-react";
import { getUserRole, isAdmin } from "@/lib/auth-utils";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import type { User } from '@supabase/supabase-js';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Small delay to allow session propagation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get user role (with automatic creation if needed)
      let roleData = await getUserRole(session.user.id);

      // Retry once if role retrieval fails
      if (!roleData) {
        console.warn('First attempt to get role failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        roleData = await getUserRole(session.user.id);
      }

      if (!roleData) {
        console.error('No se pudo obtener el rol del usuario después de reintentar');
        toast({
          title: "Error de sesión",
          description: "No pudimos verificar sus permisos. Intente recargar la página.",
          variant: "destructive",
        });
        // We stay on dashboard but set loading to false to show an error state if needed
        // For now, let's keep the redirect but only as a last resort
        setTimeout(() => navigate('/auth'), 3000);
        return;
      }

      // Redirect pilots to their dashboard
      if (roleData.role === 'pilot') {
        navigate('/pilot');
        return;
      }

      // Check if user is admin or has any admin permissions
      const isUserAdmin = await isAdmin(session.user.id);

      // Also check if user has any admin permissions (for sub-admins)
      const { data: permissionsData } = await supabase
        .from('user_permissions')
        .select('permission')
        .eq('user_id', session.user.id);

      const hasAnyPermissions = permissionsData && permissionsData.length > 0;

      if (!isUserAdmin && !hasAnyPermissions) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder al dashboard",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUserRole(roleData.role);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg text-foreground">Verificando acceso...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#083b4e] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#083b4e] via-[#083b4e] to-[#0a4a61] pointer-events-none"></div>

        <DashboardSidebar userRole={userRole} />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <DashboardHeader user={user} />

          <main className="flex-1 overflow-y-auto p-6 relative">
            <div className="max-w-7xl mx-auto space-y-6">
              <Routes>
                <Route path="/" element={
                  <>
                    <div className="space-y-3 mb-8">
                      <h1 className="text-4xl font-bold text-white">
                        Dashboard de Administrador
                      </h1>
                      <p className="text-white/80 text-lg">
                        {userRole === 'super_admin'
                          ? "Gestiona y monitorea toda la plataforma de drones"
                          : "Gestiona los recursos de la plataforma según tus permisos asignados"}
                      </p>
                    </div>
                    {userRole === 'super_admin' ? (
                      <DashboardStats />
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-sm">
                        <UserCog className="h-16 w-16 text-accent/40 mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-white mb-2">¡Bienvenido al Panel Administrativo!</h3>
                        <p className="text-white/60 max-w-md mx-auto">
                          Utiliza el menú lateral para acceder a las secciones de gestión habilitadas para tu perfil.
                        </p>
                      </div>
                    )}
                  </>
                } />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/users" element={<Users />} />
                <Route path="/pilots" element={<Pilots />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/certificates" element={<AdminCertificates />} />
                <Route path="/diplomas" element={<DiplomaGenerator />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/banners" element={<BannerConfiguration />} />
                <Route path="/feedback" element={<AdminFeedback />} />
                <Route path="/configuracion" element={<Configuration />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;