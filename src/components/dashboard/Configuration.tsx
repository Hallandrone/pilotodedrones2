import { BannerConfiguration } from "./BannerConfiguration";
import { PermissionsManagement } from "./PermissionsManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Image, Settings } from "lucide-react";

export function Configuration() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          Configuración del Sistema
        </h1>
        <p className="text-white/70">
          Gestiona la configuración general de la plataforma
        </p>
      </div>

      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles y Permisos
          </TabsTrigger>
          <TabsTrigger value="banners" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Banners
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="permissions" className="mt-6">
          <PermissionsManagement />
        </TabsContent>
        
        <TabsContent value="banners" className="mt-6">
          <BannerConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}