import { useRef, useState } from "react";
import { AlertTriangle, Download, FileUp, Plane, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ErrorMision, generarKmzDjiFly, leerPlantilla, type PlantillaDji } from "@/lib/misiones/djiFly";
import { destino, type LonLat } from "@/lib/misiones/geodesia";
import { exportarKml, importarArchivo, type OpcionRuta } from "@/lib/misiones/kml";
import type { Aviso } from "@/lib/misiones/normativa";
import { nuevoId, type Mision } from "@/lib/misiones/tipos";

interface Props {
  mision: Mision;
  /** La ruta que se vuela: en un mapeo, la grilla sobre el área. */
  misionExportar: Mision;
  /** Motivo por el que todavía no se puede exportar a DJI Fly; null = se puede. */
  bloqueoDji: string | null;
  /** Pasos para volar un mapeo con foto temporizada; null si no es un mapeo. */
  instruccionesMapeo: string[] | null;
  plantilla: PlantillaDji | null;
  setPlantilla: (plantilla: PlantillaDji | null) => void;
  errores: Aviso[];
  onReemplazar: (mision: Mision) => void;
  onAgregarPuntos: (coords: LonLat[]) => void;
  onUsarComoArea: (coords: LonLat[]) => void;
  alturaNueva: number;
}

/** Si la ruta importada es un solo punto, el segundo va 20 m al norte (DJI Fly pide 2 puntos). */
const METROS_SEGUNDO_PUNTO = 20;

