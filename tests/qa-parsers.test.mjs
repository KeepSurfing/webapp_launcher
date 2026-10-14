import test from "node:test";
import assert from "node:assert/strict";
import { parseCoverage, parseRun } from "../scripts/qa-parsers.mjs";

test("missing coverage stays unknown; zero-covered lines remain zero", () => {
  const result = parseCoverage({ total: { lines: { total: 10, covered: 0, pct: 0 }, branches: { total: 0, covered: 0, pct: 100 } } });
  assert.equal(result.lines.pct, 0);
  assert.equal(result.branches.pct, null);
  assert.equal(result.functions, null);
});
test("coverage uses actual denominators and rejects impossible counts", () => {
  const result = parseCoverage({ total: { lines: { total: 3, covered: 2 }, branches: { total: 1, covered: 2 } } });
  assert.equal(result.lines.pct, 66.7);
  assert.equal(result.branches, null);
});
test("Playwright separates passed, flaky, skipped and expected failures", () => {
  const report = { stats: { expected: 2, unexpected: 1, flaky: 1, skipped: 1, duration: 2000, startTime: "2026-10-14T09:00:00Z" },
    suites: [{ specs: [], suites: [{ specs: [{ tests: [
      { status: "expected", expectedStatus: "passed", projectName: "desktop" },
      { status: "expected", expectedStatus: "failed", projectName: "desktop" },
      { status: "unexpected", projectName: "desktop" },
      { status: "flaky", projectName: "mobile" }, { status: "skipped", projectName: "mobile" }
    ] }] }] }] };
  const result = parseRun(report, "playwright");
  assert.equal(result.total, 5); assert.equal(result.passed, 1); assert.equal(result.expectedFailures, 1);
  assert.equal(result.failed, 1); assert.equal(result.flaky, 1); assert.equal(result.skipped, 1);
  assert.deepEqual(result.environments, ["desktop", "mobile"]);
});
test("Playwright failure-only output cannot claim an overall pass rate", () => {
  assert.throws(() => parseRun({ stats: { expected: 10, unexpected: 1, flaky: 0, skipped: 0 }, suites: [] }, "playwright"), /incomplet/);
});
test("Vitest retains failed tests and runtime errors", () => {
  const result = parseRun({ numTotalTests: 10, numPassedTests: 6, numFailedTests: 1,
    numPendingTests: 2, numTodoTests: 1, numRuntimeErrorTestSuites: 1, startTime: 1000,
    testResults: [{ endTime: 3000 }] }, "vitest");
  assert.equal(result.total, 10); assert.equal(result.failed, 1); assert.equal(result.errors, 1); assert.equal(result.durationMs, 2000);
});
test("malformed Vitest totals do not enter the dashboard", () => {
  assert.throws(() => parseRun({ numTotalTests: 10, numPassedTests: 12, numFailedTests: 0, numPendingTests: 0 }, "vitest"), /incohérent/);
});
test("Node TAP uses the final summary and accounts for interruptions", () => {
  const result = parseRun("# tests 4\r\n# pass 2\r\n# fail 0\r\n# skipped 1\r\n# cancelled 1\r\n# todo 0\r\n# duration_ms 300\r\n", "node-tap");
  assert.equal(result.passed, 2); assert.equal(result.cancelled, 1); assert.equal(result.durationMs, 300);
});
test("truncated Node output is not a successful test report", () => {
  assert.throws(() => parseRun("ok 1 - a test\n", "node-tap"), /incomplet/);
});

test("pytest counts preserve skipped PostGIS tests without reporting them as passed", () => {
  const result = parseRun({created:1700000000,duration:2,summary:{total:121,passed:78,skipped:43}},"pytest-json");
  assert.equal(result.passed,78);assert.equal(result.skipped,43);assert.equal(result.total,121);
  assert.throws(()=>parseRun({summary:{total:5,passed:6}},"pytest-json"));
});

test("CI Playwright summaries retain executed and ignored counts and reject incomplete totals",()=>{
 const report={total:6,passed:3,failed:1,skipped:1,flaky:1,measuredAt:"2026-10-14T16:47:58Z",environments:["chromium"]};
 const parsed=parseRun(report,"playwright-summary");
 assert.equal(parsed.passed,3);assert.equal(parsed.flaky,1);assert.equal(parsed.skipped,1);assert.equal(parsed.durationMs,null);
 assert.equal(parseRun({...report,durationMs:500},"playwright-summary").durationMs,500);
 assert.equal(parseRun({...report,durationMs:-1},"playwright-summary").durationMs,null);
 assert.throws(()=>parseRun({...report,total:7},"playwright-summary"));
 assert.throws(()=>parseRun({total:6},"playwright-summary"));
});
