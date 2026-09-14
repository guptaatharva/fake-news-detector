# What's Remaining

[`IMPROVEMENTS.md`](./IMPROVEMENTS.md) was a full audit of the codebase; a large implementation pass (tracked in its "Implementation status" section) addressed nearly everything in it — the multi-agent debate system is now the core verification engine with deterministic confidence scoring, the app is auth-gated/rate-limited/SSRF-guarded, the broken `/api/analyze/graph` route was rebuilt for real, bookmarks/feedback/stats/re-check/public-sharing all ship end-to-end, there's a 95-test Vitest suite plus CI, and compliance pages exist.

This document lists everything that's genuinely still open, and why.

---

## Needs credentials or infrastructure only the project owner can provide

1. **Rotate the NVIDIA, GNews, and Supabase API keys.** They were briefly committed to git history before being removed from tracking (`a5d5a75 Remove .env and .env.local from git tracking`) — removing a file from tracking does not remove it from history. Anyone with repo access can still recover the old values. This requires the provider dashboards, not a code change; consider `git filter-repo`/BFG to scrub history if the repo is or will be public.
2. **A shared rate-limit store (Upstash Redis).** `src/lib/security/rateLimit.ts` is an in-memory token bucket — correct and effective for a single Node process, but each instance enforces its own limit independently on a horizontally-scaled deployment. The module is written so swapping in Upstash is a small, isolated change, not a rewrite.
3. **Search/scrape response caching (also wants Redis).** Every analysis re-searches and re-scrapes from scratch, even for a claim/URL checked minutes ago by someone else.
4. **More search providers** (Bing Search API, a proper Google Programmable Search Engine) — needs new paid API keys. Today's chain (GNews → Google News RSS → DuckDuckGo Lite) has no remaining fallback if all three degrade simultaneously.
5. **Google Fact Check Tools API integration** — would let the pipeline check whether Snopes/PolitiFact/AFP/Reuters Fact Check have already rated a claim, often more reliable than fresh web search + LLM synthesis. Needs its own API key.

## Needs a fundamentally different architecture

6. **A real server-orchestrated job queue** (BullMQ/Inngest/Trigger.dev), so an in-progress analysis survives a closed browser tab and can be resumed, rate-limited, and parallelized safely server-side. The pipeline is still driven by the browser making a sequence of `fetch()` calls (claims are now processed with bounded concurrency, which helps, but there's no persistent job).
7. **SSE/WebSocket job status**, which depends on #6 — the "agent terminal" log is still a client-side illusion built from the fetch sequence, not real server-side progress.
8. **Moving Puppeteer to a dedicated worker service** off the request path. It's pooled/reused in-process now (`src/lib/puppeteerPool.ts`) rather than launched per-request, which meaningfully helps, but a full headless-Chromium fallback tier living inside an API route is still not ideal for serverless platforms.

## Needs data or research that doesn't exist yet

10. **Calibration & backtesting.** Two labeled evaluations now exist and ran to completion, both through the real, live pipeline — real search, real scraping, real NVIDIA debate agents, no mocks — each claim's evidence also run through a single non-debate LLM call as a baseline for comparison. See `README.md`'s "Accuracy evaluation" section and `scripts/manual/eval-results*.json` for the raw output.
    - `scripts/manual/eval-accuracy.ts` (16 easy/textbook claims): debate and baseline tied exactly, 15/16 (94%) each, including the same miss — no accuracy advantage for the multi-agent structure on claims a single call has no trouble with.
    - `scripts/manual/eval-accuracy-hard.ts` (8 real, current, genuinely nuanced 2026 news claims): debate initially scored *worse* than baseline (3/8 vs 6/8) — investigating why surfaced two real bugs (no agent knew the actual current date, causing it to misjudge current evidence as "from the future"; weak Judge guidance on when to use MIXTURE vs. FALSE/MOSTLY_TRUE for compound true-premise/false-conclusion claims). Both were fixed in `debateOrchestrator.ts`/`judgeAgent.ts`, and re-running the identical 8 claims confirmed the fix: debate now leads, 6/8 vs. baseline's 5/8.

    What's still open: a larger-scale, statistically meaningful, more adversarial sample (24 hand-picked examples across both sets isn't enough to conclude anything at a population level, only what these specific runs showed); periodic re-runs to catch regressions and feed into calibrating the confidence formula's weights; determining whether the debate system's richer output (per-source stance classification, source-credibility-grounded confidence) justifies its 5x LLM call cost now that an accuracy edge has been observed on the harder set but not the easy one; and out-of-context real footage, which a text-only pipeline structurally can't evaluate — that needs image/video verification (item #11).
11. **Image/video verification.** The tool is text-only today. No reverse image search or AI-generated-image detection.
12. **Multilingual support.** Extraction/search/synthesis prompts and the search providers used are effectively English-centric; no language detection or translate-then-verify path exists.

## Smaller — no blocker, just genuinely not built

13. **Physical device / screen-reader accessibility testing.** A code-review accessibility pass fixed concrete gaps found (unlabeled form inputs, missing dialog semantics on the command palette, etc.), but no testing was done with an actual screen reader or on real mobile hardware, and color contrast wasn't measured.
14. **Alerting on abuse events.** `/admin/abuse` gives a maintainer a page to go look at repeated-submission warnings, but nothing pushes a notification (email/Slack/etc.) when a new one is recorded.

---

## Everything else from the original roadmap is done

Correctness bugs (§1), the security hardening in §2 other than key rotation and shared rate limiting, detection-quality items §3.1/§3.3/§3.7–3.10, scraping robustness §4.3–4.6, claim-level concurrency (§5.2), the full data-model roadmap in §6, testing/CI/hygiene in §7, UX polish in §8, and compliance/trust in §9 — see `IMPROVEMENTS.md`'s "Implementation status" section for the itemized list of what changed and where.

Two more items from this document's own list are now done too, since neither actually needed new external infrastructure:

- **Cross-user result caching** (was #9). `GET /api/analyze/cached` matches a submitted URL (normalized in `src/lib/normalizeUrl.ts`, stripping tracking params/`www.`/trailing slashes) against the caller's own recent analyses or another user's `isPublic` one, using the existing Postgres database — no Redis needed for this part. The dashboard checks it before running a fresh pipeline and lets the user reuse the cached verdict or force a fresh check. Per-claim confidence isn't persisted in the schema, so a reused result approximates it with the overall analysis confidence (documented in `src/app/api/analyze/cached/route.ts`).
- **A golden-set end-to-end test** (was #13). `src/test/golden/pipeline.e2e.test.ts` runs the real extract → search → scrape → debate → aggregate chain through the actual route handlers, replacing only the outermost network boundary (global `fetch`, `nvidiaGenerateObject`) with VCR-style recorded fixtures (`src/test/golden/fixtures.ts`) shaped like real GNews/NVIDIA payloads and a realistic article HTML page — so Readability extraction, GNews response parsing, and the debate/confidence scoring all run unmocked. The aggregation step it exercises (`src/lib/pipeline/aggregateResult.ts`) was extracted out of `dashboard/page.tsx` so the test and the UI share one implementation instead of the test re-deriving it.
