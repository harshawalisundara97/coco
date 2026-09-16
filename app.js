/* KussiAmma.lk storefront — no framework, no build step.
   Cart state lives in localStorage so a refresh mid-order is survivable.
   Orders leave the page by email; there is no card payment anywhere. */
(() => {
  'use strict';

  /* ══ CONFIGURE ME ══════════════════════════════════════════════════════
     Everything the seller changes lives in this one block.                */
  const SELLER = {
    email: 'orders@kussiamma.lk',         // where order emails land
    phone: '+94771234567',                // tel: link
    phoneLabel: '+94 77 123 4567',
    whatsapp: '94771234567',              // country code + number, no +
    bank: {
      bank: 'Commercial Bank of Ceylon',
      name: 'KussiAmma (Pvt) Ltd',
      account: '8001 2345 67',
      branch: 'Nugegoda (038)'
    }
  };

  /* Leave empty and the order opens a pre-filled email draft in the
     customer's mail app. Paste a form-relay endpoint here — e.g.
     'https://formsubmit.co/ajax/orders@kussiamma.lk' — and the order is
     POSTed straight to the seller's inbox with no draft to send. */
  const ORDER_ENDPOINT = '';

  const SHIPPING = 300;
  const FREE_OVER = 3000;
  const STORE_KEY = 'kussiamma-cart';

  /* ⚠ PRICES BELOW ARE PLACEHOLDERS — grated coconut is priced at a flat
     Rs 1,000 per kilo, which the packs section states in so many words.
     Change both together if your real pricing differs. */
  const PRODUCTS = [
    {
      id: 'grated-100g', group: 'grated',
      name: '100 g packet', unit: '100 g', price: 100,
      desc: 'One-meal packet. Enough for a pol sambol without opening a bigger bag.',
      img: 'assets/photos/pack-100g.jpg'
    },
    {
      id: 'grated-250g', group: 'grated',
      name: '250 g packet', unit: '250 g', price: 250,
      desc: 'A week of home cooking. Resealable top, so it stays dry between uses.',
      img: 'assets/photos/pack-250g.jpg'
    },
    {
      id: 'grated-500g', group: 'grated',
      name: '500 g pouch', unit: '500 g', price: 500,
      desc: 'The size most households reorder. Sambol, curry, baking and sweets from one pouch.',
      img: 'assets/photos/pack-500g.jpg'
    },
    {
      id: 'grated-1kg', group: 'grated',
      name: '1 kg pack', unit: '1 kg', price: 1000,
      desc: 'Kitchen and small-restaurant size. Take four or more and ask us for the trade rate.',
      img: 'assets/photos/pack-1kg.jpg'
    },
    {
      id: 'milk-200', group: 'milk',
      name: 'Coconut milk — 200 ml', unit: '200 ml', price: 280,
      desc: 'Single-cook size, so an opened pack never goes to waste.',
      img: 'assets/photos/milk-200.jpg'
    },
    {
      id: 'milk-400', group: 'milk',
      name: 'Coconut milk — 400 ml', unit: '400 ml', price: 480,
      desc: 'First press, thick. No gums, no stabilisers, no preservatives.',
      img: 'assets/photos/milk-400.jpg'
    },
    {
      id: 'milk-1l', group: 'milk',
      name: 'Coconut milk — 1 litre', unit: '1 litre', price: 1090,
      desc: 'Catering pack for kitchens and caterers. The same first-press milk.',
      img: 'assets/photos/milk-1l.jpg'
    }
  ];

  const GROUPS = [
    { id: 'grated', label: 'Fresh grated coconut', eyebrow: 'Fresh grated coconut' },
    { id: 'milk', label: 'Coconut milk', eyebrow: 'Coconut milk' }
  ];
  /* ═════════════════════════════════════════════════════════════════════ */

  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const rupees = (n) => 'Rs ' + n.toLocaleString('en-LK');

  /** cart: { [productId]: qty } */
  let cart = load();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      // Drop anything that no longer exists in the list.
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

  /* ── Packs ─────────────────────────────────────────────────────────── */

  function renderPacks() {
    $('#packGroups').innerHTML = GROUPS.map((g) => {
      const items = PRODUCTS.filter((p) => p.group === g.id);
      if (!items.length) return '';
      return `
        <div class="pack-group">
          <h3>${g.label}</h3>
          <div class="packs">
            ${items.map((p) => `
              <article class="pack">
                <div class="pack-photo">
                  <img src="${p.img}" alt="${p.name}" loading="lazy" width="820" height="820">
                </div>
                <p class="eyebrow">${g.eyebrow}</p>
                <h3>${p.name}</h3>
                <p class="desc">${p.desc}</p>
                <div class="pack-foot">
                  <span class="price">${rupees(p.price)}<small>per ${p.unit}</small></span>
                  <div class="stepper">
                    <button type="button" data-step="-1" data-id="${p.id}" aria-label="One fewer ${p.name}">–</button>
                    <span class="qty" aria-live="polite">${cart[p.id] || 0}</span>
                    <button type="button" data-step="1" data-id="${p.id}" aria-label="One more ${p.name}">+</button>
                  </div>
                </div>
              </article>`).join('')}
          </div>
        </div>`;
    }).join('');
  }

  /** Update just the readouts, so a stepper press does not rebuild the grid. */
  function syncSteppers() {
    document.querySelectorAll('.stepper').forEach((s) => {
      const id = s.querySelector('[data-step]').dataset.id;
      s.querySelector('.qty').textContent = cart[id] || 0;
    });
  }

  /* ── Order summary, cart bar ───────────────────────────────────────── */

  function renderSummary() {
    const count = itemCount();
    const box = $('#sumLines');

    box.innerHTML = count
      ? lines().map(({ product: p, qty }) => `
          <div class="line">
            <span>${p.name} × ${qty}</span>
            <span>${rupees(p.price * qty)}</span>
          </div>`).join('')
      : '<p class="sum-empty">Nothing chosen yet. Pick a pack below and it appears here.</p>';

    $('#sumSubtotal').textContent = rupees(subtotal());
    // With an empty cart, show the standing rate rather than a misleading Rs 0.
    $("#sumShipping").textContent = !count ? rupees(SHIPPING)
      : shipping() === 0 ? "Free" : rupees(shipping());
    $('#sumTotal').textContent = rupees(total());

    const gap = FREE_OVER - subtotal();
    $('#shipHint').textContent = !count ? ''
      : gap > 0 ? `Add ${rupees(gap)} more and delivery is free.`
      : 'Delivery is free on this order.';

    const bar = $('#cartbar');
    bar.classList.toggle('is-open', count > 0);
    $('#barCount').textContent = `${count} pack${count === 1 ? '' : 's'}`;
    $('#barTotal').textContent = `${rupees(total())} · pay on delivery`;
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart[id];
    else cart[id] = Math.min(qty, 99);
    save();
    syncSteppers();
    renderSummary();
    if (itemCount()) $('#cartErr').style.display = 'none';
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-open'), 2000);
  }

  /* ── Hero rotator ──────────────────────────────────────────────────── */

  function initRotator() {
    const photos = [...document.querySelectorAll('.hero-photo')];
    const controls = $('#rotator');
    if (photos.length < 2) return;

    controls.innerHTML = photos.map((_, i) => `
      <button type="button" aria-label="Show photograph ${i + 1}"${i === 0 ? ' class="is-active"' : ''}>
        <span></span>
      </button>`).join('');

    const buttons = [...controls.children];
    let index = 0;

    const show = (next) => {
      index = next;
      photos.forEach((p, i) => p.classList.toggle('is-active', i === index));
      buttons.forEach((b, i) => b.classList.toggle('is-active', i === index));
    };

    // Auto-rotation is a convenience, not the control; a click takes over.
    let timer = setInterval(() => show((index + 1) % photos.length), 6000);
    buttons.forEach((b, i) => b.addEventListener('click', () => {
      clearInterval(timer);
      timer = null;
      show(i);
    }));
  }

  /* ── "Tree to packet" — scroll-driven story ────────────────────────────
     Driven by scroll *position*, never by a timer, so it never plays on its
     own and needs no special handling under prefers-reduced-motion. */

  const STAGES = [
    { from: 0,    to: 0.42, caption: 'A mature nut drops from the palm.' },
    { from: 0.42, to: 0.58, caption: 'Husked and split, the water drained off.' },
    { from: 0.56, to: 0.78, caption: 'The white is scraped from the shell the same morning.' },
    { from: 0.76, to: 1,    caption: 'Weighed into the packet, sealed and date-stamped.' }
  ];

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  /** How far through its own window `p` has travelled, as 0→1. */
  const ramp = (p, { from, to }) => clamp01((p - from) / (to - from));

  function initStory() {
    const section = $('#story');
    if (!section) return;

    const nut = $('#stageNut');
    const tree = $('#stageTree');
    const fronds = $('#stageFronds');
    const hanging = $('#stageHanging');
    const halfL = $('#stageHalfL');
    const halfR = $('#stageHalfR');
    const pile = $('#stagePile');
    const packet = $('#stagePacket');
    const caption = $('#stageCaption');
    const progress = $('#stageProgress');
    const steps = [...$('#stageSteps').children];

    let last = -1;
    let queued = false;

    function draw(p) {
      // 01 — the nut lets go of the palm and falls to the ground rule,
      // drifting to the centre line and turning as it goes.
      const fall = ramp(p, STAGES[0]);
      const fell = p >= STAGES[1].from;
      // Hidden until it actually lets go, so it never sits on top of the crown.
      nut.style.opacity = (fell || fall <= 0.03) ? 0 : 1;
      nut.style.left = (20 + fall * 30) + '%';
      nut.style.top = (46 + fall * 28) + '%';
      nut.style.transform = `rotate(${fall * 300}deg)`;

      // The palm recoils as the nut leaves, then settles — one damped swing
      // rather than a loop, so nothing moves unless the page is scrolling.
      const recoil = Math.sin(fall * Math.PI * 2) * (1 - fall) * 3.2;
      tree.style.setProperty('--sway', recoil.toFixed(2) + 'deg');
      fronds.style.transform = `rotate(${(-recoil * 1.6).toFixed(2)}deg)`;
      // The nut it dropped leaves the cluster the moment it lets go.
      hanging.style.opacity = fall > 0.04 ? 0 : 1;

      // 02 — two halves seated on the rule separate to ±62px.
      const split = ramp(p, STAGES[1]);
      const gone = p >= STAGES[3].from;
      const halfFade = gone ? 1 - ramp(p, STAGES[3]) : (fell ? 1 : 0);
      halfL.style.opacity = halfFade;
      halfR.style.opacity = halfFade;
      halfL.style.transform = `translate(${-split * 62}px, -38px)`;
      halfR.style.transform = `translate(${split * 62}px, -38px)`;

      // 03 — the grated pile grows up off the ground rule.
      const grate = ramp(p, STAGES[2]);
      pile.style.height = (grate * 96) + 'px';
      pile.style.opacity = halfFade;

      // 04 — the packet scales up in its place.
      const pack = ramp(p, STAGES[3]);
      packet.style.opacity = pack;
      packet.style.transform = `translateY(-100%) scale(${0.6 + pack * 0.4})`;

      // Labels, caption and the progress rule.
      let active = 0;
      for (let i = STAGES.length - 1; i >= 0; i--) {
        if (p >= STAGES[i].from) { active = i; break; }
      }
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
      caption.textContent = STAGES[active].caption;
      progress.style.width = (p * 100) + '%';
    }

    function measure() {
      const rect = section.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const p = range > 0 ? clamp01(-rect.top / range) : 0;

      // Ignore sub-pixel jitter; repaint only on a real move.
      if (Math.abs(p - last) > 0.004) {
        last = p;
        draw(p);
      }
      queued = false;
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    draw(0);
    onScroll();
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

  const orderNumber = () => 'KA-' + Math.random().toString(36).slice(2, 7).toUpperCase();

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
      postal: (d.get('postal') || '').trim(),
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
      // Pack sizes are often already in the name — do not repeat them.
      .map((i) => `  • ${i.name}${i.name.includes(i.unit) ? '' : ` (${i.unit})`} × ${i.qty} — ${rupees(i.line)}`)
      .join('\n');
    return [
      `NEW ORDER ${o.ref}`,
      `Placed: ${o.placed}`,
      '',
      'ITEMS',
      rows,
      '',
      `Packs:    ${rupees(o.subtotal)}`,
      `Delivery: ${o.shipping === 0 ? 'Free' : rupees(o.shipping)}`,
      `TOTAL:    ${rupees(o.total)}`,
      `Payment:  ${o.pay}`,
      '',
      'CUSTOMER',
      `Name:    ${o.name}`,
      `Phone:   ${o.phone}`,
      o.email ? `Email:   ${o.email}` : null,
      `City:    ${o.city}`,
      `Address: ${o.address}`,
      o.postal ? `Postal:  ${o.postal}` : null,
      `Run:     ${o.slot}`,
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
    if (!ORDER_ENDPOINT) return { sent: false };
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
      return { sent: res.ok };
    } catch {
      return { sent: false };
    }
  }

  const bankRows = () => {
    const b = SELLER.bank;
    return `
      <div><span>Bank</span><span>${b.bank}</span></div>
      <div><span>Account name</span><span>${b.name}</span></div>
      <div><span>Account no.</span><span>${b.account}</span></div>
      <div><span>Branch</span><span>${b.branch}</span></div>`;
  };

  function showConfirmation(o, delivered) {
    const day = o.slot.split(',')[0];
    $('#formPanel').innerHTML = `
      <div class="confirm">
        <p class="kicker">Order received</p>
        <p class="order-id">${o.ref}</p>
        <p class="lede">
          Thank you, ${o.name}. We will call ${o.phone} to confirm the
          ${day} run. Keep ${rupees(o.total)} ready for the delivery man.
        </p>
        ${delivered ? '' : `
          <p class="lede"><strong>One more step:</strong> your email app is opening with the
          order filled in — press send and it reaches us. Prefer to talk? Call or WhatsApp.</p>`}
        ${o.pay === 'Bank transfer' ? `<div class="bank-box">${bankRows()}</div>` : ''}
        <div class="confirm-to">
          <strong>Delivering to</strong><br>
          ${o.address}${o.postal ? ', ' + o.postal : ''}<br>${o.city}
        </div>
        <div class="confirm-actions">
          ${delivered ? '' : `<a class="btn btn--primary" href="${mailtoFor(o)}">Send the order email</a>`}
          <a class="btn btn--ghost" href="${whatsappFor(o)}" target="_blank" rel="noopener">WhatsApp it</a>
          <a class="btn btn--ghost" href="tel:${SELLER.phone}">Call us</a>
          <button class="btn btn--ghost" type="button" id="againBtn">Place another order</button>
        </div>
      </div>`;

    $('#againBtn').addEventListener('click', () => location.reload());
  }

  /* ── Seller details into the markup ────────────────────────────────── */

  function paintSeller() {
    document.querySelectorAll('[data-seller="phone"]').forEach((el) => {
      el.textContent = SELLER.phoneLabel;
    });
    document.querySelectorAll('[data-seller="tel"]').forEach((el) => { el.href = 'tel:' + SELLER.phone; });
    document.querySelectorAll('[data-seller="wa"]').forEach((el) => { el.href = 'https://wa.me/' + SELLER.whatsapp; });
    document.querySelectorAll('[data-seller="email"]').forEach((el) => {
      el.textContent = SELLER.email;
      el.href = 'mailto:' + SELLER.email;
    });
    document.querySelectorAll('[data-bank]').forEach((el) => { el.innerHTML = bankRows(); });

    // The delivery figures are stated in three places; keep them in step.
    $('#statFree').textContent = rupees(FREE_OVER);
    $('#deliveryCopy').textContent =
      `Packs plus ${rupees(SHIPPING)} delivery. Free above ${rupees(FREE_OVER)}. ` +
      'Cash at the door or bank transfer.';
    $('#sumShipping').textContent = rupees(SHIPPING);
  }

  /* ── Wiring ────────────────────────────────────────────────────────── */

  function init() {
    paintSeller();
    renderPacks();
    renderSummary();
    initRotator();
    initStory();

    $('#packGroups').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-step]');
      if (!btn) return;
      const id = btn.dataset.id;
      const step = Number(btn.dataset.step);
      setQty(id, (cart[id] || 0) + step);
      if (step > 0) toast(`${byId(id).name} added`);
    });

    // Bank details appear inline the moment bank transfer is chosen.
    $('#checkoutForm').addEventListener('change', (e) => {
      if (e.target.name !== 'pay') return;
      $('#bankInline').hidden = e.target.value !== 'Bank transfer';
    });

    $('#checkoutForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;

      if (!itemCount()) {
        $('#cartErr').style.display = 'block';
        document.getElementById('packs').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (!validate(form)) return;

      const submit = $('#placeOrder');
      submit.disabled = true;
      submit.textContent = 'Sending the order…';

      const order = buildOrder(form);
      const { sent } = await deliverOrder(order);

      // Without a relay, hand the customer a pre-filled draft to send.
      if (!sent) window.location.href = mailtoFor(order);

      showConfirmation(order, sent);

      cart = {};
      save();
      renderPacks();
      renderSummary();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
