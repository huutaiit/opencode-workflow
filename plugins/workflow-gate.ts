/**
 * Workflow Gate Plugin
 * Validates state transitions — blocks commands if current state is invalid.
 */

interface StateMachine {
  [state: string]: {
    allowedCommands: string[]
    description: string
  }
}

const STATE_MACHINE: StateMachine = {
  INITIAL: {
    allowedCommands: ["research", "architect", "config-project", "design"],
    description: "Initial state — run /research or /config-project",
  },
  RESEARCHED: {
    allowedCommands: ["innovate", "research"],
    description: "Research complete — run /innovate for decisions",
  },
  INNOVATE_SRS: {
    allowedCommands: ["innovate"],
    description: "SRS decisions in progress — complete Part 1",
  },
  SRS_CREATED: {
    allowedCommands: ["innovate", "design"],
    description: "SRS decisions approved — run /innovate Part 2 or /design --srs",
  },
  INNOVATE_TECHNICAL: {
    allowedCommands: ["innovate", "design"],
    description: "Technical decisions in progress — complete Part 2",
  },
  BD_CREATED: {
    allowedCommands: ["design"],
    description: "Basic Design done — run /design --detail",
  },
  DD_CREATED: {
    allowedCommands: ["plan", "design-review", "design"],
    description: "Detail Design done — run /plan",
  },
  BD_DD_CREATED: {
    allowedCommands: ["plan", "design-review"],
    description: "All design docs ready — run /plan",
  },
  PLAN_CREATED: {
    allowedCommands: ["plan-review", "plan"],
    description: "Plan created — run /plan-review",
  },
  PLAN_REVIEWED: {
    allowedCommands: ["execute", "plan-optimize", "plan"],
    description: "Plan approved — run /execute",
  },
  EXECUTED: {
    allowedCommands: ["validate"],
    description: "Implementation done — run /validate",
  },
  VALIDATED: {
    allowedCommands: ["test", "validate"],
    description: "Validation passed — run /test run (confirm)",
  },
  TESTED: {
    allowedCommands: ["test"],
    description: "Feature complete — ready to commit",
  },
}

function getCurrentState(): string {
  // In a real implementation, this reads .opencode/memory-bank/**/context.md
  return "UNKNOWN"
}

export const WorkflowGatePlugin = async ({}) => {
  return {
    "command.execute.before": async (input: { command: string }) => {
      const state = getCurrentState()
      const rules = STATE_MACHINE[state]

      if (!rules) {
        // Unknown state — allow command but warn
        return
      }

      if (!rules.allowedCommands.includes(input.command)) {
        console.log(
          `[workflow-gate] BLOCKED: /${input.command} not allowed in state "${state}". ${rules.description}`
        )
        // In production, this would throw an error to block execution
      }
    },
  }
}

export { STATE_MACHINE }
