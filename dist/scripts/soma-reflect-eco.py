#!/usr/bin/env python3
# ---
# name: soma-reflect-eco
# description: Cross-.soma OSINT timeline — search every .soma/.claude memory root
#   AND every git repo below a root for a topic, resolve dates (frontmatter >
#   filename > mtime; commits via git log), emit one chronological timeline.
# tags: [reflection, osint, timeline, cross-soma, archaeology]
# related-caps: [soma:reflect.timeline, soma:reflect.roots, soma:seam.reflect, soma:seam.timeline]
# seeded: s01-6404a9 (Curtis: "we could have done this one shot")
# ---
"""
soma-reflect-eco.py — the one-shot "what does the whole ecosystem know about X, in order?"

Usage:
  soma-reflect-eco.py <query> [--root DIR]... [--user-root] [--since YYYY-MM-DD]
                      [--limit N] [--no-git] [--regex] [--list-roots] [--json]

Defaults: --root ~/Gravicity, fixed-string case-insensitive match, limit 150 entries.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

PRUNE_DIRS = {
    "node_modules", "target", ".worktrees", ".next", "dist", "out", "build",
    "Library", "Applications", "Movies", "Music", "Pictures", ".Trash",
    "__pycache__", "venv", ".venv", "vendor",
}
# inside a memory root, skip these (external docs / binary / noise)
MEM_PRUNE = {"node_modules", "refdocs", "media", ".git", "secrets"}
MEM_DIR_NAMES = (".soma", ".claude", ".agents")  # .agents only if it has memory/
FM_DATE_RE = re.compile(r"^(?:created|date|updated)\s*:\s*[\"']?(\d{4}-\d{2}-\d{2})")
NAME_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def discover(roots, max_depth=5):
    """One walk: collect memory roots (.soma/.claude) + git repo dirs."""
    mem_roots, repos = [], []
    for root in roots:
        root = Path(root).expanduser().resolve()
        if not root.is_dir():
            continue
        base = len(root.parts)
        for dirpath, dirnames, _ in os.walk(root):
            p = Path(dirpath)
            depth = len(p.parts) - base
            if ".git" in dirnames or (p / ".git").is_file():  # repo or worktree
                repos.append(p)
            for d in list(dirnames):
                if d in MEM_DIR_NAMES:
                    cand = p / d
                    # .agents counts only when it actually holds memory
                    if d != ".agents" or (cand / "memory").is_dir():
                        mem_roots.append(cand)
                    dirnames.remove(d)
            if depth >= max_depth:
                dirnames[:] = []
                continue
            dirnames[:] = [
                d for d in dirnames
                if d not in PRUNE_DIRS and not d.startswith(".")
            ]
    # dedup, keep order
    seen, out_m = set(), []
    for m in mem_roots:
        if m not in seen:
            seen.add(m)
            out_m.append(m)
    return out_m, repos


def rg_hits(query, mem_root, regex):
    cmd = ["rg", "-li", "--no-messages", "-g", "*.md"]
    for d in MEM_PRUNE:
        cmd += ["-g", f"!{d}/**"]
    if not regex:
        cmd.append("-F")
    cmd += ["--", query, str(mem_root)]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return [Path(l) for l in r.stdout.splitlines() if l.strip()]
    except Exception:
        return []


def file_date(path, text_head):
    for line in text_head:
        m = FM_DATE_RE.match(line.strip())
        if m:
            return m.group(1), "fm"
    m = NAME_DATE_RE.search(path.name)
    if m:
        return m.group(1), "name"
    try:
        import datetime
        return datetime.date.fromtimestamp(path.stat().st_mtime).isoformat(), "mtime"
    except Exception:
        return "0000-00-00", "?"


def categorize(rel):
    s = str(rel)
    for key, cat in (
        ("memory/sessions", "session"), ("memory/preloads", "preload"),
        ("memory/notes", "note"), ("memory/", "memory"), ("body/", "body"),
        ("cycles/", "cycle"), ("plans/", "plan"), ("docs/", "doc"),
        ("inbox/", "inbox"), ("skills/", "skill"), ("amps/", "amps"),
    ):
        if key in s:
            return cat
    return "file"


def scan_file(path, query, regex):
    """Return (date, date_src, category, hit_count, snippet)."""
    try:
        lines = path.read_text(errors="replace").splitlines()
    except Exception:
        return None
    pat = re.compile(query if regex else re.escape(query), re.I)
    count, snippet = 0, ""
    for ln in lines:
        if pat.search(ln):
            count += 1
            if not snippet:
                snippet = ln.strip()[:110]
    if count == 0:
        return None
    date, src = file_date(path, lines[:20])
    return date, src, count, snippet


def git_toplevel(repo):
    try:
        r = subprocess.run(["git", "-C", str(repo), "rev-parse", "--show-toplevel"],
                           capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or None
    except Exception:
        return None


def repo_commits(repo, query, since):
    cmd = ["git", "-C", str(repo), "log", "--all", "-i", "--grep", query,
           "--date=short", "--format=%ad|%h|%s", "-n", "300"]
    if since:
        cmd += ["--since", since]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        out = []
        for l in r.stdout.splitlines():
            parts = l.split("|", 2)
            if len(parts) == 3:
                out.append(tuple(parts))
        return out
    except Exception:
        return []


def find_nearest_soma(start):
    """Walk up from `start` for the nearest .soma dir — the caller's own root."""
    p = Path(start).resolve()
    for _ in range(8):
        cand = p / ".soma"
        if cand.is_dir():
            return cand
        if p.parent == p:
            break
        p = p.parent
    return None


