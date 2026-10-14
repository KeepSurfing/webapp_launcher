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

## Priorités identifiées — 14 octobre 2026

| Projet | Action | Périmètre à traiter |
|---|---|---|
| PetSitter | 100 % mesuré | 9 tests de logique/composants + 2 parcours Chrome mobile |
| Toit Rénov’ | 100 % mesuré | 22 tests de logique/DOM + 2 parcours Chrome mobile |
| Bordeaux Bouge | 100 % mesuré | 73 tests métier/API/UI + 2 parcours Chrome mobile avec fixtures |
| CartoRisques | Compléter | Cas limites de l’analyse statique et des tuiles ; composants d’analyse et recherche |
| Conseiller d’orientation | Compléter | FavorisClient, API analytics et repository Prisma |
| RGPD Scan | Compléter | Checkout, webhook, export PDF et envoi du rapport |
| KeepSurfing | Compléter | API GitHub, délais et erreurs réseau |

Les trois premiers projets disposent maintenant de suites ajoutées sur les branches `codex/qa-coverage`, publiées dans leurs PR GitHub. Les mesures affichées portent sur ces commits en revue, avec 100 % pour les lignes, instructions, fonctions et branches. Les services de Bordeaux Bouge sont simulés ; sa suite navigateur utilise des événements et réponses API de test. Les rapports ne prétendent pas vérifier les fournisseurs en production. Les priorités de CartoRisques et du Conseiller d’orientation proviennent notamment des rapports de couverture **unitaires** : les zones citées peuvent déjà être traversées par des E2E. Pour RGPD Scan et KeepSurfing, les suites inspectées ne testent pas les routes API citées.

Les fiches distinguent les tests à écrire des actions de mesure et d’exécution. RGPD Scan nécessite un rapport de couverture et l’exécution de sa suite navigateur ; KeepSurfing, le relevé de sa suite visuelle ; CartoRisques, les résultats Python API/ETL ; le Conseiller d’orientation, ses résultats E2E. L’absence de ces rapports n’est pas une preuve d’absence de tests.

Les recommandations précises correspondent à la version inspectée. Quand la collecte détecte un nouveau commit, les anciennes recommandations ne sont plus présentées comme des lacunes vérifiées ; le classement utilise les nouvelles métriques disponibles, ou demande une mesure.
