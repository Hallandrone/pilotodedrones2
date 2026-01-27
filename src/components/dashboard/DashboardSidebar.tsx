import { useState, useEffect } from "react";
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
  MonitorPlay,
  Image,
  MessageCircle
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions, type AdminPermission } from "@/hooks/useUserPermissions";
import { useUnreadContacts } from "@/hooks/useUnreadContacts";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

interface DashboardSidebarProps {
  userRole: string | null;
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  permission?: AdminPermission;
  requiresPaid?: boolean;
}

const menuItems: MenuItem[] = [
  {
    title: "Inicio",
    url: "/dashboard",
    icon: Home,
    roles: ["super_admin"]
  },
  {
    title: "Inicio",
    url: "/company",
    icon: Home,
    roles: ["company"]
  },
  {
    title: "Mi Perfil de Piloto",
    url: "/pilot",
    icon: User2,
    roles: ["super_admin", "admin"]
  },
  {
    title: "Mi Perfil",
    url: "/company/profile",
    icon: Building,
    roles: ["company"]
  },
  {
    title: "Usuarios",
    url: "/dashboard/users",
    icon: User2,
    roles: ["super_admin", "admin"],
    permission: "view_users"
  },
  {
    title: "Pilotos",
    url: "/dashboard/pilots",
    icon: Plane,
    roles: ["super_admin", "admin"],
    permission: "view_users"
  },
  {
    title: "Mis Pilotos",
    url: "/company/pilots",
    icon: Plane,
    roles: ["company"],
    requiresPaid: true
  },
  {
    title: "Empresas",
    url: "/dashboard/companies",
    icon: Building,
    roles: ["super_admin", "admin"],
    permission: "view_companies"
  },
  {
    title: "Certificados",
    url: "/dashboard/certificates",
    icon: FileCheck,
    roles: ["super_admin", "admin"],
    permission: "manage_certificates"
  },
  {
    title: "Certificados",
    url: "/company/certificates",
    icon: FileCheck,
    roles: ["company"],
    requiresPaid: true
  },
  {
    title: "Mi QR",
    url: "/company/qr",
    icon: QrCode,
    roles: ["company"],
    requiresPaid: true
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
    roles: ["company"],
    requiresPaid: true
  },
  {
    title: "Contactos",
    url: "/company/contacts",
    icon: MessageCircle,
    roles: ["company"],
    requiresPaid: true
  },
  {
    title: "Diplomas",
    url: "/dashboard/diplomas",
    icon: Award,
    roles: ["super_admin", "admin"],
    permission: "create_diplomas"
  },
  {
    title: "Notificaciones",
    url: "/dashboard/notifications",
    icon: Bell,
    roles: ["super_admin", "admin"],
    permission: "view_notifications"
  },
  {
    title: "Banners",
    url: "/dashboard/banners",
    icon: Image,
    roles: ["super_admin", "admin"],
    permission: "manage_banners"
  },
  {
    title: "Problemas/Sugerencias",
    url: "/dashboard/feedback",
    icon: MessageCircle,
    roles: ["super_admin"]
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
  const { hasPermission, isSuperAdmin, loading: permissionsLoading } = useUserPermissions();
  const { plan } = useSubscriptionPlan();
  const [userId, setUserId] = useState<string | undefined>();

  // Obtener userId para el hook de contactos
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  const { unreadCount } = useUnreadContacts(userId);

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

  // Filter items based on role and permissions
  const filteredItems = menuItems.filter(item => {
    // First check role exactly
    if (!userRole || !item.roles.includes(userRole)) {
      // For super_admin, we might want them to see admin items too
      if (userRole === 'super_admin' && item.roles.includes('admin')) {
        return true;
      }
      return false;
    }

    // Check payment status for companies
    if (userRole === 'company' && !plan?.isPaid) {
      // If company has not paid, ONLY show Membership
      return item.title === "Membresía";
    }

    // For admin role, check specific permissions
    if (userRole === 'admin' && item.permission) {
      return hasPermission(item.permission);
    }

    // Check payment status for specific items (if any other role needs it)
    if (item.requiresPaid && !plan?.isPaid) {
      return false;
    }

    return true;
  });

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
      ? "bg-white/10 text-white font-medium shadow-sm"
      : "text-white hover:text-white hover:bg-white/20"
    }`;

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} [--sidebar-foreground:0_0%_100%] [--sidebar-accent-foreground:0_0%_100%] [--sidebar-accent:0_0%_100%_/_0.2]`} collapsible="icon">
      <SidebarContent className="bg-[hsl(var(--accent))] backdrop-blur-sm border-r-2 border-[#1a365d] transform-gpu">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/80">Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title + item.url}>
                  <SidebarMenuButton asChild className="text-white hover:text-white">
                    <NavLink to={item.url} end className={getNavClassName}>
                      <div className="relative">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.title === "Contactos" && unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 h-4 w-4 bg-[#FF69B4] rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.title === "Contactos" && unreadCount > 0 && (
                            <Badge className="bg-[#FF69B4] text-white text-[10px] h-5 px-1.5 animate-pulse">
                              {unreadCount}
                            </Badge>
                          )}
                        </span>
                      )}
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