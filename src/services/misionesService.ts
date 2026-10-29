// Biblioteca de misiones del piloto (tabla flight_missions, cada piloto ve solo las suyas).

import { supabase } from "@/integrations/supabase/client";
import { AJUSTES_POR_DEFECTO, type AjustesMision, type Mision, type Waypoint } from "@/lib/misiones/tipos";
import { resumenRuta } from "@/lib/misiones/geodesia";
import { areaHa, normalizarMapeo, type AjustesMapeo } from "@/lib/misiones/mapeo";

export interface MisionGuardada {
  id: string;
  nombre: string;
  puntos: number;
  distancia: number;
  /** Hectáreas si es un mapeo de área; null si es una ruta por puntos. */
  areaHa: number | null;
  actualizada: string;
  conPlantilla: boolean;
}

export interface PlantillaGuardada {
  nombre: string;
  bytes: Uint8Array;
}

export class BibliotecaNoDisponible extends Error {}

interface FilaMision {
  id: string;
  name: string;
  waypoints: Waypoint[];
  settings: { ajustes?: Partial<AjustesMision>; despegue?: [number, number] | null; mapeo?: AjustesMapeo | null };
  template_name: string | null;
  template_kmz: string | null;
  updated_at: string;
}

// La tabla todavía no existe en la base de datos (migración sin aplicar)
const faltaTabla = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST205" || e.code === "42P01" || /flight_missions/.test(e.message ?? ""));

function aBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function deBase64(texto: string): Uint8Array {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

async function usuarioActual(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return data.user.id;
}

export async function listarMisiones(): Promise<MisionGuardada[]> {
  const uid = await usuarioActual();
  const { data, error } = await supabase
    .from("flight_missions")
    .select("id, name, waypoints, settings, template_name, updated_at")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false });
  if (faltaTabla(error)) throw new BibliotecaNoDisponible("La biblioteca de misiones aún no está activada en la base de datos.");
  if (error) throw error;
  return ((data ?? []) as FilaMision[]).map((f) => ({
    id: f.id,
    nombre: f.name,
    puntos: f.waypoints?.length ?? 0,
    distancia: resumenRuta((f.waypoints ?? []).map((w) => [w.lon, w.lat]), 1).total,
    areaHa: f.settings?.mapeo ? areaHa(f.settings.mapeo.poligono ?? []) : null,
    actualizada: f.updated_at,
    conPlantilla: !!f.template_name,
  }));
}

export async function abrirMision(id: string): Promise<{ mision: Mision; plantilla: PlantillaGuardada | null }> {
  const { data, error } = await supabase.from("flight_missions").select("*").eq("id", id).single();
  if (error) throw error;
  const f = data as FilaMision;
  return {
    mision: {
      nombre: f.name,
      waypoints: f.waypoints ?? [],
      ajustes: { ...AJUSTES_POR_DEFECTO, ...(f.settings?.ajustes ?? {}) },
      despegue: f.settings?.despegue ?? null,
      mapeo: f.settings?.mapeo ? normalizarMapeo(f.settings.mapeo) : null,
    },
    plantilla: f.template_kmz && f.template_name ? { nombre: f.template_name, bytes: deBase64(f.template_kmz) } : null,
  };
}

/** Crea la misión (id null) o la actualiza. Devuelve su id. */
export async function guardarMision(id: string | null, mision: Mision, plantilla: PlantillaGuardada | null): Promise<string> {
  const uid = await usuarioActual();
  const fila = {
    user_id: uid,
    name: mision.nombre.trim() || "Misión sin nombre",
    waypoints: mision.waypoints,
    settings: { ajustes: mision.ajustes, despegue: mision.despegue, mapeo: mision.mapeo ?? null },
    template_name: plantilla?.nombre ?? null,
    template_kmz: plantilla ? aBase64(plantilla.bytes) : null,
  };
  const consulta = id
    ? supabase.from("flight_missions").update(fila).eq("id", id).select("id").single()
    : supabase.from("flight_missions").insert(fila).select("id").single();
  const { data, error } = await consulta;
  if (faltaTabla(error)) throw new BibliotecaNoDisponible("La biblioteca de misiones aún no está activada en la base de datos.");
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function eliminarMision(id: string): Promise<void> {
  const { error } = await supabase.from("flight_missions").delete().eq("id", id);
  if (error) throw error;
}
