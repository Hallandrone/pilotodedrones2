import { describe, expect, it } from "vitest";
import { destino, distanciaYRumbo, type LonLat } from "./geodesia";
import {
  alturaParaGsd,
  areaHa,
  direccionDelLadoMasLargo,
  fovDiagonal,
  generarGrilla,
  grillaAWaypoints,
  gsdCm,
  huella,
  MAPEO_POR_DEFECTO,
  obturacionMinima,
  rutaConTerreno,
  velocidadMaxima,
  type Camara,
} from "./mapeo";

// Cámara de 24 mm equivalentes y 20 MP en 3:2 (5472 x 3648)
const CAMARA: Camara = { nombre: "Prueba", focalEq: 24, anchoPx: 5472, altoPx: 3648 };
const ORIGEN: LonLat = [-70.6, -33.4];
/** Punto a x metros al este e y metros al norte del origen. */
const en = (x: number, y: number): LonLat => destino(destino(ORIGEN, y, 0), x, 90);

describe("cámara", () => {
  it("calcula GSD, huella y FOV desde la focal equivalente", () => {
    expect(gsdCm(CAMARA, 100)).toBeCloseTo(2.741, 3);
    const h = huella(CAMARA, 100);
    expect(h.ancho).toBeCloseTo(150, 6);
    expect(h.alto).toBeCloseTo(100, 6);
    expect(alturaParaGsd(CAMARA, gsdCm(CAMARA, 73))).toBeCloseTo(73, 6);
    expect(fovDiagonal(CAMARA)).toBeCloseTo(84.06, 1);
  });

  it("da la obturación mínima para no arrastrar más de un píxel", () => {
    // 5 m/s con 2 cm/px: 1/250 s
    expect(obturacionMinima(2, 5)).toBe(250);
  });
});

describe("generarGrilla", () => {
  const cuadrado = [en(0, 0), en(300, 0), en(300, 300), en(0, 300)];
  const ajustes = { ...MAPEO_POR_DEFECTO, camara: CAMARA, altura: 100, traslapeFrontal: 80, traslapeLateral: 70, direccion: 0, margen: 0, poligono: cuadrado };

  it("cubre un cuadrado de 300 m con pasadas norte-sur en zigzag", () => {
    const g = generarGrilla(ajustes)!;
    // Huella 150 x 100 m: pasadas cada 45 m (70 % lateral) y fotos cada 20 m (80 % frontal)
    expect(g.separacionPasadas).toBeCloseTo(45, 6);
    expect(g.pasadas).toHaveLength(7);
    expect(g.fotos).toHaveLength(7 * 16);
    expect(g.separacionFotos).toBeCloseTo(20, 1);
    expect(g.areaHa).toBeCloseTo(9, 1);
    expect(g.distancia).toBeCloseTo(7 * 300 + 6 * 45, -1);
    // La primera pasada va hacia el norte y la segunda vuelve hacia el sur
    expect(distanciaYRumbo(g.pasadas[0][0], g.pasadas[0][1]).rumbo).toBeCloseTo(0, 0);
    expect(distanciaYRumbo(g.pasadas[1][0], g.pasadas[1][1]).rumbo).toBeCloseTo(180, 0);
    // A 2 s entre fotos, la velocidad máxima es 10 m/s
    expect(velocidadMaxima(g, 2)).toBeCloseTo(10, 1);
  });

  it("extiende las pasadas con el margen y nunca baja el traslape pedido", () => {
    const g = generarGrilla({ ...ajustes, margen: 15 })!;
    expect(distanciaYRumbo(g.pasadas[0][0], g.pasadas[0][1]).d).toBeCloseTo(330, 0);
    expect(g.separacionFotos).toBeLessThanOrEqual(20 + 1e-9);
  });

  it("en un polígono en forma de U parte las pasadas que cruzan el hueco", () => {
    // U de 300 x 300 m con un hueco de 100 m de ancho y 200 m de profundidad desde el norte;
    // con pasadas este-oeste, las 5 que pasan sobre y = 100 m cruzan el hueco y se parten en dos
    const u = [en(0, 0), en(300, 0), en(300, 300), en(200, 300), en(200, 100), en(100, 100), en(100, 300), en(0, 300)];
    const g = generarGrilla({ ...ajustes, direccion: 90, poligono: u })!;
    expect(g.pasadas).toHaveLength(2 + 5 * 2);
    expect(g.areaHa).toBeCloseTo(7, 1);
  });

  it("sin dirección, las pasadas siguen el lado más largo", () => {
    const rectangulo = [en(0, 0), en(400, 0), en(400, 100), en(0, 100)];
    expect(direccionDelLadoMasLargo(rectangulo)).toBeCloseTo(90, 0);
    const g = generarGrilla({ ...ajustes, direccion: null, poligono: rectangulo })!;
    expect(g.direccion).toBeCloseTo(90, 0);
  });

  it("pasa la grilla a waypoints: inicio y fin de cada pasada", () => {
    const g = generarGrilla(ajustes)!;
    const wps = grillaAWaypoints(g, 100);
    expect(wps).toHaveLength(14);
    expect(wps.every((w) => w.altura === 100)).toBe(true);
  });

  it("no genera grilla con menos de 3 vértices", () => {
    expect(generarGrilla({ ...ajustes, poligono: cuadrado.slice(0, 2) })).toBeNull();
    expect(areaHa(cuadrado.slice(0, 2))).toBe(0);
  });

  it("en doble grilla agrega las pasadas cruzadas a 90° y empieza cerca de donde terminó la primera", () => {
    const g = generarGrilla({ ...ajustes, patron: "doble" })!;
    expect(g.pasadasPorGrilla).toEqual([7, 7]);
    // 16 fotos por pasada; en las cruzadas puede sumar una si el lado mide milímetros más de 300 m
    expect(g.fotos.length).toBeGreaterThanOrEqual(2 * 7 * 16);
    expect(g.fotos.length).toBeLessThanOrEqual(7 * 16 + 7 * 17);
    const cruzada = distanciaYRumbo(g.pasadas[7][0], g.pasadas[7][1]).rumbo;
    expect(Math.min(Math.abs(cruzada - 90), Math.abs(cruzada - 270))).toBeLessThan(1);
    // El salto entre grillas no es más largo que cruzar el cuadrado en diagonal
    expect(distanciaYRumbo(g.pasadas[6][1], g.pasadas[7][0]).d).toBeLessThan(300 * Math.SQRT2);
  });
});

