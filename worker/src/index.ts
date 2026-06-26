/**
 * Loop Engineering Classifier — Cloudflare Worker
 *
 * REST API: POST / { task, signals? }  →  AnalyzeResult (JSON)
 * Optional LLM layer: set OPENAI_API_KEY to enable GPT refinement.
 * Heuristic fallback always runs even when the LLM call fails.
 */

import { analyze, type AnalyzeResult } from "../../src/lib/classifier";
import { PATTERNS } from "../../src/lib/patterns";
import type { PatternSlug } from "../../src/lib/patterns";

export interface Env {
  OPENAI_API_KEY?: string;
  /** Override the model. Defaults to gpt-4o-mini. */
  OPENAI_MODEL?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });

// ── worker entry ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // ── GET: health check / quick classify via query param ───────────────────
    if (request.method === "GET") {
      const task = url.searchParams.get("task") ?? "";
      if (!task) {
        return json({
          name: "Loop Engineering Classifier",
          version: "1.0.0",
          description:
            "Classifies whether a problem benefits from loop engineering — " +
            "the agentic pattern of designing a system that prompts an agent " +
            "in a verified, repeating cycle.",
          llm: env.OPENAI_API_KEY ? `openai/${env.OPENAI_MODEL ?? "gpt-4o-mini"}` : "heuristic-only",
          usage: {
            classify: "POST / with body { task: string, signals?: object }",
            quickTest: "GET /?task=<url-encoded description>",
          },
          verdicts: {
            loop: "Task needs an act-observe-revise cycle.",
            chain: "Fixed linear steps — A → B → C, nothing to react to.",
            single: "One well-crafted prompt is enough.",
            borderline: "Mixed signals — start simple, add a loop if needed.",
          },
        });
      }

      if (task.length > 4000) return json({ error: "Task too long (max 4000 chars)." }, 400);
      return json(analyze({ task }));
    }

    // ── POST: full classify (heuristic + optional LLM refinement) ────────────
    if (request.method !== "POST") {
      return json({ error: "Method not allowed. Use POST / or GET /?task=..." }, 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }

    if (!body || typeof body !== "object") {
      return json({ error: "Request body must be a JSON object." }, 400);
    }

    const { task, signals } = body as Record<string, unknown>;

    if (typeof task !== "string" || !task.trim()) {
      return json({ error: "task is required and must be a non-empty string." }, 400);
    }
    if (task.length > 4000) {
      return json({ error: "task is too long (max 4000 chars)." }, 400);
    }

    const parsedSignals =
      signals && typeof signals === "object" && !Array.isArray(signals)
        ? (signals as Record<string, unknown>)
        : undefined;

    // Layer 1 — heuristic (always runs, zero cost)
    const base = analyze({ task, signals: parsedSignals as any });

    // Layer 2 — OpenAI refinement (optional, falls back silently)
    if (env.OPENAI_API_KEY) {
      try {
        const refined = await refineWithOpenAI(task, base, env);
        if (refined) return json(refined);
      } catch {
        // fall through — heuristic result is still valid
      }
    }

    return json(base);
  },
};

// ── OpenAI LLM refinement ─────────────────────────────────────────────────────

async function refineWithOpenAI(
  task: string,
  base: AnalyzeResult,
  env: Env,
): Promise<AnalyzeResult | null> {
  const model = env.OPENAI_MODEL ?? "gpt-4o-mini";
  const validSlugs = PATTERNS.map((p) => p.slug);

  const systemPrompt =
    "You are a loop-engineering advisor. Loop engineering is the agentic pattern of " +
    "designing a system that prompts an agent in a verified, repeating cycle, instead of prompting it manually. " +
    "Given a task and a heuristic pre-analysis, decide whether the task benefits from a loop. " +
    "Respond with a JSON object with exactly these keys: verdict, confidence, reasons, patternSlug. " +
    'verdict must be one of: "loop" | "single" | "chain" | "borderline". ' +
    "confidence is an integer 0–100. " +
    "reasons is an array of 2–4 short plain-English sentences explaining your verdict. " +
    `patternSlug must be one of: ${validSlugs.join(", ")}. ` +
    "Verdict meanings: " +
    "'single' — one well-crafted prompt solves it, no iteration needed. " +
    "'chain' — fixed linear steps (A→B→C) with no feedback loop. " +
    "'loop' — the agent must act, observe a real result, and revise repeatedly. " +
    "'borderline' — signals are genuinely mixed; advise starting simple. " +
    "Be decisive. Only use 'borderline' when the case is truly ambiguous.";

  const userMessage =
    `TASK:\n${task}\n\n` +
    `HEURISTIC PRE-ANALYSIS:\n${JSON.stringify(
      {
        verdict: base.verdict,
        confidence: base.confidence,
        patternSlug: base.pattern.slug,
        signals: base.signals,
      },
      null,
      2,
    )}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 512,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as OpenAIResponse;
  const raw = data?.choices?.[0]?.message?.content ?? null;
  if (!raw) return null;

  const parsed = safeParseJson(raw);
  if (!parsed) return null;

  const rawVerdict = typeof parsed.verdict === "string" ? parsed.verdict : "";
  const verdict: AnalyzeResult["verdict"] =
    rawVerdict === "loop" || rawVerdict === "single" || rawVerdict === "chain" || rawVerdict === "borderline"
      ? rawVerdict
      : base.verdict;

  const rawSlug = typeof parsed.patternSlug === "string" ? parsed.patternSlug : "";
  const slug: PatternSlug = (validSlugs as string[]).includes(rawSlug)
    ? (rawSlug as PatternSlug)
    : base.pattern.slug;

  const p = PATTERNS.find((x) => x.slug === slug)!;

  const reasons = Array.isArray(parsed.reasons)
    ? (parsed.reasons as unknown[]).filter((r): r is string => typeof r === "string").slice(0, 4)
    : base.reasons;

  const confidence =
    typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(100, Math.round(parsed.confidence)))
      : base.confidence;

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

// ── helpers ───────────────────────────────────────────────────────────────────

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// ── OpenAI response type (minimal) ────────────────────────────────────────────

interface OpenAIResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}
