import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPinOff } from "lucide-react";
import { distanciaYRumbo } from "@/lib/misiones/geodesia";
import type { Terreno } from "@/lib/misiones/normativa";
import type { Waypoint } from "@/lib/misiones/tipos";

export type EstiloMapa = "satelite" | "topografico";

const CENTRO_CHILE: [number, number] = [-70.65, -33.45];
const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const ATRIBUCION_MAPBOX =
  '<a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">© Mapbox</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';

// El satélite va por la API de teselas estáticas de Mapbox: con la cuenta de la academia la API de
// teselas raster (mapbox.satellite) responde 429 y la estática no (probado el 28-oct-2026).
function estiloDe(estilo: EstiloMapa): string | mapboxgl.StyleSpecification {
  if (estilo === "topografico") return "mapbox://styles/mapbox/outdoors-v12";
  return {
    version: 8,
    sources: {
      satelite: {
        type: "raster",
        tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`],
        tileSize: 512,
        maxzoom: 20,
        attribution: `${ATRIBUCION_MAPBOX} <a href="https://www.maxar.com/" target="_blank" rel="noopener">© Maxar</a>`,
      },
    },
    layers: [{ id: "satelite", type: "raster", source: "satelite" }],
  };
}

export const mapaConfigurado = !!TOKEN;

interface Props {
  waypoints: Waypoint[];
  despegue: [number, number] | null;
  seleccionado: string | null;
  estilo: EstiloMapa;
  tresD: boolean;
  marcandoDespegue: boolean;
  /** Cambia cada vez que hay que encuadrar la ruta (al abrir o importar una misión). */
  encuadre: number;
  onAgregar: (lon: number, lat: number) => void;
  onMover: (id: string, lon: number, lat: number) => void;
  onSeleccionar: (id: string | null) => void;
  onDespegue: (lon: number, lat: number) => void;
  onTerreno: (terreno: Terreno | null) => void;
  /** Mapeo de área: con polígono (aunque esté vacío), los clics marcan vértices en vez de puntos. */
  poligono?: [number, number][] | null;
  fotos?: [number, number][];
  /** false = la ruta se dibuja sin los marcadores numerados (la grilla de un mapeo). */
  mostrarPuntos?: boolean;
  onAgregarVertice?: (lon: number, lat: number) => void;
  onMoverVertice?: (indice: number, lon: number, lat: number) => void;
}

const linea = (coords: [number, number][]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: coords },
});

const area = (vertices: [number, number][]) =>
  vertices.length >= 3
    ? { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [[...vertices, vertices[0]]] } }
    : linea(vertices);

const coleccionPuntos = (coords: [number, number][]) => ({
  type: "FeatureCollection" as const,
  features: coords.map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: c } })),
});

function prepararCapas(m: mapboxgl.Map) {
  // Relieve de Mapzen Terrain Tiles (AWS, libre con atribución); el DEM de Mapbox también es raster y responde 429
  if (!m.getSource("relieve")) {
    m.addSource("relieve", {
      type: "raster-dem",
      tiles: ["https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Relieve: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Mapzen Terrain Tiles</a>',
    });
  }
  // El relieve queda siempre activo: da la elevación del suelo bajo cada punto aunque la vista esté en 2D
  m.setTerrain({ source: "relieve", exaggeration: 1 });
  for (const id of ["ruta", "acceso", "area"]) {
    if (!m.getSource(id)) m.addSource(id, { type: "geojson", data: linea([]) });
  }
  if (!m.getSource("fotos")) m.addSource("fotos", { type: "geojson", data: coleccionPuntos([]) });
  const juntas = { "line-join": "round", "line-cap": "round" } as const;
  if (!m.getLayer("area-relleno")) {
    m.addLayer({ id: "area-relleno", type: "fill", source: "area", paint: { "fill-color": "#00b3f3", "fill-opacity": 0.15 } });
  }
  if (!m.getLayer("area-borde")) {
    m.addLayer({ id: "area-borde", type: "line", source: "area", layout: juntas, paint: { "line-color": "#00b3f3", "line-width": 2 } });
  }
  if (!m.getLayer("acceso-linea")) {
    m.addLayer({ id: "acceso-linea", type: "line", source: "acceso", layout: juntas, paint: { "line-color": "#00b3f3", "line-width": 2, "line-dasharray": [2, 2] } });
  }
  if (!m.getLayer("ruta-borde")) {
    m.addLayer({ id: "ruta-borde", type: "line", source: "ruta", layout: juntas, paint: { "line-color": "#1A1A1A", "line-width": 6, "line-opacity": 0.55 } });
  }
  if (!m.getLayer("ruta-linea")) {
    m.addLayer({ id: "ruta-linea", type: "line", source: "ruta", layout: juntas, paint: { "line-color": "#FF69B4", "line-width": 3 } });
  }
  if (!m.getLayer("fotos-puntos")) {
    m.addLayer({
      id: "fotos-puntos",
      type: "circle",
      source: "fotos",
      paint: { "circle-radius": 3, "circle-color": "#FFFFFF", "circle-stroke-color": "#FF69B4", "circle-stroke-width": 1.5 },
    });
  }
}

const CLASE_PUNTO =
  "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FF69B4] text-xs font-bold text-white shadow-lg cursor-grab";
const CLASE_PUNTO_ELEGIDO =
  "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#00b3f3] text-sm font-bold text-white shadow-lg ring-4 ring-[#00b3f3]/40 cursor-grab";
const CLASE_DESPEGUE =
  "flex h-8 w-8 items-center justify-center rounded-md border-2 border-white bg-[#083b4e] text-sm font-bold text-[#00b3f3] shadow-lg cursor-grab";
const CLASE_VERTICE = "h-3.5 w-3.5 rounded-sm border-2 border-[#00b3f3] bg-white shadow cursor-grab";

const MapaMision = (props: Props) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<mapboxgl.Map | null>(null);
  const marcadores = useRef(new Map<string, mapboxgl.Marker>());
  const marcaDespegue = useRef<mapboxgl.Marker | null>(null);
  const marcasVertices = useRef<mapboxgl.Marker[]>([]);
  const ultimoTerreno = useRef("");
  const ultimas = useRef(props);
  ultimas.current = props;
  // Sube cada vez que el estilo termina de cargar: las capas propias se vuelven a crear
  const [versionEstilo, setVersionEstilo] = useState(0);
  const estiloAplicado = useRef(props.estilo);

  useEffect(() => {
    if (!TOKEN || !contenedor.current) return;
    mapboxgl.accessToken = TOKEN;
    const inicio = ultimas.current.waypoints[0];
    const m = new mapboxgl.Map({
      container: contenedor.current,
      style: estiloDe(estiloAplicado.current),
      center: inicio ? [inicio.lon, inicio.lat] : CENTRO_CHILE,
      zoom: inicio ? 15 : 9,
    });
    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    m.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "top-right");
    m.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-left");

    m.on("style.load", () => {
      prepararCapas(m);
      setVersionEstilo((v) => v + 1);
    });
    m.on("click", (e) => {
      // Los clics sobre los marcadores no agregan puntos
      if (e.originalEvent.target !== m.getCanvas()) return;
      const p = ultimas.current;
      if (p.marcandoDespegue) p.onDespegue(e.lngLat.lng, e.lngLat.lat);
      else if (p.poligono && p.onAgregarVertice) p.onAgregarVertice(e.lngLat.lng, e.lngLat.lat);
      else p.onAgregar(e.lngLat.lng, e.lngLat.lat);
    });
    m.on("idle", () => {
      const p = ultimas.current;
      const wps = p.waypoints;
      const suelo = (lon: number, lat: number) => {
        const v = m.queryTerrainElevation([lon, lat], { exaggerated: false });
        return v == null ? null : Math.round(v * 10) / 10;
      };
      const puntos = wps.map((w) => suelo(w.lon, w.lat));
      // Muestras del relieve entre puntos: una cada ~25 m, entre 3 y 60 por tramo
      const tramos = wps.slice(0, -1).map((a, i) => {
        const b = wps[i + 1];
        const n = Math.min(60, Math.max(3, Math.ceil(distanciaYRumbo([a.lon, a.lat], [b.lon, b.lat]).d / 25)));
        return Array.from({ length: n - 1 }, (_, k) => {
          const f = (k + 1) / n;
          return { f, suelo: suelo(a.lon + (b.lon - a.lon) * f, a.lat + (b.lat - a.lat) * f) };
        });
      });
      const origen = p.despegue ?? (wps[0] ? ([wps[0].lon, wps[0].lat] as [number, number]) : null);
      const terreno = puntos.length ? { puntos, tramos, despegue: origen ? suelo(origen[0], origen[1]) : null } : null;
      const clave = JSON.stringify(terreno);
      if (clave !== ultimoTerreno.current) {
        ultimoTerreno.current = clave;
        p.onTerreno(terreno);
      }
    });

    const observador = new ResizeObserver(() => m.resize());
    observador.observe(contenedor.current);
    mapa.current = m;
    const marcas = marcadores.current;
    return () => {
      observador.disconnect();
      marcas.clear();
      marcasVertices.current = [];
      marcaDespegue.current = null;
      m.remove();
      mapa.current = null;
    };
  }, []);

  // Estilo del mapa (satélite o topográfico)
  useEffect(() => {
    const m = mapa.current;
    if (!m || props.estilo === estiloAplicado.current) return;
    estiloAplicado.current = props.estilo;
    m.setStyle(estiloDe(props.estilo));
  }, [props.estilo]);

  useEffect(() => {
    mapa.current?.easeTo({ pitch: props.tresD ? 60 : 0, duration: 800 });
  }, [props.tresD]);

  const modoMapeo = props.poligono != null;
  useEffect(() => {
    const m = mapa.current;
    if (m) m.getCanvas().style.cursor = props.marcandoDespegue || modoMapeo ? "crosshair" : "";
  }, [props.marcandoDespegue, modoMapeo]);

  // Ruta, tramo del despegue al primer punto, área del mapeo y puntos de disparo
  useEffect(() => {
    const m = mapa.current;
    if (!m || !versionEstilo) return;
    const coords = props.waypoints.map((w) => [w.lon, w.lat] as [number, number]);
    const fuente = (id: string) => m.getSource(id) as mapboxgl.GeoJSONSource | undefined;
    fuente("ruta")?.setData(linea(coords));
    fuente("acceso")?.setData(linea(props.despegue && coords.length ? [props.despegue, coords[0]] : []));
    fuente("area")?.setData(area(props.poligono ?? []));
    fuente("fotos")?.setData(coleccionPuntos(props.fotos ?? []));
  }, [props.waypoints, props.despegue, props.poligono, props.fotos, versionEstilo]);

  // Vértices del área, arrastrables
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const vertices = props.poligono ?? [];
    const marcas = marcasVertices.current;
    vertices.forEach((v, i) => {
      if (!marcas[i]) {
        const el = document.createElement("div");
        el.appendChild(document.createElement("div"));
        (el.firstElementChild as HTMLElement).className = CLASE_VERTICE;
        el.title = `Vértice ${i + 1}`;
        const marca = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat(v).addTo(m);
        marca.on("dragend", () => {
          const ll = marca.getLngLat();
          ultimas.current.onMoverVertice?.(i, ll.lng, ll.lat);
        });
        marcas[i] = marca;
      }
      marcas[i].setLngLat(v);
    });
    marcas.splice(vertices.length).forEach((marca) => marca.remove());
  }, [props.poligono]);

  // Marcadores numerados y arrastrables
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const vivos = new Set<string>();
    (props.mostrarPuntos === false ? [] : props.waypoints).forEach((w, i) => {
      vivos.add(w.id);
      let marca = marcadores.current.get(w.id);
      if (!marca) {
        // Mapbox posiciona el elemento con sus propias clases: el dibujo va en un hijo
        const el = document.createElement("div");
        el.appendChild(document.createElement("div"));
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          ultimas.current.onSeleccionar(w.id);
        });
        marca = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat([w.lon, w.lat]).addTo(m);
        marca.on("dragend", () => {
          const ll = marca!.getLngLat();
          ultimas.current.onMover(w.id, ll.lng, ll.lat);
        });
        marcadores.current.set(w.id, marca);
      }
      marca.setLngLat([w.lon, w.lat]);
      const dibujo = marca.getElement().firstElementChild as HTMLElement;
      dibujo.className = w.id === props.seleccionado ? CLASE_PUNTO_ELEGIDO : CLASE_PUNTO;
      dibujo.textContent = String(i + 1);
      marca.getElement().title = `Punto ${i + 1} · ${w.altura} m sobre el despegue`;
    });
    for (const [id, marca] of marcadores.current) {
      if (!vivos.has(id)) {
        marca.remove();
        marcadores.current.delete(id);
      }
    }

    if (props.despegue) {
      if (!marcaDespegue.current) {
        const el = document.createElement("div");
        el.className = CLASE_DESPEGUE;
        el.textContent = "H";
        el.title = "Despegue";
        const marca = new mapboxgl.Marker({ element: el, draggable: true }).setLngLat(props.despegue).addTo(m);
        marca.on("dragend", () => {
          const ll = marca.getLngLat();
          ultimas.current.onDespegue(ll.lng, ll.lat);
        });
        marcaDespegue.current = marca;
      }
      marcaDespegue.current.setLngLat(props.despegue);
    } else if (marcaDespegue.current) {
      marcaDespegue.current.remove();
      marcaDespegue.current = null;
    }
  }, [props.waypoints, props.despegue, props.seleccionado, props.mostrarPuntos]);

  // Encuadrar la ruta al abrir o importar
  useEffect(() => {
    const m = mapa.current;
    const p = ultimas.current;
    const coords = [...p.waypoints.map((w) => [w.lon, w.lat] as [number, number]), ...(p.poligono ?? [])];
    if (!m || !props.encuadre || !coords.length) return;
    if (p.despegue) coords.push(p.despegue);
    const limites = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    m.fitBounds(limites, { padding: 80, maxZoom: 18, duration: 900 });
  }, [props.encuadre]);

  if (!TOKEN) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#212121] p-6 text-center">
        <MapPinOff className="h-10 w-10 text-[#FF69B4]" />
        <p className="max-w-sm text-sm text-[#B0B0B0]">
          El mapa no está configurado (falta la variable VITE_MAPBOX_TOKEN). Igual puedes importar una ruta, editar sus puntos en la lista y
          exportarla.
        </p>
      </div>
    );
  }
  return <div ref={contenedor} className="h-full w-full" />;
};

export default MapaMision;
