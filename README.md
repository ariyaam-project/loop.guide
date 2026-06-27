# loops.guide

The hub **and** tool for **loop engineering**, decide when your AI task needs an agent loop, and get the right pattern. Built with **Astro** + **Cloudflare**.

See [`PLAN.md`](./PLAN.md) for the full UI / content / architecture plan.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
```

The **Should I Loop?** tool works out of the box on its heuristic, no API key needed.

## Project layout

```
src/
  lib/
    classifier.ts        # heuristic "should I loop?" engine (Layer 1, always on)
    patterns.ts          # the 7 loop patterns, single source of truth for tool + pages
  pages/
    index.astro          # home: promise + mini-tool + pattern grid
    should-i-loop.astro  # the full tool
    patterns/            # catalog index + [slug] detail pages
    blog/                # collection index + [...slug] posts
    api/should-i-loop.ts # Worker endpoint (prerender=false): heuristic + optional LLM
    rss.xml.js
  content/blog/*.md      # cornerstone posts
  components/            # Header, Footer, ShouldILoop (vanilla island)
  layouts/               # BaseLayout
  styles/global.css
astro.config.mjs · wrangler.jsonc · tsconfig.json
```

## The agent (two layers)

1. **Heuristic** (`src/lib/classifier.ts`), pure, deterministic, zero-dependency. Always returns a verdict (loop / single / chain / borderline), confidence, reasons, and a recommended pattern. Works offline.
2. **LLM refinement** via Cloudflare Workers AI, `/api/should-i-loop` asks the model to sharpen the heuristic's result, reject off-topic inputs, and return structured JSON. If Workers AI is unavailable, the heuristic still answers.

### LLM layer

**Cloudflare Workers AI:** `wrangler.jsonc` includes an AI binding named `AI`, and the endpoint calls `env.AI.run()` with the local classifier prompt. The default model is `@cf/meta/llama-3.1-8b-instruct-fast`; override it with `WORKERS_AI_MODEL` if needed.

For Cloudflare Pages deployments configured through the dashboard, make sure the Pages project also has a Workers AI binding named `AI`.

**OpenAI fallback:** set a secret if you want a hosted fallback when Workers AI is unavailable.
```bash
wrangler pages secret put OPENAI_API_KEY
# optional model override
wrangler pages secret put OPENAI_MODEL
# local dev: copy .dev.vars.example → .dev.vars and add the key
```

**Anthropic fallback:** set a secret if you want a hosted fallback when Workers AI is unavailable.
```bash
wrangler pages secret put ANTHROPIC_API_KEY
# optional model override
wrangler pages secret put ANTHROPIC_MODEL
# local dev: copy .dev.vars.example → .dev.vars and add the key
```

## Tests

```bash
npm test
```

## Deploy (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy ./dist
```

Or connect the repo to Cloudflare Pages for push-to-deploy. Point `loops.guide` at it via Cloudflare DNS. Update `SITE` in `astro.config.mjs` and `SITE_URL` in `src/consts.ts` to the final domain.
