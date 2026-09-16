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
| Product images | Hand-drawn SVGs in `assets/` — sharp at any size, ~1.4 KB each |
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

Edit the `PRODUCTS` array in `app.js`. Each entry:

```js
{
  id: 'king-coconut',        // unique, also the localStorage key
  name: 'King coconut',
  note: 'Short shelf-talker line.',
  price: 1850,               // LKR, integer
  unit: 'dozen',
  cat: 'fresh',              // must match a CATEGORIES id
  tag: 'Cut today',          // badge on the image
  img: 'assets/king-coconut.svg',
  glow: 'rgba(240,160,60,.26)'   // halo behind the product
}
```

Delivery pricing is `SHIPPING` (Rs 450) and `FREE_OVER` (Rs 6,000) in the
same block.

## Not here yet

- **Card payments.** No card field exists anywhere on this site, by design —
  a gateway (PayHere, Stripe, onepay) replaces the `deliverOrder` step when
  you add one.
- **Stock levels, order history, admin.** Those need a backend.
