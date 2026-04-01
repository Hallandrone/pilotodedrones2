import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Todas las demás rutas con lazy loading para reducir bundle inicial
const Planes = lazy(() => import("./pages/Planes"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Auth = lazy(() => import("./pages/Auth"));
const DemoAuth = lazy(() => import("./pages/DemoAuth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PilotDashboard = lazy(() => import("./pages/PilotDashboard"));
const PilotProfile = lazy(() => import("./pages/PilotProfile"));
const PilotCertificates = lazy(() => import("./pages/PilotCertificates"));
const AdminCertificates = lazy(() => import("./pages/AdminCertificates"));
const PilotFlightHours = lazy(() => import("./pages/PilotFlightHours"));
const PilotQR = lazy(() => import("./pages/PilotQR"));
const PilotMembership = lazy(() => import("./pages/PilotMembership"));
const PilotPortfolio = lazy(() => import("./pages/PilotPortfolio"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const DebugAuth = lazy(() => import("./pages/DebugAuth"));
const FixAuth = lazy(() => import("./pages/FixAuth"));
const QuickFix = lazy(() => import("./pages/QuickFix"));
const MobileFix = lazy(() => import("./pages/MobileFix"));
const PilotDataFix = lazy(() => import("./pages/PilotDataFix"));
const ProfileSaveFix = lazy(() => import("./pages/ProfileSaveFix"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const PublicPilotProfile = lazy(() => import("./pages/PublicPilotProfile"));
const DiplomaVerification = lazy(() => import("./pages/DiplomaVerification"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const ProfileContacts = lazy(() => import("./pages/ProfileContacts"));
const InvitationAccept = lazy(() => import("./pages/InvitationAccept"));
const DiplomaGenerator = lazy(() => import("./pages/DiplomaGenerator"));
const AdminDrones = lazy(() => import("./pages/AdminDrones"));
const DronePublicView = lazy(() => import("./pages/DronePublicView"));
const QRRedirect = lazy(() => import("./pages/QRRedirect"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Debug utilities solo en desarrollo
if (import.meta.env.DEV) {
  import("./lib/debug-auth");
  import("./lib/force-create-role");
  import("./lib/auth-cache");
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>}>
          <Routes>
            {/* Rutas con tema CLARO (Landing) */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/planes" element={<Planes />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/demo" element={<DemoAuth />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/verificar-diploma" element={<DiplomaVerification />} />

            {/* Rutas con tema OSCURO (Dashboards) */}
            <Route path="/dashboard/*" element={<div className="dark"><Dashboard /></div>} />
            <Route path="/pilot" element={<div className="dark"><PilotDashboard /></div>} />
            <Route path="/pilot/profile" element={<div className="dark"><PilotProfile /></div>} />
            <Route path="/pilot/certificates" element={<div className="dark"><PilotCertificates /></div>} />
            <Route path="/pilot/flight-hours" element={<div className="dark"><PilotFlightHours /></div>} />
            <Route path="/pilot/qr" element={<div className="dark"><PilotQR /></div>} />
            <Route path="/pilot/membership" element={<div className="dark"><PilotMembership /></div>} />
            <Route path="/pilot/portfolio" element={<div className="dark"><PilotPortfolio /></div>} />
            <Route path="/pilot/contacts" element={<div className="dark"><ProfileContacts /></div>} />
            <Route path="/company/*" element={<div className="dark"><CompanyDashboard /></div>} />

            {/* Rutas de debug/fix */}
            <Route path="/debug-auth" element={<DebugAuth />} />
            <Route path="/fix-auth" element={<FixAuth />} />
            <Route path="/quick-fix" element={<QuickFix />} />
            <Route path="/mobile-fix" element={<MobileFix />} />
            <Route path="/pilot-data-fix" element={<PilotDataFix />} />
            <Route path="/profile-save-fix" element={<ProfileSaveFix />} />

            {/* Ruta temporal para ver UserProfile sin auth */}
            <Route path="/user-profile" element={<div className="dark"><UserProfile /></div>} />

            {/* Rutas para aceptar invitaciones de empresa */}
            <Route path="/invitation/:token" element={<InvitationAccept />} />
            <Route path="/invitation/accept/:token" element={<InvitationAccept />} />

            {/* Ruta para QR codes de diplomas */}
            <Route path="/qr/:token" element={<QRRedirect />} />

            {/* Ruta para vista pública de drones via QR */}
            <Route path="/drone/:token" element={<DronePublicView />} />

            {/* Perfil público del piloto (para QR) - mantener ruta antigua por compatibilidad */}
            <Route path="/pilot/:pilotId" element={<div className="dark"><PublicPilotProfile /></div>} />

            {/* Nueva ruta para perfiles públicos con slug personalizado (debe ir antes del catch-all) */}
            <Route path="/:slug" element={<div className="dark"><PublicPilotProfile /></div>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
