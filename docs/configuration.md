# Configuration

## Installation

Install Prettier and this plugin in the project that owns the Prettier config:

```sh
npm install --save-dev prettier prettier-plugin-multiline-arrays-2
```

Then add the plugin to a Prettier config:

```js
export default {
 plugins: ["prettier-plugin-multiline-arrays-2"],
};
```

## Plugin Order

When this plugin is used with parser or preprocessor plugins, place
`prettier-plugin-multiline-arrays-2` last:

```js
export default {
 plugins: [
  "prettier-plugin-organize-imports",
  "prettier-plugin-sort-json",
  "prettier-plugin-multiline-arrays-2",
 ],
};
```

Prettier chooses plugin-provided parsers by plugin order. This plugin needs its
parser wrapper to run so it can preserve the companion parser behavior and then
replace the printer with the multiline-array printer.

## Options

`multilineArraysWrapThreshold` controls when arrays are forced onto multiple
lines:

```json
{
 "multilineArraysWrapThreshold": 3
}
```

With this value, arrays with more than three elements wrap. The default is `-1`,
which disables automatic threshold wrapping.

`multilineArraysLinePattern` controls the element count for each output line:

```json
{
 "multilineArraysLinePattern": "2 1"
}
```

The pattern repeats for longer arrays. This option overrides threshold wrapping
and Prettier's normal column-based array wrapping.

## Comment Overrides

Use a next-line threshold comment to affect only the next array:

```ts
// prettier-multiline-arrays-next-threshold: 2
const values = ["alpha", "beta", "gamma"];
```

Use a set-threshold comment to affect following arrays until reset:

```ts
// prettier-multiline-arrays-set-threshold: 1
const first = ["a", "b"];
const second = ["c", "d"];
// prettier-multiline-arrays-reset
```

The line-pattern comments follow the same next/set/reset model:

```ts
// prettier-multiline-arrays-next-line-pattern: 2 1
const values = ["a", "b", "c", "d", "e"];
```
