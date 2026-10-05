// Bundle the Maldivia scroll film into one self-contained HTML file.
//
// The site is index.html plus 75 WebP sprite sheets holding 1227 animation
// frames, and 28 photographs in img/. Every one is named by a string literal
// in the page — the sheets inside the window.__SHEETS manifest, the photos as
// <img src> — so inlining is a straight substitution: swap each path for a
// data: URI of that file's bytes.
//
// Be warned about the arithmetic before you run this. Base64 costs a third
// more than the raw bytes, so 36 MB of WebP becomes ~48 MB of text and the
// result lands near 51 MB — a file that works but is slow to open, too big to
// email, and over the 16 MB an Artifact will accept. The multi-file site,
// served over HTTP, is the better default. This exists for the case where the
// whole film has to travel as one object.
//
//   node build-share.js              → maldivia-share.html
//   node build-share.js out.html     → out.html

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, process.argv[2] || "maldivia-share.html");

let html = readFileSync(resolve(here, "index.html"), "utf8");

// Every sheet the manifest names and every photo the markup points at, in the
// order the page lists them.
const paths = [...new Set(html.match(/(?:sheets|img)\/[A-Za-z0-9._-]+\.webp/g) || [])];
if (paths.length === 0) throw new Error("no sheet or image references found in index.html");

let inlinedBytes = 0;
for (const path of paths) {
  const bytes = readFileSync(resolve(here, path));
  inlinedBytes += bytes.length;
  const uri = `data:image/webp;base64,${bytes.toString("base64")}`;
  // Split/join rather than replace(): a regex would need escaping, and a
  // plain string replace() only swaps the first occurrence.
  html = html.split(path).join(uri);
}

// Matched with the surrounding quote. A bare /img\// substring also turns up by
// chance inside the base64 we just pasted in — its alphabet includes "/" — but a
// quote never does, so only a real src="img/..." or manifest entry trips this.
if (/["'](?:sheets|img)\//.test(html)) throw new Error("some file references survived inlining");

writeFileSync(out, html);
const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `${out}\n  ${paths.length} files, ${mb(inlinedBytes)} MB of WebP → ${mb(statSync(out).size)} MB of HTML`
);
