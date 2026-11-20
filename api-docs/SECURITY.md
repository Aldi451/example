# Keamanan backend PHP — apa yang sudah dipasang

Dokumen ini menjelaskan proteksi yang ada di `api/` dan apa yang masih jadi
tanggung jawab kamu saat deploy.

## Sudah otomatis

| Risiko | Proteksi | Lokasi |
|---|---|---|
| SQL Injection | 100% prepared statement (PDO), tidak ada string concat | `lib/db.php` |
| XSS | Data disanitasi di server + `esc()` di frontend | `lib/data.php`, `core.js` |
| CSRF | Token per sesi, wajib di semua POST admin (`X-CSRF-Token`) + cek Origin | `lib/bootstrap.php` |
| Session hijacking | Cookie `HttpOnly` + `SameSite=Strict` + `Secure` saat HTTPS, `session_regenerate_id` saat login | `lib/bootstrap.php`, `auth.php` |
| Brute-force login | Maks 5 gagal / 15 menit per IP, dicatat di `login_attempts` | `auth.php` |
| Password lemah | Hash bcrypt (`password_hash`), min 10 karakter, rehash otomatis | `setup.php`, `auth.php` |
| Upload shell (RCE) | Validasi `getimagesize()`, whitelist MIME, nama file dibuat ulang, `uploads/.htaccess` mematikan eksekusi script | `upload.php`, `uploads/.htaccess` |
| File sensitif terbuka | `.htaccess` blokir `config.php`, `.setup-lock`, `schema.sql`; `.gitignore` mencegah commit | `api/.htaccess`, `.gitignore` |
| Info leak | `display_errors=0`, pesan error generik ke pengguna, detail hanya ke log | `lib/bootstrap.php` |
| Spam pesanan | Maks 3 pesanan / 2 menit per IP + validasi total & item | `orders.php` |
| Payload besar | Batas 500 KB untuk JSON body, 3 MB untuk upload | `bootstrap.php`, `upload.php` |

## Tanggung jawab kamu (wajib saat deploy)

1. **Ganti password admin** — jangan pakai PIN demo `1234`.
2. **Hapus `api/setup.php`** setelah akun admin dibuat.
3. **Jangan commit `api/config.php`** — cek `git status` sebelum push.
4. **Aktifkan SSL** di vPanel InfinityFree, lalu pastikan situs dibuka via `https://`.
5. **Backup rutin** — InfinityFree tidak punya backup otomatis. Minimal 1× seminggu
   lewat dashboard → Publish/Backup → **Backup Semua Data**, atau export dari phpMyAdmin.
6. **Jangan simpan data sensitif pelanggan** (KTP, no. kartu, alamat lengkap berlebihan).
   Situs ini hanya butuh nama + no. meja/alamat kirim.

## Kalau nanti mau lebih kuat (opsional)

- **2FA admin**: tambah kolom TOTP di tabel `admins` + verifikasi 6 digit di `auth.php`.
- **Notifikasi pesanan masuk**: integrasi WhatsApp Cloud API / Fonnte di `orders.php`
  setelah insert berhasil (kirim ke nomor pemilik).
- **Rate limit per menit** untuk `orders.php` di level Apache/Cloudflare.
- **Log aktivitas admin** (siapa publish apa, kapan) untuk audit.
- **Enkripsi backup** sebelum diunduh.

## Yang TIDAK dilindungi (dan kenapa)

- **`adminPin` di `config.json`** — ini hanya untuk mode demo statis. Pada mode
  `hosting`, nilai itu diabaikan; login memakai tabel `admins`. Hapus PIN-nya dari
  `config.json` kalau sudah produksi.
- **Kebocoran data via hosting bersama** — pada paket gratis, database berada di
  server bersama. Jangan simpan data yang benar-benar rahasia di sini.
