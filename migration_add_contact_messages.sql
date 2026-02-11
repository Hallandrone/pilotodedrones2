-- Create table for contact messages
create table if not exists public.contact_messages (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    name text not null,
    email text not null,
    subject text,
    message text not null,
    status text not null default 'pending', -- pending, read, replied
    constraint contact_messages_pkey primary key (id)
);

-- Enable RLS
alter table public.contact_messages enable row level security;

-- Policies
-- Allow anyone (anon) to insert messages
create policy "Anyone can insert contact messages"
    on public.contact_messages
    for insert
    to anon, authenticated
    with check (true);

-- Allow admins/service_role to select messages
create policy "Admins can view contact messages"
    on public.contact_messages
    for select
    to service_role
    using (true);
