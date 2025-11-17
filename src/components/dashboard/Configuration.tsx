import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BannerConfiguration } from "./BannerConfiguration";
import { PlatformConfiguration } from "./PlatformConfiguration";

export function Configuration() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Configuración del Sistema
        </h1>
        <p className="text-muted-foreground">
          Gestiona la configuración general de la plataforma
        </p>
      </div>

      <Tabs defaultValue="banners" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="banners">Landing Page</TabsTrigger>
          <TabsTrigger value="platform">Plataforma</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="space-y-6">
          <BannerConfiguration />
        </TabsContent>

        <TabsContent value="platform" className="space-y-6">
          <PlatformConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}