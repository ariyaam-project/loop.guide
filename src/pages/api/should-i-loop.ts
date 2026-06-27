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

const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

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

  // Layer 1: always-on heuristic. Guarantees a sane answer.
  const base = analyze({ task, signals });

  // Layer 2: optional LLM refinement. Falls back silently on any problem.
  const env = (locals as any)?.runtime?.env ?? {};
  try {
    const refined = await refineWithLLM(task, base, env);
    if (refined) {
      if (refined.verdict === "rejected") {
        return json(
          {
            verdict: "rejected",
            confidence: refined.confidence,
            reasons: refined.reasons,
            source: "llm",
          },
          422,
        );
      }
      return json(refined);
    }
  } catch {
    // ignore; heuristic result is still good
  }

  return json(base);
};

// Optional GET for quick manual testing in the browser.
export const GET: APIRoute = async ({ url }) => {
  const task = url.searchParams.get("task") ?? "";
  if (!task) return json({ ok: true, usage: "POST { task, signals? } or GET ?task=..." });
  return json(analyze({ task }));
};

type RejectedResult = {
  verdict: "rejected";
  confidence: number;
  reasons: string[];
};

type RefinedResult = AnalyzeResult | RejectedResult;

async function refineWithLLM(
  task: string,
  base: AnalyzeResult,
  env: Record<string, any>,
): Promise<RefinedResult | null> {
  const validSlugs = PATTERNS.map((p) => p.slug);
  const sys = [
    "You are Loop Advisor, an expert classifier for AI agent architecture decisions.",
    "Your only job is to classify whether an AI automation task benefits from a loop, a chain, or a single prompt.",
    "Write for a non-technical person. Use simple everyday words.",
    "Do not mention internal terms like heuristic, pre-analysis, signals, patternSlug, deterministic, LLM, confidence score, or model architecture.",
    "Do not put patternSlug or any JSON field name inside the reasons array.",
    "Reject anything that is not an AI automation task.",
    "",
    "Verdicts:",
    '"single": one LLM call is enough. One input, one output. No verification, iteration, or feedback to react to.',
    '"chain": multiple fixed steps in a predetermined order. Step A then B then C, with nothing reacting to runtime results.',
    '"loop": the agent acts, observes a real result, and revises based on what it sees. A genuine feedback cycle is required.',
    '"borderline": signals are genuinely mixed. Use sparingly and advise starting simple.',
    '"rejected": not an AI automation task. Reject general knowledge questions, creative writing requests, personal advice, math problems, and concept explanations.',
    "",
    "Valid patternSlug values for non-rejected verdicts:",
    validSlugs.join(", "),
    "",
    "Pattern meanings:",
    "retry: atomic task with a clear pass/fail checker.",
    "plan-execute-verify: multi-step ordered work where each step should be verified.",
    "explore-narrow: unknown best path, branch into candidates and prune.",
    "human-in-the-loop: sensitive, irreversible, or ambiguous work needing approval.",
    "verification: quality-critical output scored against a rubric or test suite.",
    "event-driven: triggered by a schedule, webhook, or queue.",
    "hill-climbing: self-improving system that learns from run traces.",
    "",
    "Confidence scale:",
    "90-100 means crystal clear.",
    "70-89 means strong signal with minor uncertainty.",
    "50-69 means moderate confidence.",
    "30-49 means weak signal.",
    "Cap borderline at 58. Use the full range instead of clustering around 80.",
    "",
    "Output only raw JSON with this shape:",
    '{"verdict":"loop|single|chain|borderline|rejected","confidence":0-100,"reasons":["2-4 very short plain-English sentences"],"patternSlug":"required unless rejected"}',
    "Each reason must be under 16 words.",
    "For rejected, omit patternSlug, set confidence to at least 95, and explain why the input is not an AI automation task.",
  ].join("\n");
  const user = `TASK:\n${task}\n\nHEURISTIC PRE-ANALYSIS:\n${JSON.stringify(
    {
      verdict: base.verdict,
      confidence: base.confidence,
      patternSlug: base.pattern.slug,
      signals: base.signals,
    },
    null,
    2,
  )}`;

  let raw: unknown = null;

  // Provider A: Cloudflare Workers AI binding (env.AI).
  // This is the default production path for loops.guide.
  if (env.AI && typeof env.AI.run === "function") {
    try {
      const model = env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL;
      const out = await env.AI.run(model, {
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 512,
        temperature: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: buildResponseSchema(validSlugs),
        },
      });
      raw = extractLLMResponse(out);
    } catch {
      raw = null;
    }
  }

  // Provider B: Anthropic API key
  if (!raw && env.ANTHROPIC_API_KEY) {
    try {
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
    } catch {
      raw = null;
    }
  }

  // Provider C: OpenAI API key
  if (!raw && env.OPENAI_API_KEY) {
    try {
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
    } catch {
      raw = null;
    }
  }

  if (!raw) return null;

  const parsed = parseLLMJson(raw);
  if (!parsed) return null;

  const allVerdicts = ["loop", "single", "chain", "borderline", "rejected"] as const;
  const verdict = allVerdicts.find((v) => v === parsed.verdict);
  if (!verdict) return null;

  const confidence =
    typeof parsed.confidence === "number" ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : base.confidence;
  const rawReasons = Array.isArray(parsed.reasons)
    ? (parsed.reasons as unknown[]).filter((r): r is string => typeof r === "string").slice(0, 4)
    : base.reasons;
  const reasons = cleanModelReasons(rawReasons, verdict, base);

  if (verdict === "rejected") {
    return {
      verdict: "rejected",
      confidence,
      reasons: reasons.length ? reasons : ["This does not appear to be an AI automation task."],
    };
  }

  const slug = validSlugs.includes(parsed.patternSlug) ? parsed.patternSlug : base.pattern.slug;
  const p = PATTERNS.find((x) => x.slug === slug)!;

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

