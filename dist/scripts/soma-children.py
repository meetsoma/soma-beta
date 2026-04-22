#!/usr/bin/env python3
"""soma-children — list / tail / kill / watch background soma children.

Source of truth: ~/.soma/state/children.json (written by delegate(background:true)).
Pane scan (tmux + cmux) is the *enrichment* layer — it adds live statusline
data (model, ctx, cost, turns) to children that are already in the registry.

A pane NOT in the registry is not a child. It's the user's own soma session,
a sibling, or an unrelated terminal. The dashboard ignores it.

Do not re-add pane-scan as the primary classifier — reverted s01-f6e928 (SX-557).
That heuristic picked up the user's own Opus session as an over-budget child
because the parent was running in a pane it didn't recognize as "caller".
Registry-first fixes that without any parent-detection heuristics.

Subcommands:
  list          (default) — table of all children
  tail ID [N]   — last N lines of a child's pane
  kill ID       — terminate a child
  focus ID      — focus a cmux pane (tmux: prints attach hint)
  watch [INT]   — flicker-free TUI dashboard, refresh every INT seconds (default 2)
  tail-loop ID  — flicker-free continuous tail of one child

Child IDs:
  tmux:<session-name>
  cmux:<surface-ref>

Environment:
  SOMA_CHILDREN_PARENT=<surface>     exclude parent pane (cmux surface ref)
  SOMA_CHILDREN_BUDGET=<dollars>     per-child budget for warn coloring (default 1.00)
  SOMA_CHILDREN_REGISTRY=<path>      override registry path (default ~/.soma/state/children.json)
  SOMA_CHILDREN_STRICT=0|1           if 1 (default), skip panes not in registry;
                                     if 0, fall back to legacy pane-scan behavior
                                     (useful for workspaces that don't use delegate)
"""

from __future__ import annotations
import json, os, re, signal, subprocess, sys, time, shutil
from datetime import datetime
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────
PER_CHILD_BUDGET = float(os.environ.get("SOMA_CHILDREN_BUDGET", "1.00"))
PARENT_SURFACE = os.environ.get("SOMA_CHILDREN_PARENT", "")
# Resolve paths relative to the agent install or the user's project, not
# a hardcoded developer workstation path. Priority:
#   1. SOMA_AGENT_DIR env var
#   2. ~/.soma/agent (standard install symlink)
#   3. walk up from this script
#
# cmux integration is optional — tmux is used unconditionally when
# available. If neither is present the dashboard shows an empty list.
def _find_agent_dir() -> Path | None:
    env = os.environ.get("SOMA_AGENT_DIR")
    if env and Path(env).is_dir():
        return Path(env)
    standard = Path.home() / ".soma" / "agent"
    if standard.is_dir():
        return standard
    # Walk up from this script looking for repos/agent or extensions/
    here = Path(__file__).resolve().parent
    for p in [here, *here.parents]:
        if (p / "extensions").is_dir() and (p / "package.json").is_file():
            return p
        if (p / "repos" / "agent" / "extensions").is_dir():
            return p / "repos" / "agent"
    return None

AGENT_DIR = _find_agent_dir()
# cmux is a dev-only helper; shipped users may not have it. Falls back
# gracefully when missing.
_CMUX_CANDIDATES = []
if AGENT_DIR:
    _CMUX_CANDIDATES = [
        AGENT_DIR / "scripts" / "_dev" / "soma-cmux.sh",
        AGENT_DIR / "scripts" / "soma-cmux.sh",
    ]
CMUX_SH = next((p for p in _CMUX_CANDIDATES if p.is_file()), Path("/nonexistent"))
REGISTRY_PATH = Path(os.environ.get(
    "SOMA_CHILDREN_REGISTRY",
    str(Path.home() / ".soma" / "state" / "children.json"),
))
STRICT_REGISTRY = os.environ.get("SOMA_CHILDREN_STRICT", "1") == "1"

