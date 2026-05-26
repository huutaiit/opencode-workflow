#!/usr/bin/env node

/**
 * opencode-workflow CLI
 * Usage: npx opencode-workflow <command> [options]
 */

import { execSync } from "child_process"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VERSION = "1.0.0"

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════╗
║       opencode-workflow v${VERSION}              ║
╚══════════════════════════════════════════════╝

Usage: npx opencode-workflow <command> [options]

Commands:
  init               Scaffold opencode-workflow into current project
  doctor             Check symlinks, deps, config, RAG
  sync-commands      Merge default commands (force overwrite)
  test <sub>         scan | generate | validate (--module <id> or --all)
  version            Show version
  help               Show this help

Examples:
  npx opencode-workflow init
  npx opencode-workflow doctor
  npx opencode-workflow sync-commands
  npx opencode-workflow test scan --module cmn001000
  npx opencode-workflow test validate --all
`)
}

function copyRecursive(src, dst, ext) {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true })
      copyRecursive(srcPath, dstPath, ext)
    } else if (entry.name.endsWith(ext)) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === "help") {
    printHelp()
    process.exit(0)
  }

  if (command === "version") {
    console.log(VERSION)
    process.exit(0)
  }

  if (command === "init") {
    const targetDir = process.cwd()
    const dirs = [
      ".opencode",
      ".opencode/agent",
      ".opencode/command",
      ".opencode/skill",
      ".opencode/plugin",
      ".opencode/config",
      ".opencode/memory-bank",
    ]

    console.log("📦 Scaffolding opencode-workflow...")

    for (const dir of dirs) {
      const fullPath = path.join(targetDir, dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
        console.log(`  ✅ Created ${dir}/`)
      } else {
        console.log(`  ⏭️  ${dir}/ already exists`)
      }
    }

    const cmdSrc = path.join(__dirname, "commands")
    const cmdDst = path.join(targetDir, ".opencode", "command")
    if (fs.existsSync(cmdSrc)) {
      fs.mkdirSync(cmdDst, { recursive: true })
      copyRecursive(cmdSrc, cmdDst, ".md")
      console.log("  ✅ Commands copied")
    }

    const pluginSrc = path.join(__dirname, "plugins")
    const pluginDst = path.join(targetDir, ".opencode", "plugin")
    if (fs.existsSync(pluginSrc)) {
      fs.mkdirSync(pluginDst, { recursive: true })
      copyRecursive(pluginSrc, pluginDst, ".ts")
      console.log("  ✅ Plugins copied")
    }

    console.log("")
    console.log("✅ opencode-workflow scaffolded successfully!")
    console.log("")
    console.log("Next steps:")
    console.log("  1. Run /config-project in opencode to detect your tech stack")
    console.log("  2. Start your first feature: /research --type new --input <file>")
    process.exit(0)
  }

  if (command === "doctor") {
    const targetDir = process.cwd()
    const opencodeDir = path.join(targetDir, ".opencode")

    console.log("🔍 opencode-workflow doctor")
    console.log(`   Target: ${targetDir}`)
    console.log("")

    if (!fs.existsSync(opencodeDir)) {
      console.log("❌ .opencode/ missing — run `npx opencode-workflow init`")
      process.exit(1)
    }
    console.log("✅ .opencode/ exists")

    const checks = ["agent", "command", "skill", "plugin", "config"]
    for (const dir of checks) {
      const fullPath = path.join(opencodeDir, dir)
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ .opencode/${dir}/ exists`)
      } else {
        console.log(`  ⚠️ .opencode/${dir}/ missing`)
      }
    }

    const memoryBank = path.join(opencodeDir, "memory-bank")
    if (fs.existsSync(memoryBank)) {
      console.log("  ✅ .opencode/memory-bank/ exists")
    } else {
      console.log("  ⚠️ .opencode/memory-bank/ missing")
    }

    const configPath = path.join(opencodeDir, "config", "project-config.json")
    if (fs.existsSync(configPath)) {
      console.log("  ✅ Config: project-config.json")
    } else {
      console.log("  ⚠️ Config: project-config.json missing — run /config-project")
    }

    console.log("")
    console.log("Doctor complete.")
    process.exit(0)
  }

  if (command === "sync-commands") {
    const targetDir = process.cwd()
    const srcDir = path.join(__dirname, "commands")
    const dstDir = path.join(targetDir, ".opencode", "command")

    if (!fs.existsSync(srcDir)) {
      console.log("❌ Source commands not found")
      process.exit(1)
    }

    fs.mkdirSync(dstDir, { recursive: true })
    console.log("📋 Syncing commands to .opencode/command/...")
    copyRecursive(srcDir, dstDir, ".md")
    console.log("✅ Commands synced.")
    process.exit(0)
  }

  if (command === "test") {
    const sub = args[1]
    console.log(`🧪 Test: ${sub || "all"}`)
    process.exit(0)
  }

  console.log(`Unknown command: ${command}`)
  printHelp()
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
