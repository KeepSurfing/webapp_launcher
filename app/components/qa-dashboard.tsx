import { ArrowUpRight, Check, Code2, ShieldCheck, Sparkles } from "lucide-react";
import type { MosaicSite } from "../data/sites";
import { formatDate, formatPercent, qaData, summarizeQA, summarizeTestTechnologies } from "../data/qa";
type Props = { sites: MosaicSite[]; onOpen: (site: MosaicSite, el: HTMLElement) => void };
const technologyStyles: Record<string, { mark: string; accent: string; detail: string }> = {
  Vitest: { mark: "V", accent: "#c9ed86", detail: "Logique · composants · API" },
  Playwright: { mark: "P", accent: "#bbaaff", detail: "Parcours navigateur" },
  "Node.js": { mark: "N", accent: "#8edcba", detail: "Logique · intégration" },
  pytest: { mark: "py", accent: "#f3c879", detail: "API · traitements de données" },
  Jest: { mark: "J", accent: "#ed9da9", detail: "Logique · composants" },
};
export function QADashboard({ sites, onOpen }: Props) {
  const linked = sites.filter(site => qaData.projects[site.id]);
  const projects = linked.map(site => qaData.projects[site.id]);
  const summary = summarizeQA(projects), technologies = summarizeTestTechnologies(projects);
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
        <div className="qa-metric-top"><span>Couverture du code</span><ShieldCheck size={19} /></div>
        <strong>{summary.coverage === null ? "—" : summary.coverage.toLocaleString("fr-FR")}<small>{summary.coverage === null ? "" : "%"}</small></strong>
        <div className="qa-meter" role="meter" aria-label="Couverture du code mesuré" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.coverage ?? 0} aria-valuetext={formatPercent(summary.coverage)}><i style={{ width: (summary.coverage ?? 0) + "%" }} /></div>
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
        <div className="qa-metric-bottom"><span>Unitaires · UI · E2E</span><span className="qa-tech-count">{technologies.length} outils</span></div>
      </article>
    </div>
    <div className="qa-priorities-top"><h3>Technos <span>{technologies.length}</span></h3></div>
    <div className="qa-technologies">{technologies.map(technology => {
      const style = technologyStyles[technology.name] ?? { mark: technology.name.slice(0, 2), accent: "#c5cfc7", detail: "Tests automatisés" };
      return <article className="qa-technology" key={technology.name} style={{ "--technology-accent": style.accent } as import("react").CSSProperties}>
        <div className="qa-technology-top"><span className="qa-technology-mark" aria-hidden="true">{style.mark}</span><h4>{technology.name}</h4></div>
        <strong>{technology.executed === null ? "—" : technology.executed.toLocaleString("fr-FR")}</strong>
        <span className="qa-technology-count">{technology.executed === null ? "Exécution à mesurer" : "tests exécutés"}</span>
        <div className="qa-technology-bottom"><span>{style.detail}</span><span>{technology.projects} {technology.projects === 1 ? "projet" : "projets"}</span></div>
        {technology.executed !== null && technology.unmeasuredProjects > 0 && <small className="qa-technology-pending">+ {technology.unmeasuredProjects} projets sans rapport</small>}
      </article>;
    })}</div>
    <div className="qa-other">{linked.map(site => <button key={site.id} onClick={event => onOpen(site, event.currentTarget)} aria-label={"Voir les tests de " + site.name}>{site.name}<b>{formatPercent(qaData.projects[site.id].coverage?.metrics.lines?.pct ?? null)}</b><ArrowUpRight size={14} /></button>)}</div>
    <details className="qa-method"><summary>Sources & méthode</summary><p>Couverture pondérée des lignes du code mesuré. Comptages par outil issus des derniers rapports : tests réussis, échoués ou instables, hors tests ignorés. Un rapport absent reste non mesuré.</p></details>
  </section>;
}
