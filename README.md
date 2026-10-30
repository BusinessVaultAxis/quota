# Quota — quotasaleshq.com

Recruiting site for Quota door-to-door sales reps. Hosted as a Cloudflare Worker (project: quota).
Every push to `main` goes live automatically.

## Layout
- `public/` — the website (`index.html` holds all HTML, CSS and JS), plus robots.txt, sitemap.xml and the iPhone icon
- `src/worker.js` — serves the site, redirects www to the main domain, routes `/api/apply`
- `src/apply.js` — the application endpoint (`POST /api/apply`)
- `wrangler.jsonc` — Worker config (name must match the Cloudflare project: `quota`)

## How applications work
The form posts to `/api/apply` on the same domain, so browsers and ad blockers don't block it
and applicants never leave the page. The function validates the fields and forwards them to
FormSubmit, which emails them to quotasaleshq@gmail.com.

One-time: the first application after a fresh setup makes FormSubmit send an "Activate Form"
email to quotasaleshq@gmail.com. Click it once.

## Cloudflare settings
Connected to this repo through Workers Builds. Cloudflare reads `wrangler.jsonc` and deploys on every push to `main`. No build command needed.

## Making changes
Edit `public/index.html`, commit, push. Cloudflare redeploys in about a minute.

Local preview: `npx wrangler dev`
