import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Briefcase, Award } from "lucide-react";

interface PilotCardProps {
  pilot: {
    id: string;
    name: string;
    location: string;
    certification_academy?: string;
    experience_years?: number;
    certified: boolean;
    specialties: string[];
    drone_types?: string[];
    profileImage?: string;
  };
}

const PilotCard = ({ pilot }: PilotCardProps) => {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#00b3f3]/50 bg-white h-full flex flex-col">
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          {/* Profile Image - Más grande y prominente */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00b3f3]/10 to-[#00b3f3]/20 flex items-center justify-center ring-2 ring-[#00b3f3]/20 group-hover:ring-[#00b3f3]/40 transition-all">
              {pilot.profileImage ? (
                <img
                  src={pilot.profileImage}
                  alt={pilot.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <img
                  src="/piloto de drones-logo.png"
                  alt="Piloto de Drones"
                  className="w-16 h-16 object-contain"
                />
              )}
            </div>
            {/* Certification Badge */}
            {pilot.certified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                <Shield className="h-5 w-5 text-emerald-500 fill-emerald-100" />
              </div>
            )}
          </div>

          {/* Pilot Info */}
          <div className="flex-1 min-w-0">
            {/* Name and Company */}
            <div className="mb-3">
              <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-[#00b3f3] transition-colors truncate">
                {pilot.name}
              </h3>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                <MapPin className="h-4 w-4 text-[#00b3f3]" />
                <span>{pilot.location}</span>
              </div>

              </div>

            {/* Certification and Experience Info */}
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-gray-600">
              {pilot.certification_academy && (
                <div className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-[#00b3f3]" />
                  <span className="font-medium">{pilot.certification_academy}</span>
                </div>
              )}
              {pilot.experience_years && pilot.experience_years > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-[#00b3f3]">{pilot.experience_years}</span>
                  <span>años de experiencia</span>
                </div>
              )}
            </div>

            {/* Specialties */}
            {pilot.specialties && pilot.specialties.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-bold text-gray-900 mb-2">Especialidades</div>
                <div className="flex flex-wrap gap-2">
                  {pilot.specialties.slice(0, 3).map((specialty, index) => (
                    <Badge
                      key={index}
                      className="text-xs font-semibold bg-[#00b3f3] text-white hover:bg-[#00b3f3]/90 border-0 px-3 py-1"
                    >
                      {specialty}
                    </Badge>
                  ))}
                  {pilot.specialties.length > 3 && (
                    <Badge className="text-xs font-semibold bg-gray-200 text-gray-700 border-0 px-3 py-1">
                      +{pilot.specialties.length - 3} más
                    </Badge>
                  )}
                </div>
              </div>
            )}


            {/* Botón Ver Perfil Completo */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 border-[#00b3f3] text-[#00b3f3] hover:bg-[#00b3f3] hover:text-white transition-all duration-200 font-semibold"
            >
              Ver Perfil Completo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PilotCard;