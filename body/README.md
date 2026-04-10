# body/

Default body files that ship with Soma.

## Workflow

1. **Edit in `.soma/body/public/`** — dogfood workspace, test locally
2. **Copy to `repos/agent/body/_public/`** — when ready to ship
3. **`sync-to-cli.sh`** copies `body/_public/` → `repos/cli/body/`
4. **`scaffoldBody()`** copies from `public/` into user's `.soma/body/` on init

Same pattern as protocols: `.soma/amps/protocols/public/` → `repos/agent/.soma/protocols/`.

## Structure

```
body/
├── README.md           ← this file (dev docs)
└── public/             ← source of truth for shipping
    ├── soul.md           content: default identity
    ├── journal.md        content: observation template
    ├── pulse.md          content: heartbeat tasks
    ├── _mind.md          template: system prompt structure
    ├── _memory.md        template: preload format
    ├── _body.md          template: identity writing guidance
    ├── _first-breath.md  template: first-run experience
    └── DNA.md            body documentation (the genetic blueprint) (copied to .soma/body/)
```

## Convention

- `_` prefix = template (has `{{variables}}`, defines structure)
- No prefix = content (loaded as-is into `{{filename}}` variable)
- All files have YAML frontmatter (`type`, `name`, `description`)
