import type { APIRoute } from "astro";
import { analyze, type AnalyzeResult } from "../../lib/classifier";
import { PATTERNS } from "../../lib/patterns";

// This route runs on-demand on the Cloudflare Worker (not prerendered).
export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const task: string = typeof body?.task === "string" ? body.task : "";
  if (!task.trim()) return json({ error: "Describe a task first." }, 400);
  if (task.length > 4000) return json({ error: "Task too long (max 4000 chars)." }, 400);

  const signals = body?.signals && typeof body.signals === "object" ? body.signals : undefined;

  // Layer 1 — always-on heuristic. Guarantees a sane answer.
  const base = analyze({ task, signals });

  // Layer 2 — optional LLM refinement. Falls back silently on any problem.
  const env = (locals as any)?.runtime?.env ?? {};
  try {
    const refined = await refineWithLLM(task, base, env);
    if (refined) {
      if (refined.verdict === "rejected") {
        return json({ verdict: "rejected", confidence: refined.confidence, reasons: refined.reasons }, 422);
      }
      return json(refined);
    }
  } catch {
    // ignore — heuristic result is still good
  }

  return json(base);
};

// Optional GET for quick manual testing in the browser.
export const GET: APIRoute = async ({ url }) => {
  const task = url.searchParams.get("task") ?? "";
  if (!task) return json({ ok: true, usage: "POST { task, signals? } or GET ?task=..." });
  return json(analyze({ task }));
};

type RefinedResult = AnalyzeResult | { verdict: "rejected"; confidence: number; reasons: string[] };

async function refineWithLLM(
  task: string,
  base: AnalyzeResult,
  env: Record<string, any>,
): Promise<RefinedResult | null> {
  const validSlugs = PATTERNS.map((p) => p.slug);

  const sys = `You are Loop Advisor — an expert classifier for AI agent architecture decisions.

YOUR ONLY JOB: classify whether an AI automation task benefits from a loop, a chain, or a single prompt. Reject everything else.

━━━ VERDICTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"single" — One LLM call is enough. One input, one output. No verification, no iteration, no feedback to react to.
  ✓ Translate this paragraph to Spanish
  ✓ Summarize this article in 3 bullet points
  ✓ Extract all email addresses from this document

"chain" — Multiple fixed steps, predetermined order, nothing reacts to another step's output. A → B → C.
  ✓ Scaffold the API, then add JWT auth, then write the README
  ✓ Generate 10 names, pick the best, write the product copy

"loop" — The agent acts, observes a real result, and revises based on what it sees. Genuine feedback cycle required.
  ✓ Fix all failing tests and keep going until they all pass
  ✓ Keep refining this essay until it scores ≥90 on the rubric
  ✓ Scrape job listings daily, alert when a senior role appears
  ✓ Debug this error: run the code, read stderr, fix, repeat

"borderline" — Signals are genuinely mixed. Use sparingly — prefer a decisive verdict. Advise starting simple.

"rejected" — NOT an AI automation task. Reject: general knowledge questions, creative writing for humans, personal advice, math problems, concept explanations — anything that doesn't describe work for an AI agent to execute inside a system.
  ✗ What's the capital of France?
  ✗ Write me a poem about autumn
  ✗ How does TCP/IP work?
  ✗ What's 2 + 2?

━━━ PATTERNS (required for all non-rejected verdicts) ━━━━━━━━━━

${validSlugs.map((s) => `  ${s}`).join("\n")}

  retry               — Atomic task, clear pass/fail checker, retry until it passes
  plan-execute-verify — Multi-step ordered work; verify each step before proceeding
  explore-narrow      — Unknown best path; branch into candidates, prune to the best
  human-in-the-loop   — Irreversible/sensitive actions or ambiguous requirements needing approval
  verification        — Quality-critical output scored against a rubric or test suite
  event-driven        — Triggered by schedule/webhook; continuous background automation
  hill-climbing       — Self-improving system that learns from its own run traces over time

━━━ CONFIDENCE SCALE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  90–100  Crystal clear, unambiguous signal
  70–89   Strong signal, minor uncertainty
  50–69   Moderate confidence
  30–49   Weak signal, genuinely unclear
  Cap borderline at 58. Use the full 0–100 range — do not cluster around 80.

━━━ OUTPUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output ONLY a raw JSON object — no markdown fences, no preamble, nothing outside the braces.
{"verdict":"loop|single|chain|borderline|rejected","confidence":0-100,"reasons":["2–4 short sentences explaining WHY — not restating the label"],"patternSlug":"<required unless rejected>"}
For rejected: confidence ≥95, reasons explain why it's not an AI automation task, omit patternSlug.`;

  const user = `TASK:\n${task}\n\nHEURISTIC PRE-ANALYSIS (use as a starting point; override if you disagree):\n${JSON.stringify({
    verdict: base.verdict,
    confidence: base.confidence,
    patternSlug: base.pattern.slug,
    signals: base.signals,
  }, null, 2)}`;

  let raw: string | null = null;

  // Provider A: Cloudflare Workers AI binding (env.AI)
  if (env.AI && typeof env.AI.run === "function") {
    const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      max_tokens: 400,
    });
    raw = out?.response ?? null;
  }

  // Provider B: Anthropic API key
  if (!raw && env.ANTHROPIC_API_KEY) {
    const model = env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: sys,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const data: any = await res.json();
      raw = data?.content?.[0]?.text ?? null;
    }
  }

  // Provider C: OpenAI API key
  if (!raw && env.OPENAI_API_KEY) {
    const model = env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const data: any = await res.json();
      raw = data?.choices?.[0]?.message?.content ?? null;
    }
  }

  if (!raw) return null;

  const parsed = safeJson(raw);
  if (!parsed) return null;

  const allVerdicts = ["loop", "single", "chain", "borderline", "rejected"] as const;
  const parsedVerdict = allVerdicts.find((v) => v === parsed.verdict);
  if (!parsedVerdict) return null;

  const confidence =
    typeof parsed.confidence === "number" ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : base.confidence;
  const reasons = Array.isArray(parsed.reasons)
    ? (parsed.reasons as unknown[]).filter((r): r is string => typeof r === "string").slice(0, 4)
    : base.reasons;

  if (parsedVerdict === "rejected") {
    return { verdict: "rejected", confidence, reasons: reasons.length ? reasons : ["This doesn't appear to be an AI automation task."] };
  }

  const slug = validSlugs.includes(parsed.patternSlug) ? parsed.patternSlug : base.pattern.slug;
  const p = PATTERNS.find((x) => x.slug === slug)!;

  return {
    ...base,
    verdict: parsedVerdict,
    confidence,
    reasons: reasons.length ? reasons : base.reasons,
    pattern: { slug: p.slug, name: p.name, tagline: p.tagline, href: `/patterns/${p.slug}` },
    checklist: p.starter,
    source: "llm",
  };
}

function safeJson(text: string): any | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
