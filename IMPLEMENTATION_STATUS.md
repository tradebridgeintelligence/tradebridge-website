# TradeBridge Website — Approved v1.0 Implementation (Staging Branch)

**Governing authority:** TradeBridge Website Modernization Specification v1.0 FINAL (approved October 9, 2026).

**Safety:** Only work on `website-modernization-v1-approved`. Do not merge this branch or change GitHub Pages main/CNAME/DNS without explicit approval. Existing GitHub Pages source remains `main`.

## Environment compatibility
- Public frontend: static HTML/CSS/JS, with simple directory routes compatible with GitHub Pages.
- Preview: separate Vercel **preview deployment only**. `vercel.json` sets X-Robots-Tag noindex across routes. This Vercel-specific file is not enforced by GitHub Pages.
- Backend: Vercel `/api/intake` and `/api/newsletter` functions are present for preview and can forward to a **preapproved secure webhook**. They fail closed (503) without the required receiver + rate-limit credentials, returning **no false success**.
- **Production blocker:** GitHub Pages does not run serverless functions. Before production cutover, either approve an independent HTTPS form endpoint with appropriate CORS/source restrictions and update the frontend endpoint OR approve a hosting implementation that provides the serverless receiver. This is an infrastructure Design Handoff item, not a license to change website routing/claims.

## Intake webhook contract
Required preview environment variables (configure privately, never commit):
- `OPPORTUNITY_DESK_WEBHOOK_URL` — absolute HTTPS endpoint that writes accepted Opportunity Desk records and Growth newsletter consents.
- `OPPORTUNITY_DESK_WEBHOOK_TOKEN` — authorization bearer token, limited to intake writes.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — server-side per-IP rate-limit store.
- `INTAKE_RATE_LIMIT_SALT` — private high-entropy salt for hashing IP in throttle keys.
- Optional `ALLOWED_ORIGINS` — comma-separated origins for approved cross-origin frontend.
The receiver must **durably commit** and respond with JSON `{"accepted":true,"record_id":"opaque-id"}`. The website only treats this response as success, then fires `intake_submit`. Receiver is responsible for idempotency, OD notification, dedup, spam review, retention, and Growth/Conversion linkage. It must never promote directly into Conversion without OD acceptance. **Do not launch until acceptance and error paths are proven.**

## Analytics
`assets/site-config.js` has no GA4 ID; analytics events are local browser CustomEvents until a Joshua-approved analytics property is configured and optional measurement consent granted. Event names are `division_view`, `cta_click`, `intake_start`, `intake_submit`, `newsletter_subscribe`, `insight_engage`. Sensitive form contents are never included in events. Growth Campaign/Content IDs are passed through verbatim when supplied, with conservative aliases.

## Still required before production
- Growth validates campaign/content URL field names and final insight copy; no generated ID numbering.
- Design/Joshua approve any proof, founder language, privacy terms and claims before launch.
- Confirm receiving OD endpoint, newsletter double opt-in/unsubscribe method and source-to-Conversion attribution.
- Confirm domain/DNS/HTTPS, security header strategy for GitHub Pages (or approved alternate production host), Search Console and analytics/consent.
- Execute cross-browser/mobile/a11y, integration, SEO, load and security checks; QA records must be attached to PR.
