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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-inter">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00b3f3] mb-4"></div>
          <p className="text-[#083b4e]">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-inter">
        <Card className="max-w-md w-full bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-[#083b4e]">Perfil no encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-600">
            No se encontró el perfil del piloto solicitado.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Content */}
      <div className="px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-[#083b4e] hover:bg-gray-100 mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a resultados
          </Button>

          {/* Profile Header Card */}
          <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Header Section */}
              <div className="bg-white p-8 md:p-10 border-b border-gray-200">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-6 w-full lg:w-auto">
                    <div className="relative">
                      <div className="h-36 w-36 bg-[#083b4e] rounded-lg flex items-center justify-center text-5xl font-semibold text-white border-2 border-gray-200">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.full_name || ''} className="h-36 w-36 rounded-lg object-cover" />
                        ) : (
                          profile.full_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      {pilotData?.certification_status && (
                        <div className="absolute -bottom-2 -right-2 bg-[#00b3f3] rounded-full p-2 border-4 border-white shadow-md">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <QRCodeSVG value={profileUrl} size={120} level="H" />
                      <p className="text-xs text-center text-gray-600 mt-2 flex items-center justify-center gap-1.5 font-medium">
                        <QrCode className="h-3 w-3" />
                        Perfil Verificable
                      </p>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 w-full text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-6">
                      <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-semibold text-[#083b4e] mb-2">
                          {profile.full_name}
                        </h1>
                        {profile.location && (
                          <p className="text-gray-600 text-base flex items-center gap-2 justify-center lg:justify-start mb-4">
                            <MapPin className="h-4 w-4" />
                            {profile.location}
                          </p>
                        )}
                      </div>
                      {pilotData?.certification_status && (
                        <Badge className="bg-[#00b3f3] text-white border-0 px-4 py-1.5 text-sm font-medium w-fit mx-auto lg:mx-0">
                          <Shield className="h-4 w-4 mr-2" />
                          Certificado
                        </Badge>
                      )}
                    </div>

                    {profile.bio && (
                      <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                        <p className="text-gray-700 text-base leading-relaxed">{profile.bio}</p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      {/* Flight Hours */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00b3f3]/30 transition-colors">
                        <Clock className="h-6 w-6 text-[#00b3f3] mb-3" />
                        <div className="text-[#083b4e] text-3xl font-semibold mb-1">{flightHours}</div>
                        <div className="text-gray-600 text-sm font-medium">Horas de Vuelo</div>
                      </div>
                      
                      {/* Experience */}
                      {profile.experience_years && profile.experience_years > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00b3f3]/30 transition-colors">
                          <Star className="h-6 w-6 text-[#00b3f3] mb-3" />
                          <div className="text-[#083b4e] text-3xl font-semibold mb-1">{profile.experience_years}</div>
                          <div className="text-gray-600 text-sm font-medium">Años de Experiencia</div>
                        </div>
                      )}
                      
                      {/* Services Count */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#00b3f3]/30 transition-colors">
                        <Briefcase className="h-6 w-6 text-[#00b3f3] mb-3" />
                        <div className="text-[#083b4e] text-3xl font-semibold mb-1">{services.length}</div>
                        <div className="text-gray-600 text-sm font-medium">Servicios Disponibles</div>
                      </div>
                    </div>

                    {/* Certification Badge */}
                    {pilotData?.certification_academy && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#00b3f3]/10 rounded-lg p-3">
                            <Award className="h-8 w-8 text-[#00b3f3]" />
                          </div>
                          <div>
                            <div className="text-gray-600 font-medium text-sm uppercase tracking-wide mb-1">Certificado por</div>
                            <div className="text-[#083b4e] font-semibold text-lg">{pilotData.certification_academy}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Specialties & Drones Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Specialties */}
                      {profile.specialties && profile.specialties.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-[#083b4e] font-semibold mb-4 text-lg">
                            Especialidades
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.specialties.map((specialty, index) => (
                              <Badge key={index} className="bg-white text-[#00b3f3] border border-[#00b3f3] px-3 py-1 text-sm font-normal hover:bg-[#00b3f3]/5 transition-colors">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Drone Types */}
                      {profile.drone_types && profile.drone_types.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <h3 className="text-[#083b4e] font-semibold mb-4 text-lg">
                            Tipos de Drones
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.drone_types.map((drone, index) => (
                              <Badge key={index} className="bg-white text-[#00b3f3] border border-[#00b3f3] px-3 py-1 text-sm font-normal hover:bg-[#00b3f3]/5 transition-colors">
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
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-[#083b4e] text-2xl font-semibold">
                  <div className="bg-[#00b3f3]/10 rounded-lg p-2">
                    <Briefcase className="h-6 w-6 text-[#00b3f3]" />
                  </div>
                  Servicios Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service, index) => (
                    <Card key={index} className="bg-white border border-gray-200 hover:border-[#00b3f3]/30 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-[#083b4e] text-lg">{service.service_type}</h3>
                            <Badge className="bg-[#00b3f3] text-white border-0 px-3 py-1 text-sm font-medium whitespace-nowrap">
                              ${service.price_per_hour?.toLocaleString()}/hr
                            </Badge>
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
                          )}
                          <div className="pt-2 border-t border-gray-200">
                            <Button className="w-full bg-[#00b3f3] hover:bg-[#0099cc] text-white">
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
          <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#083b4e] text-2xl font-semibold flex items-center gap-3">
                <div className="bg-[#00b3f3]/10 rounded-lg p-2">
                  <Mail className="h-6 w-6 text-[#00b3f3]" />
                </div>
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {profile.email && (
                  <a 
                    href={`mailto:${profile.email}`}
                    className="group flex items-center gap-5 p-6 bg-white border border-gray-200 rounded-lg hover:border-[#00b3f3]/30 hover:bg-gray-50 transition-all"
                  >
                    <div className="h-14 w-14 bg-[#00b3f3]/10 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-[#00b3f3]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium mb-1">Email</p>
                      <p className="font-medium text-[#083b4e] text-base break-all">{profile.email}</p>
                    </div>
                  </a>
                )}
                {profile.phone && (
                  <a 
                    href={`tel:${profile.phone}`}
                    className="group flex items-center gap-5 p-6 bg-white border border-gray-200 rounded-lg hover:border-[#00b3f3]/30 hover:bg-gray-50 transition-all"
                  >
                    <div className="h-14 w-14 bg-[#00b3f3]/10 rounded-lg flex items-center justify-center">
                      <Phone className="h-6 w-6 text-[#00b3f3]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 font-medium mb-1">Teléfono</p>
                      <p className="font-medium text-[#083b4e] text-base">{profile.phone}</p>
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
