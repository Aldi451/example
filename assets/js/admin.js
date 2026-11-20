/* ==========================================================================
   admin.js — panel admin (index.html membaca hasilnya)
   Alur: edit -> Simpan (localStorage untuk preview) -> Download config.json
         lalu commit config.json ke repo supaya permanen untuk semua pengunjung.
   ========================================================================== */
(function () {
  'use strict';

  let config = null;
  let editingId = null;
  let isDirty = false;

  const $ = (id) => document.getElementById(id);
  const AUTH_KEY = 'restaurantAdminAuth';

  /* ------------------------------ util ----------------------------------- */

  const slugify = (text) =>
    text.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'menu-' + Date.now();

  function markDirty() { isDirty = true; }

  function showTab(name) {
    document.querySelectorAll('.panel').forEach((panel) => {
      panel.hidden = panel.id !== name;
    });
    document.querySelectorAll('.tab').forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active));
    });
  }

  /* ------------------------------- auth ---------------------------------- */

  function unlock() {
    sessionStorage.setItem(AUTH_KEY, '1');
    $('lock-screen').hidden = true;
    $('admin-content').hidden = false;
    loadFormData();
  }

  function initAuth() {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      unlock();
      return;
    }
    $('lock-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const pin = $('pin-input').value.trim();
      if (pin === String(config.adminPin || '1234')) {
        unlock();
        toast('Selamat datang, admin', 'success');
      } else {
        $('pin-error').textContent = 'PIN salah. Coba lagi.';
        $('pin-input').value = '';
      }
    });
  }

  /* ---------------------------- render menu ------------------------------ */

  function renderMenuList() {
    const container = $('menu-list');
    if (!config.menu.length) {
      container.innerHTML = '<p class="cart-empty">Belum ada menu. Tambahkan menu baru.</p>';
      return;
    }

    container.innerHTML = config.menu.map((item) => `
      <div class="admin-menu-card">
        <img src="${esc(item.image || 'assets/img/logo.webp')}" alt=""
             onerror="this.src='assets/img/logo.webp'">
        <div class="admin-menu-card__body">
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.description || '')}</p>
          <span class="price">${rupiah(item.price)}</span>
          <div class="admin-menu-card__actions">
            <button type="button" class="btn btn--red" data-edit="${esc(item.id)}">Edit</button>
            <button type="button" class="btn btn--outline" data-delete="${esc(item.id)}">Hapus</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function loadFormData() {
    $('business-name').value = config.businessName || '';
    $('tagline').value = config.tagline || '';
    $('phone-no').value = config.phoneNo || '';
    $('address').value = config.address || '';
    $('maps-url').value = config.mapsUrl || '';
    $('opening-hours').value = config.openingHours || '';
    $('welcome-desc').value = config.welcomeDescription || '';

    $('instagram-url').value = config.socmed?.instagram || '';
    $('facebook-url').value = config.socmed?.facebook || '';
    $('whatsapp-url').value = config.socmed?.whatsapp || '';

    renderMenuList();
  }

  /* ---------------------------- simpan umum ------------------------------ */

  function saveGeneral() {
    const phone = normalizePhone($('phone-no').value);
    if (phone && phone.length < 9) {
      toast('Nomor WhatsApp tidak valid (minimal 9 digit).', 'error');
      return;
    }

    config.businessName = $('business-name').value.trim();
    config.tagline = $('tagline').value.trim();
    config.phoneNo = phone;
    config.address = $('address').value.trim();
    config.mapsUrl = safeUrl($('maps-url').value);
    config.openingHours = $('opening-hours').value.trim();
    config.welcomeDescription = $('welcome-desc').value.trim();
    if (!config.socmed.whatsapp || config.socmed.whatsapp === '#') {
      config.socmed.whatsapp = `https://wa.me/${phone}`;
    }

    persist('Pengaturan umum disimpan');
  }

  function saveSocmed() {
    const waUrl = $('whatsapp-url').value.trim();
    config.socmed.instagram = $('instagram-url').value.trim();
    config.socmed.facebook = $('facebook-url').value.trim();
    config.socmed.whatsapp = waUrl || `https://wa.me/${config.phoneNo}`;

    const invalid = ['instagram', 'facebook', 'whatsapp'].find(
      (key) => config.socmed[key] && !safeUrl(config.socmed[key])
    );
    if (invalid) {
      toast(`URL ${invalid} tidak valid (harus http/https).`, 'error');
      return;
    }
    persist('Social media disimpan');
  }

  /* ---------------------------- menu CRUD -------------------------------- */

  function resetMenuForm() {
    editingId = null;
    ['menu-name', 'menu-price', 'menu-desc', 'menu-image', 'menu-category'].forEach((id) => {
      const el = $(id);
      if (el) el.value = el.tagName === 'SELECT' ? 'Makanan' : '';
    });
    $('menu-form-title').textContent = 'Tambah Menu Baru';
    $('save-menu-btn').textContent = 'Tambah Menu';
    $('image-preview').hidden = true;
    ['menu-name', 'menu-price', 'menu-desc'].forEach((id) => setFieldError(id, ''));
  }

  function setFieldError(id, message) {
    const field = $(id)?.closest('.field');
    if (!field) return;
    field.classList.toggle('field--error', Boolean(message));
    const err = field.querySelector('.error-text');
    if (err) err.textContent = message || '';
  }

  function saveMenu() {
    const name = $('menu-name').value.trim();
    const price = Number($('menu-price').value);
    const desc = $('menu-desc').value.trim();
    const image = $('menu-image').value.trim();
    const category = $('menu-category').value;

    let valid = true;
    setFieldError('menu-name', '');
    setFieldError('menu-price', '');

    if (name.length < 2) { setFieldError('menu-name', 'Nama minimal 2 karakter.'); valid = false; }
    if (!Number.isFinite(price) || price <= 0) {
      setFieldError('menu-price', 'Harga harus lebih dari 0.'); valid = false;
    }
    if (!valid) return;

    const payload = {
      name,
      price: Math.round(price),
      description: desc,
      category: category || 'Makanan',
      image: image || 'assets/img/logo.webp'
    };

    if (editingId) {
      const item = config.menu.find((m) => String(m.id) === String(editingId));
      if (item) Object.assign(item, payload);
      persist('Menu diperbarui');
    } else {
      config.menu.push({ id: slugify(name) + '-' + Date.now().toString(36), ...payload });
      persist('Menu ditambahkan');
    }

    resetMenuForm();
    renderMenuList();
  }

  function editMenu(id) {
    const item = config.menu.find((m) => String(m.id) === String(id));
    if (!item) return;
    editingId = item.id;
    $('menu-name').value = item.name;
    $('menu-price').value = item.price;
    $('menu-desc').value = item.description || '';
    $('menu-image').value = item.image || '';
    $('menu-category').value = item.category || 'Makanan';
    $('menu-form-title').textContent = 'Edit Menu';
    $('save-menu-btn').textContent = 'Simpan Perubahan';
    updateImagePreview();
    showTab('menu');
    $('menu-name').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteMenu(id) {
    const item = config.menu.find((m) => String(m.id) === String(id));
    if (!item) return;
    if (!confirm(`Hapus menu "${item.name}"?`)) return;
    config.menu = config.menu.filter((m) => String(m.id) !== String(id));
    persist('Menu dihapus');
    renderMenuList();
  }

  function updateImagePreview() {
    const url = $('menu-image').value.trim();
    const preview = $('image-preview');
    if (!url) { preview.hidden = true; return; }
    preview.src = url;
    preview.hidden = false;
  }

  /* ------------------------- persist & export ---------------------------- */

  function persist(message) {
    saveLocalConfig(config);
    markDirty();
    updateDirtyBadge();
    toast(message, 'success');
  }

  function updateDirtyBadge() {
    $('dirty-badge').hidden = !isDirty;
  }

  function downloadConfig() {
    const exportData = { ...config };
    delete exportData.adminPin; // jangan pernah publish PIN ke file publik
    exportData.version = 2;

    const blob = new Blob([JSON.stringify(exportData, null, 2) + '\n'], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    isDirty = false;
    updateDirtyBadge();
    toast('config.json diunduh. Upload ke repo untuk permanen.', 'success', 4200);
  }

  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.menu)) throw new Error('format');
        config = mergeConfig(config, { ...data, adminPin: config.adminPin });
        saveLocalConfig(config);
        loadFormData();
        markDirty();
        updateDirtyBadge();
        toast('Konfigurasi berhasil diimpor', 'success');
      } catch {
        toast('File tidak valid. Pastikan JSON dari panel ini.', 'error', 4000);
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm('Hapus semua perubahan lokal dan kembali ke config.json di server?')) return;
    clearLocalConfig();
    localStorage.removeItem(CART_KEY);
    location.reload();
  }

  /* ------------------------------- init ---------------------------------- */

  function bindEvents() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => showTab(tab.dataset.tab));
    });

    $('menu-list').addEventListener('click', (e) => {
      const edit = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-delete]');
      if (edit) editMenu(edit.dataset.edit);
      else if (del) deleteMenu(del.dataset.delete);
    });

    $('menu-form').addEventListener('submit', (e) => {
      e.preventDefault();
      saveMenu();
    });

    $('btn-reset-menu').addEventListener('click', resetMenuForm);

    $('menu-image').addEventListener('input', updateImagePreview);
    $('menu-image').addEventListener('error', () => { $('image-preview').hidden = true; });

    $('general-form').addEventListener('submit', (e) => { e.preventDefault(); saveGeneral(); });
    $('socmed-form').addEventListener('submit', (e) => { e.preventDefault(); saveSocmed(); });

    $('btn-download').addEventListener('click', downloadConfig);
    $('btn-reset').addEventListener('click', resetAll);
    $('btn-logout').addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_KEY);
      location.reload();
    });

    $('import-file').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) importConfig(file);
      e.target.value = '';
    });

    // Peringatan kalau keluar dengan perubahan belum diekspor
    window.addEventListener('beforeunload', (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  async function init() {
    config = await loadConfig();
    initAuth();
    bindEvents();
    updateDirtyBadge();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
