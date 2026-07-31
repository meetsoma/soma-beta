#!/usr/bin/env python3
# ---
# name: soma-steno
# description: STENO metrics from session JSONLs — (a) deliberation hotspots (thinking-token
#   spikes = missing-muscle map), (b) outcome-per-token ratio. Run at exhale; feed muscle
#   discovery + the state-log. Prototypes for distro proposals #2 and #5 (s01-6404a9).
# tags: [steno, telemetry, introspection, muscles, outcome-per-token]
# related-caps: [soma:seam.stats, soma:seam.reflect]
# seeded: s01-6404a9 (Curtis: "exponentializing the outcome vs token usage")
# ---
"""
Usage:
  soma-steno.py hotspots [--session <jsonl>] [--top N]     # deliberation spikes → muscle candidates
  soma-steno.py ratio    [--session <jsonl>] [--repo DIR]  # outcome-per-token, state-log-ready line
  soma-steno.py both     [...]                              # default

Session default: newest JSONL for CWD under ~/.soma/agent/sessions/ (falls back to ~/.pi/).
"""

import argparse, json, os, re, subprocess, sys
from pathlib import Path


def default_session():
    cwd_key = "--" + os.getcwd().replace("/", "-").lstrip("-") + "--"
    for base in (Path.home() / ".soma/agent/sessions", Path.home() / ".pi/agent/sessions"):
        d = base / cwd_key
        if d.is_dir():
            files = sorted(d.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
            if files:
                return files[0]
    return None


def load_turns(path):
    """Yield dicts: {think, think_txt, out_tok, tools:[names], text_head} per assistant message."""
    turns = []
    for line in open(path, errors="replace"):
        try:
            d = json.loads(line)
        except Exception:
            continue
        m = d.get("message", d) if isinstance(d, dict) else {}
        if not isinstance(m, dict) or m.get("role") != "assistant":
            continue
        t = {"think": 0, "think_txt": "", "out_tok": 0, "tools": [], "text_head": ""}
        u = m.get("usage") or {}
        t["out_tok"] = u.get("output", u.get("output_tokens", 0)) or 0
        for c in (m.get("content") or []):
            if not isinstance(c, dict):
                continue
            if c.get("type") == "thinking":
                txt = c.get("thinking", "")
                t["think"] += len(txt) // 4
                if not t["think_txt"]:
                    t["think_txt"] = txt.strip().replace("\n", " ")[:140]
            elif c.get("type") == "toolCall" or c.get("type") == "tool_use":
                t["tools"].append(c.get("name") or (c.get("tool") or {}).get("name") or "?")
            elif c.get("type") == "text" and not t["text_head"]:
                t["text_head"] = c.get("text", "").strip().replace("\n", " ")[:80]
        turns.append(t)
    return turns


def hotspots(turns, top):
    ranked = sorted(enumerate(turns), key=lambda x: x[1]["think"], reverse=True)[:top]
    total_think = sum(t["think"] for t in turns)
    print(f"# deliberation hotspots — {len(turns)} turns, ~{total_think} thinking tok total")
    print(f"# THE MAP: each spike marks where no muscle/trait existed yet. Recurring theme ≥2 → muscle candidate.")
    for i, t in ranked:
        if t["think"] == 0:
            break
        action = ",".join(t["tools"][:3]) or "(text only)"
        print(f"  turn {i:3d}  ~{t['think']:5d} tok → {action:30s} | {t['think_txt']}")


def ratio(turns, path, repo):
    out_tok = sum(t["out_tok"] for t in turns)
    think_tok = sum(t["think"] for t in turns)
    writes = sum(1 for t in turns for n in t["tools"] if n.lower() in ("write", "edit", "multiedit"))
    tool_calls = sum(len(t["tools"]) for t in turns)
    commits = 0
    try:
        since = None
        m = re.search(r"(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})", Path(path).name)
        if m:
            since = f"{m.group(1)} {m.group(2)}:{m.group(3)}"
        cmd = ["git", "-C", repo, "log", "--oneline"] + (["--since", since] if since else ["-0"])
        commits = len(subprocess.run(cmd, capture_output=True, text=True, timeout=10).stdout.splitlines())
    except Exception:
        pass
    artifacts = writes + commits
    per10k = round(artifacts / max(out_tok + think_tok, 1) * 10000, 2)
    think_share = round(think_tok / max(out_tok + think_tok, 1) * 100)
    line = (f"steno | out={out_tok} think={think_tok} ({think_share}%) | "
            f"tools={tool_calls} writes={writes} commits={commits} | "
            f"artifacts/10Ktok={per10k}")
    print(line)
    print("# state-log: amps/scripts/state-log.sh steno - \"" + line + "\"")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", nargs="?", default="both", choices=["hotspots", "ratio", "both"])
    ap.add_argument("--session")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--repo", default=".")
    a = ap.parse_args()
    path = Path(a.session) if a.session else default_session()
    if not path or not path.exists():
        sys.exit("no session JSONL found — pass --session")
    turns = load_turns(path)
    if a.mode in ("hotspots", "both"):
        hotspots(turns, a.top)
    if a.mode in ("ratio", "both"):
        print()
        ratio(turns, path, a.repo)


if __name__ == "__main__":
    main()
