import { useState } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import DiplomaGenerator from './DiplomaGenerator';
import DiplomaHistory from './DiplomaHistory';

export default function DiplomaWorkspace() {
  const { loading, hasPermission } = useUserPermissions();
  const [section, setSection] = useState<'create' | 'history'>('create');

  if (loading) return <p role="status" className="text-white">Verificando permisos...</p>;
  if (!hasPermission('create_diplomas')) {
    return <p role="alert" className="text-white">No tienes permiso para crear ni consultar diplomas.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3" aria-label="Secciones de diplomas">
        <Button type="button" aria-pressed={section === 'create'}
          variant={section === 'create' ? 'default' : 'outline'}
          onClick={() => setSection('create')}>Crear diploma</Button>
        <Button type="button" aria-pressed={section === 'history'}
          variant={section === 'history' ? 'default' : 'outline'}
          onClick={() => setSection('history')}>Consultar diplomas</Button>
      </div>
      <div hidden={section !== 'create'}><DiplomaGenerator /></div>
      {section === 'history' && <DiplomaHistory />}
    </div>
  );
}
