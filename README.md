# SmartIndia.ai — premium 3D portfolio site

Static site. No build step, no dependencies, no CDN scripts. Open `index.html`
on any web server (or double-click it) and it runs.

```
index.html          markup + the master logo (inline <template>)
css/style.css       design system + all layout
js/data.js          content: services, capabilities, 132 live platforms
js/reveal.js        logo mounting + the 3D brand reveal
js/scene.js         the 3D renderer (hero wheel, contact field)
js/site.js          rendering, scroll choreography, interactions, form
assets/favicon.svg
assets/product/     the three product-card plates
assets/portfolio/   one hero capture per portfolio site
```

## The logo

The mark is **rebuilt as vector** in `index.html` (`<template id="si-logo-src">`):
the monument skyline, the tricolour wordmark, the Ashoka Chakra and the tagline.
It exists once and is cloned everywhere — nav, reveal, hero backdrop, footer —
so proportions and colours can never drift between placements.

It was reconstructed from the supplied logo image rather than traced from a
source file. If you have the original vector, replace the contents of the
`<template>` with it, keeping these class names, and everything else keeps
working:

| class | what it must contain |
|---|---|
| `.si-skyline` | the monument row (used for the 3D extrusion and the particle assembly) |
| `.si-wordmark` | the `<text class="si-wm">` wordmark |
| `.si-slot` | an invisible `<tspan>` reserving the chakra's place inside the wordmark |
| `.si-chakra` | the wheel, drawn at radius 30 around its own origin |
| `.si-tagline` | tagline text + the two `.si-rule` bars |

`js/reveal.js` measures the wordmark at runtime and positions/scales the chakra
onto `.si-slot`, so the wheel stays correct at any font size.

## Brand tokens

Every colour in `css/style.css` `:root` is taken from the mark: the skyline's
gold gradient, the saffron/green of the wordmark and the navy of the chakra.
Nothing else was introduced.

## Themes

Two of them, switched from the control in the nav and remembered in
`localStorage` under `si-theme`. Until someone presses it nothing is stored and
the page follows the operating system, including when that changes mid-visit; a
deliberate choice outranks the system from then on. An inline script in `<head>`
resolves and stamps `data-theme` **before first paint**, because anything later
lets one frame of the wrong ground through — a full-screen white flash on a
dark-mode visit.

The two accents are **Apricot `#FFD8B5`** and **Pistachio `#D8E8B8`** in light,
**Antique Gold `#74613A`** and **Muted Pistachio `#4F6040`** in dark. Everything
warm on the page is mixed toward the first and everything green toward the
second.

Only the palette is written twice. The sheet states its whites, shadows and
golds through seven **channel** tokens (`--c-lift`, `--c-shade`, `--c-shade-w`,
`--c-gold-fill`, `--c-gold-ink`, `--c-green`, `--c-saffron`, `--c-navy`) rather
than naming colours inline, so `:root[data-theme="dark"]` is a dozen lines
instead of two hundred edits. `--lift-k` and `--shade-k` scale alpha alongside
the hue: a white inset that reads as a highlight on paper has to fall to a tenth
of itself before it reads as one on a dark ground, and a shadow has to deepen.
**Adding a colour means reaching for a channel, not a literal** — a literal will
simply not follow the theme.

Three backgrounds have to *invert* rather than dim, so they are the only ones
stated in both blocks: `--hero-veil`, `--hero-veil-m` and `--sheet`. On paper the
hero copy sits on a pool of page colour and the menu is a white sheet; on a dark
ground both become pools of shade, and scaling their alpha would only make them
disappear.

There is deliberately no `prefers-color-scheme` block — the head script resolves
the system preference itself, and since the page's content is rendered from
`data.js`, a visitor without JS has no page to theme in the first place.

The canvas scenes are the one thing that does **not** re-theme: `draw.js` caches
its `rgba()` strings per colour at build time, so the bronze ink is fixed once
the scenes are mounted. It was checked in both themes and reads in both — gold
on paper, gold on a near-black ground — so it was left alone rather than given a
per-frame filter the scroll engine would pay for.

The site runs on a **light** ground — warm paper (`--ink: #F7F4EC`) rather than
the mark's black field — so those hues are re-weighted for ink-on-paper
contrast: the golds are deepened (`--gold-hi` is the *darkest* of them, since
it is what figures and accents are written in), with `--gold-fill*` kept bright
for the surfaces that are filled with gold instead of written in it. The glass
panes are white films with a dark-side rim, and the canvas scenes composite
`source-over` with ink-weight colours — additive blending has nothing to add to
on white.

## The reveal

`js/reveal.js`, roughly 4.2s on a first visit:

1. gold motes fly in and assemble the skyline outline
2. the vector skyline resolves and its 3D extrusion opens up in Z
3. the wordmark appears under a travelling specular sweep; the chakra spins up and locks
4. the tagline rules draw out — the complete mark holds, drifting with the camera
5. the camera pushes through the wheel and the site is revealed behind it

The particle targets are stored in **viewBox units** and projected against the
mark's live layout box every frame, so they stay welded to the logo however the
CSS 3D camera moves.

