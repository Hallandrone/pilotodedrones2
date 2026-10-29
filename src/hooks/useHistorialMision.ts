import { useCallback, useState } from "react";
import type { Mision } from "@/lib/misiones/tipos";

const MAXIMO = 50;

/** Estado de la misión con «deshacer». registrar = false para cambios que no deben quedar en el historial. */
export function useHistorialMision(inicial: () => Mision) {
  const [estado, setEstado] = useState(() => ({ pasado: [] as Mision[], actual: inicial() }));

  const cambiar = useCallback((cambio: (m: Mision) => Mision, registrar = true) => {
    setEstado((e) => {
      const siguiente = cambio(e.actual);
      if (siguiente === e.actual) return e;
      return { pasado: registrar ? [...e.pasado, e.actual].slice(-MAXIMO) : e.pasado, actual: siguiente };
    });
  }, []);

  const deshacer = useCallback(() => {
    setEstado((e) => (e.pasado.length ? { pasado: e.pasado.slice(0, -1), actual: e.pasado[e.pasado.length - 1] } : e));
  }, []);

  /** Reemplaza la misión (abrir o importar) sin perder lo anterior: se puede deshacer. */
  const reemplazar = useCallback((m: Mision) => {
    setEstado((e) => ({ pasado: [...e.pasado, e.actual].slice(-MAXIMO), actual: m }));
  }, []);

  return { mision: estado.actual, cambiar, deshacer, puedeDeshacer: estado.pasado.length > 0, reemplazar };
}
