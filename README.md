# Mie Ayam Wonogiri Mas Jon — Website & Panel Admin

Website pemesanan statis (tanpa server, tanpa biaya hosting) untuk warung mie ayam.
Pesanan dikirim langsung ke WhatsApp pemilik. Dihosting gratis di GitHub Pages.

**Live:** https://aldi451.github.io/example/

---

## Struktur

```
index.html                  # halaman pelanggan
admin.html                  # panel admin (pin-protected)
config.json                 # "database" situs: profil toko + daftar menu
assets/
  css/style.css             # semua styling (tanpa framework CDN)
  js/core.js                # helper bersama (load config, format rupiah, XSS guard)
  js/app.js                 # logika keranjang & checkout WhatsApp
  js/admin.js               # logika panel admin
  img/                      # logo + favicon (WebP/PNG, sudah dikompres)
  menu/                     # foto menu (WebP, 4:3, ~40-110 KB)
scripts/validate-config.js  # validator config.json (dipakai CI)
.github/workflows/          # validasi otomatis saat config.json diubah
```

## Cara mengubah menu / profil toko

### Opsi A — Panel admin (disarankan untuk pemilik warung)
1. Buka `admin.html`, masukkan PIN (default `1234`, ubah di `config.json` → `adminPin`).
2. Edit menu / harga / alamat / sosmed. Klik **Simpan**.
3. Masuk tab **Publish / Backup** → **Unduh config.json**.
4. Upload file itu ke repo GitHub, menimpa `config.json` yang lama, lalu commit.
5. Tunggu ±1 menit, GitHub Pages build otomatis. Selesai — semua pengunjung melihat perubahan.

### Opsi B — Edit langsung
Ubah `config.json` lalu commit. Jalankan `node scripts/validate-config.js` dulu
untuk memastikan formatnya benar.

> Perubahan dari panel admin disimpan di `localStorage` browser sebagai *preview*.
> Itu tidak otomatis tersebar ke pengunjung lain — **wajib** diekspor ke `config.json`.

## Menambah foto menu

1. Simpan foto ke folder `assets/menu/`, nama file huruf kecil tanpa spasi
   (contoh: `mie-ayam-jumbo.webp`).
2. Rasio ideal **4:3**, lebar 880 px, format **WebP**, ukuran < 150 KB.
   Konversi: `convert foto.jpg -resize 880x660^ -gravity center -extent 880x660 -strip -quality 80 assets/menu/nama.webp`
3. Daftarkan path-nya di menu admin / `config.json`: `"image": "assets/menu/nama.webp"`.

## Menjalankan lokal

```bash
python3 -m http.server 8080
# buka http://localhost:8080
```

Wajib lewat server (bukan dobel-klik `index.html`), karena `config.json` diambil via `fetch`.

## Keamanan & batasan (penting)

- Panel admin **bukan** sistem login sungguhan. PIN dicek di sisi browser, dan
  `adminPin` ada di `config.json` yang publik. Ia hanya mencegah orang iseng —
  **bukan** melindungi data rahasia. Jangan simpan data pelanggan/harga modal di sini.
- Data pesanan tidak disimpan di server mana pun; pesanan hanya berupa pesan WhatsApp.
- Karena statis, harga/menu tidak bisa berubah real-time per menit. Untuk kebutuhan
  itu (multi-cabang, stok, pembayaran online, laporan penjualan) perlu backend —
  lihat bagian *Rekomendasi pengembangan* di bawah.

## Rekomendasi pengembangan selanjutnya

| Prioritas | Kebutuhan | Solusi ringan |
|---|---|---|
| Tinggi | Pemilik malas upload manual tiap edit | Pindah ke **Supabase/Firebase** (auth + tabel menu), hosting tetap Pages |
| Tinggi | Notifikasi pesanan rapi (bukan cuma chat WA) | WhatsApp Cloud API / Fonnte + serverless function |
| Sedang | Pembayaran online (QRIS) | Midtrans/Xendit static QRIS, konfirmasi manual |
| Sedang | SEO lokal | Google Business Profile + schema.org `Restaurant` + `sitemap.xml` |
| Rendah | Multi-bahasa (ID/EN) | file `i18n/*.json` + tombol bahasa |

## Lisensi

Konten & foto menu: milik pemilik warung. Kode: bebas dipakai ulang.
