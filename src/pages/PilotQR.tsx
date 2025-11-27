import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  QrCode, 
  Download, 
  Share2, 
  Copy,
  CheckCircle,
  Shield
} from "lucide-react";

const PilotQR = () => {
  const [pilotData, setPilotData] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPilotData();
  }, []);

  const loadPilotData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPilotData(profileData);
        
        // Generate QR code URL - use current slug if available, otherwise use ID
        // The slug will always work because old slugs redirect to current one
        const profileSlug = profileData.public_profile_slug;
        const profileUrl = profileSlug 
          ? `${window.location.origin}/${profileSlug}`
          : `${window.location.origin}/pilot/${user.id}`;
        setQrCode(profileUrl);
      }
    } catch (error) {
      console.error('Error loading pilot data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del piloto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas and download as PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      
      // White background
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 512, 512);
      }
      
      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `qr-piloto-${pilotData?.full_name || 'perfil'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: "QR Descargado",
            description: "Tu código QR ha sido descargado exitosamente",
          });
        }
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    const profileSlug = pilotData?.public_profile_slug;
    const profileUrl = profileSlug 
      ? `${window.location.origin}/${profileSlug}`
      : `${window.location.origin}/pilot/${pilotData?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi Perfil de Piloto',
          text: `Soy ${pilotData?.full_name}, piloto certificado de drones`,
          url: profileUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Enlace copiado",
        description: "El enlace de tu perfil ha sido copiado al portapapeles",
      });
    }
  };

  const handleCopyLink = () => {
    const profileSlug = pilotData?.public_profile_slug;
    const profileUrl = profileSlug 
      ? `${window.location.origin}/${profileSlug}`
      : `${window.location.origin}/pilot/${pilotData?.id}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Enlace copiado",
      description: "El enlace de tu perfil ha sido copiado al portapapeles",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Generando QR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E0E0E0]">
      {/* Header */}
      <div className="bg-[#212121] border-b border-[#333333] shadow-sm sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pilot')}
              className="h-10 w-10 rounded-full hover:bg-[#FF69B4]/10 hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#E0E0E0]">Mi QR</h1>
              <p className="text-sm text-[#B0B0B0] font-medium">Código QR personal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 pb-20">
        {/* QR Code Card */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="text-center pb-4 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center justify-center gap-2 text-[#E0E0E0]">
                <QrCode className="h-6 w-6 text-[#FF69B4]" />
                Código QR Personal
              </CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                Comparte tu perfil profesional con clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center bg-[#2C2C2C] rounded-xl pt-6">
              {/* QR Code */}
              <div ref={qrRef} className="bg-white p-8 rounded-2xl mx-auto mb-6 w-64 h-64 flex items-center justify-center shadow-lg">
                {qrCode ? (
                  <QRCodeSVG 
                    value={qrCode} 
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                ) : (
                  <div className="text-center">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Generando QR...</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-[#E0E0E0]">Perfil Verificado</span>
                </div>
                <p className="text-sm text-[#B0B0B0] font-medium">
                  {pilotData?.full_name || 'Piloto de Drones'}
                </p>
                <Badge className="bg-[#FF69B4]/20 text-[#FF69B4] border border-[#FF69B4]">
                  Piloto Certificado
                </Badge>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleDownloadQR}
            className="w-full h-12 bg-gradient-to-r from-[#FF69B4] to-pink-600 hover:from-[#FF69B4]/90 hover:to-pink-600/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 rounded-xl"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar QR
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-12 bg-[#2C2C2C] border-[#333333] hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500 transition-all duration-200 rounded-xl text-[#E0E0E0]"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="h-12 bg-[#2C2C2C] border-[#333333] hover:bg-green-500/10 hover:border-green-500 hover:text-green-500 transition-all duration-200 rounded-xl text-[#E0E0E0]"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Enlace
            </Button>
          </div>
        </div>

        {/* Information Card */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="pb-3 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="flex items-center gap-2 text-[#E0E0E0]">
                <CheckCircle className="h-5 w-5 text-[#FF69B4]" />
                Información del QR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#2C2C2C] rounded-xl pt-6">
              <div className="text-sm text-[#B0B0B0] space-y-2 font-medium">
                <p>• Tu código QR contiene información básica de tu perfil</p>
                <p>• Los clientes pueden escanearlo para ver tu información profesional</p>
                <p>• Incluye tu estado de certificación y especialidades</p>
                <p>• Se actualiza automáticamente cuando modificas tu perfil</p>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Profile Preview */}
        <Card className="bg-[#212121] border border-[#333333] shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#FF69B4]/20 via-[#FF69B4]/10 to-[#FF69B4]/20 p-1">
            <CardHeader className="pb-3 bg-[#2C2C2C] rounded-xl">
              <CardTitle className="text-[#E0E0E0]">Vista Previa del Perfil</CardTitle>
              <CardDescription className="text-[#B0B0B0] font-medium">
                Así verán tu perfil los clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-[#2C2C2C] rounded-xl pt-6">
              <div className="bg-[#1A1A1A] rounded-xl p-4 space-y-3 border border-[#333333]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-[#FF69B4] to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold text-lg">
                      {pilotData?.full_name?.charAt(0) || 'P'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#E0E0E0]">
                      {pilotData?.full_name || 'Piloto de Drones'}
                    </h4>
                    <p className="text-sm text-[#B0B0B0] font-medium">Piloto Certificado</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-[#2C2C2C] border-[#333333] text-[#E0E0E0]">Fotografía Aérea</Badge>
                  <Badge variant="outline" className="bg-[#2C2C2C] border-[#333333] text-[#E0E0E0]">Topografía</Badge>
                  <Badge variant="outline" className="bg-[#2C2C2C] border-[#333333] text-[#E0E0E0]">Inspección</Badge>
                </div>
                <p className="text-sm text-[#B0B0B0] font-medium">
                  Ubicación: Santiago, RM
                </p>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PilotQR;
