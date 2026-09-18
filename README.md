# KussiAmma.lk — single-page coconut ordering site

Static site. No build step, no backend, no dependencies.
Open `index.html`, or serve the folder:

```bash
python3 -m http.server 4173
```

## Stack

| Layer | What it is |
|---|---|
| Markup | One hand-written `index.html` — every section on one page |
| Styling | Plain CSS in `styles.css`, design tokens as custom properties |
| Behaviour | One vanilla JS file, `app.js` (IIFE, no framework, no bundler) |
| Images | JPEGs in `assets/photos/`, derived from `src/` by `tools/build_images.py` |
| Fonts | Archivo 400/600/800 from Google Fonts |
| Cart storage | `localStorage` — survives a refresh or a closed tab |
| Order delivery | POSTed to a form relay, which emails the kitchen |

Deploys as-is to Cloudflare Pages, Netlify, Vercel, GitHub Pages or any shared
host — it is just files.

## The customer's path

Section order follows how someone actually shops, not how the business thinks:

**hero → at a glance → 01 Pick your packs → 02 Checkout → why us → how it's
made → the kitchen → delivery → reviews → bulk → FAQ → contact → closing**

Browse and search the products, expand a card to read the detail, set
quantities, and only then reach a form. A fixed cart bar rises from the bottom
the moment something is chosen, and jumps to the checkout.

- **Search** filters on name, size, description and the long detail text.
  Multi-word queries narrow rather than widen, so "1 kg milk" means both.
- **Read more** expands a fuller description and a spec list. Expanded cards
  stay expanded across a search or a quantity change — the open set is held in
  JS, not in the markup.
- **Reviews** are a self-advancing rail: it steps one card every 4.2s and wraps
  round at the end. It pauses on hover, on focus and while a finger is on it,
  stops in a background tab, and does not run at all under
  `prefers-reduced-motion`. Swipe works on touch; the scrollbar is hidden
  because the arrows and autoplay make it noise.

## Design

Modernist structure — **zero corner radius**, 2px rules doing the structural
work, Archivo 800 for every heading — on a tropical palette:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f7f2e7` | cream ground |
| `--color-surface` | `#ece2cd` | tan bands |
| `--color-text` | `#1e3026` | deep green, dark enough to act as ink |
| `--color-accent` | `#2d6a4f` | deep green |
| `--color-error` | `#a3412a` | rust — errors must not be green in a green palette |

### Glassmorphism

Frosted glass goes only on surfaces that sit *over* something: the hero plate
(over the photograph), the sticky nav, the cart bar, the review arrows and the
order popup scrim. Flat content cards stay opaque — glass over a flat ground
reads as nothing. Every glass rule sits behind an `@supports` query with a
solid fill as fallback, so text never lands on bare photography.

## Configure

Everything the seller changes lives in the `CONFIGURE ME` block at the top of
`app.js`:

```js
const SELLER = {
  email: 'ranjanawijerathne@gmail.com',
  phone: '+94753916554',
  phoneLabel: '+94 75 391 6554',
  whatsapp: '94753916554',        // country code + number, no '+'
  bank: { bank: '…', name: '…', account: '…', branch: '…' }
};

const ORDER_ENDPOINT = 'https://formsubmit.co/ajax/ranjanawijerathne@gmail.com';
const SHIPPING  = 300;            // flat delivery, LKR
const FREE_OVER = 3000;           // free delivery above this
```

Phone, email and bank details are painted into every place they appear from
here — nav, hero, WhatsApp float, contact, footer, order popup. The two
delivery figures are interpolated into the stat row, the delivery card and the
order summary. Each only needs editing once.

## How the order email works

Pressing **Submit order** POSTs the order to `ORDER_ENDPOINT` as flat labelled
fields — reference, customer, phone, address, window, items, totals, payment
method — which the relay turns into a readable table and emails to the address
above. The customer sends nothing; they just see the order-placed popup.

**One-time setup.** FormSubmit needs the address activated once:

