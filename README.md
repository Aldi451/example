# Mie Ayam Wonogiri Mas Jon — Website & Dashboard Admin

Website pemesanan statis (tanpa server, tanpa biaya hosting) + dashboard admin.
Pesanan dikirim ke WhatsApp; opsional dicatat ke database untuk riwayat.
Arsitektur disiapkan agar bisa pindah ke **Supabase** (gratis) tanpa mengubah kode fitur.

**Live:** https://aldi451.github.io/example/

---

## Struktur

```
index.html                  # halaman pelanggan
admin.html                  # dashboard admin
config.json                 # data toko (mode demo = "database" situs)
assets/
  css/style.css             # styling (tanpa framework CDN)
  js/env.js                 # penentu backend: local / supabase   ← mulai dari sini
  js/core.js                # util + lapisan data DB.* (satu pintu ke backend)
  js/app.js                 # keranjang, checkout WhatsApp, peta
  js/admin.js               # dashboard: profil, menu, layanan, sosmed, pesanan, publish
  img/  menu/               # logo & foto menu (WebP, sudah dikompres)
supabase/
  schema.sql                # tabel + RLS + trigger (jalankan di SQL Editor)
  README.md                 # panduan migrasi langkah demi langkah
  hardening.md              # checklist keamanan wajib sebelum go-live
scripts/validate-config.js  # validator config.json
```

## Dua mode backend

| | Mode demo (sekarang) | Mode Supabase |
|---|---|---|
| Atur di | `assets/js/env.js` → `backend: "local"` | `backend: "supabase"` + isi URL & anon key |
| Login admin | PIN (default `1234`) | Email + password (Supabase Auth) |
| Data menu | `config.json` + localStorage | tabel `store_live` / `store_draft` |
| Draft vs publish | tidak ada | ada — aman edit sebelum publish |
| Riwayat pesanan | browser admin saja | tabel `orders` |
| Biaya | Rp 0 | Rp 0 (plan Free) |

Panduan lengkap: [`supabase/README.md`](supabase/README.md).

## Alur kerja pemilik warung

### Mode demo (sekarang)
1. Buka `admin.html`, masukkan PIN.
2. Ubah profil / menu / harga / layanan / sosmed → **Simpan**.
3. Tab **Publish / Backup** → **Unduh config.json** → upload ke repo (menimpa `config.json`) → commit.
4. ±1 menit kemudian GitHub Pages build otomatis.

### Mode Supabase (nanti)
1. Login email + password.
2. Edit → **Simpan** (masuk draft) → **Publish**.
3. Selesai. Tanpa upload file, tanpa commit.

## Menambah foto menu

1. Simpan ke `assets/menu/`, nama huruf kecil tanpa spasi, mis. `mie-ayam-jumbo.webp`.
2. Rasio **4:3**, lebar 880 px, WebP, < 150 KB:
   ```bash
   convert foto.jpg -resize 880x660^ -gravity center -extent 880x660 -strip -quality 80 assets/menu/nama.webp
   ```
3. Isi kolom **Gambar** di dashboard: `assets/menu/nama.webp`.

## Menjalankan lokal

```bash
python3 -m http.server 8080     # buka http://localhost:8080
node scripts/validate-config.js # cek config.json sebelum commit
```

Harus lewat server (bukan dobel-klik `index.html`) karena `config.json` diambil via `fetch`.

## Keamanan yang sudah terpasang

- **CSP** via meta: `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`.
- **Anti-XSS**: semua data eksternal lewat `esc()` sebelum `innerHTML`; input HTML tidak tereksekusi.
- **Anti `javascript:`**: semua URL lewat `safeUrl()` yang hanya meloloskan http/https.
- **Validasi sisi klien** pada semua form + validasi struktur via `scripts/validate-config.js`.
- **RLS** di `supabase/schema.sql`: anon hanya bisa baca `store_live` & insert `orders`.
- **PIN/anon key bukan rahasia** — jangan pernah taruh `service_role` key di repo.

Checklist go-live: [`supabase/hardening.md`](supabase/hardening.md).

## Status demo (sengaja dikosongkan)

- `socmed.instagram` / `facebook` / `whatsapp` = `""` → ikonnya disembunyikan otomatis.
- `mapsUrl` = link dummy Google Maps → ganti dengan link asli saat toko siap online.
- `adminPin` masih `1234` → ganti sebelum dipakai sungguhan.

## Roadmap

| Prioritas | Kebutuhan | Solusi |
|---|---|---|
| Tinggi | Pindah ke database | Supabase (SQL & panduan sudah siap) |
| Tinggi | Upload foto dari HP | Supabase Storage bucket `menu` |
| Sedang | Anti-spam pesanan | Cloudflare Turnstile + Edge Function |
| Sedang | Notifikasi pesanan masuk | WhatsApp Cloud API / Fonnte |
| Sedang | Pembayaran QRIS | Midtrans/Xendit static QRIS |
| Rendah | SEO lokal | Google Business Profile + schema.org `Restaurant` |

## Lisensi

Konten & foto menu: milik pemilik warung. Kode: bebas dipakai ulang.
