import { AlertCircle, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Estado de la vista previa. La URL firmada se obtiene de forma asíncrona,
 * así que el diálogo se abre de inmediato (en el mismo clic, para que ningún
 * navegador lo bloquee como ventana emergente) y muestra el documento cuando
 * la URL está lista.
 */
export type DocumentPreviewState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  description?: string;
  preview: DocumentPreviewState;
  onRetry?: () => void;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i;

/** Las imágenes se muestran con <img>; todo lo demás (PDF incluido) lo pinta el navegador dentro de un <iframe>. */
const isImageFile = (fileName: string, filePath?: string): boolean => {
  const candidates = [fileName, filePath?.split("?")[0]].filter((value): value is string => !!value);
  return candidates.some((value) => IMAGE_EXTENSIONS.test(value.trim()));
};

const DocumentPreviewDialog = ({
  open,
  onOpenChange,
  fileName,
  description,
  preview,
  onRetry,
}: DocumentPreviewDialogProps) => {
  const title = fileName || "Documento";
  // Algunas páginas abren el documento con una etiqueta en vez del nombre del archivo;
  // en ese caso la extensión se toma de la ruta de la URL firmada.
  const showAsImage = isImageFile(fileName, preview.status === "ready" ? preview.url : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-3 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">{title}</span>
          </DialogTitle>
          <DialogDescription>{description || "Vista previa del documento"}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-muted/40">
          {preview.status === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
              <p className="text-sm">Cargando documento…</p>
            </div>
          )}

          {preview.status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{preview.message}</p>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Reintentar
                </Button>
              )}
            </div>
          )}

          {preview.status === "ready" &&
            (showAsImage ? (
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                <img src={preview.url} alt={title} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <iframe src={preview.url} title={title} className="h-full w-full border-0 bg-white" />
            ))}
        </div>

        <DialogFooter className="border-t px-6 py-3 sm:justify-between">
          {preview.status === "ready" ? (
            <Button asChild variant="ghost" size="sm">
              <a href={preview.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir en pestaña nueva
              </a>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewDialog;