# ── Registry (source of truth) ────────────────────────────────────────
def load_registry() -> dict:
    """Read children.json. Returns dict with children / active_surfaces /
    active_sessions / by_surface / by_session / missing.

    Only entries with status in {spawning, running} are considered active.
    Completed/aborted/error children are ignored by the dashboard.
    """
    blank = {
        "children": [], "active_surfaces": set(), "active_sessions": set(),
        "by_surface": {}, "by_session": {}, "missing": True,
    }
    if not REGISTRY_PATH.exists():
        return blank
    try:
        raw = json.loads(REGISTRY_PATH.read_text())
    except Exception:
        return blank
    children = raw.get("children", []) if isinstance(raw, dict) else []
    active = [c for c in children if c.get("status") in ("spawning", "running")]
    surfaces = {c["surface"] for c in active if c.get("surface")}
    sessions = {c["session_id"] for c in active if c.get("session_id")}
    by_surface = {c["surface"]: c for c in active if c.get("surface")}
    by_session = {c["session_id"]: c for c in active if c.get("session_id")}
    return {
        "children": active, "active_surfaces": surfaces, "active_sessions": sessions,
        "by_surface": by_surface, "by_session": by_session, "missing": False,
    }

# ── ANSI ────────────────────────────────────────────────────────────────────
RESET, BOLD, DIM = "\033[0m", "\033[1m", "\033[2m"
RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, GRAY = (
    "\033[31m", "\033[32m", "\033[33m", "\033[34m", "\033[35m", "\033[36m", "\033[90m"
)
HOME, CLR_LN, CLR_END = "\033[H", "\033[K", "\033[J"
HIDE_C, SHOW_C = "\033[?25l", "\033[?25h"
ANSI_RE = re.compile(r"\033\[[0-9;?]*[a-zA-Z]")

def visible_len(s: str) -> int:
    return len(ANSI_RE.sub("", s))

def pad(s: str, width: int) -> str:
    return s + " " * max(0, width - visible_len(s))

# ── Source 1: tmux ──────────────────────────────────────────────────────────
def list_tmux_panes() -> list[dict]:
    """Each tmux pane → dict with id, alive, current_command, pid."""
    try:
        out = subprocess.run(
            ["tmux", "list-panes", "-a", "-F",
             "#{session_name}|#{pane_pid}|#{pane_current_command}|#{pane_dead}"],
            capture_output=True, text=True, timeout=2,
        ).stdout
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []
    panes = []
    for line in out.strip().splitlines():
        try:
            sess, pid, cmd, dead = line.split("|")
        except ValueError:
            continue
        # Alive = not dead AND foreground is soma (or any node process — soma is node)
        alive = (dead == "0") and (cmd in ("node", "soma", "bun"))
        panes.append({
            "id": f"tmux:{sess}",
            "alive": alive,
            "current_command": cmd,
            "pid": pid,
        })
    return panes

def _capture_tmux(sess: str, lines: int) -> str:
    try:
        out = subprocess.run(
            ["tmux", "capture-pane", "-t", sess, "-p"],
            capture_output=True, text=True, timeout=2,
        ).stdout
        return "\n".join(out.split("\n")[-lines:])
    except Exception:
        return ""

# ── Source 2: cmux ──────────────────────────────────────────────────────────
def cmux_status() -> dict | None:
    if not CMUX_SH.exists():
        return None
    try:
        out = subprocess.run(
            ["bash", str(CMUX_SH), "status"],
            capture_output=True, text=True, timeout=3,
        ).stdout
    except subprocess.TimeoutExpired:
        return None
    # Extract Identity JSON block: find '## Identity' header, then the next '{'
    # and walk braces to find the matching outer '}'.
    identity = {}
    hdr = out.find("## Identity")
    if hdr != -1:
        brace = out.find("{", hdr)
        if brace != -1:
            depth = 0
            end = brace
            while end < len(out):
                if out[end] == "{": depth += 1
                elif out[end] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                end += 1
            try:
                identity = json.loads(out[brace:end+1])
            except json.JSONDecodeError:
                pass
    surfaces = sorted(set(re.findall(r"surface:\d+", out)))
    return {"identity": identity, "surfaces": surfaces, "raw": out}

def capture_cmux_surface(surf: str, lines: int = 30) -> str:
    if not CMUX_SH.exists():
        return ""
    try:
        return subprocess.run(
            ["bash", str(CMUX_SH), "capture", surf, str(lines)],
            capture_output=True, text=True, timeout=3,
        ).stdout
    except subprocess.TimeoutExpired:
        return ""

