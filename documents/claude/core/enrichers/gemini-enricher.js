'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Gemini Enricher - Semantic enrichment using Google Gemini
 *
 * Migrated to @google/genai SDK (replaces deprecated @google/generative-ai).
 * Version: 2.0.0
 *
 * @module gemini-enricher
 */

const DEFAULT_CONFIG = {
  model: null,
  maxTokens: 2048,
  temperature: 0.3,
  rateLimitRpm: 60,
  retryAttempts: 3,
  retryDelayMs: 1000,
};

const PROMPTS = {
  DOMAIN_ANALYSIS: `Analyze this code and extract domain concepts.

CODE:
{code}

Respond in JSON format:
{
  "domainConcepts": [
    { "name": "string", "type": "entity|service|valueObject|aggregate", "confidence": 0.0-1.0 }
  ],
  "businessRules": [
    { "name": "string", "description": "string", "location": "method/class name" }
  ],
  "patterns": [
    { "name": "string", "type": "creational|structural|behavioral", "confidence": 0.0-1.0 }
  ]
}`,

  RELATIONSHIP_INFERENCE: `Given this code and domain context, infer relationships to business requirements.

CODE:
{code}

DOMAIN CONTEXT:
{context}

Respond in JSON format:
{
  "implementsRequirements": [
    { "code": "class/method name", "requirement": "FR/NFR ID or description", "confidence": 0.0-1.0 }
  ],
  "belongsToDomain": [
    { "code": "class/method name", "domain": "domain concept", "confidence": 0.0-1.0 }
  ]
}`,

  CODE_SUMMARY: `Summarize this code in one sentence, focusing on its business purpose.

CODE:
{code}

Respond with a single sentence summary.`,
};

