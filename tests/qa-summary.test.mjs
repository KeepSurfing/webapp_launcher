import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual TypeScript aggregation with an isolated snapshot.
const source = await fs.readFile(new URL("../app/data/qa.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, require: () => ({ schemaVersion: 1, collectedAt: "2026-10-14T00:00:00Z", projects: {} }) };
vm.runInNewContext(compiled, context);
const { summarizeQA } = context.exports;
const project = (lines, runs = []) => ({ suites: [], coverage: lines ? { metrics: { lines } } : null, runs });
const run = (values) => ({ passed: 0, failed: 0, flaky: 0, skipped: 0, todo: 0, cancelled: 0, expectedFailures: 0, errors: 0, ...values });

test("portfolio coverage is weighted by measured lines, excluding missing reports", () => {
  const summary = summarizeQA([
    project({ total: 10, covered: 10, pct: 100 }),
    project({ total: 90, covered: 0, pct: 0 }),
    project(null),
  ]);
  assert.equal(summary.coverage, 10);
  assert.equal(summary.coverageProjects, 2);
});
test("no coverage or no executed tests stays unknown rather than zero", () => {
  const summary = summarizeQA([project(null, [run({ skipped: 5, expectedFailures: 2 })])]);
  assert.equal(summary.coverage, null);
  assert.equal(summary.successRate, null);
  assert.equal(summary.executed, 0);
});
test("pass rate excludes skipped and expected failures, while retaining flaky and runtime errors", () => {
  const summary = summarizeQA([project(null, [run({ passed: 6, failed: 1, flaky: 1, skipped: 3, expectedFailures: 2, errors: 1, cancelled: 1 })])]);
  assert.equal(summary.executed, 8);
  assert.equal(summary.successRate, 87.5);
  assert.equal(summary.flaky, 1);
  assert.equal(summary.errors, 2);
});

test("missing reports alone request measurement, not new tests", () => {
  const qa = { available: true, revision: "cd331e11fe77f58d81ce21ad046e7ba55c8bd987", suites: [{ kind: "unit", tool: "Vitest", files: ["logic.test.ts"] }], coverage: null, runs: [] };
  assert.equal(context.exports.getQAAction(qa, "unknown-project").kind, "measure");
});
test("inspected projects with no test suites need tests; unavailable sources need inspection", () => {
  assert.equal(context.exports.getQAAction({ available: true, suites: [] }, "petsitter").kind, "add");
  assert.equal(context.exports.getQAAction({ available: false, suites: [] }, "petsitter").kind, "review");
});
test("known source gaps and partial line coverage request additional tests", () => {
  const qa = { available: true, revision: "cd331e11fe77f58d81ce21ad046e7ba55c8bd987", suites: [{ kind: "unit", files: ["logic.test.ts"] }], coverage: null, runs: [] };
  assert.equal(context.exports.getQAAction(qa, "rgpd-scan").kind, "complete");
  assert.ok(context.exports.getQAAction(qa, "rgpd-scan").steps.some(step => step.type === "measure"));
  const covered = { ...qa, coverage: { metrics: { lines: { total: 10, covered: 9, pct: 90 } } } };
  assert.equal(context.exports.getQAAction(covered, "unknown-project").kind, "complete");
});

test("source-specific recommendations do not persist as verified gaps after a revision change", () => {
  const qa = { available: true, revision: "a-new-source-revision", suites: [{ kind: "unit", files: ["unit.test.ts"] }], coverage: null, runs: [] };
  assert.equal(context.exports.getQAAction(qa, "rgpd-scan").kind, "measure");
});
