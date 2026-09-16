/* Coco Ceylon storefront — no framework, no build step.
   Cart state lives in localStorage so a refresh mid-order is survivable.
   Orders leave the page by email; card payment is deliberately not here yet. */
(() => {
  'use strict';

  /* ══ CONFIGURE ME ══════════════════════════════════════════════════════
     Everything the seller needs to change lives in this one block.        */
  const SELLER = {
    email: 'orders@cococeylon.lk',        // where order emails land
    phone: '+94112345678',                // tel: link
    phoneLabel: '+94 11 234 5678',
    whatsapp: '94771234567',              // country code + number, no +
    bank: {
      bank: 'Commercial Bank of Ceylon',
      name: 'Coco Ceylon (Pvt) Ltd',
      account: '8001 2345 67',
      branch: 'Colombo 05 (005)'
    }
  };

  /* Leave empty and the order opens a pre-filled email draft in the
     customer's mail app. Paste a form-relay endpoint here — e.g.
     'https://formsubmit.co/ajax/orders@cococeylon.lk' — and the order is
     POSTed straight to the seller's inbox with no draft to send.
     A real payment gateway replaces this step later. */
  const ORDER_ENDPOINT = '';

  const SHIPPING = 450;
  const FREE_OVER = 6000;
  const STORE_KEY = 'coco-ceylon-cart';
  /* ═════════════════════════════════════════════════════════════════════ */

  const PRODUCTS = [
    {
      id: 'king-coconut',
      name: 'King coconut',
      note: 'Thambili, cut this morning. Sold by the dozen, straws in the box.',
      price: 1850, unit: 'dozen', cat: 'fresh', tag: 'Cut today',
      img: 'assets/king-coconut.svg', glow: 'rgba(240,160,60,.26)'
    },
    {
      id: 'coconut-water',
      name: 'Young coconut water',
      note: 'Six green nuts, topped and sealed. Nothing added, nothing boiled.',
      price: 1490, unit: '6 nuts', cat: 'drinks', tag: 'Chilled',
      img: 'assets/coconut-water.svg', glow: 'rgba(143,191,109,.24)'
    },
    {
      id: 'coconut-oil',
      name: 'Virgin coconut oil',
      note: 'Cold-pressed within 48 hours of splitting. 500ml amber glass.',
      price: 2250, unit: '500 ml', cat: 'pantry', tag: 'Best seller',
      img: 'assets/coconut-oil.svg', glow: 'rgba(240,160,60,.2)'
    },
    {
      id: 'coconut-milk',
      name: 'First-press milk',
      note: 'Thick kiri hodi base, no gums or stabilisers. Keeps 5 days cold.',
      price: 890, unit: '1 litre', cat: 'pantry', tag: 'Fresh press',
      img: 'assets/coconut-milk.svg', glow: 'rgba(239,227,208,.18)'
    },
    {
      id: 'coconut-chips',
      name: 'Toasted chips',
      note: 'Wood-toasted, salted with Hambantota sea salt. Dangerously snackable.',
      price: 640, unit: '180 g', cat: 'pantry', tag: 'New',
      img: 'assets/coconut-chips.svg', glow: 'rgba(184,95,23,.28)'
    },
    {
      id: 'coconut-bowl',
      name: 'Shell bowl set',
      note: 'Two halves sanded and oiled by hand in Ambalangoda. No two alike.',
      price: 1950, unit: 'pair', cat: 'home', tag: 'Handmade',
      img: 'assets/coconut-bowl.svg', glow: 'rgba(120,88,60,.3)'
    },
    {
      id: 'coconut-sugar',
      name: 'Kithul-style treacle',
      note: 'Slow-reduced coconut sap. Dark, smoky, pours like honey.',
      price: 1180, unit: '350 ml', cat: 'pantry', tag: 'Small batch',
      img: 'assets/coconut-sugar.svg', glow: 'rgba(165,96,31,.28)'
    },
    {
      id: 'coconut-half',
      name: 'Mature coconut',
      note: 'Whole brown nuts for scraping. Four to a crate, husked on request.',
      price: 760, unit: '4 nuts', cat: 'fresh', tag: 'Kitchen staple',
      img: 'assets/coconut-half.svg', glow: 'rgba(200,170,130,.2)'
    },
    {
      id: 'coconut-flour',
      name: 'Coconut flour',
      note: 'Milled from pressed meal, nothing wasted. Gluten-free baking.',
      price: 980, unit: '1 kg', cat: 'pantry', tag: 'Zero waste',
      img: 'assets/coconut-flour.svg', glow: 'rgba(227,214,189,.18)'
    }
  ];

  const CATEGORIES = [
    { id: 'all', label: 'Everything' },
    { id: 'fresh', label: 'Fresh nuts' },
    { id: 'drinks', label: 'Drinks' },
    { id: 'pantry', label: 'Pantry' },
    { id: 'home', label: 'Home' }
  ];

  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const rupees = (n) => 'Rs ' + n.toLocaleString('en-LK');

  /** cart: { [productId]: qty } */
  let cart = load();
  let filter = 'all';

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      // Drop anything that no longer exists in the menu.
      return Object.fromEntries(
        Object.entries(raw).filter(([id, qty]) => byId(id) && Number(qty) > 0)
      );
    } catch {
      return {};
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch { /* private mode */ }
  }

  const lines = () => Object.entries(cart).map(([id, qty]) => ({ product: byId(id), qty }));
  const itemCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = () => lines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const shipping = () => (itemCount() === 0 || subtotal() >= FREE_OVER ? 0 : SHIPPING);
  const total = () => subtotal() + shipping();

  /* ── Product grid ──────────────────────────────────────────────────── */

  function renderFilters() {
    $('#filters').innerHTML = CATEGORIES.map((c) => `
      <button class="chip${c.id === filter ? ' is-active' : ''}" data-cat="${c.id}"
              aria-pressed="${c.id === filter}">${c.label}</button>
    `).join('');
  }

  function renderGrid() {
    const list = PRODUCTS.filter((p) => filter === 'all' || p.cat === filter);
    const grid = $('#grid');

    if (!list.length) {
      grid.innerHTML = '<p class="empty-note">Nothing in this category yet.</p>';
      return;
    }

    grid.innerHTML = list.map((p) => {
      const qty = cart[p.id] || 0;
      return `
        <article class="card reveal">
          <div class="card-media" style="--glow:${p.glow}">
            <span class="card-tag">${p.tag}</span>
            <img src="${p.img}" alt="${p.name}" loading="lazy" width="400" height="400">
          </div>
          <div class="card-body">
            <h3>${p.name}</h3>
            <p class="card-note">${p.note}</p>
            <div class="card-foot">
              <span class="price">${rupees(p.price)} <small>/ ${p.unit}</small></span>
              <button class="add-btn${qty ? ' is-added' : ''}" data-add="${p.id}">
                ${qty ? `In cart · ${qty}` : 'Add to cart'}
              </button>
            </div>
          </div>
        </article>`;
    }).join('');

    observeReveals();
  }

  /* ── Cart drawer ───────────────────────────────────────────────────── */

  function renderCart() {
    const count = itemCount();
    const badge = $('#cartCount');
    badge.textContent = count;
    badge.classList.toggle('is-empty', count === 0);

    const body = $('#cartBody');
    const foot = $('#cartFoot');

    if (!count) {
      foot.hidden = true;
      body.innerHTML = `
        <div class="cart-empty">
          <img src="assets/coconut-half.svg" alt="">
          <p>Your cart is empty.<br>Pick something from the menu.</p>
        </div>`;
      return;
    }

    foot.hidden = false;
    body.innerHTML = lines().map(({ product: p, qty }) => `
      <div class="line">
        <div class="line-media"><img src="${p.img}" alt="" width="48" height="48"></div>
        <div>
          <h4>${p.name}</h4>
          <p>${rupees(p.price)} / ${p.unit}</p>
          <div class="stepper">
            <button data-step="-1" data-id="${p.id}" aria-label="One fewer ${p.name}">−</button>
            <span>${qty}</span>
            <button data-step="1" data-id="${p.id}" aria-label="One more ${p.name}">+</button>
          </div>
        </div>
        <span class="line-price">${rupees(p.price * qty)}</span>
      </div>
    `).join('');

    $('#sumSubtotal').textContent = rupees(subtotal());
    $('#sumShipping').textContent = shipping() === 0 ? 'Free' : rupees(shipping());
    $('#sumTotal').textContent = rupees(total());

    const gap = FREE_OVER - subtotal();
    $('#shipHint').textContent = gap > 0
      ? `Add ${rupees(gap)} more for free delivery.`
      : 'Free delivery unlocked.';
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, 99);
    save();
    renderCart();
    renderGrid();
  }

  /* ── Overlays ──────────────────────────────────────────────────────── */

  const drawer = $('#drawer');
  const modal = $('#modal');
  const scrim = $('#scrim');

  const anyOpen = () =>
    drawer.classList.contains('is-open') || modal.classList.contains('is-open');

  function syncScrim() {
    scrim.classList.toggle('is-open', anyOpen());
    document.body.classList.toggle('is-locked', anyOpen());
  }

  function openDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    syncScrim();
    $('#cartClose').focus();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    syncScrim();
  }

  function openModal() {
    if (!itemCount()) { toast('Add something to your cart first'); return; }
    $('#checkoutView').hidden = false;
    $('#successView').hidden = true;
    renderRecap();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    closeDrawer();
    syncScrim();
    $('#name').focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    syncScrim();
  }

  function renderRecap() {
    $('#recap').innerHTML = `
      ${lines().map(({ product: p, qty }) =>
        `<div><span>${p.name} × ${qty}</span><span>${rupees(p.price * qty)}</span></div>`).join('')}
      <div><span>Delivery</span><span>${shipping() === 0 ? 'Free' : rupees(shipping())}</span></div>
      <div><span>Total</span><span>${rupees(total())}</span></div>`;
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-open'), 2200);
  }

  /* ── Checkout ──────────────────────────────────────────────────────── */

  const RULES = {
    name: (v) => v.trim().length >= 2,
    phone: (v) => v.replace(/\D/g, '').length >= 9,
    city: (v) => v.trim().length >= 2,
    address: (v) => v.trim().length >= 10
  };

  function validate(form) {
    let firstBad = null;
    for (const [key, rule] of Object.entries(RULES)) {
      const input = form.elements[key];
      const ok = rule(input.value);
      input.closest('.field').classList.toggle('has-error', !ok);
      if (!ok && !firstBad) firstBad = input;
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  const orderNumber = () => 'CC-' + Math.random().toString(36).slice(2, 7).toUpperCase();

  /** Everything the seller needs, as one readable email body. */
  function buildOrder(form) {
    const d = new FormData(form);
    return {
      ref: orderNumber(),
      placed: new Date().toLocaleString('en-LK'),
      name: d.get('name').trim(),
      phone: d.get('phone').trim(),
      email: (d.get('email') || '').trim(),
      city: d.get('city').trim(),
      address: d.get('address').trim(),
      slot: d.get('slot'),
      pay: d.get('pay'),
      notes: (d.get('notes') || '').trim(),
      items: lines().map(({ product: p, qty }) => ({
        name: p.name, unit: p.unit, qty, each: p.price, line: p.price * qty
      })),
      subtotal: subtotal(),
      shipping: shipping(),
      total: total()
    };
  }

  function orderText(o) {
    const rows = o.items
      .map((i) => `  • ${i.name} (${i.unit}) × ${i.qty} — ${rupees(i.line)}`)
      .join('\n');
    return [
      `NEW ORDER ${o.ref}`,
      `Placed: ${o.placed}`,
      '',
      'ITEMS',
      rows,
      '',
      `Subtotal: ${rupees(o.subtotal)}`,
      `Delivery: ${o.shipping === 0 ? 'Free' : rupees(o.shipping)}`,
      `TOTAL:    ${rupees(o.total)}`,
      `Payment:  ${o.pay}`,
      '',
      'CUSTOMER',
      `Name:    ${o.name}`,
      `Mobile:  ${o.phone}`,
      o.email ? `Email:   ${o.email}` : null,
      `City:    ${o.city}`,
      `Address: ${o.address}`,
      `Window:  ${o.slot}`,
      o.notes ? `Notes:   ${o.notes}` : null
    ].filter(Boolean).join('\n');
  }

  const mailtoFor = (o) =>
    `mailto:${SELLER.email}` +
    `?subject=${encodeURIComponent(`New order ${o.ref} — ${o.name} — ${rupees(o.total)}`)}` +
    `&body=${encodeURIComponent(orderText(o))}`;

  const whatsappFor = (o) =>
    `https://wa.me/${SELLER.whatsapp}?text=${encodeURIComponent(orderText(o))}`;

  /** POST to the relay if one is configured; the email draft is the fallback. */
  async function deliverOrder(o) {
    if (!ORDER_ENDPOINT) return { sent: false, reason: 'no-endpoint' };
    try {
      const res = await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: `New order ${o.ref} — ${o.name} — ${rupees(o.total)}`,
          order: o,
          summary: orderText(o)
        })
      });
      return { sent: res.ok, reason: res.ok ? 'relay' : 'relay-failed' };
    } catch {
      return { sent: false, reason: 'relay-failed' };
    }
  }

  function showSuccess(o, delivered) {
    $('#orderNo').textContent = o.ref;
    $('#successMeta').textContent =
      `${o.items.reduce((a, i) => a + i.qty, 0)} item(s) · ${rupees(o.total)} · ${o.pay} · ${o.slot}`;

    $('#successLead').textContent = delivered
      ? 'Your order is in the seller’s inbox. We’ll call to confirm the delivery window.'
      : 'Your email app is opening with the order filled in — press send and it reaches the seller. Prefer to talk? Call or WhatsApp instead.';

    $('#bankPanel').hidden = o.pay !== 'Bank transfer';
    $('#mailAgain').href = mailtoFor(o);
    $('#waAgain').href = whatsappFor(o);
    $('#callAgain').href = 'tel:' + SELLER.phone;

    $('#checkoutView').hidden = true;
    $('#successView').hidden = false;
  }

  /* ── Scroll reveal + nav highlighting ──────────────────────────────── */

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' })
    : null;

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => {
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('is-in');
    });
  }

  const sectionObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          document.querySelectorAll('.nav a').forEach((a) => {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' })
    : null;

  /* ── Seller details into the markup ────────────────────────────────── */

  function paintSeller() {
    document.querySelectorAll('[data-seller="phone"]').forEach((el) => {
      el.textContent = SELLER.phoneLabel;
      if (el.tagName === 'A') el.href = 'tel:' + SELLER.phone;
    });
    document.querySelectorAll('[data-seller="tel"]').forEach((el) => { el.href = 'tel:' + SELLER.phone; });
    document.querySelectorAll('[data-seller="wa"]').forEach((el) => { el.href = 'https://wa.me/' + SELLER.whatsapp; });
    document.querySelectorAll('[data-seller="email"]').forEach((el) => {
      el.textContent = SELLER.email;
      if (el.tagName === 'A') el.href = 'mailto:' + SELLER.email;
    });

    const b = SELLER.bank;
    document.querySelectorAll('[data-bank]').forEach((el) => {
      el.innerHTML = `
        <div><span>Bank</span><span>${b.bank}</span></div>
        <div><span>Account name</span><span>${b.name}</span></div>
        <div><span>Account no.</span><span>${b.account}</span></div>
        <div><span>Branch</span><span>${b.branch}</span></div>`;
    });
  }

  /* ── Wiring ────────────────────────────────────────────────────────── */

  function init() {
    paintSeller();
    renderFilters();
    renderGrid();
    renderCart();
    observeReveals();

    $('#filters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      filter = btn.dataset.cat;
      renderFilters();
      renderGrid();
    });

    $('#grid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      const p = byId(btn.dataset.add);
      setQty(p.id, (cart[p.id] || 0) + 1);
      toast(`${p.name} added to your cart`);
    });

    $('#cartBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-step]');
      if (!btn) return;
      const id = btn.dataset.id;
      setQty(id, (cart[id] || 0) + Number(btn.dataset.step));
    });

    $('#cartOpen').addEventListener('click', openDrawer);
    $('#cartClose').addEventListener('click', closeDrawer);
    $('#checkoutOpen').addEventListener('click', openModal);
    $('#modalClose').addEventListener('click', closeModal);
    $('#successClose').addEventListener('click', closeModal);

    scrim.addEventListener('click', () => { closeModal(); closeDrawer(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (modal.classList.contains('is-open')) closeModal();
      else if (drawer.classList.contains('is-open')) closeDrawer();
    });

    // Bank details appear inline the moment bank transfer is chosen.
    $('#checkoutForm').addEventListener('change', (e) => {
      if (e.target.name !== 'pay') return;
      $('#bankInline').hidden = e.target.value !== 'Bank transfer';
    });

    $('#checkoutForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!validate(form)) return;

      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Sending the order…';

      const order = buildOrder(form);
      const { sent } = await deliverOrder(order);

      // Without a relay, hand the customer a pre-filled draft to send.
      if (!sent) window.location.href = mailtoFor(order);

      showSuccess(order, sent);

      cart = {};
      save();
      renderCart();
      renderGrid();
      form.reset();
      $('#bankInline').hidden = true;
      submit.disabled = false;
      submit.textContent = 'Place order';
    });

    // Header treatment once the page has scrolled off the top.
    const header = $('#header');
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (sectionObserver) {
      document.querySelectorAll('main section[id]').forEach((s) => sectionObserver.observe(s));
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
