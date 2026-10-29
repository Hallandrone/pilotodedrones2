-- Biblioteca del planificador de misiones: rutas de waypoints de cada piloto.
-- waypoints: [{id, lon, lat, altura}] con la altura en metros sobre el despegue.
-- settings: {ajustes, despegue}. template_kmz: la misión de DJI Fly que el piloto
-- subió como plantilla (KMZ en base64, unos 2 KB) para volver a exportar sin subirla.
create table if not exists public.flight_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  waypoints jsonb not null default '[]'::jsonb check (jsonb_typeof(waypoints) = 'array'),
  settings jsonb not null default '{}'::jsonb,
  template_name text,
  template_kmz text check (template_kmz is null or octet_length(template_kmz) <= 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flight_missions is
  'Misiones de waypoints guardadas desde el planificador del área de piloto';

create index if not exists flight_missions_user_updated_idx
  on public.flight_missions (user_id, updated_at desc);

alter table public.flight_missions enable row level security;

create policy "Users can view their own missions"
  on public.flight_missions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own missions"
  on public.flight_missions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own missions"
  on public.flight_missions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own missions"
  on public.flight_missions for delete
  using (auth.uid() = user_id);

create trigger update_flight_missions_updated_at
  before update on public.flight_missions
  for each row
  execute function public.update_updated_at_column();
