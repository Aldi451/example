-- ============================================================================
-- Mie Ayam Wonogiri Mas Jon — skema Supabase
-- Jalankan seluruh file ini di Supabase Dashboard → SQL Editor → Run.
-- Aman dijalankan berulang (idempotent).
--
-- Model keamanan:
--   • Pengunjung (anon)  : HANYA boleh membaca store_live & insert orders.
--   • Admin (email+pass) : boleh baca/tulis store_draft, store_live, orders.
--   • service_role key   : TIDAK dipakai di front-end, jangan pernah disimpan di repo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabel konfigurasi situs
-- ---------------------------------------------------------------------------
create table if not exists public.store_live (
  id         smallint primary key default 1,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint store_live_single_row check (id = 1)
);

create table if not exists public.store_draft (
  id         smallint primary key default 1,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  constraint store_draft_single_row check (id = 1)
);

-- ---------------------------------------------------------------------------
-- 2. Tabel pesanan
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  service_type  text not null check (char_length(service_type) <= 60),
  note          text check (char_length(note) <= 200),
  items         jsonb not null,
  total         integer not null check (total >= 0 and total <= 10000000),
  status        text not null default 'baru'
                check (status in ('baru', 'diproses', 'selesai', 'batal')),
  source        text default 'supabase'
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.store_live  enable row level security;
alter table public.store_draft enable row level security;
alter table public.orders      enable row level security;

-- Publik: baca data live
drop policy if exists "store_live public read" on public.store_live;
create policy "store_live public read"
  on public.store_live for select
  to anon, authenticated
  using (true);

-- Admin: tulis data live (publish)
drop policy if exists "store_live admin write" on public.store_live;
create policy "store_live admin write"
  on public.store_live for all
  to authenticated
  using (true) with check (true);

-- Draft: hanya admin
drop policy if exists "store_draft admin only" on public.store_draft;
create policy "store_draft admin only"
  on public.store_draft for all
  to authenticated
  using (true) with check (true);

-- Pesanan: siapa pun boleh insert (pelanggan), hanya admin yang boleh baca/ubah
drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert"
  on public.orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update"
  on public.orders for update
  to authenticated
  using (true) with check (true);

drop policy if exists "orders admin delete" on public.orders;
create policy "orders admin delete"
  on public.orders for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 4. Seed data awal (isi dari config.json kamu)
-- ---------------------------------------------------------------------------
insert into public.store_live (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.store_draft (id, data)
select 1, data from public.store_live where id = 1
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. (Opsional) Anti-spam sederhana untuk pesanan publik
--    Batasi 1 pesanan per 10 detik per IP tidak bisa di RLS, tapi bisa lewat
--    Supabase Edge Function / rate limit dashboard. Minimal: trigger validasi.
-- ---------------------------------------------------------------------------
create or replace function public.validate_order_items()
returns trigger language plpgsql as $$
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'items harus array dan tidak kosong';
  end if;
  if jsonb_array_length(new.items) > 40 then
    raise exception 'terlalu banyak item dalam satu pesanan';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_validate_items on public.orders;
create trigger orders_validate_items
  before insert on public.orders
  for each row execute function public.validate_order_items();
