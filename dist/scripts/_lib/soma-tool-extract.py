#!/usr/bin/env python3
"""Extract tool definitions from soma extension source files.

Called by soma-tool.sh as a helper. Not a user-facing script.
Env: EXT_DIR (required), MODE in {list, detail, extensions}, TOOL_NAME (for detail).

See parent for design notes (SX-558).
"""
from __future__ import annotations
import os, re, sys, glob


def unquote(s: str) -> str:
    if not s:
        return s
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in ('"', "'", "`"):
        return s[1:-1]
    return s


def find_matching_brace(text: str, start: int) -> int:
    """Given text[start] == '{', return index of the matching '}'."""
    depth = 0
    in_str = None
    esc = False
    i = start
    while i < len(text):
        c = text[i]
        if esc:
            esc = False
        elif c == "\\":
            esc = True
        elif in_str:
            if c == in_str:
                in_str = None
        elif c in ('"', "'", "`"):
            in_str = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_string_field(block: str, field: str) -> str | None:
    """Extract a top-level single-line string field from a block."""
    m = re.search(
        rf'\b{field}\s*:\s*(["\'`])((?:\\.|(?!\1).)*)\1', block, re.DOTALL
    )
    if m:
        return m.group(2)
    return None


def extract_string_array(block: str, field: str) -> list[str]:
    """Extract field: [ "...", "..." ] as a list of strings."""
    m = re.search(rf"\b{field}\s*:\s*\[", block)
    if not m:
        return []
    # Position at the `[`; find its matching `]` respecting strings + nesting.
    i = m.end() - 1
    depth = 1
    in_str = None
    esc = False
    buf = ""
    i += 1
    while i < len(block):
        c = block[i]
        if esc:
            buf += c
            esc = False
        elif c == "\\":
            buf += c
            esc = True
        elif in_str:
            buf += c
            if c == in_str:
                in_str = None
        elif c in ('"', "'", "`"):
            buf += c
            in_str = c
        elif c == "[":
            buf += c
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                break
            buf += c
        else:
            buf += c
        i += 1
    # Split buf by top-level commas.
    items: list[str] = []
    cur = ""
    depth = 0
    in_str = None
    esc = False
    for c in buf:
        if esc:
            cur += c
            esc = False
            continue
        if c == "\\":
            cur += c
            esc = True
            continue
        if in_str:
            cur += c
            if c == in_str:
                in_str = None
            continue
        if c in ('"', "'", "`"):
            cur += c
            in_str = c
            continue
        if c in "([{":
            depth += 1
            cur += c
            continue
        if c in ")]}":
            depth -= 1
            cur += c
            continue
        if c == "," and depth == 0:
            if cur.strip():
                items.append(unquote(cur))
            cur = ""
            continue
        cur += c
    if cur.strip():
        items.append(unquote(cur))
    return items


def extract_parameters(block: str) -> list[dict]:
    """Parse parameters: Type.Object({ ... }) and return a list of {name, type, required, description}."""
    m = re.search(r"\bparameters\s*:\s*Type\.Object\s*\(\s*\{", block)
    if not m:
        return []
    open_brace = block.index("{", m.end() - 1)
    close = find_matching_brace(block, open_brace)
    if close < 0:
        return []
    inner = block[open_brace + 1:close]

    # Split inner by top-level commas.
    props: list[str] = []
    depth = 0
    in_str = None
    esc = False
    start = 0
    for i, c in enumerate(inner):
        if esc:
            esc = False
            continue
        if c == "\\":
            esc = True
            continue
        if in_str:
            if c == in_str:
                in_str = None
            continue
        if c in ('"', "'", "`"):
            in_str = c
            continue
        if c in "([{":
            depth += 1
            continue
        if c in ")]}":
            depth -= 1
            continue
        if c == "," and depth == 0:
            p = inner[start:i].strip()
            if p:
                props.append(p)
            start = i + 1
    last = inner[start:].strip()
    if last:
        props.append(last)

    out: list[dict] = []
    for p in props:
        name_m = re.match(r"(\w+)\s*:\s*(?:Type\.Optional\(\s*)?Type\.(\w+)", p)
        if not name_m:
            continue
        desc_m = re.search(
            r'description\s*:\s*(["\'`])((?:\\.|(?!\1).)*)\1', p, re.DOTALL
        )
        out.append({
            "name": name_m.group(1),
            "type": name_m.group(2),
            "required": "Type.Optional(" not in p,
            "description": desc_m.group(2) if desc_m else "",
        })
    return out


