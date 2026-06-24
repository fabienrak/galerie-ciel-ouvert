-- ════════════════════════════════════════════
--  Galerie à Ciel Ouvert — Schéma Supabase
-- ════════════════════════════════════════════

-- Table artistes
create table if not exists artistes (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  specialite  text,
  bio         text,
  photo_url   text,
  instagram   text,
  soundcloud  text,
  youtube     text,
  created_at  timestamptz default now()
);

-- Table fresques
create table if not exists fresques (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  titre           text not null,
  description     text,
  date_creation   date,
  lat             float8 not null,
  lng             float8 not null,
  adresse         text,
  photo_url       text,
  tags            text[],
  artiste_id      uuid references artistes(id) on delete set null,
  created_at      timestamptz default now()
);

-- Index géospatial (optionnel avec PostGIS)
-- create index on fresques using gist (ll_to_earth(lat, lng));

-- RLS : lecture publique
alter table artistes enable row level security;
alter table fresques  enable row level security;

create policy "Public read artistes" on artistes for select using (true);
create policy "Public read fresques" on fresques  for select using (true);

-- Écriture : uniquement authentifié (admin)
create policy "Auth insert artistes" on artistes for insert with check (auth.role() = 'authenticated');
create policy "Auth insert fresques" on fresques  for insert with check (auth.role() = 'authenticated');

-- Storage bucket pour les photos
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict do nothing;

create policy "Public photos" on storage.objects
  for select using (bucket_id = 'photos');
create policy "Auth upload photos" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
