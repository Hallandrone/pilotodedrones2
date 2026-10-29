import { describe, expect, it } from "vitest";
import { decodificarTerrarium, pixelGlobal, Relieve, type Imagen } from "./elevacion";

/** Tesela sintética: la elevación es 100 m más la columna del píxel. */
function teselaColumnas(): Imagen {
  const data = new Uint8Array(256 * 256 * 4);
  for (let fila = 0; fila < 256; fila++) {
    for (let col = 0; col < 256; col++) {
      const v = 100 + col + 32768;
      const i = (fila * 256 + col) * 4;
      data[i] = Math.floor(v / 256);
      data[i + 1] = v % 256;
      data[i + 3] = 255;
    }
  }
  return { width: 256, height: 256, data };
}

/** Punto cuyo píxel global (zoom z) es (x, y). */
function puntoEnPixel(x: number, y: number, z: number): [number, number] {
  const n = 2 ** z * 256;
  const lon = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lon, lat];
}

describe("relieve terrarium", () => {
  it("decodifica la elevación de un píxel", () => {
    expect(decodificarTerrarium(128, 0, 0)).toBe(0);
    expect(decodificarTerrarium(131, 232, 128)).toBeCloseTo(1000.5, 6);
  });

  it("ubica el píxel global de un punto", () => {
    expect(pixelGlobal(0, 0, 1)).toEqual({ x: 256, y: 256 });
  });

  it("interpola entre centros de píxel y carga cada tesela una sola vez", async () => {
    let cargas = 0;
    const relieve = new Relieve(async () => {
      cargas++;
      return teselaColumnas();
    }, 2);
    const centro = puntoEnPixel(256 * 1 + 10.5, 256 * 1 + 20.5, 2);
    const entre = puntoEnPixel(256 * 1 + 11, 256 * 1 + 20.5, 2);
    await relieve.preparar([centro, entre]);
    expect(relieve.suelo(...centro)).toBeCloseTo(110, 3);
    expect(relieve.suelo(...entre)).toBeCloseTo(110.5, 3);
    expect(cargas).toBe(1);
  });

  it("devuelve null donde no hay tesela", async () => {
    const relieve = new Relieve(async () => null, 2);
    const p = puntoEnPixel(300.5, 300.5, 2);
    await relieve.preparar([p]);
    expect(relieve.suelo(...p)).toBeNull();
  });
});
