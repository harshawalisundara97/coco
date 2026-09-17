/* KussiAmma.lk storefront — no framework, no build step.
   Cart state lives in localStorage so a refresh mid-order is survivable.
   Orders leave the page by email; there is no card payment anywhere. */
(() => {
  'use strict';

  /* ══ CONFIGURE ME ══════════════════════════════════════════════════════
     Everything the seller changes lives in this one block.                */
  const SELLER = {
    email: 'ranjanawijerathne@gmail.com',  // where order emails land
    phone: '+94753916554',                 // tel: link
    phoneLabel: '+94 75 391 6554',
    whatsapp: '94753916554',               // country code + number, no +
    bank: {
      bank: 'Commercial Bank of Ceylon',
      name: 'KussiAmma (Pvt) Ltd',
      account: '8001 2345 67',
      branch: 'Nugegoda (038)'
    }
  };

  /* Orders POST straight here, so the customer never has to send anything.
     FormSubmit needs one activation click: the first order sends a
     confirmation mail to the address above — open it and press the link, and
     every order after that arrives on its own. Until then the POST fails and
     the page falls back to a pre-filled email draft, so nothing is lost. */
  const ORDER_ENDPOINT = 'https://formsubmit.co/ajax/ranjanawijerathne@gmail.com';

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
      detail: 'Grated the morning it goes out and sealed cold. One packet is about ' +
              'two cupfuls loose — a pol sambol for three or four people, or the ' +
              'coconut for a single pot of curry. Buy these if you cook coconut ' +
              'once or twice a week and hate throwing half a pack away.',
      spec: { Yield: 'About 2 cups', Keeps: '3 days chilled, 1 month frozen', Pack: 'Sealed pouch' },
      img: 'assets/photos/pack-100g.jpg'
    },
    {
      id: 'grated-250g', group: 'grated',
      name: '250 g packet', unit: '250 g', price: 250,
      desc: 'A week of home cooking. Resealable top, so it stays dry between uses.',
      detail: 'The size most households settle on. Resealable, so you can take out ' +
              'what a meal needs and keep the rest dry in the fridge. Enough for ' +
              'sambol twice and a curry, or one batch of milk toffee.',
      spec: { Yield: 'About 5 cups', Keeps: '3 days chilled, 1 month frozen', Pack: 'Resealable pouch' },
      img: 'assets/photos/pack-250g.jpg'
    },
    {
      id: 'grated-500g', group: 'grated',
      name: '500 g pouch', unit: '500 g', price: 500,
      desc: 'The size most households reorder. Sambol, curry, baking and sweets from one pouch.',
      detail: 'A family week in one pouch: sambol, curry, baking and sweets without ' +
              'reordering midweek. Freeze it whole on the day it lands and break ' +
              'off what you need — it keeps its texture far better than a fridge does.',
      spec: { Yield: 'About 10 cups', Keeps: '3 days chilled, 1 month frozen', Pack: 'Resealable pouch' },
      img: 'assets/photos/pack-500g.jpg'
    },
    {
      id: 'grated-1kg', group: 'grated',
      name: '1 kg pack', unit: '1 kg', price: 1000,
      desc: 'Kitchen and small-restaurant size. Take four or more and ask us for the trade rate.',
      detail: 'Built for kitchens, bakeries and caterers. Same grate, same morning, ' +
              'bigger bag. Take four or more a week and we will put you on a standing ' +
              'order at the trade rate — call us rather than ordering here.',
      spec: { Yield: 'About 20 cups', Keeps: '3 days chilled, 1 month frozen', Pack: 'Catering pouch' },
      img: 'assets/photos/pack-1kg.jpg'
    },
    {
      id: 'milk-200', group: 'milk',
      name: 'Coconut milk — 200 ml', unit: '200 ml', price: 280,
      desc: 'Single-cook size, so an opened pack never goes to waste.',
      detail: 'First-press milk in a single-cook size. Pour the whole thing into one ' +
              'pot and there is nothing left over to forget at the back of the fridge.',
      spec: { Press: 'First press', Added: 'Nothing', Keeps: '5 days chilled, unopened' },
      img: 'assets/photos/milk-200.jpg'
    },
    {
      id: 'milk-400', group: 'milk',
      name: 'Coconut milk — 400 ml', unit: '400 ml', price: 480,
      desc: 'First press, thick. No gums, no stabilisers, no preservatives.',
      detail: 'Thick first-press milk — it separates in the fridge because there is ' +
              'nothing in it to stop it. Shake or warm it gently and it comes back. ' +
              'No gums, no stabilisers, no preservatives, no added water.',
      spec: { Press: 'First press', Added: 'Nothing', Keeps: '5 days chilled, unopened' },
      img: 'assets/photos/milk-400.jpg'
    },
    {
      id: 'milk-1l', group: 'milk',
      name: 'Coconut milk — 1 litre', unit: '1 litre', price: 1090,
      desc: 'Catering pack for kitchens and caterers. The same first-press milk.',
      detail: 'The same first-press milk in a catering litre. For kitchens cooking ' +
              'coconut daily; ask about a standing order if you take more than two a week.',
      spec: { Press: 'First press', Added: 'Nothing', Keeps: '5 days chilled, unopened' },
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

  let query = '';
  /* Which cards the customer has expanded. Kept outside the markup so a
     re-render (search, or a quantity change) does not collapse them again. */
  const expanded = new Set();

  /** Everything worth matching a search against. */
  const haystack = (p) =>
    [p.name, p.unit, p.desc, p.detail, GROUPS.find((g) => g.id === p.group)?.label]
      .join(' ').toLowerCase();

  function matches(p) {
    if (!query) return true;
    // Every word must appear, so "1 kg milk" narrows rather than widens.
    const hay = haystack(p);
    return query.split(/\s+/).filter(Boolean).every((word) => hay.includes(word));
  }

  function packCard(p, g) {
    const open = expanded.has(p.id);
    const specs = Object.entries(p.spec || {})
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    return `
      <article class="pack">
        <div class="pack-photo">
          <img src="${p.img}" alt="${p.name}" loading="lazy" width="820" height="820">
        </div>
        <p class="eyebrow">${g.eyebrow}</p>
        <h3>${p.name}</h3>
        <p class="desc">${p.desc}</p>

        <button type="button" class="pack-more" data-more="${p.id}"
                aria-expanded="${open}" aria-controls="detail-${p.id}">
          ${open ? 'Less' : 'Read more'}
        </button>
        <div class="pack-detail" id="detail-${p.id}"${open ? '' : ' hidden'}>
          <p>${p.detail}</p>
          ${specs ? `<dl>${specs}</dl>` : ''}
        </div>

        <div class="pack-foot">
          <span class="price">${rupees(p.price)}<small>per ${p.unit}</small></span>
          <div class="stepper">
            <button type="button" data-step="-1" data-id="${p.id}" aria-label="One fewer ${p.name}">–</button>
            <span class="qty" aria-live="polite">${cart[p.id] || 0}</span>
            <button type="button" data-step="1" data-id="${p.id}" aria-label="One more ${p.name}">+</button>
          </div>
        </div>
      </article>`;
  }

  function renderPacks() {
    const shown = PRODUCTS.filter(matches);

    $('#packGroups').innerHTML = shown.length
      ? GROUPS.map((g) => {
          const items = shown.filter((p) => p.group === g.id);
          if (!items.length) return '';
          return `
            <div class="pack-group">
              <h3>${g.label}</h3>
              <div class="packs">${items.map((p) => packCard(p, g)).join('')}</div>
            </div>`;
        }).join('')
      : `<p class="packs-empty">Nothing matches &ldquo;${query}&rdquo;.
           We only sell grated coconut and coconut milk — try a size like
           <strong>250 g</strong>, or clear the search.</p>`;

    $('#searchCount').textContent = query
      ? `${shown.length} of ${PRODUCTS.length} products`
      : '';
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

  /** The email body, as flat labelled fields so the relay renders a readable
      table rather than a dump of nested JSON. */
  function mailFields(o) {
    const items = o.items
      .map((i) => `${i.name}${i.name.includes(i.unit) ? '' : ` (${i.unit})`} × ${i.qty} = ${rupees(i.line)}`)
      .join('\n');

    return {
      _subject: `New order ${o.ref} — ${o.name} — ${rupees(o.total)}`,
      _template: 'table',
      _captcha: 'false',

      Reference: o.ref,
      Placed: o.placed,

      Customer: o.name,
      Phone: o.phone,
      Email: o.email || '—',
      Address: o.address,
      City: o.city,
      'Postal code': o.postal || '—',
      'Delivery window': o.slot,
      Notes: o.notes || '—',

      Items: items,
      Packs: rupees(o.subtotal),
      Delivery: o.shipping === 0 ? 'Free' : rupees(o.shipping),
      Total: rupees(o.total),
      'Payment method': o.pay
    };
  }

  /** POST the order to the relay. The pre-filled draft is only a fallback for
      when that fails — a blocked network, or the relay not yet activated. */
  async function deliverOrder(o) {
    if (!ORDER_ENDPOINT) return { sent: false };
    try {
      const res = await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(mailFields(o))
      });
      if (!res.ok) return { sent: false };

      /* FormSubmit answers 200 even when the address is not activated yet,
         with success:"false" in the body — so read it rather than trust the
         status code. */
      const body = await res.json().catch(() => null);
      const ok = !body || String(body.success) !== 'false';
      return { sent: ok };
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

  /* ── The order-placed popup ────────────────────────────────────────── */

  const placed = () => $('#placedModal');

  function openPlaced(o, delivered) {
    // Slots now read "Morning — 8 a.m. to 12 noon"; keep just the word.
    const slot = o.slot.split('—')[0].trim().toLowerCase();

    $('#placedRef').textContent = o.ref;
    $('#placedLead').innerHTML = delivered
      ? `Thank you, ${o.name}. The order is with the kitchen. We will call
         ${o.phone} to confirm your ${slot} delivery — keep ${rupees(o.total)}
         ready for the delivery man.`
      : `Thank you, ${o.name}. Your email app is opening with the order filled
         in — <strong>press send</strong> and it reaches us. We will then call
         ${o.phone} to confirm your ${slot} delivery.`;

    const bank = $('#placedBank');
    bank.hidden = o.pay !== 'Bank transfer';
    if (!bank.hidden) bank.innerHTML = bankRows();

    // Only offer the manual routes when the order did not send itself.
    $('#placedActions').innerHTML = delivered ? '' : `
      <a class="btn btn--primary" href="${mailtoFor(o)}">Send the order email</a>
      <a class="btn btn--ghost" href="${whatsappFor(o)}" target="_blank" rel="noopener">WhatsApp it</a>
      <a class="btn btn--ghost" href="tel:${SELLER.phone}">Call us</a>`;

    placed().classList.add('is-open');
    placed().setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#placedDone').focus();
  }

  function closePlaced() {
    placed().classList.remove('is-open');
    placed().setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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

    /* Reviews rail. It advances itself, wrapping back to the first card at
       the end; the arrows and a touch swipe both still drive it by hand. */
    const rail = $('#reviews');
    if (rail) {
      const AUTO_MS = 4200;
      const step = () => (rail.querySelector('.review')?.offsetWidth || 282) + 18;
      const maxScroll = () => rail.scrollWidth - rail.clientWidth;

      /* Wrapping means neither end is a dead stop, so the arrows stay live —
         they only go flat when there is nothing to scroll at all. */
      const syncArrows = () => {
        const none = maxScroll() < 4;
        $('#revPrev').disabled = none;
        $('#revNext').disabled = none;
      };

      const go = (dir) => {
        const max = maxScroll();
        if (max < 4) return;
        let next = rail.scrollLeft + dir * step();
        if (next > max - 2) next = dir > 0 ? 0 : max;      // wrap forward
        if (next < 0) next = max;                           // wrap backward
        rail.scrollTo({ left: next, behavior: 'smooth' });
      };

      /* Autoplay, paused whenever someone is actually reading or touching it,
         and off entirely for anyone who asked for less motion. */
      const still = window.matchMedia('(prefers-reduced-motion: reduce)');
      let timer = null;
      const stop = () => { clearInterval(timer); timer = null; };
      const start = () => {
        stop();
        if (still.matches || document.hidden) return;
        timer = setInterval(() => go(1), AUTO_MS);
      };

      ['pointerenter', 'focusin', 'touchstart'].forEach((ev) =>
        rail.addEventListener(ev, stop, { passive: true }));
      ['pointerleave', 'focusout', 'touchend'].forEach((ev) =>
        rail.addEventListener(ev, start, { passive: true }));
      $('.reviews-nav').addEventListener('pointerenter', stop);
      $('.reviews-nav').addEventListener('pointerleave', start);

      $('#revPrev').addEventListener('click', () => { go(-1); start(); });
      $('#revNext').addEventListener('click', () => { go(1); start(); });

      rail.addEventListener('scroll', syncArrows, { passive: true });
      window.addEventListener('resize', syncArrows);
      // Nothing should animate in a tab nobody is looking at.
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
      still.addEventListener?.('change', start);

      syncArrows();
      start();
    }

    /* WhatsApp float. A toggle rather than a bare link, so the number and
       what we answer are visible before anyone leaves the page. */
    const waToggle = $('#waToggle');
    const waPanel = $('#waPanel');
    const setWa = (open) => {
      waPanel.hidden = !open;
      waToggle.setAttribute('aria-expanded', String(open));
    };
    waToggle.addEventListener('click', () => setWa(waPanel.hidden));
    document.addEventListener('click', (e) => {
      if (!waPanel.hidden && !e.target.closest('.wa')) setWa(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !waPanel.hidden) { setWa(false); waToggle.focus(); }
    });

    $('#packGroups').addEventListener('click', (e) => {
      const more = e.target.closest('[data-more]');
      if (more) {
        const id = more.dataset.more;
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        renderPacks();
        // Keep focus on the control the customer just pressed.
        $(`[data-more="${id}"]`)?.focus();
        return;
      }

      const btn = e.target.closest('[data-step]');
      if (!btn) return;
      const id = btn.dataset.id;
      const step = Number(btn.dataset.step);
      setQty(id, (cart[id] || 0) + step);
      if (step > 0) toast(`${byId(id).name} added`);
    });

    // Search, debounced lightly so typing does not rebuild the grid per key.
    let searchTimer;
    $('#packSearch').addEventListener('input', (e) => {
      const next = e.target.value.trim().toLowerCase();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        if (next === query) return;
        query = next;
        renderPacks();
      }, 120);
    });

    // Bank details appear inline the moment bank transfer is chosen.
    $('#checkoutForm').addEventListener('change', (e) => {
      if (e.target.name !== 'pay') return;
      $('#bankInline').hidden = e.target.value !== 'Bank transfer';
    });

    $('#placedClose').addEventListener('click', closePlaced);
    $('#placedDone').addEventListener('click', closePlaced);
    placed().addEventListener('click', (e) => { if (e.target === placed()) closePlaced(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && placed().classList.contains('is-open')) closePlaced();
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

      openPlaced(order, sent);

      cart = {};
      save();
      form.reset();
      $('#bankInline').hidden = true;
      renderPacks();
      renderSummary();
      submit.disabled = false;
      submit.textContent = 'Submit order';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
