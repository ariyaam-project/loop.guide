// Smoke tests for the heuristic classifier.
// Run: npm run test:classifier   (Node 18+, no deps)
//
// NOTE: imports the compiled-by-Node TS-free logic by re-implementing the import
// path through a tiny loader is overkill; instead we test via the public shape.
// Since the source is .ts, run these after `npm run build` OR use tsx:
//   npx tsx --test test/classifier.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../src/lib/classifier.ts";

test("single deterministic transform → single", () => {
  const r = analyze({ task: "Translate this paragraph into French." });
  assert.equal(r.verdict, "single");
});

test("iterate until tests pass → loop", () => {
  const r = analyze({ task: "Fix the failing tests in this repo and keep iterating until they all pass." });
  assert.equal(r.verdict, "loop");
});

test("fixed ordered steps → chain", () => {
  const r = analyze({ task: "First scaffold the API, then add auth, then write the README, in order." });
  assert.equal(r.verdict, "chain");
});

test("scheduled work → event-driven pattern", () => {
  const r = analyze({ task: "Every morning, triage new issues and draft a summary." });
  assert.equal(r.pattern.slug, "event-driven");
});

test("risky/ambiguous → human-in-the-loop", () => {
  const r = analyze({ task: "Decide whether to deploy to production and approve the release." });
  assert.equal(r.pattern.slug, "human-in-the-loop");
});

test("explicit toggle overrides detection", () => {
  const r = analyze({ task: "do a thing", signals: { needsVerification: true, externalFeedback: true, iteration: true } });
  assert.equal(r.verdict, "loop");
});

test("confidence is bounded 0..100", () => {
  const r = analyze({ task: "x" });
  assert.ok(r.confidence >= 0 && r.confidence <= 100);
});
