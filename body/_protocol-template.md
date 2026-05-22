---
name: {{name}}
type: protocol
status: active
description: "{{description}}"
heat-default: cold
applies-to: [any]
created: {{date}}
updated: {{date}}
related: []
origin: {{session}}
version: 1.0.0
author: {{author}}
license: MIT
tier: workspace
---

# {{title}}

## Summary

<!-- 2-3 sentences. What is this protocol? When does it apply? What is
     the minimum it demands of me? -->

## Trigger

<!-- What signal tells me this protocol is active? Be specific about
     the observable condition. Protocols fire on conditions; muscles
     fire on intent. -->

- …

## Steps

<!-- The ordered actions. Each step should name its own purpose, its
     success criterion, and (if applicable) what happens when it fails. -->

### 1. …

<!-- What to do, why, how to know you did it. -->

### 2. …

## Decisions

<!-- Any branch points in the protocol. Each decision should have:
       - The condition
       - The options
       - The default
       - Who/what decides (agent, user, tool output) -->

| If … | Then … | Default |
|---|---|---|
| … | … | … |

## Related

- `<related protocol>` — …
- `<related muscle>` — …
