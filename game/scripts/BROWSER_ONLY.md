# Browser boot policy (V18.4)

**Build policy:** `.mjs` is the only application source. `npm run build:js` syncs `sw.js` + `index.html` boot tags from `scripts/asset_manifest.mjs`. It does **not** emit sibling `.js` copies.

| Path | Role |
|------|------|
| `js/app.mjs` | Sole ESM entry (`<script type="module">`) |
| `js/audio/sfx.js` | Intentional legacy defer (AudioContext), not a dual-track twin |
| `sw.js` | Service Worker (must be classic script) |
| `scripts/asset_manifest.mjs` | SW ASSETS + CACHE_NAME + boot tags |
| `scripts/build_browser.mjs` | Writer / `--check` drift gate |

Historical `.js` twins (`coc.js`, `engines/*.js`, …) are gone from disk and from `MANIFEST.yaml`.
