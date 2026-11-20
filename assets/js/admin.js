/* ==========================================================================
   admin.js — dashboard admin
   Tab: Profil · Layanan · Menu · Sosmed · Pesanan · Publish
   ========================================================================== */
(function () {
  'use strict';

  let config = null;
  let editingId = null;
  let isDirty = false;
  let orders = [];

  const $ = (id) => document.getElementById(id);
  const ORDER_STATUS = ['baru', 'diproses', 'selesai', 'batal'];

  /* ------------------------------- util ---------------------------------- */

  function markDirty() {
    isDirty = true;
    $('dirty-badge').hidden = false;
  }

  function showTab(name) {
    document.querySelectorAll('.panel').forEach((panel) => {
      panel.hidden = panel.id !== name;
    });
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
    });
    if (name === 'orders') loadOrders();
  }

  function setError(inputId, message) {
    const field = $(inputId)?.closest('.field');
    if (!field) return;
    field.classList.toggle('field--error', Boolean(message));
    const err = field.querySelector('.error-text');
    if (err) err.textContent = message || '';
  }

  /* -------------------------------- auth --------------------------------- */

  function backendLabel() {
    const supabase = DB.isSupabase();
    const label = supabase ? 'Supabase (produksi)' : 'Mode demo (localStorage)';
    ['backend-label', 'backend-label-2'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.textContent = label;
      el.className = 'badge ' + (supabase ? 'badge--ok' : 'badge--warn');
    });
    $('lock-pin-field').hidden = supabase;
    $('lock-sb-fields').hidden = !supabase;
  }

  function unlock() {
    $('lock-screen').hidden = true;
    $('admin-content').hidden = false;
    loadFormData();
  }

  function initAuth() {
    backendLabel();
    if (DB.isAuthed()) { unlock(); return; }

    $('lock-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = await DB.signIn({
        pin: $('pin-input').value.trim(),
        email: $('sb-email').value.trim(),
        password: $('sb-password').value
      });
      if (!result.ok) {
        $('pin-error').textContent = result.error || 'Gagal masuk.';
        return;
      }
      $('pin-error').textContent = '';
      unlock();
      toast('Selamat datang, admin', 'success');
    });
  }

  /* ------------------------------ profil -------------------------------- */

  function loadFormData() {
    $('business-name').value = config.businessName || '';
    $('tagline').value = config.tagline || '';
    $('phone-no').value = config.phoneNo || '';
    $('address').value = config.address || '';
    $('maps-url').value = config.mapsUrl || '';
    $('opening-hours').value = config.openingHours || '';
    $('welcome-desc').value = config.welcomeDescription || '';

    $('instagram-url').value = config.socmed.instagram || '';
    $('facebook-url').value = config.socmed.facebook || '';
    $('whatsapp-url').value = config.socmed.whatsapp || '';

    renderServiceEditor();
    renderMenuList();
  }

  function saveProfile() {
    const phone = normalizePhone($('phone-no').value);
    if (phone && !/^62\d{8,14}$/.test(phone)) {
      setError('phone-no', 'Format salah. Contoh: 0813-8606-7672 atau 6281386067672.');
      return;
    }
    setError('phone-no', '');

    const maps = $('maps-url').value.trim();
    if (maps && !safeUrl(maps)) {
      setError('maps-url', 'URL tidak valid (harus https://).');
      return;
    }
    setError('maps-url', '');

    if ($('business-name').value.trim().length < 2) {
      setError('business-name', 'Nama bisnis wajib diisi.');
      return;
    }
    setError('business-name', '');

    config.businessName = $('business-name').value.trim();
    config.tagline = $('tagline').value.trim();
    config.phoneNo = phone;
    config.address = $('address').value.trim();
    config.mapsUrl = maps ? safeUrl(maps) : '';
    config.openingHours = $('opening-hours').value.trim();
    config.welcomeDescription = $('welcome-desc').value.trim();

    persist('Profil toko disimpan');
  }

  /* ------------------------------- layanan ------------------------------- */

  function renderServiceEditor() {
    const wrap = $('service-list');
    wrap.innerHTML = config.services.map((s, i) => `
      <div class="repeat-row" data-index="${i}">
        <label class="switch">
          <input type="checkbox" data-svc-enabled ${s.enabled ? 'checked' : ''}
                 aria-label="Aktifkan ${esc(s.label)}">
          <span></span>
        </label>
        <input type="text" class="svc-label" value="${esc(s.label)}" maxlength="60"
               aria-label="Nama layanan ${i + 1}">
        <button type="button" class="icon-btn" data-svc-del aria-label="Hapus layanan">${ICONS.trash}</button>
      </div>
    `).join('') || '<p class="cart-empty">Belum ada tipe layanan.</p>';
  }

  function saveServices() {
    const rows = [...document.querySelectorAll('#service-list .repeat-row')];
    const list = rows.map((row) => ({
      id: config.services[Number(row.dataset.index)]?.id || makeId('svc'),
      label: row.querySelector('.svc-label').value.trim().slice(0, 60),
      enabled: row.querySelector('[data-svc-enabled]').checked
    })).filter((s) => s.label);

    if (!list.some((s) => s.enabled)) {
      toast('Minimal satu layanan harus aktif.', 'error');
      return;
    }
    config.services = list;
    persist('Tipe layanan disimpan');
  }

  function addService() {
    config.services.push({ id: makeId('svc'), label: 'Layanan Baru', enabled: true });
    renderServiceEditor();
    markDirty();
  }

  /* -------------------------------- menu --------------------------------- */

  function setMenuFieldError(id, message) {
    const field = $(id)?.closest('.field');
    if (!field) return;
    field.classList.toggle('field--error', Boolean(message));
    const err = field.querySelector('.error-text');
    if (err) err.textContent = message || '';
  }

  function resetMenuForm() {
    editingId = null;
    ['menu-name', 'menu-price', 'menu-desc', 'menu-image'].forEach((id) => { $(id).value = ''; });
    $('menu-category').value = 'Makanan';
    $('menu-soldout').checked = false;
    $('menu-special').checked = false;
    $('menu-form-title').textContent = 'Tambah Menu Baru';
    $('save-menu-btn').textContent = 'Tambah Menu';
    $('image-preview').hidden = true;
    setMenuFieldError('menu-name', '');
    setMenuFieldError('menu-price', '');
  }

  function saveMenu() {
    const name = $('menu-name').value.trim();
    const price = Number($('menu-price').value);
    const description = $('menu-desc').value.trim();
    const image = $('menu-image').value.trim();
    const category = $('menu-category').value;

    let valid = true;
    setMenuFieldError('menu-name', '');
    setMenuFieldError('menu-price', '');
    setMenuFieldError('menu-image', '');

    if (name.length < 2) { setMenuFieldError('menu-name', 'Nama minimal 2 karakter.'); valid = false; }
    if (!Number.isFinite(price) || price <= 0) {
      setMenuFieldError('menu-price', 'Harga harus lebih dari 0.'); valid = false;
    }
    if (image && !/^(https?:\/\/|assets\/)/.test(image)) {
      setMenuFieldError('menu-image', 'Pakai path "assets/..." atau URL https://.'); valid = false;
    } else if (/^https?:\/\//.test(image) && !safeUrl(image)) {
      setMenuFieldError('menu-image', 'URL gambar tidak valid.'); valid = false;
    }
    if (!valid) return;

    const payload = {
      name, price: Math.round(price), description, category,
      image: image || 'assets/img/logo.webp',
      soldOut: $('menu-soldout').checked,
      isSpecial: $('menu-special').checked
    };

    if (editingId) {
      const item = config.menu.find((m) => String(m.id) === String(editingId));
      if (item) Object.assign(item, payload);
      persist('Menu diperbarui');
    } else {
      config.menu.push({ id: makeId(name), ...payload });
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
    $('menu-soldout').checked = item.soldOut === true;
    $('menu-special').checked = item.isSpecial === true;
    $('menu-form-title').textContent = 'Edit Menu';
    $('save-menu-btn').textContent = 'Simpan Perubahan';
    updateImagePreview();
    showTab('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('menu-name').focus();
  }

  function deleteMenu(id) {
    const item = config.menu.find((m) => String(m.id) === String(id));
    if (!item || !confirm(`Hapus menu "${item.name}"?`)) return;
    config.menu = config.menu.filter((m) => String(m.id) !== String(id));
    persist('Menu dihapus');
    renderMenuList();
  }

  function toggleSoldOut(id) {
    const item = config.menu.find((m) => String(m.id) === String(id));
    if (!item) return;
    item.soldOut = !item.soldOut;
    persist(item.soldOut ? `${item.name} ditandai habis` : `${item.name} tersedia lagi`);
    renderMenuList();
  }

  function renderMenuList() {
    const container = $('menu-list');
    if (!config.menu.length) {
      container.innerHTML = '<p class="cart-empty">Belum ada menu. Tambahkan menu baru.</p>';
      return;
    }
    container.innerHTML = config.menu.map((item) => `
      <div class="admin-menu-card${item.soldOut ? ' is-out' : ''}">
        <img src="${esc(item.image || 'assets/img/logo.webp')}" alt="" loading="lazy"
             onerror="this.onerror=null;this.src='assets/img/logo.webp'">
        <div class="admin-menu-card__body">
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.category || '')} · ${esc(item.description || '')}</p>
          <span class="price">${rupiah(item.price)}</span>
          <div class="admin-menu-card__actions">
            <button type="button" class="btn btn--red" data-edit="${esc(item.id)}">Edit</button>
            <button type="button" class="btn btn--outline" data-sold="${esc(item.id)}">
              ${item.soldOut ? 'Tersedia' : 'Habis'}
            </button>
            <button type="button" class="btn btn--outline" data-delete="${esc(item.id)}"
              aria-label="Hapus ${esc(item.name)}">${ICONS.trash}</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function updateImagePreview() {
    const preview = $('image-preview');
    const value = $('menu-image').value.trim();
    const src = /^https?:\/\//.test(value) ? safeUrl(value) : value;
    if (!src) { preview.hidden = true; return; }
    preview.src = src;
    preview.hidden = false;
  }

  /* ------------------------------- sosmed -------------------------------- */

  function saveSocmed() {
    const values = {
      instagram: $('instagram-url').value.trim(),
      facebook: $('facebook-url').value.trim(),
      whatsapp: $('whatsapp-url').value.trim()
    };
    for (const [key, value] of Object.entries(values)) {
      if (value && !safeUrl(value)) {
        toast(`URL ${key} tidak valid (harus http/https).`, 'error');
        return;
      }
    }
    config.socmed = values;
    persist('Social media disimpan');
  }

  /* ------------------------------- pesanan ------------------------------- */

  async function loadOrders() {
    const wrap = $('orders-list');
    wrap.innerHTML = '<p class="cart-empty">Memuat pesanan…</p>';
    try {
      orders = await DB.listOrders();
    } catch (err) {
      wrap.innerHTML = `<p class="cart-empty">Gagal memuat pesanan: ${esc(err.message)}</p>`;
      return;
    }
    renderOrders();
  }

  function renderOrders() {
    const wrap = $('orders-list');
    if (!orders.length) {
      wrap.innerHTML = `<p class="cart-empty">Belum ada pesanan tercatat.${
        DB.isSupabase() ? '' : ' (Mode demo: pesanan disimpan di browser ini saja.)'}</p>`;
      return;
    }
    wrap.innerHTML = orders.map((o) => `
      <article class="order-card">
        <header>
          <div>
            <strong>${esc(o.customer_name)}</strong>
            <span class="order-card__meta">${esc(o.service_type)}</span>
          </div>
          <span class="pill pill--${esc(o.status)}">${esc(o.status)}</span>
        </header>
        <ul>
          ${(o.items || []).map((i) =>
            `<li>${esc(i.name)} × ${esc(i.qty)} — ${rupiah(i.price * i.qty)}</li>`).join('')}
        </ul>
        ${o.note ? `<p class="order-card__note">Catatan: ${esc(o.note)}</p>` : ''}
        <footer>
          <span>${rupiah(o.total)}</span>
          <span class="order-card__time">${esc(new Date(o.created_at).toLocaleString('id-ID'))}</span>
          <select data-status="${esc(o.id)}" aria-label="Ubah status pesanan">
            ${ORDER_STATUS.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </footer>
      </article>
    `).join('');

    wrap.querySelectorAll('[data-status]').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = e.target.dataset.status;
        try {
          await DB.updateOrderStatus(id, e.target.value);
          const order = orders.find((o) => String(o.id) === String(id));
          if (order) order.status = e.target.value;
          renderOrders();
          toast('Status diperbarui', 'success');
        } catch (err) {
          toast('Gagal update: ' + err.message, 'error');
        }
      });
    });
  }

  /* -------------------------- simpan & publish --------------------------- */

  async function persist(message) {
    try {
      await DB.saveDraft(config);
      markDirty();
      toast(message, 'success');
    } catch (err) {
      toast('Gagal menyimpan: ' + err.message, 'error', 4000);
    }
  }

  async function doPublish() {
    const btn = $('btn-publish');
    btn.disabled = true;
    try {
      await DB.publish(config);
      isDirty = false;
      $('dirty-badge').hidden = true;
      toast(DB.isSupabase()
        ? 'Live! Semua pengunjung sudah melihat perubahan.'
        : 'Tersimpan lokal. Unduh config.json untuk membuat permanen.', 'success', 5000);
    } catch (err) {
      toast('Gagal publish: ' + err.message, 'error', 4000);
    } finally {
      btn.disabled = false;
    }
  }

  function downloadConfig() {
    const blob = new Blob([JSON.stringify(publicConfig(config), null, 2) + '\n'],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('config.json diunduh', 'success');
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ config: publicConfig(config), orders }, null, 2)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-mieayam-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('Backup diunduh', 'success');
  }

  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        const incoming = data.config || data;
        if (!incoming || !Array.isArray(incoming.menu)) throw new Error('format');
        config = normalizeConfig({ ...incoming, adminPin: config.adminPin }, config);
        await DB.saveDraft(config);
        loadFormData();
        markDirty();
        toast('Konfigurasi diimpor', 'success');
      } catch {
        toast('File tidak valid. Gunakan hasil export dari panel ini.', 'error', 4000);
      }
    };
    reader.readAsText(file);
  }

  async function resetAll() {
    if (!confirm('Buang draft lokal dan muat ulang dari config.json?')) return;
    store(APP.LS_CONFIG, null);
    store(APP.LS_CART, null);
    location.reload();
  }

  /* -------------------------------- init --------------------------------- */

  function bindEvents() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => showTab(tab.dataset.tab));
    });

    $('profile-form').addEventListener('submit', (e) => { e.preventDefault(); saveProfile(); });
    $('socmed-form').addEventListener('submit', (e) => { e.preventDefault(); saveSocmed(); });
    $('services-form').addEventListener('submit', (e) => { e.preventDefault(); saveServices(); });
    $('menu-form').addEventListener('submit', (e) => { e.preventDefault(); saveMenu(); });

    $('btn-add-service').addEventListener('click', addService);
    $('service-list').addEventListener('click', (e) => {
      const del = e.target.closest('[data-svc-del]');
      if (!del) return;
      del.closest('.repeat-row').remove();
      markDirty();
    });

    $('menu-list').addEventListener('click', (e) => {
      const edit = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-delete]');
      const sold = e.target.closest('[data-sold]');
      if (edit) editMenu(edit.dataset.edit);
      else if (del) deleteMenu(del.dataset.delete);
      else if (sold) toggleSoldOut(sold.dataset.sold);
    });

    $('btn-reset-menu').addEventListener('click', resetMenuForm);
    $('menu-image').addEventListener('input', updateImagePreview);

    $('btn-publish').addEventListener('click', doPublish);
    $('btn-download').addEventListener('click', downloadConfig);
    $('btn-backup').addEventListener('click', exportBackup);
    $('btn-reset').addEventListener('click', resetAll);
    $('btn-refresh-orders').addEventListener('click', loadOrders);

    $('btn-logout').addEventListener('click', () => {
      DB.signOut();
      location.reload();
    });

    $('import-file').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) importConfig(file);
      e.target.value = '';
    });

    window.addEventListener('beforeunload', (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  async function init() {
    config = await DB.getDraftConfig();

    // Mode demo: PIN dibaca dari config.json (file publik) sebagai pembanding
    if (!DB.isSupabase()) {
      try {
        const res = await fetch(APP.CONFIG_URL, { cache: 'no-cache' });
        if (res.ok) {
          const raw = await res.json();
          if (/^\d{4,8}$/.test(String(raw.adminPin || ''))) config.adminPin = String(raw.adminPin);
        }
      } catch { /* offline: pakai default */ }
    }

    initAuth();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
