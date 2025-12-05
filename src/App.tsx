import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Auth from "./pages/Auth";
import DemoAuth from "./pages/DemoAuth";
import Dashboard from "./pages/Dashboard";
import PilotDashboard from "./pages/PilotDashboard";
import PilotProfile from "./pages/PilotProfile";
import PilotCertificates from "./pages/PilotCertificates";
import AdminCertificates from "./pages/AdminCertificates";
import PilotFlightHours from "./pages/PilotFlightHours";
import PilotQR from "./pages/PilotQR";
import PilotMembership from "./pages/PilotMembership";
import SearchResults from "./pages/SearchResults";
import DebugAuth from "./pages/DebugAuth";
import FixAuth from "./pages/FixAuth";
import QuickFix from "./pages/QuickFix";
import MobileFix from "./pages/MobileFix";
import PilotDataFix from "./pages/PilotDataFix";
import ProfileSaveFix from "./pages/ProfileSaveFix";
import AccessFix from "./pages/AccessFix";
import UserProfile from "./pages/UserProfile";
import PublicPilotProfile from "./pages/PublicPilotProfile";
import CompanyProfile from "./pages/CompanyProfile";
import CompanyDashboard from "./pages/CompanyDashboard";
import NotFound from "./pages/NotFound";
import "./lib/debug-auth"; // Importar funciones de debug
import "./lib/force-create-role"; // Importar función para crear rol
import "./lib/auth-cache"; // Importar funciones de caché de auth

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rutas con tema CLARO (Landing) */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/demo" element={<DemoAuth />} />
            <Route path="/search" element={<SearchResults />} />
            
            {/* Rutas con tema OSCURO (Dashboards) */}
            <Route path="/dashboard/*" element={<div className="dark"><Dashboard /></div>} />
            <Route path="/pilot" element={<div className="dark"><PilotDashboard /></div>} />
            <Route path="/pilot/profile" element={<div className="dark"><PilotProfile /></div>} />
            <Route path="/pilot/certificates" element={<div className="dark"><PilotCertificates /></div>} />
            <Route path="/pilot/flight-hours" element={<div className="dark"><PilotFlightHours /></div>} />
            <Route path="/pilot/qr" element={<div className="dark"><PilotQR /></div>} />
            <Route path="/pilot/membership" element={<div className="dark"><PilotMembership /></div>} />
            <Route path="/company" element={<div className="dark"><CompanyDashboard /></div>} />
            <Route path="/company/profile" element={<div className="dark"><CompanyProfile /></div>} />
            <Route path="/company-profile" element={<div className="dark"><CompanyProfile /></div>} />
            <Route path="/company/certificates" element={<div className="dark"><PilotCertificates /></div>} />
            <Route path="/company/qr" element={<div className="dark"><PilotQR /></div>} />
            <Route path="/company/membership" element={<div className="dark"><PilotMembership /></div>} />
            <Route path="/admin/certificates" element={<div className="dark"><AdminCertificates /></div>} />
            
            {/* Rutas de debug/fix */}
            <Route path="/debug-auth" element={<DebugAuth />} />
            <Route path="/fix-auth" element={<FixAuth />} />
            <Route path="/quick-fix" element={<QuickFix />} />
            <Route path="/mobile-fix" element={<MobileFix />} />
            <Route path="/pilot-data-fix" element={<PilotDataFix />} />
            <Route path="/profile-save-fix" element={<ProfileSaveFix />} />
            <Route path="/access-fix" element={<AccessFix />} />
            
            {/* Ruta temporal para ver UserProfile sin auth */}
            <Route path="/user-profile" element={<div className="dark"><UserProfile /></div>} />
            
            {/* Perfil público del piloto (para QR) - mantener ruta antigua por compatibilidad */}
            <Route path="/pilot/:pilotId" element={<div className="dark"><PublicPilotProfile /></div>} />
            
            {/* Nueva ruta para perfiles públicos con slug personalizado (debe ir antes del catch-all) */}
            <Route path="/:slug" element={<div className="dark"><PublicPilotProfile /></div>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
