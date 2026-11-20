# Cara test sebelum & sesudah deploy

Urut dari yang paling cepat. Jangan lewat langkah 1–3.

---

## 1. Test mode demo (2 menit, tanpa server)

Buka lewat server lokal, bukan dobel-klik file:

```bash
cd folder-repo
python3 -m http.server 8080
# buka http://localhost:8080
```

**Checklist halaman pelanggan** (`index.html`)
- [ ] 6 kartu menu muncul dengan foto (bukan gambar rusak)
- [ ] Klik **+ Tambah** → badge keranjang di header naik
- [ ] Klik ikon keranjang → tombol qty −/+ jalan
- [ ] Cari "bakso" di kolom pencarian → tersaring
- [ ] Klik filter **Minuman** → tinggal 2 item
- [ ] Isi nama → **Kirim Pesanan via WhatsApp** → WhatsApp terbuka, pesan rapi
      (cek: ada nama, tipe layanan, daftar item, total)
- [ ] Refresh halaman → keranjang hilang (memang begitu setelah pesanan terkirim)
- [ ] Blok peta muncul (masih memakai link dummy)

**Checklist dashboard** (`admin.html`, PIN `1234`)
- [ ] Tab **Profil** → ubah alamat → Simpan → buka `index.html` di tab lain → alamat berubah
- [ ] Tab **Menu** → tambah menu baru → muncul di daftar
- [ ] Harga `0` ditolak dengan pesan error (bukan diam saja)
- [ ] Tandai satu menu **Habis** → di halaman pelanggan jadi abu-abu + tombol disabled
- [ ] Tab **Layanan** → matikan "Delivery" → hilang dari dropdown pelanggan
- [ ] Tab **Pesanan** → pesanan tadi terlihat, status bisa diubah
- [ ] Tab **Publish** → **Unduh config.json** berhasil, isi `adminPin` **tidak ada**
- [ ] Coba tekan ⬅ keluar tab dengan perubahan belum di-export → muncul peringatan browser

---

## 2. Test config.json (10 detik)

```bash
node scripts/validate-config.js
```

Harus keluar `✅ config.json valid`. Kalau ada harga 0, id duplikat, atau path gambar salah → gagal.

---

## 3. Cek sintaks PHP (tanpa PHP terpasang)

Kalau kamu punya PHP:
```bash
for f in $(find api tools -name '*.php'); do php -l "$f"; done
```

Kalau tidak ada PHP (seperti di sandbox ini), file PHP sudah divalidasi dengan
parser + linter semantik oleh agent. Yang dicek: sintaks, `require` yang tidak ada,
fungsi tak dikenal, dan variabel dipakai sebelum diisi — semuanya bersih.

---

## 4. Test mode hosting lokal (paling penting, ±15 menit)

Ini mengetes backend sungguhan sebelum upload ke InfinityFree.

### 4a. Siapkan
```bash
cp api/config.example.php api/config.php
```
Edit `api/config.php` → pakai SQLite dulu (tanpa MySQL):
```php
return [
  'db_driver' => 'sqlite',
  'db_sqlite_path' => __DIR__ . '/data/app.sqlite',
  'site_url' => 'http://localhost:8000',
  'upload_dir' => 'uploads',
  'timezone' => 'Asia/Jakarta',
];
```
Buat tabel (lihat `INSTALL.md` bagian *Uji lokal tanpa MySQL*), lalu:
```bash
php -S localhost:8000
```

### 4b. Aktifkan mode hosting
Edit `assets/js/env.js` → `backend: 'hosting'`

### 4c. Checklist backend
- [ ] Buka `http://localhost:8000/api/` → JSON `"ok": true, "configured": true`
- [ ] Buka `http://localhost:8000/api/setup.php` → buat admin (password ≥10 karakter)
- [ ] Buka `api/setup.php` lagi → terkunci (“Setup sudah dikunci”)
- [ ] Login dashboard dengan username+password → berhasil
- [ ] Login salah 6× → pesan “Terlalu banyak percobaan” (rate limit)
- [ ] Buat pesanan dari halaman pelanggan → muncul di tab **Pesanan** dashboard
- [ ] Ubah harga → **Publish** → refresh halaman pelanggan (tanpa login) → harga berubah
- [ ] Upload foto dari tab Menu → gambar muncul + tersimpan di `uploads/menu/`
- [ ] Coba upload file `.txt` yang di-rename `.jpg` → ditolak
- [ ] Tes keamanan: buka `http://localhost:8000/api/config.php` → 403/404
- [ ] Tes keamanan: logout → coba POST publish lewat curl → 401

### 4d. Tes CSRF (opsional tapi bagus)
```bash
curl -X POST http://localhost:8000/api/settings.php?which=publish \
  -H 'Content-Type: application/json' -d '{"data":{"menu":[]}}'
# harus 401 (belum login), bukan 200
```

---

## 5. Setelah deploy ke InfinityFree

Ulang checklist 4c di domain asli, plus:

- [ ] `https://` jalan (SSL aktif di vPanel)
- [ ] `api/setup.php` sudah **dihapus** dari hosting
- [ ] `api/config.php` tidak bisa diakses dari browser
- [ ] Buka dari HP (bukan hanya desktop)
- [ ] Pesan WhatsApp yang terkirim bisa diklik di HP
- [ ] Backup pertama diunduh dari tab Publish/Backup

---

## Yang belum bisa gw test di sini

Jujur, ini batasannya:

| Hal | Status |
|---|---|
| PHP benar-benar dieksekusi | ❌ Sandbox tidak punya PHP dan download binary diblokir. Sudah divalidasi lewat parser + linter semantik, **tapi belum dijalankan**. |
| MySQL/MariaDB sungguhan | ❌ Belum dijalankan. Skema ditulis untuk MariaDB 10.x (versi InfinityFree). |
| Upload gambar + GD | ❌ Belum dijalankan (butuh PHP). Logika sudah direview manual. |
| Tampilan di browser sungguhan | ⚠️ Diuji via jsdom (DOM + logika), bukan render visual. |
| Integrasi WhatsApp | ⚠️ Yang diuji hanya URL & isi pesannya, bukan kirim sungguhan. |

Karena itu **langkah 4 wajib** kamu jalankan sebelum upload. Kalau di langkah 4
sudah bersih, kemungkinan besar di InfinityFree juga langsung jalan.
