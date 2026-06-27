---
title: "Do you need a loop? A 5-question test"
description: "Five plain-English questions that help beginners decide whether an AI task needs a loop."
pubDate: 2026-06-26
tags: ["decision", "patterns"]
---

You do not need a technical framework to decide whether an AI task needs a loop.

You only need five questions.

If you answer yes to any of the questions below, a loop may help. If you answer no to all of them, start with one prompt or fixed steps.

## 1. Will the AI learn something useful after it tries?

This is the main question.

If the AI tries something and gets a useful result back, it should probably use that result before doing the next thing.

Examples:

- An error message appears.
- A customer reply comes in.
- A test passes or fails.
- A file changes.
- A reviewer says yes or no.

If nothing useful comes back, a loop is probably extra weight.

## 2. Does the AI need to check whether the work is good enough?

Some tasks need a check before they can be trusted.

Examples:

- The reply must actually answer the customer.
- The page must work after the change.
- The document must include all required sections.
- The task should stop only when a clear rule is true.

If the AI must check the result and revise it, use a [Retry Loop](/patterns/retry) or [Checker Loop](/patterns/verification).

## 3. Can the next step change based on what happened earlier?

Fixed steps are fine when the order never changes.

But if step 3 depends on what happened in step 2, the AI needs a loop. It has to look at the result before choosing the next move.

Use a [Plan and Check Loop](/patterns/plan-execute-verify) when the task has several parts and each part should be checked.

## 4. Is there a risky choice a person should approve?

Some tasks should pause before important actions.

Examples:

- spending money
- deleting data
- publishing publicly
- sending a sensitive message
- changing something customers depend on

In those cases, use a [Human Approval Loop](/patterns/human-in-the-loop). The AI can prepare the work, but a person approves the risky step.

## 5. Should this happen again and again?

Some tasks are not one-time tasks.

Examples:

- check new messages every morning
- watch for failed orders
- review new support tickets
- summarize new issues once a day

If the task wakes up on a schedule or after a new event, use a [Triggered Loop](/patterns/event-driven).

## Simple scoring

- **No yes answers:** use one prompt.
- **Only fixed known steps:** use fixed steps.
- **One or more yes answers:** use a loop.
- **Risky action involved:** use a loop with human approval.

The goal is not to make everything a loop. The goal is to choose the smallest setup that can do the job.

This is the same logic behind [Should I Loop?](/should-i-loop). Describe your task, and the tool turns it into a plain recommendation.