# ── Statusline parser ──────────────────────────────────────────────────────
# Format (last 3 visible lines of any soma TUI):
#   ╭──Sonnet-4.6 • medium─◉8%─$1.00─◷3:44─♥on
#   │  🌿soma ✓cache ¶32 📋s01-ca394f 📝3
#   ╰─ ~/Gravicity/meetsoma 7m00s
def parse_statusline(text: str) -> dict | None:
    if not text:
        return None
    # Find the last block (most recent statusline)
    # Look for: line with model + ◉ AND line with 📋 session AND line ending with runtime
    lines = text.splitlines()
    model = ctx = cost = turns = session = runtime = None
    for line in reversed(lines):
        if model is None:
            m = re.search(r"(Opus|Sonnet|Haiku)-[\d.]+", line)
            if m: model = m.group(0)
        if ctx is None:
            m = re.search(r"◉(\d+)%", line)
            if m: ctx = m.group(1) + "%"
        if cost is None:
            m = re.search(r"\$(\d+\.\d+)", line)
            if m: cost = "$" + m.group(1)
        if turns is None:
            m = re.search(r"¶(\d+)", line)
            if m: turns = m.group(1)
        if session is None:
            m = re.search(r"s01-[a-f0-9]+", line)
            if m: session = m.group(0)
        if runtime is None:
            # Runtime is the last whitespace-separated token on a cwd line.
            # Patterns: "9s", "2m", "1m23s", "7m05s", "1h2m", "2h38m"
            m = re.search(r"\b(\d+h\d+m?|\d+m\d*s?|\d+s)\b\s*$", line.rstrip())
            if m: runtime = m.group(1)
    if not model:
        return None
    return {
        "model":   model,
        "ctx":     ctx     or "?",
        "cost":    cost    or "$0.00",
        "turns":   turns   or "0",
        "session": session or "?",
        "runtime": runtime or "?",
    }

# ── Build child list ───────────────────────────────────────────────────────
def gather_children() -> tuple[list[dict], dict]:
    """Returns (children, meta). meta has parent_surface, parent_session, registry_missing.

    SX-557: registry is source of truth. A pane is a CHILD only if its surface
    or session is in ~/.soma/state/children.json. In strict mode (default),
    unregistered panes are skipped. If the registry doesn't exist, fall back
    to the legacy pane-scan so pre-SX-553 workspaces still work.
    """
    registry = load_registry()
    parent_surface = PARENT_SURFACE
    parent_session = None

    # Strict mode only applies when a registry file actually exists. An empty
    # children[] array is still a valid "no active children" signal. A missing
    # file means the user hasn't used delegate; skip strict filtering.
    use_strict = STRICT_REGISTRY and not registry["missing"]

    def in_registry(surface: str = "", session: str = "") -> bool:
        return (
            (bool(surface) and surface in registry["active_surfaces"])
            or (bool(session) and session in registry["active_sessions"])
        )

    cmux = cmux_status()
    if cmux:
        if not parent_surface:
            # 'caller' = the cmux pane that ran this script (true parent).
            # 'focused' would be wherever the user clicked, not always us.
            parent_surface = (
                cmux["identity"].get("caller", {}).get("surface_ref", "")
                or cmux["identity"].get("focused", {}).get("surface_ref", "")
            )
        if parent_surface:
            pcap = capture_cmux_surface(parent_surface, 8)
            sm = re.search(r"s01-[a-f0-9]+", pcap)
            parent_session = sm.group(0) if sm else None

    children = []

    # Markers that indicate a pane is running our own monitoring tools.
    # If any are in the capture, the pane is a sibling monitor, not a child.
    SELF_MARKERS = (
        "┌─ soma children",     # watch dashboard frame
        "┌─ tail:",             # tail-loop frame (header)
        "└─ tail-loop monitor",  # tail-loop frame (footer — always in last lines)
        "soma children monitor",  # legacy bash watcher
        "soma children tail-loop",
        "=== tail: ",
        "soma-children.py watch",      # process command line visible in shell prompt
        "soma-children.py tail-loop",
    )

    # tmux children
    for pane in list_tmux_panes():
        cap = _capture_tmux(pane["id"][len("tmux:"):], 30)
        if any(m in cap for m in SELF_MARKERS):
            continue
        s = parse_statusline(cap)
        if not s:
            continue
        if use_strict and not in_registry(session=s.get("session", "")):
            continue
        # tmux gives us a real liveness signal — trust it
        entry = {"id": pane["id"], "alive": pane["alive"], **s}
        reg = registry["by_session"].get(s.get("session", ""))
        if reg:
            entry["role"] = reg.get("role")
            entry["child_id"] = reg.get("id")
        children.append(entry)

    # cmux children
    if cmux:
        for surf in cmux["surfaces"]:
            if surf == parent_surface:
                continue
            cap = capture_cmux_surface(surf, 30)
            if any(m in cap for m in SELF_MARKERS):
                continue
            s = parse_statusline(cap)
            if not s:
                continue
            # De-dup: skip if session matches parent's (scrollback echo)
            if parent_session and s["session"] == parent_session:
                continue
            # Registry filter (SX-557): strict mode requires pane in registry
            if use_strict and not in_registry(surface=surf, session=s.get("session", "")):
                continue
            # Liveness for cmux: capture twice, see if content changes
            time.sleep(0.3)
            cap2 = capture_cmux_surface(surf, 5)
            alive = (cap.split("\n")[-5:] != cap2.split("\n")[-5:]) or (
                # Heuristic: if last non-empty line contains "♥" (heart, soma keepalive marker), alive
                any("♥" in ln for ln in cap.splitlines()[-3:])
            )
            entry = {"id": f"cmux:{surf}", "alive": alive, **s}
            reg = registry["by_surface"].get(surf) or registry["by_session"].get(s.get("session", ""))
            if reg:
                entry["role"] = reg.get("role")
                entry["child_id"] = reg.get("id")
            children.append(entry)

    return children, {
        "parent_surface": parent_surface,
        "parent_session": parent_session,
        "registry_missing": registry["missing"],
        "registry_active_count": len(registry["children"]),
        "strict": use_strict,
    }

