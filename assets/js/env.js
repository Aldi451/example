/* ==========================================================================
   env.js — konfigurasi backend
   --------------------------------------------------------------------------
   "local"    : demo, data dari config.json + localStorage (tanpa server)
   "supabase" : produksi, data dari Supabase (lihat supabase/README.md)

   anon key AMAN dipublikasikan. JANGAN pernah menaruh service_role key di sini.
   ========================================================================== */
window.APP_ENV = {
  backend: 'local',
  supabaseUrl: '',
  supabaseAnonKey: ''
};
