/**
 * Bridge Connect Extension — registers the TUI session with bridge AND Somadian.
 * 
 * Makes the running TUI soma visible to the Somaverse chat pane, voice pane,
 * and any other subscriber. Connects to both servers for full routing:
 * 
 *   TUI agent events → bridge + Somadian → chat pane, voice pane, etc.
 *   Chat pane commands → bridge or Somadian → TUI → agent
 * 
 * One soma agent, multiple consumers. The TUI IS the agent — bridge and
 * Somadian are relay servers, not agent hosts.
 * 
 * Install:
 *   cp bridge-connect.ts ~/.soma/agent/extensions/  (global)
 *   cp bridge-connect.ts .soma/extensions/           (project-local)
 * 
 * Config (env vars):
 *   BRIDGE_URL=ws://localhost:18811      (default)
 *   SOMADIAN_URL=ws://localhost:18800   (default)
 *   BRIDGE_CHANNEL=auto                 (default: derived from cwd folder name)
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const BRIDGE_URL = process.env.BRIDGE_URL || "ws://localhost:18811";
const SOMADIAN_URL = process.env.SOMADIAN_URL || "ws://localhost:18800/ws";

export default function bridgeConnect(pi: ExtensionAPI) {
  let bridgeWs: WebSocket | null = null;
  let somadianWs: WebSocket | null = null;
  let channel: string = process.env.BRIDGE_CHANNEL || "";
  let bridgeConnected = false;
  let somadianConnected = false;
  let bridgeReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let somadianReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionCtx: ExtensionContext | null = null;

  function deriveChannel(cwd: string): string {
    if (process.env.BRIDGE_CHANNEL && process.env.BRIDGE_CHANNEL !== "auto") {
      return process.env.BRIDGE_CHANNEL;
    }
    return cwd.split("/").filter(Boolean).pop() || "main";
  }

  // ── Bridge send/relay ─────────────────────────────────────────────────

  function bridgeSend(data: any) {
    if (bridgeWs?.readyState === 1) {
      bridgeWs.send(JSON.stringify({ ...data, channel }));
    }
  }

  // ── Somadian send/relay ───────────────────────────────────────────────

  function somadianSend(data: any) {
    if (somadianWs?.readyState === 1) {
      somadianWs.send(JSON.stringify({ ...data, channel }));
    }
  }

  // ── Relay to BOTH servers ─────────────────────────────────────────────

  function relayEvent(event: any) {
    bridgeSend({ type: "relay", event });
    somadianSend({ type: "relay", event });
  }

  // ── Handle incoming commands (from either server) ─────────────────────

  function handleCommand(data: any) {
    if (data.channel && data.channel !== channel) return;

    // Commands routed from chat pane → TUI agent
    if (data.type === "prompt" && data.message) {
      pi.sendUserMessage(data.message);
      // Also relay the prompt to Somadian for enrichment (turn tracking)
      somadianSend({ type: "prompt", channel, message: data.message, speaker: "user" });
      bridgeSend({ type: "prompt", channel, message: data.message, speaker: "user" });
    } else if (data.type === "steer" && data.message) {
      pi.sendUserMessage(data.message, { deliverAs: "steer" });
    } else if (data.type === "abort") {
      sessionCtx?.abort();
    } else if (data.type === "compact") {
      sessionCtx?.compact();
    } else if (data.type === "get_state") {
      const response = {
        type: "relay",
        event: {
          type: "response",
          command: "get_state",
          success: true,
          data: {
            model: sessionCtx?.model,
            isStreaming: !sessionCtx?.isIdle(),
            contextUsage: sessionCtx?.getContextUsage(),
          },
        },
      };
      bridgeSend(response);
      somadianSend(response);
    } else if (data.type === "get_messages") {
      const entries = sessionCtx?.sessionManager?.getEntries() || [];
      const allMessages = entries
        .filter((e: any) => e.type === "message" && e.message)
        .map((e: any) => e.message);
      const recent = allMessages.slice(-50);
      const response = {
        type: "relay",
        event: {
          type: "response",
          command: "get_messages",
          success: true,
          data: { messages: recent },
        },
      };
      try {
        bridgeSend(response);
        somadianSend(response);
      } catch {}
    }
  }

  // ── Connect to bridge ─────────────────────────────────────────────────

  function connectToBridge(cwd: string) {
    try {
      bridgeWs = new WebSocket(BRIDGE_URL);
    } catch { return; }

    bridgeWs!.onopen = () => {
      bridgeConnected = true;
      bridgeSend({ type: "register", cwd, role: "orchestrator" });
      sendRecentMessages(bridgeSend);
    };

    bridgeWs!.onmessage = (ev: any) => {
      try {
        const data = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
        handleCommand(data);
      } catch {}
    };

    bridgeWs!.onclose = () => {
      bridgeConnected = false;
      bridgeReconnectTimer = setTimeout(() => connectToBridge(cwd), 5000);
    };

    bridgeWs!.onerror = () => {};
  }

  // ── Connect to Somadian ───────────────────────────────────────────────

  function connectToSomadian(cwd: string) {
    try {
      somadianWs = new WebSocket(SOMADIAN_URL);
    } catch { return; }

    somadianWs!.onopen = () => {
      somadianConnected = true;
      // Register as TUI channel on Somadian
      somadianSend({ type: "register", cwd, role: "orchestrator" });
      sendRecentMessages(somadianSend);
    };

    somadianWs!.onmessage = (ev: any) => {
      try {
        const raw = typeof ev.data === "string" ? ev.data : ev.data.toString();
        const data = JSON.parse(raw);
        
        // Somadian wraps agent events in { type: "agent_event", channel, event }
        if (data.type === "agent_event" && data.event) {
          const event = data.event;
          // Filter out our own relayed events (we published these, don't echo back)
          // Only handle inbound commands: prompt, steer, abort, get_state, etc.
          if (event.type === "prompt" || event.type === "steer" || event.type === "abort" ||
              event.type === "compact" || event.type === "get_state" || event.type === "get_messages" ||
              event.type === "new_session" || event.type === "set_model" || event.type === "set_thinking_level") {
            handleCommand(event);
          }
          // Ignore our own relay echoes (message_start, message_end, etc.)
        } else if (data.type === "registered" || data.type === "pong") {
          // Control messages, ignore
        } else {
          handleCommand(data);
        }
      } catch {}
    };

    somadianWs!.onclose = () => {
      somadianConnected = false;
      somadianReconnectTimer = setTimeout(() => connectToSomadian(cwd), 5000);
    };

    somadianWs!.onerror = () => {};
  }

  // ── Send recent messages on connect ───────────────────────────────────

  function sendRecentMessages(sendFn: (data: any) => void) {
    setTimeout(() => {
      if (!sessionCtx?.sessionManager) return;
      const entries = sessionCtx.sessionManager.getEntries() || [];
      const messages = entries
        .filter((e: any) => e.type === "message" && e.message)
        .map((e: any) => e.message)
        .slice(-50);
      if (messages.length > 0) {
        sendFn({
          type: "relay",
          event: { type: "agent_end", messages },
        });
      }
    }, 1000);
  }

  // ── Disconnect ────────────────────────────────────────────────────────

  function disconnect() {
    if (bridgeReconnectTimer) clearTimeout(bridgeReconnectTimer);
    if (somadianReconnectTimer) clearTimeout(somadianReconnectTimer);
    
    if (bridgeWs) {
      bridgeSend({ type: "disconnect" });
      bridgeWs.close();
      bridgeWs = null;
    }
    if (somadianWs) {
      somadianSend({ type: "disconnect" });
      somadianWs.close();
      somadianWs = null;
    }
    bridgeConnected = false;
    somadianConnected = false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  pi.on("session_start", (_event, ctx) => {
    sessionCtx = ctx;
    channel = deriveChannel(ctx.cwd);
    connectToBridge(ctx.cwd);
    connectToSomadian(ctx.cwd);
  });

  pi.on("session_shutdown", () => {
    disconnect();
  });

  // ── Relay agent events to BOTH servers ────────────────────────────────

  pi.on("agent_start", () => relayEvent({ type: "agent_start" }));
  pi.on("agent_end", (event) => relayEvent({ type: "agent_end", messages: event.messages }));
  pi.on("message_start", (event) => relayEvent({ type: "message_start", message: event.message }));
  pi.on("message_update", (event) => relayEvent({ type: "message_update", message: event.message }));
  pi.on("message_end", (event) => relayEvent({ type: "message_end", message: event.message }));

  pi.on("tool_execution_start", (event) => {
    relayEvent({
      type: "tool_execution_start",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      args: event.args,
    });
  });

  pi.on("tool_execution_end", (event) => {
    relayEvent({
      type: "tool_execution_end",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      result: event.result,
      isError: event.isError,
    });
  });

  pi.on("turn_start", (event) => {
    relayEvent({ type: "turn_start", turnIndex: event.turnIndex });
    // Extract the user prompt from the latest entries and send as prompt message
    // This ensures Somadian's enrichment pipeline can track turns
    try {
      const entries = sessionCtx?.sessionManager?.getEntries() || [];
      const userMsgs = entries
        .filter((e: any) => e.type === "message" && e.message?.role === "user")
        .map((e: any) => e.message);
      const lastPrompt = userMsgs[userMsgs.length - 1];
      if (lastPrompt?.content) {
        const text = typeof lastPrompt.content === "string"
          ? lastPrompt.content
          : lastPrompt.content.map((c: any) => c.text || "").join("");
        if (text) {
          somadianSend({ type: "prompt", channel, message: text, speaker: "user" });
          bridgeSend({ type: "prompt", channel, message: text, speaker: "user" });
        }
      }
    } catch {}
  });
  pi.on("turn_end", (event) => relayEvent({ type: "turn_end", turnIndex: event.turnIndex }));
}