# ── Coloring helpers ───────────────────────────────────────────────────────
def color_status(alive: bool) -> str:
    return f"{GREEN}● alive{RESET}" if alive else f"{RED}✗ DEAD{RESET}"

def color_model(m: str) -> str:
    if m.startswith("Opus"):   return f"{MAGENTA}{BOLD}{m}{RESET}"
    if m.startswith("Sonnet"): return f"{BLUE}{m}{RESET}"
    if m.startswith("Haiku"):  return f"{CYAN}{m}{RESET}"
    return f"{GRAY}{m}{RESET}"

def color_cost(cost_str: str) -> str:
    try:
        cost = float(cost_str.lstrip("$"))
    except ValueError:
        return f"{GRAY}{cost_str}{RESET}"
    if cost > PER_CHILD_BUDGET:           return f"{RED}{BOLD}{cost_str}{RESET}"
    if cost > PER_CHILD_BUDGET / 2:       return f"{YELLOW}{cost_str}{RESET}"
    return f"{GREEN}{cost_str}{RESET}"

def render_bar(cost_str: str) -> str:
    try:
        cost = float(cost_str.lstrip("$"))
    except ValueError:
        return " " * 10
    pct_raw = cost / PER_CHILD_BUDGET
    over = pct_raw > 1.0
    filled = min(int(pct_raw * 10), 10)
    color = RED if over else (YELLOW if pct_raw > 0.5 else GREEN)
    bar = "█" * filled + "·" * (10 - filled)
    if over:
        return f"{color}{bar}{RESET} {RED}{BOLD}OVER{RESET}"
    return f"{color}{bar}{RESET}"

# ── Commands ──────────────────────────────────────────────────────────────
def cmd_list() -> int:
    children, meta = gather_children()
    if not children:
        if meta["parent_session"]:
            print(f"no children. (parent: {meta['parent_session']} @ {meta['parent_surface']})")
        else:
            print("no soma children running.")
        print()
        print("spawn:")
        print("  tmux new-session -d -s NAME -c $(pwd)")
        print("  tmux send-keys -t NAME 'soma --model claude-haiku-4-5' Enter")
        print()
        print("  bash soma-cmux.sh split right")
        print("  soma-cmux.sh run <surface> 'soma --model X'")
        return 0

    cw = {"id": 22, "status": 9, "model": 12, "ctx": 5, "cost": 7, "bar": 16, "turns": 5, "session": 13, "runtime": 7}
    headers = ["ID", "STATUS", "MODEL", "CTX", "COST", "BURN", "TURNS", "SESSION", "RUNTIME"]
    keys = ["id", "status", "model", "ctx", "cost", "bar", "turns", "session", "runtime"]
    widths = [cw[k] for k in keys]
    print("  " + "  ".join(pad(h, w) for h, w in zip(headers, widths)))
    print("  " + "  ".join("─" * w for w in widths))
    total = 0.0
    for c in children:
        row_vals = [
            c["id"],
            color_status(c["alive"]),
            color_model(c["model"]),
            c["ctx"],
            color_cost(c["cost"]),
            render_bar(c["cost"]),
            c["turns"],
            c["session"],
            c["runtime"],
        ]
        print("  " + "  ".join(pad(v, w) for v, w in zip(row_vals, widths)))
        try:
            total += float(c["cost"].lstrip("$"))
        except ValueError:
            pass
    print()
    print(f"  {len(children)} children    total: ${total:.2f}    budget/child: ${PER_CHILD_BUDGET:.2f}")
    return 0

