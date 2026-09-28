import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  buildStudentTemplateXlsx,
  decodeTextFile,
  detectColumns,
  parseDelimited,
  parseXlsx,
  parseXlsxRows,
  rowsToStudents,
  STUDENT_TEMPLATE_HEADERS,
} from "./studentList";

describe("parseDelimited", () => {
  it("lee CSV con punto y coma, comillas y saltos CRLF", () => {
    const text = 'Nombres;Apellido Paterno;Apellido Materno\r\n"Isabel";Martínez;Armijo\r\n"Juan ""Pepe""";Pérez;"Soto; Díaz"\r\n';
    expect(parseDelimited(text)).toEqual([
      ["Nombres", "Apellido Paterno", "Apellido Materno"],
      ["Isabel", "Martínez", "Armijo"],
      ['Juan "Pepe"', "Pérez", "Soto; Díaz"],
    ]);
  });

  it("una comilla suelta dentro de un nombre no se traga el resto del archivo", () => {
    const lines = ["Nombres;Apellido Paterno;Apellido Materno"];
    for (let i = 1; i <= 25; i++) lines.push(`Alumno ${i};Apellido;Materno`);
    lines[20] = `Juan "Pepe;Apellido;Materno`; // comilla suelta en la fila 20
    const rows = parseDelimited(lines.join("\r\n"));
    expect(rows).toHaveLength(26);
    expect(rows[20]).toEqual(['Juan "Pepe', "Apellido", "Materno"]);
    expect(rows[25]).toEqual(["Alumno 25", "Apellido", "Materno"]);
  });

  it("una comilla de cierre seguida de texto es literal", () => {
    expect(parseDelimited('"Isa"bel;Martínez;Armijo')).toEqual([['Isa"bel', "Martínez", "Armijo"]]);
  });

  it("elige la coma o el tabulador cuando predominan", () => {
    expect(parseDelimited("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseDelimited("a\tb\tc\n1\t2\t3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
  });
});

describe("detectColumns", () => {
  it("reconoce los encabezados en cualquier orden, con acentos y mayúsculas", () => {
    expect(detectColumns(["APELLIDO MATERNO", "Nombre(s)", "Apellido paterno"])).toEqual({ firstName: 1, paternal: 2, maternal: 0 });
    expect(detectColumns(["Nombres", "Ap. Paterno", "Ap. Materno"])).toEqual({ firstName: 0, paternal: 1, maternal: 2 });
  });

  it("devuelve null si falta alguna columna", () => {
    expect(detectColumns(["Nombre", "Apellidos"])).toBeNull();
    expect(detectColumns(["Isabel", "Martínez", "Armijo"])).toBeNull();
  });
});

describe("rowsToStudents", () => {
  it("usa los encabezados para ordenar las columnas y descarta filas vacías", () => {
    const result = rowsToStudents([
      ["Apellido Materno", "Nombres", "Apellido Paterno"],
      ["Armijo", " Isabel ", "Martínez"],
      ["", "", ""],
      ["Soto", "Juan  Pablo", "Pérez"],
    ]);
    expect(result.headerDetected).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.students).toEqual([
      { firstName: "Isabel", lastNamePaternal: "Martínez", lastNameMaternal: "Armijo" },
      { firstName: "Juan Pablo", lastNamePaternal: "Pérez", lastNameMaternal: "Soto" },
    ]);
  });

  it("sin encabezados asume Nombres, Paterno, Materno y avisa", () => {
    const result = rowsToStudents([["Isabel", "Martínez", "Armijo"]]);
    expect(result.headerDetected).toBe(false);
    expect(result.students).toEqual([{ firstName: "Isabel", lastNamePaternal: "Martínez", lastNameMaternal: "Armijo" }]);
    expect(result.warnings[0]).toMatch(/No se encontró la fila de encabezados/);
  });

  it("avisa de las filas incompletas", () => {
    const result = rowsToStudents([["Nombres", "Apellido Paterno", "Apellido Materno"], ["Isabel", "Martínez", ""]]);
    expect(result.warnings).toEqual(["1 fila(s) tienen algún campo vacío; complétalas o quítalas antes de generar."]);
  });

  it("los encabezados de la plantilla se reconocen", () => {
    expect(detectColumns([...STUDENT_TEMPLATE_HEADERS])).toEqual({ firstName: 0, paternal: 1, maternal: 2 });
  });
});

describe("decodeTextFile", () => {
  it("quita el BOM de UTF-8 y entiende la codificación de Excel para Windows", () => {
    const utf8 = new TextEncoder().encode("\uFEFFMartínez").buffer;
    expect(decodeTextFile(utf8)).toBe("Martínez");
    const windows1252 = new Uint8Array([0x4d, 0x61, 0x72, 0x74, 0xed, 0x6e, 0x65, 0x7a]).buffer; // «Martínez»
    expect(decodeTextFile(windows1252)).toBe("Martínez");
  });
});

describe("parseXlsxRows", () => {
  it("lee la primera hoja de un .xlsx con cadenas compartidas y en línea", async () => {
    const zip = new JSZip();
    zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="Alumnos" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet7.xml"/></Relationships>');
    zip.file("xl/sharedStrings.xml", "<sst><si><t>Nombres</t></si><si><t>Apellido Paterno</t></si><si><t>Apellido Materno</t></si><si><r><t>Mar</t></r><r><t>tínez</t></r></si></sst>");
    zip.file(
      "xl/worksheets/sheet7.xml",
      '<worksheet><sheetData>' +
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
        '<row r="2"><c r="A2" t="inlineStr"><is><t>Isabel</t></is></c><c r="B2" t="s"><v>3</v></c><c r="C2" t="inlineStr"><is><t>Armijo &amp; Cía</t></is></c></row>' +
        '<row r="3"><c r="A3" t="inlineStr"><is><t>Juan</t></is></c><c r="C3" t="inlineStr"><is><t>Soto</t></is></c></row>' +
        "</sheetData></worksheet>",
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const rows = await parseXlsxRows(buffer);
    expect(rows).toEqual([
      ["Nombres", "Apellido Paterno", "Apellido Materno"],
      ["Isabel", "Martínez", "Armijo & Cía"],
      ["Juan", "", "Soto"],
    ]);
    expect(rowsToStudents(rows).students[1]).toEqual({ firstName: "Juan", lastNamePaternal: "", lastNameMaternal: "Soto" });
  });

  it("una fila vacía autocerrada no absorbe la siguiente, y se informan las hojas", async () => {
    const zip = new JSZip();
    zip.file("xl/workbook.xml", '<workbook><sheets><sheet name="Curso" sheetId="1" r:id="rId1"/><sheet name="Notas" sheetId="2" r:id="rId2"/></sheets></workbook>');
    zip.file("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="worksheets/sheet2.xml"/></Relationships>');
    const cell = (ref: string, text: string) => `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
    let sheet = "<worksheet><sheetData>";
    sheet += `<row r="1">${cell("A1", "Nombres")}${cell("B1", "Apellido Paterno")}${cell("C1", "Apellido Materno")}</row>`;
    for (let i = 2; i <= 21; i++) sheet += `<row r="${i}">${cell(`A${i}`, `Alumno ${i - 1}`)}${cell(`B${i}`, "Paterno")}${cell(`C${i}`, "Materno")}</row>`;
    sheet += '<row r="22" ht="15" customHeight="1"/>'; // fila vacía con formato
    for (let i = 23; i <= 27; i++) sheet += `<row r="${i}">${cell(`A${i}`, `Alumno ${i - 2}`)}${cell(`B${i}`, "Paterno")}${cell(`C${i}`, "Materno")}</row>`;
    sheet += "</sheetData></worksheet>";
    zip.file("xl/worksheets/sheet1.xml", sheet);
    zip.file("xl/worksheets/sheet2.xml", "<worksheet><sheetData/></worksheet>");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const { rows, sheetNames } = await parseXlsx(buffer);
    expect(sheetNames).toEqual(["Curso", "Notas"]);
    const students = rowsToStudents(rows).students;
    expect(students).toHaveLength(25);
    expect(students[24].firstName).toBe("Alumno 25");
  });
});

describe("buildStudentTemplateXlsx", () => {
  it("genera un .xlsx válido que el propio lector entiende: solo encabezados, sin alumnos", async () => {
    const blob = await buildStudentTemplateXlsx();
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const buffer = await blob.arrayBuffer();
    expect(String.fromCharCode(...new Uint8Array(buffer.slice(0, 2)))).toBe("PK");

    const zip = await JSZip.loadAsync(buffer);
    for (const part of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]) {
      expect(zip.file(part), part).not.toBeNull();
    }

    const { rows, sheetNames } = await parseXlsx(buffer);
    expect(sheetNames).toEqual(["Alumnos"]);
    expect(rows).toEqual([["Nombres", "Apellido Paterno", "Apellido Materno"]]);
    const result = rowsToStudents(rows);
    expect(result.headerDetected).toBe(true);
    expect(result.students).toEqual([]);
  });
});
