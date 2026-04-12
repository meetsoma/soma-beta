---
name: workflow
type: protocol
status: active
description: "Test before commit, commit before moving on, push before walking away. Know your deploy branch. Unpushed work is invisible — treat it as unfinished."
heat-default: cold
tags: [workflow, git, testing, deployment]
applies-to: [git]
scope: hub
tier: community
created: 2026-03-12
updated: 2026-04-12
version: 1.0.0
author: meetsoma
license: MIT
---

# Workflow Protocol

A disciplined loop for shipping code safely: test → commit → push. Every step has a reason. Skipping one creates risk that compounds silently.

## TL;DR

- **Test before commit.** Run the relevant test suite before staging. Don't commit code you haven't verified.
- **Know your deploy branch.** Identify which branch triggers deployment (`main`, `production`, `release/*`) before your first push. Ask if unsure.
- **Never leave unpushed commits.** Unpushed work is invisible to teammates, CI, and backups. If you're done working, push. If you're not ready to push, you're not done.
- **The loop:** test → commit → push. Repeat for each unit of work.

## When to Apply

Every session involving code changes. This protocol complements quality-standards (which covers commit hygiene and safety) and session-checkpoints (which covers `.soma/` state). This one is about the developer loop itself.

## Test Before Commit

Run the project's test command before `git add`. What counts as "test" depends on context:

- **Has a test suite?** Run it. `npm test`, `pytest`, `go test ./...` — whatever the project uses.
- **No test suite?** Verify manually. Build the project, check the output, confirm the change does what you intended.
- **Linter or type checker?** Run those too. A commit that fails lint is a commit that wastes CI time.

If tests fail, fix before committing. Don't commit with a "fix tests later" note — later rarely comes.

## Know Your Deploy Branch

Before your first push in any repo, identify:

1. **Which branch deploys?** (`main`, `production`, `release/*`, something custom)
2. **Is there branch protection?** (required reviews, status checks)
3. **What's the merge strategy?** (squash, rebase, merge commit)

Check `git remote -v` and the repo's CI config if unsure. Pushing to the wrong branch is the most avoidable mistake in git.

## Never Leave Unpushed Commits

Unpushed commits are a liability:

- **No backup.** Your disk fails, your work is gone.
- **No visibility.** Teammates can't see progress, CI can't validate it.
- **No continuity.** A new session (human or agent) can't build on work that only exists locally.

### Push cadence

| Situation | Action |
|-----------|--------|
| Finished a task | Push immediately |
| End of work session | Push what's ready, stash or WIP-commit the rest |
| Mid-task but stepping away | Push to a feature branch — imperfect pushes beat lost work |
| Not ready for review | Push to a draft PR or personal branch |

The only acceptable unpushed commit is one you're actively working on *right now*.

## The Loop

```
1. Make a change
2. Test it
3. Commit (atomic, descriptive message)
4. Repeat 1-3 for the next unit of work
5. Push when a logical chunk is complete
```

Small iterations. Each commit should be a coherent, tested unit. If you can't describe what a commit does in one line, it's probably too big.

## Anti-Patterns

- **"I'll test after all the changes"** — by then you won't know which change broke things.
- **"I'll push at the end of the day"** — and then you forget, and tomorrow starts with a stale remote.
- **"It works on my machine"** — push it, let CI confirm. Local-only verification is half the story.
- **Committing directly to the deploy branch** — use feature branches. The deploy branch is for reviewed, tested code.

---