class GeminiEnricher {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._client = null;
    this._modelName = null;
    this._lastRequestTime = 0;
    this._requestCount = 0;
    this._totalTokensUsed = 0;
    this._cache = null;
  }

  async initialize() {
    if (this._client) return;

    const { apiKey, model } = await this._resolveConfig();
    if (!apiKey) {
      throw new Error('Gemini API key not found. Set GEMINI_API_KEY env var or configure in external-apis.json');
    }
    if (!model) {
      throw new Error('Gemini model not configured. Set gemini.model in external-apis.json');
    }

    const { GoogleGenAI } = require('@google/genai');
    this._client = new GoogleGenAI({ apiKey });
    this._modelName = model;
  }

  async _resolveConfig() {
    // Load .env if not already in process.env
    if (!process.env.GEMINI_API_KEY) {
      try {
        require("dotenv").config({
          path: path.resolve(process.cwd(), ".env"),
        });
      } catch (e) {
        /* dotenv optional */
      }
    }
    let apiKey = process.env.GEMINI_API_KEY || null;
    let model = this.config.model || process.env.GEMINI_MODEL || null;

    const configPath = path.join(process.cwd(), 'config/external-apis.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!apiKey) {
          apiKey = config.GEMINI_API_KEY || config.gemini?.apiKey || null;
        }
        if (!model) {
          model = config.gemini?.model || null;
        }
      } catch (e) {
        console.warn('[GeminiEnricher] Error reading external-apis.json:', e.message);
      }
    }

    return { apiKey, model };
  }

  /**
   * @deprecated Use _resolveConfig() instead.
   */
  async _getApiKey() {
    const { apiKey } = await this._resolveConfig();
    return apiKey;
  }

  setCache(cache) {
    this._cache = cache;
  }

  async enrichAST(ast) {
    await this.initialize();

    const cacheKey = this._getCacheKey(ast);
    if (this._cache) {
      const cached = await this._cache.get(cacheKey);
      if (cached) return cached;
    }

    const codeSummary = this._buildCodeSummary(ast);
    const enrichment = await this._analyzeWithRetry(PROMPTS.DOMAIN_ANALYSIS, { code: codeSummary });
    const result = this._parseEnrichmentResponse(enrichment);

    result.filePath = ast.filePath;
    result.language = ast.language;
    result.enrichedAt = new Date().toISOString();

    if (this._cache) {
      await this._cache.set(cacheKey, result);
    }

    return result;
  }

  async enrichRelationships(ast, context = {}) {
    await this.initialize();
    const codeSummary = this._buildCodeSummary(ast);
    const enrichment = await this._analyzeWithRetry(PROMPTS.RELATIONSHIP_INFERENCE, {
      code: codeSummary,
      context: JSON.stringify(context, null, 2),
    });
    return this._parseEnrichmentResponse(enrichment);
  }

  async summarize(ast) {
    await this.initialize();
    const codeSummary = this._buildCodeSummary(ast);
    const response = await this._analyzeWithRetry(PROMPTS.CODE_SUMMARY, { code: codeSummary });
    return response.trim();
  }

  _buildCodeSummary(ast) {
    const lines = [];
    lines.push(`File: ${ast.filePath}`);
    lines.push(`Language: ${ast.language}`);
    if (ast.packageName) lines.push(`Package: ${ast.packageName}`);

    for (const cls of ast.classes) {
      const markers = cls.markers.map(m => `@${m.name}`).join(' ');
      lines.push(`\n${markers ? markers + ' ' : ''}${cls.kind} ${cls.name}${cls.extends ? ' extends ' + cls.extends : ''}`);
      for (const field of cls.fields.slice(0, 5)) {
        lines.push(`  ${field.visibility || ''} ${field.type || ''} ${field.name}`);
      }
      for (const method of cls.methods.slice(0, 10)) {
        const mMarkers = method.markers.map(m => `@${m.name}`).join(' ');
        const params = method.parameters.map(p => `${p.type || ''} ${p.name}`).join(', ');
        lines.push(`  ${mMarkers ? mMarkers + ' ' : ''}${method.visibility || ''} ${method.returnType || 'void'} ${method.name}(${params})`);
      }
    }

    for (const fn of ast.functions.slice(0, 10)) {
      const params = fn.parameters.map(p => `${p.type || ''} ${p.name}`).join(', ');
      lines.push(`\nfunction ${fn.name}(${params}): ${fn.returnType || 'void'}`);
    }

    if (ast.framework && ast.framework.name) {
      lines.push(`\nFramework: ${ast.framework.name}`);
      if (ast.framework.components?.length) {
        lines.push(`Components: ${ast.framework.components.map(c => c.name).join(', ')}`);
      }
      if (ast.framework.routes?.length) {
        lines.push(`Routes: ${ast.framework.routes.map(r => `${r.method || 'GET'} ${r.path}`).join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  async _analyzeWithRetry(promptTemplate, variables) {
    await this._rateLimit();
    const prompt = this._fillPrompt(promptTemplate, variables);

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await this._client.models.generateContent({
          model: this._modelName,
          contents: prompt,
          config: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          },
        });

        const text = result.text;

        if (result.usageMetadata) {
          this._totalTokensUsed += (result.usageMetadata.totalTokenCount || 0);
        } else {
          this._totalTokensUsed += this._estimateTokens(prompt) + this._estimateTokens(text);
        }

        return text;
      } catch (error) {
        console.warn(`[GeminiEnricher] Attempt ${attempt + 1} failed:`, error.message);
        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this._sleep(delay);
        } else {
          throw error;
        }
      }
    }
  }

  async _rateLimit() {
    const now = Date.now();
    const elapsed = now - this._lastRequestTime;
    const minInterval = 60000 / this.config.rateLimitRpm;
    if (elapsed < minInterval) {
      await this._sleep(minInterval - elapsed);
    }
    this._lastRequestTime = Date.now();
    this._requestCount++;
  }

  _fillPrompt(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  _parseEnrichmentResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('[GeminiEnricher] Failed to parse JSON response:', e.message);
    }
    return { domainConcepts: [], businessRules: [], patterns: [], parseError: true };
  }

  _getCacheKey(ast) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      filePath: ast.filePath,
      classes: ast.classes.map(c => c.name),
      functions: ast.functions.map(f => f.name),
      linesOfCode: ast.meta.linesOfCode,
    });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  _estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      requestCount: this._requestCount,
      totalTokensUsed: this._totalTokensUsed,
      estimatedCost: this._totalTokensUsed * 0.000001,
    };
  }

  resetStats() {
    this._requestCount = 0;
    this._totalTokensUsed = 0;
  }
}

let instance = null;

function getInstance(config = {}) {
  if (!instance) {
    instance = new GeminiEnricher(config);
  }
  return instance;
}

module.exports = { GeminiEnricher, getInstance, PROMPTS, DEFAULT_CONFIG };