describe("rutaConTerreno", () => {
  const cuadrado = [en(0, 0), en(300, 0), en(300, 300), en(0, 300)];
  const g = generarGrilla({ ...MAPEO_POR_DEFECTO, camara: CAMARA, altura: 100, direccion: 0, margen: 0, poligono: cuadrado })!;
  /** Metros al norte del origen. */
  const norte = (lat: number) => ((lat - ORIGEN[1]) * Math.PI * 6371008.8) / 180;

  it("en una ladera pareja deja solo el inicio y el fin de cada pasada", () => {
    // El suelo sube 10 m cada 100 m hacia el norte
    const r = rutaConTerreno(g, { agl: 100, sueloDespegue: 500, tolerancia: 3, suelo: (_lon, lat) => 500 + 0.1 * norte(lat) });
    expect(r.waypoints).toHaveLength(14);
    expect(r.minima).toBeCloseTo(100, 0);
    expect(r.maxima).toBeCloseTo(130, 0);
    expect(r.sinDatos).toBe(0);
    // El punto más bajo está en el borde sur
    expect(norte(r.puntoMasBajo![1])).toBeCloseTo(0, 0);
  });

  it("sobre una loma agrega puntos para no acercarse al suelo", () => {
    // Loma de 40 m a mitad del cuadrado (y = 150 m)
    const loma = (lat: number) => 500 + 40 * Math.exp(-(((norte(lat) - 150) / 30) ** 2));
    const r = rutaConTerreno(g, { agl: 100, sueloDespegue: 500, tolerancia: 3, suelo: (_lon, lat) => loma(lat) });
    expect(r.waypoints.length).toBeGreaterThan(14);
    expect(r.maxima).toBeCloseTo(140, 0);
  });

  it("sin datos de relieve mantiene la altura sobre el despegue y lo informa", () => {
    const r = rutaConTerreno(g, { agl: 100, sueloDespegue: 500, tolerancia: 3, suelo: () => null });
    expect(r.waypoints.every((w) => w.altura === 100)).toBe(true);
    expect(r.sinDatos).toBeGreaterThan(0);
  });
});
