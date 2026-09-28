import { useEffect, useState } from 'react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { getBaseUrlClean } from '@/lib/getBaseUrl';
import DiplomaPDF, { formatDateToSpanish, type DiplomaData } from '@/components/DiplomaPDF';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface IssuedDiploma {
  id: string;
  student_name: string;
  course_date: string;
  course_hours: string | null;
  course_title: string | null;
  instructor_name: string | null;
  city: string | null;
  certificate_number: string;
  correlative_number: number | null;
  drone_series: string | null;
  start_date: string | null;
  end_date: string | null;
  qr_token: string | null;
  qr_claimed?: boolean;
}
interface SearchResult { items: IssuedDiploma[]; total: number }

function DiplomaPreview({ diploma }: { diploma: IssuedDiploma }) {
  const [data, setData] = useState<DiplomaData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    async function prepare() {
      try {
        const qrCodeDataUrl = diploma.qr_token
          ? await QRCode.toDataURL(getBaseUrlClean() + '/qr/' + diploma.qr_token,
              { width: 200, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
          : '';
        if (!active) return;
        setData({
          studentName: diploma.student_name,
          courseDate: diploma.course_date,
          courseHours: diploma.course_hours || undefined,
          courseTitle: diploma.course_title || undefined,
          instructorName: diploma.instructor_name || '',
          city: diploma.city || undefined,
          certificateNumber: diploma.certificate_number,
          correlativeNumber: diploma.correlative_number ?? undefined,
          droneSeries: diploma.drone_series || undefined,
          startDate: diploma.start_date || undefined,
          endDate: diploma.end_date || undefined,
          qrToken: diploma.qr_token || undefined,
          qrCodeDataUrl,
        });
      } catch {
        if (active) setError(true);
      }
    }
    void prepare();
    return () => { active = false; };
  }, [diploma, retry]);

  if (error) return <div role="alert">No se pudo preparar el documento.
    <Button type="button" onClick={() => setRetry(n => n + 1)}>Reintentar</Button>
  </div>;
  if (!data) return <p role="status">Preparando documento...</p>;

  return (
    <div className="space-y-3">
      {!diploma.qr_token && <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-200">
        Este registro no tiene un QR guardado. Puedes revisar sus datos, pero no descargarlo como certificado válido.
      </p>}
      {!diploma.start_date && <p className="text-sm text-muted-foreground">
        Este registro no contiene la fecha de inicio del curso; no se añadirá una fecha estimada.
      </p>}
      {diploma.qr_token && <PDFDownloadLink
        document={<DiplomaPDF data={data} />}
        fileName={'Certificado_' + (diploma.correlative_number ?? diploma.id) + '.pdf'}
        className="inline-flex rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
      >
        {({ loading, error: pdfError }) => pdfError ? 'No se pudo generar el PDF' : loading ? 'Preparando PDF...' : 'Descargar PDF'}
      </PDFDownloadLink>}
      <PDFViewer title={'Diploma de ' + diploma.student_name} width="100%" height={520} showToolbar={false}>
        <DiplomaPDF data={data} />
      </PDFViewer>
    </div>
  );
}

interface DiplomaHistoryProps {
  /** Se llama tras eliminar un diploma; el folio liberado lo tomará el próximo que se emita. */
  onDeleted?: (info: { releasedFolio: number | null; nextFolio: number | null }) => void;
}

