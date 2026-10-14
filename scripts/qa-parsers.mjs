// Normalize reporter output; never publish logs, attachments or test payloads.
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
export function parseCoverage(report) {
  if (!report?.total) throw new Error("Résumé de couverture manquant");
  const metrics = {};
  for (const key of ["lines", "branches", "functions", "statements"]) {
    const metric = report.total[key];
    if (count(metric?.total) === null || count(metric?.covered) === null || metric.covered > metric.total) {
      metrics[key] = null;
    } else {
      metrics[key] = { total: metric.total, covered: metric.covered,
        pct: metric.total ? Math.round(metric.covered / metric.total * 1000) / 10 : null };
    }
  }
  return metrics;
}
export function parseRun(report, format) {
  if (format === "node-tap") {
    const read = (key) => {
      const matches = [...report.matchAll(new RegExp("^# " + key + " ([0-9.]+)\\r?$", "gm"))];
      return matches.length ? Number(matches.at(-1)[1]) : null;
    };
    const total = read("tests"), passed = read("pass"), failed = read("fail"), skipped = read("skipped");
    const cancelled = read("cancelled") ?? 0, todo = read("todo") ?? 0;
    if ([total, passed, failed, skipped].some(v => count(v) === null)) throw new Error("Résumé TAP incomplet");
    if (passed + failed + skipped + cancelled + todo !== total) throw new Error("Comptage TAP incohérent");
    return { total, passed, failed, skipped, flaky: 0, cancelled, todo,
      expectedFailures: 0, errors: 0, durationMs: read("duration_ms"), measuredAt: null, environments: [] };
  }
  if (format === "pytest-json") {
    const summary = report?.summary;
    const total = count(summary?.total), passed = count(summary?.passed ?? 0);
    const failed = count(summary?.failed ?? 0), skipped = count(summary?.skipped ?? 0), error = count(summary?.error ?? 0);
    if (total === null || [passed, failed, skipped, error].some(value => value === null) || passed + failed + skipped + error !== total)
      throw new Error("Comptage pytest incohérent");
    return { total, passed, failed: failed + error, skipped, flaky: 0, cancelled: 0, todo: 0,
      expectedFailures: 0, errors: 0, durationMs: Number.isFinite(report.duration) ? report.duration * 1000 : null,
      measuredAt: Number.isFinite(report.created) ? new Date(report.created * 1000).toISOString() : null, environments: [] };
  }
  if (format === "playwright-summary") {
    const keys = ["total", "passed", "failed", "skipped", "flaky"];
    if (keys.some(key => count(report[key]) === null) || report.passed + report.failed + report.skipped + report.flaky !== report.total)
      throw new Error("Résumé Playwright incohérent");
    return { total: report.total, passed: report.passed, failed: report.failed, skipped: report.skipped, flaky: report.flaky,
      cancelled: 0, todo: 0, expectedFailures: 0, errors: 0, durationMs: Number.isFinite(report.durationMs) && report.durationMs >= 0 ? report.durationMs : null,
      measuredAt: typeof report.measuredAt === "string" && !Number.isNaN(Date.parse(report.measuredAt)) ? report.measuredAt : null,
      environments: Array.isArray(report.environments) ? report.environments.filter(value => typeof value === "string") : [] };
  }
  if (format === "playwright") {
    if (!report.stats || !Array.isArray(report.suites)) throw new Error("Rapport Playwright invalide");
    const tests = [];
    const visit = suite => {
      for (const spec of suite.specs ?? []) tests.push(...(spec.tests ?? []));
      for (const child of suite.suites ?? []) visit(child);
    };
    report.suites.forEach(visit);
    const result = { total: tests.length, passed: 0, failed: 0, skipped: 0, flaky: 0,
      cancelled: 0, todo: 0, expectedFailures: 0, errors: report.errors?.length ?? 0,
      durationMs: report.stats.duration, measuredAt: report.stats.startTime,
      environments: [...new Set(tests.map(t => t.projectName).filter(Boolean))] };
    for (const test of tests) {
      if (test.status === "skipped") result.skipped++;
      else if (test.status === "flaky") result.flaky++;
      else if (test.status === "unexpected") result.failed++;
      else if (test.status === "expected" && test.expectedStatus === "failed") result.expectedFailures++;
      else if (test.status === "expected") result.passed++;
      else throw new Error("Statut Playwright inconnu");
    }
    // Failure-only reports cannot establish full counts.
    const reportedTotal = ["expected", "unexpected", "flaky", "skipped"].reduce((n,k) => n + (count(report.stats[k]) ?? 0), 0);
    if (reportedTotal !== result.total) throw new Error("Rapport Playwright filtré ou incomplet");
    return result;
  }
  if (format === "vitest" || format === "jest") {
    const keys = ["numTotalTests", "numPassedTests", "numFailedTests", "numPendingTests"];
    if (keys.some(k => count(report[k]) === null)) throw new Error("Rapport Vitest/Jest incomplet");
    const todo = count(report.numTodoTests) ?? 0;
    if (report.numPassedTests + report.numFailedTests + report.numPendingTests + todo !== report.numTotalTests)
      throw new Error("Comptage Vitest/Jest incohérent");
    const endTimes = (report.testResults ?? []).map(t => t.endTime).filter(Number.isFinite);
    return { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests,
      skipped: report.numPendingTests, flaky: 0, cancelled: 0, todo, expectedFailures: 0,
      errors: count(report.numRuntimeErrorTestSuites) ?? (report.success === false && report.numFailedTests === 0 ? 1 : 0),
      durationMs: Number.isFinite(report.startTime) && endTimes.length ? Math.max(...endTimes) - report.startTime : null,
      measuredAt: Number.isFinite(report.startTime) ? new Date(report.startTime).toISOString() : null, environments: [] };
  }
  throw new Error("Format de rapport inconnu");
}
