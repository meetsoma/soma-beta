# Soma Beta Runtime

Compiled runtime for [Soma](https://soma.gravicity.ai) — the AI agent that remembers.

This repo contains the obfuscated runtime that `soma init` downloads. You don't need to interact with it directly.

**Version:** soma-beta 0.42.x (beta runtime). meetsoma core 0.50 is planned, est. Nov 15, 2026; this beta stays on pi 0.82. Run `soma update` to get the latest 0.42.x.

## Install

```bash
npm install -g meetsoma
soma
```

## What's Here

```
dist/
  core/index.js         — compiled core modules
  extensions/soma-*.js  — compiled extensions
  content/protocols/    — readable protocol files
```

## License

[BSL 1.1](LICENSE) — Business Source License. Converts to MIT on 2027-09-18.

[meetsoma](https://soma.gravicity.ai) · [soma.gravicity.ai](https://soma.gravicity.ai)
