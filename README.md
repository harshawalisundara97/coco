# KussiAmma.lk — single-page coconut ordering site

Static site. No build step, no backend. One optional runtime dependency (Three.js, for the scroll story only).
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
| 3D | `story-3d.js`, an ES module using Three.js from a CDN import map — optional, degrades to the flat version |
| Images | JPEGs in `assets/photos/`, derived from `src/` by `tools/build_images.py` |
| Fonts | Archivo 400/600/800 from Google Fonts |
| Cart storage | `localStorage` — survives a refresh or a closed tab |
| Order delivery | Email: relay POST if configured, otherwise a pre-filled mail draft |

Deploys as-is to Cloudflare Pages, Netlify, Vercel, GitHub Pages or any shared
host — it is just files.

## Design

The page follows the **Modernist** handoff (`Cyclone Coco` design bundle),
rebuilt for this shop. The system, in short:

- Paper ground `#f3f2f2`, ink text `#201e1d`, one hot accent `#ec3013`
- **Zero corner radius everywhere.** 2px rules do all the structural work
- Archivo, weight 800 for every heading, tight `-0.015em` tracking
- Section order is "buy first, read later": nav → hero → **order form** →
  stats → packs → why-us → how it's made → the kitchen → delivery → reviews
  → bulk → FAQ → contact → accent closing banner → footer
- A fixed cart bar rises from the bottom as soon as a pack is chosen

### "Tree to packet" — the scroll story

Above *How it's made*: a 300vh section whose stage sticks to the top and plays
through four windows as you scroll past it. A palm drops a nut, the nut falls
and splits, grated coconut piles up off the ground rule, and a packet scales in.

It is driven by **scroll position, never a timer** — `p = -rect.top / (rect.height
- innerHeight)`, read on a passive listener throttled with `requestAnimationFrame`
and repainted only when `p` moves more than 0.004. Nothing animates on its own,
so it is already safe under `prefers-reduced-motion` with no extra handling. The
palm's recoil as the nut lets go is one damped swing off the same `p`, not a loop.

Stage windows, all anchored to a ground rule at 74% of the panel: fall `0→0.42`,
split `0.42→0.58`, grate `0.56→0.78`, pack `0.76→1`. The palm is sized as a
percentage of the panel rather than in fixed pixels, so it always fits between
the ground rule and the top edge whatever height the stage gets.

#### The WebGL layer

`story-3d.js` renders that same sequence in real 3D — a modelled palm, a nut
that tumbles as it falls, two shells that open into bowls with the white
flesh showing, a pile of grated coconut, and a packet that turns to face you.
Flat-shaded in the site's own three colours rather than photoreal, so it reads
as part of the paper-and-ink design instead of an import from another site.

It is **pure enhancement**. `app.js` animates the flat SVG/DOM version
unconditionally and dispatches a `storyprogress` event; `story-3d.js` listens
for that event, so the scroll maths exists in exactly one place. Only once a
WebGL context really exists does the module add `.has-3d` to the panel, which
is what hides the flat shapes. If the module fails to load, the CDN is
blocked, or there is no WebGL, the flat version simply stays — nothing to
configure and nothing to catch.

Rendering is event-driven, not a `requestAnimationFrame` loop: a frame is
drawn only when scroll progress actually changes, so the scene costs nothing
while the section is off screen. Pixel ratio is capped at 2.

Three.js (~150 KB over the wire) is loaded from jsDelivr through an import
map in `index.html`. That is the site's one runtime third-party dependency —
to remove it, drop `three.module.js` into `assets/vendor/` and point the
import map at the local copy instead.

### Glassmorphism

Frosted glass is applied to the three surfaces that actually sit *over*
something: the hero plate (over the photograph), the sticky nav, and the cart
bar. The flat 2px-ruled content cards stay opaque — glass over a flat paper
background reads as nothing. Every glass rule sits behind an `@supports`
query with the solid fill as the fallback, so text never lands on bare
photography where `backdrop-filter` is unsupported.

Two deliberate departures from the handoff, both because there is now real
photography where the handoff assumed placeholders:

1. **Photographs stay in colour.** The handoff greyscales them
   (`filter: grayscale(1)`), which made sense for stand-in images but would
   throw away the green packaging the brand is built on.
2. **Pack plates are square, not 4:3.** A standing pouch in a landscape frame
   leaves the neighbouring packs crowding the shot; a square frame lets the
   pack the card is actually selling dominate.

## Configure

Everything the seller changes lives in the `CONFIGURE ME` block at the top of
`app.js`:

```js
const SELLER = {
  email: 'orders@kussiamma.lk',   // ← where order emails arrive
  phone: '+94771234567',
  phoneLabel: '+94 77 123 4567',
  whatsapp: '94771234567',        // country code + number, no '+'
  bank: { bank: '…', name: '…', account: '…', branch: '…' }
};

const ORDER_ENDPOINT = '';
const SHIPPING  = 300;            // flat delivery, LKR
const FREE_OVER = 3000;           // free delivery above this
```

The phone number, email and bank details are painted into the page from here,
and the two delivery figures are interpolated into the stat row, the delivery
card and the order summary — so each only needs editing once.

### Getting orders into the inbox automatically

`ORDER_ENDPOINT` is empty by default, so placing an order opens the customer's
mail app with the whole order pre-filled — they press send. It works with zero
setup, but it depends on the customer having mail configured.

Set an endpoint and the order is POSTed straight through instead:

```js
const ORDER_ENDPOINT = 'https://formsubmit.co/ajax/orders@kussiamma.lk';
```

FormSubmit is free and needs no account — the first order triggers a one-time
confirmation email to that address. Formspree, Web3Forms or Basin work the
same way. If the POST fails the page falls back to the mail draft on its own,
so an order is never silently lost. The confirmation panel also offers
WhatsApp and a call button.

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
  img: 'assets/photos/pack-250g.jpg'
}
```

> **The prices are placeholders.** Grated coconut is set at a flat Rs 1,000
> per kilo, which the packs heading states in so many words — change both
> together, or the page contradicts itself.

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

## Not here yet

- **Card payments.** No card field exists anywhere on this site, by design —
  a gateway (PayHere, Stripe, onepay) replaces the `deliverOrder` step when you
  add one. It needs a server-side secret, so it also needs a serverless
  function; Cloudflare Pages, Netlify and Vercel all provide those free.
- **Stock levels, order history, admin.** Those need a backend.
- **Placeholders to replace before launch:** seller phone/email/bank, the
  kitchen address, the three review quotes, and every price.
