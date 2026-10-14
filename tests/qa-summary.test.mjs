import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual TypeScript aggregation with an isolated snapshot.
const source = await fs.readFile(new URL("../app/data/qa.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
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
  const qa = { available: true, revision: "defece5d67ceda8e36f1d5679c999e87be80900a", suites: [{ kind: "unit", tool: "Vitest", files: ["logic.test.ts"] }], coverage: null, runs: [] };
  assert.equal(context.exports.getQAAction(qa, "unknown-project").kind, "measure");
});
test("inspected projects with no test suites need tests; unavailable sources need inspection", () => {
  assert.equal(context.exports.getQAAction({ available: true, suites: [] }, "petsitter").kind, "add");
  assert.equal(context.exports.getQAAction({ available: false, suites: [] }, "petsitter").kind, "review");
});
test("known source gaps and partial line coverage request additional tests", () => {
  const qa = { available: true, revision: "defece5d67ceda8e36f1d5679c999e87be80900a", suites: [{ kind: "unit", files: ["logic.test.ts"] }], coverage: null, runs: [] };
  assert.equal(context.exports.getQAAction(qa, "rgpd-scan").kind, "complete");
  assert.ok(context.exports.getQAAction(qa, "rgpd-scan").steps.some(step => step.type === "test"));
  const covered = { ...qa, coverage: { metrics: { lines: { total: 10, covered: 9, pct: 90 } } } };
  assert.equal(context.exports.getQAAction(covered, "unknown-project").kind, "complete");
});

test("source-specific recommendations do not persist as verified gaps after a revision change", () => {
  const qa = { available: true, revision: "a-new-source-revision", suites: [{ kind: "unit", files: ["unit.test.ts"] }], coverage: null, runs: [] };
  assert.equal(context.exports.getQAAction(qa, "rgpd-scan").kind, "measure");
});

test("technology counts use reports, exclude skipped tests and keep absent reports unknown", () => {
  const summarize = context.exports.summarizeTestTechnologies;
  const suites = (tool) => [{kind:"unit",tool,files:["test.ts"]}];
  const data = [
    {...project(null),suites:suites("Vitest"),runs:[run({format:"vitest",passed:5,failed:1,skipped:3})]},
    {...project(null),suites:suites("Vitest"),runs:[run({format:"vitest",passed:2})]},
    {...project(null),suites:suites("pytest"),runs:[]},
  ];
  assert.deepEqual(JSON.parse(JSON.stringify(summarize(data))),[
    {name:"Vitest",executed:8,projects:2,unmeasuredProjects:0},
    {name:"pytest",executed:null,projects:1,unmeasuredProjects:1},
  ]);
});
test("Node browser tests are attributed to Playwright without counting both runtimes", () => {
  const data = [{...project(null),suites:[{kind:"browser",tool:"Node.js + Playwright",files:["browser.test.ts"]}],runs:[run({kind:"browser",format:"node-tap",passed:11})]}];
  assert.deepEqual(JSON.parse(JSON.stringify(context.exports.summarizeTestTechnologies(data))),[{name:"Playwright",executed:11,projects:1,unmeasuredProjects:0}]);
});