export default function DiplomaHistory({ onDeleted }: DiplomaHistoryProps) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<SearchResult>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<IssuedDiploma | null>(null);
  const [toDelete, setToDelete] = useState<IssuedDiploma | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toUnlink, setToUnlink] = useState<IssuedDiploma | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const { toast: showToast } = useToast();

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_issued_diploma', { p_diploma_id: toDelete.id });
      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || 'Respuesta no válida');
      const releasedFolio = typeof data.released_folio === 'number' ? data.released_folio : null;
      const nextFolio = typeof data.next_folio === 'number' ? data.next_folio : null;
      showToast({
        title: 'Diploma eliminado',
        description: releasedFolio != null
          ? `El folio #${releasedFolio} quedó libre` + (nextFolio != null ? `: el próximo diploma que se emita tomará el #${nextFolio}.` : '.')
          : 'El registro se eliminó. No tenía un folio reutilizable.',
      });
      onDeleted?.({ releasedFolio, nextFolio });
      if (selected?.id === toDelete.id) setSelected(null);
      setToDelete(null);
      setRefresh(n => n + 1);
    } catch (deleteError) {
      console.error('Error deleting diploma:', deleteError);
      showToast({
        title: 'No se pudo eliminar el diploma',
        description: 'Reintenta o verifica tus permisos.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Quita la asociación entre el QR y la cuenta del alumno que lo reclamó. El
  // diploma sigue válido y el QR queda libre para que lo reclame su titular.
  const confirmUnlink = async () => {
    if (!toUnlink?.qr_token || unlinking) return;
    setUnlinking(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('unlink_diploma_code', { p_token: toUnlink.qr_token });
      if (rpcError) throw rpcError;
      if (!data?.success) {
        const reasons: Record<string, string> = {
          not_found: 'El código QR de este diploma no existe.',
          not_claimed: 'Este QR ya no está asociado a ninguna cuenta.',
          forbidden: 'No tienes permiso para desvincular diplomas.',
        };
        throw new Error(reasons[String(data?.error)] || 'Respuesta no válida');
      }
      const unlinkedId = toUnlink.id;
      setResult(prev => ({ ...prev, items: prev.items.map(item => item.id === unlinkedId ? { ...item, qr_claimed: false } : item) }));
      showToast({
        title: 'QR desvinculado',
        description: data.plan_downgraded
          ? 'El diploma ya no aparece en el perfil del alumno; era su único diploma, así que su Plan Alumno Academia quedó desactivado.'
          : 'El diploma ya no aparece en el perfil del alumno; el código QR puede volver a reclamarse.',
      });
      setToUnlink(null);
    } catch (unlinkError) {
      console.error('Error unlinking diploma:', unlinkError);
      showToast({
        title: 'No se pudo desvincular el QR',
        description: unlinkError instanceof Error ? unlinkError.message : 'Reintenta o verifica tus permisos.',
        variant: 'destructive',
      });
    } finally {
      setUnlinking(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setResult({ items: [], total: 0 });
    async function fetchHistory() {
      try {
        const { data, error: queryError } = await supabase.rpc('search_issued_diplomas', {
          p_search: search, p_page: page,
        });
        if (queryError) throw queryError;
        if (!data || !Array.isArray(data.items) || typeof data.total !== 'number') {
          throw new Error('Respuesta no válida');
        }
        if (active) setResult(data as SearchResult);
      } catch {
        if (active) setError('No se pudieron consultar los diplomas. Reintenta o verifica tus permisos.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchHistory();
    return () => { active = false; };
  }, [search, page, refresh]);

  const totalPages = Math.max(1, Math.ceil(result.total / 20));
  return (
    <section className="space-y-5 text-white">
      <div>
        <h1 className="text-3xl font-bold">Consultar diplomas</h1>
        <p className="mt-2 text-white/70">Busca los certificados emitidos para volver a visualizarlos o descargar su PDF.</p>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault(); setPage(0); setSearch(input.trim()); setRefresh(n => n + 1);
      }}>
        <div className="min-w-0 flex-1">
          <Label htmlFor="diploma-search">Alumno, folio, curso, ciudad o número AOC</Label>
          <Input id="diploma-search" value={input} maxLength={200}
            onChange={event => setInput(event.target.value)}
            placeholder="Ej.: nombre del alumno o #14600" className="mt-2 bg-white/5 border-white/20" />
        </div>
        <Button type="submit" disabled={loading}>Buscar</Button>
        <Button type="button" variant="outline" disabled={loading} onClick={() => {
          setInput(''); setSearch(''); setPage(0); setRefresh(n => n + 1);
        }}>Mostrar todos</Button>
      </form>
      <div aria-live="polite">
        {loading ? <p role="status">Buscando diplomas...</p> : error ? (
          <div role="alert" className="space-y-3">
            <p>{error}</p>
            <Button type="button" onClick={() => setRefresh(n => n + 1)}>Reintentar</Button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-white/70">{result.total} {result.total === 1 ? 'diploma encontrado' : 'diplomas encontrados'}</p>
            {result.items.length === 0 ? <p>No hay diplomas para esta búsqueda.</p> : (
              <div className="overflow-x-auto rounded-xl border border-white/15">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10"><tr>
                    <th scope="col" className="p-3">Folio</th><th scope="col" className="p-3">Alumno</th>
                    <th scope="col" className="p-3">Curso</th><th scope="col" className="p-3">Emisión</th>
                    <th scope="col" className="p-3">Acción</th>
                  </tr></thead>
                  <tbody>{result.items.map(diploma => <tr key={diploma.id} className="border-t border-white/10">
                    <td className="p-3">{diploma.correlative_number != null ? '#' + diploma.correlative_number : 'Sin folio'}</td>
                    <td className="p-3">{diploma.student_name}</td>
                    <td className="p-3">{diploma.course_title || 'Sin título'}</td>
                    <td className="p-3">{formatDateToSpanish(diploma.course_date)}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline"
                        aria-label={'Ver diploma de ' + diploma.student_name}
                        onClick={() => setSelected(diploma)}>Ver diploma</Button>
                      {diploma.qr_claimed && diploma.qr_token && <Button type="button" variant="outline"
                        className="border-amber-400/50 text-amber-200 hover:bg-amber-500/10 hover:text-amber-100"
                        aria-label={'Desvincular el QR del diploma de ' + diploma.student_name}
                        onClick={() => setToUnlink(diploma)}>Desvincular QR</Button>}
                      <Button type="button" variant="destructive"
                        aria-label={'Eliminar diploma de ' + diploma.student_name}
                        onClick={() => setToDelete(diploma)}>Eliminar</Button>
                    </div></td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={loading || page === 0}
          onClick={() => setPage(n => n - 1)}>Anterior</Button>
        <span>{loading || error ? 'Página ' + (page + 1) : 'Página ' + (page + 1) + ' de ' + totalPages}</span>
        <Button type="button" variant="outline" disabled={loading || !!error || page + 1 >= totalPages}
          onClick={() => setPage(n => n + 1)}>Siguiente</Button>
      </div>
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Diploma de ' + selected.student_name : 'Diploma'}</DialogTitle>
            <DialogDescription>Vista del registro guardado, con su folio y código QR originales. Consultarlo no genera un diploma nuevo.</DialogDescription>
          </DialogHeader>
          {selected && <DiplomaPreview key={selected.id} diploma={selected} />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={toDelete !== null} onOpenChange={open => { if (!open && !deleting) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toDelete ? '¿Eliminar el diploma ' + (toDelete.correlative_number != null ? '#' + toDelete.correlative_number + ' ' : '') + 'de ' + toDelete.student_name + '?' : '¿Eliminar diploma?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {toDelete && <p>{(toDelete.course_title || 'Sin título') + ', emitido el ' + formatDateToSpanish(toDelete.course_date) + '.'} El registro y su código QR dejarán de ser válidos, así que el PDF ya entregado no podrá verificarse.</p>}
                {toDelete?.correlative_number != null
                  ? <p>El folio #{toDelete.correlative_number} quedará libre y lo tomará el próximo diploma que se emita; después la numeración continúa donde iba.</p>
                  : <p>Este registro no tiene folio, así que no libera ningún número.</p>}
                {toDelete?.qr_claimed && <p className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-200">
                  Un alumno ya reclamó el código QR de este diploma: desaparecerá de su perfil hasta que reclame el código del diploma corregido.
                </p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={event => { event.preventDefault(); void confirmDelete(); }}>
              {deleting ? 'Eliminando...' : 'Eliminar diploma'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={toUnlink !== null} onOpenChange={open => { if (!open && !unlinking) setToUnlink(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toUnlink ? '¿Desvincular el QR del diploma ' + (toUnlink.correlative_number != null ? '#' + toUnlink.correlative_number + ' ' : '') + 'de ' + toUnlink.student_name + '?' : '¿Desvincular QR?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {toUnlink && <p>{(toUnlink.course_title || 'Sin título') + ', emitido el ' + formatDateToSpanish(toUnlink.course_date) + '.'} El diploma sigue siendo válido y conserva su folio y su QR; solo deja de estar asociado a la cuenta que lo reclamó.</p>}
                <p>El diploma desaparecerá del perfil de ese alumno y el código QR quedará libre para que lo reclame su titular.</p>
                <p className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-200">
                  Si era el único diploma asociado a esa cuenta y su Plan Alumno Academia provenía de él, el plan volverá a Free.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={unlinking}
              onClick={event => { event.preventDefault(); void confirmUnlink(); }}>
              {unlinking ? 'Desvinculando...' : 'Desvincular QR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
