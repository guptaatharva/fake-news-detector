# VeraCius AI — Fake News Detector

VeraCius is an AI-powered news/claim verification tool built on Next.js 15. Given a URL or a block of text, it extracts the factual claims being made, independently gathers live web evidence for each one, and runs every claim through a **multi-agent debate** — Support, Opposition, Context, and Temporal agents argue from the evidence, and a Judge agent weighs their findings into a verdict. Confidence is never a model's self-reported guess: it's computed deterministically from measured signals (source credibility, evidence-verdict alignment, agent agreement, and freshness).

This document describes what is implemented and wired up today. [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) tracks the original audit this build addressed; [`REMAINING.md`](./REMAINING.md) is the current, up-to-date list of what's genuinely still open and why.

---

## 1. High-level architecture

```
 Browser (Dashboard UI)
        │
        │  client-side orchestration (src/app/dashboard/page.tsx),
        │  claims processed with bounded concurrency (src/lib/concurrency.ts)
        ▼
 ┌───────────────┐   ┌──────────────────┐   ┌───────────────┐   ┌───────────────────┐
 │ /api/analyze/  │→│ /api/analyze/    │→ │ /api/analyze/  │→ │ /api/analyze/       │
 │ extract        │  │ search-query      │  │ scrape          │  │ debate (per claim)  │
 │ (claim mining)  │  │ (per-claim web    │  │ (per-source     │  │ Support/Opposition/ │
 │                 │  │  search)          │  │  scrape)        │  │ Context/Temporal/   │
 │                 │  │                    │  │                 │  │ Judge agents         │
 └───────────────┘   └──────────────────┘   └───────────────┘   └───────────────────┘
        │                     │                      │                      │
        ▼                     ▼                      ▼                      ▼
   NVIDIA Nemotron     GNews API → Google      extractor.ts (SSRF-        NVIDIA Nemotron 3
   3 Ultra (LLM)        News RSS → DuckDuckGo   guarded, robots.txt-      Ultra × 5 agent calls
                        Lite (fallback chain)   respecting, pooled        + deterministic
                                                 Puppeteer)                confidence.ts scoring

 Every /api/analyze/* route requires a signed-in Supabase session and is rate-limited.
 On completion → POST /api/save-analysis → Prisma → Supabase Postgres (best-effort, non-blocking)
```

Every route is still orchestrated by the browser (no job queue yet), but claims are now processed with **bounded concurrency** rather than one at a time, and each claim gathers and is judged against its **own independent evidence set** rather than all claims sharing one shuffled evidence blob.

Before Stage 1 runs for a submitted URL, the dashboard checks `GET /api/analyze/cached` — if the same URL was already checked recently (by the same user, or by another user who made their report public), it offers that cached verdict instead of re-running the full pipeline (see "Cross-user result caching" below).

---

## 2. The verification pipeline in detail

### Stage 1 — Extraction (`POST /api/analyze/extract`)
Accepts `{ url }` or `{ text }` (size-capped), auth-gated and rate-limited. URLs are run through `extractTextFromUrl()` (`src/lib/extractor.ts`), which now:
- Resolves DNS and rejects private/loopback/link-local targets before fetching — closing the SSRF hole where the route could be used to probe internal network addresses (`src/lib/security/ssrf.ts`), including validating every redirect hop.
- Checks the site's `robots.txt` before scraping (`src/lib/security/robots.ts`).
- Extracts byline and publish-date signals (meta tags, JSON-LD, `<time>`), and distinguishes a paywalled page from a page with no article at all.
- Uses a pooled, reused Puppeteer browser instance (`src/lib/puppeteerPool.ts`) instead of launching a new Chromium process per scrape.

Claims are then extracted via NVIDIA Nemotron 3 Ultra and deduplicated (`src/lib/claimDedup.ts`, Jaccard/token-overlap similarity).

A third input path, `POST /api/analyze/extract-image`, OCRs an uploaded screenshot (`src/lib/ocr.ts`, via `tesseract.js` — local, no API key) and returns the recognized text for the user to review before it's handed to this same extraction stage as `{ text }`. OCR recovers the *text* in an image reliably enough to fact-check it; it says nothing about whether the image itself is authentic — see §6 and `REMAINING.md`.

