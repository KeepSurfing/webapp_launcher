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
  revision: string | null; scope: string; reportUrl: string; sourceUrl?: string | null;
};
export type ProjectQA = {
  repository: string; sourceUrl: string; changeUrl?: string | null; changeStatus?: "review" | "merged" | null; inspectedAt: string; available: boolean;
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

export type QAActionKind = "add" | "complete" | "measure" | "review" | "tracked";
type QAStep = { type: "test" | "measure" | "run"; label: string };
export type QAAction = { kind: QAActionKind; label: string; headline: string; steps: QAStep[] };

// Recommendations from the inspected source files and the unit coverage reports.
// A missing measurement alone never establishes that tests are missing.
const recommendations: Record<string, { headline: string; steps: QAStep[] }> = {
  petsitter: { headline: "Contact · navigation mobile", steps: [
    { type: "test", label: "Validation du formulaire de contact" },
    { type: "test", label: "Navigation mobile et clavier" },
  ] },
  "toit-renov": { headline: "Devis · liens de contact", steps: [
    { type: "test", label: "Devis : préremplissage et validation" },
    { type: "test", label: "Liens téléphone et navigation mobile" },
  ] },
  "bordeaux-bouge": { headline: "Filtres · dates · export agenda", steps: [
    { type: "test", label: "Filtres, dates et export ICS" },
    { type: "test", label: "Recherche et inscription newsletter" },
  ] },
  "carto-risques": { headline: "Carte · chargement des données", steps: [
    { type: "test", label: "Couverture unitaire : MapView et protocole statique" },
    { type: "test", label: "Chargement des données : cache et erreurs" },
  ] },
  orientation: { headline: "Pages · parcours complets", steps: [
    { type: "test", label: "Compléter la couverture unitaire des pages" },
    { type: "test", label: "Cas limites des routes métier restantes" },
  ] },
  "rgpd-scan": { headline: "Scanner · configurations", steps: [
    { type: "test", label: "Branches restantes du scanner et protection réseau" },
    { type: "test", label: "Configurations et interface du rapport" },
  ] },
  keepsurfing: { headline: "Parcours visuels · cas limites", steps: [
    { type: "test", label: "Dernières branches des API" },
    { type: "run", label: "Créer les références et exécuter la suite visuelle" },
  ] },
};
const reviewedRevisions: Record<string, string | null> = {
  "rgpd-scan": "defece5d67ceda8e36f1d5679c999e87be80900a",
  "toit-renov": "ceaafe00f9c9ab0b571e144482fabae060d81592",
  "petsitter": "c545b10dd31861fb28ebc654c707a0b766b16ea3",
  "keepsurfing": "2c09afd1deeca3abd998b9afe5d7febcd78ee065",
  "carto-risques": "1e5822e934728f988c3996533140665f79ec013b",
  "orientation": "fd3a672780fe6cff359e78f0c773b22e599bbcd3",
  "bordeaux-bouge": "68d1dd76309bf506d892e476c4a6ffe055c041dc"
};
export function getQAAction(qa: ProjectQA | undefined, id: string): QAAction {
  if (!qa?.available) return { kind: "review", label: "À inspecter", headline: "Sources à inspecter",
    steps: [{ type: "measure", label: "Relier les sources et leurs rapports" }] };
  const recommendation = qa.revision && reviewedRevisions[id] === qa.revision ? recommendations[id] : undefined;
  if (!qa.suites.length) return { kind: "add", label: "À ajouter", headline: recommendation?.headline ?? "Créer une première suite",
    steps: recommendation?.steps ?? [{ type: "test", label: "Parcours principal et cas d’erreur" }] };
  if (recommendation) return { kind: "complete", label: "À compléter", ...recommendation };
  const lines = qa.coverage?.metrics.lines;
  if (lines && lines.covered < lines.total) return { kind: "complete", label: "À compléter", headline: "Code non couvert",
    steps: [{ type: "test", label: "Branches et fonctions non couvertes" }] };
  if (!lines || !qa.runs.length) return { kind: "measure", label: "À mesurer", headline: "Résultats à documenter",
    steps: [{ type: "measure", label: "Importer les résultats et la couverture" }] };
  return { kind: "tracked", label: "Suivi", headline: "Périmètre mesuré", steps: [{ type: "run", label: "Actualiser les suites existantes" }] };
}

const runnerNames: Record<string, string> = { vitest: "Vitest", jest: "Jest", playwright: "Playwright", "playwright-summary": "Playwright", "node-tap": "Node.js", "pytest-json": "pytest" };
const runnerFromSuite = (tool: string) => tool.includes("Playwright") ? "Playwright" : tool.startsWith("Node.js") ? "Node.js" : tool;
const runnerFromRun = (run: TestRun) => run.format === "node-tap" && ["browser", "visual", "e2e"].includes(run.kind) ? "Playwright" : runnerNames[run.format];
export function summarizeTestTechnologies(projects: ProjectQA[]) {
  const result = new Map<string, { name: string; executed: number | null; projects: number; unmeasuredProjects: number }>();
  for (const project of projects) {
    const names = new Set([...project.suites.map(suite => runnerFromSuite(suite.tool)), ...project.runs.map(runnerFromRun).filter(Boolean)]);
    for (const name of names) {
      const runs = project.runs.filter(run => runnerFromRun(run) === name);
      const entry = result.get(name) ?? { name, executed: null, projects: 0, unmeasuredProjects: 0 };
      entry.projects++;
      if (runs.length) entry.executed = (entry.executed ?? 0) + runs.reduce((n, run) => n + run.passed + run.failed + run.flaky, 0);
      else entry.unmeasuredProjects++;
      result.set(name, entry);
    }
  }
  return [...result.values()].sort((a, b) => (b.executed ?? -1) - (a.executed ?? -1) || a.name.localeCompare(b.name));
}
