# prettier-plugin-multiline-arrays-2

[![NPM license.](https://flat.badgen.net/npm/license/prettier-plugin-multiline-arrays-2?color=purple)](https://github.com/Nick2bad4u/prettier-plugin-multiline-arrays-2/blob/main/LICENSE) [![NPM total downloads.](https://flat.badgen.net/npm/dt/prettier-plugin-multiline-arrays-2?color=pink)](https://www.npmjs.com/package/prettier-plugin-multiline-arrays-2) [![Latest GitHub release.](https://flat.badgen.net/github/release/Nick2bad4u/prettier-plugin-multiline-arrays-2?color=cyan)](https://github.com/Nick2bad4u/prettier-plugin-multiline-arrays-2/releases) [![GitHub stars.](https://flat.badgen.net/github/stars/Nick2bad4u/prettier-plugin-multiline-arrays-2?color=yellow)](https://github.com/Nick2bad4u/prettier-plugin-multiline-arrays-2/stargazers) [![GitHub forks.](https://flat.badgen.net/github/forks/Nick2bad4u/prettier-plugin-multiline-arrays-2?color=orange)](https://github.com/Nick2bad4u/prettier-plugin-multiline-arrays-2/forks) [![GitHub open issues.](https://flat.badgen.net/github/open-issues/Nick2bad4u/prettier-plugin-multiline-arrays-2?color=red)](https://github.com/Nick2bad4u/prettier-plugin-multiline-arrays-2/issues) [![Codecov.](https://flat.badgen.net/codecov/github/Nick2bad4u/prettier-plugin-multiline-arrays-2?color=blue)](https://codecov.io/gh/Nick2bad4u/prettier-plugin-multiline-arrays-2) [![Repo Checks.](https://flat.badgen.net/github/checks/Nick2bad4u/prettier-plugin-multiline-arrays-2?color=green)](https://github.com/Nick2bad4u/prettier-plugin-multiline-arrays-2/actions)

Prettier plugin to force array elements to wrap onto new lines, even when there is only one element. It supports TypeScript, JavaScript, JSON, and JSON5, with options for wrap thresholds and per-line element patterns.

This is a maintained fork of [electrovir/prettier-plugin-multiline-arrays](https://github.com/electrovir/prettier-plugin-multiline-arrays). Credit to the original plugin for the core idea and implementation.

## Install

```sh
npm install --save-dev prettier-plugin-multiline-arrays-2
```

Add the plugin to your Prettier config:

```js
export default {
 plugins: ["prettier-plugin-multiline-arrays-2"],
};
```

When combining this plugin with parser/preprocessor plugins such as `prettier-plugin-organize-imports`, put `prettier-plugin-multiline-arrays-2` last. Prettier 3.9 selects the last plugin-provided parser for a parser name, and this plugin needs its parser wrapper to run so it can delegate to companion preprocessors and then apply multiline array printing.

## Options

- `multilineArraysWrapThreshold`: number. Arrays with more elements than this value are forced to wrap. The default is `-1`, which disables automatic threshold wrapping.
- `multilineArraysLinePattern`: string. Space- or comma-separated list of numbers controlling the element count per line. The pattern repeats for longer arrays. The default is `"1"`.

Example:

```json
{
 "multilineArraysWrapThreshold": 3,
 "multilineArraysLinePattern": "2 1"
}
```

## Comment Overrides

Use comments to override the next array:

```ts
// prettier-multiline-arrays-next-threshold: 4
const thresholdArray = ["a", "b", "c", "d", "e"];

// prettier-multiline-arrays-next-line-pattern: 2 1
const patternedArray = ["a", "b", "c", "d", "e"];
```

Use `set` comments to affect later arrays in a file:

```ts
// prettier-multiline-arrays-set-threshold: 5
// prettier-multiline-arrays-set-line-pattern: 2 1 3
```

Use `prettier-multiline-arrays-reset` to return to the configured defaults.

## Precedence

1. Comment overrides.
2. Manual wrapping from leading new lines or trailing commas.
3. Prettier options.
4. Default behavior.

## Development

```sh
npm ci
npm run build
npm test
npm run release:check
```

The test suite runs against Node's built-in test runner through `tsx` and includes a `test:prettier-latest` check to verify compatibility with the current npm `latest` Prettier release.

## Publishing

This package is prepared for npm trusted publishing from GitHub Actions. Before the first release, create the package on npm and add a trusted publisher with these values:

- Package: `prettier-plugin-multiline-arrays-2`
- Provider: GitHub Actions
- Repository owner: `Nick2bad4u`
- Repository name: `prettier-plugin-multiline-arrays-2`
- Workflow filename: `npm-release.yml`
- Environment: leave unset unless you add a matching GitHub environment to the workflow

The release workflow uses GitHub OIDC through `id-token: write` and publishes with provenance. It intentionally does not require an npm automation token.
