import { BannerConfiguration } from "./BannerConfiguration";

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

      <BannerConfiguration />
    </div>
  );
}