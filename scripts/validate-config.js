#!/usr/bin/env node
/**
 * Validator config.json (struktur v3).
 * Jalankan sebelum commit:  node scripts/validate-config.js
 * Atau pasang sebagai git hook pre-commit.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'config.json');
const errors = [];
const warnings = [];

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`❌ config.json tidak bisa di-parse: ${err.message}`);
  process.exit(1);
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isHttp = (v) => /^https?:\/\/\S+$/.test(String(v || ''));

if (!isStr(cfg.businessName)) errors.push('businessName wajib diisi');
if (!/^62\d{8,14}$/.test(String(cfg.phoneNo || ''))) {
  errors.push('phoneNo harus format 62xxxxxxxxxx (tanpa + / spasi)');
}
if (!isStr(cfg.address)) errors.push('address wajib diisi');
if (cfg.adminPin !== undefined && !/^\d{4,8}$/.test(String(cfg.adminPin))) {
  errors.push('adminPin harus 4-8 digit angka');
}
if (cfg.mapsUrl && !isHttp(cfg.mapsUrl)) {
  errors.push('mapsUrl harus URL http(s)');
}

// Layanan
if (!Array.isArray(cfg.services) || cfg.services.length === 0) {
  errors.push('services minimal berisi satu layanan');
} else {
  const enabled = cfg.services.filter((s) => s && s.enabled !== false && isStr(s.label));
  if (enabled.length === 0) errors.push('minimal satu layanan harus enabled');
  const ids = new Set();
  cfg.services.forEach((s, i) => {
    if (!isStr(s.id)) errors.push(`services[${i}].id wajib diisi`);
    else if (ids.has(s.id)) errors.push(`services[${i}].id duplikat`);
    else ids.add(s.id);
    if (!isStr(s.label)) errors.push(`services[${i}].label wajib diisi`);
  });
}

// Social media: boleh kosong (demo), tapi kalau diisi harus URL valid
for (const key of ['instagram', 'facebook', 'whatsapp']) {
  const url = cfg.socmed && cfg.socmed[key];
  if (url && url !== '#' && !isHttp(url)) {
    errors.push(`socmed.${key} harus URL http(s) atau string kosong`);
  }
}

// Menu
if (!Array.isArray(cfg.menu) || cfg.menu.length === 0) {
  errors.push('menu harus array dan tidak boleh kosong');
} else {
  const ids = new Set();
  cfg.menu.forEach((item, i) => {
    const at = `menu[${i}]`;
    if (!isStr(item.id)) errors.push(`${at}.id wajib diisi`);
    else if (ids.has(item.id)) errors.push(`${at}.id duplikat: ${item.id}`);
    else ids.add(item.id);

    if (!isStr(item.name)) errors.push(`${at}.name wajib diisi`);
    if (!Number.isInteger(item.price) || item.price <= 0) {
      errors.push(`${at}.price harus bilangan bulat > 0`);
    }
    const img = String(item.image || '');
    if (img && !/^(https?:\/\/|assets\/)/.test(img)) {
      errors.push(`${at}.image harus path "assets/..." atau URL https`);
    } else if (img.startsWith('assets/') && !fs.existsSync(path.join(__dirname, '..', img))) {
      errors.push(`${at}.image tidak ditemukan: ${img}`);
    }
    if (img && !img.endsWith('.webp') && img.startsWith('assets/')) {
      warnings.push(`${at}.image bukan WebP — ukuran bisa lebih besar dari perlu`);
    }
  });
}

// Info demo
if (!cfg.mapsUrl) warnings.push('mapsUrl kosong — blok peta disembunyikan (ok untuk demo)');
if (!cfg.socmed?.instagram && !cfg.socmed?.facebook) {
  warnings.push('sosmed kosong — ikon sosmed disembunyikan (ok untuk demo)');
}
if (String(cfg.adminPin) === '1234') {
  warnings.push('adminPin masih default 1234 — ganti sebelum mode produksi');
}

warnings.forEach((w) => console.warn('⚠️  ' + w));

if (errors.length) {
  console.error('❌ config.json tidak valid:\n - ' + errors.join('\n - '));
  process.exit(1);
}

console.log(`✅ config.json valid — ${cfg.menu.length} menu, ${cfg.services.length} layanan, ${cfg.businessName}`);