- Returning visitors (`sessionStorage`) get a ~1.4s version.
- `prefers-reduced-motion` gets a still mark for 0.9s.
- <kbd>Esc</kbd>, <kbd>Enter</kbd> or the *Skip intro* button ends it immediately.
- A 9s watchdog releases the page if anything ever goes wrong.

## The 3D

`js/scene.js` is a small purpose-built renderer — depth-sorted primitives on a
2D canvas. No WebGL context to lose, no library to download, and it degrades
cleanly. The hero object is the Ashoka Chakra rebuilt in 3D inside a network of
nodes: the brand symbol at the centre of an information graph.

The wheel **sways within ±22°** and never spins like a turntable; the cloud
around it is what orbits.

Low-power devices (`is-low`: ≤4 cores, ≤3 GB, small touch screens) automatically
get fewer particles, no glow passes and no backdrop blur. All canvases share one
`requestAnimationFrame` loop and pause when scrolled out of view.

## Content

All copy comes from the supplied company information and from
smartindia.digital. The marketing, SEO and ads services on that site were
**deliberately left out** — only IT solutions are presented.

The platform counts in the stats and filters are computed from `js/data.js` at
runtime (`SI.counts`), so they can never drift from the list: **133 platforms**
— 52 dynamic, 34 e-commerce, 2 multi-vendor, 45 other live web platforms. The
300+ customers, 4.8/5 rating and 102 reviews are as published on
smartindia.digital.

The three product cards are illustrated with photographs
(`assets/product/{search,discover,experience}.jpg`, 640x360). They are stock
images under the Unsplash licence, so commercial use is fine and no attribution
is required — but they are **not** used as shot. Each one is put through a levels
stretch and then mapped onto a two-colour brand ramp, deep gold `#6E4A14` to warm
paper `#FDF4E2`, so all three read as one set and as part of this palette rather
than as stock. The treatment is baked into the file rather than applied with a
CSS `filter`, because the scroll engine repaints while these are on screen and a
live filter on three always-visible elements is paid for every frame. To swap one
out, run any replacement through the same ramp at the same size.

`SI.PORTFOLIO` is the curated ten the Portfolio section leads with. Every entry
is also in `PLATFORMS`, and the featured rail in Work deliberately draws from
everything *except* those ten, so no platform is shown twice.

Each card's preview is the site's own hero, captured at 1280x800 and written
out at 640x400 into `assets/portfolio/<domain-first-label>.jpg` — so
`paakhijewels.com` looks for `paakhijewels.jpg`. Set `img` on an entry to point
somewhere else. A missing or failed image is removed at runtime and the
monogram plate underneath becomes the preview again, so a card is never a
broken frame. To refresh a shot after a client redesigns, re-capture at the
same size and overwrite the file; nothing else changes.

An entry may also carry `u` to link deeper than its front page (Stayzia opens
on a property). The card still reads as the bare domain.

Category order lives in one place — `SI.FILTER_ORDER` — and both the portfolio
filter and the full index read it, so the tabs can never drift apart.

`SI.REVIEWS` is the eleven reviews on the Google Business Profile for
smartindia.ai (`maps.google.com/?cid=12641309898071886347`), transcribed on
21 August 2026. **Names and wording are reproduced exactly as posted**,
spelling and all — they are real people's public words, so nothing there gets
tidied, shortened or re-titled, and the two purely typographic exceptions are
listed in a comment beside the data. A long review is clamped by the layout,
never cut in JS. Cards carry no date: Google shows these as *"2 months ago"*,
which would rot on a static page, and converting that to a month would be our
approximation rather than Google's statement. To refresh, re-transcribe from
the profile.

**The one block of invented content is `SI.VENDORS`**, which is placeholder data
waiting to be replaced. Everything else comes from the supplied company
information or from the live sites themselves.

**Not included, because no information was supplied:** team members, named
client testimonials, awards or certifications. Send the details and these drop
straight in.

## The contact form

Name, contact number, email, business and requirement — all required except the
topic dropdown. Validation is the page's own (`novalidate`), so the messages
match the design; the contact number is normalised before it is judged, so
`+91 98765 43210`, `09876543210` and `9876543210` are all the same number.

On submit the page POSTs to **`/api/enquiry`**, a serverless function that
forwards the enquiry to the office number. The delivery credentials live in
Vercel environment variables and never reach the browser:

| Variable | Purpose |
| --- | --- |
| `ENQUIRY_TO` | Destination, digits only. Defaults to `919994900470`. |
| `ENQUIRY_WEBHOOK_URL` | Optional. Receives the enquiry as JSON — the simplest route to an existing CRM or automation. |
| `ENQUIRY_WEBHOOK_AUTH` | Optional. Sent as the `Authorization` header. |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | Optional. WhatsApp Cloud API credentials. |

**With none of them set the function answers 501 and the page falls back** to
the visitor's own WhatsApp, opened with the enquiry already composed and
addressed to the same number. So the form works today with nothing configured,
and switching on server-side delivery is a matter of adding environment
variables — no code change.
