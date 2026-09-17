import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface Props {
  id: string;
  fileName: string;
  onDeleted: (id: string) => void;
}

export default function DeleteCertificationButton({ id, fileName, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inFlight = useRef(false);
  const { toast } = useToast();

  async function removeCertification() {
    if (inFlight.current) return;
    inFlight.current = true;
    setDeleting(true);
    setErrorMessage('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Tu sesión terminó. Inicia sesión y vuelve a intentarlo.');
      const { data, error } = await supabase.from('user_certifications')
        .delete().eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
      if (error) throw new Error('No se pudo eliminar el certificado. Inténtalo nuevamente.');
      if (!data) throw new Error('El certificado ya no existe o no pertenece a tu cuenta. Actualiza la página.');
      setOpen(false);
      toast({ title: 'Certificado eliminado', description: 'El certificado se quitó de tu perfil.' });
      onDeleted(id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar el certificado.');
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={value => {
      if (!inFlight.current) { setOpen(value); setErrorMessage(''); }
    }}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="outline"
          aria-label={'Eliminar certificado ' + fileName}
          className="text-red-500 border-red-500/40 hover:bg-red-500/10 hover:text-red-400">
          <Trash2 className="h-4 w-4 mr-2" />Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este certificado?</AlertDialogTitle>
          <AlertDialogDescription>
            Se quitará «{fileName}» de tu perfil. Si lo necesitas nuevamente, tendrás que volver a subirlo y solicitar su validación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && <p role="alert" className="text-sm text-red-500">{errorMessage}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={deleting} onClick={removeCertification}>
            {deleting ? 'Eliminando...' : 'Eliminar certificado'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
