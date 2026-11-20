# Migrasi ke Supabase (gratis)

Situs ini sudah disiapkan agar pindah backend **tanpa mengubah kode fitur** —
cukup isi `assets/js/env.js` dan jalankan SQL di bawah.

## Langkah

### 1. Buat project
1. Daftar di [supabase.com](https://supabase.com) → **New project** (plan Free).
2. Catat **Project URL** dan **anon public key** (Settings → API).

### 2. Buat tabel & policy
Buka **SQL Editor** → tempel seluruh isi `supabase/schema.sql` → **Run**.

### 3. Buat akun admin
**Authentication → Users → Add user** → isi email + password.
Matikan "Allow new users to sign up" di **Authentication → Providers → Email**
supaya orang tidak bisa mendaftar sendiri.

### 4. Isi konfigurasi awal
Ambil isi `config.json`, lalu:

```sql
insert into public.store_live (id, data) values (1, '<ISI_JSON_DISINI>'::jsonb)
on conflict (id) do update set data = excluded.data, updated_at = now();
```

### 5. Aktifkan mode produksi
Edit `assets/js/env.js`:

```js
{
  "backend": "supabase",
  "supabaseUrl": "https://xxxxxxxx.supabase.co",
  "supabaseAnonKey": "eyJhbGciOi..."
}
```

Selesai. Admin sekarang login dengan **email + password** (bukan PIN), dan tombol
**Publish** langsung mengubah data yang dilihat semua pengunjung.

## Yang berubah saat mode supabase aktif

| Fitur | Mode demo (`local`) | Mode Supabase |
|---|---|---|
| Login admin | PIN di `config.json` (publik) | Email + password (Supabase Auth) |
| Data menu | `config.json` + localStorage | tabel `store_live` / `store_draft` |
| Draft vs publish | tidak ada | ya — draft aman sebelum publish |
| Riwayat pesanan | browser admin saja | tabel `orders`, lihat di tab Pesanan |
| Upload gambar | path `assets/menu/...` | Supabase Storage (rekomendasi lanjutan) |

## Catatan keamanan

- **anon key boleh publik.** Itu memang kuncinya. Yang melindungi data adalah RLS.
- **service_role key jangan pernah** ditaruh di repo/frontend — itu bypass RLS.
- Kalau nanti upload foto, buat bucket Storage `menu` dengan policy:
  baca publik, tulis hanya `authenticated`. Lalu ganti `image` menjadi URL publik Storage.

## Batas plan Free (perlu diketahui sebelum jualan serius)

| Resource | Batas Free |
|---|---|
| Database | 500 MB |
| Bandwidth | 5 GB/bulan |
| Storage | 1 GB |
| Project pause | setelah 7 hari tanpa aktivitas (perlu di-unpause manual) |
| Backup otomatis | 7 hari (retensi terbatas) |

Untuk volume warung (puluhan pesanan/hari) ini jauh lebih dari cukup.
Kalau project ter-pause karena sepi, cukup buka dashboard Supabase → Restore.
