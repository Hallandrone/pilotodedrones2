import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  MapPin, 
  Mail, 
  Phone, 
  Clock,
  CheckCircle,
  Star,
  Briefcase,
  QrCode,
  Award,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface PilotProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  avatar_url: string | null;
  drone_types: string[] | null;
}

interface PilotData {
  certification_status: boolean;
  certification_academy: string | null;
  status: string;
}

interface PilotService {
  service_type: string;
  description: string;
  price_per_hour: number;
  is_published: boolean;
}

const PublicPilotProfile = () => {
  const { pilotId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<PilotProfile | null>(null);
  const [services, setServices] = useState<PilotService[]>([]);
  const [pilotData, setPilotData] = useState<PilotData | null>(null);
  const [flightHours, setFlightHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const profileUrl = `${window.location.origin}/pilot/${pilotId}`;
  const searchState = location.state as any;

  const handleBack = () => {
    if (searchState) {
      const params = new URLSearchParams();
      if (searchState.searchTerm) params.set("search", searchState.searchTerm);
      if (searchState.selectedRegion && searchState.selectedRegion !== "all") params.set("region", searchState.selectedRegion);
      if (searchState.certifiedOnly) params.set("certified", "true");
      navigate(`/search?${params.toString()}`, { 
        state: searchState 
      });
    } else {
      navigate("/search");
    }
  };

  useEffect(() => {
    loadPilotProfile();
  }, [pilotId]);

  const loadPilotProfile = async () => {
    try {
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', pilotId)
        .single();

      if (profileError) throw profileError;

      // Load pilot data (status, certification, etc.)
      const { data: pilotInfo } = await supabase
        .from('pilots')
        .select('status, certification_status, certification_academy')
        .eq('user_id', pilotId)
        .single();

      // Load published services
      const { data: servicesData } = await supabase
        .from('pilot_services')
        .select('*')
        .eq('pilot_id', pilotId)
        .eq('is_published', true);

      // TODO: Load flight hours when table is created
      const totalHours = 0;

      setProfile(profileData as unknown as PilotProfile);
      setPilotData(pilotInfo);
      setServices(servicesData || []);
      setFlightHours(totalHours);
    } catch (error) {
      console.error('Error loading pilot profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del piloto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center font-inter">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
          <p className="text-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4 font-inter">
        <Card className="max-w-md w-full bg-card border-border">
          <CardHeader>
            <CardTitle className="text-center text-foreground">Perfil no encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            No se encontró el perfil del piloto solicitado.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#083b4e] font-inter relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a4a60]/50 via-transparent to-[#062833]/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-white hover:bg-white/10 mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a resultados
          </Button>

          {/* Profile Header Card */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Hero Header with Gradient */}
              <div className="bg-gradient-to-br from-sky-500/30 via-blue-600/20 to-indigo-600/30 p-8 md:p-12 border-b border-white/10">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-6 lg:sticky lg:top-8">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-blue-600 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                      <div className="relative h-48 w-48 bg-gradient-to-br from-sky-400 to-blue-600 rounded-3xl flex items-center justify-center text-6xl font-bold text-white shadow-2xl ring-4 ring-white/20">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-48 w-48 rounded-3xl object-cover" />
                        ) : (
                          profile.full_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      {pilotData?.certification_status && (
                        <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl p-4 shadow-2xl border-4 border-white/30 animate-pulse">
                          <CheckCircle className="h-8 w-8 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* QR Code */}
                    <div className="bg-white p-5 rounded-2xl shadow-2xl ring-2 ring-white/20">
                      <QRCodeSVG value={profileUrl} size={140} level="H" />
                      <p className="text-xs text-center text-gray-700 mt-3 flex items-center justify-center gap-1.5 font-medium">
                        <QrCode className="h-4 w-4" />
                        Perfil Verificable
                      </p>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 text-center lg:text-left w-full">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                      <div className="flex-1">
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-3 tracking-tight">
                          {profile.full_name}
                        </h1>
                        {profile.location && (
                          <p className="text-sky-200 text-lg flex items-center gap-2 justify-center lg:justify-start mb-4">
                            <MapPin className="h-5 w-5" />
                            {profile.location}
                          </p>
                        )}
                      </div>
                      {pilotData?.certification_status && (
                        <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 px-6 py-2 text-base font-semibold shadow-lg w-fit mx-auto lg:mx-0">
                          <Shield className="h-5 w-5 mr-2" />
                          Certificado
                        </Badge>
                      )}
                    </div>

                    {profile.bio && (
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/10">
                        <p className="text-white/90 text-lg leading-relaxed">{profile.bio}</p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      {/* Flight Hours */}
                      <div className="bg-gradient-to-br from-sky-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-6 border border-sky-400/30 hover:border-sky-400/50 transition-all">
                        <Clock className="h-8 w-8 text-sky-400 mb-3" />
                        <div className="text-sky-300 text-4xl font-bold mb-1">{flightHours}</div>
                        <div className="text-white/80 text-sm font-medium">Horas de Vuelo</div>
                      </div>
                      
                      {/* Experience */}
                      {profile.experience_years && profile.experience_years > 0 && (
                        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30 hover:border-purple-400/50 transition-all">
                          <Star className="h-8 w-8 text-purple-400 mb-3" />
                          <div className="text-purple-300 text-4xl font-bold mb-1">{profile.experience_years}</div>
                          <div className="text-white/80 text-sm font-medium">Años de Experiencia</div>
                        </div>
                      )}
                      
                      {/* Services Count */}
                      <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-400/30 hover:border-emerald-400/50 transition-all">
                        <Briefcase className="h-8 w-8 text-emerald-400 mb-3" />
                        <div className="text-emerald-300 text-4xl font-bold mb-1">{services.length}</div>
                        <div className="text-white/80 text-sm font-medium">Servicios Disponibles</div>
                      </div>
                    </div>

                    {/* Certification Badge */}
                    {pilotData?.certification_academy && (
                      <div className="bg-gradient-to-r from-amber-500/30 to-orange-500/30 backdrop-blur-sm rounded-2xl p-6 border border-amber-400/40 mb-8 hover:border-amber-400/60 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="bg-amber-400/20 rounded-xl p-3">
                            <Award className="h-10 w-10 text-amber-400" />
                          </div>
                          <div className="text-left">
                            <div className="text-amber-300 font-semibold text-sm uppercase tracking-wider mb-1">Certificado por</div>
                            <div className="text-white font-bold text-xl">{pilotData.certification_academy}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Specialties & Drones Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Specialties */}
                      {profile.specialties && profile.specialties.length > 0 && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                          <h3 className="text-white font-bold mb-4 text-xl flex items-center gap-2">
                            <div className="h-2 w-2 bg-sky-400 rounded-full"></div>
                            Especialidades
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.specialties.map((specialty, index) => (
                              <Badge key={index} className="bg-sky-500/30 text-sky-200 border border-sky-400/50 px-4 py-2 text-sm font-medium hover:bg-sky-500/40 transition-colors">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drone Types */}
                      {profile.drone_types && profile.drone_types.length > 0 && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                          <h3 className="text-white font-bold mb-4 text-xl flex items-center gap-2">
                            <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                            Tipos de Drones
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.drone_types.map((drone, index) => (
                              <Badge key={index} className="bg-purple-500/30 text-purple-200 border border-purple-400/50 px-4 py-2 text-sm font-medium hover:bg-purple-500/40 transition-colors">
                                {drone}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Card */}
          {services.length > 0 && (
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-sky-500/20 to-blue-600/20 border-b border-white/10">
                <CardTitle className="flex items-center gap-3 text-white text-3xl">
                  <div className="bg-sky-400/20 rounded-xl p-2">
                    <Briefcase className="h-7 w-7 text-sky-400" />
                  </div>
                  Servicios Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service, index) => (
                    <Card key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-white/20 hover:border-sky-400/50 hover:shadow-xl hover:shadow-sky-500/20 transition-all duration-300 group">
                      <CardContent className="pt-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-white text-xl group-hover:text-sky-300 transition-colors">{service.service_type}</h3>
                            <Badge className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-0 px-4 py-1.5 text-base font-bold shadow-lg whitespace-nowrap">
                              ${service.price_per_hour?.toLocaleString()}/hr
                            </Badge>
                          </div>
                          {service.description && (
                            <p className="text-sm text-white/80 leading-relaxed">{service.description}</p>
                          )}
                          <div className="pt-2 border-t border-white/10">
                            <Button className="w-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/50">
                              Solicitar Servicio
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Card */}
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/20 to-green-600/20 border-b border-white/10">
              <CardTitle className="text-white text-3xl flex items-center gap-3">
                <div className="bg-emerald-400/20 rounded-xl p-2">
                  <Mail className="h-7 w-7 text-emerald-400" />
                </div>
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid gap-6 sm:grid-cols-2">
                {profile.email && (
                  <a 
                    href={`mailto:${profile.email}`}
                    className="group flex items-center gap-5 p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl hover:bg-white/15 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border border-white/20 hover:border-emerald-400/50"
                  >
                    <div className="h-16 w-16 bg-gradient-to-br from-emerald-500/30 to-green-600/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mail className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/60 font-medium mb-1">Email</p>
                      <p className="font-semibold text-white text-lg break-all">{profile.email}</p>
                    </div>
                  </a>
                )}
                {profile.phone && (
                  <a 
                    href={`tel:${profile.phone}`}
                    className="group flex items-center gap-5 p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl hover:bg-white/15 hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 border border-white/20 hover:border-sky-400/50"
                  >
                    <div className="h-16 w-16 bg-gradient-to-br from-sky-500/30 to-blue-600/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Phone className="h-8 w-8 text-sky-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/60 font-medium mb-1">Teléfono</p>
                      <p className="font-semibold text-white text-lg">{profile.phone}</p>
                    </div>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicPilotProfile;
