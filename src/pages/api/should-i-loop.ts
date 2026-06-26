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
    if (refined) return json(refined);
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

async function refineWithLLM(
  task: string,
  base: AnalyzeResult,
  env: Record<string, any>,
): Promise<AnalyzeResult | null> {
  const validSlugs = PATTERNS.map((p) => p.slug);
  const sys =
    "You are a loop-engineering advisor. Given a task and a heuristic pre-analysis, return STRICT JSON " +
    '{"verdict","confidence","reasons","patternSlug"} where verdict is one of ' +
    '"loop"|"single"|"chain"|"borderline", confidence is 0-100, reasons is an array of 2-4 short plain ' +
    `sentences, and patternSlug is one of: ${validSlugs.join(", ")}. ` +
    "verdict 'single' = one prompt; 'chain' = fixed linear steps; 'loop' = act-observe-revise; " +
    "'borderline' = could go either way. Be decisive and concise. Output JSON only.";
  const user = `TASK:\n${task}\n\nHEURISTIC:\n${JSON.stringify({
    verdict: base.verdict,
    confidence: base.confidence,
    patternSlug: base.pattern.slug,
    signals: base.signals,
  })}`;

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
        max_tokens: 400,
        system: sys,
        messages: [{ role: "user", content: user }],
      }),
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
        max_tokens: 400,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (res.ok) {
      const data: any = await res.json();
      raw = data?.choices?.[0]?.message?.content ?? null;
    }
  }

  if (!raw) return null;

  const parsed = safeJson(raw);
  if (!parsed) return null;

  const verdict = ["loop", "single", "chain", "borderline"].includes(parsed.verdict)
    ? parsed.verdict
    : base.verdict;
  const slug = validSlugs.includes(parsed.patternSlug) ? parsed.patternSlug : base.pattern.slug;
  const p = PATTERNS.find((x) => x.slug === slug)!;
  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((r: unknown) => typeof r === "string").slice(0, 4)
    : base.reasons;
  const confidence =
    typeof parsed.confidence === "number" ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : base.confidence;

  return {
    ...base,
    verdict,
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