### Stage 2 — Search (`POST /api/analyze/search-query`), per claim
Unchanged in spirit: a 3-provider fallback chain (GNews API → Google News RSS with redirect resolution → DuckDuckGo Lite), deduplicated to one hit per domain, excluding the original article's own domain.

### Stage 3 — Scrape (`POST /api/analyze/scrape`), per candidate source
Same SSRF/robots.txt-guarded `extractor.ts`. Scraped content is scanned for prompt-injection patterns (`src/lib/promptSafety.ts`) before being trusted as evidence — a suspicious source is flagged (`injectionSuspected`) rather than silently trusted.

### Stage 4 — Multi-agent debate (`POST /api/analyze/debate`), per claim — **the core verification engine**
File: [`src/app/api/analyze/debate/route.ts`](src/app/api/analyze/debate/route.ts), orchestrated by [`src/lib/agents/debateOrchestrator.ts`](src/lib/agents/debateOrchestrator.ts).

For each claim, against only that claim's own gathered evidence:
1. **Support**, **Opposition**, **Context**, and **Temporal** agents run in parallel, each reasoning independently over the same untrusted, explicitly-delimited evidence block (`src/lib/promptSafety.ts` wraps it and instructs the model to treat it as data, never instructions).
2. A **Judge** agent weighs all four findings into a verdict, an `agentAgreementScore` (0–1), and a **per-source stance classification** (SUPPORTS/CONTRADICTS/NEUTRAL/IRRELEVANT).
3. Per-source credibility is computed from the deterministic domain-authority model (`src/lib/credibility.ts`) — not the LLM's own guess — with small adjustments for byline presence and recency.
4. Known satire/parody domains are labeled `SATIRE` rather than scored as misinformation (`src/lib/satire.ts`).
5. **Confidence is computed, not asked for** (`src/lib/confidence.ts`): 35% source quality (average credibility of sources used) + 25% evidence strength (fraction of evidence that actually aligns with the reached verdict) + 25% agent agreement + 15% freshness. A claim backed by fewer than 2 independent domains has its confidence capped (low source diversity).

All five agents run on `nvidia/nemotron-3-ultra-550b-a55b` via the same hardened client as extraction/search (`src/lib/nvidia.ts`), replacing the debate system's previous stale reference to `meta/llama-3.1-70b-instruct` on a separate, less-robust client.

The dashboard aggregates all per-claim results into an overall verdict (confidence-weighted average across claims, `aggregateVerdict`) and an overall confidence breakdown (`aggregateConfidenceFactors` + `calculateDeterministicConfidence`) — both fully computed, with an auditable `scoreBreakdown` rather than free-text LLM prose.

