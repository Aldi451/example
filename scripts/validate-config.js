#!/usr/bin/env node
/**
 * Validator config.json — dijalankan otomatis di CI (lihat .github/workflows).
 * Tujuan: cegah config.json rusak ter-merge ke main, karena file ini adalah
 * "database" situs. Jalankan manual: node scripts/validate-config.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'config.json');
const errors = [];

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`❌ config.json tidak bisa di-parse: ${err.message}`);
  process.exit(1);
}

const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;

if (!isStr(cfg.businessName)) errors.push('businessName wajib diisi');
if (!/^62\d{8,14}$/.test(String(cfg.phoneNo || ''))) {
  errors.push('phoneNo harus format internasional tanpa "+", contoh 6281386067672');
}
if (!isStr(cfg.address)) errors.push('address wajib diisi');
if (cfg.adminPin !== undefined && !/^\d{4,8}$/.test(String(cfg.adminPin))) {
  errors.push('adminPin harus 4-8 digit angka');
}
if (cfg.mapsUrl && !/^https?:\/\//.test(cfg.mapsUrl)) {
  errors.push('mapsUrl harus dimulai http:// atau https://');
}

for (const key of ['instagram', 'facebook', 'whatsapp']) {
  const url = cfg.socmed && cfg.socmed[key];
  if (url && url !== '#' && !/^https?:\/\//.test(url)) {
    errors.push(`socmed.${key} harus URL http(s) atau "#"`);
  }
}

if (!Array.isArray(cfg.menu) || cfg.menu.length === 0) {
  errors.push('menu harus berupa array dan tidak boleh kosong');
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
    if (item.image && !/^(https?:\/\/|assets\/)/.test(item.image)) {
      errors.push(`${at}.image harus path "assets/..." atau URL https`);
    } else if (item.image && item.image.startsWith('assets/')) {
      const local = path.join(__dirname, '..', item.image);
      if (!fs.existsSync(local)) errors.push(`${at}.image tidak ditemukan: ${item.image}`);
    }
  });
}

if (errors.length) {
  console.error('❌ config.json tidak valid:\n - ' + errors.join('\n - '));
  process.exit(1);
}

console.log(`✅ config.json valid — ${cfg.menu.length} menu, ${cfg.businessName}`);
