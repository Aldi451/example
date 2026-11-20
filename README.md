# Mie Ayam Wonogiri Mas Jon — Website + Dashboard Admin

Website pemesanan warung mie ayam. Pesanan dikirim ke **WhatsApp**, sekaligus
dicatat ke **database MySQL** supaya pemilik punya riwayat. Dashboard admin
(dark-mode PIN untuk demo, login username/password untuk produksi).

Backend: **PHP + MySQL di InfinityFree** (gratis). Frontend: HTML/CSS/JS tanpa
framework, tanpa CDN eksternal.

---

## Dua mode

| | **Demo statis** (sekarang aktif) | **Produksi** |
|---|---|---|
| Backend | `config.json` + localStorage | PHP + MySQL (`api/`) |
| Hosting | GitHub Pages (bisa) | **Wajib** InfinityFree / hosting PHP |
| Login admin | PIN `1234` | Username + password (bcrypt) |
| Data menu | file `config.json` | tabel `settings` |
| Riwayat pesanan | browser admin | tabel `orders` |
| Upload foto | komentar manual di repo | upload dari dashboard |
| Atur di | `assets/js/env.js` → `backend: 'local'` | `backend: 'hosting'` |

> ⚠️ GitHub Pages **tidak menjalankan PHP**. Untuk mode produksi, situs harus
> dibuka dari domain InfinityFree. GitHub tetap dipakai untuk menyimpan kode.

Panduan deploy lengkap: **[`api-docs/INSTALL.md`](api-docs/INSTALL.md)**
Checklist keamanan: **[`api-docs/SECURITY.md`](api-docs/SECURITY.md)**

---

## Struktur

```
index.html                  # halaman pelanggan
admin.html                  # dashboard admin (6 tab)
config.json                 # data awal / fallback & mode demo
assets/
  css/style.css             # seluruh styling
  js/env.js                 # ⬅ penentu backend (local / hosting)
  js/core.js                # util + DB.* (satu pintu ke backend)
  js/app.js                 # keranjang, checkout WA, peta
  js/admin.js               # dashboard
  img/  menu/               # logo & foto menu (WebP)
api/                        # backend PHP
  config.example.php        # template kredensial → copy ke config.php
  schema.sql                # tabel MySQL (admins, settings, orders, login_attempts)
  setup.php                 # buat akun admin pertama (sekali pakai)
  auth.php  settings.php  orders.php  upload.php
  lib/                      # bootstrap, db, store, data
uploads/menu/               # foto hasil upload (tidak di-commit)
tools/
  make-hash.php             # buat hash password admin via CLI
  import-config.php         # impor config.json → database
scripts/validate-config.js  # validator config.json
api-docs/                   # INSTALL.md, SECURITY.md
```

## Alur kerja pemilik warung

**Mode demo:** buka `admin.html` → PIN → edit → *Simpan* → tab Publish → *Unduh config.json* → upload ke repo → commit.

**Mode produksi:** buka `admin.html` → login → edit → *Simpan* (draft) → *Publish*. Selesai, tanpa upload file.

## Menjalankan lokal

```bash
# frontend saja (mode demo)
python3 -m http.server 8080        # http://localhost:8080

# dengan PHP (uji backend)
cp api/config.example.php api/config.php   # isi db_driver: sqlite untuk tanpa MySQL
php -S localhost:8000                       # http://localhost:8000
```

> Uji backend paling praktis: jalankan dengan SQLite (`db_driver => 'sqlite'`) lalu
> import `api/schema.sql` versi SQLite (lihat bagian “Uji lokal tanpa MySQL” di `api-docs/INSTALL.md`).

## Keamanan

Backend sudah memakai prepared statement (anti SQL injection), CSRF token,
cookie `HttpOnly`+`SameSite=Strict`, hash bcrypt, rate-limit login (5×/15 menit),
validasi upload gambar, folder `uploads/` yang mematikan eksekusi script, dan
`.htaccess` untuk menyembunyikan `config.php` & `schema.sql`.
Frontend memakai `esc()`, `safeUrl()`, dan CSP meta.

Detail lengkap + tanggung jawab saat deploy: [`api-docs/SECURITY.md`](api-docs/SECURITY.md).

## Status demo (sengaja dikosongkan)

- Sosmed kosong → ikonnya disembunyikan otomatis.
- `mapsUrl` dummy → ganti dengan link asli.
- `adminPin` masih `1234` → tidak dipakai pada mode hosting.

## Roadmap

| Prioritas | Kebutuhan | Solusi |
|---|---|---|
| Tinggi | Deploy produksi | `api-docs/INSTALL.md` (InfinityFree) |
| Tinggi | Backup otomatis | GitHub Actions + export SQL, atau cron di hosting berbayar |
| Sedang | Notifikasi pesanan masuk | WhatsApp Cloud API / Fonnte di `orders.php` |
| Sedang | 2FA admin | TOTP di tabel `admins` |
| Sedang | QRIS | Static QRIS + konfirmasi manual |
| Rendah | Domain sendiri | `.my.id` + Cloudflare |

## Lisensi

Konten & foto menu: milik pemilik warung. Kode: bebas dipakai ulang.