A lighter-weight single-shot `POST /api/analyze/synthesize` route still exists as a legacy fast-path (used by the browser extension's quick check), but the dashboard's main pipeline no longer calls it.

### The NVIDIA client layer (`src/lib/nvidia.ts`)
Unchanged core design: streams completions, keeps `reasoning_content` separate from `content`, runs a 6-strategy JSON repair pipeline (`robustExtractAndParseJson`, unit-tested in `src/lib/nvidia.test.ts`), classifies retryable vs. non-retryable provider errors, and retries once with a correction prompt on parse/schema failure. `src/lib/gemini.ts` (the dead Gemini-era stub) has been removed; `src/lib/agents/ai.ts` (the separate, less-robust AI-SDK client) has also been removed — all five debate agents now go through this same hardened client.

### Cross-user result caching (`GET /api/analyze/cached`)
Two people checking the same viral URL within a day of each other get one consistent verdict instead of two independently-run ones. `src/lib/normalizeUrl.ts` canonicalizes the submitted URL (lowercased host, `www.`/tracking-params/trailing-slash stripped) and `Analysis.normalizedSourceUrl` is indexed for it. A match is only ever surfaced if it's the caller's own analysis or another user's analysis they explicitly made public (`isPublic`) — a stranger's private analysis is never exposed this way. The dashboard shows a banner with the cached verdict and lets the user accept it or run a fresh check anyway.

---

## 3. Security

- **Auth-gated, rate-limited API routes**: every `/api/analyze/*` route requires a signed-in Supabase session and is rate-limited per user (in-memory token bucket, `src/lib/security/rateLimit.ts` — see its comments for the Upstash Redis swap-in path for multi-instance deployments), via a shared guard (`src/lib/security/apiGuard.ts`).
- **SSRF protection** on the scraper (`src/lib/security/ssrf.ts`): resolves DNS and validates the *actual* IP (not just the hostname string) against private/loopback/link-local/reserved ranges, blocks non-http(s) schemes and non-standard ports, and validates every redirect hop rather than trusting `fetch`'s automatic redirect-following.
- **Prompt-injection defenses** (`src/lib/promptSafety.ts`): scraped content is wrapped in explicit `<untrusted_evidence>` delimiters with an instruction to treat it strictly as data, plus a heuristic scanner that flags apparent injection attempts (surfaced in the UI, not silently trusted).
- **Input validation & size caps** via Zod on all `/api/analyze/*` routes.
- **Security headers & CSP** (`next.config.ts`).
- **robots.txt compliance** (`src/lib/security/robots.ts`).
- **Upload validation** on `/api/analyze/extract-image`: size-capped (8MB), and the image format is verified by sniffing its actual magic bytes rather than trusting the client-declared MIME type.

Not yet done, and flagged rather than silently skipped: rotating the API keys that were briefly committed to git history (needs the provider dashboards, not just a code change), and moving rate limiting to a shared store (Upstash Redis) for true multi-instance deployments.

---

## 4. Data & persistence

- **ORM**: Prisma (`prisma/schema.prisma`) against Supabase Postgres.
- **Models**: `User`, `Analysis`, `Claim`, `Evidence`, `Source`, `ClaimRelationship`, `Bookmark`, `Feedback`, `AbuseEvent`. The unused NextAuth-shaped `Account`/`Session` models have been removed — this app authenticates via Supabase Auth only.
- `Analysis` stores the deterministic `confidenceFactors` breakdown, an independent-source count, a `lowSourceDiversity` flag, a `normalizedSourceUrl` (for the cross-user cache lookup described in §2), and supports a public read-only share link (`isPublic`/`publicSlug`) and version chaining (`previousVersionId`) for re-checks.
- `Evidence` stores per-source `stance`, `credibilityScore`, and publish date, and links to a `Source` directory row (domain-level credibility/satire cache) used by the evidence-graph API.
- `Bookmark` (`/api/bookmarks`) and `Feedback` ("flag this verdict", `/api/feedback`) are finished end-to-end, not just schema.
- `/api/analyze/graph` was rebuilt against this real schema with real Supabase-session ownership checks (previously it queried nonexistent Prisma models and imported a nonexistent `@/auth` module, and would not compile).
- Migrations live in `prisma/migrations/` (`20260910020000_init`, `20260910133154_add_normalized_source_url`, …) — run `npx prisma migrate deploy` against your database to apply them.

## 5. Authentication

Unchanged: Supabase Auth (email + password), session refreshed via `middleware.ts`. Admin operations (signup, account deletion) use the service-role key server-side only.

## 6. Frontend / UX

- Dashboard now shows a deterministic **confidence breakdown** (bar chart, not prose), an explicit **AI-attribution notice**, a **low-source-diversity warning** when applicable, per-claim **temporal-mismatch** and **prompt-injection** badges, a **SATIRE** verdict distinct from FALSE, a **partial-failure state** with a **retry** action for claims whose evidence-gathering or debate call failed outright, and **public share-link** / **flag-this-verdict** actions.
- `EvidenceGraph` no longer falls back to a hardcoded list of famous outlets with fabricated confidence scores when real evidence is thin — it now shows an honest "insufficient independent evidence found" empty state.
- A public, read-only report view lives at `/report/[slug]` for analyses a signed-in user has explicitly made public.
- New static pages: `/methodology` (what the system can/can't do, how scoring works, how to report a bad verdict), `/privacy`, `/terms` (both explicitly marked as drafts for legal review, not final legal text).
- The **screenshot upload** dropzone in the input panel is live (§2, Stage 1): pick an image, it's OCR'd server-side, and the recognized text lands in the "Paste Text" tab for review before running verification. The **document/PDF upload** dropzone next to it is still a "feature in beta" placeholder.
- Once an analysis completes, the evidence graph, confidence summary, and claim breakdown render at the page's full width (rather than squeezed into a partial column) so the graph's node labels stay legible.

## 7. Browser extension (`extension/`)

The MV3 extension now ships real icon assets (`extension/icons/`, generated from the app's existing icon mark) so it loads in Chrome, sends its session cookie (`host_permissions` + `credentials: 'include'`) so its auth-gated API calls work when the user is signed in on the site, and clearly labels its result in the popup UI as a shallow, evidence-free quick check — distinct from the real, sourced analysis the full dashboard produces.

## 8. Testing & CI

- `npm test` runs a Vitest suite (`src/**/*.test.ts`, 21 files / 123 tests) covering the NVIDIA JSON-repair pipeline, claim deduplication, search-query sanitization, the deterministic confidence/credibility formulas, the extractor's pure content-quality/paywall-detection functions, OCR text extraction, and every `/api/analyze/*` route handler with the LLM/network boundary mocked.
- `src/test/golden/pipeline.e2e.test.ts` is a golden-set end-to-end test: it drives the real extract → search-query → scrape → debate → aggregate chain through the actual route handlers, replacing only the outermost network boundary (`fetch`, `nvidiaGenerateObject`) with VCR-style recorded fixtures (`src/test/golden/fixtures.ts`) shaped like real GNews/NVIDIA responses — so Readability extraction, GNews response parsing, and confidence scoring all run unmocked, catching regressions the per-route mocked tests can't.
- `npm run typecheck` (`tsc --noEmit`) and `npm run lint` are both clean.
- `.github/workflows/ci.yml` runs install → prisma generate → lint → typecheck → test → build on every push/PR to `main`/`staging`.
- Loose one-off debug scripts that used to sit at the repo root and in `scratch/` have been moved into `scripts/manual/` (excluded from the TypeScript project via `tsconfig.json`'s `exclude`), and the personal resume PDF that used to live in `public/` has been removed from the deployed asset tree.

### Accuracy evaluation: what this test suite does *not* cover
Everything above tests that the pipeline's code runs correctly — that a route parses input right, that the confidence formula computes what its inputs say it should, that extraction/search/debate wiring produces the right *shape* of output. **None of it measures whether the verdicts themselves are correct.** The deterministic confidence formula (§2, Stage 4) is auditable — you can always see *why* a score came out the way it did — but "auditable" and "accurate" are different claims.

Two hand-curated evaluation sets exist, both run through the **real, live pipeline** — real web search, real scraping, real NVIDIA debate agents, no mocks — bypassing only the Next.js route/auth layer to call the same underlying functions the routes call. For every claim, the *same* gathered evidence is also run through a **single non-debate LLM call** (same model, one shot, no agent structure) as a baseline, so the two approaches are compared on identical inputs.

**`scripts/manual/eval-accuracy.ts`** (16 claims: clear true/false facts, common myths, debunked high-stakes misinformation, a real Onion satire headline, a claim true before 2006 and false since) — mostly textbook-clear claims once you have any evidence at all. Results: **debate 15/16 (94%), baseline 15/16 (94%) — identical on every case**, including the one miss both made (the SATIRE label only fires when *every* piece of evidence is from a known-satire domain; a real Onion headline mixed with two non-satire sources reporting on it didn't qualify). On easy claims, the multi-agent structure showed no measurable accuracy advantage over a single call.

**`scripts/manual/eval-accuracy-hard.ts`** (8 real, current, genuinely nuanced news claims: a psychology study retracted days before the eval was written, real 2026 disaster-loss statistics, a true statistic paired with an unsupported causal claim, a thinly-covered corporate filing) — the easy set skewed toward claims a single call has no trouble with; this one specifically targets recency traps and compound true/false claims. **First run: debate 3/8 (38%), baseline 6/8 (75%)** — a real regression, not noise. Digging into *why* found two concrete architecture bugs:

1. **No agent ever knew the actual current date.** All five agents inferred "now" from their own training data. The Temporal Agent's logged reasoning on one claim proved it: *"this Nature article is dated April 1, 2026 – a future date relative to the current year (2025)"* — discounting genuinely current, correctly-dated evidence because the date looked unfamiliar to a model trained before it. This affected every live analysis, not just the eval.
2. **Weak MIXTURE-vs-FALSE/MOSTLY_TRUE guidance in the Judge.** The verdict enum had almost no selection criteria. On one claim, the Judge's own explanation correctly identified "a factual kernel... but a decisively contradicted conclusion" — textbook MIXTURE — then picked FALSE anyway; on another, a 2-3 week date imprecision on an otherwise-confirmed claim dragged a MOSTLY_TRUE-shaped claim down to MIXTURE.

**Fixed both** ([debateOrchestrator.ts](src/lib/agents/debateOrchestrator.ts) now threads the real current date into every agent's prompt; [judgeAgent.ts](src/lib/agents/judgeAgent.ts)'s schema and prompt now give explicit criteria for MOSTLY_TRUE/FALSE vs. MIXTURE vs. UNVERIFIABLE) and **re-ran the identical 8 claims to validate, not just asserted it helped**: the exact claim that hit the date bug now gets `CURRENTLY_VALID... published 5 months ago` from the Temporal Agent and a correct MOSTLY_TRUE verdict; the exact claim that hit the MIXTURE bug now correctly lands on MIXTURE. **After the fix: debate 6/8 (75%), baseline 5/8 (62%)** — including one ground-truth correction (see `eval-results-hard.json`: `oregon-wildfires`'s "expected" label was itself imprecise, in the same way the first set's Eiffel Tower label was; corrected, both approaches get it right). Live search returns slightly different evidence run-to-run, so not every point of movement is purely the fix — but the two wins above are traceable case-by-case to the specific bugs found and fixed, not just an aggregate number shifting.

**Net**: on realistic, current claims, the multi-agent debate now measurably outperforms a single call — but only after fixing bugs a naive reading of the architecture wouldn't have surfaced, and on an 8-claim sample too small to be a confident population-level result. What the debate system does that a single call structurally can't, independent of which one gets a given verdict right: produce a deterministic, source-credibility-grounded confidence score and a per-source SUPPORTS/CONTRADICTS/NEUTRAL/IRRELEVANT stance breakdown, rather than just a verdict and free text.

This run itself is complete — all 16 cases finished with real, paired results for both approaches, nothing left pending or erroring out. What's still open (tracked as item #10 in `REMAINING.md`) is scaling the same idea up: a larger, statistically meaningful, more adversarial set, and periodically re-running it to catch regressions — 16 hand-curated examples is a real first data point, not a population-level accuracy claim, and it's entirely possible a bigger set would separate the two approaches where this one didn't.

## 9. Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase Postgres connection strings for Prisma (pooled + direct) |
| `NVIDIA_API_KEY` | NVIDIA NIM API key — powers claim extraction, synthesis, and every debate agent |
| `GNEWS_API_KEY` | Optional; first-choice search provider, also used for the homepage's live headlines feed (`/api/news`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase client config |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — used for admin user creation/deletion |
| `RESPECT_ROBOTS_TXT` | Optional; set to `"false"` to disable the robots.txt check (default: respected) |

`AUTH_SECRET` and `GEMINI_API_KEY`, both stale leftovers from earlier stacks, have been removed from `.env.example` — nothing in the codebase consumes them.

## 10. Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values from §9
npx prisma generate
npx prisma migrate deploy    # applies prisma/migrations/ (requires a reachable DATABASE_URL/DIRECT_URL)
npm run dev                  # http://localhost:3000
npm test                     # unit tests
```

Load the extension for local testing via `chrome://extensions` → "Load unpacked" → select `extension/`.

## 11. Deployment notes

`extractor.ts` still shells out to Puppeteer/headless Chromium as a scraping fallback tier (now pooled/reused rather than launched per-request, but still in-process). Standard serverless platforms (Vercel's default runtime) may hit function-size or execution-time limits — a Dockerized host (Railway, Render, Fly.io, a VPS) with a full Chromium install is recommended, or moving scraping to a dedicated worker remains open (see `REMAINING.md`).

The in-memory rate limiter (`src/lib/security/rateLimit.ts`) enforces its limit per Node process — on a horizontally-scaled multi-instance deployment, swap in a shared store (Upstash Redis) before relying on it for real abuse resistance.

Screenshot OCR (`src/lib/ocr.ts`, via `tesseract.js`) needs the Node.js runtime, not the Edge runtime, and `tesseract.js`/`tesseract.js-core` are marked in `next.config.ts`'s `serverExternalPackages` so Next doesn't webpack-bundle them (bundling breaks the package's own relative `require()` of its Node worker script). Unless a local `langPath` is configured, it also fetches its English language model (~4MB, open-source, no auth) from the jsDelivr CDN the first time OCR runs in a given environment, then caches it — worth knowing on a platform with an ephemeral filesystem (a fresh serverless instance may re-fetch it on its first request).
