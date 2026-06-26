// Heuristic "Should I Loop?" classifier.
// Pure, dependency-free, deterministic — the always-on Layer 1 of the agent.
// (Layer 2 LLM refinement lives in the API route and builds on this output.)

import type { PatternSlug } from "./patterns";
import { getPattern } from "./patterns";

export type Verdict = "loop" | "single" | "chain" | "borderline";

export interface Signals {
  /** multiple steps where later steps depend on earlier results */
  multiStep: boolean;
  /** needs to run/verify its own output (tests, checks, schema) */
  needsVerification: boolean;
  /** real feedback exists to react to (errors, API/data, files) */
  externalFeedback: boolean;
  /** one deterministic transform / single answer */
  deterministicSingle: boolean;
  /** ambiguous or needs human judgment / approval */
  ambiguity: boolean;
  /** explicit iteration: until / repeat / refine */
  iteration: boolean;
  /** runs on a schedule or in response to events */
  scheduled: boolean;
  /** irreversible / sensitive action */
  risky: boolean;
  /** wants to improve over repeated runs */
  improvement: boolean;
}

export interface AnalyzeInput {
  task: string;
  /** explicit toggles from the UI; when set they override detection */
  signals?: Partial<Record<keyof Signals, boolean>>;
}

export interface AnalyzeResult {
  verdict: Verdict;
  confidence: number; // 0..100
  reasons: string[];
  pattern: {
    slug: PatternSlug;
    name: string;
    tagline: string;
    href: string;
  };
  checklist: string[];
  signals: Signals;
  source: "heuristic" | "llm";
}

const has = (text: string, words: string[]): boolean => {
  return words.some((w) => {
    const re = new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    return re.test(text);
  });
};

function detect(task: string): Signals {
  const t = ` ${task.toLowerCase()} `;
  const wordCount = task.trim().split(/\s+/).filter(Boolean).length;

  const multiStep =
    has(t, ["then", "after that", "next", "first", "finally", "step", "steps", "pipeline", "stages", "multi-step", "several", "sequence", "workflow"]);

  const needsVerification =
    has(t, ["test", "tests", "verify", "validate", "validation", "check", "checks", "lint", "compile", "ensure", "correct", "pass", "assert", "rubric", "quality", "review the output"]);

  // Deliberately narrow: only words that imply reacting to a real result,
  // not generic nouns like "api" or "data" that appear in plain descriptions.
  const externalFeedback =
    has(t, ["error", "errors", "stack trace", "stdout", "stderr", "exception", "run the code", "run it", "execute", "fetch", "scrape", "logs", "test output", "feedback", "observe", "the response", "query result"]);

  const deterministicSingle =
    wordCount < 30 &&
    has(t, ["translate", "summarize", "summarise", "format", "convert", "rewrite", "classify", "extract", "answer", "define", "explain", "list", "generate a", "write a sentence", "draft", "paraphrase", "rephrase"]) &&
    !has(t, ["until", "repeat", "iterate", "test", "verify", "run", "every", "schedule"]);

  const ambiguity =
    has(t, ["maybe", "unclear", "not sure", "decide", "judgment", "judgement", "approve", "approval", "sensitive", "production", "deploy", "review", "ambiguous", "depends", "human", "taste", "subjective"]);

  const iteration =
    has(t, ["until", "repeat", "iterate", "iteratively", "retry", "refine", "keep going", "keep trying", "loop", "again and again", "improve it until"]);

  const scheduled =
    has(t, ["every", "daily", "hourly", "weekly", "schedule", "scheduled", "cron", "whenever", "when a", "on push", "on merge", "monitor", "watch", "trigger", "webhook", "continuously", "in the background"]);

  const risky =
    has(t, ["deploy", "production", "payment", "pay", "charge", "delete", "drop table", "migrate", "money", "transfer", "send email", "send emails", "irreversible", "prod"]);

  const improvement =
    has(t, ["improve over time", "learn from", "get better", "optimize the", "self-improve", "traces", "tune", "over many runs", "over time"]);

  return { multiStep, needsVerification, externalFeedback, deterministicSingle, ambiguity, iteration, scheduled, risky, improvement };
}

