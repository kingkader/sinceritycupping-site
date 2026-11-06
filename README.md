# lucidmark.co.uk

Static site for LucidMark (Google Ads management, a trading name of Axonis Ltd).

- Edit `build/build.py` (pages) and `src/assets/` (styles, script, fonts).
- Build: `python3 build/build.py` → `dist/`.
- Deploy: push to this `lucidmark-site` branch. GitHub Actions builds and deploys to the Cloudflare Pages project `lucidmark`.
- Form: `functions/api/audit.js` emails audit requests via Resend when `RESEND_API_KEY` is set on the Pages project; otherwise the page falls back to the visitor's email app.

This branch lives in the sinceritycupping-site repo only to reuse its Cloudflare deploy secrets. It shares no history with `main`.
