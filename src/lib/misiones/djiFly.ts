// Misiones de DJI Fly: formato WPML (wpmz/template.kml + wpmz/waylines.wpml) dentro de un KMZ.
//
// DJI Fly no importa misiones. Lo que funciona es reemplazar el KMZ de una misión creada en
// el propio control (Android/data/dji.go.v5/files/waypoint/<UUID>/<UUID>.kmz). Por eso la
// misión se genera sobre esa misma misión como plantilla: conserva el formato de la versión
// de DJI Fly del piloto, el modelo de dron y el nombre del archivo. Probado con un DJI RC 2
// el 28-oct-2026: una misión armada sobre una plantilla antigua fue borrada por DJI Fly y la
// armada sobre una misión recién creada se abrió bien.

import JSZip from "jszip";
import { distanciaYRumbo, rumboDji } from "./geodesia";
import { AJUSTES_POR_DEFECTO, nuevoId, type AccionFinal, type Mision } from "./tipos";

const UUID_RE = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i;
const ACCIONES_FINALES: AccionFinal[] = ["goHome", "noAction", "autoLand", "gotoFirstWaypoint"];

export class ErrorMision extends Error {}

/** Máximo de puntos por misión que acepta DJI Fly (DJI no lo publica; dato informado el 29-oct-2026). */
export const MAXIMO_PUNTOS_DJI_FLY = 500;

export interface PlantillaDji {
  nombreArchivo: string;
  /** UUID de la misión en el control; el KMZ generado debe llamarse <UUID>.kmz. */
  uuid: string | null;
  /** El archivo tal como vino, para guardarlo con la misión. */
  original: Uint8Array;
  entradas: { nombre: string; datos: Uint8Array }[];
  rutaWaylines: string;
  rutaTemplate: string;
  waylines: string;
  template: string;
  /** wpml:droneEnumValue (código de modelo de DJI). */
  modelo: string | null;
  modoAltura: string | null;
  puntos: number;
}

