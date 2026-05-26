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
    ".opencode/agents",
    ".opencode/commands",
    ".opencode/skills",
    ".opencode/plugins",
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
  const dstDir = path.join(targetDir, ".opencode", "commands")
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(dstDir)) {
      fs.mkdirSync(dstDir, { recursive: true })
    }
    copyRecursive(srcDir, dstDir, ".md")
    console.log("  ✅ Commands copied")
  }

  // Copy agents
  const agentSrc = path.join(__dirname, "agents")
  const agentDst = path.join(targetDir, ".opencode", "agents")
  if (fs.existsSync(agentSrc)) {
    if (!fs.existsSync(agentDst)) {
      fs.mkdirSync(agentDst, { recursive: true })
    }
    copyRecursive(agentSrc, agentDst, ".md")
    console.log("  ✅ Agents copied")
  }

  // Copy plugins
  const pluginSrc = path.join(__dirname, "plugins")
  const pluginDst = path.join(targetDir, ".opencode", "plugins")
  if (fs.existsSync(pluginSrc)) {
    if (!fs.existsSync(pluginDst)) {
      fs.mkdirSync(pluginDst, { recursive: true })
    }
    copyRecursive(pluginSrc, pluginDst, ".ts")
    console.log("  ✅ Plugins copied")
  }

  // Copy skills
  const skillSrc = path.join(__dirname, "skills")
  const skillDst = path.join(targetDir, ".opencode", "skills")
  if (fs.existsSync(skillSrc)) {
    if (!fs.existsSync(skillDst)) {
      fs.mkdirSync(skillDst, { recursive: true })
    }
    copyRecursive(skillSrc, skillDst, ".md")
    console.log("  ✅ Skills copied")
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
