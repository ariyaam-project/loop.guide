---
title: "One prompt, fixed steps, or a loop?"
description: "A beginner-friendly guide to choosing the simplest setup for an AI task."
pubDate: 2026-06-23
tags: ["fundamentals", "decision"]
---

Most AI tasks do not need a loop.

Some tasks only need one clear instruction. Some need a short list of steps. A loop is only worth it when the AI needs to learn something from the result of its own action.

That is the simple rule:

**If the AI has nothing new to react to after it acts, do not use a loop.**

## Use one prompt when the job has one clear answer

A prompt is the simplest setup.

You ask once. The AI answers once. Nothing needs to be checked afterward before the AI can continue.

Good examples:

- Rewrite this email in a friendlier tone.
- Translate this paragraph into French.
- Summarize this article.
- Turn these notes into bullet points.

The test is simple: after the AI answers, would another AI action reveal important new information?

If the answer is no, use one prompt.

## Use fixed steps when the order is already known

Fixed steps are useful when the work has a clear order.

The AI does step 1, then step 2, then step 3. The steps do not change based on surprise results.

Good examples:

- Read a form, summarize it, then send it to the right team.
- Extract names from a document, put them in a table, then write a short summary.
- Take meeting notes, group action items, then draft a follow-up email.

The test: can you write the steps before the AI starts?

If yes, and the steps will not change, use fixed steps.

## Use a loop when the AI must react to what happened

A loop means:

1. Try something.
2. Check what happened.
3. Use that result to decide the next move.
4. Stop when the goal is reached.

Good examples:

- Draft a reply, check whether it answers the customer, and revise if needed.
- Fix a broken page, check whether it works, and keep going until it does.
- Review new support messages every morning and flag the ones that need a person.
- Try a few versions of a response, compare them, and keep the best one.

The test: does acting produce information the AI should use next?

If yes, use a loop.

## The easiest decision table

| Task shape | Best setup |
|---|---|
| One clear answer | One prompt |
| A known list of steps | Fixed steps |
| Try, check, then decide what to do next | Loop |
| Risky choice or human judgment | Loop with human approval |

## When you are unsure

Start simple.

Use one prompt first. If the answer is good enough, stop there. If the AI needs to check something, react to an error, compare options, or ask a person before moving forward, upgrade to a loop.

A loop should earn its place. It costs more time, more attention, and usually more money. Use it when the task actually gives the AI something useful to react to.

Want a recommendation for your own task? [Try Should I Loop?](/should-i-loop)
