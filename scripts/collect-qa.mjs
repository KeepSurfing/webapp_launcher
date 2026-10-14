import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseCoverage, parseRun } from "./qa-parsers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const configIndex = args.indexOf("--config");
const configPath = configIndex < 0 ? path.join(root, "scripts/qa-projects.json") : path.resolve(args[configIndex + 1]);
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const output = { schemaVersion: 1, collectedAt: new Date().toISOString(), projects: {} };
const ignored = new Set([".git", "node_modules", ".next", ".cache", ".venv", "venv", "dist", "build",
  "data", "static-data", "public", "assets", "test-results", "playwright-report", "coverage", ".agents", ".claude", ".windsurf"]);
const exists = async file => { try { await fs.access(file); return true; } catch { return false; } };
async function walk(dir, relative = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const name = relative ? relative + "/" + entry.name : entry.name;
    if (entry.isDirectory() && !ignored.has(entry.name)) files.push(...await walk(path.join(dir, entry.name), name));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
function git(dir, args) {
  return execFileSync("git", ["-c", "safe.directory=" + dir.replaceAll("\\", "/"), "-C", dir, ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}
async function syncSource(project) {
  const dir = path.join(root, "work/qa-sources", project.id);
  await fs.mkdir(path.dirname(dir), { recursive: true });
  if (await exists(path.join(dir, ".git"))) {
    git(dir, ["fetch", "--depth", "1", "origin"]);
    // Use a fresh copy rather than resetting a checkout that may contain local work.
    const revision = git(dir, ["rev-parse", "FETCH_HEAD"]);
    const fresh = path.join(root, "work/qa-sources", project.id + "-" + revision.slice(0, 12));
    if (!await exists(fresh)) execFileSync("git", ["clone", "--depth", "1", "https://github.com/" + project.repository + ".git", fresh], { stdio: "inherit" });
    return fresh;
  }
  execFileSync("git", ["clone", "--depth", "1", "https://github.com/" + project.repository + ".git", dir], { stdio: "inherit" });
  return dir;
}
for (const project of config.projects) {
  if (!/^[a-z0-9-]+$/.test(project.id) || !/^[\w.-]+\/[\w.-]+$/.test(project.repository))
    throw new Error("Identifiant de projet invalide");
  const dir = args.includes("--github") ? await syncSource(project) : path.resolve(root, project.path);
  const qa = { repository: project.repository, sourceUrl: "https://github.com/" + project.repository,
    changeUrl: project.changeUrl ?? null, inspectedAt: output.collectedAt, available: await exists(dir), revision: null, workingTreeChanged: null,
    suites: [], focus: project.focus ?? [], coverage: null, runs: [] };
  if (qa.available) {
    try { qa.revision = git(dir, ["rev-parse", "HEAD"]); qa.workingTreeChanged = Boolean(git(dir, ["status", "--porcelain", "--untracked-files=no"])); } catch { /* No Git metadata. */ }
    const files = await walk(dir);
    const packageFiles = files.filter(f => /(^|\/)package.json$/.test(f));
    const packages = await Promise.all(packageFiles.map(f => fs.readFile(path.join(dir, f), "utf8").then(JSON.parse)));
    const hasVitest = packages.some(p => p.devDependencies?.vitest || p.dependencies?.vitest);
    const groups = new Map();
    for (const file of files.filter(f => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) || /(^|\/)test_[^/]+\.py$/.test(f))) {
      const content = await fs.readFile(path.join(dir, file), "utf8");
      let kind = "unit", tool = "Node.js";
      if (file.endsWith(".py")) { tool = "pytest"; kind = /backend\/tests/.test(file) ? "integration" : "unit"; }
      else if (/playwright|(^|\/)e2e\//.test(content + " " + file)) { tool = /node:test/.test(content) ? "Node.js + Playwright" : "Playwright";
        kind = /visual|toHaveScreenshot/.test(content + " " + file) ? "visual" : /browser\.test/.test(file) ? "browser" : "e2e"; }
      else if (/vitest/.test(content) || (hasVitest && !/node:test/.test(content))) { tool = "Vitest"; kind = /\.tsx$/.test(file) ? "component" : "unit"; }
      else if (/jest/.test(content)) tool = "Jest";
      const key = kind + ":" + tool;
      if (!groups.has(key)) groups.set(key, { kind, tool, files: [] });
      groups.get(key).files.push(file);
    }
    qa.suites = [...groups.values()].map(s => ({ ...s, files: s.files.sort() }));
  }
  const manifestPath = path.join(root, "work/qa-reports", project.id + ".json");
  const manifest = await exists(manifestPath) ? JSON.parse(await fs.readFile(manifestPath, "utf8")) : { runs: [] };
  for (const report of manifest.runs ?? []) {
    const file = path.resolve(path.dirname(manifestPath), report.path);
    const raw = (await fs.readFile(file, "utf8")).replace(/^\uFEFF/, "");
    const parsed = parseRun(report.format === "node-tap" ? raw : JSON.parse(raw), report.format);
    const fileDate = (await fs.stat(file)).mtime.toISOString();
    qa.runs.push({ ...parsed, kind: report.kind, format: report.format,
      measuredAt: parsed.measuredAt ?? fileDate, dateSource: parsed.measuredAt ? "report" : "file",
      revision: report.revision ?? null, scope: report.scope ?? "Suite sélectionnée",
      reportUrl: "/qa/reports/" + project.id + "-" + report.kind + ".json" });
  }
  if (new Set(qa.runs.map(r => r.kind)).size !== qa.runs.length) throw new Error("Une seule exécution par suite est permise");
  const coverageCandidates = manifest.coverage ? [path.resolve(path.dirname(manifestPath), manifest.coverage.path)] :
    [path.join(dir, "coverage/coverage-summary.json"), path.join(dir, "frontend/coverage/coverage-summary.json")];
  for (const file of coverageCandidates) {
    if (!await exists(file)) continue;
    qa.coverage = { metrics: parseCoverage(JSON.parse(await fs.readFile(file, "utf8"))),
      measuredAt: (await fs.stat(file)).mtime.toISOString(), scope: manifest.coverage?.scope ?? "Fichiers inclus dans le rapport",
      revision: manifest.coverage?.revision ?? null, reportUrl: "/qa/reports/" + project.id + "-coverage.json" };
    break;
  }
  output.projects[project.id] = qa;
  console.log(project.id + ": " + qa.suites.reduce((n,s) => n + s.files.length, 0) + " fichiers de tests, " + qa.runs.length + " rapports");
}
// Validate all inputs before replacing the display snapshot.
await fs.mkdir(path.join(root, "public/qa/reports"), { recursive: true });
for (const [id, project] of Object.entries(output.projects)) {
  for (const run of project.runs) await fs.writeFile(path.join(root, "public", run.reportUrl), JSON.stringify({ project: id, ...run }, null, 2) + "\n");
  if (project.coverage) await fs.writeFile(path.join(root, "public", project.coverage.reportUrl), JSON.stringify({ project: id, ...project.coverage }, null, 2) + "\n");
}
await fs.mkdir(path.join(root, "app/data"), { recursive: true });
await fs.writeFile(path.join(root, "app/data/qa.generated.json"), JSON.stringify(output, null, 2) + "\n");
console.log("Instantané QA actualisé. Aucun test n’a été exécuté par la collecte.");
