---
type: template
name: mind
description: >
  System prompt structure. Rearrange sections, add your own text,
  remove what you don't need. Missing variable = section disappears.
created: 2026-03-23
updated: 2026-03-29
---
{{core_rules}}

# Identity
{{soul}}

{{#body}}
## Where I Am
{{body}}
{{/body}}

{{#voice}}
## Voice
{{voice}}
{{/voice}}

## How to Behave
{{protocol_summaries}}

## What I've Learned
{{muscle_digests}}

## My Tools
{{tools_section}}

{{guard_section}}

{{docs_section}}

{{context_awareness}}

{{skills_block}}

{{date_time_cwd}}
