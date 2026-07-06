# Documentation

This documentation covers the maintained `prettier-plugin-multiline-arrays-2`
fork.

## Guides

- [Configuration](./configuration.md): installation, plugin ordering, options,
  and comment overrides.
- [Compatibility](./compatibility.md): supported Prettier versions, parser
  coverage, and plugin interactions.
- [Maintenance](./maintenance.md): local validation, CI, publishing, and
  dependency synchronization.

## Quick Start

Install the package next to Prettier:

```sh
npm install --save-dev prettier prettier-plugin-multiline-arrays-2
```

Add it last in the `plugins` list:

```js
export default {
 plugins: [
  "prettier-plugin-organize-imports",
  "prettier-plugin-multiline-arrays-2",
 ],
};
```

The last-plugin position matters when another plugin provides a parser or
preprocessor for the same language. This plugin wraps the parser first, delegates
to companion preprocessors, and then applies multiline array printing.
