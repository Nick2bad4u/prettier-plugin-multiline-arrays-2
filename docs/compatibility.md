# Compatibility

## Supported Prettier Versions

The package declares Prettier as a peer dependency:

```json
{
 "peerDependencies": {
  "prettier": "^3.9.0"
 }
}
```

Prettier 3.9.0 is the first validated release that passes the complete test
suite, including TypeScript union wrapping. The complete suite fails on 3.7.0
and 3.8.5, while a clean 3.6.2 consumer also fails.

The release verification flow runs the complete test suite against the locked
Prettier version. It then runs `npm run test:compatibility`, which packs the
plugin and installs it into disposable consumer projects with:

- the exact minimum version allowed by `peerDependencies.prettier`; and
- the newest published Prettier version that satisfies that peer range.

Each consumer check exercises JavaScript arrays, JSON arrays, and TypeScript
unions through the installed package and verifies idempotence. The temporary
projects use strict lifecycle-script policy and are removed after both success
and failure, so compatibility checks never replace the checkout's
`node_modules` or modify its lockfile.

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

The plugin's only direct runtime dependency is `ts-extras`. Small assertion,
object, stringification, and parser-delegation helpers are implemented with
native APIs or `ts-extras` instead of pulling in general-purpose runtime
packages.

Do not add dependencies copied from related repositories unless source code
imports them directly or emitted declaration files expose their types. This repo
currently does not import `type-fest`/`typefest`, so it should not be added as a
production dependency.
