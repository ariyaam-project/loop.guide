---
title: "Do you need a loop? A 5-question test"
description: "Five yes/no questions that tell you whether your AI task needs an agent loop — and which loop pattern to reach for if it does."
pubDate: 2026-06-26
tags: ["decision", "patterns"]
---

You don't need a framework to decide whether a task needs a loop. You need five questions. Answer them honestly and the verdict is usually obvious.

## 1. Does the agent need to verify its own output?

If success means passing a test, matching a schema, or clearing a check the model can run, you need a loop — act, check, revise. A prompt can't confirm its own work.

→ Leans **loop**. Pattern: [Verification / Evaluator](/patterns/verification) or [Retry](/patterns/retry).

## 2. Is it multiple steps where later steps depend on earlier results?

If step 3 can't be planned until you see the output of step 2, that dependency needs observation between steps.

→ Leans **loop**. Pattern: [Plan → Execute → Verify](/patterns/plan-execute-verify). If the steps are fixed and nothing surprising happens between them, it's just a **chain**.

## 3. Is there real feedback to react to?

Errors, API responses, query results, file contents, browser state. If acting produces information the model should use, a single shot throws that information away.

→ Leans **loop**. Pattern: [Explore → Narrow](/patterns/explore-narrow) for unknowns; [Retry](/patterns/retry) for clear pass/fail.

## 4. Is it ambiguous or risky?

If requirements can't be fully specified up front, or an action is irreversible (deploys, payments, prod writes), you want iteration plus a human gate.

→ Leans **loop with a gate**. Pattern: [Human-in-the-Loop](/patterns/human-in-the-loop).

## 5. Should it run continuously or improve over time?

If it's triggered by events or a schedule, you want an [Event-Driven](/patterns/event-driven) loop. If it should get better across many runs from its own traces, you want a [Hill-Climbing](/patterns/hill-climbing) loop on top.

## Scoring

- **Zero yeses** → single prompt. Don't over-engineer it.
- **Yeses only on "fixed multiple steps"** → a chain, not a loop.
- **One or more yeses on verification, feedback, iteration, ambiguity, or scheduling** → a loop, and the questions above point you straight at the pattern.

This is exactly the logic behind the [Should I Loop?](/should-i-loop) tool — it reads these signals from your task description and returns the verdict plus the recommended pattern. [Try it on a real task.](/should-i-loop)
