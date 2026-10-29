// Revisión de la misión antes de exportarla: errores que impiden volarla y avisos de la DAN 151.
// DJI Fly mide la altura desde el punto de despegue; la DAN 151 limita la altura sobre la superficie
// (AGL). Con el relieve del mapa se calcula el AGL en cada punto y a lo largo de cada tramo.

import { distanciaYRumbo, formatoDistancia } from "./geodesia";
import type { Mision } from "./tipos";

export const DAN151 = {
  alturaMaximaAgl: 120,
  distanciaVlos: 500,
  cita: "DAN 151 ED 3 (27-may-2024), 151.103(g)(11): hasta 120 m sobre la superficie (AGL) y hasta 500 m del piloto en línea visual (VLOS), para RPA de hasta 9 kg.",
} as const;

/** Bajo esta altura AGL se avisa riesgo de choque con árboles, postes o edificios. */
export const ALTURA_MINIMA_SEGURA = 10;

export interface Aviso {
  nivel: "error" | "aviso";
  texto: string;
}

export interface MuestraTramo {
  /** Posición a lo largo del tramo, de 0 a 1. */
  f: number;
  /** Elevación del suelo (m s.n.m.); null donde no se conoce. */
  suelo: number | null;
}

export interface Terreno {
  /** Elevación del suelo (m s.n.m.) bajo cada punto; null donde no se conoce. */
  puntos: (number | null)[];
  despegue: number | null;
  /** Suelo a lo largo de cada tramo (del punto i al i+1), sin los extremos. */
  tramos?: MuestraTramo[][];
}

/** Altura AGL del punto i: su altura sobre el despegue menos lo que sube el terreno desde el despegue. */
export function alturaAgl(mision: Mision, terreno: Terreno | null, i: number): number | null {
  const suelo = terreno?.puntos[i];
  if (suelo == null || terreno?.despegue == null) return null;
  return mision.waypoints[i].altura - (suelo - terreno.despegue);
}

/** AGL mínimo y máximo a lo largo del tramo i, con la altura variando en línea recta entre los puntos. */
export function aglTramo(mision: Mision, terreno: Terreno | null, i: number): { min: number; max: number } | null {
  const muestras = terreno?.tramos?.[i];
  if (!muestras?.length || terreno?.despegue == null) return null;
  const a = mision.waypoints[i].altura;
  const b = mision.waypoints[i + 1].altura;
  let min = Infinity;
  let max = -Infinity;
  for (const m of muestras) {
    if (m.suelo == null) continue;
    const agl = a + (b - a) * m.f - (m.suelo - terreno.despegue);
    min = Math.min(min, agl);
    max = Math.max(max, agl);
  }
  return isFinite(min) ? { min, max } : null;
}

// Las listas largas (una grilla de mapeo puede tener cientos de puntos) se acortan
const enumerar = (n: number[]) =>
  n.length === 1 ? String(n[0]) : n.length > 8 ? `${n.slice(0, 5).join(", ")} y ${n.length - 5} más` : `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}`;
const losPuntos = (n: number[]) => `${n.length === 1 ? "el punto" : "los puntos"} ${enumerar(n)}`;
const losTramos = (tramos: number[]) => {
  const nombres = tramos.map((i) => `${i + 1}–${i + 2}`);
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return `${nombres.length === 1 ? "En el tramo" : "En los tramos"} ${lista}`;
};

