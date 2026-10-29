// Mapeo fotogramétrico: pasadas paralelas sobre un polígono con fotos cenitales a intervalos fijos.
//
// La cámara mira hacia abajo (-90°) con el lado largo de la imagen cruzado a la pasada:
// el ancho de la imagen da la huella entre pasadas y el alto, la huella a lo largo de la pasada.

import { distanciaYRumbo, type LonLat } from "./geodesia";
import { nuevoId, type Waypoint } from "./tipos";

/**
 * Cámara descrita como la publica DJI: focal equivalente a 35 mm y tamaño de la foto en píxeles.
 * Con eso basta para el GSD: el sensor «equivalente» tiene la diagonal de 35 mm (43,27 mm) y la
 * misma proporción que la foto.
 */
export interface Camara {
  nombre: string;
  focalEq: number;
  anchoPx: number;
  altoPx: number;
}

export interface AjustesMapeo {
  poligono: LonLat[];
  camara: Camara;
  /** Metros sobre el despegue (la referencia de DJI Fly). */
  altura: number;
  /** Porcentajes de traslape entre fotos de una pasada y entre pasadas. */
  traslapeFrontal: number;
  traslapeLateral: number;
  /** Rumbo de las pasadas en grados desde el norte; null = paralelas al lado más largo. */
  direccion: number | null;
  /** Metros que cada pasada se extiende fuera del polígono, para cubrir bien los bordes. */
  margen: number;
  /** Segundos mínimos entre dos fotos que admite la cámara: limitan la velocidad. */
  intervaloMinimo: number;
  /** «doble»: una segunda grilla cruzada a 90°, para modelos 3D. */
  patron: "simple" | "doble";
  /** Inclinación de la cámara: -90 = cenital; entre -75 y -45, fotos oblicuas. */
  inclinacion: number;
  /** Mantener constante la altura sobre el suelo (AGL) usando el relieve. */
  seguirTerreno: boolean;
  /** Metros de diferencia con la altura AGL pedida que se toleran antes de agregar otro punto. */
  tolerancia: number;
  /** Cómo se disparan las fotos en DJI Fly. */
  disparo: "temporizada" | "puntos";
}

export const CAMARA_PERSONALIZADA: Camara = { nombre: "Personalizada", focalEq: 24, anchoPx: 4000, altoPx: 3000 };

export const MAPEO_POR_DEFECTO: Omit<AjustesMapeo, "poligono"> = {
  camara: CAMARA_PERSONALIZADA,
  altura: 80,
  traslapeFrontal: 80,
  traslapeLateral: 70,
  direccion: null,
  margen: 10,
  intervaloMinimo: 2,
  patron: "simple",
  inclinacion: -90,
  seguirTerreno: false,
  tolerancia: 3,
  disparo: "temporizada",
};

/** Completa un mapeo guardado antes de que existieran algunos ajustes. */
export function normalizarMapeo(m: Partial<AjustesMapeo> & Pick<AjustesMapeo, "poligono">): AjustesMapeo {
  return { ...MAPEO_POR_DEFECTO, ...m };
}

const DIAGONAL_35MM = Math.hypot(36, 24);

/** Sensor equivalente a 35 mm (mm) con la proporción de la foto. */
function sensorEquivalente(c: Camara): { ancho: number; alto: number } {
  const proporcion = c.anchoPx / c.altoPx;
  const alto = DIAGONAL_35MM / Math.hypot(proporcion, 1);
  return { ancho: alto * proporcion, alto };
}

/** Centímetros de terreno por píxel a la altura dada. */
export function gsdCm(c: Camara, altura: number): number {
  return (sensorEquivalente(c).ancho * altura * 100) / (c.focalEq * c.anchoPx);
}

export function alturaParaGsd(c: Camara, gsd: number): number {
  return (gsd * c.focalEq * c.anchoPx) / (sensorEquivalente(c).ancho * 100);
}

/** Metros de terreno que cubre una foto: ancho (cruzado a la pasada) y alto (a lo largo). */
export function huella(c: Camara, altura: number): { ancho: number; alto: number } {
  const s = sensorEquivalente(c);
  return { ancho: (s.ancho * altura) / c.focalEq, alto: (s.alto * altura) / c.focalEq };
}

export function fovDiagonal(c: Camara): number {
  return (2 * Math.atan(DIAGONAL_35MM / (2 * c.focalEq)) * 180) / Math.PI;
}

/**
 * Obturación más lenta que deja el arrastre bajo un píxel a la velocidad dada:
 * devuelve N para «1/N s».
 */