def short_label(path, roots):
    p = str(path)
    home = str(Path.home())
    for root in roots:
        r = str(Path(root).expanduser().resolve())
        if p.startswith(r + os.sep):
            return p[len(r) + 1:]
    if p.startswith(home + os.sep):
        return "~/" + p[len(home) + 1:]
    return p


def drift_scan(mem_roots, roots, scope):
    """Same-name file discovery + md5 compare across sibling memory roots.

    distro #6 (s01-6404a9): 'our soma-tools.md = md5-identical (luck), our
    _memory.md = 77 vs 186 lines (A8 violation, silent)'. Same-name files
    under `body/` in different .soma roots drift with nothing catching it.
    Scope defaults to body/*.md (where the evidence was found) — pass
    --drift-scope to widen (e.g. amps/muscles).
    """
    import hashlib
    by_rel = {}  # rel_path -> [(root_label, full_path)]
    for m in mem_roots:
        base = m / scope
        if not base.is_dir():
            continue
        for f in sorted(base.glob("*.md")):
            rel = f"{scope}/{f.name}"
            by_rel.setdefault(rel, []).append((short_label(m, roots), f))

    drifted, identical = [], []
    for rel, entries in sorted(by_rel.items()):
        if len(entries) < 2:
            continue  # only one root has this file — nothing to compare
        hashes = {}
        for label, f in entries:
            try:
                data = f.read_bytes()
                h = hashlib.md5(data).hexdigest()[:10]
                hashes[label] = (h, len(data.splitlines()))
            except Exception as e:
                hashes[label] = (f"ERROR:{e}", 0)
        uniq_hashes = {v[0] for v in hashes.values()}
        if len(uniq_hashes) > 1:
            drifted.append((rel, hashes))
        else:
            identical.append((rel, list(hashes.values())[0][1]))
    return drifted, identical