def cmd_tail(args: list[str]) -> int:
    if not args:
        print("usage: soma children tail <id> [lines]"); return 2
    cid = args[0]
    n = int(args[1]) if len(args) > 1 else 30
    if cid.startswith("tmux:"):
        print(_capture_tmux(cid[5:], n))
    elif cid.startswith("cmux:"):
        print(capture_cmux_surface(cid[5:], n))
    else:
        print(f"unknown id format: {cid}")
        return 2
    return 0

def cmd_kill(args: list[str]) -> int:
    if not args:
        print("usage: soma children kill <id>"); return 2
    cid = args[0]
    if cid.startswith("tmux:"):
        return subprocess.run(["tmux", "kill-session", "-t", cid[5:]]).returncode
    if cid.startswith("cmux:") and CMUX_SH.exists():
        return subprocess.run(["bash", str(CMUX_SH), "close", cid[5:]]).returncode
    print(f"unknown id format: {cid}"); return 2

def cmd_focus(args: list[str]) -> int:
    if not args:
        print("usage: soma children focus <id>"); return 2
    cid = args[0]
    if cid.startswith("tmux:"):
        print(f"headless tmux — attach with: tmux attach -t {cid[5:]}")
        return 0
    if cid.startswith("cmux:") and CMUX_SH.exists():
        return subprocess.run(["bash", str(CMUX_SH), "focus-pane", cid[5:]]).returncode
    return 2

# ── Watch (flicker-free TUI dashboard) ─────────────────────────────────────
def build_watch_frame() -> str:
    children, meta = gather_children()
    cols = shutil.get_terminal_size((100, 30)).columns
    width = min(cols, 110)
    now = datetime.now().strftime("%H:%M:%S")
    title = " soma children "
    bar = "─" * max(0, width - len(title) - len(f" {now} ─┐") - 2)
    lines = [f"{BOLD}┌─{title}{bar} {now} ─┐{RESET}", ""]

    if not children:
        if meta["parent_session"]:
            lines.append(f"  {DIM}no children. parent: {meta['parent_session']}{RESET}")
        else:
            lines.append(f"  {DIM}no soma children running.{RESET}")
        lines.append("")
        lines.append(f"  {GRAY}spawn:{RESET}")
        lines.append(f"    {GRAY}tmux new-session -d -s NAME -c $(pwd){RESET}")
        lines.append(f"    {GRAY}tmux send-keys -t NAME 'soma --model claude-haiku-4-5' Enter{RESET}")
    else:
        cw = {"id": 22, "status": 9, "model": 12, "ctx": 5, "cost": 7, "bar": 16, "turns": 5, "session": 13, "runtime": 7}
        headers = [("ID", "id"), ("STATUS", "status"), ("MODEL", "model"), ("CTX", "ctx"),
                   ("COST", "cost"), ("BURN", "bar"), ("TURNS", "turns"), ("SESSION", "session"),
                   ("RUNTIME", "runtime")]
        widths = [cw[k] for _, k in headers]
        lines.append("  " + "  ".join(pad(f"{BOLD}{h}{RESET}", w) for (h, _), w in zip(headers, widths)))
        lines.append("  " + "  ".join(f"{GRAY}{'─'*w}{RESET}" for w in widths))
        total = 0.0
        alerts = []
        for c in children:
            row = [
                c["id"], color_status(c["alive"]), color_model(c["model"]),
                c["ctx"], color_cost(c["cost"]), render_bar(c["cost"]),
                c["turns"], c["session"], c["runtime"],
            ]
            lines.append("  " + "  ".join(pad(v, w) for v, w in zip(row, widths)))
            try:
                v = float(c["cost"].lstrip("$"))
                total += v
                if v > PER_CHILD_BUDGET:
                    alerts.append(f"{c['id']} over budget (${v:.2f})")
            except ValueError:
                pass
        lines.append("")
        cs = f"{RED}{BOLD}${total:.2f}{RESET}" if total > PER_CHILD_BUDGET else f"{GREEN}${total:.2f}{RESET}"
        lines.append(f"  {BOLD}{len(children)} children{RESET}    total: {cs}    "
                     f"{DIM}budget/child: ${PER_CHILD_BUDGET:.2f}{RESET}")
        if alerts:
            lines.append("")
            lines.append(f"  {BOLD}{YELLOW}⚠ alerts:{RESET}")
            for a in alerts:
                lines.append(f"    {YELLOW}• {a}{RESET}")
    lines.append("")
    lines.append(f"  {DIM}ctrl+c to stop{RESET}")
    return HOME + "\n".join(line + CLR_LN for line in lines) + CLR_END

