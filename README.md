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
and applicants never leave the page. `src/apply.js` validates the fields and emails the
application to quotasaleshq@gmail.com through Cloudflare Email Routing (`send_email` in
`wrangler.jsonc`). Each email has the applicant set as Reply-To.

Requirement: quotasaleshq@gmail.com must be a **Verified** destination address under
quotasaleshq.com -> Email -> Email Routing -> Destination addresses.

## Cloudflare settings
Connected to this repo through Workers Builds. Cloudflare reads `wrangler.jsonc` and deploys on every push to `main`. No build command needed.

## Making changes
Edit `public/index.html`, commit, push. Cloudflare redeploys in about a minute.

Local preview: `npx wrangler dev`
