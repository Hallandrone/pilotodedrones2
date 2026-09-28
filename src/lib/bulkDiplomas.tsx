import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { getBaseUrlClean } from "@/lib/getBaseUrl";
import DiplomaPDF, { type DiplomaData } from "@/components/DiplomaPDF";
import type { StudentRow } from "@/lib/studentList";

/** Datos del curso comunes a todos los diplomas del lote. */
export interface BulkDiplomaShared {
  courseDate: string;
  courseHours: string;
  courseTitle: string;
  instructorName: string;
  city: string;
  certificateNumber: string;
  droneSeries: string;
  startDate?: string;
  endDate?: string;
}

export interface IssuedDiploma {
  folio: number;
  token: string;
  studentName: string;
  fileName: string;
}

export interface BulkDiplomaOutcome {
  zip: Blob | null;
  zipName: string;
  issued: IssuedDiploma[];
  /** Alumno en el que se detuvo el lote y el motivo; los siguientes no se procesan. */
  failure: { studentName: string; reason: string } | null;
}

export type BulkProgress = (done: number, total: number, current: string) => void;

const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I, O, 1 ni 0 para evitar confusiones

/** Token de 8 caracteres y su código QR, como en el generador de un diploma. */
export const createQrToken = async (): Promise<{ token: string; dataUrl: string }> => {
  let token = "";
  for (let i = 0; i < 8; i++) token += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length));
  const dataUrl = await QRCode.toDataURL(`${getBaseUrlClean()}/qr/${token}`, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return { token, dataUrl };
};

export const studentFullName = (student: StudentRow): string =>
  [student.firstName, student.lastNamePaternal, student.lastNameMaternal].map((part) => part.trim()).filter(Boolean).join(" ");

export const safeFileName = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const nextFolio = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("next_diploma_folio");
  if (error) throw error;
  if (typeof data !== "number") throw new Error("Folio no válido");
  return data;
};

/**
 * Emite un diploma por alumno, en orden, repitiendo el ciclo del generador:
 * folio → token y QR → PDF → registro en la base (issue_diploma). El PDF se
 * genera antes de registrar para no dejar diplomas sin archivo; si el folio
 * ya fue tomado, se reintenta con el siguiente. Ante un fallo el lote se
 * detiene para que los folios queden correlativos y el resto pueda
 * reintentarse después.
 */
export const generateDiplomasBatch = async (
  students: StudentRow[],
  shared: BulkDiplomaShared,
  onProgress: BulkProgress,
): Promise<BulkDiplomaOutcome> => {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const issued: IssuedDiploma[] = [];
  let failure: BulkDiplomaOutcome["failure"] = null;

  for (const [index, student] of students.entries()) {
    const studentName = studentFullName(student);
    onProgress(index, students.length, studentName);
    try {
      let folio = await nextFolio();
      for (let attempt = 0; ; attempt++) {
        const { token, dataUrl } = await createQrToken();
        const data: DiplomaData = {
          ...shared,
          startDate: shared.startDate || undefined,
          endDate: shared.endDate || undefined,
          studentName,
          qrCodeDataUrl: dataUrl,
          correlativeNumber: folio,
          qrToken: token,
        };
        const blob = await pdf(<DiplomaPDF data={data} />).toBlob();

        const { data: result, error } = await supabase.rpc("issue_diploma", {
          p_diploma: {
            student_name: studentName,
            course_date: shared.courseDate,
            course_hours: shared.courseHours,
            course_title: shared.courseTitle,
            instructor_name: shared.instructorName,
            city: shared.city,
            certificate_number: shared.certificateNumber,
            drone_series: shared.droneSeries,
            start_date: shared.startDate || null,
            end_date: shared.endDate || null,
          },
          p_folio: folio,
          p_token: token,
        });
        if (error) throw error;

        if (result?.success) {
          const fileName = `Certificado_${folio}_${safeFileName(studentName)}.pdf`;
          zip.file(fileName, blob);
          issued.push({ folio, token, studentName, fileName });
          break;
        }
        if (result?.error === "folio_no_disponible" && typeof result.next_folio === "number" && attempt < 2) {
          folio = result.next_folio;
          continue;
        }
        throw new Error(result?.error || "Respuesta no válida");
      }
    } catch (error) {
      failure = { studentName, reason: error instanceof Error ? error.message : String(error) };
      break;
    }
  }
  onProgress(issued.length, students.length, "");

  const zipName = `Diplomas_${safeFileName(shared.courseTitle || "curso")}_${shared.courseDate || "sin-fecha"}.zip`;
  const zipBlob = issued.length > 0 ? await zip.generateAsync({ type: "blob" }) : null;
  return { zip: zipBlob, zipName, issued, failure };
};
