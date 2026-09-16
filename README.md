# Coco Ceylon — single-page coconut ordering site

Static site. No build step, no dependencies, no backend.
Open `index.html`, or serve the folder:

```bash
python3 -m http.server 4173
```

## Stack

| Layer | What it is |
|---|---|
| Markup | One hand-written `index.html` — every section on one page |
| Styling | Plain CSS in `styles.css`, CSS custom properties for the whole palette |
| Behaviour | One vanilla JS file, `app.js` (IIFE, no framework, no bundler) |
| Product images | JPEGs in `assets/photos/`, cropped from the originals in `src/` by `tools/crop_packs.py` |
| Fonts | Fraunces + Inter from Google Fonts |
| Cart storage | `localStorage` — survives a refresh or a closed tab |
| Order delivery | Email: relay POST if configured, otherwise a pre-filled mail draft |
| Motion | CSS transitions + `IntersectionObserver` for scroll reveals |

Deploys as-is to Netlify, Vercel, GitHub Pages or any shared host — it is
just files.

## Configure

Everything the seller changes lives in the `CONFIGURE ME` block at the top of
`app.js`:

```js
const SELLER = {
  email: 'orders@cococeylon.lk',   // ← where order emails arrive
  phone: '+94112345678',
  phoneLabel: '+94 11 234 5678',
  whatsapp: '94771234567',         // country code + number, no '+'
  bank: { bank: '…', name: '…', account: '…', branch: '…' }
};

const ORDER_ENDPOINT = '';
```

The bank details and phone number are painted into the page from here, so
they only need editing in one place.

### Getting orders into the inbox automatically

`ORDER_ENDPOINT` is empty by default, so placing an order opens the
customer's mail app with the whole order pre-filled — they press send.
It works with zero setup, but it depends on the customer having mail
configured.

Set an endpoint and the order is POSTed straight through instead, with
nothing for the customer to send:

```js
const ORDER_ENDPOINT = 'https://formsubmit.co/ajax/orders@cococeylon.lk';
```

FormSubmit is free and needs no account — the first order triggers a
one-time confirmation email to that address. Formspree, Web3Forms or Basin
work the same way. If the POST fails, the page falls back to the mail draft
on its own, so an order is never silently lost.

The success screen also offers WhatsApp and a call button, and the page
carries a "call to order" link throughout for customers who would rather
just phone.

## Products

The shop sells two lines only: **fresh grated coconut** in 100 g, 250 g,
500 g and 1 kg pouches, and **first-press coconut milk** in 200 ml, 400 ml
and 1 litre. Edit the `PRODUCTS` array in `app.js`. Each entry:

```js
{
  id: 'grated-250g',         // unique, also the localStorage key
  name: 'Fresh grated coconut — 250 g',
  note: 'Short shelf-talker line.',
  price: 390,                // LKR, integer
  unit: '250 g',
  cat: 'grated',             // 'grated' or 'milk' — must match a CATEGORIES id
  tag: 'Most popular',       // badge over the photo
  img: 'assets/photos/pack-250g.jpg'
}
```

> **The prices in there are placeholders.** Replace every `price` with your
> real one before the site goes anywhere near a customer.

Delivery pricing is `SHIPPING` (Rs 450) and `FREE_OVER` (Rs 6,000) in the
same block.

## Product photos

| File | Source |
|---|---|
| `pack-100g.jpg`, `pack-250g.jpg`, `pack-500g.jpg`, `pack-1kg.jpg`, `hero.jpg` | The shop's own pack photography |
| `milk-200.jpg`, `milk-400.jpg`, `milk-1l.jpg` | Stock (Unsplash / Pexels) |

The four pack shots are **cropped out of a single range photograph** rather
than shot individually. The originals live in `assets/photos/src/` and
`tools/crop_packs.py` regenerates every derived image from them:

```bash
python3 tools/crop_packs.py
```

Each pouch is described in that script by its centre and height in source
pixels, and the crop box is widened to the card's aspect ratio around that
centre — which is what keeps the size badge at the bottom of the pack inside
the frame. If you reshoot the range, re-measure those four numbers and rerun
it. The script needs Pillow (`pip3 install Pillow`).

The coconut milk photographs are still generic stock, licensed for
commercial use and needing no attribution. Replace them the same way the
packs were: drop a JPEG into `assets/photos/`, point the product's `img` at
it. Cards crop to a 760×800 frame, so anything roughly square or portrait
works.

## Not here yet

- **Card payments.** No card field exists anywhere on this site, by design —
  a gateway (PayHere, Stripe, onepay) replaces the `deliverOrder` step when
  you add one.
- **Stock levels, order history, admin.** Those need a backend.
