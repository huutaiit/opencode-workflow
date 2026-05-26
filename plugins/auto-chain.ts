/**
 * Auto-Chain Plugin
 * Injects completion/chain instructions into every command so the
 * orchestrator stops cleanly after finishing, instead of waiting
 * indefinitely.
 *
 * Hook used: command.execute.before (official API) — modifies output.parts
 * to append lifecycle instructions the AI follows at the end of a command.
 *
 * Commands not in STATE_CHAIN (setup / utility) → inject "stop immediately".
 * Commands in STATE_CHAIN → inject next-step context so the user sees the
 * pipeline clearly.
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

/**
 * Commands that are NOT part of the auto-chain pipeline.
 * These are setup / utility commands that should exit cleanly
 * after completing their work.
 */
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

const COMPLETION_INSTRUCTION = `

## Workflow Completion

After completing ALL steps described above, **stop immediately**.

- Do NOT suggest follow-up actions.
- Do NOT ask "Is there anything else?" or similar.
- Do NOT continue the conversation.
- Simply report what was accomplished and **stop**.

This is a standalone/setup command. The workflow is complete.`

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

export const AutoChainPlugin = async ({}) => {
  return {
    "command.execute.before": async (
      input: { command: string; sessionID: string; arguments: string },
      output: { parts: any[] },
    ) => {
      const cmd = input.command

      if (STANDALONE_COMMANDS.has(cmd)) {
        const text: any = { type: "text", text: COMPLETION_INSTRUCTION }
        output.parts = [...(output.parts || []), text]
        // console.log(`[auto-chain] /${cmd} is standalone — injected stop instruction`)
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
        // console.log(`[auto-chain] /${cmd} → chaining to ${nextStep.next} (state: ${state})`)
      } else {
        output.parts = [
          ...(output.parts || []),
          { type: "text", text: COMPLETION_INSTRUCTION },
        ]
        // console.log(`[auto-chain] /${cmd} has no chain target — stopping (state: ${state})`)
      }
    },

    event: async ({ event }: { event: { type: string } }) => {
      if (event.type === "session.idle") {
        // console.log("[auto-chain] Session idle — all workflows complete")
      }
    },
  }
}
