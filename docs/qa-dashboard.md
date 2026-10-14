# Indicateurs QA du launcher

Le tableau de bord remplace « À la une ». Les fiches détaillent les suites, leur périmètre, les derniers rapports importés, la couverture et les liens vers les sources.

## Actualiser les sources

Depuis la racine du launcher :

```sh
npm run qa:collect
```

La correspondance application/dépôt/chemin local est dans `scripts/qa-projects.json`. Les chemins sont relatifs au launcher. Une configuration personnalisée peut être passée avec `--config chemin.json`.

Pour récupérer des copies récentes des dépôts GitHub au lieu des chemins locaux :

```sh
npm run qa:collect -- --github
```

Cette commande nécessite un accès Git en lecture aux dépôts privés. Les copies restent dans `work/qa-sources/`, ignoré par Git. La collecte ne lance aucun test, n’installe aucune dépendance et ne modifie pas les dépôts d’origine. Les données affichées sont un instantané versionné dans `app/data/qa.generated.json` ; leur mise à jour en production nécessite un nouveau build/déploiement.

## Importer des résultats

Mettre les rapports dans `work/qa-reports/` puis ajouter un manifeste `<id-application>.json`. Une seule dernière exécution par type de suite évite le double comptage :

```json
{
  "runs": [{
    "kind": "unit",
    "format": "vitest",
    "path": "orientation-unit.json",
    "revision": "SHA-du-commit-testé",
    "scope": "Suite Vitest : logique métier et composants"
  }],
  "coverage": {
    "path": "../qa-sources/orientation/coverage/coverage-summary.json",
    "scope": "src/**/*.{ts,tsx}, hors tests",
    "revision": "SHA-du-commit-testé"
  }
}
```

Types : `unit`, `component`, `e2e`, `browser`, `visual`, `integration`.
Formats : `vitest`, `jest`, `playwright` (rapport JSON complet), `node-tap` (résumé TAP complet).

Exemples à exécuter dans le dépôt concerné, avec les outils déjà installés :

```sh
npx vitest run --reporter=json --outputFile=results.json
npx playwright test --reporter=json > playwright-results.json
node --test --test-reporter=tap tests/*.test.js > results.tap
```

Vitest peut produire la couverture avec `--coverage --coverage.reporter=json-summary` et le fournisseur de couverture correspondant à sa version. Définir explicitement `coverage.include` pour inclure aussi le code non exécuté. Les rapports Istanbul `coverage/coverage-summary.json` (ou `frontend/coverage/coverage-summary.json`) sont détectés automatiquement, sauf chemin explicite dans le manifeste.

En CI, générer et conserver ces rapports comme artefacts même en cas d’échec. Télécharger la dernière exécution complète de chaque suite avant la collecte. Le launcher n’utilise aucun token GitHub dans le navigateur.

## Sens des chiffres

- « Projets avec tests » compte les applications dont les sources contiennent des fichiers de tests identifiés. Erdos 64 et son lien de déploiement sont exclus.
- Les fichiers de tests ne représentent ni le nombre exact de scénarios ni une couverture fonctionnelle. Les tests paramétrés et les déclinaisons par navigateur peuvent augmenter le nombre d’exécutions.
- Le taux de réussite est calculé sur les tests effectivement exécutés : (réussis + réussis après relance) / (réussis + échoués + réussis après relance). Les tests instables restent détaillés. Les tests ignorés, à faire, annulés et échecs attendus restent séparés ; les erreurs d’exécution sont signalées.
- Un rapport absent reste « non mesuré ». Une couverture absente n’est jamais transformée en 0 %.
- La couverture globale additionne les lignes couvertes et les lignes mesurées des seuls rapports disponibles ; aucune moyenne simple des pourcentages. Le périmètre exact du rapport doit être documenté.
- Les dates et versions des rapports restent distinctes de la date d’inspection des sources. Pour TAP et les résumés de couverture sans date native, l’horodatage du fichier est utilisé et signalé.
- Les résumés publics dans `public/qa/reports/` contiennent uniquement les métriques, périmètres et versions. Les logs, données de tests, vidéos et traces restent hors du site.
- Les liens vers des dépôts privés demandent les droits GitHub appropriés. Le launcher montre les métriques autorisées sans rendre le code public.

## Vérification du launcher

```sh
npm run test:qa
npm run build
```

Les tests QA vérifient les calculs et les cas qui pourraient présenter des chiffres trompeurs : rapports incomplets, couverture absente, tests instables et échecs attendus.

Références : [Reporters Playwright](https://playwright.dev/docs/test-reporters), [Reporters Vitest](https://vitest.dev/guide/reporters), [Couverture Vitest](https://vitest.dev/guide/coverage).
