import { describe, expect, it } from "vitest";
import { displayCourseTitle, getCourseTitleFontSize, getStudentNameFontSize } from "./diplomaLayout";

describe("getCourseTitleFontSize", () => {
  it("conserva los tamaños de siempre para títulos cortos", () => {
    expect(getCourseTitleFontSize("OPERADOR DE DRONES")).toBe(54);
    expect(getCourseTitleFontSize("OPERADOR PROFESIONAL DE DRONES")).toBe(46);
    expect(getCourseTitleFontSize("AGRICULTURA DE PRECISIÓN CON DRONES")).toBe(38);
  });

  it("reduce los títulos largos hasta caber en una línea, sin bajar de 18", () => {
    const largo = "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS"; // 66 caracteres
    const size = getCourseTitleFontSize(largo);
    expect(size).toBeLessThan(32);
    expect(size * 0.54 * largo.length).toBeLessThanOrEqual(780);
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

describe("displayCourseTitle", () => {
  it("quita tildes y pasa a mayúsculas, conservando la Ñ", () => {
    expect(displayCourseTitle("Inspección Visual y Termográfica de Paneles Solares mediante RPAS")).toBe(
      "INSPECCION VISUAL Y TERMOGRAFICA DE PANELES SOLARES MEDIANTE RPAS",
    );
    expect(displayCourseTitle("DISEÑO DE RUTAS AÉREAS")).toBe("DISEÑO DE RUTAS AEREAS");
    expect(displayCourseTitle("")).toBe("");
  });
});
