# Deploy ke InfinityFree (PHP + MySQL)

Panduan ini mengubah situs dari "statis demo" menjadi situs produksi dengan
database MySQL di hosting gratis InfinityFree.

> ⚠️ **Penting:** GitHub Pages **tidak bisa** menjalankan PHP. Jadi:
> - **GitHub** = tempat menyimpan kode (versi & riwayat)
> - **InfinityFree** = tempat situs & database berjalan
>
> Setelah pindah, buka situs lewat domain InfinityFree, bukan `aldi451.github.io`.

---

## 0. Ringkasan yang akan dibuat

| Komponen | Lokasi |
|---|---|
| Halaman pelanggan | `public_html/index.html` |
| Dashboard admin | `public_html/admin.html` |
| API (PHP) | `public_html/api/` |
| Database | MySQL InfinityFree (phpMyAdmin) |
| Foto upload | `public_html/uploads/menu/` |

---

## 1. Daftar & buat hosting

1. Buka [infinityfree.com](https://infinityfree.com) → **Register** (gratis).
2. **Create Account** → pilih subdomain gratis, mis. `mieayamjon.infinityfreeapp.com`.
   - Subdomain ini **permanen**, tidak bisa diganti. Pilih dengan hati-hati.
3. Tunggu ±5–15 menit sampai status **Active** (kadang perlu verifikasi email).

## 2. Buat database MySQL

1. Masuk **Control Panel (vPanel)** → **MySQL Databases**.
2. Isi nama database, mis. `mieayam` → **Create Database**.
3. Catat 5 nilai ini (muncul di halaman yang sama):

   ```
   MySQL Hostname : sqlXXX.infinityfree.com     ← BUKAN localhost
   Database Name  : ifn_xxxxxxx_mieayam
   Username       : ifn_xxxxxxx
   Password       : (yang kamu isi)
   Port           : 3306
   ```

> InfinityFree memblokir koneksi MySQL dari luar server mereka. Jadi phpMyAdmin
> **hanya** bisa dibuka dari vPanel, dan `tools/import-config.php` harus
> dijalankan di hosting (atau tempel JSON manual).

## 3. Upload file ke hosting

**Cara A — File Manager (paling mudah)**
1. vPanel → **File Manager** (atau **Online File Manager**).
2. Masuk ke `htdocs` (kadang bernama `public_html`).
3. Upload **isi repo** (bukan folder pembungkusnya), kecuali yang tidak perlu:
   - ✅ `index.html`, `admin.html`, `config.json`, `assets/`, `api/`, `uploads/`
   - ❌ `tools/`, `scripts/`, `.github/`, `api-docs/`, `README.md` (opsional)

**Cara B — FTP (lebih cepat untuk banyak file)**
1. vPanel → **FTP Accounts** → catat host, username, password.
2. Pakai FileZilla: host `ftpupload.net`, port 21, lalu drag semua file ke `htdocs`.

**Cara C — GitHub Actions (otomatis setiap push)**
Bisa, tapi butuh satu GitHub Action dengan `FTP-Deploy-Action`. Bilang saja kalau mau disiapkan.

## 4. Buat `api/config.php`

1. Di File Manager, buka folder `api/`.
2. Copy `config.example.php` → rename menjadi **`config.php`**.
3. Edit isinya:

```php
'db_host' => 'sqlXXX.infinityfree.com',
'db_name' => 'ifn_xxxxxxx_mieayam',
'db_user' => 'ifn_xxxxxxx',
'db_pass' => 'password-database-kamu',
'site_url' => 'https://mieayamjon.infinityfreeapp.com',
```

> `config.php` **tidak boleh** ikut di-commit ke GitHub (sudah masuk `.gitignore`).

## 5. Buat tabel database

1. vPanel → **phpMyAdmin** → pilih database kamu.
2. Tab **SQL** → tempel seluruh isi `api/schema.sql` → **Go**.
3. Pastikan muncul 4 tabel: `admins`, `settings`, `orders`, `login_attempts`.

## 6. Buat akun admin

1. Buka `https://domainmu.infinityfreeapp.com/api/setup.php`
2. Isi username + password (minimal 10 karakter). Klik **Buat Akun Admin**.
3. **Hapus `api/setup.php`** dari hosting setelah berhasil (wajib, demi keamanan).

Alternatif tanpa membuka setup.php:
```bash
php tools/make-hash.php "password-panjang-kamu" masjon
# jalankan SQL yang dicetak di phpMyAdmin
```

## 7. Isi data awal dari config.json

**Cara mudah:** login ke dashboard → tab **Menu** & **Profil** sudah terisi dari
`config.json` (backend memakai config.json sebagai fallback selama database kosong).
Lalu klik **Publish** sekali. Selesai.

**Cara manual:** jalankan `php tools/import-config.php` di hosting, atau tempel
JSON-nya ke phpMyAdmin:
```sql
UPDATE settings SET `value` = '<ISI_JSON>' WHERE `key` = 'live';
UPDATE settings SET `value` = '<ISI_JSON>' WHERE `key` = 'draft';
```

## 8. Aktifkan mode produksi

Edit `assets/js/env.js` di hosting:

```js
window.APP_ENV = {
  backend: 'hosting',
  apiBase: 'api'
};
```

Buka `index.html` → menu harus muncul dari database. Buka `admin.html` → login
pakai username + password. Coba ubah harga → **Publish** → refresh halaman pelanggan.

## 9. Matikan GitHub Pages (opsional tapi disarankan)

Supaya tidak ada dua versi situs yang membingungkan:
Repo → **Settings → Pages → Source: None**.

---

## Uji lokal tanpa MySQL (opsional)

Ingin mencoba backend sebelum upload? Pakai SQLite:

1. `cp api/config.example.php api/config.php`
2. Set `'db_driver' => 'sqlite'`
3. Buat tabel versi SQLite:

```sql
CREATE TABLE admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_login TEXT);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', items TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'baru', ip TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT NOT NULL,
  username TEXT DEFAULT '', success INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
```

4. `php -S localhost:8000` lalu buka `http://localhost:8000/api/setup.php`.

Contoh `config.php` minimal untuk uji lokal:
```php
return ['db_driver' => 'sqlite', 'db_sqlite_path' => __DIR__ . '/data/app.sqlite',
  'site_url' => 'http://localhost:8000', 'upload_dir' => 'uploads'];
```

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Backend belum dikonfigurasi` | `api/config.php` belum ada / salah nama |
| `Koneksi database gagal` | `db_host` masih `localhost`, atau user belum di-assign ke database (vPanel → MySQL → Add User to Database) |
| Login selalu gagal | Tabel `admins` kosong → jalankan `api/setup.php` |
| `Token CSRF tidak valid` | Cookie diblokir browser / buka lewat `http` vs `https` campur. Pastikan satu domain. |
| Menu tidak berubah setelah publish | Cache browser 60 detik pada `settings.php` — tunggu atau hard-refresh |
| Upload gambar gagal | Folder `uploads/menu` tidak ada / tidak writable (chmod 755) |
| Error 508 / Resource Limit | Batas harian InfinityFree (lihat bagian batasan) |

---

## Batasan InfinityFree yang perlu diketahui

| Batasan | Nilai | Dampak ke situs ini |
|---|---|---|
| Concurrent connections | ~20–50 | Cukup untuk warung, tidak untuk ramai bersamaan |
| Hits harian | ~50.000 | Aman untuk skala kecil |
| CPU/RAM per hari | terbatas | Query ringan, aman |
| Inode (jumlah file) | ~30.000 | Cukup |
| **Inactivity suspend** | akun bisa dinonaktifkan bila tidak ada trafik/login berbulan-bulan | Perlu login vPanel berkala |
| **Tanpa backup otomatis** | — | **Wajib** backup manual berkala (dashboard → Backup Semua Data) |
| SSL | gratis (auto) | Aktifkan di vPanel → SSL Certificates |
| Cron | tidak tersedia | Backup otomatis butuh layanan luar (mis. GitHub Actions) |
| Email/SMTP | dibatasi | Notifikasi lewat WhatsApp, bukan email |

Kalau nanti situs ramai dan kena limit, opsi naik kelas yang tetap murah:
Hostinger (~Rp20–30rb/bln) atau shared hosting lokal. Kode tidak perlu diubah —
cukup upload ulang + import database.

---

## Checklist go-live

- [ ] `api/config.php` terisi & tidak ter-commit
- [ ] 4 tabel dibuat dari `api/schema.sql`
- [ ] Akun admin dibuat, `api/setup.php` **dihapus**
- [ ] Password admin ≥ 10 karakter (frasa)
- [ ] `assets/js/env.js` → `backend: 'hosting'`
- [ ] SSL aktif (https) di vPanel
- [ ] Uji: pesanan masuk muncul di tab Pesanan
- [ ] Uji: login salah 6x → diblokir 15 menit
- [ ] Backup pertama sudah diunduh
- [ ] GitHub Pages dimatikan (opsional)
