# Compatibility

## Supported Prettier Versions

The package declares Prettier as a peer dependency:

```json
{
 "peerDependencies": {
  "prettier": "^3.0.0"
 }
}
```

The release verification flow runs the normal test suite against the current
latest Prettier version through `npm run test:prettier-latest`. Use
`npm run test:versions` when validating recent published Prettier 3 minor
versions before a higher-risk release.

## Supported Parsers

The plugin wraps the bundled Prettier parsers for:

- `babel`
- `babel-ts`
- `json`
- `json5`
- `typescript`

The wrapped parser delegates to matching companion plugin preprocessors before
the multiline-array printer runs.

## Known Plugin Interactions

`prettier-plugin-organize-imports` should be listed before this plugin so import
organization runs before multiline array printing.

`prettier-plugin-sort-json` can also be listed before this plugin. The plugin
contains specific handling for package-json printing so package metadata remains
compatible with the package-json Prettier plugin.

## Runtime Dependencies

Do not add dependencies copied from related repositories unless source code
imports them directly or emitted declaration files expose their types. This repo
currently does not import `type-fest`/`typefest`, so it should not be added as a
production dependency.
