// Drones y cámaras del mapeo, con la misma lista de modelos que el planificador MavenRoute.
// Los datos de cada cámara salen de las fichas técnicas o guías oficiales de DJI (ver «fuente»),
// verificados el 28-oct-2026. Las Matrice 300/350/400 no tienen cámara propia: van con la Zenmuse P1.

import type { Camara } from "./mapeo";

export type AppVuelo = "DJI Fly" | "DJI Pilot 2" | "Otra app";

export interface ResolucionFoto {
  etiqueta: string;
  anchoPx: number;
  altoPx: number;
  /** DJI declara el modo pero no publica sus píxeles: salen del binning 2×2 de la resolución máxima. */
  derivada?: boolean;
  /** Segundos mínimos de la foto temporizada, cuando DJI los publica. */
  intervaloMinimo?: number;
}

export interface ModeloDron {
  nombre: string;
  /** App con la que vuela las misiones: define cómo se exportan. */
  app: AppVuelo;
  focalEq: number;
  /** FOV diagonal que publica DJI, en grados. */
  fovDiagonal: number;
  sensor: string;
  resoluciones: ResolucionFoto[];
  /** null = DJI no indica el tipo de obturador. */
  obturador: "mecánico" | "electrónico" | null;
  fuente: string;
}

export const MODELOS: ModeloDron[] = [
  {
    nombre: "DJI Lito X1",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 82.1,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/lito-x1/specs",
  },
  {
    nombre: "DJI Mini 4 Pro",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 82.1,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/mini-4-pro/specs",
  },
  {
    nombre: "DJI Mini 5 Pro",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1-inch CMOS",
    resoluciones: [
      { etiqueta: "50 MP", anchoPx: 8192, altoPx: 6144 },
      { etiqueta: "12 MP", anchoPx: 4096, altoPx: 3072, derivada: true },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/mini-5-pro/specs",
  },
  {
    nombre: "DJI Air 3",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 82,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/support/product/air-3",
  },
  {
    nombre: "DJI Air 3S",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1-inch CMOS",
    resoluciones: [
      { etiqueta: "50 MP", anchoPx: 8192, altoPx: 6144, intervaloMinimo: 5 },
      { etiqueta: "12 MP", anchoPx: 4096, altoPx: 3072, derivada: true, intervaloMinimo: 2 },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/air-3s/specs",
  },
  {
    nombre: "DJI Air 3S tele",
    app: "DJI Fly",
    focalEq: 70,
    fovDiagonal: 35,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048, intervaloMinimo: 5 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true, intervaloMinimo: 2 },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/air-3s/specs",
  },
  {
    nombre: "DJI Mavic 3",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic-3",
  },
  {
    nombre: "DJI Mavic 3 Classic",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic-3-classic",
  },
  {
    nombre: "DJI Mavic 3 Pro",
    app: "DJI Fly",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/mavic-3-pro/specs",
  },
  {
    nombre: "DJI Mavic 4 Pro",
    app: "DJI Fly",
    focalEq: 28,
    fovDiagonal: 72,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "100 MP (3:2)", anchoPx: 12288, altoPx: 8192 },
      { etiqueta: "25 MP (3:2)", anchoPx: 6144, altoPx: 4096, derivada: true },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/mavic-4-pro/specs",
  },
  {
    nombre: "DJI Mavic 2 Enterprise Advanced",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1/2” CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8000, altoPx: 6000 },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/support/product/mavic-2-enterprise-advanced",
  },
  {
    nombre: "DJI Mavic 3 Enterprise",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: "mecánico",
    fuente: "https://enterprise.dji.com/mavic-3-enterprise/specs",
  },
  {
    nombre: "DJI Mavic 3E",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: "mecánico",
    fuente: "https://enterprise.dji.com/mavic-3-enterprise/specs",
  },
  {
    nombre: "DJI Mavic 3M",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3 CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: "mecánico",
    fuente: "https://ag.dji.com/mavic-3-m/specs",
  },
  {
    nombre: "DJI Mavic 3T",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1/2-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8000, altoPx: 6000 },
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000, derivada: true },
    ],
    obturador: "electrónico",
    fuente: "https://enterprise.dji.com/mavic-3-enterprise/specs",
  },
  {
    nombre: "DJI Mavic 3TA",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1/2-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8000, altoPx: 6000 },
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000, derivada: true },
    ],
    obturador: "electrónico",
    fuente: "https://enterprise.dji.com/mavic-3-enterprise/specs",
  },
  {
    nombre: "DJI Matrice 30",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1/2\" CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://enterprise.dji.com/matrice-30/specs",
  },
  {
    nombre: "DJI Matrice 4E",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "4/3-inch CMOS",
    resoluciones: [
      { etiqueta: "20 MP", anchoPx: 5280, altoPx: 3956 },
    ],
    obturador: "mecánico",
    fuente: "https://enterprise.dji.com/matrice-4-series/specs",
  },
  {
    nombre: "DJI Matrice 4T",
    app: "DJI Pilot 2",
    focalEq: 24,
    fovDiagonal: 82,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true },
    ],
    obturador: null,
    fuente: "https://enterprise.dji.com/matrice-4-series/specs",
  },
  {
    nombre: "DJI Matrice 300 RTK + Zenmuse P1 (35 mm)",
    app: "DJI Pilot 2",
    focalEq: 35,
    fovDiagonal: 63.5,
    sensor: "Full frame 35,9 × 24 mm (Zenmuse P1, lente 35 mm)",
    resoluciones: [
      { etiqueta: "45 MP (3:2)", anchoPx: 8192, altoPx: 5460 },
    ],
    obturador: "mecánico",
    fuente: "https://enterprise.dji.com/zenmuse-p1/specs",
  },
  {
    nombre: "DJI Matrice 350 RTK + Zenmuse P1 (35 mm)",
    app: "DJI Pilot 2",
    focalEq: 35,
    fovDiagonal: 63.5,
    sensor: "Full frame 35,9 × 24 mm (Zenmuse P1, lente 35 mm)",
    resoluciones: [
      { etiqueta: "45 MP (3:2)", anchoPx: 8192, altoPx: 5460 },
    ],
    obturador: "mecánico",
    fuente: "https://enterprise.dji.com/zenmuse-p1/specs",
  },
  {
    nombre: "DJI Matrice 400 + Zenmuse P1 (35 mm)",
    app: "DJI Pilot 2",
    focalEq: 35,
    fovDiagonal: 63.5,
    sensor: "Full frame 35,9 × 24 mm (Zenmuse P1, lente 35 mm)",
    resoluciones: [
      { etiqueta: "45 MP (3:2)", anchoPx: 8192, altoPx: 5460 },
    ],
    obturador: "mecánico",
    fuente: "https://enterprise.dji.com/zenmuse-p1/specs",
  },
  {
    nombre: "DJI Mavic Mini",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 83,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic-mini",
  },
  {
    nombre: "DJI Mini SE",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 83,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mini-se",
  },
  {
    nombre: "DJI Mini 2",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 83,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mini-2",
  },
  {
    nombre: "DJI Mini 3",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 82.1,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/mini-3/specs",
  },
  {
    nombre: "DJI Mini 3 Pro",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 82.1,
    sensor: "1/1.3-inch CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8064, altoPx: 6048 },
      { etiqueta: "12 MP", anchoPx: 4032, altoPx: 3024, derivada: true },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mini-3-pro",
  },
  {
    nombre: "DJI Mavic Air",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 85,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4056, altoPx: 3040 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic-air",
  },
  {
    nombre: "DJI Mavic Air 2",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1/2\" CMOS",
    resoluciones: [
      { etiqueta: "48 MP", anchoPx: 8000, altoPx: 6000 },
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000, derivada: true },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/support/product/mavic-air-2",
  },
  {
    nombre: "DJI Air 2S",
    app: "Otra app",
    focalEq: 22,
    fovDiagonal: 88,
    sensor: "1\" CMOS",
    resoluciones: [
      { etiqueta: "20 MP (3:2)", anchoPx: 5472, altoPx: 3648 },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/support/product/air-2s",
  },
  {
    nombre: "DJI Mavic Pro",
    app: "Otra app",
    focalEq: 26,
    fovDiagonal: 78.8,
    sensor: "1/2.3” (CMOS)",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic",
  },
  {
    nombre: "DJI Mavic 2 Zoom",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 83,
    sensor: "1/2.3\" CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic-2",
  },
  {
    nombre: "DJI Mavic 2 Pro",
    app: "Otra app",
    focalEq: 28,
    fovDiagonal: 77,
    sensor: "1” CMOS",
    resoluciones: [
      { etiqueta: "20 MP (3:2)", anchoPx: 5472, altoPx: 3648 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/mavic-2",
  },
  {
    nombre: "DJI Mavic 2 Enterprise Dual",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 85,
    sensor: "1/2.3\" CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4056, altoPx: 3040 },
    ],
    obturador: null,
    fuente: "https://www.dji.com/global/support/product/mavic-2-enterprise",
  },
  {
    nombre: "DJI Phantom 3 Standard",
    app: "Otra app",
    focalEq: 20,
    fovDiagonal: 94,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/phantom-3-standard",
  },
  {
    nombre: "DJI Phantom 3 Advanced",
    app: "Otra app",
    focalEq: 20,
    fovDiagonal: 94,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/phantom-3-adv",
  },
  {
    nombre: "DJI Phantom 3 Professional",
    app: "Otra app",
    focalEq: 20,
    fovDiagonal: 94,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/phantom-3-pro",
  },
  {
    nombre: "DJI Phantom 3 4K",
    app: "Otra app",
    focalEq: 20,
    fovDiagonal: 94,
    sensor: "Sony EXMOR 1/2.3”",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://dl.djicdn.com/downloads/phantom_3_4k/en/Phantom_3_4K_Quick_Start_Guide_en.pdf",
  },
  {
    nombre: "DJI Phantom 3 SE",
    app: "Otra app",
    focalEq: 20,
    fovDiagonal: 94,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://dl.djicdn.com/downloads/phantom_3_se/20170810/Phantom+3+SE+Quick+Start+Guide-EN.pdf",
  },
  {
    nombre: "DJI Phantom 4",
    app: "Otra app",
    focalEq: 20,
    fovDiagonal: 94,
    sensor: "1/2.3” CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 4000, altoPx: 3000 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/phantom-4",
  },
  {
    nombre: "DJI Phantom 4 Advanced",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1’’ CMOS",
    resoluciones: [
      { etiqueta: "20 MP (3:2)", anchoPx: 5472, altoPx: 3648 },
      { etiqueta: "17, 7 MP (4:3)", anchoPx: 4864, altoPx: 3648 },
    ],
    obturador: "mecánico",
    fuente: "https://www.dji.com/global/support/product/phantom-4-adv",
  },
  {
    nombre: "DJI Phantom 4 Pro",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1’’ CMOS",
    resoluciones: [
      { etiqueta: "20 MP (3:2)", anchoPx: 5472, altoPx: 3648 },
      { etiqueta: "17, 7 MP (4:3)", anchoPx: 4864, altoPx: 3648 },
    ],
    obturador: "mecánico",
    fuente: "https://www.dji.com/global/support/product/phantom-4-pro",
  },
  {
    nombre: "DJI Phantom 4 Pro V2",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1-inch CMOS",
    resoluciones: [
      { etiqueta: "20 MP (3:2)", anchoPx: 5472, altoPx: 3648 },
      { etiqueta: "17, 7 MP (4:3)", anchoPx: 4864, altoPx: 3648 },
    ],
    obturador: "mecánico",
    fuente: "https://www.dji.com/global/support/product/phantom-4-pro-v2",
  },
  {
    nombre: "DJI Phantom 4 RTK",
    app: "Otra app",
    focalEq: 24,
    fovDiagonal: 84,
    sensor: "1\" CMOS",
    resoluciones: [
      { etiqueta: "20 MP (3:2)", anchoPx: 5472, altoPx: 3648 },
      { etiqueta: "17, 7 MP (4:3)", anchoPx: 4864, altoPx: 3648 },
    ],
    obturador: "mecánico",
    fuente: "https://www.dji.com/global/support/product/phantom-4-rtk",
  },
  {
    nombre: "DJI Spark",
    app: "Otra app",
    focalEq: 25,
    fovDiagonal: 81.9,
    sensor: "1/2.3\" CMOS",
    resoluciones: [
      { etiqueta: "12 MP", anchoPx: 3968, altoPx: 2976 },
    ],
    obturador: "electrónico",
    fuente: "https://www.dji.com/global/support/product/spark",
  },
];

export function camaraDe(modelo: ModeloDron, resolucion: ResolucionFoto): Camara {
  return { nombre: `${modelo.nombre} · ${resolucion.etiqueta}`, focalEq: modelo.focalEq, anchoPx: resolucion.anchoPx, altoPx: resolucion.altoPx };
}

/** Intervalo mínimo que publica DJI para esta cámara (si es de la lista y DJI lo publica). */
export function intervaloDeCamara(c: Camara): number | undefined {
  for (const m of MODELOS) {
    const r = m.resoluciones.find((x) => c.nombre === `${m.nombre} · ${x.etiqueta}`);
    if (r) return r.intervaloMinimo;
  }
  return undefined;
}

// La última cámara elegida queda en el navegador: cada mapeo nuevo parte con el dron del piloto
const CLAVE_CAMARA = "pilotodedrones:planificador:camara";

export function recordarCamara(c: Camara) {
  try {
    localStorage.setItem(CLAVE_CAMARA, JSON.stringify(c));
  } catch {
    // sin almacenamiento local: no se recuerda
  }
}

export function camaraRecordada(): Camara | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CAMARA) ?? "null") as Camara | null;
    return c && c.focalEq > 0 && c.anchoPx > 0 && c.altoPx > 0 ? c : null;
  } catch {
    return null;
  }
}