def main():
    ap = argparse.ArgumentParser(description="Cross-.soma OSINT timeline")
    ap.add_argument("query", nargs="?")
    ap.add_argument("--root", action="append", default=[])
    ap.add_argument("--user-root", action="store_true")
    ap.add_argument("--since")
    ap.add_argument("--limit", type=int, default=150)
    ap.add_argument("--no-git", action="store_true")
    ap.add_argument("--regex", action="store_true")
    ap.add_argument("--list-roots", action="store_true")
    ap.add_argument("--drift", action="store_true", help="same-name file drift across sibling .soma roots")
    ap.add_argument("--drift-scope", default="body", help="relative dir to compare (default: body)")
    ap.add_argument("--self-root", help="only show drift touching this root (default: nearest .soma above cwd)")
    ap.add_argument("--all-roots", action="store_true", help="skip self-root filtering — full ecosystem dump")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    roots = args.root or [os.path.expanduser("~/Gravicity")]
    if args.user_root:
        roots.append(str(Path.home()))
    mem_roots, repos = discover(roots, max_depth=3 if args.user_root else 5)

    if args.drift:
        drifted, identical = drift_scan(mem_roots, roots, args.drift_scope)
        self_label = None
        if not args.all_roots:
            self_path = Path(args.self_root).expanduser().resolve() if args.self_root else find_nearest_soma(Path.cwd())
            if self_path:
                self_label = short_label(self_path, roots)
                # Filter: keep a drifted file if (a) self_label is one of the roots that has it
                #         and its hash differs from at least one sibling, or (b) self_label is
                #         MISSING a file that >=2 siblings have (coverage gap, e.g. "zero files
                #         knowing yoshi-platform existed" from the distro #6 spec).
                narrowed = []
                for rel, hashes in drifted:
                    if self_label in hashes:
                        my_hash = hashes[self_label][0]
                        if any(h != my_hash for k, (h, _) in hashes.items() if k != self_label):
                            narrowed.append((rel, hashes))
                    elif len(hashes) >= 2:
                        narrowed.append((rel, hashes))  # missing-file gap
                drifted = narrowed
                identical = []  # self-scoped view doesn't need the identical list
        if args.json:
            print(json.dumps({
                "self_root": self_label,
                "drifted": [{"path": rel, "roots": {k: {"md5": v[0], "lines": v[1]} for k, v in h.items()}} for rel, h in drifted],
                "identical": [{"path": rel, "lines": n} for rel, n in identical],
            }, indent=1))
            return
        scope_note = f"self-scoped to '{self_label}'" if self_label else "full ecosystem (--all-roots)"
        print(f"# soma-reflect-eco --drift: {len(mem_roots)} memory roots, scope '{args.drift_scope}/*.md', {scope_note}")
        if drifted:
            print(f"\n## DRIFTED ({len(drifted)}) — same relative path, different content\n")
            for rel, hashes in drifted:
                mine = " ← MISSING HERE" if self_label and self_label not in hashes else ""
                print(f"  {rel}{mine}")
                for label, (h, lines) in hashes.items():
                    marker = " *" if label == self_label else ""
                    print(f"    {label:30s} md5={h} lines={lines}{marker}")
        else:
            print("\n## DRIFTED (0) — no content mismatches touching this root's same-name files")
        if identical:
            print(f"\n## Identical ({len(identical)}) — same path, same content across roots")
            for rel, lines in identical:
                print(f"  {rel} ({lines} lines)")
        return

    # dedup repos by toplevel (worktrees collapse)
    tops, uniq_repos = set(), []
    for r in repos:
        t = git_toplevel(r)
        if t and t not in tops:
            tops.add(t)
            uniq_repos.append(Path(t))

    if args.list_roots:
        print(f"# memory roots ({len(mem_roots)}):")
        for m in mem_roots:
            print(f"  {short_label(m, roots)}")
        print(f"# git repos ({len(uniq_repos)}):")
        for r in uniq_repos:
            print(f"  {short_label(r, roots)}")
        return

    if not args.query:
        ap.error("query required (or --list-roots)")

    entries = []  # (date, sortkey, line, dict)
    for m in mem_roots:
        label = short_label(m, roots)
        for f in rg_hits(args.query, m, args.regex):
            res = scan_file(f, args.query, args.regex)
            if not res:
                continue
            date, src, count, snippet = res
            if args.since and date < args.since:
                continue
            rel = f.relative_to(m)
            cat = categorize(rel)
            entries.append((date, 0, f"{date}  [{label} {cat}]  {rel} "
                            f"({count} hit{'s' if count > 1 else ''}, {src})  — {snippet}",
                            {"date": date, "kind": "file", "root": label, "cat": cat,
                             "path": str(f), "hits": count, "snippet": snippet}))

    if not args.no_git:
        for r in uniq_repos:
            label = short_label(r, roots)
            for date, sha, subj in repo_commits(r, args.query, args.since):
                if args.since and date < args.since:
                    continue
                entries.append((date, 1, f"{date}  [{label} commit]  {sha}  {subj[:100]}",
                                {"date": date, "kind": "commit", "repo": label,
                                 "sha": sha, "subject": subj}))

    entries.sort(key=lambda e: (e[0], e[1]))
    omitted = 0
    if len(entries) > args.limit:
        omitted = len(entries) - args.limit
        entries = entries[-args.limit:]  # keep most recent

    if args.json:
        print(json.dumps([e[3] for e in entries], indent=1))
        return

    print(f"# soma-reflect-eco: \"{args.query}\" — {len(mem_roots)} memory roots, "
          f"{len(uniq_repos)} repos{', since ' + args.since if args.since else ''}")
    if omitted:
        print(f"# ({omitted} older entries omitted — raise --limit or add --since)")
    prev = None
    for date, _, line, _ in entries:
        if date != prev:
            print()
            prev = date
        print(line)
    if not entries:
        print("(no hits)")


if __name__ == "__main__":
    main()
