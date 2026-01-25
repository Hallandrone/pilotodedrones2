import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  User2,
  Plane,
  Settings,
  BarChart3,
  Shield,
  Building,
  MapPin,
  Bell,
  LogOut,
  Home,
  FileCheck,
  Award,
  QrCode,
  CreditCard,
  MonitorPlay
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardSidebarProps {
  userRole: string | null;
}

const menuItems = [
  {
    title: "Inicio",
    url: "/dashboard",
    icon: Home,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Inicio",
    url: "/company",
    icon: Home,
    roles: ["company"]
  },
  {
    title: "Mi Perfil",
    url: "/dashboard/profile",
    icon: User2,
    roles: ["admin", "pilot", "user"]
  },
  {
    title: "Mi Perfil",
    url: "/company/profile",
    icon: Building,
    roles: ["company"]
  },
  {
    title: "Pilotos",
    url: "/dashboard/pilots",
    icon: Plane,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Mis Pilotos",
    url: "/company/pilots",
    icon: Plane,
    roles: ["company"]
  },
  {
    title: "Empresas",
    url: "/dashboard/companies",
    icon: Building,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Certificados",
    url: "/dashboard/certificates",
    icon: FileCheck,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Certificados",
    url: "/company/certificates",
    icon: FileCheck,
    roles: ["company"]
  },
  {
    title: "Mi QR",
    url: "/company/qr",
    icon: QrCode,
    roles: ["company"]
  },
  {
    title: "Membresía",
    url: "/company/membership",
    icon: CreditCard,
    roles: ["company"]
  },
  {
    title: "Portafolio",
    url: "/company/portfolio",
    icon: MonitorPlay,
    roles: ["company"]
  },
  {
    title: "Diplomas",
    url: "/dashboard/diplomas",
    icon: Award,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Notificaciones",
    url: "/dashboard/notifications",
    icon: Bell,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Configuración",
    url: "/dashboard/configuracion",
    icon: Settings,
    roles: ["super_admin"]
  }
];

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      });
    }
  };

  const filteredItems = menuItems.filter(item =>
    userRole && item.roles.includes(userRole)
  );

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
      ? "bg-white/10 text-white font-medium shadow-sm"
      : "text-white hover:text-white hover:bg-white/20"
    }`;

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} [--sidebar-foreground:0_0%_100%] [--sidebar-accent-foreground:0_0%_100%] [--sidebar-accent:0_0%_100%_/_0.2]`} collapsible="icon">
      <SidebarContent className="bg-[hsl(var(--accent))] backdrop-blur-sm border-r-2 border-[#1a365d]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/80">Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-white hover:text-white">
                    <NavLink to={item.url} end className={getNavClassName}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Actions */}
        <div className="mt-auto p-4 border-t border-[#1a365d] space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className={`w-full bg-white/10 border-white/30 text-white hover:bg-white hover:text-[#2FB8FF] ${collapsed ? 'px-2' : ''}`}
          >
            <Home className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Ir al Sitio</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={`w-full text-white hover:text-white hover:bg-red-500/20 ${collapsed ? 'px-2' : ''}`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}