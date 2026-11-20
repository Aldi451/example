/* ==========================================================================
   app.js — halaman pelanggan (index.html)
   ========================================================================== */
(function () {
  'use strict';

  let config = FALLBACK_CONFIG;
  let cart = readCart();
  let activeCategory = 'Semua';
  let searchTerm = '';
  let submitting = false;

  const $ = (id) => document.getElementById(id);

  /* ----------------------------- keranjang ------------------------------- */

  function readCart() {
    const raw = readJson(APP.LS_CART, []);
    return Array.isArray(raw) ? raw.filter((i) => i && i.id && i.qty > 0) : [];
  }

  const writeCart = () => store(APP.LS_CART, cart);
  const cartTotal = () => cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = () => cart.reduce((sum, i) => sum + i.qty, 0);

  /* ------------------------------ render --------------------------------- */

  function renderHeader() {
    document.title = config.businessName + ' — Pesan Online';
    $('brand-name').textContent = config.businessName;
    $('brand-tag').textContent = config.tagline || '';
    $('welcome-desc').textContent = config.welcomeDescription || '';
    $('info-bar').textContent = config.tagline
      ? `Nikmati ${config.businessName} — ${config.tagline}`
      : `Nikmati ${config.businessName}`;

    // Ikon SVG inline (tanpa CDN). Guard: elemen opsional tidak boleh mematikan halaman.
    const icons = {
      'cart-icon': ICONS.cart,
      'menu-icon': ICONS.utensils,
      'cart-title-icon': ICONS.receipt,
      'submit-icon': ICONS.whatsapp,
      'search-icon': ICONS.search
    };
    Object.entries(icons).forEach(([id, svg]) => {
      const el = $(id);
      if (el) el.innerHTML = svg;
    });
  }

  function renderMeta() {
    const parts = [];
    if (config.openingHours) parts.push(`<span>${ICONS.clock} ${esc(config.openingHours)}</span>`);
    if (config.phoneNo) {
      parts.push(`<span>${ICONS.phone} <a href="https://wa.me/${esc(config.phoneNo)}"
        target="_blank" rel="noopener noreferrer">+${esc(config.phoneNo)}</a></span>`);
    }
    if (config.address) parts.push(`<span>${ICONS.pin} ${esc(config.address)}</span>`);
    $('meta-row').innerHTML = parts.join('');
  }

  function renderServices() {
    const options = config.services.filter((s) => s.enabled && s.label);
    const select = $('service-type');
    select.innerHTML = options.length
      ? options.map((s) => `<option value="${esc(s.label)}">${esc(s.label)}</option>`).join('')
      : '<option value="">Layanan belum diatur</option>';
  }

  function renderFilters() {
    const cats = ['Semua', ...new Set(config.menu.map((m) => m.category || 'Lainnya'))];
    if (!cats.includes(activeCategory)) activeCategory = 'Semua';

    $('filters').innerHTML = cats.map((c) => `
      <button type="button" class="chip" data-cat="${esc(c)}"
        aria-pressed="${c === activeCategory}">${esc(c)}</button>
    `).join('');
  }

  function renderMenu() {
    const container = $('menu-container');
    const q = searchTerm.toLowerCase();

    const items = config.menu.filter((m) => {
      const byCat = activeCategory === 'Semua' || (m.category || 'Lainnya') === activeCategory;
      const bySearch = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
      return byCat && bySearch;
    });

    if (!items.length) {
      container.innerHTML = '<p class="cart-empty">Menu tidak ditemukan. Coba kata kunci lain.</p>';
      return;
    }

    container.innerHTML = items.map((item) => {
      const src = safeUrl(item.image) || item.image || 'assets/img/logo.webp';
      const fallback = 'assets/img/logo.webp';
      return `
      <article class="menu-card${item.soldOut ? ' menu-card--out' : ''}">
        <div class="menu-card__thumb">
          <img src="${esc(src.startsWith('assets/') ? src : fallback)}"
               alt="${esc(item.name)}" width="880" height="660"
               loading="lazy" decoding="async"
               onerror="this.onerror=null;this.src='${fallback}'">
          ${item.soldOut ? '<span class="tag-out">Habis</span>'
            : item.isSpecial ? '<span class="tag-special">Favorit</span>' : ''}
        </div>
        <div class="menu-card__body">
          <h3 class="menu-card__name">${esc(item.name)}</h3>
          <p class="menu-card__desc">${esc(item.description || '')}</p>
          <div class="menu-card__foot">
            <span class="price">${rupiah(item.price)}</span>
            ${item.soldOut
              ? '<button type="button" class="btn btn--sm btn--disabled" disabled>Habis</button>'
              : `<button type="button" class="btn btn--red btn--sm" data-add="${esc(item.id)}">+ Tambah</button>`}
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderCart() {
    const list = $('cart-items');

    if (!cart.length) {
      list.innerHTML = '<p class="cart-empty">Belum ada menu yang dipilih.</p>';
    } else {
      list.innerHTML = cart.map((item) => `
        <li class="cart-item">
          <div class="cart-item__info">
            <div class="cart-item__name">${esc(item.name)}</div>
            <div class="cart-item__unit">${rupiah(item.price)} / porsi</div>
          </div>
          <div class="qty">
            <button type="button" data-dec="${esc(item.id)}" aria-label="Kurangi ${esc(item.name)}">−</button>
            <span aria-live="polite">${item.qty}</span>
            <button type="button" data-inc="${esc(item.id)}" aria-label="Tambah ${esc(item.name)}">+</button>
          </div>
          <span class="cart-item__subtotal">${rupiah(item.price * item.qty)}</span>
          <button type="button" class="icon-btn" data-del="${esc(item.id)}"
            aria-label="Hapus ${esc(item.name)}">${ICONS.trash}</button>
        </li>
      `).join('');
    }

    $('cart-total').textContent = rupiah(cartTotal());
    $('cart-count').textContent = String(cartCount());
    $('fab').hidden = !cart.length;
    $('fab-total').textContent = `${cartCount()} item · ${rupiah(cartTotal())}`;
    writeCart();
  }

  function renderMap() {
    const block = $('lokasi');
    const link = safeUrl(config.mapsUrl);
    if (!link) { block.hidden = true; return; }
    block.hidden = false;

    // Embed tanpa API key: cukup q= alamat, tidak mengirim data pelanggan.
    const query = encodeURIComponent(config.address || config.businessName);
    $('map-frame').src = `https://maps.google.com/maps?q=${query}&output=embed&z=15`;
    $('map-link').href = link;
    $('map-address').textContent = config.address || '';
  }

  function renderFooter() {
    $('footer-name').textContent = config.businessName;

    const addr = $('footer-addr');
    addr.textContent = '';
    const mapsUrl = safeUrl(config.mapsUrl);
    if (mapsUrl) {
      const a = document.createElement('a');
      a.href = mapsUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = config.address || 'Lihat lokasi di Google Maps';
      addr.appendChild(a);
    } else {
      addr.textContent = config.address || '';
    }

    const social = [
      ['instagram', config.socmed.instagram, 'Instagram'],
      ['facebook', config.socmed.facebook, 'Facebook'],
      ['whatsapp', config.socmed.whatsapp || (config.phoneNo ? `https://wa.me/${config.phoneNo}` : ''), 'WhatsApp']
    ].map(([icon, url, label]) => {
      const href = safeUrl(url);
      if (!href) return '';
      return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"
        aria-label="${label}" title="${label}">${ICONS[icon]}</a>`;
    }).join('');
    $('footer-social').innerHTML = social || '<p class="copyright">Social media belum diatur.</p>';

    $('year').textContent = new Date().getFullYear();
  }

  /* ------------------------------- aksi ---------------------------------- */

  function addToCart(id) {
    const menuItem = config.menu.find((m) => String(m.id) === String(id));
    if (!menuItem || menuItem.soldOut) return;

    const existing = cart.find((i) => String(i.id) === String(id));
    if (existing) existing.qty = Math.min(99, existing.qty + 1);
    else cart.push({ id: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1 });

    renderCart();
    toast(`${menuItem.name} ditambahkan`, 'success', 1500);
  }

  function changeQty(id, delta) {
    const item = cart.find((i) => String(i.id) === String(id));
    if (!item) return;
    item.qty = Math.min(99, item.qty + delta);
    if (item.qty <= 0) cart = cart.filter((i) => String(i.id) !== String(id));
    renderCart();
  }

  const removeItem = (id) => {
    cart = cart.filter((i) => String(i.id) !== String(id));
    renderCart();
  };

  /* ---------------------------- validasi form ---------------------------- */

  function setError(inputId, message) {
    const field = $(inputId)?.closest('.field');
    if (!field) return;
    field.classList.toggle('field--error', Boolean(message));
    const err = field.querySelector('.error-text');
    if (err) err.textContent = message || '';
    $(inputId).setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function buildOrderMessage({ serviceType, customerInfo, note }) {
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

  async function submitOrder(event) {
    event.preventDefault();
    if (submitting) return;

    const serviceType = $('service-type').value;
    const info = $('customer-info').value.trim();
    const note = $('order-note').value.trim();

    let firstInvalid = null;
    if (!cart.length) {
      toast('Pilih menu dulu ya!', 'error');
      firstInvalid = $('menu-container');
    }
    if (info.length < 3) {
      setError('customer-info', 'Wajib diisi (nama / no. meja / alamat), minimal 3 karakter.');
      firstInvalid = firstInvalid || $('customer-info');
    } else {
      setError('customer-info', '');
    }
    if (!serviceType) {
      setError('service-type', 'Pilih tipe pelayanan.');
      firstInvalid = firstInvalid || $('service-type');
    } else {
      setError('service-type', '');
    }
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!/^62\d{8,14}$/.test(config.phoneNo)) {
      toast('Nomor WhatsApp toko belum valid. Hubungi admin.', 'error', 4000);
      return;
    }

    const btn = $('submit-order');
    submitting = true;
    btn.disabled = true;
    btn.classList.add('is-loading');

    try {
      // 1) Catat pesanan agar pemilik punya riwayat (gagal pun WA tetap jalan)
      const items = cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
      try {
        await DB.createOrder({ customerInfo: info, serviceType, note, items, total: cartTotal() });
      } catch (err) {
        console.warn('Pesanan gagal dicatat:', err.message);
      }

      // 2) Buka WhatsApp dengan pesan ter-encode
      const text = encodeURIComponent(buildOrderMessage({ serviceType, customerInfo: info, note }));
      window.open(`https://wa.me/${config.phoneNo}?text=${text}`, '_blank', 'noopener');

      toast('Pesanan siap dikirim di WhatsApp', 'success', 3500);
      cart = [];
      renderCart();
      $('customer-info').value = '';
      $('order-note').value = '';
      store(APP.LS_CART, []);
    } finally {
      submitting = false;
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
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

    $('menu-search').addEventListener('input', (e) => {
      searchTerm = e.target.value.trim();
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

    $('order-form').addEventListener('submit', submitOrder);
    $('customer-info').addEventListener('input', () => setError('customer-info', ''));

    const savedInfo = localStorage.getItem('restaurantCustomerInfo');
    if (savedInfo) $('customer-info').value = savedInfo;
    $('customer-info').addEventListener('change', (e) => {
      store('restaurantCustomerInfo', e.target.value.trim());
    });

    $('fab').addEventListener('click', () => {
      $('keranjang').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Sinkron antar-tab (preview admin -> halaman pelanggan)
    window.addEventListener('storage', (e) => {
      if (e.key === APP.LS_CONFIG) {
        DB.getPublicConfig().then((cfg) => {
          config = cfg;
          renderHeader(); renderMeta(); renderServices();
          renderFilters(); renderMenu(); renderMap(); renderFooter();
          toast('Data toko diperbarui', 'success');
        });
      }
      if (e.key === APP.LS_CART) { cart = readCart(); renderCart(); }
    });
  }

  /* ------------------------------- init ---------------------------------- */

  async function init() {
    config = await DB.getPublicConfig();
    renderHeader();
    renderMeta();
    renderServices();
    renderFilters();
    renderMenu();
    renderCart();
    renderMap();
    renderFooter();
    bindEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
