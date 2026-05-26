/**
 * Auto-Chain Plugin
 * Automatically chains commands based on state machine transitions.
 * After a command completes, injects the next command instruction.
 */

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

export const AutoChainPlugin = async ({}) => {
  return {
    "command.execute.after": async (input: { command: string; args?: string }) => {
      // This hook fires after a command completes
      // In a real implementation, it would read the updated state from context.md
      // and inject the next command instruction
      console.log(
        `[auto-chain] /${input.command}${input.args ? " " + input.args : ""} completed — checking next chain`
      )
    },
  }
}
