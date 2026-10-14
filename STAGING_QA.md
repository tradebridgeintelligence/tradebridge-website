# TradeBridge Website — Preview Release QA

**Approved design:** TradeBridge Website Modernization Specification v1.0 FINAL.
**Branch:** `website-modernization-v1-approved`.
**Target:** isolated Vercel Preview; never merge or deploy production without Joshua's explicit authorization.

## Pre-preview checks
- [x] Dedicated GitHub branch; production GitHub Pages `main` unchanged.
- [x] Static pages and three-division navigation committed.
- [x] Preliminary structural source checks passed (12 of 12 inspected paths).
- [x] Preview-specific `vercel.json` adds non-indexing headers.
- [ ] Staging preview confirmed deployed from **this branch**, not `main`.
- [ ] Verify no custom production domain attached to the Vercel preview project.
- [ ] Verify Vercel deployment protection before sharing the preview.

## Visual and functional checks (awaiting preview)
- [ ] Home, division pages, process, Insights, About, Start Here and policy pages load.
- [ ] Desktop: 1440px and 1024px; mobile: 768px, 390px and 320px.
- [ ] Navigation, keyboard-only navigation, focus, screen readers and contrast.
- [ ] No clipped text, overlapping elements, broken assets or dead links.
- [ ] Canonical, metadata, sitemap, robots and noindex behavior checked in the preview environment.
- [ ] Forms correctly **fail closed** before an authorized receiving endpoint is configured; no false-success messages.
- [ ] End-to-end intake/attribution/consent tested after secure webhook and rate-limiting variables are approved.
- [ ] Security, SEO, performance and accessibility assessment recorded.

## Production blockers
1. Approved Opportunity Desk/Growth receiver and durable acknowledgement.
2. Rate-limit service credentials and spam review.
3. Form backend hosting decision (GitHub Pages cannot execute `/api` functions).
4. Approved GA4/measurement configuration and Growth attribution mapping.
5. Privacy and legal review and Ventures claim approvals.
6. Staging walkthrough, regression tests, and Joshua's **separate explicit approval to launch**.

This file also provides a branch update after Vercel Git import to request a new Vercel **preview** build; it does not change the GitHub Pages `main` deployment.
