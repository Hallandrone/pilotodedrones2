import { describe, expect, it } from "vitest";
import { ALL_COURSE_TITLES, COURSE_TITLE_GROUPS, courseTitleKey, matchCourseTitle } from "./courseTitles";

describe("courseTitleKey", () => {
  it("ignora tildes, mayúsculas, puntuación y el «CURSO» inicial", () => {
    expect(courseTitleKey("Curso: Agricultura de Precisión con Drones")).toBe("AGRICULTURA DE PRECISION CON DRONES");
    expect(courseTitleKey("CURSO DE INSPECCIÓN EN ALTURA ( TORRES DE ALTA Y MEDIA TENSIÓN) Y TORRES DE TELECOMUNICACIÓN")).toBe(
      "INSPECCION EN ALTURA TORRES DE ALTA Y MEDIA TENSION Y TORRES DE TELECOMUNICACION",
    );
    expect(courseTitleKey("Inspección Visual & Termográfica de FV mediante RPAS")).toBe("INSPECCION VISUAL Y TERMOGRAFICA DE FV MEDIANTE RPAS");
  });
});

describe("matchCourseTitle", () => {
  it("reconoce los títulos del catálogo aunque vengan sin tildes o en minúsculas", () => {
    expect(matchCourseTitle("fotogrametria mediante rpas")).toBe("FOTOGRAMETRÍA MEDIANTE RPAS");
    expect(matchCourseTitle("OPERACION DJI LIDAR L3")).toBe("OPERACIÓN DJI LIDAR L3");
    expect(matchCourseTitle("MASTER PLAN 360° CON DRONES")).toBe("MÁSTER PLAN 360° CON DRONES");
  });

  it("agrupa las variantes del historial en su título canónico", () => {
    expect(matchCourseTitle("OPERADOR DE DRONES PROFESIONAL")).toBe("OPERADOR PROFESIONAL DE DRONES");
    expect(matchCourseTitle("CURSO OPERADOR DE DRONES PROFESIONAL")).toBe("OPERADOR PROFESIONAL DE DRONES");
    expect(matchCourseTitle("OPERADOR DE DRONES NOCRUTNO")).toBe("OPERADOR DE DRONES NOCTURNO");
    expect(matchCourseTitle("FOTOGRAMETRÍA CON DRONES")).toBe("FOTOGRAMETRÍA MEDIANTE RPAS");
    expect(matchCourseTitle("Inspección Visual y Termográfica de FV mediante RPAS")).toBe(
      "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
    );
    expect(matchCourseTitle("CURSO INSPECCION DE TORRES AT MT Y TELECOM")).toBe("INSPECCIÓN DE TORRES AT, MT Y TELECOMUNICACIONES");
    expect(matchCourseTitle("CURSO LOTEO DE TERRENOS, MÁSTER PLAN 360° CON DRONES")).toBe("MÁSTER PLAN 360° CON DRONES");
    expect(matchCourseTitle("CURSO USO Y OPERACION WINGTRA GEN II")).toBe("OPERACIÓN WINGTRA GEN II");
  });

  it("devuelve null para cursos fuera del catálogo o texto vacío", () => {
    expect(matchCourseTitle("PRINCESA DE DRONES")).toBeNull();
    expect(matchCourseTitle("MANTENIMIENTO DE DRONES AGRICOLAS")).toBeNull();
    expect(matchCourseTitle("")).toBeNull();
    expect(matchCourseTitle("   ")).toBeNull();
  });

  it("el catálogo no repite títulos ni claves", () => {
    expect(new Set(ALL_COURSE_TITLES).size).toBe(ALL_COURSE_TITLES.length);
    expect(new Set(ALL_COURSE_TITLES.map(courseTitleKey)).size).toBe(ALL_COURSE_TITLES.length);
    expect(COURSE_TITLE_GROUPS.every((group) => group.titles.length > 0)).toBe(true);
  });
});
