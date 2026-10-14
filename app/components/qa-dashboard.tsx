"use client";

import { useState } from "react";
import type { MosaicSite } from "../data/sites";
import { formatDate, formatPercent, qaData, summarizeQA } from "../data/qa";

type Props = { sites: MosaicSite[]; onOpen: (site: MosaicSite, el: HTMLElement) => void };
export function QADashboard({ sites, onOpen }: Props) {
  const [filter, setFilter] = useState("all");
  const linked = sites.filter(site => qaData.projects[site.id]);
  const summary = summarizeQA(linked.map(site => qaData.projects[site.id]));
  const visible = linked.filter(site => {
    const qa = qaData.projects[site.id];
    return filter === "all" || (filter === "tested" ? qa.suites.length > 0 : qa.suites.length === 0);
  });
  const fresh = (date: string) => new Date(qaData.collectedAt).getTime() - new Date(date).getTime() <= 30 * 86400000;
  return <section className="qa-dashboard" aria-labelledby="qa-heading">
    <div className="section-heading">
      <div><p>PORTFOLIO QA</p><h2 id="qa-heading">La qualité, en chiffres.</h2></div>
      <span className="qa-snapshot">Relevé du {formatDate(qaData.collectedAt)}</span>
    </div>
    <div className="qa-kpis">
      <article className="qa-kpi qa-kpi-primary"><span>Projets avec tests</span><strong>{summary.withTests}<small> / {summary.projects}</small></strong>
        <div className="qa-meter" role="meter" aria-label="Projets avec tests automatisés" aria-valuemin={0} aria-valuemax={summary.projects || 1} aria-valuenow={summary.withTests}>
          <i style={{ width: (summary.projects ? summary.withTests / summary.projects * 100 : 0) + "%" }} />
        </div><p>Suites automatisées recensées</p></article>
      <article className="qa-kpi"><span>Fichiers de tests</span><strong>{summary.files.toLocaleString("fr-FR")}</strong><p>Unitaires, interface et parcours</p></article>
      <article className="qa-kpi"><span>Réussite des tests exécutés</span><strong>{formatPercent(summary.successRate)}</strong>
        <p>{summary.executed ? <>{summary.passed + summary.flaky} / {summary.executed} réussis · {summary.reportProjects} projet{summary.reportProjects > 1 ? "s" : ""}</> : "Rapports d’exécution à collecter"}</p>
        {summary.errors > 0 && <p className="qa-warning">{summary.errors} erreur(s) ou interruption(s)</p>}</article>
      <article className="qa-kpi"><span>Couverture des lignes</span><strong>{formatPercent(summary.coverage)}</strong>
        <p>{summary.coverageProjects ? <>{summary.coverageProjects} projet{summary.coverageProjects > 1 ? "s" : ""} mesuré{summary.coverageProjects > 1 ? "s" : ""} · périmètre du rapport</> : "Aucun rapport de couverture disponible"}</p></article>
    </div>
    <div className="qa-panel">
      <div className="qa-panel-heading"><div><h3>Les tests derrière les projets</h3><p>Sélectionnez une application pour explorer ses vérifications.</p></div>
        <div className="qa-filters" aria-label="Filtrer le bilan QA">
          {[["all", "Tous"], ["tested", "Avec tests"], ["missing", "À compléter"]].map(([value,label]) =>
            <button key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
      </div>
      <div className="qa-table-scroll"><table className="qa-table"><thead><tr><th>Application</th><th>Automatisation</th><th>Derniers résultats</th><th>Lignes couvertes</th><th><span className="sr-only">Détails</span></th></tr></thead>
        <tbody>{visible.map(site => {
          const qa = qaData.projects[site.id], result = summarizeQA([qa]);
          const lastRun = qa.runs.toSorted((a,b) => b.measuredAt.localeCompare(a.measuredAt))[0];
          return <tr key={site.id}><th scope="row"><button className="qa-project-link" onClick={event => onOpen(site, event.currentTarget)}>
            <span className="qa-project-mark" style={{ color: site.accent }}>{site.mark}</span><span>{site.name}<small>{site.category}</small></span></button></th>
            <td><span className={"qa-status " + (qa.suites.length ? "qa-status-good" : "qa-status-muted")}>{qa.suites.length ? "Tests recensés" : qa.available ? "À compléter" : "Source indisponible"}</span>
              <small>{qa.suites.length ? result.files + " fichiers · " + result.tools.join(" / ") : "Aucune suite détectée"}</small></td>
            <td>{lastRun ? <><span className={result.failed || result.errors ? "qa-warning" : "qa-good"}>{result.passed + result.flaky} réussis{result.failed ? " · " + result.failed + " échecs" : ""}</span>
              <small>{formatDate(lastRun.measuredAt)}{!fresh(lastRun.measuredAt) ? " · relevé ancien" : ""}{result.flaky ? " · " + result.flaky + " instables" : ""}</small></> : <span className="qa-muted">Non mesurés</span>}</td>
            <td><span>{formatPercent(qa.coverage?.metrics.lines?.pct ?? null)}</span><small>{qa.coverage ? "Périmètre documenté" : "Non mesurée"}</small></td>
            <td><button className="qa-detail-button" onClick={event => onOpen(site, event.currentTarget)} aria-label={"Voir les tests de " + site.name}>↗</button></td></tr>;
        })}</tbody></table></div>
      {!visible.length && <p className="qa-empty">Aucun projet dans cette sélection.</p>}
      <div className="qa-panel-footer"><div className="qa-tools">{summary.tools.map(tool => <span key={tool}>{tool}</span>)}</div><span>Sources vérifiables dans chaque fiche</span></div>
    </div>
    <details className="qa-method"><summary>Comment lire ces indicateurs</summary><p>Un projet avec tests possède des fichiers de tests automatisés identifiés dans ses sources. Leur nombre ne mesure pas la couverture fonctionnelle. Les résultats proviennent des derniers rapports importés pour chaque suite ; les suites sans rapport ne participent pas au taux de réussite. Les tests ignorés, annulés et les échecs attendus sont présentés séparément dans les fiches.</p>
      <p>La couverture mesure le code inclus dans les rapports. Le chiffre global additionne les lignes couvertes et les lignes mesurées, uniquement sur les projets disposant d’un rapport ; il ne représente pas tout le portfolio. Les dates des résultats peuvent différer du relevé des sources. Un résultat ancien décrit l’exécution passée.</p>
    </details>
  </section>;
}
