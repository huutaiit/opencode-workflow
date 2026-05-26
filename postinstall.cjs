#!/usr/bin/env node

/**
 * Post-install script for opencode-workflow
 * Scaffolds .opencode/ directory structure in consumer projects.
 */

const fs = require("fs")
const path = require("path")

function scaffold(targetDir) {
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

  // Copy default commands
  const srcDir = path.join(__dirname, "commands")
  const dstDir = path.join(targetDir, ".opencode", "command")
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true })
    }
    copyRecursive(srcDir, dstDir, ".md")
    console.log("  ✅ Commands copied")
  }

  // Copy plugins
  const pluginSrc = path.join(__dirname, "plugins")
  const pluginDst = path.join(targetDir, ".opencode", "plugin")
  if (fs.existsSync(pluginSrc)) {
    if (!fs.existsSync(pluginDst)) {
      fs.mkdirSync(pluginDst, { recursive: true })
    }
    copyRecursive(pluginSrc, pluginDst, ".ts")
    console.log("  ✅ Plugins copied")
  }

  console.log("")
  console.log("✅ opencode-workflow scaffolded successfully!")
  console.log("")
  console.log("Next steps:")
  console.log("  1. Run /config-project in opencode to detect your tech stack")
  console.log("  2. Start your first feature: /research --type new --input <file>")
}

function copyRecursive(src, dst, ext) {
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      if (!fs.existsSync(dstPath)) {
        fs.mkdirSync(dstPath, { recursive: true })
      }
      copyRecursive(srcPath, dstPath, ext)
    } else if (entry.name.endsWith(ext)) {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

// Run if called directly
if (process.argv[1] && (process.argv[1].endsWith("postinstall.cjs") || process.argv[1].endsWith("postinstall"))) {
  const targetDir = process.env.INIT_CWD || process.cwd()
  scaffold(targetDir)
}

module.exports = { scaffold }
