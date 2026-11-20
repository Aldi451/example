/* ==========================================================================
   env.js — konfigurasi backend
   --------------------------------------------------------------------------
   "local"   : demo statis — config.json + localStorage (bisa jalan di GitHub Pages)
   "hosting" : PHP + MySQL di InfinityFree (produksi) — lihat folder api/ dan
               api-docs/INSTALL.md

   Pada mode "hosting", situs HARUS dibuka dari server InfinityFree,
   bukan dari GitHub Pages (GitHub Pages tidak menjalankan PHP).
   ========================================================================== */
window.APP_ENV = {
  backend: 'local',
  // Path folder API, relatif terhadap index.html. Jangan diubah kecuali dipindah.
  apiBase: 'api'
};
