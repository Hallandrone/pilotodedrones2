import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Trash2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STUDENT_TEMPLATE_FILE_NAME,
  buildStudentTemplateXlsx,
  isStudentComplete,
  parseStudentFile,
  type StudentRow,
} from "@/lib/studentList";
import { generateDiplomasBatch, type BulkDiplomaOutcome, type BulkDiplomaShared } from "@/lib/bulkDiplomas";

interface BulkDiplomaUploadProps {
  shared: BulkDiplomaShared;
  /** Campos del curso que faltan en el formulario; con alguno pendiente no se puede generar. */
  missingShared: string[];
  onIssued: (outcome: BulkDiplomaOutcome) => void;
}

interface EditableRow extends StudentRow {
  id: number;
}

const FIELDS: Array<{ key: keyof StudentRow; label: string }> = [
  { key: "firstName", label: "Nombres" },
  { key: "lastNamePaternal", label: "Apellido Paterno" },
  { key: "lastNameMaternal", label: "Apellido Materno" },
];

const CELL_CLASS = "h-10 rounded-lg border-white/10 bg-white/5 text-sm text-white focus:border-[#00b3f3]";

let nextRowId = 1;

/**
 * Carga masiva: lista de alumnos desde CSV o Excel, revisión en tabla y
 * emisión de un diploma por alumno con los datos del curso del formulario.
 */
const BulkDiplomaUpload = ({ shared, missingShared, onIssued }: BulkDiplomaUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [outcome, setOutcome] = useState<(BulkDiplomaOutcome & { zipUrl: string | null }) | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);

  // La plantilla se arma al montar para que el enlace sea una descarga directa (Safari no la bloquea).
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    buildStudentTemplateXlsx()
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setTemplateUrl(url);
      })
      .catch((error) => console.error("No se pudo preparar la plantilla de alumnos:", error));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const incomplete = rows.filter((row) => !isStudentComplete(row)).length;
  const canGenerate = rows.length > 0 && incomplete === 0 && missingShared.length === 0 && !generating;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSourceName(file.name);
    setOutcome(null);
    try {
      const result = await parseStudentFile(file);
      setRows(result.students.map((student) => ({ ...student, id: nextRowId++ })));
      setWarnings(result.warnings);
    } catch (error) {
      console.error("Error al leer la lista de alumnos:", error);
      setRows([]);
      setWarnings([error instanceof Error ? error.message : "No se pudo leer el archivo."]);
    }
  };

  const updateRow = (id: number, field: keyof StudentRow, value: string) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

  const removeRow = (id: number) => setRows((prev) => prev.filter((row) => row.id !== id));

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const snapshot = rows;
    setGenerating(true);
    if (outcome?.zipUrl) URL.revokeObjectURL(outcome.zipUrl);
    setOutcome(null);
    setProgress({ done: 0, total: snapshot.length, current: "" });
    try {
      const result = await generateDiplomasBatch(snapshot, shared, (done, total, current) =>
        setProgress({ done, total, current }),
      );
      const zipUrl = result.zip ? URL.createObjectURL(result.zip) : null;
      setOutcome({ ...result, zipUrl });
      // Quedan en la lista los que no se emitieron, para reintentar tras corregir.
      setRows(snapshot.slice(result.issued.length));
      onIssued(result);
      if (zipUrl) {
        const link = document.createElement("a");
        link.href = zipUrl;
        link.download = result.zipName;
        link.click();
      }
    } catch (error) {
      console.error("Error en la carga masiva de diplomas:", error);
      setWarnings([error instanceof Error ? error.message : "No se pudo generar el lote."]);
    } finally {
      setGenerating(false);
    }
  };

  const folios = outcome?.issued.map((item) => item.folio) ?? [];

  return (
    <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users className="h-5 w-5 text-[#00b3f3]" />
            Carga masiva del curso
          </h3>
          <p className="text-sm text-white/60">
            Sube un CSV o Excel con las columnas <span className="text-white">Nombres</span>,{" "}
            <span className="text-white">Apellido Paterno</span> y <span className="text-white">Apellido Materno</span>. La fecha,
            las horas, la serie, el título, la ciudad y el número de certificado se toman del formulario de arriba. Se emite un
            diploma por alumno y se descargan todos en un ZIP.
          </p>
        </div>
        {templateUrl && (
          <a
            href={templateUrl}
            download={STUDENT_TEMPLATE_FILE_NAME}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#00b3f3] hover:underline"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Descargar plantilla Excel
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          disabled={generating}
          onClick={() => fileInputRef.current?.click()}
          className="h-12 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          <Upload className="mr-2 h-4 w-4" />
          Elegir archivo (CSV o Excel)
        </Button>
        {sourceName && (
          <span className="text-sm text-white/60">
            {sourceName} · {rows.length} alumno(s)
          </span>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          {warnings.map((warning) => (
            <p key={warning} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0f172a] text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="w-10 px-3 py-2">#</th>
                {FIELDS.map((field) => (
                  <th key={field.key} className="px-3 py-2">
                    {field.label}
                  </th>
                ))}
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className={`border-t border-white/5 ${isStudentComplete(row) ? "" : "bg-red-500/10"}`}>
                  <td className="px-3 py-1.5 text-white/40">{index + 1}</td>
                  {FIELDS.map((field) => (
                    <td key={field.key} className="px-2 py-1.5">
                      <Input
                        value={row[field.key]}
                        onChange={(e) => updateRow(row.id, field.key, e.target.value)}
                        disabled={generating}
                        aria-label={`${field.label} del alumno ${index + 1}`}
                        className={`${CELL_CLASS} ${row[field.key].trim() ? "" : "border-red-500/60"}`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={generating}
                      title="Quitar de la lista"
                      className="rounded-md p-1.5 text-white/40 transition hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          {missingShared.length > 0 && (
            <p className="text-sm text-amber-300">Completa antes en el formulario: {missingShared.join(", ")}.</p>
          )}
          {incomplete > 0 && <p className="text-sm text-red-300">{incomplete} fila(s) con campos vacíos, marcadas en rojo.</p>}
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="h-14 w-full rounded-2xl bg-[#00b3f3] text-lg font-bold text-white hover:bg-[#0099cc] disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generando {Math.min(progress.done + 1, progress.total)} de {progress.total}…
              </>
            ) : (
              <>Generar {rows.length} diploma(s) y descargar ZIP</>
            )}
          </Button>
          {generating && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[#00b3f3] transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
              {progress.current && <p className="text-xs text-white/50">{progress.current}</p>}
            </div>
          )}
        </div>
      )}

      {outcome && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          {outcome.issued.length > 0 && (
            <>
              <p className="flex items-center gap-2 font-semibold text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                {outcome.issued.length} diploma(s) emitidos, folios #{Math.min(...folios)} a #{Math.max(...folios)}.
              </p>
              {outcome.zipUrl && (
                <Button asChild className="h-12 rounded-xl bg-green-600 text-white hover:bg-green-700">
                  <a href={outcome.zipUrl} download={outcome.zipName}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar ZIP ({outcome.zipName})
                  </a>
                </Button>
              )}
              <p className="text-white/50">
                Los alumnos emitidos se quitaron de la lista. Cada diploma también se puede volver a descargar desde el historial.
              </p>
            </>
          )}
          {outcome.failure && (
            <p className="flex items-start gap-2 text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              El lote se detuvo en {outcome.failure.studentName}: {outcome.failure.reason}. Ese alumno y los siguientes siguen en
              la lista; corrige y vuelve a generar.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkDiplomaUpload;
