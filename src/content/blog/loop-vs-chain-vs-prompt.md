---
title: "Loop vs chain vs prompt: which do you actually need?"
description: "A practical decision guide for choosing between a single prompt, a fixed chain, and an agent loop — with the exact signals that tip you from one to the next."
pubDate: 2026-06-23
tags: ["fundamentals", "decision"]
---

Most AI tasks don't need a loop. Some need nothing more than a good prompt. The skill is knowing where the line is, because the wrong choice either wastes tokens (a loop where a prompt would do) or fails silently (a prompt where you needed feedback).

Here's the practical breakdown.

## Single prompt

One shot in, one answer out. Use it when the task is a **deterministic transform with a single answer** and there's nothing to react to.

- Translate this paragraph.
- Summarize this document.
- Convert this JSON to a table.
- Classify this ticket.

If you can't imagine the model needing to "check its work" against anything external, you almost certainly want a single prompt.

## Chain

A fixed sequence: A → B → C. Use it for **multiple steps that are ordered and known in advance**, where each step's output feeds the next but nothing surprising happens between them.

- Extract entities → look each up → format the result.
- Transcribe audio → summarize → translate.

Chains are predictable and easy to trace. The tell: you can write the steps down up front and they won't change based on what the model sees.

## Loop

Act → observe → reason → repeat. Use it when there is **real feedback to react to, or genuine iteration**.

- Fix the failing tests and keep going until they pass. (verification + iteration)
- Debug this error — you don't know the cause yet. (exploration)
- Refactor this module without breaking anything. (multi-step + verify each step)
- Every morning, triage new issues and draft replies. (event-driven)

The tell: the right next action depends on a result the model can only get by *doing* something first.

## The signals that tip you toward a loop

You're in loop territory if any of these are true:

| Signal | Why it forces a loop |
|---|---|
| Needs to run/verify its own output | Must act → check → revise |
| Multi-step with dependencies | Later steps depend on observing earlier ones |
| Real external feedback (errors, data, API) | Wasted unless the agent reacts to it |
| Explicit iteration ("until it passes") | A loop by definition |
| Runs on a schedule or trigger | Event-driven loop, not a one-shot |
| Should improve over many runs | Needs an outer hill-climbing loop |

## When it's borderline

Signals conflict more often than you'd think. The rule: **start with the simplest thing that could work, and add a loop only when single-shot output demonstrably falls short.** A loop you didn't need is just a more expensive, slower, harder-to-debug prompt.

Want this decision made for you on a specific task? [Try the tool →](/should-i-loop)
