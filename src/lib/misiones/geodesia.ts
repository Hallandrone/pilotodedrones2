// Cálculos sobre la esfera para distancias, rumbos y puntos de una misión.

const R_TIERRA = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type LonLat = [number, number];

/** Distancia en metros y rumbo inicial (0-360°, desde el norte) de a hacia b. */
export function distanciaYRumbo(a: LonLat, b: LonLat): { d: number; rumbo: number } {
  const [lon1, lat1] = [rad(a[0]), rad(a[1])];
  const [lon2, lat2] = [rad(b[0]), rad(b[1])];
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const d = 2 * R_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
  const y = Math.sin(dlon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon);
  return { d, rumbo: (deg(Math.atan2(y, x)) + 360) % 360 };
}

/** Punto a «metros» de p en la dirección «rumbo». */
export function destino(p: LonLat, metros: number, rumbo: number): LonLat {
  const lon1 = rad(p[0]);
  const lat1 = rad(p[1]);
  const dr = metros / R_TIERRA;
  const th = rad(rumbo);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(th));
  const lon2 = lon1 + Math.atan2(Math.sin(th) * Math.sin(dr) * Math.cos(lat1), Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2));
  return [deg(lon2), deg(lat2)];
}

/** DJI guarda los rumbos entre -180 y 180, con un decimal. */
export function rumboDji(rumbo: number): number {
  const v = ((((rumbo + 180) % 360) + 360) % 360) - 180;
  return Math.round(v * 10) / 10;
}

export interface ResumenRuta {
  tramos: { d: number; rumbo: number }[];
  total: number;
  /** Segundos a la velocidad dada, sin contar despegue ni regreso. */
  segundos: number | null;
}

export function resumenRuta(puntos: LonLat[], velocidad: number): ResumenRuta {
  const tramos: { d: number; rumbo: number }[] = [];
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const t = distanciaYRumbo(puntos[i], puntos[i + 1]);
    tramos.push(t);
    total += t.d;
  }
  return { tramos, total, segundos: velocidad > 0 ? total / velocidad : null };
}

export function formatoDistancia(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2).replace(".", ",")} km` : `${Math.round(m)} m`;
}

export function formatoDuracion(segundos: number | null): string {
  if (segundos == null) return "—";
  const s = Math.round(segundos);
  const min = Math.floor(s / 60);
  return min > 0 ? `${min} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}
