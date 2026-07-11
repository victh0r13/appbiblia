-- Esquema do app Bíblia — rode este arquivo no SQL Editor do painel Supabase.
-- Uma linha por usuário com favoritos, registro de leitura e perfil.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorites jsonb not null default '[]'::jsonb,
  reading_log jsonb not null default '{"chapters":[],"days":[]}'::jsonb,
  profile jsonb not null default '{"name":""}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Segurança: cada usuário só enxerga e altera a própria linha.
alter table public.user_data enable row level security;

create policy "select próprio" on public.user_data
  for select using (auth.uid() = user_id);

create policy "insert próprio" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "update próprio" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