1. Place a test order on the live site.
2. FormSubmit emails `ranjanawijerathne@gmail.com` asking to confirm.
3. Open it and press the link.

From then on every order arrives on its own. Until it is activated the POST
comes back `success: "false"`, the page detects that and falls back to opening
a pre-filled email draft, so **no order is ever lost** — it just needs a press
of send. The popup says which of the two happened.

Two things worth knowing:

- Order details (name, phone, address) pass through **formsubmit.co**, a third
  party. That is normal for a small shop, but it is a real data-handling
  choice. The alternative is a serverless function on the same host sending
  through Resend or Brevo — about 30 lines, still free, nothing third-party in
  the middle.
- The address sits in the client-side source, so scrapers can read it.
  FormSubmit offers a hashed-token endpoint that hides it; swap the URL for the
  token form once the account exists.

Formspree, Web3Forms and Basin all work the same way if you prefer one of them.

## Products

Two lines: **fresh grated coconut** in 100 g / 250 g / 500 g / 1 kg, and
**coconut milk** in 200 ml / 400 ml / 1 litre. Edit `PRODUCTS` in `app.js`:

```js
{
  id: 'grated-250g',      // unique, also the localStorage key
  group: 'grated',        // 'grated' or 'milk' — must match a GROUPS id
  name: '250 g packet',
  unit: '250 g',
  price: 250,             // LKR, integer
  desc: 'Short shelf-talker line.',
  detail: 'The paragraph behind Read more.',
  spec: { Yield: '…', Keeps: '…', Pack: '…' },
  img: 'assets/photos/pack-250g.jpg'
}
```

> **The prices are placeholders.** Grated coconut is set at a flat Rs 1,000
> per kilo, which the packs heading states in so many words — change both
> together, or the page contradicts itself.

## Payment

Cash on delivery and bank transfer are live. Credit/debit card and online
payment appear as **greyed, hatched, non-interactive tiles marked "Coming
soon"** — visible so customers know they are planned, but they are plain
`<span>`s with no radio inside, so nobody can pick a method the shop cannot
take. The FAQ says the same.

When a gateway does arrive (PayHere, Stripe, onepay) it replaces the
`deliverOrder` step. It needs a server-side secret, so it also needs a
serverless function; Cloudflare Pages, Netlify and Vercel all provide those
free.

## Images

| File | Source |
|---|---|
| `pack-*.jpg`, `hero-*.jpg`, `plate-*.jpg` | The shop's own product photography |
| `milk-*.jpg` | Stock (Unsplash / Pexels), pending real milk pack shots |

The four pack shots are **cropped out of a single range photograph**. Originals
live in `assets/photos/src/` and everything derives from them:

```bash
python3 tools/build_images.py
```

Each pack is described in that script by its centre and height in source
pixels, and the crop box is widened to the target aspect around that centre —
which is what keeps the size badge at the bottom of the pouch inside the frame.
Measure those numbers against the source, don't guess them. The script needs
Pillow (`pip3 install Pillow`).

### Logo

The logo source is `assets/photos/src/logo.jpg`, a JPEG on a white card.
`tools/build_logo.py` turns the white into transparency (colour-to-alpha, so
the soft edges survive on any background) and writes:

| File | Used for |
|---|---|
| `assets/logo.webp` | header (80px, 60px on phones) and footer (72px) |
| `assets/favicon-32.png` | browser tab |
| `assets/favicon-180.png` | iOS home-screen icon, on the cream page colour |

```bash
python3 tools/build_logo.py
```

The source is only 677×448. A larger original, ideally a PNG or SVG from
whoever designed the logo, will look sharper on high-density screens.
Drop it in as `logo.jpg` and rerun.

## Before launch

- **Every price** — all seven are invented.
- **The kitchen address** in the contact section.
- **The eight review quotes** — written as placeholders and labelled as such
  on the page.
- **Bank account details** — currently a placeholder account number.
- **Activate the FormSubmit address** (see above), then place one real test
  order and confirm it lands.
