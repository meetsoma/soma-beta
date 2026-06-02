# Body Update — Version-Aware Compare & Update

You are running the `/body update` workflow. Your job: compare the user's body files against the latest shipping templates using version numbers, and help them selectively update.

## Core Principle

**Templates are versioned.** Each shipping template has `soma_template_version: X.Y.Z` in its frontmatter. User files may have the same field (if created from a template) or no version (if created before versioning was added, or created manually).

**Customized files are marked.** A user file with `customized: true` in frontmatter means the user has intentionally modified it and it should never be auto-overwritten.

## Step 1: Locate Sources

Shipping templates (latest version):

```bash
ls <agentDir>/dist/templates/default/
```

Or if running from repo:
```bash
ls <agentDir>/templates/default/
```

User's body files:
```bash
ls .soma/body/
```

## Step 2: Read Both Sides

For each shipping template file (skip `_boot.md` and `_first-breath.md`):

1. Read the shipping template — note its `soma_template_version` from frontmatter
2. Check if the user has a corresponding file in `.soma/body/`
3. If yes — read it and check frontmatter for `soma_template_version` and `customized`

## Step 3: Classify

| User State | Classification | Action |
|---|---|---|
| File doesn't exist | **Missing** | Offer to create (one-line summary of what it does) |
| User version == shipping version | **Current** | Nothing to update |
| User version < shipping version, no `customized: true` | **Update available (stock)** | Show what's new, recommend update |
| User version < shipping version, `customized: true` | **Update available (customized)** | Show what changed, ask user to review — never auto-update |
| No version field, file exists | **Legacy (pre-versioning)** | Treat as stock unless content differs significantly from old templates. Err on side of caution — ask. |
| User version > shipping version | **Ahead** | Shouldn't happen. Note it and skip. |

## Step 4: Present Summary

Before touching anything, present a table:

```
| File | Your Version | Latest | Status | Action |
|------|-------------|--------|--------|--------|
| body.md | — (missing) | 0.29.0 | Missing | Create — routing table pattern |
| soul.md | 0.28.0 | 0.29.0 | Update available | 2 new sections |
| core_rules.md | — | 0.29.0 | Missing | Create — behavioral defaults |
| _memory.md | 0.28.0 [customized] | 0.29.0 | Customized | Review needed |
| pulse.md | 0.29.0 | 0.29.0 | Current | — |
```

Then ask: "Update stock + create missing files? Then walk through customized ones."

## Step 5: Process Updates

**For stock/missing files:**
1. Show a one-line summary of what changed or what the file is
2. Ask user "update / skip / show diff"
3. On confirm: backup current to `.soma/body/<name>.bak-v<old_version>` (if exists), write new
4. Report what was written

**For customized files:**
1. Show what sections/patterns changed in the new template
2. Ask user "review / skip / show full diff"
3. On review: walk through each change, let user accept/reject
4. Merge with user guidance — preserve their custom content
5. Never overwrite without explicit instruction

## Step 6: Summary

```
✓ Created 2 files (body.md, core_rules.md)
✓ Updated 1 file (soul.md — v0.28.0 → v0.29.0)
✓ Skipped 1 customized (_memory.md — kept user version)
✓ 13 files already current
→ Backups at .soma/body/*.bak-v0.28.0
→ Run /rebuild to compile changes into next session
```

## Edge Cases

- **No shipping templates found**: agent may not be updated. Suggest `soma update`.
- **User has extra files not in templates**: ignore — custom additions, never touch.
- **"update all"**: apply to all stock + missing. Still list customized for review.
- **File has `customized: true`**: always show diff, never auto-update.
- **Template frontmatter has no version**: treat as v0.0.0 — always newer than user. Show summary but flag as "unversioned template — verify manually."
