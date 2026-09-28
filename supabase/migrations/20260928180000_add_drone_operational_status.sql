-- Estado operacional de la aeronave. Se muestra en Gestión de Drones y en la
-- ficha pública que abre el código QR. Las filas existentes quedan operacionales.
alter table public.drones
  add column if not exists operational_status text not null default 'operational';

alter table public.drones
  drop constraint if exists drones_operational_status_check;

alter table public.drones
  add constraint drones_operational_status_check
  check (operational_status in ('operational', 'non_operational'));

comment on column public.drones.operational_status is
  'operational = apta para volar; non_operational = fuera de servicio (mantención, falla o baja)';