export function esZip(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function parsearXml(texto: string, que: string): Document {
  const doc = new DOMParser().parseFromString(texto, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new ErrorMision(`${que} no es un XML válido.`);
  return doc;
}

export function textoDe(raiz: Document | Element, nombreLocal: string): string | null {
  const el = raiz.getElementsByTagNameNS("*", nombreLocal)[0];
  return el ? (el.textContent ?? "").trim() : null;
}

export async function leerPlantilla(bytes: Uint8Array, nombreArchivo: string): Promise<PlantillaDji> {
  if (!esZip(bytes)) throw new ErrorMision("El archivo no es un KMZ (no está comprimido).");
  const zip = await JSZip.loadAsync(bytes);
  const entradas: { nombre: string; datos: Uint8Array }[] = [];
  for (const nombre of Object.keys(zip.files)) {
    if (zip.files[nombre].dir) continue;
    entradas.push({ nombre, datos: await zip.files[nombre].async("uint8array") });
  }
  const rutaWaylines = entradas.find((e) => /(^|\/)waylines\.wpml$/i.test(e.nombre))?.nombre;
  const rutaTemplate = entradas.find((e) => /(^|\/)template\.kml$/i.test(e.nombre))?.nombre;
  if (!rutaWaylines || !rutaTemplate) {
    throw new ErrorMision("Este KMZ no es una misión de DJI: le falta wpmz/waylines.wpml o wpmz/template.kml.");
  }
  const dec = new TextDecoder("utf-8");
  const waylines = dec.decode(entradas.find((e) => e.nombre === rutaWaylines)!.datos);
  const template = dec.decode(entradas.find((e) => e.nombre === rutaTemplate)!.datos);
  const doc = parsearXml(waylines, "waylines.wpml");
  parsearXml(template, "template.kml");
  const puntos = doc.getElementsByTagNameNS("*", "Placemark").length;
  if (waylines.indexOf("<Placemark>") < 0 || puntos < 1) {
    throw new ErrorMision("La misión no tiene puntos en el formato que escribe DJI Fly.");
  }
  return {
    nombreArchivo,
    uuid: (nombreArchivo.match(UUID_RE) || [null])[0],
    original: bytes,
    entradas,
    rutaWaylines,
    rutaTemplate,
    waylines,
    template,
    modelo: textoDe(doc, "droneEnumValue"),
    modoAltura: textoDe(doc, "executeHeightMode"),
    puntos,
  };
}

/** Pasa una misión de DJI al planificador. Devuelve también avisos para el piloto. */
export function leerMisionDji(plantilla: PlantillaDji): { mision: Mision; avisos: string[] } {
  const doc = parsearXml(plantilla.waylines, "waylines.wpml");
  const avisos: string[] = [];
  const marcas = Array.from(doc.getElementsByTagNameNS("*", "Placemark"));
  const waypoints = marcas
    .map((pm) => {
      const c = (textoDe(pm, "coordinates") ?? "").split(",").map(Number);
      const altura = Number(textoDe(pm, "executeHeight"));
      return { id: nuevoId(), lon: c[0], lat: c[1], altura: isFinite(altura) ? altura : 0 };
    })
    .filter((w) => isFinite(w.lon) && isFinite(w.lat));
  if (plantilla.modoAltura && plantilla.modoAltura !== "relativeToStartPoint") {
    avisos.push(`Las alturas de este archivo no se miden desde el despegue (modo ${plantilla.modoAltura}). Revísalas antes de volar.`);
  }
  const velocidad = Number(textoDe(doc, "autoFlightSpeed"));
  const fin = textoDe(doc, "finishAction") as AccionFinal | null;
  const camara = Number(textoDe(doc, "waypointGimbalPitchAngle") ?? textoDe(doc, "gimbalPitchRotateAngle"));
  const giros = marcas.slice(1, -1).map((pm) => textoDe(pm, "waypointTurnMode") ?? "");
  const nombre = plantilla.uuid ? `Misión DJI ${plantilla.uuid.slice(0, 8)}` : plantilla.nombreArchivo.replace(/\.kmz$/i, "");
  return {
    mision: {
      nombre,
      waypoints,
      despegue: null,
      ajustes: {
        ...AJUSTES_POR_DEFECTO,
        velocidad: isFinite(velocidad) && velocidad > 0 ? velocidad : AJUSTES_POR_DEFECTO.velocidad,
        alTerminar: fin && ACCIONES_FINALES.includes(fin) ? fin : AJUSTES_POR_DEFECTO.alTerminar,
        perdidaSenal: textoDe(doc, "exitOnRCLost") === "goContinue" ? "continuar" : "rth",
        camara: isFinite(camara) ? camara : 0,
        detenerEnPuntos: giros.length ? giros.every((g) => g.includes("Stop")) : true,
      },
    },
    avisos,
  };
}

// DJI escribe hasta 12-13 decimales, sin ceros sobrantes
const fmtCoord = (x: number) => x.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
const fmtNum = (x: number) => String(Math.round(x * 10) / 10);

function reemplazar(texto: string, etiqueta: string, valor: string, global = false): string {
  const re = new RegExp(`(<wpml:${etiqueta}>)[^<]*(</wpml:${etiqueta}>)`, global ? "g" : "");
  return texto.replace(re, (_m, a, b) => `${a}${valor}${b}`);
}

export interface KmzGenerado {
  bytes: Uint8Array;
  /** <UUID>.kmz: el nombre del archivo que se reemplaza en el control. */
  nombre: string;
  waylines: string;
  template: string;
}

export async function generarKmzDjiFly(plantilla: PlantillaDji, mision: Mision): Promise<KmzGenerado> {
  const wps = mision.waypoints;
  if (wps.length < 2) throw new ErrorMision("La misión necesita al menos 2 puntos.");
  if (wps.length > MAXIMO_PUNTOS_DJI_FLY) {
    throw new ErrorMision(`DJI Fly acepta hasta ${MAXIMO_PUNTOS_DJI_FLY} puntos por misión y esta tiene ${wps.length}.`);
  }
  if (wps.some((w) => !(w.altura > 0))) throw new ErrorMision("Todos los puntos deben tener una altura mayor que 0 m.");
  if (plantilla.puntos < 2) {
    throw new ErrorMision("La misión de plantilla debe tener al menos 2 puntos. Créala en DJI Fly con 2 puntos y vuelve a subirla.");
  }
  const aj = mision.ajustes;
  const w = plantilla.waylines;
  const p0s = w.indexOf("<Placemark>");
  const p0e = w.indexOf("</Placemark>", p0s) + "</Placemark>".length;
  const pLs = w.lastIndexOf("<Placemark>");
  const pLe = w.indexOf("</Placemark>", pLs) + "</Placemark>".length;
  const separador = w.slice(p0e, w.indexOf("<Placemark>", p0e));
  const primera = w.slice(p0s, p0e);
  const ultima = w.slice(pLs, pLe);
  let cabeza = w.slice(0, p0s);
  let template = plantilla.template;

  const n = wps.length;
  const rumbos = wps.slice(0, -1).map((p, i) => distanciaYRumbo([p.lon, p.lat], [wps[i + 1].lon, wps[i + 1].lat]).rumbo);
  const marcas = wps.map((p, i) => {
    let pm = i === 0 ? primera : ultima;
    pm = pm.replace(/(<coordinates>\s*)[^<]+?(\s*<\/coordinates>)/, (_m, a, b) => `${a}${fmtCoord(p.lon)},${fmtCoord(p.lat)}${b}`);
    pm = reemplazar(pm, "index", String(i));
    pm = reemplazar(pm, "executeHeight", fmtNum(p.altura));
    pm = reemplazar(pm, "waypointSpeed", fmtNum(aj.velocidad));
    const rumbo = aj.rumbo === "fijo" ? aj.rumboFijo : rumbos[Math.min(i, n - 2)];
    pm = reemplazar(pm, "waypointHeadingAngle", String(rumboDji(rumbo)));
    pm = reemplazar(pm, "waypointHeadingAngleEnable", "1");
    pm = reemplazar(pm, "gimbalPitchRotateAngle", fmtNum(aj.camara), true);
    pm = reemplazar(pm, "waypointGimbalPitchAngle", fmtNum(aj.camara), true);
    if (i > 0 && i < n - 1) {
      pm = reemplazar(pm, "waypointTurnMode", aj.detenerEnPuntos ? "toPointAndStopWithContinuityCurvature" : "toPointAndPassWithContinuityCurvature");
    }
    // Los grupos de acciones del primer punto de la plantilla llegan a lo más al punto 1
    return pm.replace(/<wpml:actionGroup(Start|End)Index>(\d+)</g, (_m, k, v) => `<wpml:actionGroup${k}Index>${Math.min(Number(v), 1)}<`);
  });

  const ajustarConfig = (t: string) => {
    let r = reemplazar(t, "finishAction", aj.alTerminar);
    r = reemplazar(r, "exitOnRCLost", aj.perdidaSenal === "continuar" ? "goContinue" : "executeLostAction");
    if (aj.perdidaSenal === "rth") r = reemplazar(r, "executeRCLostAction", "goBack");
    return reemplazar(r, "globalTransitionalSpeed", fmtNum(aj.velocidad));
  };
  cabeza = reemplazar(ajustarConfig(cabeza), "autoFlightSpeed", fmtNum(aj.velocidad));
  template = reemplazar(ajustarConfig(template), "updateTime", String(Date.now()));

  const waylines = cabeza + marcas.join(separador) + w.slice(pLe);
  parsearXml(waylines, "La misión generada");
  parsearXml(template, "La configuración generada");

  const enc = new TextEncoder();
  const zip = new JSZip();
  for (const e of plantilla.entradas) {
    const datos = e.nombre === plantilla.rutaWaylines ? enc.encode(waylines) : e.nombre === plantilla.rutaTemplate ? enc.encode(template) : e.datos;
    zip.file(e.nombre, datos, { createFolders: false });
  }
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes, nombre: plantilla.uuid ? `${plantilla.uuid}.kmz` : plantilla.nombreArchivo, waylines, template };
}
