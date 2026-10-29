import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { distanciaYRumbo, formatoDistancia } from "@/lib/misiones/geodesia";
import { alturaAgl, type Terreno } from "@/lib/misiones/normativa";
import { nuevoId, type Mision } from "@/lib/misiones/tipos";

interface Props {
  mision: Mision;
  terreno: Terreno | null;
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
  cambiar: (cambio: (m: Mision) => Mision, registrar?: boolean) => void;
  alturaNueva: number;
}

const ListaPuntos = ({ mision, terreno, seleccionado, onSeleccionar, cambiar, alturaNueva }: Props) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const wps = mision.waypoints;

  const mover = (i: number, paso: number) =>
    cambiar((m) => {
      const lista = [...m.waypoints];
      [lista[i], lista[i + paso]] = [lista[i + paso], lista[i]];
      return { ...m, waypoints: lista };
    });

  const agregarPorCoordenadas = () => {
    const la = Number(lat.replace(",", "."));
    const lo = Number(lon.replace(",", "."));
    if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return;
    cambiar((m) => ({ ...m, waypoints: [...m.waypoints, { id: nuevoId(), lat: la, lon: lo, altura: alturaNueva }] }));
    setLat("");
    setLon("");
  };

  return (
    <div className="space-y-3">
      {wps.length === 0 && (
        <p className="rounded-lg border border-dashed border-[#333333] p-4 text-sm text-[#B0B0B0]">
          Haz clic en el mapa para agregar puntos, en el orden en que los volará el dron. También puedes importar una ruta en la pestaña
          Archivos.
        </p>
      )}

      <ol className="space-y-2">
        {wps.map((w, i) => {
          const tramo = i > 0 ? distanciaYRumbo([wps[i - 1].lon, wps[i - 1].lat], [w.lon, w.lat]).d : null;
          const agl = alturaAgl(mision, terreno, i);
          const elegido = w.id === seleccionado;
          return (
            <li
              key={w.id}
              onClick={() => onSeleccionar(w.id)}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${elegido ? "border-[#00b3f3] bg-[#00b3f3]/10" : "border-[#333333] bg-[#2C2C2C] hover:border-[#555555]"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${elegido ? "bg-[#00b3f3]" : "bg-[#FF69B4]"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-xs text-[#B0B0B0] tabular-nums">
                  <div className="truncate">
                    {w.lat.toFixed(6)}, {w.lon.toFixed(6)}
                  </div>
                  <div>
                    {tramo != null ? `${formatoDistancia(tramo)} desde el punto ${i}` : "Inicio de la ruta"}
                    {agl != null &&
                      (agl > 0 ? (
                        ` · ${Math.round(agl)} m AGL`
                      ) : (
                        <span className="font-semibold text-red-400"> · {Math.round(-agl)} m bajo el terreno</span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    id={`punto-altura-${w.id}`}
                    type="number"
                    min={1}
                    max={500}
                    value={w.altura}
                    aria-label={`Altura del punto ${i + 1} sobre el despegue`}
                    title="Altura sobre el despegue, como la usa DJI Fly"
                    onChange={(e) => {
                      const altura = Math.min(500, Math.max(0, Number(e.target.value) || 0));
                      cambiar((m) => ({ ...m, waypoints: m.waypoints.map((x) => (x.id === w.id ? { ...x, altura } : x)) }));
                    }}
                    className="h-8 w-16 bg-[#1A1A1A] border-[#333333] px-2 text-right tabular-nums"
                  />
                  <span className="text-xs text-[#8A8A8A]">m</span>
                </div>
              </div>
              {elegido && (
                <div className="mt-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={i === wps.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      cambiar((m) => ({ ...m, waypoints: m.waypoints.filter((x) => x.id !== w.id) }));
                      onSeleccionar(null);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="space-y-2 rounded-lg border border-[#333333] p-3">
        <p className="text-xs font-semibold text-[#E0E0E0]">Agregar un punto por coordenadas</p>
        <div className="flex gap-2">
          <Input id="punto-lat" placeholder="Latitud (-33,45)" value={lat} onChange={(e) => setLat(e.target.value)} className="bg-[#2C2C2C] border-[#333333]" />
          <Input id="punto-lon" placeholder="Longitud (-70,65)" value={lon} onChange={(e) => setLon(e.target.value)} className="bg-[#2C2C2C] border-[#333333]" />
          <Button size="sm" onClick={agregarPorCoordenadas} aria-label="Agregar punto" className="bg-[#FF69B4] hover:bg-[#ff4fa8]">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {wps.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar todos los puntos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Borrar los {wps.length} puntos?</AlertDialogTitle>
              <AlertDialogDescription>Puedes recuperarlos con «Deshacer».</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  cambiar((m) => ({ ...m, waypoints: [] }));
                  onSeleccionar(null);
                }}
              >
                Borrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ListaPuntos;
