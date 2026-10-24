# TRADEBRIDGE INTELLIGENCE
## WEBSITE IMPLEMENTATION DESK → COMMAND CENTER / DESIGN / GROWTH / PRIVACY

**Date:** October 24, 2026
**Subject:** Option A — Website-first, source-only release candidate
**Status:** REVIEW SOURCE PREPARED — NOT APPROVED OR DEPLOYED
**Authorization:** Joshua approved source-only code changes and offline testing for an informational website with direct email contact. No production build, DNS, spending, deploy, PR merge, mailbox action, records or public announcement authorized.

### 1. Exact provenance

**Source repository:** https://github.com/tradebridgeintelligence/tradebridge-website

**Option A isolated branch:** command-option-a-20261024-website-first

**Base revision:** 716f81b4ffa592891c5ecafbe6179c223df31113 (independent W02-reviewed public-copy candidate, not the live staging build).

**First successful source CI commit:** fc4f0aea7e097fca13946350adc05886a275c70b

**CI proof:** https://github.com/tradebridgeintelligence/tradebridge-website/actions/runs/40134584993 — SUCCESS: seven of seven Option A tests passed; original 16-page static source validator PASS; patched Node.js 24.22.1; no deployment. This evidence document is an additive, later file and does not change the previously tested application paths.

### 2. Website-first candidate changes

- Start Here at start/index.html now offers direct email contact, not an online inquiry form. The email destination is jnichols@tradebridgeintelligence.com. Clicking a mailto link does not confirm email delivery or create a website inquiry. The "See the Process" link now leads to /how-tradebridge-works/.
- Privacy at privacy/index.html is a NEW draft for email-only website contact and static hosting information, no longer claiming that the active website uses an inquiry receiver. It identifies Google Workspace processing, possible provider technical logs and retention/request limitations. It requires independent qualified privacy/legal review.
- The legacy receipt page intake-received/index.html now explicitly states the form is unavailable and is marked noindex; it cannot imply a confirmed submission.
- Retired newsletter confirmation title, description and OG metadata no longer imply subscription success; the disabled enrollment body and noindex are preserved.
- Accessibility copy no longer implies a form is being offered.
- Browser script assets/site.js is navigation-only: no session storage, analytics event dispatch, request form, API fetch or Turnstile.
- NEW review builder scripts/build-website-first.cjs creates allowlisted, nonindexable static HTML only; explicitly refuses production-mode builds and any configured API, sitekey or GA4 input. Source API directories, deploy config, CNAME and sitemap are excluded. All 16 output HTML pages have noindex and robots.txt Disallow: /.
- NEW seven-test offline suite tests/website-first.test.cjs and private-branch GitHub Actions workflow exercise copy, no-form/no-API invariants, metadata, marketing exclusions, noindex, deterministic manifest, and production-mode refusal.

Existing Phase One full-form branches, staging services, customer records, database, Cloudflare setup, mailboxes and production GitHub Pages are unchanged. PR #1 is still a separate draft; no source was merged.

### 3. Preserved disputed claims and governance

The original homepage phrase "intelligence-led business building and investment company" and Ventures lead "converts proprietary intelligence, operating expertise, and technology into long-term ownership and enterprise value" are **unchanged**. Their separate independent Design determinations, Growth responses and any Command adjudication remain OUTSTANDING. Passing an invariant test does NOT approve either claim.

The original W01 NEEDS EVIDENCE/BLOCKED and W02 Growth + Design CONDITIONAL ACCEPT findings are preserved. Option A is a different release scope and exact source; earlier W02 conditional reviews do NOT become acceptance of this version. C07 remains mandatory for the deferred secure-form intake path. The website-first alternative still requires an acceptable email privacy/retention and qualified legal basis.

### 4. What QA did and did not establish

**Source QA PASS:** 7/7 automated offline tests; 16 HTML routes; exact proposed contact link; no web form/input, no API transport endpoint, no third-party bot challenge, no tracking or marketing signup, corrected newsletter and receipt notices, all pages blocked from indexing in review; allowed static output only.

**NOT PROVED:** actual public mailbox delivery or coverage; manual Gmail retention/hold/request operations; legal sufficiency; independent W02 review of revised source and both Ventures claims; phone/mobile browser accessibility; production CSP/HTTPS/domain/sitemap; official domain acceptance; public cost and rollback; signed-off production source. This preview build deliberately CANNOT become an indexable production build without a separate approved change.

### 5. Reviewer and authorization decisions needed

| Gate | Accountable and independent reviewers | Remaining decision |
| --- | --- | --- |
| Website-first as a separated public scope | Command + OD | Decide if informational/email site may proceed separately while secure-form W01 remains BLOCKED |
| All changed Option A copy, navigation and branding | Design and Growth independently | Accept or redline exact branch, including newsletter metadata, email Start Here, receipt and privacy wording |
| Homepage "investment company" | Design, Growth, Command if contested | Explicit evidence-based decision; do not infer assent from the general Ventures disclaimer |
| Ventures "converts...into long-term ownership" | Design, Growth, Command if contested | Separate explicit phrase determination and public-safe support |
| Email-contact privacy and operator feasibility | Qualified privacy/legal, OD, Workspace Admin | Confirm lawful disclosure/requests, Gmail copy retention/holds and real mailbox monitoring; no Vault availability assumed |
| Final public build and technical release | Implementation + Design/Growth + Command | Separate authority to create indexable public build, validate headers/TLS, production-domain rollout, cost and rollback; current build stays noindex |

**W01:** NEEDS EVIDENCE / BLOCKED (secure-form intake)
**W02:** TWO CONDITIONAL ACCEPTS — OPTION A EXACT SOURCE NEEDS RE-REVIEW
**PRIVACY/LEGAL:** OUTSTANDING
**PRODUCTION:** HOLD / NO-GO

### 6. Offline review instructions — no deployment

Use the isolated Option A source branch. Without API, Turnstile or GA4 variables, run:

    node scripts/build-website-first.cjs

The directory dist-website-first-review/ contains only the nonindexable preview, with a checksum manifest named WEBSITE_FIRST_REVIEW_MANIFEST.json. Do not copy it to production, connect custom DNS or change Render build commands. The existing full-form script scripts/build-render-static.cjs is NOT the Option A launch path.

**QUALITY OVER QUANTITY. EVERY. SINGLE. TIME.**
**SCOPE CAN CHANGE. STANDARD CANNOT.**