export function obturacionMinima(gsd: number, velocidad: number): number {
  return Math.ceil(velocidad / (gsd / 100));
}

// Plano local en metros alrededor de un origen: suficiente para áreas de algunos kilómetros
const R_TIERRA = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function plano(origen: LonLat) {
  const cosLat = Math.cos(rad(origen[1]));
  return {
    aXY: ([lon, lat]: LonLat): [number, number] => [rad(lon - origen[0]) * R_TIERRA * cosLat, rad(lat - origen[1]) * R_TIERRA],
    aLonLat: ([x, y]: [number, number]): LonLat => [origen[0] + deg(x / (R_TIERRA * cosLat)), origen[1] + deg(y / R_TIERRA)],
  };
}

const centroide = (p: LonLat[]): LonLat => [p.reduce((s, c) => s + c[0], 0) / p.length, p.reduce((s, c) => s + c[1], 0) / p.length];

export function areaHa(poligono: LonLat[]): number {
  if (poligono.length < 3) return 0;
  const { aXY } = plano(centroide(poligono));
  const xy = poligono.map(aXY);
  let doble = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    doble += x1 * y2 - x2 * y1;
  }
  return Math.abs(doble) / 2 / 10000;
}

/** Rumbo (0-180°) del lado más largo: pasadas paralelas a él dan menos giros. */
export function direccionDelLadoMasLargo(poligono: LonLat[]): number {
  const { aXY } = plano(centroide(poligono));
  const xy = poligono.map(aXY);
  let mejor = 0;
  let largo = -1;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    const l = Math.hypot(x2 - x1, y2 - y1);
    if (l > largo) {
      largo = l;
      mejor = (deg(Math.atan2(x2 - x1, y2 - y1)) + 360) % 180;
    }
  }
  return Math.round(mejor * 10) / 10;
}

export interface GrillaMapeo {
  /** Tramos de foto en orden de vuelo: [inicio, fin]. */
  pasadas: [LonLat, LonLat][];
  /** Posiciones de disparo en orden de vuelo. */
  fotos: LonLat[];
  /** Rumbo de la primera grilla (la segunda, en la doble, va a 90°). */
  direccion: number;
  /** Pasadas de cada grilla: una en el patrón simple, dos en el doble. */
  pasadasPorGrilla: number[];
  separacionPasadas: number;
  /** Separación real entre fotos (igual o menor a la pedida: el traslape nunca baja). */
  separacionFotos: number;
  gsd: number;
  huella: { ancho: number; alto: number };
  areaHa: number;
  /** Metros de vuelo de la primera a la última foto, con los cambios de pasada. */
  distancia: number;
}

interface Tramo {
  inicio: LonLat;
  fin: LonLat;
  fotos: LonLat[];
  largo: number;
}

/** Pasadas en zigzag con un rumbo dado, cada una con sus fotos repartidas a igual distancia. */
function pasadasEnDireccion(a: AjustesMapeo, direccion: number, separacionPasadas: number, separacionPedida: number, aXY: (c: LonLat) => [number, number], aLonLat: (c: [number, number]) => LonLat): Tramo[] {
  // Ejes: w a lo largo de las pasadas, u cruzado a ellas
  const d: [number, number] = [Math.sin(rad(direccion)), Math.cos(rad(direccion))];
  const p: [number, number] = [Math.cos(rad(direccion)), -Math.sin(rad(direccion))];
  const vertices = a.poligono.map(aXY).map(([x, y]) => ({ u: x * p[0] + y * p[1], w: x * d[0] + y * d[1] }));
  const desdeUW = (u: number, w: number) => aLonLat([u * p[0] + w * d[0], u * p[1] + w * d[1]]);

  const umin = Math.min(...vertices.map((v) => v.u));
  const umax = Math.max(...vertices.map((v) => v.u));
  const lineas = Math.max(1, Math.ceil((umax - umin) / separacionPasadas));
  // Las pasadas quedan centradas en el ancho del polígono
  const inicio = (umin + umax) / 2 - ((lineas - 1) * separacionPasadas) / 2;

  const lineasUW: { u: number; w0: number; w1: number }[][] = [];
  for (let k = 0; k < lineas; k++) {
    const u = inicio + k * separacionPasadas;
    const cortes: number[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      // Regla semiabierta: un vértice sobre la línea se cuenta una sola vez
      if ((v1.u <= u && u < v2.u) || (v2.u <= u && u < v1.u)) {
        cortes.push(v1.w + ((u - v1.u) / (v2.u - v1.u)) * (v2.w - v1.w));
      }
    }
    cortes.sort((x, y) => x - y);
    const tramos: { u: number; w0: number; w1: number }[] = [];
    for (let i = 0; i + 1 < cortes.length; i += 2) tramos.push({ u, w0: cortes[i] - a.margen, w1: cortes[i + 1] + a.margen });
    if (tramos.length) lineasUW.push(tramos);
  }

  return lineasUW.flatMap((tramos, k) => {
    // Recorrido en zigzag: una pasada de ida y la siguiente de vuelta
    const orden = k % 2 === 0 ? tramos : [...tramos].reverse();
    return orden.map((t) => {
      const [w0, w1] = k % 2 === 0 ? [t.w0, t.w1] : [t.w1, t.w0];
      const largo = Math.abs(w1 - w0);
      const n = Math.max(2, Math.ceil(largo / separacionPedida) + 1);
      const fotos = Array.from({ length: n }, (_, i) => desdeUW(t.u, w0 + ((w1 - w0) * i) / (n - 1)));
      return { inicio: desdeUW(t.u, w0), fin: desdeUW(t.u, w1), fotos, largo };
    });
  });
}

