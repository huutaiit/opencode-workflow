/**
 * Verification Plugin
 * Suggests running tests after significant code changes.
 * Enhanced with state-aware verification checks.
 */

let editedFiles: string[] = []
let lastSuggestion = 0

const EXTENSION_MAP: Record<string, string> = {
  ".java": "mvn test",
  ".ts": "npm test",
  ".tsx": "npm test",
  ".js": "npm test",
  ".py": "pytest",
  ".go": "go test ./...",
}

export const VerificationPlugin = async ({}) => {
  return {
    event: async ({ event }) => {
      if (event.type === "file.edited") {
        const filePath = (event as any).path || ""
        if (filePath && !filePath.includes("node_modules")) {
          editedFiles.push(filePath)
        }

        const now = Date.now()
        if (editedFiles.length >= 3 && now - lastSuggestion > 60000) {
          lastSuggestion = now

          // Detect project type from edited files
          const exts = editedFiles.map((f) => f.match(/\.[^.]+$/)?.[0]).filter(Boolean)
          const uniqueExts = [...new Set(exts)]
          const testCmd = uniqueExts
            .map((ext) => EXTENSION_MAP[ext || ""])
            .filter(Boolean)
            .join(" && ")

          if (testCmd) {
            console.log(
              `[verification] ${editedFiles.length} files edited across ${uniqueExts.length} type(s). Run: ${testCmd}`
            )
          } else {
            console.log(`[verification] ${editedFiles.length} files edited. Consider running tests.`)
          }

          editedFiles = []
        }
      }
    },
  }
}
