/**
 * VariantSelector - Select variant and provide session context
 *
 * Responsibilities:
 * - Select variant (explicit or auto-detect from project files)
 * - Provide pattern flags
 * - Provide specialist list
 * - Provide KB paths
 * - Validate variant compatibility
 *
 * Detection & validation rules are defined in stack JSON (data-driven),
 * NOT hardcoded in this file. See stack JSON `detection` and `validation` fields.
 *
 * @example
 * const StackManager = require('./stack-manager');
 * const VariantSelector = require('./variant-selector');
 * const sm = new StackManager();
 * await sm.loadStacks();
 * const selector = new VariantSelector(sm);
 * await selector.selectVariant('java-spring-boot', 'reactive');
 * const patterns = selector.getPatterns();
 */

class VariantSelector {
  constructor(stackManager) {
    if (!stackManager) {
      throw new Error('StackManager instance required');
    }
    this.stackManager = stackManager;
    this.selectedStack = null;
    this.selectedVariant = null;
    this.config = null;
  }

  /**
   * Select variant (explicit or default)
   * @param {string} stackId - Stack identifier (optional)
   * @param {string} variantId - Variant identifier (optional)
   * @returns {Promise<Object>} Selected variant configuration
   */
  async selectVariant(stackId, variantId) {
    // Load stacks if not already loaded
    if (!this.stackManager.stacks) {
      await this.stackManager.loadStacks();
    }

    // Use defaults if not provided
    if (!stackId || !variantId) {
      const defaults = this.stackManager.getDefaults();
      stackId = stackId || defaults.stackId;
      variantId = variantId || defaults.variantId;
    }

    // Get variant config
    this.config = this.stackManager.getVariantConfig(stackId, variantId);
    this.selectedStack = stackId;
    this.selectedVariant = variantId;

    console.log(`✅ Selected: ${stackId} / ${variantId}`);
    return this.config;
  }

  /**
   * Get pattern flags for current variant
   * @returns {Object} Pattern flags
   */
  getPatterns() {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }
    return this.config.patterns;
  }

  /**
   * Get specialist list for current variant
   * @returns {Array<string>} Specialist file names
   */
  getSpecialists() {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }
    return this.config.specialists;
  }

  /**
   * Get KB path for current variant
   * @param {string} type - 'backend', 'frontend', or 'database'
   * @returns {string} KB path
   */
  getKBPath(type = 'backend') {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }

    if (!this.config.kb_path[type]) {
      // Database KB is optional
      if (type === 'database') {
        return null;
      }
      throw new Error(`No ${type} KB path defined`);
    }

    return this.config.kb_path[type];
  }

  /**
   * Get all KB paths for current variant
   * @returns {Object} {backend, frontend, database}
   */
  getAllKBPaths() {
    if (!this.config) {
      throw new Error('No variant selected. Call selectVariant() first.');
    }
    return this.config.kb_path;
  }

  /**
   * Check if pattern is enabled in current variant
   * @param {string} patternName - Pattern name (e.g., 'use_jpa')
   * @returns {boolean} True if enabled
   */
  isPatternEnabled(patternName) {
    const patterns = this.getPatterns();
    return patterns[patternName] === true;
  }

  /**
   * Auto-detect variant based on project files.
   * Rules are read from stack JSON `detection` field (data-driven).
   *
   * @param {string} stackId - Stack identifier
   * @returns {Promise<string>} Detected variant ID
   */
  async autoDetectVariant(stackId) {
    const stack = this.stackManager.getStack(stackId);
    if (!stack?.variants) {
      console.log(`ℹ️  No variants defined for ${stackId}, using default`);
      return stack?.default_variant || 'default';
    }

    const candidates = [];

    for (const [variantId, config] of Object.entries(stack.variants)) {
      const det = config.detection;
      if (!det?.files) continue;

      const content = await this._readFirstMatch(det.files);
      if (!content) continue;

      // requires: ALL must be present (empty/missing requires = match any file)
      const allRequired = (det.requires || []).every(dep => content.includes(dep));
      // rejects: NONE must be present
      const noRejected = !(det.rejects || []).some(dep => content.includes(dep));

      if (allRequired && noRejected) {
        candidates.push({ variantId, priority: det.priority ?? 99 });
      }
    }

    if (candidates.length === 0) {
      console.log(`ℹ️  No variant detected for ${stackId}, using default`);
      return stack.default_variant || 'default';
    }

    candidates.sort((a, b) => a.priority - b.priority);
    const detected = candidates[0].variantId;
    console.log(`🔍 Detected variant: ${detected} (priority: ${candidates[0].priority})`);
    return detected;
  }

  /**
   * Validate variant is compatible with project.
   * Rules are read from stack JSON `validation` field (data-driven).
   *
   * @param {string} stackId - Stack identifier
   * @param {string} variantId - Variant identifier
   * @returns {Promise<Object>} Validation result {valid, warnings, variantId, variantName}
   */
  async validateVariant(stackId, variantId) {
    const variant = this.stackManager.getVariant(stackId, variantId);
    const warnings = [];
    const val = variant?.validation;

    if (!val?.files) {
      return { valid: true, warnings, variantId, variantName: variant?.name };
    }

    const content = await this._readFirstMatch(val.files);
    if (!content) {
      warnings.push(`ℹ️  Project file not found (${val.files.join(', ')}) - validation skipped`);
      return { valid: true, warnings, variantId, variantName: variant?.name };
    }

    for (const dep of val.mustHave || []) {
      if (!content.includes(dep)) {
        warnings.push(`⚠️  ${variantId}: expected '${dep}' not found`);
      }
    }

    for (const dep of val.mustNotHave || []) {
      if (content.includes(dep)) {
        warnings.push(`⚠️  ${variantId}: unexpected '${dep}' found`);
      }
    }

    return { valid: warnings.length === 0, warnings, variantId, variantName: variant?.name };
  }

  /**
   * Try reading files in order. Supports simple glob (e.g. "*.csproj").
   * Returns content of first matching file, or null.
   *
   * @param {string[]} filePatterns - Array of filenames or glob patterns
   * @returns {Promise<string|null>} File content or null
   * @private
   */
  async _readFirstMatch(filePatterns) {
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');

    for (const pattern of filePatterns) {
      try {
        if (pattern.includes('*')) {
          // Simple glob: extract extension from pattern like "*.csproj"
          const ext = pattern.replace('*', '');
          const files = fsSync.readdirSync(process.cwd())
            .filter(f => f.endsWith(ext));
          if (files.length > 0) {
            return await fs.readFile(path.join(process.cwd(), files[0]), 'utf8');
          }
        } else {
          // Fixed filename
          return await fs.readFile(pattern, 'utf8');
        }
      } catch {
        continue; // file not found, try next pattern
      }
    }
    return null;
  }

  /**
   * Get current selection info
   * @returns {Object} {stackId, variantId, config}
   */
  getCurrentSelection() {
    return {
      stackId: this.selectedStack,
      variantId: this.selectedVariant,
      config: this.config
    };
  }
}

module.exports = VariantSelector;
