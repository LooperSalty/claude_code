/**
 * Shim for bun:bundle feature() function.
 *
 * In the real Bun bundler, feature() enables dead-code elimination at build time.
 * This shim makes ALL features return true so every code path is reachable.
 *
 * To disable specific features, set them to false in the FEATURE_FLAGS map.
 */

const FEATURE_FLAGS: Record<string, boolean> = {
  // Core features - enable all
  BRIDGE_MODE: false,          // Remote control (needs infra)
  VOICE_MODE: false,           // Voice input (needs native deps)
  COORDINATOR_MODE: true,      // Multi-agent orchestration
  KAIROS: false,               // Assistant mode (internal)
  PROACTIVE: false,            // Proactive mode (internal)
  AUTO_MODE: true,             // Auto permission mode
  TRANSCRIPT_CLASSIFIER: false, // Internal classifier
  COMMIT_ATTRIBUTION: true,    // Git attribution
  HISTORY_SNIP: true,          // Message compaction
  UDS_INBOX: false,            // Unix domain sockets (Mac/Linux)
  CONTEXT_COLLAPSE: true,      // Context optimization
  AGENT_TRIGGERS: true,        // Cron scheduling
  AGENT_TRIGGERS_REMOTE: false, // Remote triggers (needs infra)
  WORKFLOW_SCRIPTS: false,     // Workflow execution
  NATIVE_CLIENT_ATTESTATION: false,
  WEB_BROWSER_TOOL: false,
  ENABLE_LSP_TOOL: false,
  BUDDY: false,
  FORK_SUBAGENT: true,
  CHICAGO_MCP: false,
  TERMINAL_PANEL: false,
  OVERFLOW_TEST_TOOL: false,
  MONITOR_TOOL: false,
  DAEMON: false,
  CCR_REMOTE_SETUP: false,
  TORCH: false,
  ULTRAPLAN: false,
  BREAK_CACHE_COMMAND: false,
}

/**
 * Returns whether a feature flag is enabled.
 * Mirrors the bun:bundle feature() API.
 */
export function feature(name: string): boolean {
  if (name in FEATURE_FLAGS) {
    return FEATURE_FLAGS[name]!
  }
  // Unknown features default to false for safety
  return false
}
