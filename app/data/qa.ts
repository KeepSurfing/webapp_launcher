import snapshot from "./qa.generated.json";

export type TestKind = "unit" | "component" | "e2e" | "browser" | "visual" | "integration";
export const kindLabels: Record<TestKind, string> = {
  unit: "Unitaires", component: "Composants", e2e: "Parcours E2E",
  browser: "Navigateur", visual: "Visuels", integration: "Intégration",
};
export type CoverageMetric = { total: number; covered: number; pct: number | null };
export type TestRun = {
  kind: TestKind; format: string; total: number; passed: number; failed: number;
  skipped: number; flaky: number; cancelled: number; todo: number; expectedFailures: number; errors: number;
  durationMs: number | null; measuredAt: string; dateSource: string; environments: string[];
  revision: string | null; scope: string; reportUrl: string;
};
export type ProjectQA = {
  repository: string; sourceUrl: string; inspectedAt: string; available: boolean;
  revision: string | null; workingTreeChanged: boolean | null;
  suites: { kind: TestKind; tool: string; files: string[] }[]; focus: string[];
  coverage: { metrics: Record<"lines" | "branches" | "functions" | "statements", CoverageMetric | null>;
    measuredAt: string; scope: string; revision: string | null; reportUrl: string } | null;
  runs: TestRun[];
};
export const qaData = snapshot as { schemaVersion: number; collectedAt: string; projects: Record<string, ProjectQA> };
export function summarizeQA(projects: ProjectQA[]) {
  const withTests = projects.filter(p => p.suites.length > 0);
  const runs = projects.flatMap(p => p.runs);
  const passed = runs.reduce((n,r) => n + r.passed, 0), failed = runs.reduce((n,r) => n + r.failed, 0);
  const flaky = runs.reduce((n,r) => n + r.flaky, 0);
  const errors = runs.reduce((n,r) => n + r.errors + r.cancelled, 0);
  const measured = projects.flatMap(p => p.coverage?.metrics.lines?.total ? [p.coverage.metrics.lines] : []);
  const lines = measured.reduce((n,m) => n + m.total, 0), covered = measured.reduce((n,m) => n + m.covered, 0);
  return { projects: projects.length, withTests: withTests.length,
    files: withTests.reduce((n,p) => n + p.suites.reduce((s,x) => s + x.files.length, 0), 0),
    passed, failed, flaky, errors, executed: passed + failed + flaky,
    successRate: passed + failed + flaky ? Math.round((passed + flaky) / (passed + failed + flaky) * 1000) / 10 : null,
    coverage: lines ? Math.round(covered / lines * 1000) / 10 : null, coverageProjects: measured.length,
    reportProjects: projects.filter(p => p.runs.length > 0).length,
    tools: [...new Set(withTests.flatMap(p => p.suites.map(s => s.tool)))] };
}
export const formatPercent = (value: number | null) => value === null ? "—" : value.toLocaleString("fr-FR") + " %";
export const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(value));
export const formatDuration = (ms: number | null) => ms === null ? "Durée non disponible" : (ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " s";
