# loop.guide — Product Plan (UI · Content · Architecture)

> A content hub **and** interactive tool for **loop engineering** — the 2026 discipline of
> designing the systems that prompt and orchestrate AI agents, instead of hand-prompting them.
> Positioning: **balanced hub + tool**. Stack: **Astro + Cloudflare**. Hero tool: **"Should I Loop?"**

---

## 1. Strategy & positioning

**One-line promise:** *"Stop guessing whether your AI task needs a loop. Describe it — we'll tell you, and hand you the pattern."*

**Two pillars, equal weight:**

1. **The Hub** — the clearest, most-cited library on loop engineering: what it is, when to use it, the patterns, the failure modes, tool-specific recipes (Claude Code, Codex, Grok, GitHub Actions). Goal: rank on Google **and** get cited by ChatGPT / Gemini / Perplexity (GEO).
2. **The Tool** — *Should I Loop?* An agent that takes a task description, returns a **verdict** (loop / single-prompt / chain), a **confidence + reasoning**, and a **recommended pattern** with a starter checklist. This is the shareable hook that content funnels into.

**Why now:** the term was coined June 2026 (Addy Osmani's essay; Boris Cherny / Anthropic and Peter Steinberger amplifying). The category is forming *right now* — there is a short window to become the canonical reference URL.

**Competitive landscape (what to beat):**

| Player | What they have | Gap we exploit |
|---|---|---|
| addyosmani.com, LangChain blog | Authoritative essays | No tool, no decision aid, no structured pattern catalog |
| loopengineering.run | "Safe autonomous loops" guide | Thin interactivity |
| cobusgreyling/loop-engineering (GitHub) | Patterns, CLI (`loop-audit`, `loop-init`), checklists | Dev-only, GitHub-bound, no friendly web UX |
| tosea.ai, kilo.ai, MindStudio blog | SEO explainer articles | Generic; no "is a loop even right for me?" entry point |

**Our wedge:** the *decision* layer. Everyone explains loops; nobody helps you decide if you need one. The tool is the differentiator and the link-magnet.

**Primary keywords / GEO targets:** `loop engineering`, `should I use an agent loop`, `loop vs prompt vs chain`, `agent loop patterns`, `plan execute verify loop`, `when to use AI agent loops`, `loop engineering vs prompt engineering`, `ReAct loop`, `verification loop AI`.

---

## 2. Information architecture (sitemap)

```
/                         Home — promise + live "Should I Loop?" mini-widget + featured guides
/should-i-loop            The full tool (hero feature)
/patterns                 Pattern catalog index (the 7 loops)
/patterns/[slug]          Single pattern: when to use, watch-outs, anatomy, starter
/blog                     Articles index (GEO/SEO content engine)
/blog/[slug]              Article
/glossary                 (phase 2) term → definition, schema-marked for LLM citation
/about                    Who/why + methodology (trust signal for GEO)
/api/should-i-loop        POST endpoint powering the tool (server-rendered on Cloudflare)
/rss.xml                  Feed
/sitemap-index.xml        Auto (sitemap integration)
```

**Crawl/citation priorities:** `/`, `/should-i-loop`, `/patterns`, each `/patterns/[slug]`, cornerstone blog posts. Each gets FAQ + HowTo / Article structured data so LLMs can lift answers cleanly.

---

## 3. UI plan

**Design language:** developer-credible, calm, fast. Mono + clean sans pairing, dark-default with light toggle, a single accent (loop-cyan `#3ee8c5`), generous whitespace, no marketing bloat. Everything must feel like a *tool a senior engineer trusts*. No heavy JS framework — Astro islands + tiny vanilla scripts.

### Global
- **Header:** logo `loop.guide`, nav (Should I Loop? · Patterns · Blog · About), GitHub/X link, theme toggle.
- **Footer:** quick links, "built for loop engineering" tagline, RSS, sources/credits, last-updated.

### Home (`/`)
1. **Hero** — promise headline + subhead + primary CTA "Try Should I Loop?" and secondary "Read the guide."
2. **Inline mini-tool** — a compact version of the classifier (textarea + Analyze) so visitors get value in <10s without leaving home.
3. **The 7 loops** — card grid linking to `/patterns/*`.
4. **"Loop vs Chain vs Prompt"** — a 3-column explainer block (the highest-intent concept).
5. **Featured guides** — 3 cornerstone posts.
6. **Trust strip** — "Based on work by Osmani, Cherny/Anthropic, LangChain" with links (GEO/E-E-A-T).

### Should I Loop? (`/should-i-loop`)
- **Input panel (left):**
  - Large textarea: *"Describe the task you want the AI to do."*
  - Optional signal toggles (these sharpen the verdict and are honest about what drives it):
    - Needs to run/verify its own output (tests, checks)? 
    - Multiple steps where later steps depend on earlier results?
    - External feedback available (errors, API responses, data)?
    - One deterministic transform / single answer?
    - Ambiguous requirements likely to need human judgment?
  - Buttons: **Analyze**, Clear, "Try an example."
- **Result panel (right):**
  - **Verdict badge:** `LOOP` / `SINGLE PROMPT` / `CHAIN` / `BORDERLINE` + confidence bar.
  - **Why:** 2–4 plain-language reasons tied to the signals it detected.
  - **Recommended pattern:** name + 1-liner + link to `/patterns/[slug]`.
  - **Starter checklist:** goal/termination, tools, verification, stop rules (copyable).
  - **Share / copy result** button.
- **States:** empty (with example chips), loading (skeleton), result, error (graceful — falls back to heuristic, never a dead end).
- **Trust note:** "Heuristic + LLM. No data stored." Keep it honest.

### Patterns (`/patterns`, `/patterns/[slug]`)
- Index: filterable cards (by task type, cost, risk).
- Detail: When to use · When NOT to · Anatomy (mermaid/diagram) · Watch-outs · Minimal starter · Related posts. Same data model feeds the tool's recommendations (single source of truth).

### Blog
- Index: cards, tags, search (client-side fuzzy over a generated JSON index).
- Post: long-form, TOC, "Was this useful? → Try the tool" CTA, JSON-LD Article/FAQ.

**Accessibility/perf:** semantic HTML, prefers-reduced-motion, Lighthouse 95+ targets (Astro ships ~zero JS by default; only the tool hydrates).

---

## 4. Content plan

**Engine:** Astro Content Collections (Markdown). Two collections: `blog` and (data-driven) `patterns`. Cadence: 2–3 posts/week to ride the trend; refresh cornerstones monthly (loop engineering is fast-moving — show "Updated" dates for freshness signals).

**Content pillars & seed backlog**

1. **Definitions / cornerstone (rank + cite):**
   - *What is loop engineering?* (the canonical explainer) ✅ seeded
   - *Loop vs Chain vs Prompt: which do you actually need?* ✅ seeded
   - *Do you need a loop? A 5-question test* ✅ seeded (funnels to tool)
   - Loop engineering vs prompt engineering vs context engineering
   - Glossary: ReAct, verifier, harness, stop rule, sub-agent, worktree, hill-climbing

2. **Patterns (each pattern page + a deep-dive post):**
   Retry · Plan-Execute-Verify · Explore-Narrow · Human-in-the-Loop · Verification/Evaluator · Event-Driven · Hill-Climbing.

3. **Tool-specific recipes (high-intent, low competition):**
   "Loops in Claude Code", "Loops with GitHub Actions", "Codex loop starter", "Grok daily-triage loop".

4. **Operating & safety (depth = authority):**
   Termination conditions · Token-cost control · Failure modes · Anti-patterns · Human gates · Multi-loop coordination.

5. **Decision/opinion (link bait):**
   "Most tasks don't need a loop — here's the line", "The 4 stacked loops (agent → verify → event → hill-climb)".

**GEO/SEO rules for every page:** one clear H1; a 2–3 sentence extractable definition near the top; FAQ block with schema; comparison tables (LLMs love liftable tables); cite primary sources with links; explicit "Updated {date}"; internal links to tool + patterns. Each cornerstone targets one primary keyword + a cluster.

---

## 5. Architecture

**Stack:** Astro 5 (static-first, islands) · `@astrojs/cloudflare` adapter · Cloudflare Pages (build) + Workers runtime (for the one dynamic endpoint) · `@astrojs/sitemap` · `@astrojs/rss`. No DB for MVP.

**Rendering model:** everything **prerendered static** except `/api/should-i-loop` (`export const prerender = false`) which runs on the Worker. Fast, cheap, edge-cached content; only the tool hits compute.

```
Browser
  │  GET (static, edge-cached)        ┌─────────────────────────────┐
  ├──────────────────────────────────▶  Cloudflare Pages (static)   │
  │                                   │  home, blog, patterns, tool  │
  │  POST /api/should-i-loop          └─────────────────────────────┘
  └──────────────────────────────────▶  Worker (Astro endpoint)
                                          │ 1. classify() heuristic  (always; instant, free)
                                          │ 2. if LLM available →     refine verdict/reasons
                                          │       - Workers AI binding (env.AI), or
                                          │       - Anthropic API key (env.ANTHROPIC_API_KEY)
                                          ▼
                                       JSON { verdict, confidence, reasons[], pattern, signals }
```

**The agent — two-layer design (key decision):**
- **Layer 1 — Heuristic classifier** (`src/lib/classifier.ts`, pure TS): scores signals (multi-step, needs verification, external feedback, deterministic-single-output, ambiguity, retry/iteration) from the textarea text + toggles → verdict + confidence + reasons + recommended pattern. **Runs with zero dependencies, zero cost, works offline.** This guarantees the tool *always* returns a sane answer.
- **Layer 2 — LLM refinement** (optional, behind env): if a Workers AI binding or Anthropic key is present, the endpoint sends the task + the heuristic's structured output and asks the model to confirm/adjust the verdict and write sharper reasons. Falls back silently to Layer 1 on any error, missing key, or timeout.

This makes the MVP **demoable today** (heuristic) and **smart in prod** (LLM) — without a hard dependency on keys.

**Pattern catalog as single source of truth:** `src/lib/patterns.ts` feeds *both* the `/patterns` pages and the tool's recommendation, so they never drift.

**Repo layout:**
```
src/
  lib/        classifier.ts, patterns.ts        ← agent brain + catalog
  pages/
    api/should-i-loop.ts                         ← Worker endpoint (prerender=false)
    index, should-i-loop, patterns/*, blog/*, rss.xml.js
  content/blog/*.md                              ← content collection
  components/ Header, Footer, ShouldILoop        ← tool is a vanilla island
  layouts/    BaseLayout, DocLayout
  styles/global.css
astro.config.mjs · wrangler.jsonc · tsconfig.json
```

**Env / secrets:** `ANTHROPIC_API_KEY` (optional) via Cloudflare secret or `.dev.vars`. Workers AI via `[ai] binding = "AI"` in `wrangler.jsonc`. None required to run the heuristic.

**Deploy:** `npm run build` → `wrangler pages deploy ./dist` (or connect the repo to Cloudflare Pages for git-push deploys). Custom domain `loop.guide` via Cloudflare DNS.

**Analytics/privacy:** Cloudflare Web Analytics (cookieless). Tool inputs are not persisted in MVP (state it on the page). Phase 2: optional anonymized logging of (verdict, pattern) to tune the heuristic.

---

## 6. Roadmap

- **MVP (this build):** home + tool (heuristic, LLM-ready) + patterns catalog + 3 cornerstone posts + blog/RSS/sitemap + Cloudflare config.
- **Phase 2:** LLM layer live, glossary with schema, client-side blog search, "copy as Markdown" for results, share-image (OG) generation per verdict.
- **Phase 3:** "Loop readiness score" (port of loop-audit ideas), pattern starters you can download, email capture + newsletter, programmatic tool-recipe pages.

---

## 7. Success metrics
- GEO: cited by ChatGPT/Perplexity/Gemini for "loop engineering" / "should I use a loop" within 60–90 days.
- SEO: top-3 for `should I use an agent loop` and `loop vs chain vs prompt`.
- Tool: % of sessions that run the classifier; share-rate of results.
- Content→tool funnel: blog → `/should-i-loop` click-through.
