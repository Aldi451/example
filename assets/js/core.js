/* ==========================================================================
   core.js — utilitas bersama + lapisan data (DB)
   --------------------------------------------------------------------------
   Mode diatur di assets/js/env.js:
     "local"    -> config.json + localStorage   (demo, tanpa server)
     "supabase" -> Supabase Postgres + Auth + RLS (produksi, lihat supabase/schema.sql)

   Semua halaman HANYA memanggil DB.* sehingga pindah backend tidak perlu
   mengubah app.js / admin.js.
   ========================================================================== */

const APP = {
  CONFIG_URL: 'config.json',
  ENV_URL: 'assets/js/env.js',
  LS_CONFIG: 'restaurantConfig',
  LS_CART: 'restaurantCart',
  LS_ORDERS: 'restaurantOrders',
  SS_ADMIN: 'restaurantAdminAuth',
  SB_TOKEN: 'sbAccessToken',
  MAX_ORDER_ITEMS: 40
};

/* ------------------------------- helpers -------------------------------- */

const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

/** Escape: semua data eksternal wajib lewat sini sebelum masuk innerHTML. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

/** Hanya izinkan http(s); tolak javascript:, data:, dsb. */
function safeUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, location.href);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

/** Nomor WA: buang non-digit, ubah 0xxx / +62 menjadi 62xxx. */
function normalizePhone(input) {
  let digits = String(input ?? '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  if (digits.startsWith('620')) digits = '62' + digits.slice(3);
  return digits;
}

/** Slug id menu: unik, aman untuk URL & localStorage. */
function makeId(name) {
  const base = String(name).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  return (base || 'menu') + '-' + Date.now().toString(36);
}

function toast(message, type = 'info', duration = 2600) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'info' ? '' : ' toast--' + type);
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch { /* mode private / kuota penuh */ }
  return null;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/* --------------------------- normalsisasi data -------------------------- */

const FALLBACK_CONFIG = {
  businessName: 'Mie Ayam Wonogiri Mas Jon',
  tagline: 'Rasa Otentik Khas Wonogiri',
  phoneNo: '6281386067672',
  address: 'Jl. Raya Wonogiri No. 45, Wonogiri, Jawa Tengah',
  mapsUrl: '',
  openingHours: 'Setiap hari, 09.00 - 21.00 WIB',
  welcomeDescription: 'Mie ayam dengan resep tradisional Wonogiri.',
  adminPin: '1234',
  services: [
    { id: 'dine-in', label: 'Makan di Tempat', enabled: true },
    { id: 'takeaway', label: 'Bawa Pulang (Takeaway)', enabled: true },
    { id: 'delivery', label: 'Delivery / Kirim ke Alamat', enabled: true }
  ],
  menu: [],
  socmed: { instagram: '', facebook: '', whatsapp: '' }
};

/** Bersihkan & lengkapi struktur config supaya UI tidak pernah crash. */
function normalizeConfig(raw, base = FALLBACK_CONFIG) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const menu = Array.isArray(src.menu) ? src.menu : base.menu;

  return {
    version: 3,
    businessName: String(src.businessName || base.businessName).slice(0, 60),
    tagline: String(src.tagline ?? base.tagline ?? '').slice(0, 60),
    phoneNo: normalizePhone(src.phoneNo ?? base.phoneNo),
    address: String(src.address ?? base.address ?? '').slice(0, 220),
    mapsUrl: safeUrl(src.mapsUrl ?? base.mapsUrl ?? ''),
    openingHours: String(src.openingHours ?? base.openingHours ?? '').slice(0, 80),
    welcomeDescription: String(
      src.welcomeDescription ?? base.welcomeDescription ?? ''
    ).slice(0, 600),
    adminPin: /^\d{4,8}$/.test(String(src.adminPin ?? '')) ? String(src.adminPin) : base.adminPin,
    services: (Array.isArray(src.services) && src.services.length ? src.services : base.services)
      .map((s, i) => ({
        id: String(s.id || 'svc-' + i).slice(0, 30),
        label: String(s.label || '').slice(0, 60),
        enabled: s.enabled !== false
      }))
      .slice(0, 8),
    menu: menu
      .map((m) => ({
        id: String(m.id || makeId(m.name || 'menu')),
        name: String(m.name || '').slice(0, 60),
        category: String(m.category || 'Makanan').slice(0, 30),
        description: String(m.description || '').slice(0, 140),
        price: Math.max(0, Math.round(Number(m.price) || 0)),
        image: String(m.image || '').slice(0, 300),
        soldOut: m.soldOut === true,
        isSpecial: m.isSpecial === true
      }))
      .filter((m) => m.name && m.price > 0),
    socmed: {
      instagram: String(src.socmed?.instagram ?? base.socmed.instagram ?? '').slice(0, 200),
      facebook: String(src.socmed?.facebook ?? base.socmed.facebook ?? '').slice(0, 200),
      whatsapp: String(src.socmed?.whatsapp ?? base.socmed.whatsapp ?? '').slice(0, 200)
    }
  };
}