function buildResponseSchema(patternSlugs: string[]) {
  return {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["loop", "single", "chain", "borderline", "rejected"],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      reasons: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: { type: "string" },
      },
      patternSlug: {
        type: "string",
        enum: patternSlugs,
      },
    },
    required: ["verdict", "confidence", "reasons"],
  };
}

function cleanModelReasons(reasons: string[], verdict: string, base: AnalyzeResult): string[] {
  const blocked = /\b(patternslug|pre-analysis|heuristic|signals?|deterministic|non-iterative|iterative process|llm|confidence|discrepancy|nuanced|classification|verdict|architecture)\b/i;
  const cleaned = reasons
    .map((reason) =>
      reason
        .replace(/\bruntime feedback\b/gi, "feedback from the result")
        .replace(/\bsingle prompt\b/gi, "one prompt")
        .replace(/\bAI automation task\b/gi, "task for an AI")
        .trim(),
    )
    .filter((reason) => reason.length >= 8 && reason.length <= 150)
    .filter((reason) => !blocked.test(reason))
    .filter((reason) => !/^\s*[-*]?\s*[a-zA-Z]+Slug\s*:/i.test(reason))
    .slice(0, 3);

  if (cleaned.length) return cleaned;

  switch (verdict) {
    case "loop":
      return ["The AI needs to try, check the result, and decide what to do next."];
    case "chain":
      return ["The steps are already known, so the AI can follow them in order."];
    case "single":
      return ["This looks like one clear job, so one good instruction should be enough."];
    case "borderline":
      return ["There is not enough clear detail to choose confidently yet."];
    case "rejected":
      return ["This does not look like work you want an AI to do."];
    default:
      return base.reasons.slice(0, 2);
  }
}

function extractLLMResponse(data: any): unknown {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (data.response !== undefined) return data.response;
  if (data.result?.response !== undefined) return data.result.response;
  if (data.text !== undefined) return data.text;
  return data;
}

function parseLLMJson(raw: unknown): any | null {
  if (!raw) return null;

  if (typeof raw === "object") {
    if ("verdict" in raw) return raw;

    const extracted = extractLLMResponse(raw);
    if (extracted !== raw) return parseLLMJson(extracted);
    return null;
  }

  if (typeof raw !== "string") return null;

  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}