function descargar(datos: Uint8Array | string, nombre: string, tipo: string) {
  const blob = new Blob([typeof datos === "string" ? datos : new Uint8Array(datos)], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const nombreArchivo = (nombre: string) => nombre.trim().replace(/[\\/:*?"<>|]+/g, "-") || "mision";

const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="space-y-3 rounded-xl border border-[#333333] bg-[#212121] p-4">
    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#B0B0B0]">{titulo}</h3>
    {children}
  </section>
);

const PanelArchivos = ({
  mision,
  misionExportar,
  bloqueoDji,
  instruccionesMapeo,
  plantilla,
  setPlantilla,
  errores,
  onReemplazar,
  onAgregarPuntos,
  onUsarComoArea,
  alturaNueva,
}: Props) => {
  const { toast } = useToast();
  const entradaRuta = useRef<HTMLInputElement>(null);
  const entradaPlantilla = useRef<HTMLInputElement>(null);
  const [ruta, setRuta] = useState<{ nombre: string; opciones: OpcionRuta[] } | null>(null);
  const [opcion, setOpcion] = useState("");
  const [generando, setGenerando] = useState(false);

  const falla = (e: unknown, titulo: string) =>
    toast({ title: titulo, description: e instanceof ErrorMision ? e.message : "El archivo no se pudo leer.", variant: "destructive" });

  const leerArchivo = async (archivo: File) => {
    try {
      const r = await importarArchivo(new Uint8Array(await archivo.arrayBuffer()), archivo.name);
      if (r.tipo === "dji") {
        setPlantilla(r.plantilla);
        onReemplazar(r.mision);
        setRuta(null);
        toast({
          title: "Misión de DJI importada",
          description: [`${r.mision.waypoints.length} puntos. También quedó como plantilla para exportar a DJI Fly.`, ...r.avisos].join(" "),
        });
      } else {
        setRuta(r);
        const preferida = r.opciones.find((o) => o.coords.length > 1 && o.id !== "todos") ?? r.opciones[0];
        setOpcion(preferida.id);
      }
    } catch (e) {
      falla(e, "No se pudo importar");
    }
  };

  const coordsElegidas = (): LonLat[] => {
    const c = ruta?.opciones.find((o) => o.id === opcion)?.coords ?? [];
    return c.length === 1 ? [c[0], destino(c[0], METROS_SEGUNDO_PUNTO, 0)] : c;
  };

  const usarRuta = (agregar: boolean) => {
    const coords = coordsElegidas();
    if (!coords.length || !ruta) return;
    if (agregar) onAgregarPuntos(coords);
    else {
      onReemplazar({
        ...mision,
        nombre: ruta.nombre,
        despegue: null,
        mapeo: null,
        waypoints: coords.map(([lon, lat]) => ({ id: nuevoId(), lon, lat, altura: alturaNueva })),
      });
    }
    const soloUno = ruta.opciones.find((o) => o.id === opcion)?.coords.length === 1;
    toast({
      title: agregar ? "Puntos agregados" : "Ruta importada",
      description: soloUno ? `Era un solo punto: agregué otro ${METROS_SEGUNDO_PUNTO} m al norte, porque DJI Fly pide al menos 2.` : `${coords.length} puntos a ${alturaNueva} m.`,
    });
    setRuta(null);
  };

  const subirPlantilla = async (archivo: File) => {
    try {
      const p = await leerPlantilla(new Uint8Array(await archivo.arrayBuffer()), archivo.name);
      if (p.puntos < 2) throw new ErrorMision("La plantilla tiene un solo punto. En DJI Fly crea la misión con 2 puntos.");
      setPlantilla(p);
      toast({ title: "Plantilla cargada", description: p.uuid ? `Misión ${p.uuid.slice(0, 8)}…` : archivo.name });
    } catch (e) {
      falla(e, "Esa plantilla no sirve");
    }
  };

  const exportarDji = async () => {
    if (!plantilla || bloqueoDji) return;
    setGenerando(true);
    try {
      const r = await generarKmzDjiFly(plantilla, misionExportar);
      descargar(r.bytes, r.nombre, "application/vnd.google-earth.kmz");
      toast({ title: "Misión descargada", description: `Reemplaza ${r.nombre} en la misma carpeta del control.` });
    } catch (e) {
      falla(e, "No se pudo generar la misión");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Bloque titulo="Importar">
        <p className="text-sm text-[#B0B0B0]">
          Archivos KML o KMZ de Google Earth (puntos, líneas y polígonos) o una misión de DJI Fly (.kmz) para editarla.
        </p>
        <input
          ref={entradaRuta}
          id="importar-archivo"
          type="file"
          accept=".kml,.kmz"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) leerArchivo(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" className="w-full border-[#333333]" onClick={() => entradaRuta.current?.click()}>
          <FileUp className="mr-2 h-4 w-4" />
          Elegir archivo
        </Button>

        {ruta && (
          <div className="space-y-3 rounded-lg border border-[#00b3f3]/40 bg-[#00b3f3]/5 p-3">
            <p className="text-sm text-[#E0E0E0]">
              <span className="font-semibold">{ruta.nombre}</span>: elige qué usar como ruta.
            </p>
            <Select value={opcion} onValueChange={setOpcion}>
              <SelectTrigger id="importar-opcion" className="bg-[#2C2C2C] border-[#333333]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ruta.opciones.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => usarRuta(false)} className="bg-[#FF69B4] hover:bg-[#ff4fa8]">
                Reemplazar la ruta
              </Button>
              <Button size="sm" variant="outline" className="border-[#333333]" disabled={!mision.waypoints.length || !!mision.mapeo} onClick={() => usarRuta(true)}>
                Agregar al final
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#00b3f3]/60 text-[#00b3f3]"
                disabled={(ruta.opciones.find((o) => o.id === opcion)?.coords.length ?? 0) < 3}
                onClick={() => {
                  onUsarComoArea(ruta.opciones.find((o) => o.id === opcion)!.coords);
                  toast({ title: "Área de mapeo cargada", description: ruta.nombre });
                  setRuta(null);
                }}
              >
                Usar como área de mapeo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRuta(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Exportar a DJI Fly">
        <p className="text-sm text-[#B0B0B0]">
          DJI Fly no importa misiones: se reemplaza el archivo de una misión creada en el control. Por eso la misión se arma sobre esa misma
          misión, y queda con el formato y el nombre que espera tu versión de DJI Fly.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-[#B0B0B0]">
          <li>En DJI Fly crea una misión de 2 puntos, guárdala y cierra la app.</li>
          <li>Reinicia el control y conéctalo al computador por USB. Sin reiniciar, el computador no ve la misión nueva.</li>
          <li>
            Copia el archivo de la carpeta <span className="font-mono text-xs text-[#E0E0E0]">Android/data/dji.go.v5/files/waypoint/(código)/</span>,
            guarda una copia y súbelo aquí.
          </li>
          <li>Descarga la misión y reemplaza el archivo en esa misma carpeta, con el mismo nombre.</li>
          <li>Abre DJI Fly y revisa la ruta en el mapa antes de volar.</li>
        </ol>

        <input
          ref={entradaPlantilla}
          id="plantilla-dji"
          type="file"
          accept=".kmz"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subirPlantilla(f);
            e.target.value = "";
          }}
        />
        {plantilla ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#333333] bg-[#2C2C2C] p-3 text-sm">
            <Plane className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00b3f3]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-[#E0E0E0]">{plantilla.uuid ? `${plantilla.uuid}.kmz` : plantilla.nombreArchivo}</p>
              <p className="text-xs text-[#8A8A8A]">
                Código de modelo DJI {plantilla.modelo ?? "desconocido"} · {plantilla.puntos} puntos
              </p>
              {!plantilla.uuid && (
                <p className="mt-1 text-xs text-amber-400">
                  El nombre no trae el código de la misión: renombra la descarga igual que el archivo del control.
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => entradaPlantilla.current?.click()}>
              Cambiar
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full border-[#333333]" onClick={() => entradaPlantilla.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Subir la misión de plantilla (.kmz del control)
          </Button>
        )}

        {bloqueoDji && <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-300">{bloqueoDji}</p>}
        {instruccionesMapeo && (
          <div className="space-y-2 rounded-lg border border-[#00b3f3]/40 bg-[#00b3f3]/5 p-3">
            <p className="text-sm font-semibold text-[#E0E0E0]">Cómo volar este mapeo en DJI Fly</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[#B0B0B0]">
              {instruccionesMapeo.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          </div>
        )}
        {errores.length > 0 && (
          <ul className="space-y-1 text-sm text-red-400">
            {errores.map((e) => (
              <li key={e.texto} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {e.texto}
              </li>
            ))}
          </ul>
        )}
        <Button
          className="w-full bg-[#00b3f3] font-semibold hover:bg-[#0099cc]"
          disabled={!plantilla || !!bloqueoDji || errores.length > 0 || generando}
          onClick={exportarDji}
        >
          <Download className="mr-2 h-4 w-4" />
          {generando ? "Generando…" : "Descargar para DJI Fly"}
        </Button>
        <p className="text-xs text-[#8A8A8A]">
          Como DJI Fly no tiene una importación oficial, una actualización de la app podría dejar de aceptar este método.
        </p>
      </Bloque>

      <Bloque titulo="Otros formatos">
        <Button
          variant="outline"
          className="w-full border-[#333333]"
          disabled={!misionExportar.waypoints.length}
          onClick={() => descargar(exportarKml(misionExportar), `${nombreArchivo(mision.nombre)}.kml`, "application/vnd.google-earth.kml+xml")}
        >
          <Download className="mr-2 h-4 w-4" />
          KML para Google Earth
        </Button>
      </Bloque>
    </div>
  );
};

export default PanelArchivos;
