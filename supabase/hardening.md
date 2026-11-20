# Hardening wajib saat mode Supabase aktif

Skema `schema.sql` sudah mengamankan data, tapi 3 hal ini **wajib** supaya aman
dipakai publik. Semuanya gratis dan cuma butuh ±15 menit.

## 1. Batasi pendaftaran user (WAJIB)

Tanpa ini, siapa pun bisa mendaftar akun lalu otomatis punya akses `authenticated`
— artinya bisa menulis `store_live`, mengubah menu, dan membaca semua pesanan.

**Authentication → Providers → Email → matikan "Enable sign ups".**

Verifikasi: coba daftar lewat endpoint `https://<project>.supabase.co/auth/v1/signup`
dengan anon key — harus gagal `Signups not allowed`.

## 2. Rate limit pesanan (WAJIB untuk anti-spam)

Policy `orders public insert` membuka insert tanpa login. Tanpa rate limit, script
iseng bisa membanjiri tabel. Dua opsi:

- **Termudah:** aktifkan rate limit & CAPTCHA di Supabase (Dashboard → Auth → Rate limits
  tidak mencakup REST; gunakan Cloudflare Turnstile di form pesanan).
- **Rekomendasi:** buat **Edge Function** `create-order` yang memverifikasi Turnstile
  lalu insert dengan service role. Frontend memanggil function itu, bukan tabel langsung.

## 3. Kunci CORS & domain

**Settings → API → CORS / Allowed origins** — tambahkan hanya:
`https://aldi451.github.io`. Dengan begitu anon key tidak bisa dipakai dari domain lain.

Tambahan:
- Aktifkan **SSL enforcement** (default aktif).
- Aktifkan **2FA** untuk akun Supabase kamu sendiri.
- Simpan **service_role key** hanya di environment Edge Function, jangan di repo.

## Checklist sebelum go-live

- [ ] Sign up dimatikan
- [ ] Hanya 1 akun admin (atau sesuai kebutuhan)
- [ ] CORS dibatasi ke domain produksi
- [ ] Rate limit / Turnstile pada form pesanan
- [ ] `env.js` berisi anon key (bukan service_role)
- [ ] Password admin ≥ 12 karakter, unik
- [ ] GitHub Pages HTTPS aktif (default)
- [ ] Backup mingguan: tab **Publish / Backup** → Backup Semua Data
