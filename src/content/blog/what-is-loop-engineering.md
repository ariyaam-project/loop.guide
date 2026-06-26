---
title: "What is loop engineering?"
description: "Loop engineering is the practice of designing the systems that prompt and orchestrate AI agents — act, observe, reason, repeat — instead of hand-prompting them one message at a time."
pubDate: 2026-06-20
updatedDate: 2026-06-27
tags: ["fundamentals", "definitions"]
---

**Loop engineering is the practice of designing, operating, and improving the feedback loops that let an AI agent do real work — act, observe the result, reason about it, and repeat until a goal is met.** The shift is in where you add value: instead of typing each next instruction by hand, you design the system that prompts the agent for you.

The term crystallized in June 2026. As Boris Cherny, who leads Claude Code at Anthropic, put it: "I don't prompt Claude anymore. I have loops running that prompt Claude and figure out what to do. My job is to write loops." Addy Osmani and Peter Steinberger framed the same move: stop prompting agents, start designing the loops that prompt them.

## Why a loop, not a prompt

Real work is rarely solved in one shot. Code has hidden constraints, flaky tests, and legacy conventions. A single generated answer can't catch a runtime error or confirm that what it produced actually works. A loop closes that gap: the agent takes an action, sees a real result, and decides what to do next.

This traces back to the **ReAct pattern** (Reason + Act) from research at Princeton and Google: interleave reasoning with action. Think, act, observe, think again.

## Loop vs chain vs prompt

A **prompt** is one shot in, one answer out. A **chain** is linear — step A leads to B leads to C, fixed and predictable. A **loop** is dynamic: the agent can retry, revise its approach, and only move on once feedback says it's done. The quality difference between agents usually comes down to loop design, not the base model.

## What a good loop needs

Five things make a loop work rather than spin:

1. **A clear goal with a testable stop condition** — "all unit tests pass," not "make it better."
2. **Tools to act and observe** — code execution, file access, a shell, test runners.
3. **Context management** — summarize prior iterations so you don't overflow the window or repeat failed attempts.
4. **Termination logic** — success exits, failure exits ("after N iterations with no progress, escalate"), and tool-call budgets.
5. **Error handling that adapts** — distinguish recoverable errors from hard blockers; never re-run the same failed approach.

## Stacking loops

The most useful mental model stacks four levels: the **agent loop** (call tools until done), wrapped in a **verification loop** (grade output, send feedback back), embedded in an **event-driven loop** (a webhook or schedule triggers it), improved by a **hill-climbing loop** (analyze run traces and rewrite the harness itself). The first three automate work; the fourth automates improvement.

## The honest caveat

Loop engineering amplifies judgment — good and bad. Token costs explode with long-running, sub-agent-heavy loops. Verification is still on you: unattended loops make unattended mistakes. As Osmani warns, build the loop like someone who intends to stay the engineer, not just the person who presses go.

Not sure whether your task even needs a loop? [Run it through the tool.](/should-i-loop)
