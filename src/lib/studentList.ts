import type JSZip from "jszip";

/**
 * Lectura de la lista de alumnos para la carga masiva de diplomas.
 *
 * Acepta CSV (separado por «;», «,» o tabulador, con o sin comillas, en UTF-8
 * o en la codificación de Excel para Windows) y .xlsx (primera hoja). Se
 * esperan tres columnas, Nombres, Apellido Paterno y Apellido Materno, que
 * se reconocen por su encabezado en cualquier orden; sin encabezado se asume
 * ese orden.
 */

export interface StudentRow {
  firstName: string;
  lastNamePaternal: string;
  lastNameMaternal: string;
}

export interface StudentListParseResult {
  students: StudentRow[];
  warnings: string[];
  headerDetected: boolean;
}

export interface StudentColumns {
  firstName: number;
  paternal: number;
  maternal: number;
}

/** Plantilla con «;», que es el separador que Excel en español usa al abrir y guardar CSV. */
export const STUDENT_TEMPLATE_CSV = "\uFEFFNombres;Apellido Paterno;Apellido Materno\r\nIsabel;Martínez;Armijo\r\n";

const DEFAULT_COLUMNS: StudentColumns = { firstName: 0, paternal: 1, maternal: 2 };

const stripAccents = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normalizeHeader = (text: string) => stripAccents(text).toLowerCase().replace(/[^a-z]+/g, " ").trim();
const cleanCell = (text: string) => text.replace(/\s+/g, " ").trim();

export const isStudentComplete = (student: StudentRow): boolean =>
  !!student.firstName.trim() && !!student.lastNamePaternal.trim() && !!student.lastNameMaternal.trim();

/** Ubica las columnas por su encabezado («Nombre(s)», «Apellido Paterno», «APELLIDO MATERNO»…). */
export const detectColumns = (header: string[]): StudentColumns | null => {
  const cells = header.map(normalizeHeader);
  const paternal = cells.findIndex((cell) => cell.includes("patern"));
  const maternal = cells.findIndex((cell) => cell.includes("matern"));
  const firstName = cells.findIndex((cell) => /^nombre/.test(cell) || cell === "name" || cell === "names" || cell === "first name");
  if (firstName < 0 || paternal < 0 || maternal < 0) return null;
  return { firstName, paternal, maternal };
};

const countChar = (text: string, char: string) => text.split(char).length - 1;

/**
 * CSV con comillas; el separador se elige por frecuencia en la primera línea.
 * Las comillas solo abren texto al inicio de una celda, y una comilla suelta
 * dentro de un nombre es texto: nunca se traga el resto del archivo.
 */
export const parseDelimited = (text: string): string[][] => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", "\t"].reduce(
    (best, candidate) => (countChar(firstLine, candidate) > countChar(firstLine, best) ? candidate : best),
    ";",
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let cellStarted = false;
  const endsCell = (char: string | undefined) => char === undefined || char === delimiter || char === "\n" || char === "\r";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          // Cierra la cita; si no le sigue el separador, la comilla era texto.
          quoted = false;
          if (!endsCell(text[i + 1])) cell += '"';
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && !cellStarted) {
      quoted = true;
      cellStarted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
      cellStarted = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      cellStarted = false;
    } else {
      cell += char;
      cellStarted = true;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

/** Convierte las filas crudas en alumnos, detectando encabezados y avisando de filas incompletas. */
export const rowsToStudents = (rows: string[][]): StudentListParseResult => {
  const nonEmpty = rows.map((row) => row.map(cleanCell)).filter((row) => row.some(Boolean));
  if (nonEmpty.length === 0) {
    return { students: [], warnings: ["El archivo no tiene filas con datos."], headerDetected: false };
  }

  const warnings: string[] = [];
  const detected = detectColumns(nonEmpty[0]);
  const columns = detected ?? DEFAULT_COLUMNS;
  const dataRows = detected ? nonEmpty.slice(1) : nonEmpty;
  if (!detected) {
    warnings.push(
      "No se encontró la fila de encabezados; se asume el orden Nombres, Apellido Paterno, Apellido Materno. Revisa la vista previa.",
    );
  }

  const students = dataRows.map((row) => ({
    firstName: row[columns.firstName] ?? "",
    lastNamePaternal: row[columns.paternal] ?? "",
    lastNameMaternal: row[columns.maternal] ?? "",
  }));
  const incomplete = students.filter((student) => !isStudentComplete(student)).length;
  if (incomplete > 0) {
    warnings.push(`${incomplete} fila(s) tienen algún campo vacío; complétalas o quítalas antes de generar.`);
  }
  return { students, warnings, headerDetected: detected !== null };
};

/** UTF-8 (con o sin BOM) y, si no es UTF-8 válido, la codificación de Excel para Windows. */
export const decodeTextFile = (buffer: ArrayBuffer): string => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
};

const decodeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&");

const columnIndex = (ref: string): number => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
};

const textOf = (xml: string) => Array.from(xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g), (m) => decodeXml(m[1])).join("");

/** Nombres de las hojas del libro, en su orden, y la ruta de la primera. */
const sheetInfo = async (zip: JSZip): Promise<{ names: string[]; firstPath: string }> => {
  const workbook = await zip.file("xl/workbook.xml")?.async("string");
  const rels = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  const sheets = workbook ? Array.from(workbook.matchAll(/<sheet\b([^>]*)\/?>/g), (m) => m[1]) : [];
  const names = sheets.map((attrs, index) => decodeXml(/\bname="([^"]*)"/.exec(attrs)?.[1] ?? `Hoja ${index + 1}`));
  const rid = sheets[0] ? /\br:id="([^"]+)"/.exec(sheets[0])?.[1] : undefined;
  let firstPath = "xl/worksheets/sheet1.xml";
  if (rid && rels) {
    const target =
      new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*\\bTarget="([^"]+)"`).exec(rels)?.[1] ??
      new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${rid}"`).exec(rels)?.[1];
    if (target) firstPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }
  return { names, firstPath };
};

export interface XlsxContent {
  rows: string[][];
  sheetNames: string[];
}

/** Primera hoja de un .xlsx: un ZIP con XML, así que basta JSZip y no hace falta SheetJS. */
export const parseXlsx = async (buffer: ArrayBuffer): Promise<XlsxContent> => {
  const { default: JSZipLib } = await import("jszip");
  const zip = await JSZipLib.loadAsync(buffer);

  const shared: string[] = [];
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  if (sharedXml) {
    for (const item of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(item[1]));
  }

  const { names, firstPath } = await sheetInfo(zip);
  const sheetXml = await zip.file(firstPath)?.async("string");
  if (!sheetXml) throw new Error("El archivo .xlsx no tiene una hoja legible.");

  const rows: string[][] = [];
  // Una fila vacía con formato viene autocerrada (<row r="5" .../>) y no debe absorber la siguiente.
  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] ?? "";
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      const index = ref ? columnIndex(ref) : row.length;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value = "";
      if (type === "s") value = rawValue ? (shared[Number(rawValue)] ?? "") : "";
      else if (type === "inlineStr") value = textOf(inner);
      else value = rawValue ? decodeXml(rawValue) : "";
      row[index] = value;
    }
    rows.push(Array.from(row, (value) => value ?? ""));
  }
  return { rows, sheetNames: names };
};

export const parseXlsxRows = async (buffer: ArrayBuffer): Promise<string[][]> => (await parseXlsx(buffer)).rows;

export const parseStudentFile = async (file: File): Promise<StudentListParseResult> => {
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // «PK»: un .xlsx es un ZIP
  if (!isZip && /\.xlsx?$/i.test(file.name)) {
    throw new Error("Este archivo de Excel no se puede leer; guárdalo como .xlsx o como CSV.");
  }
  if (!isZip) return rowsToStudents(parseDelimited(decodeTextFile(buffer)));

  const { rows, sheetNames } = await parseXlsx(buffer);
  const result = rowsToStudents(rows);
  if (sheetNames.length > 1) {
    result.warnings.unshift(
      `El archivo tiene ${sheetNames.length} hojas y solo se leyó la primera («${sheetNames[0]}»). Si los alumnos están en otra hoja, muévelos a la primera o guárdala como CSV.`,
    );
  }
  return result;
};
