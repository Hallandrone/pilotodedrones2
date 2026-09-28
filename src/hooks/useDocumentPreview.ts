import { useRef, useState } from "react";
import type { DocumentPreviewState } from "@/components/DocumentPreviewDialog";

export interface DocumentPreviewTarget {
  /** Encabeza el diálogo; si tiene extensión de imagen, el documento se muestra con <img>. */
  fileName: string;
  description?: string;
  /** Mensaje que ve el usuario cuando no se pudo obtener la URL del documento. */
  errorMessage?: string;
}

interface PendingPreview extends DocumentPreviewTarget {
  loadUrl: () => Promise<string>;
}

const DEFAULT_ERROR_MESSAGE = "No se pudo cargar el documento. Inténtalo de nuevo.";

/**
 * Estado compartido de DocumentPreviewDialog.
 *
 * `openPreview` abre el diálogo de inmediato, en el mismo clic, y resuelve la
 * URL firmada después. Abrir una pestaña con window.open tras un await hacía
 * que Safari la bloqueara como ventana emergente y el documento nunca se
 * mostrara. Las respuestas tardías de un clic anterior o de un diálogo ya
 * cerrado se descartan.
 */
export const useDocumentPreview = () => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PendingPreview | null>(null);
  const [preview, setPreview] = useState<DocumentPreviewState>({ status: "loading" });
  const requestRef = useRef(0);

  const openPreview = async (nextTarget: DocumentPreviewTarget, loadUrl: () => Promise<string>) => {
    const requestId = ++requestRef.current;
    setTarget({ ...nextTarget, loadUrl });
    setPreview({ status: "loading" });
    setOpen(true);

    try {
      const url = await loadUrl();
      if (requestRef.current !== requestId) return;
      setPreview({ status: "ready", url });
    } catch (error) {
      console.error("Error al cargar la vista previa del documento:", error);
      if (requestRef.current !== requestId) return;
      setPreview({ status: "error", message: nextTarget.errorMessage ?? DEFAULT_ERROR_MESSAGE });
    }
  };

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) requestRef.current += 1; // ignora respuestas tardías
  };

  /** Props listas para `<DocumentPreviewDialog {...dialogProps} />`. */
  const dialogProps = {
    open,
    onOpenChange,
    fileName: target?.fileName ?? "",
    description: target?.description,
    preview,
    onRetry: target ? () => openPreview(target, target.loadUrl) : undefined,
  };

  return { openPreview, dialogProps };
};
