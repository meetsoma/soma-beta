/**
 * Workspace Tools Extension
 *
 * Gives Soma awareness of and control over the Somaverse workspace.
 * Registers LLM-callable tools that query and manipulate the desktop
 * through the bridge server's workspace API.
 *
 * Requires:
 *   - Bridge server running on localhost:18811 (or BRIDGE_URL env)
 *   - Somaverse connected to bridge as workspace provider
 *   - For browser tools: Brave Beta with --remote-debugging-port=9333
 *
 * SEAMS:
 *   ← server/bridge.ts (HTTP API: /api/workspace/*, /api/browser/*)
 *   ← server/cdp.ts (CDP client for browser tools)
 *   → docs/extensions/bridge-connect.ts (sibling extension — TUI relay)
 *
 * Tools:
 *   workspace_status     — get panes, ports, bridges, global channels
 *   workspace_send       — route a message to a pane via seam channel
 *   workspace_connect    — create a bridge between two panes
 *   workspace_snapshot   — capture a pane's visual state
 *   browser_status       — check if agent browser is available
 *   browser_tabs         — list open browser tabs
 *   browser_navigate     — navigate a tab to a URL
 *   browser_screenshot   — capture a tab screenshot (base64)
 *   browser_evaluate     — run JavaScript in a tab
 *   browser_console      — read console log entries
 *   browser_accessibility — get accessibility tree
 *   browser_styles       — get computed CSS for a selector
 *   browser_emulate      — set viewport / device emulation
 *   browser_performance  — get performance metrics
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:18811";

async function workspaceRequest(path: string, method = "GET", body?: any, timeoutMs = 5000): Promise<any> {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BRIDGE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Workspace API ${res.status}: ${text}`);
  }
  return res.json();
}

export default function workspaceToolsExtension(pi: ExtensionAPI) {

  // ═══════════════════════════════════════════════════════════════════════
  // workspace_status — see the full desktop topology
  // ═══════════════════════════════════════════════════════════════════════

  pi.registerTool({
    name: "workspace_status",
    label: "Workspace Status",
    description:
      "Get the current Somaverse workspace topology — all panes, their seam ports, " +
      "active bridges between panes, and global broadcast channels. Use this to " +
      "understand what's on screen and how panes are connected before sending commands.",
    promptSnippet:
      "workspace_status: see all panes, their ports, active bridges, and global channels in the Somaverse workspace",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/workspace/status");
        if (!data.ok) {
          return {
            content: [{ type: "text" as const, text: `Workspace not available: ${data.error || "unknown error"}` }],
            details: data,
          };
        }

        // Format a readable summary
        const panes = data.panes || [];
        const lines: string[] = [
          `Workspace: ${panes.length} panes, ${data.bridgeCount || 0} bridges`,
          "",
        ];

        for (const pane of panes) {
          const ports = (pane.ports || []).map((p: any) => {
            const dir = p.direction === "out" ? "→" : p.direction === "in" ? "←" : "↔";
            return `${dir} ${p.channel}`;
          }).join(", ");
          const bridgeCount = (pane.bridges || []).length;
          lines.push(`  ${pane.type} "${pane.title}" [${ports}]${bridgeCount ? ` (${bridgeCount} bridges)` : ""}`);
        }

        if (data.globalChannels?.length) {
          lines.push("");
          lines.push(`Global channels: ${data.globalChannels.join(", ")}`);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to query workspace: ${err.message}. Is the bridge running on ${BRIDGE_URL}?` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // workspace_send — route a message to a specific pane
  // ═══════════════════════════════════════════════════════════════════════

  pi.registerTool({
    name: "workspace_send",
    label: "Send to Pane",
    description:
      "Send a command or data to a specific pane in the Somaverse workspace via its seam channel. " +
      "Use 'command' channel for most panes (universal input). " +
      "The target pane must be open in the workspace. " +
      "Use workspace_status first to see available panes and their ports.",
    promptSnippet:
      "workspace_send pane channel data: route a message to a pane (use 'command' channel for most panes)",
    promptGuidelines: [
      "Use workspace_status first to verify the target pane exists and has the desired input port.",
      "The 'command' channel is the universal input — most panes accept it.",
      "For Paperclip: send on 'command' to create issues (e.g. {\"text\": \"create issue: Fix the bug\"}).",
      "For Voice: send on 'command' to speak (e.g. {\"text\": \"say: Hello world\"}).",
    ],
    parameters: Type.Object({
      pane: Type.String({ description: "Target pane type (e.g. 'paperclip', 'soma-voice', 'terminal')" }),
      channel: Type.String({ description: "Seam channel to send on (e.g. 'command')" }),
      data: Type.Any({ description: "Data payload — usually {text: '...'} for command channel" }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/workspace/send", "POST", params);
        if (!data.ok) {
          return {
            content: [{ type: "text" as const, text: `Send failed: ${data.error}${data.availableTypes ? ` (available: ${data.availableTypes.join(", ")})` : ""}` }],
            details: data,
          };
        }
        return {
          content: [{ type: "text" as const, text: `Sent to ${params.pane} on ${params.channel}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to send: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // workspace_connect — create a bridge between two panes
  // ═══════════════════════════════════════════════════════════════════════

  pi.registerTool({
    name: "workspace_connect",
    label: "Connect Panes",
    description:
      "Create a directed bridge between two panes on a specific seam channel. " +
      "Bridges enable data flow — the source pane's output on that channel " +
      "will be delivered to the target pane's matching input port. " +
      "Use workspace_status first to see compatible ports.",
    promptSnippet:
      "workspace_connect from to channel: create a bridge between panes on a seam channel",
    parameters: Type.Object({
      from: Type.String({ description: "Source pane type (e.g. 'chat')" }),
      to: Type.String({ description: "Target pane type (e.g. 'paperclip')" }),
      channel: Type.String({ description: "Channel to bridge (e.g. 'agent:output', 'command')" }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/workspace/connect", "POST", params);
        if (!data.ok) {
          let msg = `Connect failed: ${data.error}`;
          if (data.availableChannels?.length) {
            msg += ` (compatible channels: ${data.availableChannels.join(", ")})`;
          }
          return {
            content: [{ type: "text" as const, text: msg }],
            details: data,
          };
        }
        return {
          content: [{ type: "text" as const, text: `Connected ${params.from} → ${params.to} via ${params.channel} (bridge: ${data.bridgeId})` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to connect: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // workspace_snapshot — capture a pane's visual state
  // ═══════════════════════════════════════════════════════════════════════

  pi.registerTool({
    name: "workspace_snapshot",
    label: "Pane Snapshot",
    description:
      "Capture a snapshot of a pane's visual state. Returns a structured description " +
      "of the pane's DOM — layout geometry, text content, interactive elements, and state. " +
      "Three modes: 'text' (compact, best for understanding), 'svg' (visual wireframe), " +
      "'json' (structured data). Use this to see what a pane currently shows.",
    promptSnippet:
      "workspace_snapshot pane mode: see what a pane currently displays (text/svg/json)",
    promptGuidelines: [
      "Use 'text' mode (default) for understanding pane contents — it's the most token-efficient.",
      "Use 'svg' mode when you need to show the user a visual wireframe.",
      "Use 'json' mode when you need exact coordinates or programmatic access.",
      "You can target by pane type (e.g. 'chat') or specific pane ID.",
    ],
    parameters: Type.Object({
      pane: Type.Optional(Type.String({ description: "Target pane type (e.g. 'chat', 'files', 'editor')" })),
      paneId: Type.Optional(Type.String({ description: "Specific pane ID (from workspace_status)" })),
      mode: Type.Optional(Type.String({ description: "Output mode: 'text' (default), 'svg', or 'json'" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const query = new URLSearchParams();
        if (params.pane) query.set("pane", params.pane);
        if (params.paneId) query.set("paneId", params.paneId);
        if (params.mode) query.set("mode", params.mode);

        const url = `/api/workspace/snapshot?${query.toString()}`;

        // For SVG mode, get raw text
        if (params.mode === "svg") {
          const res = await fetch(`${BRIDGE_URL}${url}`, { signal: AbortSignal.timeout(5000) });
          const text = await res.text();
          if (!res.ok) {
            return {
              content: [{ type: "text" as const, text: `Snapshot failed: ${text}` }],
              details: { error: text },
            };
          }
          return {
            content: [{ type: "text" as const, text: text }],
            details: { mode: "svg", length: text.length },
          };
        }

        const data = await workspaceRequest(url);
        if (!data.ok) {
          let msg = `Snapshot failed: ${data.error}`;
          if (data.availablePanes) {
            msg += `\nAvailable panes: ${data.availablePanes.map((p: any) => `${p.type} (${p.id})`).join(", ")}`;
          }
          return {
            content: [{ type: "text" as const, text: msg }],
            details: data,
          };
        }

        const summary = [
          `Snapshot of ${data.paneType} "${data.title}" (${data.dimensions.width}x${data.dimensions.height}, ${data.elementCount} elements)`,
          "",
          data.rendered,
        ].join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to snapshot: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BROWSER TOOLS — CDP-powered browser control
  // ═══════════════════════════════════════════════════════════════════════

  // Helper to find a tab by flexible targeting
  const tabTargetSchema = {
    tabId: Type.Optional(Type.String({ description: "Tab ID from browser_tabs" })),
    url: Type.Optional(Type.String({ description: "Match tab by URL substring" })),
    title: Type.Optional(Type.String({ description: "Match tab by title substring" })),
  };

  // ── browser_status ─────────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_status",
    label: "Browser Status",
    description:
      "Check if the agent browser (Brave Beta) is available and connected via CDP. " +
      "Returns availability and tab count. Use this before other browser tools to verify the browser is running.",
    promptSnippet:
      "browser_status: check if agent browser is available",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/status");
        if (!data.available) {
          return {
            content: [{ type: "text" as const, text: `Browser not available. Launch with: ./scripts/launch-browser.sh` }],
            details: data,
          };
        }
        return {
          content: [{ type: "text" as const, text: `Browser available — ${data.tabCount} tab(s) open` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Browser check failed: ${err.message}. Is the bridge running?` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_tabs ───────────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_tabs",
    label: "Browser Tabs",
    description:
      "List all open tabs in the agent browser. Returns tab ID, URL, and title for each. " +
      "Use the tab ID or URL to target specific tabs in other browser tools.",
    promptSnippet:
      "browser_tabs: list open tabs (id, url, title)",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/tabs");
        const tabs = data.tabs || [];
        if (tabs.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No tabs open" }],
            details: data,
          };
        }
        const lines = tabs.map((t: any) =>
          `  ${t.id.slice(0, 8)}  ${t.title || "(untitled)"}  ${t.url}`
        );
        return {
          content: [{ type: "text" as const, text: `${tabs.length} tab(s):\n${lines.join("\n")}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to list tabs: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_navigate ───────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_navigate",
    label: "Navigate Browser",
    description:
      "Navigate a browser tab to a URL. Target the tab by ID, URL substring, or title. " +
      "If no target is specified, uses the first available tab.",
    promptSnippet:
      "browser_navigate targetUrl [tabId|url|title]: open a URL in a browser tab",
    parameters: Type.Object({
      targetUrl: Type.String({ description: "URL to navigate to" }),
      ...tabTargetSchema,
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/navigate", "POST", params);
        return {
          content: [{ type: "text" as const, text: `Navigated to ${params.targetUrl}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Navigation failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_screenshot ─────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_screenshot",
    label: "Browser Screenshot",
    description:
      "Capture a screenshot of a browser tab. Returns a base64-encoded image. " +
      "Target the tab by ID, URL substring, or title. " +
      "Use fullPage=true for a full-page screenshot (not just the viewport).",
    promptSnippet:
      "browser_screenshot [tabId|url|title] [fullPage] [format]: capture a tab screenshot",
    parameters: Type.Object({
      ...tabTargetSchema,
      format: Type.Optional(Type.String({ description: "Image format: 'png' (default), 'jpeg', 'webp'" })),
      quality: Type.Optional(Type.Number({ description: "Image quality 0-100 (for jpeg/webp)" })),
      fullPage: Type.Optional(Type.Boolean({ description: "Capture full page, not just viewport" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/screenshot", "POST", params, 15000);
        if (!data.data) throw new Error("No screenshot data returned");
        const format = data.format || "png";
        const mediaType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
        const sizeKB = Math.round((data.data?.length || 0) * 0.75 / 1024);
        return {
          content: [
            { type: "text" as const, text: `Screenshot captured: ${data.width}x${data.height} ${format} (~${sizeKB}KB)` },
            { type: "image" as const, data: data.data, mimeType: mediaType } as any,
          ],
          details: { width: data.width, height: data.height, format, sizeKB },
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Screenshot failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_evaluate ───────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_evaluate",
    label: "Evaluate JavaScript",
    description:
      "Run JavaScript in a browser tab and return the result. " +
      "The expression is evaluated in the page context — you can access DOM, " +
      "window, document, etc. Promises are awaited by default. " +
      "Use this for DOM inspection, data extraction, or page interaction.",
    promptSnippet:
      "browser_evaluate expression [tabId|url|title]: run JS in a browser tab",
    promptGuidelines: [
      "Return values must be serializable (JSON-compatible). DOM nodes won't serialize — extract their properties instead.",
      "Use document.querySelector/querySelectorAll for DOM queries.",
      "Wrap async operations in an async IIFE if needed.",
    ],
    parameters: Type.Object({
      expression: Type.String({ description: "JavaScript expression to evaluate" }),
      ...tabTargetSchema,
      awaitPromise: Type.Optional(Type.Boolean({ description: "Await promise results (default: true)" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/evaluate", "POST", params);
        if (data.error) {
          return {
            content: [{ type: "text" as const, text: `Evaluation error: ${data.error}` }],
            details: data,
          };
        }
        const resultStr = typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2);
        return {
          content: [{ type: "text" as const, text: `Result (${data.type}): ${resultStr}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Evaluate failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_console ────────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_console",
    label: "Browser Console",
    description:
      "Read console log entries from a browser tab. Listens for a short duration " +
      "and returns any console.log/warn/error calls made during that time. " +
      "Filter by level: 'all' (default), 'error', 'warning', 'info'.",
    promptSnippet:
      "browser_console [tabId|url|title] [level] [duration]: read console logs from a tab",
    parameters: Type.Object({
      ...tabTargetSchema,
      level: Type.Optional(Type.String({ description: "Filter: 'all' (default), 'error', 'warning', 'info'" })),
      duration: Type.Optional(Type.Number({ description: "Listen duration in ms (default: 2000)" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/console", "POST", params);
        const entries = data.entries || [];
        if (entries.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No console entries in ${params.duration || 2000}ms` }],
            details: data,
          };
        }
        const lines = entries.map((e: any) => `[${e.level}] ${e.text}`);
        return {
          content: [{ type: "text" as const, text: `${entries.length} console entries:\n${lines.join("\n")}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Console read failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_accessibility ──────────────────────────────────────────────

  pi.registerTool({
    name: "browser_accessibility",
    label: "Accessibility Tree",
    description:
      "Get the accessibility tree of a browser tab. Returns named, interactive elements " +
      "with their roles — buttons, links, headings, inputs, etc. " +
      "This is the best way to understand page structure for interaction. " +
      "Filter by specific roles to reduce noise.",
    promptSnippet:
      "browser_accessibility [tabId|url|title] [roles] [maxNodes]: get page a11y tree",
    promptGuidelines: [
      "Use this instead of browser_evaluate for understanding page structure — it's more reliable than DOM queries.",
      "Filter by roles like ['button', 'link', 'heading', 'textbox'] to focus on interactive elements.",
      "Default max is 200 nodes — reduce for large pages.",
    ],
    parameters: Type.Object({
      ...tabTargetSchema,
      maxNodes: Type.Optional(Type.Number({ description: "Max nodes to return (default: 200)" })),
      roles: Type.Optional(Type.Array(Type.String(), { description: "Filter by roles (e.g. ['button', 'link', 'heading'])" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/accessibility", "POST", params);
        const nodes = data.nodes || [];
        if (nodes.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No accessible elements found" }],
            details: data,
          };
        }
        const lines = nodes.map((n: any) => {
          let line = `  [${n.role}] ${n.name}`;
          if (n.value) line += ` = "${n.value}"`;
          if (n.description) line += ` (${n.description})`;
          return line;
        });
        return {
          content: [{ type: "text" as const, text: `${nodes.length} accessible elements:\n${lines.join("\n")}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Accessibility query failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_styles ─────────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_styles",
    label: "Element Styles",
    description:
      "Get CSS styles for an element selected by CSS selector. Returns both matched CSS " +
      "rules (with selectors and properties) and computed styles. " +
      "Use this to inspect how an element is styled — useful for debugging layouts, " +
      "colors, typography, and responsive issues.",
    promptSnippet:
      "browser_styles selector [tabId|url|title]: get CSS styles for an element",
    parameters: Type.Object({
      selector: Type.String({ description: "CSS selector (e.g. '.hero-title', '#main', 'nav a')" }),
      ...tabTargetSchema,
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/styles", "POST", params);
        const lines: string[] = [];

        // Matched rules
        const rules = data.matched || [];
        if (rules.length > 0) {
          lines.push("Matched rules:");
          for (const rule of rules.slice(0, 20)) {
            lines.push(`  ${rule.selector} {`);
            for (const prop of (rule.properties || []).slice(0, 15)) {
              lines.push(`    ${prop}`);
            }
            lines.push("  }");
          }
        }

        // Top computed styles (skip the hundreds of defaults)
        const computed = data.computed || {};
        const importantProps = [
          "display", "position", "width", "height", "margin", "padding",
          "color", "background-color", "font-size", "font-family", "font-weight",
          "flex-direction", "gap", "grid-template-columns", "z-index", "opacity",
          "border", "border-radius", "box-shadow", "overflow",
        ];
        const computedLines = importantProps
          .filter(p => computed[p])
          .map(p => `  ${p}: ${computed[p]}`);
        if (computedLines.length > 0) {
          lines.push("");
          lines.push("Key computed styles:");
          lines.push(...computedLines);
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") || "No styles found" }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Style query failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_emulate ────────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_emulate",
    label: "Device Emulation",
    description:
      "Set viewport size and device emulation for a browser tab. " +
      "Use this to test responsive layouts, mobile views, or specific device profiles. " +
      "Common presets: mobile (375x667), tablet (768x1024), desktop (1920x1080).",
    promptSnippet:
      "browser_emulate width height [mobile] [tabId|url|title]: set viewport/device emulation",
    parameters: Type.Object({
      width: Type.Number({ description: "Viewport width in pixels" }),
      height: Type.Number({ description: "Viewport height in pixels" }),
      ...tabTargetSchema,
      deviceScaleFactor: Type.Optional(Type.Number({ description: "Device pixel ratio (default: 1)" })),
      mobile: Type.Optional(Type.Boolean({ description: "Enable mobile emulation" })),
      userAgent: Type.Optional(Type.String({ description: "Override user agent string" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        await workspaceRequest("/api/browser/emulate", "POST", params);
        const device = params.mobile ? "mobile" : "desktop";
        return {
          content: [{ type: "text" as const, text: `Viewport set to ${params.width}x${params.height} (${device}${params.deviceScaleFactor ? `, ${params.deviceScaleFactor}x` : ""})` }],
          details: params,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Emulation failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── browser_performance ────────────────────────────────────────────────

  pi.registerTool({
    name: "browser_performance",
    label: "Performance Metrics",
    description:
      "Get performance metrics for a browser tab — DOM nodes, layout count, " +
      "script duration, task duration, JS heap size, etc. " +
      "Use this to diagnose slow pages or measure performance improvements.",
    promptSnippet:
      "browser_performance [tabId|url|title]: get page performance metrics",
    parameters: Type.Object({
      ...tabTargetSchema,
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/browser/performance", "POST", params);
        const metrics = data.metrics || {};
        const keys = Object.keys(metrics);
        if (keys.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No performance metrics available" }],
            details: data,
          };
        }
        // Format important metrics first
        const priority = ["DomContentLoaded", "NavigationStart", "Nodes", "LayoutCount",
          "ScriptDuration", "TaskDuration", "JSHeapUsedSize", "JSHeapTotalSize"];
        const lines: string[] = [];
        for (const key of priority) {
          if (metrics[key] !== undefined) {
            const val = key.includes("Heap") ? `${(metrics[key] / 1024 / 1024).toFixed(1)}MB` :
                        key.includes("Duration") ? `${metrics[key].toFixed(2)}s` :
                        String(Math.round(metrics[key]));
            lines.push(`  ${key}: ${val}`);
          }
        }
        // Then the rest
        for (const key of keys) {
          if (!priority.includes(key)) {
            lines.push(`  ${key}: ${metrics[key]}`);
          }
        }
        return {
          content: [{ type: "text" as const, text: `Performance metrics:\n${lines.join("\n")}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Performance query failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AI TOOLS — local model inference in browser
  // ═══════════════════════════════════════════════════════════════════════

  // ── ai_status ─────────────────────────────────────────────────────────

  pi.registerTool({
    name: "ai_status",
    label: "AI Status",
    description:
      "Check if the local AI embedding model is loaded and how many files are indexed. " +
      "The model runs in the Somaverse browser tab via ONNX Runtime (WASM/WebNN).",
    promptSnippet:
      "ai_status: check if embedding model is loaded and index size",
    parameters: Type.Object({}),

    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/ai/status");
        if (!data.modelLoaded) {
          return {
            content: [{ type: "text" as const, text: `AI model not loaded. Use ai_load to load it.` }],
            details: data,
          };
        }
        return {
          content: [{ type: "text" as const, text: `AI ready — model: ${data.model}, ${data.indexSize} files indexed` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `AI status check failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── ai_load ───────────────────────────────────────────────────────────

  pi.registerTool({
    name: "ai_load",
    label: "Load AI Model",
    description:
      "Load the local embedding model into the browser. This downloads a ~22MB ONNX model " +
      "and initializes it for inference. Only needs to be done once per session — " +
      "the model stays loaded in memory. Takes 2-5 seconds.",
    promptSnippet:
      "ai_load [model]: load embedding model (default: all-MiniLM-L6-v2)",
    parameters: Type.Object({
      model: Type.Optional(Type.String({ description: "HuggingFace model ID (default: Xenova/all-MiniLM-L6-v2)" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/ai/load", "POST", params);
        if (data.cached) {
          return {
            content: [{ type: "text" as const, text: `Model already loaded: ${data.model}` }],
            details: data,
          };
        }
        return {
          content: [{ type: "text" as const, text: `Model loaded: ${data.model} (${data.loadSec}s)` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Failed to load model: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── ai_index ──────────────────────────────────────────────────────────

  pi.registerTool({
    name: "ai_index",
    label: "Index Files",
    description:
      "Index source files for semantic search. Reads files from a directory, embeds their " +
      "content using the loaded model, and stores vectors for fast similarity search. " +
      "Requires ai_load first. Indexes ~15 files/second.",
    promptSnippet:
      "ai_index [directory] [maxFiles] [extensions]: index source files for semantic search",
    promptGuidelines: [
      "Call ai_load first if the model isn't loaded yet.",
      "Default directory is the bridge server's cwd (usually the project root).",
      "Default extensions: .ts, .tsx, .js, .jsx",
      "Indexing 100 files takes about 7 seconds.",
    ],
    parameters: Type.Object({
      directory: Type.Optional(Type.String({ description: "Directory to index (default: project root)" })),
      maxFiles: Type.Optional(Type.Number({ description: "Max files to index (default: 200)" })),
      extensions: Type.Optional(Type.Array(Type.String(), { description: "File extensions to include" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/ai/index", "POST", params);
        return {
          content: [{ type: "text" as const, text: `Indexed ${data.indexed} files from ${data.directory} (${data.totalSec}s, ${data.msPerFile}ms/file)` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Indexing failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── ai_search ─────────────────────────────────────────────────────────

  pi.registerTool({
    name: "ai_search",
    label: "Semantic Search",
    description:
      "Search indexed files by meaning, not keywords. Describe what you're looking for " +
      "in natural language and get the most relevant files ranked by similarity. " +
      "Requires ai_load + ai_index first. Searches in ~15ms.",
    promptSnippet:
      "ai_search query [topK]: find relevant files by semantic similarity",
    promptGuidelines: [
      "Use natural language queries — 'how do panes communicate' works better than 'pane transport send'.",
      "Results include a similarity score (0-1). Above 0.3 is a strong match.",
      "Default returns top 5 results. Use topK to adjust.",
      "If no files are indexed, call ai_index first.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Natural language search query" }),
      topK: Type.Optional(Type.Number({ description: "Number of results (default: 5)" })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/ai/search", "POST", params);
        const results = data.results || [];
        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No matches found for: ${params.query}` }],
            details: data,
          };
        }
        const lines = results.map((r: any, i: number) =>
          `  ${i + 1}. ${r.file} (${r.score})`
        );
        return {
          content: [{ type: "text" as const, text: `Search: "${params.query}" (${data.indexSize} files)\n${lines.join("\n")}` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Search failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });

  // ── ai_embed ──────────────────────────────────────────────────────────

  pi.registerTool({
    name: "ai_embed",
    label: "Embed Text",
    description:
      "Generate a vector embedding for a piece of text. Returns a 384-dimensional " +
      "vector that captures the semantic meaning. Use this for custom similarity " +
      "comparisons or building specialized indexes.",
    promptSnippet:
      "ai_embed text: get semantic vector for text",
    parameters: Type.Object({
      text: Type.String({ description: "Text to embed" }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const data = await workspaceRequest("/api/ai/embed", "POST", params);
        return {
          content: [{ type: "text" as const, text: `Embedded (${data.dim}d, ${data.ms}ms): [${data.vector.slice(0, 5).map((v: number) => v.toFixed(4)).join(", ")}...]` }],
          details: data,
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Embedding failed: ${err.message}` }],
          details: { error: err.message },
        };
      }
    },
  });
}
