import { describe, expect, it } from "vitest";
import { camaraDe, intervaloDeCamara, MODELOS } from "./camaras";
import { gsdCm } from "./mapeo";

describe("lista de drones", () => {
  it("trae los 45 modelos con datos completos y nombres únicos", () => {
    expect(MODELOS).toHaveLength(45);
    expect(new Set(MODELOS.map((m) => m.nombre)).size).toBe(MODELOS.length);
    for (const m of MODELOS) {
      expect(m.focalEq).toBeGreaterThan(0);
      expect(m.fuente).toMatch(/^https:\/\//);
      expect(m.resoluciones.length).toBeGreaterThan(0);
      for (const r of m.resoluciones) {
        expect(r.anchoPx).toBeGreaterThan(r.altoPx);
        expect(r.altoPx).toBeGreaterThan(0);
      }
    }
  });

  it("da el GSD del Air 3S a 80 m en sus dos resoluciones", () => {
    const air3s = MODELOS.find((m) => m.nombre === "DJI Air 3S")!;
    const [r50, r12] = air3s.resoluciones;
    expect(air3s.app).toBe("DJI Fly");
    expect(r50).toMatchObject({ etiqueta: "50 MP", intervaloMinimo: 5 });
    expect(r12).toMatchObject({ etiqueta: "12 MP", derivada: true, intervaloMinimo: 2 });
    expect(gsdCm(camaraDe(air3s, r50), 80)).toBeCloseTo(1.408, 3);
    expect(gsdCm(camaraDe(air3s, r12), 80)).toBeCloseTo(2.817, 3);
    expect(camaraDe(air3s, r12).nombre).toBe("DJI Air 3S · 12 MP");
    expect(intervaloDeCamara(camaraDe(air3s, r50))).toBe(5);
    expect(intervaloDeCamara({ nombre: "Personalizada", focalEq: 24, anchoPx: 4000, altoPx: 3000 })).toBeUndefined();
  });
});
