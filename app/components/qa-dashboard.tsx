import { useState } from "react";
import { ArrowUpRight, Check, Code2, Plus, ShieldCheck, Sparkles } from "lucide-react";
import type { MosaicSite } from "../data/sites";
import { formatDate, formatPercent, getQAAction, qaData, summarizeQA, type QAActionKind } from "../data/qa";

type Props = { sites: MosaicSite[]; onOpen: (site: MosaicSite, el: HTMLElement) => void };

export function QADashboard({ sites, onOpen }: Props) {
  const [filter, setFilter] = useState<"all" | "add" | "complete">("all");
  const linked = sites.filter(site => qaData.projects[site.id]);
  const summary = summarizeQA(linked.map(site => qaData.projects[site.id]));
  const groups = [
    { kind: "add" as const, title: "Ajouter des tests", subtitle: "Aucune suite détectée", icon: Plus },
    { kind: "complete" as const, title: "Compléter les tests", subtitle: "Périmètres à renforcer", icon: Sparkles },
  ];
  const projectsFor = (kind: QAActionKind) => linked.filter(site => getQAAction(qaData.projects[site.id], site.id).kind === kind);
  const counts = { add: projectsFor("add").length, complete: projectsFor("complete").length };
  const reviewed = linked.filter(site => ["add", "complete"].includes(getQAAction(qaData.projects[site.id], site.id).kind));
  const other = linked.filter(site => !reviewed.includes(site));
  const failed = summary.failed + summary.errors;

  return <section className="qa-dashboard" aria-labelledby="qa-heading">
    <div className="qa-heading">
      <div><span className="qa-eyebrow"><i /> PORTFOLIO QA</span><h2 id="qa-heading">La qualité en clair<span>.</span></h2></div>
      <span className="qa-date">{formatDate(qaData.collectedAt)}</span>
    </div>
    <div className="qa-metrics">
      <article className="qa-metric qa-metric-lime">
        <div className="qa-metric-top"><span>Tests validés</span><Check size={19} /></div>
        <strong>{(summary.passed + summary.flaky).toLocaleString("fr-FR")}</strong>
        <div className="qa-metric-bottom"><span className="qa-mini-pill">{formatPercent(summary.successRate)} de réussite</span><span>{summary.reportProjects} projets</span></div>
        {failed > 0 && <span className="qa-alert">{failed} échecs / erreurs</span>}
      </article>
      <article className="qa-metric qa-metric-coverage">
        <div className="qa-metric-top"><span>Couverture des lignes</span><ShieldCheck size={19} /></div>
        <strong>{summary.coverage === null ? "—" : summary.coverage.toLocaleString("fr-FR")}<small>{summary.coverage === null ? "" : "%"}</small></strong>
        <div className="qa-meter" role="meter" aria-label="Couverture des lignes mesurées" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.coverage ?? 0} aria-valuetext={formatPercent(summary.coverage)}><i style={{ width: (summary.coverage ?? 0) + "%" }} /></div>
        <div className="qa-metric-bottom"><span>{summary.coverageProjects} / {summary.projects} projets mesurés</span></div>
      </article>
      <article className="qa-metric">
        <div className="qa-metric-top"><span>Projets automatisés</span><Sparkles size={19} /></div>
        <strong>{summary.withTests}<small className="qa-fraction">/{summary.projects}</small></strong>
        <div className="qa-segments" aria-hidden="true">{linked.map((site, index) => <i key={site.id} className={index < summary.withTests ? "filled" : ""} />)}</div>
        <div className="qa-metric-bottom"><span>{summary.projects - summary.withTests} à équiper</span></div>
      </article>
      <article className="qa-metric">
        <div className="qa-metric-top"><span>Fichiers de tests</span><Code2 size={19} /></div>
        <strong>{summary.files}</strong>
        <div className="qa-metric-bottom"><span>Unitaires · UI · E2E</span><span className="qa-tech-count">{summary.tools.length} outils</span></div>
      </article>
    </div>
    <div className="qa-priorities-top"><h3>Prochaines étapes <span>{reviewed.length}</span></h3>
      <div className="qa-filters" aria-label="Filtrer les priorités QA">
        {([["all", "Tout", reviewed.length], ["add", "Ajouter", counts.add], ["complete", "Compléter", counts.complete]] as const).map(([value, label, count]) =>
          <button key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<span>{count}</span></button>)}
      </div>
    </div>
    <div className={"qa-action-panels " + (filter !== "all" || !counts.add || !counts.complete ? "qa-action-single" : "")}>
      {groups.filter(group => filter === group.kind || (filter === "all" && counts[group.kind] > 0)).map(group => <section className={"qa-action-panel qa-action-" + group.kind} key={group.kind} aria-label={group.title}>
        <div className="qa-action-heading"><span className="qa-action-symbol"><group.icon size={20} /></span><div><h4>{group.title}</h4><p>{group.subtitle}</p></div><strong>{counts[group.kind].toString().padStart(2, "0")}</strong></div>
        <div className="qa-project-list">{projectsFor(group.kind).map(site => {
          const qa = qaData.projects[site.id], action = getQAAction(qa, site.id), result = summarizeQA([qa]);
          return <button className="qa-project" key={site.id} onClick={event => onOpen(site, event.currentTarget)} aria-label={"Voir les tests de " + site.name}>
            <span className="qa-project-avatar" style={{ color: site.accent }}>{site.mark}</span>
            <span className="qa-project-copy"><strong>{site.name}</strong><small>{action.headline}</small></span>
            <span className="qa-project-value">{group.kind === "add" ? <span className="qa-zero">À créer</span> : <><b>{qa.coverage ? formatPercent(qa.coverage.metrics.lines?.pct ?? null) : result.executed ? result.executed : "—"}</b><small>{qa.coverage ? "couverture" : result.executed ? "tests exécutés" : "rapport absent"}</small></>}</span>
            <ArrowUpRight className="qa-project-arrow" size={17} />
          </button>;
        })}</div>
        {counts[group.kind] === 0 && <p className="qa-empty">Aucun projet dans cette catégorie.</p>}
      </section>)}
    </div>
    {other.length > 0 && <div className="qa-other">{other.map(site => <button key={site.id} onClick={event => onOpen(site, event.currentTarget)}>{site.name}<b>{formatPercent(qaData.projects[site.id].coverage?.metrics.lines?.pct ?? null)}</b>{qaData.projects[site.id].changeUrl ? "en revue" : getQAAction(qaData.projects[site.id], site.id).label}<ArrowUpRight size={14} /></button>)}</div>}
    <details className="qa-method"><summary>Sources & méthode</summary><p>{summary.executed} tests exécutés sur {summary.reportProjects} projets. Couverture pondérée sur {summary.coverageProjects} projets uniquement. Les rapports absents restent non mesurés.</p><p>Les priorités correspondent aux sources inspectées : absence de suite, code non couvert par les tests unitaires, ou parcours sans tests identifiés. Les mesures et les exécutions manquantes sont distinguées des tests à écrire dans les fiches.</p></details>
  </section>;
}
