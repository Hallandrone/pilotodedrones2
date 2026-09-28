import { describe, expect, it } from "vitest";
import { DRONE_SERIES_CATALOG, composeDroneSeries, parseDroneSeries } from "./droneSeries";

describe("composeDroneSeries", () => {
  it("imprime una sola serie tal cual", () => {
    expect(composeDroneSeries(["MAVIC"])).toBe("MAVIC");
  });

  it("une varias con comas y una «Y» final, en mayúsculas y sin repetidos", () => {
    expect(composeDroneSeries(["Mavic", "MATRICE", "phantom", "MAVIC"])).toBe("MAVIC, MATRICE Y PHANTOM");
  });

  it("ignora vacíos y devuelve cadena vacía sin selección", () => {
    expect(composeDroneSeries(["", "  "])).toBe("");
    expect(composeDroneSeries([])).toBe("");
  });

  it("incluye el texto manual como un elemento más", () => {
    expect(composeDroneSeries(["MATRICE", "MAVIC", "joyance jtc10"])).toBe("MATRICE, MAVIC Y JOYANCE JTC10");
  });
});

describe("parseDroneSeries", () => {
  it("entiende los formatos antiguos con guiones", () => {
    expect(parseDroneSeries("matrice-mavic")).toEqual({ selected: ["MATRICE", "MAVIC"], other: "" });
    expect(parseDroneSeries("neo-mavic-matrice")).toEqual({ selected: ["NEO", "MAVIC", "MATRICE"], other: "" });
  });

  it("entiende comas, «Y» y la palabra «series»", () => {
    expect(parseDroneSeries("MAVIC, MATRICE Y AGRAS SERIES")).toEqual({ selected: ["MAVIC", "MATRICE", "AGRAS"], other: "" });
    expect(parseDroneSeries("Mavic, Phantom, Matrice")).toEqual({ selected: ["MAVIC", "PHANTOM", "MATRICE"], other: "" });
  });

  it("deja en «otro» lo que no está en el catálogo", () => {
    expect(parseDroneSeries("matrice-mavic-joyance jtc10")).toEqual({ selected: ["MATRICE", "MAVIC"], other: "JOYANCE JTC10" });
  });

  it("reconoce las series de Autel con o sin marca y con «Robotics»", () => {
    expect(parseDroneSeries("mavic, autel evo max")).toEqual({ selected: ["MAVIC", "AUTEL EVO MAX"], other: "" });
    expect(parseDroneSeries("EVO LITE")).toEqual({ selected: ["AUTEL EVO LITE"], other: "" });
    expect(parseDroneSeries("Autel Robotics EVO").selected).toEqual(["AUTEL EVO"]);
  });

  it("ida y vuelta: lo compuesto se vuelve a leer igual", () => {
    const composed = composeDroneSeries(["MAVIC", "AUTEL EVO", "JOYANCE JTC10"]);
    expect(composed).toBe("MAVIC, AUTEL EVO Y JOYANCE JTC10");
    expect(parseDroneSeries(composed)).toEqual({ selected: ["MAVIC", "AUTEL EVO"], other: "JOYANCE JTC10" });
  });

  it("el catálogo no tiene valores repetidos", () => {
    const values = DRONE_SERIES_CATALOG.flatMap((b) => b.options.map((o) => o.value));
    expect(new Set(values).size).toBe(values.length);
  });
});
