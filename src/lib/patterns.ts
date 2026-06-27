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
    tagline: "Let the AI try, check if it worked, and try again if it did not.",
    cost: "low",
    risk: "low",
    whenToUse: [
      "A small task with a clear yes/no check.",
      "A task where the AI can tell if the answer worked.",
      "A task that should stop after a few tries.",
    ],
    whenNotToUse: [
      "A long task with many parts.",
      "A task where trying the same idea again will not help.",
    ],
    anatomy: ["Try once", "Check the result", "Try a different fix if it failed", "Stop when it works or after a limit"],
    watchOuts: [
      "Do not let it try forever.",
      "Make each new try different from the last one.",
    ],
    starter: [
      "Write what counts as success.",
      "Choose how the AI will check the result.",
      "Set a maximum number of tries.",
      "If it fails twice the same way, change the approach.",
    ],
  },
  {
    slug: "plan-execute-verify",
    name: "Plan and Check Loop",
    tagline: "Make a plan, do one step, check it, then continue.",
    cost: "medium",
    risk: "medium",
    whenToUse: [
      "A task with several steps.",
      "A task where an early mistake can affect later steps.",
      "A task where the AI should check each step before moving on.",
    ],
    whenNotToUse: [
      "A simple one-answer task.",
      "A task where there is no way to check each step.",
    ],
    anatomy: ["Make a short plan", "Do one step", "Check that step", "Fix the plan if needed", "Move to the next step"],
    watchOuts: [
      "Do not keep following a bad plan.",
      "Make sure the check proves the step really worked.",
    ],
    starter: [
      "Break the goal into small steps.",
      "Choose how each step will be checked.",
      "Stop when every step is checked.",
      "Allow the plan to change when new information appears.",
    ],
  },
  {
    slug: "explore-narrow",
    name: "Try Options Loop",
    tagline: "Try a few possible answers, compare them, and keep the best one.",
    cost: "high",
    risk: "medium",
    whenToUse: [
      "You do not know the best answer yet.",
      "There are several possible ways to solve the task.",
      "You want the AI to test small options before committing.",
    ],
    whenNotToUse: [
      "The path is already clear.",
      "You need the cheapest or fastest possible run.",
    ],
    anatomy: ["List a few options", "Try each one cheaply", "Compare the results", "Keep the best option"],
    watchOuts: [
      "Too many options can get expensive.",
      "Drop weak options early.",
    ],
    starter: [
      "Write the question you are trying to answer.",
      "Limit the number of options.",
      "Choose a simple way to compare them.",
      "Stop when one option is clearly good enough.",
    ],
  },
  {
    slug: "human-in-the-loop",
    name: "Human Approval Loop",
    tagline: "Let the AI work, but ask a person before important or risky steps.",
    cost: "medium",
    risk: "low",
    whenToUse: [
      "A person needs to approve part of the work.",
      "The task includes money, private data, deletion, or publishing.",
      "A wrong guess would be costly.",
    ],
    whenNotToUse: [
      "Low-risk tasks where the AI can safely finish on its own.",
    ],
    anatomy: ["Start the work", "Notice a risky choice", "Pause and ask a person", "Continue with the decision"],
    watchOuts: [
      "Do not ask for approval on every tiny choice.",
      "Be clear about which actions need a person.",
    ],
    starter: [
      "List the actions that need approval.",
      "Tell the AI what it can do without asking.",
      "Tell the AI what must wait for a person.",
      "Include enough context when it asks for help.",
    ],
  },
  {
    slug: "verification",
    name: "Checker Loop",
    tagline: "Use a separate check to decide whether the AI's work is good enough.",
    cost: "high",
    risk: "low",
    whenToUse: [
      "Quality matters more than speed.",
      "You can describe what a good answer looks like.",
      "You need a second check before accepting the result.",
    ],
    whenNotToUse: [
      "Quick throwaway work where speed matters more than quality.",
    ],
    anatomy: ["AI makes the first answer", "A checker reviews it", "Send it back if it fails", "Stop when it passes or hits a limit"],
    watchOuts: [
      "This costs more because every answer is checked.",
      "A weak checklist gives weak results.",
    ],
    starter: [
      "Write a simple checklist for a good answer.",
      "Choose who or what will check the answer.",
      "Set a limit on how many times it can retry.",
      "Save failed checks so the checklist can improve.",
    ],
  },
  {
    slug: "event-driven",
    name: "Triggered Loop",
    tagline: "Start the AI when something happens, like a new issue or a daily schedule.",
    cost: "medium",
    risk: "medium",
    whenToUse: [
      "Work that should happen again and again.",
      "Tasks that start from a schedule or a new item.",
      "Background work you do not want to start by hand each time.",
    ],
    whenNotToUse: [
      "One-time tasks you will not repeat.",
    ],
    anatomy: ["Something starts the loop", "The AI does the work", "Save or send the result", "Wait for the next trigger"],
    watchOuts: [
      "Unwatched work can make unwatched mistakes.",
      "Plan for duplicate or late events.",
    ],
    starter: [
      "Choose what starts the loop.",
      "Choose what the AI is allowed to do.",
      "Decide what counts as done for each run.",
      "Start with reports before allowing changes.",
    ],
  },
  {
    slug: "hill-climbing",
    name: "Improve Over Time Loop",
    tagline: "Use past runs to make the whole AI setup better.",
    cost: "high",
    risk: "medium",
    whenToUse: [
      "You run the same AI workflow often.",
      "You can save what happened in past runs.",
      "You want the system to improve, not just finish one task.",
    ],
    whenNotToUse: [
      "Early experiments where you do not have enough history yet.",
    ],
    anatomy: ["Save what happened", "Look for repeated problems", "Improve the instructions or checks", "Measure whether it got better"],
    watchOuts: [
      "Ask a person to review changes before they go live.",
      "You need saved history before you can improve from it.",
    ],
    starter: [
      "Choose one thing to improve.",
      "Save what happened in each run.",
      "Review changes before using them.",
      "Keep old versions so you can roll back.",
    ],
  },
];

export const PATTERN_MAP: Record<PatternSlug, Pattern> = Object.fromEntries(
  PATTERNS.map((p) => [p.slug, p]),
) as Record<PatternSlug, Pattern>;

export function getPattern(slug: PatternSlug): Pattern {
  return PATTERN_MAP[slug];
}
