import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/pages/api/should-i-loop.ts";

function postContext(task, env) {
  return {
    request: new Request("https://loops.guide/api/should-i-loop", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task }),
    }),
    locals: { runtime: { env } },
  };
}

test("Should I Loop? uses Workers AI with the classifier prompt", async () => {
  let call;
  const env = {
    AI: {
      async run(model, input) {
        call = { model, input };
        return {
          response: {
            verdict: "loop",
            confidence: 93,
            reasons: [
              "The heuristic pre-analysis signals a deterministic discrepancy.",
              "patternSlug: retry",
            ],
            patternSlug: "retry",
          },
        };
      },
    },
  };

  const response = await POST(postContext("Fix tests and keep iterating until they pass.", env));
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.source, "llm");
  assert.equal(data.verdict, "loop");
  assert.equal(data.pattern.slug, "retry");
  assert.equal(data.reasons.length, 1);
  assert.doesNotMatch(data.reasons.join(" "), /patternSlug|heuristic|signals|deterministic/i);
  assert.equal(call.model, "@cf/openai/gpt-oss-20b");
  assert.equal(call.input.response_format.type, "json_schema");
  assert.match(call.input.messages[0].content, /Loop Advisor/);
  assert.match(call.input.messages[1].content, /WEBSITE FIRST GUESS/);
  assert.doesNotMatch(call.input.messages[1].content, /signals|HEURISTIC PRE-ANALYSIS/);
});

test("Should I Loop? falls back to the heuristic if Workers AI fails", async () => {
  const env = {
    AI: {
      async run() {
        throw new Error("Workers AI unavailable");
      },
    },
  };

  const response = await POST(postContext("Translate this paragraph into French.", env));
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.source, "heuristic");
  assert.equal(data.verdict, "single");
});
