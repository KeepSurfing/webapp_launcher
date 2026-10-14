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
Formats : `vitest`, `jest`, `playwright` (rapport JSON complet), `node-tap` (résumé TAP complet), `pytest-json`, `playwright-summary` (comptage vérifié dans un job CI lié).

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

## Mesures actualisées — 14 octobre 2026

Le libellé « Couverture du code » désigne la proportion pondérée des lignes couvertes dans les périmètres mesurés. La section « Technos » compte les tests réellement exécutés par Vitest, Playwright et pytest, hors tests ignorés. Un test Node.js pilotant Playwright est attribué à Playwright une seule fois ; Testing Library et les outils de couverture ne sont pas comptés comme des runners supplémentaires.

| Projet | Tests validés | Couverture du code mesuré | Publication |
|---|---:|---|---|
| PetSitter | 11 | 100 % : logique et composants | PR 1 |
| Toit Rénov’ | 24 | 100 % : JavaScript applicatif | PR 1 |
| Bordeaux Bouge | 75 | 100 % : métier, API et UI | PR 1 |
| KeepSurfing | 53 | 99,7 % : toutes les routes API | PR 2 |
| RGPD Scan | 93 | 96,2 % : toutes les routes API et lib/server | main |
| Orientation | 293 | 92,9 % : src, hors adaptateur et Prisma généré | PR 1 |
| CartoRisques | 200 | 98,3 % : frontend, Python exclu | PR 1 |

Les cas précédemment identifiés ont été ajoutés : API du portfolio, favoris/analytics/repository Prisma, checkout/webhook/PDF/email, analyse statique/tuiles/recherche. CartoRisques exécute 121 tests Python avec PostGIS isolé en CI, dont les 43 ignorés en local. Les trois premiers projets restent à 100 % sur leur périmètre ; les autres rapports incluent aussi les fichiers non couverts, sans réduire artificiellement leur périmètre.

La couverture de RGPD Scan fusionne les résultats unitaires Vitest et navigateur c8 par fichier source, via Istanbul. Les onze tests navigateur incluent le test parent Node.js. La mesure exclut l’interface et ne garantit aucune conformité juridique.

Le portfolio exécute six scénarios sur deux tailles d’écran (douze exécutions), dont huit comparaisons aux références PNG Chromium Linux versionnées. Heure fixe et services externes bloqués assurent leur reproductibilité. Les quatre anciennes exécutions fonctionnelles sont remplacées par cette suite complète, sans double comptage. Les 28 E2E Chromium d’Orientation passent en CI. Leur résumé de comptage est importé depuis le job GitHub lié ; le rapport détaillé n’est pas archivé.

Les versions en revue sont liées dans chaque volet. Ces zones identifiées sont maintenant exercées. Les fiches signalent les périmètres dont la couverture reste partielle, distinctement de la présence de suites de tests. Un changement de commit invalide ces recommandations précises. Les tests, la compilation et les contrôles CI passent sur les quatre versions complétées.

## Complétion des zones identifiées

122 nouveaux tests Vitest ont été ajoutés aux quatre projets. Les suites existantes ont aussi été exécutées intégralement, avec 12 contrôles visuels/fonctionnels du portfolio, 28 E2E d’Orientation, 11 E2E CartoRisques, 11 tests navigateur RGPD et 121 tests PostGIS.

Les pages, fiches métiers, métadonnées, images de partage, robots/sitemap, administration et authentification d’Orientation sont testés. Un en-tête Basic invalide ne fait plus planter /admin. CartoRisques teste MapView, le protocole statique, cache/gzip, sources, géolocalisation, partage, focus clavier et rapport officiel ; MapView, les données/API et le protocole statique atteignent 100 % des lignes dans leurs fichiers. RGPD Scan couvre configurations, protections DNS, erreurs de navigation, frames, capture et budget de temps, interface du rapport et API client en streaming. La couverture RGPD conserve son périmètre serveur ; les tests de l’interface sont comptés séparément dans l’inventaire.

Les pourcentages partiels restent visibles : ils ne sont pas arrondis artificiellement à 100 %. Le fallback défensif de countScore du portfolio est notamment sans entrée atteignable depuis des longueurs de tableaux positives. Les périmètres et versions sont documentés dans les rapports liés ; les quatre CI et leurs compilations passent.
