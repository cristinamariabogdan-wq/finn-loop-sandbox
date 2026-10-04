# Maldivia — A private life on the water

A scroll film: the page is one continuous shot that scrubs as you scroll.
Exported from the published Claude artifact
(`claude.ai/artifact/2j3yoNhPLwFL3AKeNH5QXz`, version `1789762343-9f55`).

## What's here

| Path | Size | What it is |
|---|---|---|
| `index.html` | 180 KB | The whole page — markup, styles, script and two base64 webfonts (Marcellus, Poppins) |
| `img/` | 1.3 MB | 28 photographs — the posters, the masterplan, the home cards and the interior galleries |
| `sheets/` | 36 MB | 75 WebP sprite sheets holding 1227 animation frames |

The photographs used to be pasted into `index.html` as base64, which made the
document 3.1 MB. Every visitor paid for all forty of them before the page could
render, `loading="lazy"` had nothing to defer, and twelve were byte-identical
copies of a picture already in the file. As files they are 1.3 MB in all, and a
first screen now fetches one.

Four scroll-scrubbed sequences, listed in the `window.__SHEETS` manifest inside
`index.html`:

| Sequence | Frames | Frame size | Sheets |
|---|---|---|---|
| hero | 473 | 1280×720 | 32 |
| residence | 268 | 1280×720 | 18 |
| studio | 267 | 1280×720 | 18 |
| villa | 219 | 864×496 | 7 |

## Running it

It is plain static files, but `index.html` fetches the sheets, so opening it
off disk shows the copy without its film. Serve the folder instead:

```bash
python3 -m http.server 8000
```

## Publishing

`.github/workflows/pages.yml` publishes `maldivia/` as the site root on every
push to `main` that touches it. Enable it once under
**Settings → Pages → Source → GitHub Actions**. No build step — the workflow
uploads the folder as-is.

## Single-file export

`node build-share.js` inlines all 75 sheets and all 28 photographs as `data:`
URIs and writes `maldivia-share.html`, which runs from a double-click with
nothing beside it.

The catch is the size. Base64 costs a third more than raw bytes, so 36 MB of
WebP becomes ~49 MB of text and the file lands at **51.4 MB** — slow to open,
too large to email, over the 50 MB at which GitHub warns on push, and over the
16 MB an Artifact accepts. It is gitignored for that reason; rebuild it when
you actually need the film to travel as one object. For everything else, serve
the folder.
