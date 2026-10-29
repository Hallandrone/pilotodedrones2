import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ETIQUETAS_ACCION_FINAL, type AccionFinal, type AjustesMision, type Mision } from "@/lib/misiones/tipos";

interface Props {
  mision: Mision;
  /** En un mapeo la altura, el rumbo, la cámara y las paradas los define la grilla. */
  modoMapeo: boolean;
  cambiar: (cambio: (m: Mision) => Mision, registrar?: boolean) => void;
  alturaNueva: number;
  setAlturaNueva: (altura: number) => void;
  marcandoDespegue: boolean;
  setMarcandoDespegue: (marcando: boolean) => void;
}

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const Seccion = ({ titulo, children, ayuda }: { titulo: string; children: React.ReactNode; ayuda?: string }) => (
  <div className="space-y-2 border-b border-[#333333] pb-4">
    <Label className="block text-sm font-semibold text-[#E0E0E0]">{titulo}</Label>
    {children}
    {ayuda && <p className="text-xs text-[#8A8A8A]">{ayuda}</p>}
  </div>
);

const PanelAjustes = ({ mision, modoMapeo, cambiar, alturaNueva, setAlturaNueva, marcandoDespegue, setMarcandoDespegue }: Props) => {
  const aj = mision.ajustes;
  const ajustar = (cambio: Partial<AjustesMision>) => cambiar((m) => ({ ...m, ajustes: { ...m.ajustes, ...cambio } }));

  return (
    <div className="space-y-4">
      <Seccion titulo="Nombre de la misión">
        <Input
          id="mision-nombre"
          value={mision.nombre}
          maxLength={120}
          onChange={(e) => cambiar((m) => ({ ...m, nombre: e.target.value }), false)}
          className="bg-[#2C2C2C] border-[#333333]"
        />
      </Seccion>

      {modoMapeo && (
        <p className="rounded-lg border border-[#333333] bg-[#212121] p-3 text-xs text-[#B0B0B0]">
          En un mapeo, la altura, la cámara, el rumbo (de frente a cada pasada) y el paso sin detenerse los define la grilla de la pestaña Área.
        </p>
      )}

      {!modoMapeo && (
        <Seccion
          titulo="Altura de los puntos nuevos"
          ayuda="Metros sobre el punto de despegue, como los mide DJI Fly. La DAN 151 limita la altura AGL (sobre el suelo): el planificador la calcula con el relieve. Cada punto se ajusta en la pestaña Puntos."
        >
          <div className="flex items-center gap-2">
            <Input
              id="mision-altura"
              type="number"
              min={1}
              max={500}
              value={alturaNueva}
              onChange={(e) => setAlturaNueva(acotar(Number(e.target.value) || 1, 1, 500))}
              className="w-24 bg-[#2C2C2C] border-[#333333] tabular-nums"
            />
            <span className="text-sm text-[#B0B0B0]">m</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!mision.waypoints.length}
              onClick={() => cambiar((m) => ({ ...m, waypoints: m.waypoints.map((w) => ({ ...w, altura: alturaNueva })) }))}
              className="ml-auto border-[#333333]"
            >
              Aplicar a todos
            </Button>
          </div>
        </Seccion>
      )}

      <Seccion titulo="Velocidad" ayuda={`${(aj.velocidad * 3.6).toFixed(1).replace(".", ",")} km/h. La misma para toda la ruta.`}>
        <div className="flex items-center gap-2">
          <Input
            id="mision-velocidad"
            type="number"
            min={1}
            max={15}
            step={0.5}
            value={aj.velocidad}
            onChange={(e) => ajustar({ velocidad: acotar(Number(e.target.value) || 1, 1, 15) })}
            className="w-24 bg-[#2C2C2C] border-[#333333] tabular-nums"
          />
          <span className="text-sm text-[#B0B0B0]">m/s</span>
        </div>
      </Seccion>

      {!modoMapeo && (
        <>
          <Seccion titulo="Rumbo del dron">
            <Select value={aj.rumbo} onValueChange={(v) => ajustar({ rumbo: v as AjustesMision["rumbo"] })}>
              <SelectTrigger id="mision-rumbo" className="bg-[#2C2C2C] border-[#333333]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="siguiente">Mirando hacia el siguiente punto</SelectItem>
                <SelectItem value="fijo">Rumbo fijo</SelectItem>
              </SelectContent>
            </Select>
            {aj.rumbo === "fijo" && (
              <div className="flex items-center gap-2">
                <Input
                  id="mision-rumbo-fijo"
                  type="number"
                  min={0}
                  max={359}
                  value={aj.rumboFijo}
                  onChange={(e) => ajustar({ rumboFijo: acotar(Number(e.target.value) || 0, 0, 359) })}
                  className="w-24 bg-[#2C2C2C] border-[#333333] tabular-nums"
                />
                <span className="text-sm text-[#B0B0B0]">grados desde el norte</span>
              </div>
            )}
          </Seccion>

          <Seccion titulo={`Cámara: ${aj.camara}°`} ayuda="0° mira al frente; -90° mira hacia abajo (mapeo y fotos cenitales).">
            <Slider
              id="mision-camara"
              min={-90}
              max={0}
              step={5}
              value={[aj.camara]}
              onValueChange={([v]) => cambiar((m) => ({ ...m, ajustes: { ...m.ajustes, camara: v } }), false)}
              onValueCommit={([v]) => ajustar({ camara: v })}
            />
          </Seccion>

          <Seccion titulo="Detenerse en cada punto" ayuda="Apagado, el dron pasa por los puntos intermedios sin frenar.">
            <Switch id="mision-detener" checked={aj.detenerEnPuntos} onCheckedChange={(v) => ajustar({ detenerEnPuntos: v })} />
          </Seccion>
        </>
      )}

      <Seccion titulo="Al terminar la ruta">
        <Select value={aj.alTerminar} onValueChange={(v) => ajustar({ alTerminar: v as AccionFinal })}>
          <SelectTrigger id="mision-fin" className="bg-[#2C2C2C] border-[#333333]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ETIQUETAS_ACCION_FINAL) as AccionFinal[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ETIQUETAS_ACCION_FINAL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Seccion>

      <Seccion titulo="Si se pierde la señal del control">
        <Select value={aj.perdidaSenal} onValueChange={(v) => ajustar({ perdidaSenal: v as AjustesMision["perdidaSenal"] })}>
          <SelectTrigger id="mision-senal" className="bg-[#2C2C2C] border-[#333333]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rth">Detener la misión y volver al origen (RTH)</SelectItem>
            <SelectItem value="continuar">Continuar la misión</SelectItem>
          </SelectContent>
        </Select>
      </Seccion>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-[#E0E0E0]">Punto de despegue</Label>
        <p className="text-xs text-[#8A8A8A]">
          {mision.despegue
            ? `Marcado en ${mision.despegue[1].toFixed(6)}, ${mision.despegue[0].toFixed(6)}. Se usa para medir la altura sobre el suelo y la distancia al piloto.`
            : "Sin marcar: se asume que despegas en el primer punto."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={marcandoDespegue ? "default" : "outline"}
            size="sm"
            onClick={() => setMarcandoDespegue(!marcandoDespegue)}
            className={marcandoDespegue ? "bg-[#00b3f3] hover:bg-[#0099cc]" : "border-[#333333]"}
          >
            <Crosshair className="mr-2 h-4 w-4" />
            {marcandoDespegue ? "Haz clic en el mapa…" : "Marcar en el mapa"}
          </Button>
          {mision.despegue && (
            <Button variant="ghost" size="sm" onClick={() => cambiar((m) => ({ ...m, despegue: null }))}>
              <X className="mr-2 h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelAjustes;