function pickPattern(s: Signals): PatternSlug {
  if (s.improvement) return "hill-climbing";
  if (s.scheduled) return "event-driven";
  if (s.risky || (s.ambiguity && !s.needsVerification)) return "human-in-the-loop";
  if (s.needsVerification && (s.multiStep || s.externalFeedback)) return "verification";
  if (s.multiStep) return "plan-execute-verify";
  if (s.externalFeedback && (s.ambiguity || !s.needsVerification)) return "explore-narrow";
  if (s.needsVerification || s.iteration || s.externalFeedback) return "retry";
  return "retry";
}

export function analyze(input: AnalyzeInput): AnalyzeResult {
  const detected = detect(input.task || "");
  // explicit UI toggles override detection where provided
  const signals: Signals = { ...detected };
  if (input.signals) {
    for (const k of Object.keys(input.signals) as (keyof Signals)[]) {
      const v = input.signals[k];
      if (typeof v === "boolean") signals[k] = v;
    }
  }

  // Score how loop-y the task is.
  let loop = 0;
  const reasons: string[] = [];

  if (signals.iteration) { loop += 2.5; reasons.push("You describe iterating/repeating until something is right — that's a loop by definition."); }
  if (signals.needsVerification) { loop += 2; reasons.push("The output needs to be verified (tests/checks), so the agent should act → check → revise."); }
  if (signals.externalFeedback) { loop += 1.5; reasons.push("There's real feedback to react to (errors, data, API/file results) — wasted unless the agent loops on it."); }
  if (signals.multiStep) { loop += 1.5; reasons.push("It's multi-step with dependencies, so later steps depend on observing earlier ones."); }
  if (signals.scheduled) { loop += 3; reasons.push("It runs on a schedule/trigger — an event-driven loop, not a one-shot call."); }
  if (signals.improvement) { loop += 1; reasons.push("You want it to improve over repeated runs — that needs an outer (hill-climbing) loop."); }
  if (signals.risky) { loop += 1; reasons.push("An irreversible/sensitive action is involved — run it in a loop with a human gate."); }
  if (signals.ambiguity) { loop += 0.5; reasons.push("Ambiguity/judgment is involved, which usually needs iteration and a human gate."); }

  let single = 0;
  if (signals.deterministicSingle) { single += 3; }
  if (!signals.multiStep && !signals.iteration && !signals.needsVerification && !signals.externalFeedback) { single += 1.5; }

  // Decide verdict.
  let verdict: Verdict;
  if (single >= 3 && loop < 2) {
    verdict = "single";
    reasons.length = 0;
    reasons.push("This looks like one deterministic transform with a single answer.");
    reasons.push("No verification, iteration, or external feedback to react to — a single well-crafted prompt should do it.");
  } else if (signals.multiStep && loop < 3.5 && !signals.iteration && !signals.needsVerification && !signals.externalFeedback) {
    verdict = "chain";
    reasons.length = 0;
    reasons.push("It's multiple steps, but they're fixed and ordered with nothing to react to.");
    reasons.push("A linear chain (A → B → C) is simpler and more predictable than a loop here.");
  } else if (loop >= 3) {
    verdict = "loop";
  } else if (loop >= 1.5) {
    verdict = "borderline";
    reasons.unshift("Signals are mixed — a loop helps but isn't clearly required. Start simple and add a loop only if single-shot output falls short.");
  } else {
    verdict = "single";
    if (reasons.length === 0) {
      reasons.push("No strong signals for iteration, verification, or feedback were detected — try a single prompt first.");
    }
  }

  // Confidence from signal strength / agreement.
  const spread = Math.abs(loop - single);
  let confidence = Math.round(Math.min(95, 45 + spread * 11 + reasons.length * 2));
  if (verdict === "borderline") confidence = Math.min(confidence, 58);
  if (!input.task || input.task.trim().length < 8) confidence = Math.min(confidence, 40);

  const slug = pickPattern(signals);
  const p = getPattern(slug);

  return {
    verdict,
    confidence,
    reasons: reasons.slice(0, 4),
    pattern: { slug, name: p.name, tagline: p.tagline, href: `/patterns/${slug}` },
    checklist: p.starter,
    signals,
    source: "heuristic",
  };
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  loop: "LOOP",
  single: "SINGLE PROMPT",
  chain: "CHAIN",
  borderline: "BORDERLINE",
};
