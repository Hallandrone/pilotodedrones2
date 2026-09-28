import { describe, expect, it } from "vitest";
import { joinTextItems, parseRpaRegistration } from "./rpaRegistration";

/** Texto tal como lo entrega pdf.js para un certificado real de la DGAC. */
const CERTIFICATE_TEXT = `REGISTRO NACIONAL DE RPA
1) NRO.
REGISTRO
RPA-4448
2) MARCA / MODELO
DJI / FLYCART 30
3) NÚMERO DE SERIE
1581F7C6B23AT0013JRH
4) PESO DE
FABRICA
65,0 Kg.
5) NOMBRE DEL PROPIETARIO
HDRONES SPA
7) RUT : 77.271.219-7
6) DOMICILIO DEL PROPIETARIO
CAMINO LOS ECUESTRES 21, PADRE HURTADO
8) TELÉFONO : 56977461860
9) E-MAIL : info@academiadronchile.cl
Santiago de Chile, 06 de Septiembre de 2024
_______________________________________________
GUILLERMO GALLARDO AGÜERO
ENCARGADO SUBDEPARTAMENTO AERONAVEGABILIDAD
* Este registro no constituye autorización para operación del RPA
`;

describe("parseRpaRegistration", () => {
  it("lee registro, marca, modelo y serie del certificado de la DGAC", () => {
    expect(parseRpaRegistration(CERTIFICATE_TEXT)).toEqual({
      registrationNumber: "RPA-4448",
      brand: "DJI",
      model: "FLYCART 30",
      serialNumber: "1581F7C6B23AT0013JRH",
    });
  });

  it("tolera etiquetas en una sola línea, con dos puntos y sin acentos", () => {
    const text =
      "1) N° DE REGISTRO: RPA - 512 2) MARCA/MODELO: DJI / MATRICE 350 RTK " +
      "3) NUMERO DE SERIE: 1ZNBJ3K00C0123 4) PESO DE FABRICA 6,47 Kg.";
    expect(parseRpaRegistration(text)).toEqual({
      registrationNumber: "RPA-512",
      brand: "DJI",
      model: "MATRICE 350 RTK",
      serialNumber: "1ZNBJ3K00C0123",
    });
  });

  it("deja el modelo completo cuando no hay barra entre marca y modelo", () => {
    const text = "2) MARCA / MODELO\nAUTEL EVO II PRO\n3) NÚMERO DE SERIE\nABC123\n4) PESO";
    expect(parseRpaRegistration(text)).toMatchObject({ model: "AUTEL EVO II PRO", serialNumber: "ABC123" });
    expect(parseRpaRegistration(text).brand).toBeUndefined();
  });

  it("vuelve a unir un número de serie partido en dos líneas", () => {
    const text = "3) NÚMERO DE SERIE\n1581F7C6\nB23AT0013JRH\n4) PESO DE FABRICA";
    expect(parseRpaRegistration(text).serialNumber).toBe("1581F7C6B23AT0013JRH");
  });

  it("recurre a cualquier «RPA-1234» del texto si falta la etiqueta del registro", () => {
    const text = "Certificado de registro RPA 4448 emitido por la DGAC";
    expect(parseRpaRegistration(text).registrationNumber).toBe("RPA-4448");
  });

  it("no inventa datos con un PDF que no es el certificado", () => {
    expect(parseRpaRegistration("FACTURA ELECTRÓNICA N° 1234\nTotal $ 5.990.000")).toEqual({});
    expect(parseRpaRegistration("")).toEqual({});
  });
});

describe("joinTextItems", () => {
  it("respeta los saltos de línea de pdf.js e ignora los elementos sin texto", () => {
    const items = [
      { str: "1) NRO.", hasEOL: true },
      { type: "beginMarkedContent" },
      { str: "REGISTRO", hasEOL: false },
      { str: "", hasEOL: true },
      { str: "RPA-4448", hasEOL: false },
    ];
    expect(joinTextItems(items)).toBe("1) NRO.\nREGISTRO \nRPA-4448 ");
  });
});
