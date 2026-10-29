// Relieve de Mapzen Terrain Tiles (AWS, libre con atribución) leído de las teselas PNG «terrarium»,
// sin depender de lo que el mapa tenga cargado en pantalla. Se usa para el seguimiento del terreno.

import type { LonLat } from "./geodesia";

/** El zoom máximo de las teselas: unos 4 m por píxel en Chile central. */
export const ZOOM_RELIEVE = 15;
const TAMANO = 256;
const urlTesela = (z: number, x: number, y: number) => `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${z}/${x}/${y}.png`;

export function decodificarTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/** Posición (en píxeles de tesela, fraccionaria) de un punto en la proyección web Mercator. */
export function pixelGlobal(lon: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z * TAMANO;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  };
}

export interface Imagen {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export type CargarTesela = (z: number, x: number, y: number) => Promise<Imagen | null>;

export async function cargarTeselaWeb(z: number, x: number, y: number): Promise<Imagen | null> {
  const r = await fetch(urlTesela(z, x, y));
  if (!r.ok) return null;
  const imagen = await createImageBitmap(await r.blob());
  const lienzo = document.createElement("canvas");
  lienzo.width = imagen.width;
  lienzo.height = imagen.height;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(imagen, 0, 0);
  return ctx.getImageData(0, 0, imagen.width, imagen.height);
}

export class Relieve {
  private pendientes = new Map<string, Promise<Imagen | null>>();
  private teselas = new Map<string, Imagen | null>();

  constructor(
    private cargar: CargarTesela = cargarTeselaWeb,
    private zoom = ZOOM_RELIEVE,
  ) {}

  /** Los 4 píxeles (centros) que rodean al punto, para la interpolación bilineal. */
  private vecinos(lon: number, lat: number) {
    const { x, y } = pixelGlobal(lon, lat, this.zoom);
    const x0 = Math.floor(x - 0.5);
    const y0 = Math.floor(y - 0.5);
    return { fx: x - 0.5 - x0, fy: y - 0.5 - y0, pixeles: [[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]] as [number, number][] };
  }

  private clave = (px: number, py: number) => `${Math.floor(px / TAMANO)}/${Math.floor(py / TAMANO)}`;

  /** Descarga (una sola vez) las teselas que hacen falta para estos puntos. */
  async preparar(puntos: LonLat[]): Promise<void> {
    const claves = new Set<string>();
    for (const [lon, lat] of puntos) for (const [px, py] of this.vecinos(lon, lat).pixeles) claves.add(this.clave(px, py));
    await Promise.all(
      [...claves].map((c) => {
        if (!this.pendientes.has(c)) {
          const [tx, ty] = c.split("/").map(Number);
          this.pendientes.set(
            c,
            this.cargar(this.zoom, tx, ty)
              .catch(() => null)
              .then((img) => {
                this.teselas.set(c, img);
                return img;
              }),
          );
        }
        return this.pendientes.get(c);
      }),
    );
  }

  private valor(px: number, py: number): number | null {
    const img = this.teselas.get(this.clave(px, py));
    if (!img) return null;
    const i = (((py % TAMANO) + TAMANO) % TAMANO) * img.width + (((px % TAMANO) + TAMANO) % TAMANO);
    return decodificarTerrarium(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]);
  }

  /** Elevación del suelo (m s.n.m.) con interpolación bilineal; null si falta una tesela. */
  suelo(lon: number, lat: number): number | null {
    const { fx, fy, pixeles } = this.vecinos(lon, lat);
    const [a, b, c, d] = pixeles.map(([px, py]) => this.valor(px, py));
    if (a == null || b == null || c == null || d == null) return null;
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  }
}