def cmd_watch(args: list[str]) -> int:
    interval = float(args[0]) if args else 2.0
    sys.stdout.write(HIDE_C + HOME + CLR_END)

    def on_exit(*_):
        sys.stdout.write(SHOW_C + "\n"); sys.stdout.flush(); sys.exit(0)
    signal.signal(signal.SIGINT, on_exit)
    signal.signal(signal.SIGTERM, on_exit)

    try:
        while True:
            sys.stdout.write(build_watch_frame()); sys.stdout.flush()
            time.sleep(interval)
    except KeyboardInterrupt:
        on_exit()
    return 0

# ── Tail-loop (flicker-free single-child tail) ─────────────────────────────
def pick_first_child() -> str | None:
    children, _ = gather_children()
    for c in children:
        if c["alive"]:
            return c["id"]
    return None

def cmd_tail_loop(args: list[str]) -> int:
    fixed_id = args[0] if args else None     # tail a specific child if given, else auto
    n = int(args[1]) if len(args) > 1 else 25
    interval = float(args[2]) if len(args) > 2 else 2.0
    sys.stdout.write(HIDE_C + HOME + CLR_END)

    def on_exit(*_):
        sys.stdout.write(SHOW_C + "\n"); sys.stdout.flush(); sys.exit(0)
    signal.signal(signal.SIGINT, on_exit)
    signal.signal(signal.SIGTERM, on_exit)

    try:
        while True:
            cid = fixed_id or pick_first_child()
            now = datetime.now().strftime("%H:%M:%S")
            if not cid:
                content = (f"{BOLD}┌─ tail: idle ─ {now} ─┐{RESET}\n\n"
                           f"  {DIM}no child to tail.{RESET}\n\n"
                           f"  {GRAY}repolling… spawn one:{RESET}\n"
                           f"    {GRAY}tmux new-session -d -s NAME -c $(pwd){RESET}\n"
                           f"    {GRAY}tmux send-keys -t NAME 'soma --model claude-haiku-4-5' Enter{RESET}\n\n"
                           f"{DIM}└─ tail-loop monitor — ctrl+c to stop ─┘{RESET}")
            else:
                if cid.startswith("tmux:"):
                    body = _capture_tmux(cid[5:], n)
                else:
                    body = capture_cmux_surface(cid[5:], n)
                # Header AND footer with self-marker so cmux/tmux capture always
                # sees us regardless of where the visible window lands.
                content = (
                    f"{BOLD}┌─ tail: {cid} ─ {now} ─┐{RESET}\n\n"
                    f"{body}\n\n"
                    f"{DIM}└─ tail-loop monitor — ctrl+c to stop ─┘{RESET}"
                )
            frame = HOME + "\n".join(line + CLR_LN for line in content.splitlines()) + CLR_END
            sys.stdout.write(frame); sys.stdout.flush()
            time.sleep(interval)
    except KeyboardInterrupt:
        on_exit()
    return 0

# ── Dispatch ───────────────────────────────────────────────────────────────
def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    args = sys.argv[2:]
    handlers = {
        "list":      lambda: cmd_list(),
        "":          lambda: cmd_list(),
        "tail":      lambda: cmd_tail(args),
        "kill":      lambda: cmd_kill(args),
        "focus":     lambda: cmd_focus(args),
        "watch":     lambda: cmd_watch(args),
        "tail-loop": lambda: cmd_tail_loop(args),
        "help":      lambda: (print(__doc__), 0)[1],
        "-h":        lambda: (print(__doc__), 0)[1],
        "--help":    lambda: (print(__doc__), 0)[1],
    }
    h = handlers.get(cmd)
    if not h:
        print(f"unknown subcommand: {cmd}")
        print("try: soma children [list|tail|kill|focus|watch|tail-loop|help]")
        sys.exit(2)
    sys.exit(h())

if __name__ == "__main__":
    main()
