// Single source of truth for loop patterns.
// Used by both the /patterns pages AND the "Should I Loop?" recommendation engine.

export type PatternSlug =
  | "retry"
  | "plan-execute-verify"
  | "explore-narrow"
  | "human-in-the-loop"
  | "verification"
  | "event-driven"
  | "hill-climbing";

export interface Pattern {
  slug: PatternSlug;
  name: string;
  tagline: string;
  cost: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  whenToUse: string[];
  whenNotToUse: string[];
  anatomy: string[]; // ordered steps
  watchOuts: string[];
  starter: string[]; // checklist lines
}

export const PATTERNS: Pattern[] = [
  {
    slug: "retry",
    name: "Retry Loop",
    tagline: "Try, check, retry until it passes. The simplest loop.",
    cost: "low",
    risk: "low",
    whenToUse: [
      "Short, atomic tasks with a clear pass/fail check.",
      "Writing a function that must pass a given test.",
      "Generating output that must match a spec or schema.",
    ],
    whenNotToUse: [
      "Multi-step tasks where order and dependencies matter.",
      "When the same approach will fail the same way every time.",
    ],
    anatomy: ["Attempt", "Check pass/fail", "If fail → vary approach & retry", "Stop on success or max attempts"],
    watchOuts: [
      "Infinite retries with no strategy change. Vary the next attempt.",
      "Set a max-attempt ceiling and a hard stop.",
    ],
    starter: [
      "Goal: a single, checkable success condition.",
      "Tool: the checker (test runner / validator).",
      "Stop rule: success OR N attempts.",
      "On repeat failure: change strategy, don't repeat.",
    ],
  },
  {
    slug: "plan-execute-verify",
    name: "Plan → Execute → Verify Loop",
    tagline: "Make a plan, do a step, verify it, then proceed.",
    cost: "medium",
    risk: "medium",
    whenToUse: [
      "Multi-step tasks where early mistakes compound.",
      "Refactors, new features, multi-file changes.",
      "Anything where order matters.",
    ],
    whenNotToUse: [
      "Trivial one-shot transforms.",
      "When you can't verify a step before moving on.",
    ],
    anatomy: ["Generate a plan", "Execute one step", "Verify the step", "Revise plan if needed", "Next step / done"],
    watchOuts: [
      "Over-commitment to a bad plan. Revise it, don't push through.",
      "Verification that only checks 'it compiles', not 'it works'.",
    ],
    starter: [
      "Goal: broken into testable sub-steps.",
      "Tools: executor + per-step verifier.",
      "Stop rule: all steps verified OR plan invalidated.",
      "Allow re-planning when a step reveals the plan was wrong.",
    ],
  },
  {
    slug: "explore-narrow",
    name: "Explore → Narrow Loop",
    tagline: "Try several paths, then converge on the most promising.",
    cost: "high",
    risk: "medium",
    whenToUse: [
      "Debugging unknown errors.",
      "Exploring an unfamiliar API or codebase.",
      "Optimization where the right approach isn't known upfront.",
    ],
    whenNotToUse: [
      "When the path is already clear (just execute it).",
      "Tight token/compute budgets.",
    ],
    anatomy: ["Branch into candidate approaches", "Probe each cheaply", "Score intermediate results", "Prune & commit to the best"],
    watchOuts: [
      "Context explosion. Running many paths in parallel is expensive.",
      "Prune early and often.",
    ],
    starter: [
      "Goal: the question you're exploring.",
      "Tools: cheap probes for each candidate.",
      "Stop rule: one candidate clears the bar, or budget hit.",
      "Cap parallel branches; kill losers fast.",
    ],
  },
  {
    slug: "human-in-the-loop",
    name: "Human-in-the-Loop",
    tagline: "Run autonomously until judgment or a risky action is needed.",
    cost: "medium",
    risk: "low",
    whenToUse: [
      "Requirements can't be fully specified upfront.",
      "Irreversible or sensitive actions (payments, prod, DB writes).",
      "High cost of a wrong assumption.",
    ],
    whenNotToUse: [
      "Low-stakes, fully specifiable tasks (it just slows you down).",
    ],
    anatomy: ["Run", "Detect ambiguity / risky action", "Pause → ask human", "Resume with the decision"],
    watchOuts: [
      "Interrupting too often defeats the point.",
      "Gate on risk, not on every small choice.",
    ],
    starter: [
      "Goal + the explicit list of actions that require a human gate.",
      "Tools: the agent's actions, plus an approval step.",
      "Stop rule: complete, or escalate with full context.",
      "Make 'risky' an allowlist/denylist, not a vibe.",
    ],
  },
  {
    slug: "verification",
    name: "Verification / Evaluator Loop",
    tagline: "Wrap an agent in a grader that scores and sends feedback back.",
    cost: "high",
    risk: "low",
    whenToUse: [
      "Quality and consistency matter more than latency.",
      "Output can be scored against a rubric (deterministically or LLM-as-judge).",
      "Production workflows that can't afford silent errors.",
    ],
    whenNotToUse: [
      "Throwaway / exploratory work where speed wins.",
    ],
    anatomy: ["Agent produces output", "Grader scores vs rubric", "If fail → return with feedback", "Retry until pass or budget"],
    watchOuts: [
      "Adds latency and cost per run. Worth it when quality matters.",
      "A weak rubric gives false confidence.",
    ],
    starter: [
      "Goal + an explicit rubric of what 'good' means.",
      "Tools: the agent + a grader (tests or judge).",
      "Stop rule: rubric passes OR max grading rounds.",
      "Log grader feedback to improve the rubric over time.",
    ],
  },
  {
    slug: "event-driven",
    name: "Event-Driven Loop",
    tagline: "An event fires, the agent runs, a real system updates.",
    cost: "medium",
    risk: "medium",
    whenToUse: [
      "Work that should happen continuously, not on-demand.",
      "Triggers: webhooks, schedules/cron, new items in a queue.",
      "Background automation embedded in your ecosystem.",
    ],
    whenNotToUse: [
      "One-off tasks you'll never repeat.",
    ],
    anatomy: ["Event/trigger fires", "Agent runs (often wrapping inner loops)", "Update the real system", "Wait for next event"],
    watchOuts: [
      "Unattended runs make unattended mistakes. Add gates.",
      "Idempotency: handle duplicate/late events.",
    ],
    starter: [
      "Goal + the trigger that should start it.",
      "Tools: trigger infra (cron/webhook) + the agent.",
      "Stop rule: per-run completion + safety denylist.",
      "Start report-only; promote to auto-fix later.",
    ],
  },
  {
    slug: "hill-climbing",
    name: "Hill-Climbing Loop",
    tagline: "Analyze run traces and improve the harness itself.",
    cost: "high",
    risk: "medium",
    whenToUse: [
      "You run an agent often and want it to get better over time.",
      "You have traces/evals to learn from.",
      "Automating improvement, not just work.",
    ],
    whenNotToUse: [
      "Early prototyping with no signal yet.",
    ],
    anatomy: ["Collect traces from runs", "Analysis agent finds issues", "Rewrite prompts/tools/graders", "Redeploy & measure"],
    watchOuts: [
      "Route harness changes through human review before deploy.",
      "Needs observability first. No traces, no climbing.",
    ],
    starter: [
      "Goal: a metric the harness should improve.",
      "Tools: tracing + an analysis agent.",
      "Stop rule: metric plateau or human reject.",
      "Version the harness; you can roll back.",
    ],
  },
];

export const PATTERN_MAP: Record<PatternSlug, Pattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.slug, p]),
) as Record<PatternSlug, Pattern>;

export function getPattern(slug: PatternSlug): Pattern {
  return PATTERN_MAP[slug];
}
