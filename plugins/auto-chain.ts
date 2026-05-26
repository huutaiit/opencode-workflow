/**
 * Auto-Chain Plugin
 *
 * Enforces workflow state transitions and session lifecycle:
 * 1. Injects completion/chain instructions as behavioral hints
 * 2. Blocks further tool calls after primary action completes
 *    (via tool.execute.before throwing) — the AI receives an error,
 *    returns a final text response, and the session loop ends naturally.
 *    The session stays alive for the user's next command.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join } from "path"

const STATE_CHAIN: Record<string, { next: string; condition?: string }> = {
  RESEARCHED: { next: "/innovate" },
  SRS_CREATED: { next: "/innovate", condition: "Part 2 — Technical decisions" },
  INNOVATE_TECHNICAL: { next: "/design --srs" },
  SRS_CREATED_AFTER_DESIGN: { next: "/design --basic" },
  BD_CREATED: { next: "/design --detail" },
  DD_CREATED: { next: "user: /plan" },
  PLAN_CREATED: { next: "/plan-review" },
  PLAN_REVIEWED: { next: "/execute" },
  EXECUTED: { next: "/validate" },
  VALIDATED: { next: "/test run", condition: "human-in-loop confirm" },
}

const STANDALONE_COMMANDS = new Set([
  "config-project",
  "architect",
  "commands",
  "docs",
  "guide",
  "list",
  "save",
  "recall",
  "commit",
  "rapid",
  "parallel",
  "mentor",
  "test-design",
  "verify-changes",
  "reverse-dd",
  "debug",
  "refactor",
  "review",
  "security-audit",
  "scan",
  "design-review",
])

/**
 * Behavioral stop instruction (prompt-level hint — backup).
 * The real stop mechanism: tool.execute.before blocks calls after primary action,
 * AI gets error → returns text response → session loop ends naturally.
 */
const COMPLETION_INSTRUCTION = `

<STOP_EXECUTION />

## TASK COMPLETE — STOP IMMEDIATELY

After finishing the steps above:
1. Report what was done in 1-2 sentences
2. Stop — do NOT make more tool calls
3. Do NOT suggest follow-ups
4. Do NOT ask questions`

/**
 * Per-command rules that detect when the "primary action" is done.
 * When matched, the session is force-terminated via abort().
 *
 * key = command name
 * value = function(tool: string, args: any) => boolean
 */
/**
 * Pattern: tool name + arg signal that the command's primary work is done.
 *
 * Only commands with a clear "done" signal are listed here.
 * For other standalone commands (display-only like list/guide/docs),
 * the behavioral `<STOP_EXECUTION />` instruction suffices.
 */
const PRIMARY_ACTION_RULES: Record<string, (tool: string, args: any) => boolean> = {
  "config-project": (tool, args) =>
    tool === "write" &&
    typeof args?.filePath === "string" &&
    (args.filePath.includes("project-config.json") ||
     args.filePath.includes("project-config")),

  "scan": (tool, args) =>
    tool === "write" &&
    typeof args?.filePath === "string" &&
    args.filePath.includes("module-registry.json"),

  "save": (tool, args) =>
    tool === "write" &&
    typeof args?.filePath === "string" &&
    (args.filePath.includes("context.md") ||
     args.filePath.includes("-save.md")),

  "commit": (tool, args) =>
    tool === "bash" &&
    typeof args?.command === "string" &&
    args.command.startsWith("git commit"),

  "reverse-dd": (tool, args) =>
    tool === "write" &&
    typeof args?.filePath === "string" &&
    (args.filePath.includes("detail-design.md") ||
     args.filePath.includes("api-contracts.md")),
}

function getCurrentState(): string {
  try {
    const memoryBank = join(process.cwd(), ".opencode", "memory-bank")
    if (!existsSync(memoryBank)) return "UNKNOWN"
    const branches = readdirSync(memoryBank)
    for (const branch of branches) {
      const branchDir = join(memoryBank, branch)
      if (!statSync(branchDir).isDirectory()) continue
      const entries = readdirSync(branchDir)
      for (const entry of entries) {
        const contextFile = join(branchDir, entry, "context.md")
        if (existsSync(contextFile)) {
          const content = readFileSync(contextFile, "utf-8")
          const match = content.match(/Current State:\s*\*\*([^*]+)\*\*/)
          if (match) return match[1].trim()
        }
      }
    }
  } catch {
    // Memory bank may not exist yet
  }
  return "UNKNOWN"
}

export const AutoChainPlugin = async () => {
  // Track standalone sessions where primary action has been detected.
  // Once primaryActionDone is set, tool.execute.before blocks further tool calls,
  // causing the AI to receive an error and return a final text response naturally.
  // The session loop ends without being killed — user can type the next command.
  const primaryActionDone = new Set<string>()
  const BLOCKED_TOOLS = new Set([
    "write",
    "edit",
    "bash",
    "terminal",
  ])
  
  return {
    "command.execute.before": async (
      input: { command: string; sessionID: string; arguments: string },
      output: { parts: any[] },
    ) => {
      const cmd = input.command

      if (STANDALONE_COMMANDS.has(cmd)) {
        const text: any = { type: "text", text: COMPLETION_INSTRUCTION }
        output.parts = [...(output.parts || []), text]
        return
      }

      const state = getCurrentState()
      const nextStep = STATE_CHAIN[state]

      if (nextStep) {
        const nextText = [
          `\n\n## Chain Context`,
          `Current workflow state: **${state}**`,
          `Next step after this command: **${nextStep.next}**${nextStep.condition ? ` (${nextStep.condition})` : ""}`,
          ``,
          `After completing ALL steps above, state the next step and **stop**.`,
          `Do NOT suggest follow-up actions or continue the conversation.`,
        ].join("\n")
        output.parts = [
          ...(output.parts || []),
          { type: "text", text: nextText },
        ]
      } else {
        output.parts = [
          ...(output.parts || []),
          { type: "text", text: COMPLETION_INSTRUCTION },
        ]
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string; args: any },
    ) => {
      if (primaryActionDone.has(input.sessionID)) return

      // Check if this tool call matches any primary action rule.
      for (const [, rule] of Object.entries(PRIMARY_ACTION_RULES)) {
        if (rule(input.tool, input.args)) {
          primaryActionDone.add(input.sessionID)
          return
        }
      }
    },

    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string; args: any },
    ) => {
      if (
        primaryActionDone.has(input.sessionID) &&
        BLOCKED_TOOLS.has(input.tool)
      ) {
        return {
          skip: true,
          result: "Task already completed."
        }
      }
    },

    event: async ({ event }: { event: { type: string; sessionID?: string } }) => {
      if (event.type === "session.deleted" || event.type === "session.idle") {
        if (event.sessionID) {
          primaryActionDone.delete(event.sessionID)
        } else {
          primaryActionDone.clear()
        }
      }
    },
  }
}