/** La misma grilla recorrida al revés: se usa si deja la segunda grilla más cerca del final de la primera. */
const alReves = (tramos: Tramo[]): Tramo[] =>
  [...tramos].reverse().map((t) => ({ inicio: t.fin, fin: t.inicio, fotos: [...t.fotos].reverse(), largo: t.largo }));

export function generarGrilla(a: AjustesMapeo): GrillaMapeo | null {
  if (a.poligono.length < 3 || !(a.altura > 0)) return null;
  const tf = Math.min(95, Math.max(0, a.traslapeFrontal)) / 100;
  const tl = Math.min(95, Math.max(0, a.traslapeLateral)) / 100;
  const h = huella(a.camara, a.altura);
  const separacionPasadas = h.ancho * (1 - tl);
  const separacionPedida = h.alto * (1 - tf);
  if (!(separacionPasadas > 0) || !(separacionPedida > 0)) return null;

  const direccion = a.direccion ?? direccionDelLadoMasLargo(a.poligono);
  const { aXY, aLonLat } = plano(centroide(a.poligono));
  const metros = (x: LonLat, y: LonLat) => {
    const [x1, y1] = aXY(x);
    const [x2, y2] = aXY(y);
    return Math.hypot(x2 - x1, y2 - y1);
  };

  const grillas = [pasadasEnDireccion(a, direccion, separacionPasadas, separacionPedida, aXY, aLonLat)];
  if (a.patron === "doble") {
    const segunda = pasadasEnDireccion(a, (direccion + 90) % 180, separacionPasadas, separacionPedida, aXY, aLonLat);
    const fin = grillas[0][grillas[0].length - 1]?.fin;
    const invertida = alReves(segunda);
    grillas.push(fin && segunda.length && metros(fin, invertida[0].inicio) < metros(fin, segunda[0].inicio) ? invertida : segunda);
  }

  const tramos = grillas.flat();
  let distancia = 0;
  tramos.forEach((t, i) => {
    distancia += t.largo + (i > 0 ? metros(tramos[i - 1].fin, t.inicio) : 0);
  });
  const fotos = tramos.flatMap((t) => t.fotos);
  const intervalos = fotos.length - tramos.length;
  const largoTotal = tramos.reduce((s, t) => s + t.largo, 0);
  return {
    pasadas: tramos.map((t) => [t.inicio, t.fin] as [LonLat, LonLat]),
    fotos,
    direccion,
    pasadasPorGrilla: grillas.map((g) => g.length),
    separacionPasadas,
    separacionFotos: intervalos > 0 ? largoTotal / intervalos : separacionPedida,
    gsd: gsdCm(a.camara, a.altura),
    huella: h,
    areaHa: areaHa(a.poligono),
    distancia,
  };
}

/** Velocidad máxima para que la cámara alcance a disparar a la separación de la grilla. */
export function velocidadMaxima(g: GrillaMapeo, intervaloMinimo: number): number {
  return intervaloMinimo > 0 ? g.separacionFotos / intervaloMinimo : Infinity;
}

/** La grilla como ruta de waypoints: inicio y fin de cada pasada, a la altura del mapeo. */
export function grillaAWaypoints(g: GrillaMapeo, altura: number): Waypoint[] {
  return g.pasadas.flatMap(([a, b]) => [
    { id: nuevoId(), lon: a[0], lat: a[1], altura },
    { id: nuevoId(), lon: b[0], lat: b[1], altura },
  ]);
}