def collect_tools(ext_dir: str) -> dict[str, dict]:
    files = sorted(glob.glob(os.path.join(ext_dir, "*.ts")))
    if not files:
        files = sorted(glob.glob(os.path.join(ext_dir, "*.js")))
    tools: dict[str, dict] = {}
    for f in files:
        try:
            content = open(f).read()
        except Exception:
            continue
        for m in re.finditer(r"somaRegisterTool\s*\(\s*pi\s*,\s*\{", content):
            brace = content.index("{", m.end() - 1)
            close = find_matching_brace(content, brace)
            if close < 0:
                continue
            block = content[brace:close + 1]
            name = extract_string_field(block, "name")
            if not name:
                continue
            tools[name] = {
                "name": name,
                "label": extract_string_field(block, "label") or "",
                "description": extract_string_field(block, "description") or "",
                "promptSnippet": extract_string_field(block, "promptSnippet") or "",
                "promptGuidelines": extract_string_array(block, "promptGuidelines"),
                "parameters": extract_parameters(block),
                "source": os.path.basename(f),
            }
    return tools


def cmd_list(tools: dict[str, dict]) -> int:
    if not tools:
        print(f"No tools found under {os.environ.get('EXT_DIR', '?')}")
        return 0
    name_w = max(4, max(len(n) for n in tools))
    src_w = max(6, max(len(t["source"]) for t in tools.values()))
    print(f"{'name'.ljust(name_w)}  {'source'.ljust(src_w)}  description")
    print(f"{'-' * name_w}  {'-' * src_w}  {'-' * 30}")
    for n in sorted(tools):
        t = tools[n]
        snip = (t["promptSnippet"] or t["description"] or "").split("\n")[0].strip()
        if snip.startswith(n + ":"):
            snip = snip[len(n) + 1:].strip()
        if len(snip) > 120:
            snip = snip[:117] + "..."
        print(f"{n.ljust(name_w)}  {t['source'].ljust(src_w)}  {snip}")
    print()
    print(f"{len(tools)} tool(s). For the runtime-active set (after _tools.md overrides):")
    print("  start a session, call:  capabilities(op:\"list\")")
    return 0


def cmd_detail(tools: dict[str, dict], target: str) -> int:
    t = tools.get(target)
    if not t:
        close = [n for n in tools if target.lower() in n.lower()]
        print(f'No tool named "{target}".')
        if close:
            print(f"Did you mean: {', '.join(close[:5])}?")
        else:
            print("Use `soma tool` (no arg) to list all tools.")
        return 1
    label_suffix = f" — {t['label']}" if t["label"] else ""
    header = f"{t['name']}{label_suffix}"
    print(header)
    print("=" * max(10, len(header)))
    print()
    print(f"Source: extensions/{t['source']}")
    print()
    if t["description"]:
        print("Description:")
        for line in t["description"].split("\n"):
            print(f"  {line}")
        print()
    if t["promptSnippet"] and t["promptSnippet"] != t["description"]:
        print("Prompt snippet:")
        for line in t["promptSnippet"].split("\n"):
            print(f"  {line}")
        print()
    if t["promptGuidelines"]:
        print("When to use:")
        for g in t["promptGuidelines"]:
            print(f"  - {g}")
        print()
    if t["parameters"]:
        print("Parameters:")
        for p in t["parameters"]:
            flag = "required" if p["required"] else "optional"
            desc = f" — {p['description']}" if p["description"] else ""
            print(f"  {p['name']}  ({p['type']}, {flag}){desc}")
        print()
    return 0


def cmd_extensions(tools: dict[str, dict]) -> int:
    by_src: dict[str, list[str]] = {}
    for t in tools.values():
        by_src.setdefault(t["source"], []).append(t["name"])
    for src in sorted(by_src):
        print(f"{src}:")
        for n in sorted(by_src[src]):
            print(f"  - {n}")
    return 0


def main() -> int:
    ext_dir = os.environ.get("EXT_DIR", "")
    if not ext_dir:
        print("EXT_DIR env var required", file=sys.stderr)
        return 2
    mode = os.environ.get("MODE", "list")
    target = os.environ.get("TOOL_NAME", "")
    tools = collect_tools(ext_dir)
    if mode == "list":
        return cmd_list(tools)
    if mode == "detail":
        return cmd_detail(tools, target)
    if mode == "extensions":
        return cmd_extensions(tools)
    print(f"unknown mode: {mode}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
