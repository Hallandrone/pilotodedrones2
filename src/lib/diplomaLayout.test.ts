import { describe, expect, it } from "vitest";
import {
  COURSE_TITLE_CHAR_WIDTH,
  COURSE_TITLE_LETTER_SPACING,
  COURSE_TITLE_MAX_WIDTH,
  getCourseTitleFontSize,
  getStudentNameFontSize,
} from "./diplomaLayout";

describe("getCourseTitleFontSize", () => {
  it("mantiene los tamaños grandes para títulos cortos y los ajusta al ancho de la fuente", () => {
    expect(getCourseTitleFontSize("OPERADOR DE DRONES")).toBe(54);
    // 30 caracteres: tope 46, pero Quicksand es más ancha que la fuente anterior y cabe a 43.
    const treinta = getCourseTitleFontSize("OPERADOR PROFESIONAL DE DRONES");
    expect(treinta).toBeGreaterThanOrEqual(42);
    expect(treinta).toBeLessThanOrEqual(46);
    // 35 caracteres: el tope es 38, pero con Quicksand cabe justo en 37.
    const medio = getCourseTitleFontSize("AGRICULTURA DE PRECISIÓN CON DRONES");
    expect(medio).toBeGreaterThanOrEqual(36);
    expect(medio).toBeLessThanOrEqual(38);
  });

  it("reduce los títulos largos hasta caber en una línea, sin bajar de 18", () => {
    const largo = "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS"; // 66 caracteres
    const size = getCourseTitleFontSize(largo);
    expect(size).toBeLessThan(32);
    expect(size * COURSE_TITLE_CHAR_WIDTH * largo.length + COURSE_TITLE_LETTER_SPACING * largo.length).toBeLessThanOrEqual(COURSE_TITLE_MAX_WIDTH);
    expect(getCourseTitleFontSize("X".repeat(200))).toBe(18);
  });

  it("nunca crece al alargar el título", () => {
    let previous = Infinity;
    for (let length = 1; length <= 120; length++) {
      const size = getCourseTitleFontSize("A".repeat(length));
      expect(size).toBeLessThanOrEqual(previous);
      previous = size;
    }
  });
});

describe("getStudentNameFontSize", () => {
  it("escalona por largo del nombre", () => {
    expect(getStudentNameFontSize("Ana Soto")).toBe(65);
    expect(getStudentNameFontSize("Jose Ignacio Orellana Dalidet")).toBe(56);
    expect(getStudentNameFontSize("A".repeat(60))).toBe(32);
  });
});
