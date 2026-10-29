import { useCallback, useEffect, useState } from "react";
import { FilePlus2, FolderOpen, Loader2, Plane, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatoDistancia } from "@/lib/misiones/geodesia";
import type { Mision } from "@/lib/misiones/tipos";
import {
  abrirMision,
  BibliotecaNoDisponible,
  eliminarMision,
  guardarMision,
  listarMisiones,
  type MisionGuardada,
  type PlantillaGuardada,
} from "@/services/misionesService";

interface Props {
  mision: Mision;
  misionId: string | null;
  plantilla: PlantillaGuardada | null;
  onGuardada: (id: string) => void;
  onAbrir: (id: string, mision: Mision, plantilla: PlantillaGuardada | null) => void;
  onNueva: () => void;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const BibliotecaMisiones = ({ mision, misionId, plantilla, onGuardada, onAbrir, onNueva }: Props) => {
  const { toast } = useToast();
  const [lista, setLista] = useState<MisionGuardada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [porBorrar, setPorBorrar] = useState<MisionGuardada | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setLista(await listarMisiones());
      setNoDisponible(null);
    } catch (e) {
      if (e instanceof BibliotecaNoDisponible) setNoDisponible(e.message);
      else toast({ title: "No se pudieron cargar tus misiones", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setCargando(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (comoNueva: boolean) => {
    setGuardando(true);
    try {
      const id = await guardarMision(comoNueva ? null : misionId, mision, plantilla);
      onGuardada(id);
      toast({ title: "Misión guardada", description: mision.nombre });
      await cargar();
    } catch (e) {
      toast({ title: "No se pudo guardar", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  const abrir = async (m: MisionGuardada) => {
    try {
      const r = await abrirMision(m.id);
      onAbrir(m.id, r.mision, r.plantilla);
    } catch (e) {
      toast({ title: "No se pudo abrir la misión", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const borrar = async (m: MisionGuardada) => {
    try {
      await eliminarMision(m.id);
      if (m.id === misionId) onNueva();
      setLista((l) => l.filter((x) => x.id !== m.id));
      toast({ title: "Misión eliminada", description: m.nombre });
    } catch (e) {
      toast({ title: "No se pudo eliminar", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  if (noDisponible) {
    return <p className="rounded-lg border border-dashed border-[#333333] p-4 text-sm text-[#B0B0B0]">{noDisponible}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => guardar(false)}
          disabled={guardando || (!mision.waypoints.length && !mision.mapeo?.poligono.length)}
          className="bg-[#FF69B4] hover:bg-[#ff4fa8]"
        >
          {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {misionId ? "Guardar cambios" : "Guardar misión"}
        </Button>
        {misionId && (
          <Button variant="outline" className="border-[#333333]" disabled={guardando} onClick={() => guardar(true)}>
            Guardar como nueva
          </Button>
        )}
        <Button variant="ghost" onClick={onNueva}>
          <FilePlus2 className="mr-2 h-4 w-4" />
          Nueva
        </Button>
      </div>
      {plantilla && <p className="text-xs text-[#8A8A8A]">La plantilla de DJI Fly se guarda junto con la misión.</p>}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-[#B0B0B0]">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando tus misiones…
        </div>
      ) : lista.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#333333] p-4 text-sm text-[#B0B0B0]">
          Aún no tienes misiones guardadas. Las que guardes quedan en tu cuenta y solo tú las ves.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((m) => (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-lg border p-3 ${m.id === misionId ? "border-[#00b3f3] bg-[#00b3f3]/10" : "border-[#333333] bg-[#2C2C2C]"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#E0E0E0]">{m.nombre}</p>
                <p className="text-xs text-[#8A8A8A] tabular-nums">
                  {m.areaHa != null ? `Mapeo · ${m.areaHa.toFixed(2).replace(".", ",")} ha` : `${m.puntos} puntos · ${formatoDistancia(m.distancia)}`} · {fecha(m.actualizada)}
                </p>
              </div>
              {m.conPlantilla && <Plane className="h-4 w-4 flex-shrink-0 text-[#00b3f3]" aria-label="Con plantilla de DJI Fly" />}
              <Button variant="ghost" size="sm" onClick={() => abrir(m)} aria-label={`Abrir ${m.nombre}`}>
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setPorBorrar(m)} aria-label={`Eliminar ${m.nombre}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!porBorrar} onOpenChange={(abierto) => !abierto && setPorBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar «{porBorrar?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>La misión se borra de tu cuenta y no se puede recuperar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (porBorrar) borrar(porBorrar);
                setPorBorrar(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BibliotecaMisiones;
