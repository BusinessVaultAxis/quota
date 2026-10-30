# Quota — quotasaleshq.com

Recruiting site for Quota door-to-door sales reps. Hosted on Cloudflare Pages.
Every push to `main` goes live automatically.

## Layout
- `public/` — the website (`index.html` holds all HTML, CSS and JS), plus robots.txt, sitemap.xml and the iPhone icon
- `functions/api/apply.js` — the application endpoint (`POST /api/apply`)

## How applications work
The form posts to `/api/apply` on the same domain, so browsers and ad blockers don't block it
and applicants never leave the page. The function validates the fields and forwards them to
FormSubmit, which emails them to quotasaleshq@gmail.com.

One-time: the first application after a fresh setup makes FormSubmit send an "Activate Form"
email to quotasaleshq@gmail.com. Click it once.

## Cloudflare Pages settings
- Framework preset: None
- Build command: (empty)
- Build output directory: `public`

## Making changes
Edit `public/index.html`, commit, push. Cloudflare redeploys in about a minute.
