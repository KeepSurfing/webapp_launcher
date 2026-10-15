import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { formatDate, formatDuration, formatPercent, getQAAction, kindLabels, qaData, summarizeQA, summarizeTestTechnologies } from "../data/qa";

export function QADetails({ siteId }: { siteId: string }) {
  const qa = qaData.projects[siteId];
  if (!qa) return <section className="qa-details"><h3>Tests & qualité</h3><p className="qa-muted">{siteId === "dashboard" || siteId === "vercel-project" ? "Hors bilan QA." : "Source à relier."}</p></section>;
  const summary = summarizeQA([qa]), action = getQAAction(qa, siteId);
  const technologies = summarizeTestTechnologies([qa]);
  const failed = summary.failed + summary.errors;
  return <section className="qa-details" aria-labelledby={"qa-detail-" + siteId}>
    <div className="qa-details-heading"><h3 id={"qa-detail-" + siteId}>Tests & qualité</h3><span className={"qa-status qa-status-" + action.kind}>{action.label}</span></div>
    <div className="qa-detail-metrics">
      <div><strong className={failed ? "qa-alert" : ""}>{summary.executed ? summary.passed + summary.flaky : "—"}</strong><span>tests validés</span></div>
      <div><strong>{formatPercent(qa.coverage?.metrics.lines?.pct ?? null)}</strong><span>couverture du code</span></div>
      <div><strong>{summary.files}</strong><span>fichiers de tests</span></div>
    </div>
    {failed > 0 && <p className="qa-alert">{failed} échecs ou erreurs</p>}
    {qa.changeUrl && <a className="qa-change-link" href={qa.changeUrl} target="_blank" rel="noreferrer">{qa.changeStatus === "merged" ? "Tests intégrés" : "Tests ajoutés · en revue"} <ArrowUpRight size={12} /></a>}
    {technologies.length > 0 && <div className="qa-suite-tags">{technologies.map(tool => <span key={tool.name}>{tool.name} · {tool.executed === null ? "—" : tool.executed}</span>)}</div>}
    <div className={"qa-next-step qa-next-" + action.kind}>
      <div>{action.kind === "add" ? <Plus size={16} /> : <Sparkles size={16} />}<strong>{action.headline}</strong></div>
      <ul>{action.steps.map(step => <li key={step.label}><span className={"qa-step-type qa-step-" + step.type}>{step.type === "test" ? "Tester" : step.type === "measure" ? "Mesurer" : "Exécuter"}</span><span>{step.label}</span></li>)}</ul>
    </div>
    {qa.coverage && <details className="qa-disclosure"><summary>Couverture détaillée <span>{formatPercent(qa.coverage.metrics.lines?.pct ?? null)}</span></summary>
      <div className="qa-coverage">
        {([["lines", "Lignes"], ["branches", "Branches"], ["functions", "Fonctions"], ["statements", "Instructions"]] as const).map(([key,label]) => {
          const metric = qa.coverage!.metrics[key];
          return <div className="qa-coverage-row" key={key}><span>{label}</span><div className="qa-meter"><i style={{ width: (metric?.pct ?? 0) + "%" }} /></div><strong>{formatPercent(metric?.pct ?? null)}</strong></div>;
        })}
        <p>{qa.coverage.scope}</p><a href={qa.coverage.reportUrl} target="_blank" rel="noreferrer">Mesures · {formatDate(qa.coverage.measuredAt)} <ArrowUpRight size={13} /></a>
      </div>
    </details>}
    <details className="qa-disclosure"><summary>Rapports & sources <span>{qa.runs.length} rapports</span></summary>
      {!qa.runs.length && <p className="qa-muted">Aucun rapport importé.</p>}
      {qa.runs.map(run => <div className="qa-report" key={run.kind}>
        <a href={run.reportUrl} target="_blank" rel="noreferrer"><span>{kindLabels[run.kind]}</span><strong>{run.passed + run.flaky}/{run.total}</strong><ArrowUpRight size={14} /></a>
        <p>{formatDate(run.measuredAt)} · {formatDuration(run.durationMs)}{run.dateSource === "file" ? " · date du fichier" : ""}</p><p>{run.scope}</p>
        {(run.failed + run.skipped + run.todo + run.flaky + run.cancelled + run.errors + run.expectedFailures > 0) && <p>{run.failed} échoués · {run.skipped + run.todo} ignorés · {run.flaky} instables · {run.cancelled} annulés · {run.errors} erreurs · {run.expectedFailures} échecs attendus</p>}
        {run.sourceUrl && <a href={run.sourceUrl} target="_blank" rel="noreferrer">Exécution GitHub <ArrowUpRight size={12} /></a>}
        {run.revision && <p>Version {run.revision.slice(0,7)}{qa.revision && qa.revision !== run.revision ? " · différente des sources" : ""}</p>}
      </div>)}
      <div className="qa-source"><a href={qa.sourceUrl} target="_blank" rel="noreferrer">Dépôt GitHub <ArrowUpRight size={13} /></a><span>{formatDate(qa.inspectedAt)} · {qa.revision?.slice(0,7)}{qa.workingTreeChanged ? " · modifications locales" : ""}</span></div>
      {qa.suites.length > 0 && <details className="qa-file-list"><summary>Fichiers de tests · {summary.files}</summary>{qa.suites.map(suite => <div key={suite.kind + suite.tool}><h4>{kindLabels[suite.kind]} · {suite.tool}</h4><ul>{suite.files.map(file => <li key={file}><a href={qa.sourceUrl + "/blob/" + (qa.revision ?? "HEAD") + "/" + file.split("/").map(encodeURIComponent).join("/")} target="_blank" rel="noreferrer">{file}</a></li>)}</ul></div>)}</details>}
    </details>
  </section>;
}