/** Versi aman untuk dipublikasikan: PIN & data admin dibuang. */
function publicConfig(config) {
  const copy = JSON.parse(JSON.stringify(config));
  delete copy.adminPin;
  return copy;
}

/* --------------------------------- DB ----------------------------------- */

const DB = (() => {
  const env = window.APP_ENV || { backend: 'local' };

  const isSupabase = () => env.backend === 'supabase' && env.supabaseUrl && env.supabaseAnonKey;
  const rest = (path) => `${env.supabaseUrl}/rest/v1/${path}`;

  function headers(extra = {}) {
    const token = sessionStorage.getItem(APP.SB_TOKEN);
    return {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${token || env.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  async function sbFetch(path, options = {}) {
    const res = await fetch(rest(path), { ...options, headers: headers(options.headers) });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  /* ------------------------------ config -------------------------------- */

  async function readStaticConfig() {
    try {
      const res = await fetch(APP.CONFIG_URL, { cache: 'no-cache' });
      return res.ok ? await res.json() : FALLBACK_CONFIG;
    } catch {
      return FALLBACK_CONFIG;
    }
  }

  /**
   * Config untuk halaman publik.
   * local    : config.json
   * supabase : tabel store_live (yang sudah di-publish admin)
   */
  async function getPublicConfig() {
    const staticCfg = normalizeConfig(await readStaticConfig());
    // Mode demo: config.json + hasil "publish" di localStorage (per-browser)
    if (!isSupabase()) return normalizeConfig(readJson(APP.LS_CONFIG, {}), staticCfg);
    try {
      const rows = await sbFetch('store_live?id=eq.1&select=data');
      return normalizeConfig(rows?.[0]?.data || staticCfg, staticCfg);
    } catch (err) {
      console.warn('Supabase gagal, fallback ke config.json:', err.message);
      return staticCfg;
    }
  }

  /**
   * Config untuk panel admin (termasuk draft yang belum di-publish).
   * local    : config.json + override localStorage
   * supabase : tabel store_draft (butuh login)
   */
  async function getDraftConfig() {
    const staticCfg = normalizeConfig(await readStaticConfig());
    if (!isSupabase()) {
      return normalizeConfig(readJson(APP.LS_CONFIG, {}) , staticCfg);
    }
    const rows = await sbFetch('store_draft?id=eq.1&select=data');
    return normalizeConfig(rows?.[0]?.data || staticCfg, staticCfg);
  }

  /** Simpan draft (belum tampil ke pengunjung pada mode supabase). */
  async function saveDraft(config) {
    const payload = publicConfig(config);
    if (!isSupabase()) {
      store(APP.LS_CONFIG, payload);
      return { mode: 'local' };
    }
    await sbFetch('store_draft?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ id: 1, data: payload, updated_at: new Date().toISOString() }])
    });
    return { mode: 'supabase' };
  }

  /** Publish: draft menjadi data yang dilihat semua pengunjung. */
  async function publish(config) {
    const payload = publicConfig(config);
    if (!isSupabase()) {
      store(APP.LS_CONFIG, payload);
      return { mode: 'local' };
    }
    await sbFetch('store_live?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ id: 1, data: payload, updated_at: new Date().toISOString() }])
    });
    return { mode: 'supabase' };
  }

  /* ------------------------------- auth --------------------------------- */

  async function signIn({ pin, email, password }) {
    if (!isSupabase()) {
      const cfg = await getDraftConfig();
      if (String(pin) === String(cfg.adminPin || '1234')) {
        sessionStorage.setItem(APP.SS_ADMIN, '1');
        return { ok: true, mode: 'local' };
      }
      return { ok: false, error: 'PIN salah.' };
    }

    const res = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: env.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return { ok: false, error: 'Email atau password salah.' };
    const data = await res.json();
    sessionStorage.setItem(APP.SB_TOKEN, data.access_token);
    sessionStorage.setItem(APP.SS_ADMIN, '1');
    return { ok: true, mode: 'supabase' };
  }

  function signOut() {
    sessionStorage.removeItem(APP.SB_TOKEN);
    sessionStorage.removeItem(APP.SS_ADMIN);
  }

  const isAuthed = () => sessionStorage.getItem(APP.SS_ADMIN) === '1';

  /* ------------------------------ pesanan ------------------------------- */

  /**
   * Simpan pesanan. Pada mode supabase ini satu-satunya jalan agar pemilik
   * punya riwayat pesanan (WA tetap dikirim sebagai notifikasi).
   */
  async function createOrder(order) {
    const payload = {
      created_at: new Date().toISOString(),
      customer_name: order.customerInfo.slice(0, 120),
      service_type: order.serviceType.slice(0, 60),
      note: (order.note || '').slice(0, 200),
      items: order.items.slice(0, APP.MAX_ORDER_ITEMS),
      total: order.total,
      status: 'baru',
      source: isSupabase() ? 'supabase' : 'local'
    };

    if (!isSupabase()) {
      const list = readJson(APP.LS_ORDERS, []);
      list.unshift({ ...payload, id: 'ord-' + Date.now().toString(36) });
      store(APP.LS_ORDERS, list.slice(0, 100));
      return payload;
    }

    const rows = await sbFetch('orders', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    return rows?.[0] || payload;
  }

  async function listOrders() {
    if (!isSupabase()) return readJson(APP.LS_ORDERS, []);
    return (await sbFetch('orders?select=*&order=created_at.desc&limit=100')) || [];
  }

  async function updateOrderStatus(id, status) {
    if (!isSupabase()) {
      const list = readJson(APP.LS_ORDERS, [])
        .map((o) => (o.id === id ? { ...o, status } : o));
      store(APP.LS_ORDERS, list);
      return;
    }
    await sbFetch(`orders?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status })
    });
  }

  return {
    isSupabase,
    getPublicConfig,
    getDraftConfig,
    saveDraft,
    publish,
    signIn,
    signOut,
    isAuthed,
    createOrder,
    listOrders,
    updateOrderStatus
  };
})();

/* ------------------------------ ikon SVG -------------------------------- */

const ICONS = {
  cart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  whatsapp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-.9-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.5-.4z"/><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.3l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
  instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  facebook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V5.5h-3c-2.5 0-4 1.6-4 4V12H7.5v3.5H10V22h3.5v-6.5H16l.5-3.5h-3V9.8c0-.5.2-.8.8-.8z"/></svg>',
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.9 2.2z"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  utensils: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2v7a3 3 0 0 0 6 0V2"/><path d="M6 9v13"/><path d="M18 2c-1.7 1.3-3 3.5-3 6 0 2 .8 3.4 2 4v10h2V2z"/></svg>',
  receipt: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h16v20l-4-2-4 2-4-2-4 2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>'
};
