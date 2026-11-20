/* ==========================================================================
   app.js — logika halaman pelanggan (index.html)
   ========================================================================== */
(function () {
  'use strict';

  let config = FALLBACK_CONFIG;
  let cart = readCart();
  let activeCategory = 'Semua';

  const $ = (id) => document.getElementById(id);

  /* ----------------------------- keranjang ------------------------------- */

  function readCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((i) => i && i.id && i.qty > 0) : [];
    } catch {
      return [];
    }
  }

  function writeCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch { /* mode private / kuota penuh — abaikan */ }
  }

  const cartTotal = () => cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = () => cart.reduce((sum, i) => sum + i.qty, 0);

  /* ------------------------------ render --------------------------------- */

  function renderHeader() {
    document.title = config.businessName;
    $('brand-name').textContent = config.businessName;
    $('brand-tag').textContent = config.tagline || '';
    $('welcome-desc').textContent = config.welcomeDescription || '';
    $('info-bar').textContent = config.tagline
      ? `Nikmati ${config.businessName} — ${config.tagline}`
      : `Nikmati ${config.businessName}`;

    // Ikon SVG inline (tanpa CDN Font Awesome)
    $('admin-icon').innerHTML = ICONS.gear;
    $('cart-icon').innerHTML = ICONS.cart;
    $('menu-icon').innerHTML = ICONS.utensils;
    $('cart-title-icon').innerHTML = ICONS.receipt;
    $('submit-icon').innerHTML = ICONS.whatsapp;
  }

  function renderMeta() {
    const parts = [];
    if (config.openingHours) {
      parts.push(`<span>${ICONS.clock} ${esc(config.openingHours)}</span>`);
    }
    if (config.phoneNo) {
      parts.push(`<span>${ICONS.phone} <a href="https://wa.me/${esc(config.phoneNo)}" target="_blank" rel="noopener">+${esc(config.phoneNo)}</a></span>`);
    }
    $('meta-row').innerHTML = parts.join('');
  }

  function renderFilters() {
    const cats = ['Semua', ...new Set(config.menu.map((m) => m.category || 'Lainnya'))];
    if (!cats.includes(activeCategory)) activeCategory = 'Semua';

    const wrap = $('filters');
    wrap.innerHTML = cats.map((c) => `
      <button type="button" class="chip" data-cat="${esc(c)}"
        aria-pressed="${c === activeCategory}">${esc(c)}</button>
    `).join('');
  }

  function renderMenu() {
    const container = $('menu-container');
    const items = config.menu.filter(
      (m) => activeCategory === 'Semua' || (m.category || 'Lainnya') === activeCategory
    );

    if (!items.length) {
      container.innerHTML = '<p class="cart-empty">Menu belum tersedia. Silakan cek lagi nanti.</p>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <article class="menu-card">
        <div class="menu-card__thumb">
          <img src="${esc(item.image || 'assets/img/logo.webp')}"
               alt="${esc(item.name)}" width="880" height="660"
               loading="lazy" decoding="async"
               onerror="this.src='assets/img/logo.webp'">
          ${item.isSpecial ? '<span class="tag-special">Favorit</span>' : ''}
        </div>
        <div class="menu-card__body">
          <h3 class="menu-card__name">${esc(item.name)}</h3>
          <p class="menu-card__desc">${esc(item.description || '')}</p>
          <div class="menu-card__foot">
            <span class="price">${rupiah(item.price)}</span>
            <button type="button" class="btn btn--red btn--sm"
              data-add="${esc(item.id)}">+ Tambah</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  function renderCart() {
    const list = $('cart-items');
    const isEmpty = cart.length === 0;

    if (isEmpty) {
      list.innerHTML = '<p class="cart-empty">Belum ada menu yang dipilih.</p>';
    } else {
      list.innerHTML = cart.map((item) => `
        <li class="cart-item">
          <div class="cart-item__info">
            <div class="cart-item__name">${esc(item.name)}</div>
            <div class="cart-item__unit">${rupiah(item.price)} / porsi</div>
          </div>
          <div class="qty">
            <button type="button" data-dec="${esc(item.id)}"
              aria-label="Kurangi ${esc(item.name)}">−</button>
            <span>${item.qty}</span>
            <button type="button" data-inc="${esc(item.id)}"
              aria-label="Tambah ${esc(item.name)}">+</button>
          </div>
          <span class="cart-item__subtotal">${rupiah(item.price * item.qty)}</span>
          <button type="button" class="icon-btn" data-del="${esc(item.id)}"
            aria-label="Hapus ${esc(item.name)}">${ICONS.trash}</button>
        </li>
      `).join('');
    }

    $('cart-total').textContent = rupiah(cartTotal());
    $('cart-count').textContent = String(cartCount());

    const fab = $('fab');
    fab.hidden = isEmpty;
    $('fab-total').textContent = `${cartCount()} item · ${rupiah(cartTotal())}`;

    writeCart();
  }

  function renderFooter() {
    $('footer-name').textContent = config.businessName;

    const addr = $('footer-addr');
    addr.textContent = '';
    const mapsUrl = safeUrl(config.mapsUrl);
    if (mapsUrl) {
      const link = document.createElement('a');
      link.href = mapsUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = config.address || 'Lihat lokasi';
      link.style.textDecoration = 'underline';
      addr.appendChild(link);
    } else {
      addr.textContent = config.address || '';
    }

    const social = [
      ['instagram', config.socmed.instagram, 'Instagram'],
      ['facebook', config.socmed.facebook, 'Facebook'],
      ['whatsapp', config.socmed.whatsapp || `https://wa.me/${config.phoneNo}`, 'WhatsApp']
    ]
      .map(([icon, url, label]) => {
        const href = safeUrl(url);
        if (!href) return '';
        return `<a href="${esc(href)}" target="_blank" rel="noopener"
          aria-label="${label}" title="${label}">${ICONS[icon]}</a>`;
      })
      .join('');
    $('footer-social').innerHTML = social;

    $('year').textContent = new Date().getFullYear();
  }

  /* ------------------------------- aksi ---------------------------------- */

  function addToCart(id) {
    const menuItem = config.menu.find((m) => String(m.id) === String(id));
    if (!menuItem) return;

    const existing = cart.find((i) => String(i.id) === String(id));
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: menuItem.id, name: menuItem.name, price: Number(menuItem.price), qty: 1 });
    }
    renderCart();
    toast(`${menuItem.name} ditambahkan`, 'success', 1600);
  }

  function changeQty(id, delta) {
    const item = cart.find((i) => String(i.id) === String(id));
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((i) => String(i.id) !== String(id));
    renderCart();
  }

  function removeItem(id) {
    cart = cart.filter((i) => String(i.id) !== String(id));
    renderCart();
  }

  /* ---------------------------- validasi form ---------------------------- */

  function setError(fieldId, message) {
    const field = $(fieldId)?.closest('.field');
    if (!field) return;
    field.classList.toggle('field--error', Boolean(message));
    const err = field.querySelector('.error-text');
    if (err) err.textContent = message || '';
  }

  function buildOrderMessage(serviceType, customerInfo, note) {
    const lines = [
      `*Halo ${config.businessName}!*`,
      '',
      'Saya ingin memesan:',
      '',
      `Tipe Pelayanan: ${serviceType}`,
      `Detail Pemesan: ${customerInfo}`
    ];
    if (note) lines.push(`Catatan: ${note}`);
    lines.push('', '*Detail Pesanan:*');

    cart.forEach((item) => {
      lines.push(`- ${item.name} (${item.qty}x) : ${rupiah(item.price * item.qty)}`);
    });

    lines.push('', `*Total Bayar:* ${rupiah(cartTotal())}`, '', 'Mohon segera diproses ya, terima kasih!');
    return lines.join('\n');
  }

  function sendWhatsApp(event) {
    event.preventDefault();
    let valid = true;

    if (cart.length === 0) {
      toast('Pilih menu dulu ya!', 'error');
      valid = false;
    }

    const info = $('customer-info').value.trim();
    if (!info) {
      setError('customer-info', 'Wajib diisi — nama, no. meja, atau alamat.');
      valid = false;
    } else if (info.length < 3) {
      setError('customer-info', 'Terlalu pendek, minimal 3 karakter.');
      valid = false;
    } else {
      setError('customer-info', '');
    }

    const serviceType = $('service-type').value;
    if (!serviceType) {
      setError('service-type', 'Pilih tipe pelayanan.');
      valid = false;
    } else {
      setError('service-type', '');
    }

    if (!valid) return;

    if (!config.phoneNo || config.phoneNo.length < 9) {
      toast('Nomor WhatsApp toko belum diatur. Hubungi admin.', 'error', 4000);
      return;
    }

    // encodeURIComponent -> aman untuk emoji, newline, & karakter khusus
    const text = encodeURIComponent(buildOrderMessage(serviceType, info, $('order-note').value.trim()));
    window.open(`https://wa.me/${config.phoneNo}?text=${text}`, '_blank', 'noopener');
  }

  /* ------------------------------ binding -------------------------------- */

  function bindEvents() {
    $('filters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      renderFilters();
      renderMenu();
    });

    $('menu-container').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add]');
      if (btn) addToCart(btn.dataset.add);
    });

    $('cart-items').addEventListener('click', (e) => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const del = e.target.closest('[data-del]');
      if (inc) changeQty(inc.dataset.inc, 1);
      else if (dec) changeQty(dec.dataset.dec, -1);
      else if (del) removeItem(del.dataset.del);
    });

    $('order-form').addEventListener('submit', sendWhatsApp);

    $('customer-info').addEventListener('input', () => setError('customer-info', ''));

    // Simpan isi form supaya tidak hilang saat refresh
    const savedInfo = localStorage.getItem('restaurantCustomerInfo');
    if (savedInfo) $('customer-info').value = savedInfo;
    $('customer-info').addEventListener('change', (e) => {
      localStorage.setItem('restaurantCustomerInfo', e.target.value.trim());
    });

    // Tutup / buka cart lewat FAB
    $('fab').addEventListener('click', () => {
      $('keranjang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Sinkron antar-tab: kalau admin ubah config, halaman ini ikut update
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        config = mergeConfig(config, readLocalConfig());
        renderHeader(); renderMeta(); renderFilters(); renderMenu(); renderFooter();
        toast('Data toko diperbarui', 'success');
      }
      if (e.key === CART_KEY) {
        cart = readCart();
        renderCart();
      }
    });
  }

  /* ------------------------------- init ---------------------------------- */

  async function init() {
    config = await loadConfig();
    renderHeader();
    renderMeta();
    renderFilters();
    renderMenu();
    renderCart();
    renderFooter();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
