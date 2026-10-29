// Importar rutas desde KML/KMZ (Google Earth y otros) o misiones de DJI, y exportar a KML.

import JSZip from "jszip";
import { ErrorMision, esZip, leerMisionDji, leerPlantilla, parsearXml, textoDe, type PlantillaDji } from "./djiFly";
import type { LonLat } from "./geodesia";
import type { Mision } from "./tipos";

export interface OpcionRuta {
  id: string;
  etiqueta: string;
  coords: LonLat[];
}

export type ResultadoImportacion =
  | { tipo: "dji"; plantilla: PlantillaDji; mision: Mision; avisos: string[] }
  | { tipo: "kml"; nombre: string; opciones: OpcionRuta[] };

function coordenadas(el: Element | undefined): LonLat[] {
  if (!el) return [];
  return (el.textContent ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.split(",").map(Number))
    .filter((c) => c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
    .map((c) => [c[0], c[1]] as LonLat);
}

const primeraDe = (el: Element, local: string) => el.getElementsByTagNameNS("*", local)[0];

export async function importarArchivo(bytes: Uint8Array, nombreArchivo: string): Promise<ResultadoImportacion> {
  let texto: string;
  if (esZip(bytes)) {
    const zip = await JSZip.loadAsync(bytes);
    const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    if (nombres.some((n) => /(^|\/)waylines\.wpml$/i.test(n))) {
      const plantilla = await leerPlantilla(bytes, nombreArchivo);
      return { tipo: "dji", plantilla, ...leerMisionDji(plantilla) };
    }
    const kmls = nombres.filter((n) => /\.kml$/i.test(n));
    if (!kmls.length) throw new ErrorMision("El KMZ no contiene ningún archivo KML.");
    texto = await zip.files[kmls.find((k) => /(^|\/)doc\.kml$/i.test(k)) || kmls[0]].async("string");
  } else {
    texto = new TextDecoder("utf-8").decode(bytes);
  }

  const doc = parsearXml(texto, nombreArchivo);
  const elementos: { nombre: string; tipo: string; coords: LonLat[] }[] = [];
  for (const pm of Array.from(doc.getElementsByTagNameNS("*", "Placemark"))) {
    const tipos = new Set<string>();
    const coords: LonLat[] = [];
    for (const g of Array.from(pm.getElementsByTagNameNS("*", "Point"))) {
      tipos.add("punto");
      coords.push(...coordenadas(primeraDe(g, "coordinates")));
    }
    for (const g of Array.from(pm.getElementsByTagNameNS("*", "LineString"))) {
      tipos.add("línea");
      coords.push(...coordenadas(primeraDe(g, "coordinates")));
    }
    for (const g of Array.from(pm.getElementsByTagNameNS("*", "Polygon"))) {
      tipos.add("polígono");
      const anillo = primeraDe(g, "outerBoundaryIs") ?? g;
      const c = coordenadas(primeraDe(anillo, "coordinates"));
      const ultimo = c[c.length - 1];
      if (c.length > 1 && c[0][0] === ultimo[0] && c[0][1] === ultimo[1]) c.pop();
      coords.push(...c);
    }
    if (coords.length) {
      elementos.push({ nombre: textoDe(pm, "name") || "Sin nombre", tipo: tipos.size === 1 ? [...tipos][0] : "mixto", coords });
    }
  }
  if (!elementos.length) throw new ErrorMision("No encontré puntos, líneas ni polígonos en el archivo.");

  const cuenta = (n: number) => `${n} ${n === 1 ? "punto" : "puntos"}`;
  const opciones: OpcionRuta[] = elementos.map((e, i) => ({ id: `e${i}`, etiqueta: `${e.nombre} (${e.tipo}, ${cuenta(e.coords.length)})`, coords: e.coords }));
  const sueltos = elementos.filter((e) => e.tipo === "punto");
  if (sueltos.length >= 2) {
    const coords = sueltos.flatMap((e) => e.coords);
    opciones.unshift({ id: "todos", etiqueta: `Todos los puntos en orden (${coords.length})`, coords });
  }
  const nombre = textoDe(doc.documentElement, "name")?.replace(/\.km[lz]$/i, "") || nombreArchivo.replace(/\.km[lz]$/i, "");
  return { tipo: "kml", nombre, opciones };
}

const escaparXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** KML para Google Earth: la ruta y cada punto, con la altura sobre el terreno. */
export function exportarKml(mision: Mision): string {
  const coord = (w: { lon: number; lat: number; altura: number }) => `${w.lon},${w.lat},${w.altura}`;
  const puntos = mision.waypoints
    .map((w, i) => `    <Placemark><name>${i + 1}</name><Point><altitudeMode>relativeToGround</altitudeMode><coordinates>${coord(w)}</coordinates></Point></Placemark>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escaparXml(mision.nombre)}</name>
    <Style id="ruta"><LineStyle><color>ffff00ff</color><width>3</width></LineStyle></Style>
    <Placemark>
      <name>${escaparXml(mision.nombre)}</name>
      <styleUrl>#ruta</styleUrl>
      <LineString><altitudeMode>relativeToGround</altitudeMode><coordinates>${mision.waypoints.map(coord).join(" ")}</coordinates></LineString>
    </Placemark>
${puntos}
  </Document>
</kml>
`;
}
