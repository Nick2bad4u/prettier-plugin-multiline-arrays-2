# Maintenance

## Local Validation

Use these checks before releasing:

```sh
npm run build
npm run typecheck
npm run lint
npm run lint:prettier
npm run lint:package
npm run test:coverage
```

`npm run release:verify` combines those checks and also runs the latest-Prettier
compatibility test.

## Vitest Coverage

Tests run through Vitest and write coverage artifacts under `coverage/`:

- `coverage/lcov.info`
- `coverage/test-report.junit.xml`
- `coverage/test-results.json`

The CI workflow uses those artifacts for Codecov upload through the reusable
Node matrix workflow. `npm run test:ci` also writes the JUnit report when a
workflow needs test-result upload separately from coverage upload.

## Dependency Synchronization

After dependency updates, run:

```sh
npm run sync:peer-prettier-range
npm run sync:node-version-files
```

The Prettier sync script keeps `peerDependencies.prettier` aligned with the
supported Prettier major range while preserving the minimum supported Prettier 3
floor.

## Publishing

The package is configured for npm provenance:

```json
{
 "publishConfig": {
  "provenance": true,
  "registry": "https://registry.npmjs.org/"
 }
}
```

Trusted publishing should point at `.github/workflows/npm-release.yml`, which
calls the shared reusable npm release workflow with OIDC permissions enabled.
