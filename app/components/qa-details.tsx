import { formatDate, formatDuration, formatPercent, kindLabels, qaData, summarizeQA, type ProjectQA } from "../data/qa";

function Coverage({ qa }: { qa: ProjectQA }) {
  if (!qa.coverage) return <div className="qa-missing"><strong>Couverture du code non mesurée</strong><p>Les tests recensés ne suffisent pas à calculer un pourcentage. Un rapport de couverture permettra de compléter cette fiche.</p></div>;
  return <div className="qa-coverage"><h4>Couverture du code</h4>
    {([["lines","Lignes"],["branches","Branches"],["functions","Fonctions"],["statements","Instructions"]] as const).map(([key,label]) => {
      const metric = qa.coverage!.metrics[key];
      return <div className="qa-coverage-row" key={key}><span>{label}</span><div className="qa-meter"><i style={{ width: (metric?.pct ?? 0) + "%" }} /></div><strong>{formatPercent(metric?.pct ?? null)}</strong></div>;
    })}
    <p>{qa.coverage.scope} · {formatDate(qa.coverage.measuredAt)}</p>
    <a href={qa.coverage.reportUrl} target="_blank" rel="noreferrer">Consulter les mesures ↗</a>
  </div>;
}
export function QADetails({ siteId }: { siteId: string }) {
  const qa = qaData.projects[siteId];
  if (!qa) return <section className="qa-details"><h3>Tests & qualité</h3><p className="qa-muted">{siteId === "dashboard" || siteId === "vercel-project" ? "Projet exclu du bilan QA." : "Ce projet n’est pas encore relié à une source de tests."}</p></section>;
  const summary = summarizeQA([qa]);
  return <section className="qa-details" aria-labelledby={"qa-detail-" + siteId}>
    <div className="qa-details-heading"><div><p>ASSURANCE QUALITÉ</p><h3 id={"qa-detail-" + siteId}>Les tests de ce projet.</h3></div>
      <span className={"qa-status " + (qa.suites.length ? "qa-status-good" : "qa-status-muted")}>{qa.suites.length ? summary.files + " fichiers" : "À compléter"}</span></div>
    {qa.suites.length ? <div className="qa-suite-tags">{qa.suites.map(suite => <span key={suite.kind + suite.tool}>{kindLabels[suite.kind]}<b>{suite.files.length}</b></span>)}</div> :
      <p className="qa-muted">{qa.available ? "Aucune suite de tests automatisés détectée dans les sources inspectées." : "Les sources de ce projet n’ont pas pu être inspectées."}</p>}
    {qa.focus.length > 0 && <div className="qa-focus"><h4>Périmètre des vérifications</h4><ul>{qa.focus.map(item => <li key={item}>{item}</li>)}</ul><p>Scénarios présents dans les suites ; leur validation dépend des rapports ci-dessous.</p></div>}
    <Coverage qa={qa} />
    <div className="qa-runs"><h4>Dernières exécutions importées</h4>{qa.runs.length ? qa.runs.map(run => <article key={run.kind} className="qa-run">
      <div><strong>{kindLabels[run.kind]}</strong><span className={run.failed || run.errors || run.cancelled ? "qa-warning" : "qa-good"}>{run.failed || run.errors || run.cancelled ? "À examiner" : run.total > 0 && run.passed + run.flaky > 0 ? "Exécution réussie" : "Sans test réussi"}</span></div>
      <div className="qa-run-counts"><span><b>{run.passed}</b> réussis</span><span><b>{run.failed}</b> échoués</span><span><b>{run.skipped + run.todo}</b> ignorés / à faire</span></div>
      {run.flaky > 0 && <p className="qa-warning">{run.flaky} test(s) instable(s), réussis après relance</p>}
      {run.expectedFailures > 0 && <p>{run.expectedFailures} échec(s) attendu(s)</p>}
      {run.cancelled + run.errors > 0 && <p className="qa-warning">{run.cancelled} annulé(s) · {run.errors} erreur(s) d’exécution</p>}
      <p>{formatDate(run.measuredAt)} · {formatDuration(run.durationMs)}{run.dateSource === "file" ? " · date du fichier de rapport" : ""}</p>
      <p>{run.scope}{run.environments.length ? " · " + run.environments.join(", ") : ""}</p>
      {run.revision && <p>Version testée : <code>{run.revision.slice(0,7)}</code>{qa.revision && qa.revision !== run.revision ? " · différente des sources inspectées" : ""}</p>}
      <a href={run.reportUrl} target="_blank" rel="noreferrer">Consulter le résumé d’exécution ↗</a>
    </article>) : <p className="qa-muted">Aucun rapport d’exécution importé. La présence de tests ne garantit pas qu’ils réussissent.</p>}</div>
    {qa.suites.length > 0 && <details className="qa-file-list"><summary>Explorer les suites et leurs outils</summary>{qa.suites.map(suite => <div key={suite.kind + suite.tool}><h4>{kindLabels[suite.kind]} · {suite.tool}</h4><ul>{suite.files.map(file => <li key={file}><a href={qa.sourceUrl + "/blob/" + (qa.revision ?? "HEAD") + "/" + file.split("/").map(encodeURIComponent).join("/")} target="_blank" rel="noreferrer">{file}</a></li>)}</ul></div>)}</details>}
    <div className="qa-provenance"><a href={qa.sourceUrl} target="_blank" rel="noreferrer">Voir le dépôt source ↗</a><span>Sources inspectées le {formatDate(qa.inspectedAt)}{qa.revision ? " · " + qa.revision.slice(0,7) : ""}{qa.workingTreeChanged ? " · modifications locales" : ""}</span></div>
  </section>;
}
