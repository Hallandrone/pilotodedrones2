// Tipos del planificador de misiones por waypoints para drones DJI.

import type { AjustesMapeo } from "./mapeo";

export interface Waypoint {
  id: string;
  lon: number;
  lat: number;
  /** Metros sobre el punto de despegue: así mide la altura DJI Fly. */
  altura: number;
}

/** Valores de wpml:finishAction. */
export type AccionFinal = "goHome" | "noAction" | "autoLand" | "gotoFirstWaypoint";
export type PerdidaSenal = "rth" | "continuar";
export type ModoRumbo = "siguiente" | "fijo";

export interface AjustesMision {
  /** m/s */
  velocidad: number;
  rumbo: ModoRumbo;
  /** Grados desde el norte, solo con rumbo «fijo». */
  rumboFijo: number;
  /** Inclinación del gimbal: 0 = al frente, -90 = hacia abajo. */
  camara: number;
  detenerEnPuntos: boolean;
  alTerminar: AccionFinal;
  perdidaSenal: PerdidaSenal;
}

export interface Mision {
  nombre: string;
  waypoints: Waypoint[];
  ajustes: AjustesMision;
  /** [lon, lat] del despegue; null = se asume el primer punto. */
  despegue: [number, number] | null;
  /** Mapeo de área: si existe, la ruta se genera como grilla sobre el polígono. */
  mapeo?: AjustesMapeo | null;
}

export const ALTURA_POR_DEFECTO = 50;

export const AJUSTES_POR_DEFECTO: AjustesMision = {
  velocidad: 5,
  rumbo: "siguiente",
  rumboFijo: 0,
  camara: 0,
  detenerEnPuntos: true,
  alTerminar: "goHome",
  perdidaSenal: "rth",
};

export const ETIQUETAS_ACCION_FINAL: Record<AccionFinal, string> = {
  goHome: "Regresar al punto de origen (RTH)",
  noAction: "Quedarse en el último punto",
  autoLand: "Aterrizar en el último punto",
  gotoFirstWaypoint: "Volver al primer punto",
};

export function misionVacia(nombre = "Misión nueva"): Mision {
  return { nombre, waypoints: [], ajustes: { ...AJUSTES_POR_DEFECTO }, despegue: null, mapeo: null };
}

export function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `wp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
