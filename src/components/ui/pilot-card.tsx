import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Briefcase } from "lucide-react";

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
    company_name?: string | null;
  };
}

const PilotCard = ({ pilot }: PilotCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border border-border">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Profile Image */}
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            {pilot.profileImage ? (
              <img
                src={pilot.profileImage}
                alt={pilot.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">
                {pilot.name?.charAt(0) || 'P'}
              </span>
            )}
          </div>

          {/* Pilot Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                  {pilot.name}
                  {pilot.certified && (
                    <Shield className="h-4 w-4 text-accent" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {pilot.location}
                </p>
                {pilot.company_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {pilot.company_name}
                  </p>
                )}
              </div>
            </div>

            {/* Rating and Flight Hours */}
            <div className="flex items-center gap-4 mb-3">
              {pilot.certification_academy && (
                <div className="text-xs text-muted-foreground">
                  Certificado por: {pilot.certification_academy}
                </div>
              )}
              {pilot.experience_years && pilot.experience_years > 0 && (
                <div className="text-xs text-muted-foreground">
                  {pilot.experience_years} años de experiencia
                </div>
              )}
            </div>

            {/* Specialties */}
            <div className="space-y-2">
              {pilot.specialties.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Especialidades:</div>
                  <div className="flex flex-wrap gap-2">
                    {pilot.specialties.slice(0, 3).map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {pilot.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{pilot.specialties.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {pilot.drone_types && pilot.drone_types.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Drones:</div>
                  <div className="flex flex-wrap gap-2">
                    {pilot.drone_types.slice(0, 2).map((drone, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {drone}
                      </Badge>
                    ))}
                    {pilot.drone_types.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{pilot.drone_types.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button variant="outline" size="sm" className="w-full">
              Ver Perfil
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PilotCard;