export function revisarMision(mision: Mision, terreno: Terreno | null = null): Aviso[] {
  const avisos: Aviso[] = [];
  const wps = mision.waypoints;
  const conRelieve = terreno?.despegue != null && terreno.puntos.some((s) => s != null);
  if (wps.length < 2) avisos.push({ nivel: "error", texto: "La misión necesita al menos 2 puntos." });

  const sinAltura = wps.map((w, i) => (w.altura > 0 ? 0 : i + 1)).filter(Boolean);
  if (sinAltura.length) avisos.push({ nivel: "error", texto: `Altura de 0 m o menos en ${losPuntos(sinAltura)}.` });

  // Puntos: AGL con relieve; sin relieve solo se puede comparar con el despegue
  const altos: number[] = [];
  const bajos: number[] = [];
  const enterrados: number[] = [];
  wps.forEach((w, i) => {
    if (!(w.altura > 0)) return;
    const altura = alturaAgl(mision, terreno, i) ?? w.altura;
    if (altura > DAN151.alturaMaximaAgl) altos.push(i + 1);
    else if (altura <= 0) enterrados.push(i + 1);
    else if (altura < ALTURA_MINIMA_SEGURA) bajos.push(i + 1);
  });

  // Tramos: un cerro o una quebrada entre dos puntos que los puntos no muestran
  const tramosEnterrados: number[] = [];
  const tramosAltos: number[] = [];
  let maximoTramos = 0;
  for (let i = 0; i < wps.length - 1; i++) {
    const r = aglTramo(mision, terreno, i);
    if (!r) continue;
    const extremos = [i + 1, i + 2];
    if (r.min <= 0 && !extremos.some((n) => enterrados.includes(n))) tramosEnterrados.push(i);
    if (r.max > DAN151.alturaMaximaAgl && !extremos.some((n) => altos.includes(n))) {
      tramosAltos.push(i);
      maximoTramos = Math.max(maximoTramos, r.max);
    }
  }

  if (enterrados.length) {
    avisos.push({ nivel: "aviso", texto: `${enterrados.length === 1 ? "El punto" : "Los puntos"} ${enumerar(enterrados)} ${enterrados.length === 1 ? "queda" : "quedan"} bajo el nivel del terreno: el dron chocaría. Sube la altura.` });
  }
  if (tramosEnterrados.length) {
    avisos.push({ nivel: "aviso", texto: `${losTramos(tramosEnterrados)} la ruta pasa bajo el terreno (hay un cerro en el camino): el dron chocaría. Sube la altura o agrega un punto intermedio.` });
  }
  if (altos.length) {
    avisos.push({
      nivel: "aviso",
      texto: conRelieve
        ? `Más de ${DAN151.alturaMaximaAgl} m AGL en ${losPuntos(altos)}. La DAN 151 permite hasta ${DAN151.alturaMaximaAgl} m sobre la superficie.`
        : `Más de ${DAN151.alturaMaximaAgl} m sobre el despegue en ${losPuntos(altos)}. Sin datos de relieve no se puede calcular la altura AGL, que es la que limita la DAN 151.`,
    });
  }
  if (tramosAltos.length) {
    avisos.push({ nivel: "aviso", texto: `${losTramos(tramosAltos)} la ruta supera los ${DAN151.alturaMaximaAgl} m AGL al cruzar terreno más bajo (hasta ${Math.round(maximoTramos)} m AGL).` });
  }
  if (bajos.length) {
    avisos.push({ nivel: "aviso", texto: `Menos de ${ALTURA_MINIMA_SEGURA} m ${conRelieve ? "AGL" : "sobre el despegue"} en ${losPuntos(bajos)}. Revisa árboles, postes y edificios.` });
  }

  const origen = mision.despegue ?? (wps[0] ? ([wps[0].lon, wps[0].lat] as [number, number]) : null);
  if (origen && wps.length) {
    const lejos = Math.max(...wps.map((w) => distanciaYRumbo(origen, [w.lon, w.lat]).d));
    if (lejos > DAN151.distanciaVlos) {
      avisos.push({
        nivel: "aviso",
        texto: `La ruta se aleja ${formatoDistancia(lejos)} del ${mision.despegue ? "despegue" : "primer punto"}. La DAN 151 exige línea visual hasta ${DAN151.distanciaVlos} m del piloto.`,
      });
    }
  }
  return avisos;
}
