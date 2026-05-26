/**
 * Notifications Plugin
 * Sends cross-platform notifications when sessions complete
 * - macOS: osascript
 * - Linux: notify-send
 * - Windows: wsl or powershell
 */

export const NotificationPlugin = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        try {
          const platform = process.platform
          
          if (platform === "darwin") {
            // macOS
            await $`osascript -e 'display notification "Session completed!" with title "OpenCode"'`
          } else if (platform === "linux") {
            // Linux (Ubuntu, Fedora, etc.)
            await $`notify-send "OpenCode" "Session completed!"`
          } else if (platform === "win32") {
            // Windows
            await $`powershell -Command "New-BurntToastNotification -Text 'Session completed!' -Title 'OpenCode'"`
          }
        } catch {
          // Ignore notification errors
        }
      }
    },
  }
}
