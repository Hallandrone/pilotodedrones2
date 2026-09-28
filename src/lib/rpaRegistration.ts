/**
 * Lectura del Certificado de Registro Nacional de RPA (DGAC).
 *
 * El PDF que entrega la DGAC trae campos numerados, cada uno con su
 * etiqueta seguida del valor:
 *
 *   1) NRO. REGISTRO        RPA-4448
 *   2) MARCA / MODELO       DJI / FLYCART 30
 *   3) NÚMERO DE SERIE      1581F7C6B23AT0013JRH
 *   4) PESO DE FABRICA      65,0 Kg.
 *   5) NOMBRE DEL PROPIETARIO …
 *
 * El texto se extrae en el navegador con pdf.js y se interpreta por
 * etiquetas, así que tolera saltos de línea y cambios de maquetación.
 */

export interface RpaRegistrationData {
  /** Número de registro tal como lo escribe la DGAC, p. ej. «RPA-4448». */
  registrationNumber?: string;
  /** Marca, p. ej. «DJI». */
  brand?: string;
  /** Modelo, p. ej. «FLYCART 30». */
  model?: string;
  /** Número de serie de la aeronave. */
  serialNumber?: string;
}

/** Une los fragmentos de texto de pdf.js respetando sus saltos de línea. */
export const joinTextItems = (items: ReadonlyArray<unknown>): string => {
  let text = "";
  for (const item of items) {
    if (typeof item !== "object" || item === null || !("str" in item)) continue;
    const { str, hasEOL } = item as { str: unknown; hasEOL?: unknown };
    if (typeof str !== "string") continue;
    text += str;
    text += hasEOL ? "\n" : " ";
  }
  return text;
};

const NUMBER_WORD = String.raw`N(?:RO|ÚMERO|UMERO|°|º)?\.?`;

/** Etiquetas de los campos que interesan al formulario. */
const LABELS = {
  registrationNumber: new RegExp(String.raw`1\)\s*${NUMBER_WORD}\s*(?:DE\s+)?REGISTRO\s*:?\s*`, "i"),
  brandModel: new RegExp(String.raw`2\)\s*MARCA\s*/?\s*MODELO\s*:?\s*`, "i"),
  serialNumber: new RegExp(String.raw`3\)\s*${NUMBER_WORD}\s*DE\s+SERIE\s*:?\s*`, "i"),
};

/** Una etiqueta numerada («4) PESO…») marca el fin del valor anterior. */
const NEXT_LABEL = /\s+\d{1,2}\)\s+/;

/** Valor que sigue a una etiqueta, hasta la siguiente etiqueta numerada. */
const fieldValue = (text: string, label: RegExp): string | undefined => {
  const match = label.exec(text);
  if (!match) return undefined;
  const rest = text.slice(match.index + match[0].length);
  const value = rest.split(NEXT_LABEL)[0].trim();
  return value || undefined;
};

const normalizeRegistration = (value: string): string =>
  value.toUpperCase().replace(/\s*[-–]\s*/g, "-").replace(/\s+/g, "-");

/** El número de serie es un solo token; si pdf.js lo partió, se vuelve a unir. */
const normalizeSerial = (value: string): string => {
  const tokens = value.split(" ");
  return tokens.every((token) => /^[A-Z0-9-]+$/i.test(token)) ? tokens.join("") : tokens[0];
};

export const parseRpaRegistration = (rawText: string): RpaRegistrationData => {
  const text = rawText.replace(/\s+/g, " ").trim();
  const data: RpaRegistrationData = {};

  const registration = fieldValue(text, LABELS.registrationNumber);
  if (registration) {
    data.registrationNumber = normalizeRegistration(registration);
  } else {
    // Sin etiqueta reconocible, vale cualquier «RPA-1234» del documento.
    const fallback = /\bRPA\s*[-–]?\s*(\d{2,6})\b/i.exec(text);
    if (fallback) data.registrationNumber = `RPA-${fallback[1]}`;
  }

  const brandModel = fieldValue(text, LABELS.brandModel);
  if (brandModel) {
    const [brand, ...modelParts] = brandModel.split(/\s*\/\s*/);
    if (modelParts.length > 0) {
      data.brand = brand;
      data.model = modelParts.join(" ");
    } else {
      data.model = brandModel;
    }
  }

  const serial = fieldValue(text, LABELS.serialNumber);
  if (serial) data.serialNumber = normalizeSerial(serial);

  return data;
};

/**
 * Extrae el texto de un PDF en el navegador. pdf.js se carga bajo demanda
 * (solo cuando se sube un certificado) en su versión «legacy», que incluye
 * los polyfills que Safari necesita.
 */
export const extractPdfText = async (file: Blob): Promise<string> => {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(joinTextItems(content.items));
    }
    return pages.join("\n");
  } finally {
    await loadingTask.destroy();
  }
};