export interface OpcionesTerreno {
  /** Altura sobre el suelo que se quiere mantener (m). */
  agl: number;
  /** Elevación del suelo en el despegue (m s.n.m.): DJI Fly mide la altura desde ahí. */
  sueloDespegue: number;
  /** Elevación del suelo (m s.n.m.) en un punto; null si no se conoce. */
  suelo: (lon: number, lat: number) => number | null;
  tolerancia: number;
  /** Metros entre muestras del relieve a lo largo de cada pasada. */
  paso?: number;
}

export interface RutaConTerreno {
  waypoints: Waypoint[];
  /** Alturas sobre el despegue mínima y máxima de la ruta. */
  minima: number;
  maxima: number;
  /** Muestras sin dato de relieve: ahí se supuso el suelo a la altura del despegue. */
  sinDatos: number;
  /** La muestra más baja del recorrido: despegando ahí, ninguna altura queda negativa. */
  puntoMasBajo: LonLat | null;
}

/** El cálculo del seguimiento del terreno, que descarga el relieve antes de terminar. */
export interface EstadoTerreno {
  estado: "cargando" | "listo" | "error";
  ruta: RutaConTerreno | null;
}

/** Índices que conservan un perfil de alturas dentro de la tolerancia (Douglas-Peucker en una dimensión). */
function simplificarPerfil(s: number[], z: number[], tolerancia: number): number[] {
  const conservar = new Set([0, s.length - 1]);
  const revisar = (i0: number, i1: number) => {
    let peor = -1;
    let desvio = tolerancia;
    for (let i = i0 + 1; i < i1; i++) {
      const esperado = z[i0] + ((z[i1] - z[i0]) * (s[i] - s[i0])) / (s[i1] - s[i0]);
      if (Math.abs(z[i] - esperado) > desvio) {
        desvio = Math.abs(z[i] - esperado);
        peor = i;
      }
    }
    if (peor >= 0) {
      conservar.add(peor);
      revisar(i0, peor);
      revisar(peor, i1);
    }
  };
  revisar(0, s.length - 1);
  return [...conservar].sort((x, y) => x - y);
}

/**
 * Ruta de la grilla con seguimiento del terreno: en cada pasada la altura sobre el despegue
 * cambia para que la altura sobre el suelo (AGL) se mantenga, con los puntos justos para que
 * la interpolación en línea recta de DJI Fly no se aleje más que la tolerancia.
 */
export const PASO_TERRENO = 10;

/** Puntos cada `paso` metros a lo largo de un tramo, con su distancia desde el inicio. */
function muestrasTramo(a: LonLat, b: LonLat, paso: number): { s: number; p: LonLat }[] {
  const largo = distanciaYRumbo(a, b).d;
  const n = Math.max(1, Math.ceil(largo / paso));
  return Array.from({ length: n + 1 }, (_, i) => ({ s: (largo * i) / n, p: [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as LonLat }));
}

/** Todos los puntos donde se consulta el relieve para seguir el terreno en esta grilla. */
export function muestrasDeGrilla(g: GrillaMapeo, paso = PASO_TERRENO): LonLat[] {
  return g.pasadas.flatMap(([a, b]) => muestrasTramo(a, b, paso).map((m) => m.p));
}

export function rutaConTerreno(g: GrillaMapeo, o: OpcionesTerreno): RutaConTerreno {
  const paso = o.paso ?? PASO_TERRENO;
  let sinDatos = 0;
  let masBajo: { p: LonLat; suelo: number } | null = null;
  const waypoints: Waypoint[] = [];
  for (const [a, b] of g.pasadas) {
    const s: number[] = [];
    const z: number[] = [];
    const puntos: LonLat[] = [];
    for (const m of muestrasTramo(a, b, paso)) {
      const suelo = o.suelo(m.p[0], m.p[1]);
      if (suelo == null) sinDatos++;
      else if (!masBajo || suelo < masBajo.suelo) masBajo = { p: m.p, suelo };
      s.push(m.s);
      z.push(o.agl + (suelo ?? o.sueloDespegue) - o.sueloDespegue);
      puntos.push(m.p);
    }
    for (const i of simplificarPerfil(s, z, o.tolerancia)) {
      waypoints.push({ id: nuevoId(), lon: puntos[i][0], lat: puntos[i][1], altura: Math.round(z[i] * 10) / 10 });
    }
  }
  const alturas = waypoints.map((w) => w.altura);
  return { waypoints, minima: Math.min(...alturas), maxima: Math.max(...alturas), sinDatos, puntoMasBajo: masBajo?.p ?? null };
}
