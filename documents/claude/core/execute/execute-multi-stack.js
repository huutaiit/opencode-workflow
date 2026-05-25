/**
 * Execute Multi-Stack Integration
 * Week 15 - Day 7: Multi-Stack Support (Week 14 Integration)
 *
 * Integrates Week 14 Multi-Stack support with /execute command.
 * Data-driven multi-stack support via StackResolver (stack JSON config)
 */

const fs = require('fs');
const path = require('path');
const { getTechStack } = require('../state/project-config');
const { getStackResolver } = require('../state/stack-resolver');
const KBLoader = require('../knowledge-base/kb-loader');

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

// Stack list and specialist mapping are now data-driven via StackResolver.
// No hardcoded SUPPORTED_STACKS or STACK_SPECIALIST_MAP needed.

// ============================================
// STACK RESOLUTION
// ============================================

/**
 * Resolve stack configuration from context
 *
 * @param {Object} context - Validated context from Day 2
 * @returns {Object} - Stack configuration
 */
async function resolveStackConfiguration(context) {
  const ts = getTechStack();
  const resolver = getStackResolver();

  // Use context stack or first sourceRoot as default
  const stackId = context.stack?.stack || ts.sourceRoots[0]?.stack;
  const variant = context.stack?.variant || ts.sourceRoots[0]?.variant || "default";

  if (!stackId) {
    throw new Error("No stack configured in sourceRoots");
  }

  const stackConfig = resolver.getStack(stackId);
  if (!stackConfig) {
    throw new Error(`Stack configuration not found: ${stackId}`);
  }

  const variantConfig = resolver.getVariant(stackId, variant);
  if (!variantConfig) {
    throw new Error(`Variant not found: ${stackId}/${variant}`);
  }

  return {
    id: stackId,
    name: stackConfig.name,
    language: stackConfig.language,
    extensions: stackConfig.extensions,
    backend: stackConfig.backend,
    frontend: stackConfig.frontend,
    database: stackConfig.database,
    variant: variant,
    variantConfig: variantConfig,
    specialists: resolver.resolveSpecialists(),
    kbPath: variantConfig.kb_path || {},
    patterns: variantConfig.patterns || {}
  };
}

/**
 * Get stack display name.
 * Reads from stack JSON `name` field (data-driven).
 */
function getStackDisplayName(stackId) {
  try {
    const resolver = getStackResolver();
    const stack = resolver.getStack(stackId);
    return stack?.name || stackId;
  } catch {
    return stackId;
  }
}

// ============================================
// SPECIALIST SELECTION
// ============================================

/**
 * Select specialist based on stack, layer, and type.
 * Data-driven: reads from StackResolver specialist list + convention-based fallback.
 *
 * @param {Object} step - Step definition
 * @param {Object} stackConfig - Stack configuration (from resolveStackConfiguration)
 * @returns {string|null} - Specialist name or null
 */
function selectSpecialistByStack(step, stackConfig) {
  const type = step.type || 'service';

  // Tier 1: From StackResolver specialist list (passed via stackConfig.specialists)
  if (stackConfig.specialists) {
    const allSpecialists = Array.isArray(stackConfig.specialists)
      ? stackConfig.specialists
      : Object.values(stackConfig.specialists).flat();
    const match = allSpecialists.find(s => s.includes(type));
    if (match) return match;
  }

  // Tier 2: Convention-based resolution (generic)
  const resolved = resolveByConvention(type);
  if (resolved) return resolved;

  // Tier 3: null (caller uses keyword fallback)
  return null;
}

/**
 * Resolve specialist by naming convention.
 * Tries common suffixes: -specialist, -feature, -widget, direct name.
 *
 * @param {string} type - Step type (e.g. 'export_data', 'breadcrumb')
 * @returns {string|null} - Specialist name or null
 */
function resolveByConvention(type) {
  let SpecialistLoader;
  try {
    SpecialistLoader = require('./../../core/mcp/specialist-loader');
  } catch {
    return null;
  }

  const loader = new SpecialistLoader();
  loader.loadSpecialists();

  const normalized = type.replace(/_/g, '-');
  const candidates = [
    `${normalized}-specialist`,
    `${normalized}-feature`,
    `${normalized}-widget`,
    normalized
  ];

  for (const candidate of candidates) {
    const fileName = candidate.endsWith('.md') ? candidate : `${candidate}.md`;
    if (loader.getPath(fileName)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Get all specialists for a stack (from StackResolver).
 */
function getAllSpecialistsForStack(stackConfig) {
  if (!stackConfig.specialists) return [];

  const allSpecialists = Array.isArray(stackConfig.specialists)
    ? stackConfig.specialists
    : Object.values(stackConfig.specialists).flat();

  return allSpecialists.map(s => ({ specialist: s }));
}

// ============================================
// TEMPLATE LOADING
// ============================================

/**
 * Load template for specific stack
 *
 * @param {string} templateName - Template name
 * @param {Object} stackConfig - Stack configuration
 * @returns {string} - Template content
 */
function loadStackTemplate(templateName, stackConfig) {
  const stackId = stackConfig.id;

  // Try stack-specific template first
  const stackTemplatePath = path.join(
    '.claude',
    'templates',
    stackId,
    `${templateName}.hbs`
  );

  if (fs.existsSync(stackTemplatePath)) {
    return fs.readFileSync(stackTemplatePath, 'utf-8');
  }

  // Fall back to default template
  const defaultTemplatePath = path.join(
    '.claude',
    'templates',
    'default',
    `${templateName}.hbs`
  );

  if (fs.existsSync(defaultTemplatePath)) {
    return fs.readFileSync(defaultTemplatePath, 'utf-8');
  }

  // Return basic template if no file found
  return getBasicTemplate(templateName, stackConfig);
}

/**
 * Get basic template for stack.
 * Maps by language (not stack ID) — works for any stack with same language.
 */
function getBasicTemplate(templateName, stackConfig) {
  const language = stackConfig.language || getStackLanguage(stackConfig, 'backend');

  const templatesByLanguage = {
    java: {
      service: `
@Service
@RequiredArgsConstructor
public class {{className}} {
    private final {{repositoryName}} {{repositoryVar}};

    public {{returnType}} {{methodName}}() {
        return {{repositoryVar}}.findAll();
    }
}`,
      controller: `
@RestController
@RequestMapping("/api/{{resource}}")
@RequiredArgsConstructor
public class {{className}} {
    private final {{serviceName}} {{serviceVar}};

    @GetMapping
    public ResponseEntity<List<{{entityName}}>> getAll() {
        return ResponseEntity.ok({{serviceVar}}.findAll());
    }
}`
    },
    csharp: {
      service: `
public class {{className}} : I{{className}}
{
    private readonly {{repositoryName}} _{{repositoryVar}};

    public {{className}}({{repositoryName}} {{repositoryVar}})
    {
        _{{repositoryVar}} = {{repositoryVar}};
    }

    public async Task<IEnumerable<{{entityName}}>> {{methodName}}()
    {
        return await _{{repositoryVar}}.GetAllAsync();
    }
}`,
      controller: `
[ApiController]
[Route("api/[controller]")]
public class {{className}} : ControllerBase
{
    private readonly I{{serviceName}} _{{serviceVar}};

    public {{className}}(I{{serviceName}} {{serviceVar}})
    {
        _{{serviceVar}} = {{serviceVar}};
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<{{entityName}}>>> GetAll()
    {
        return Ok(await _{{serviceVar}}.GetAllAsync());
    }
}`
    },
    typescript: {
      service: `
@Injectable()
export class {{className}} {
  constructor(
    @InjectRepository({{entityName}})
    private readonly {{repositoryName}}: Repository<{{entityName}}>,
  ) {}

  async {{methodName}}(): Promise<{{returnType}}[]> {
    return this.{{repositoryName}}.find();
  }
}`,
      controller: `
@Controller('{{resource}}')
export class {{className}} {
  constructor(private readonly {{serviceName}}: {{serviceType}}) {}

  @Get()
  async getAll(): Promise<{{entityName}}[]> {
    return this.{{serviceName}}.findAll();
  }
}`
    },
    python: {
      router: `
@router.get("/{{resource}}", response_model=List[{{schemaName}}])
async def get_{{resource}}(
    db: Session = Depends(get_db),
    {{serviceName}}: {{serviceType}} = Depends()
):
    return await {{serviceName}}.get_all(db)`,
      service: `
class {{className}}:
    async def get_all(self, db: Session) -> List[{{modelName}}]:
        return db.query({{modelName}}).all()

    async def get_by_id(self, db: Session, id: int) -> {{modelName}}:
        return db.query({{modelName}}).filter({{modelName}}.id == id).first()`
    }
  };

  const langTemplates = templatesByLanguage[language] || {};
  const template = langTemplates[templateName];

  if (template) {
    return template.trim();
  }

  return `export class {{className}} { {{methodName}}() {} }`;
}

// ============================================
// KB PATH RESOLUTION
// ============================================

/**
 * Resolve Knowledge Base path for stack (delegates to KBLoader)
 *
 * @param {Object} stackConfig - Stack configuration
 * @param {string} kbType - KB type (backend, frontend, database)
 * @returns {string} - KB file path
 */
function resolveKBPath(stackConfig, kbType = 'backend') {
  const kbLoader = new KBLoader();
  const kbPath = stackConfig.kbPath?.[kbType];

  if (kbPath) {
    return kbLoader.resolveKBPath(kbPath);
  }

  // Fallback to default KB path
  const defaultPath = kbLoader.defaultKBPaths[kbType];
  return defaultPath ? kbLoader.resolveKBPath(defaultPath) : null;
}

/**
 * Load Knowledge Base for stack (delegates to KBLoader)
 *
 * @param {Object} stackConfig - Stack configuration with kbPath and patterns
 * @param {string} kbType - KB type (backend, frontend, database)
 * @returns {Object} - Parsed and filtered KB object
 */
function loadStackKB(stackConfig, kbType = 'backend') {
  const kbLoader = new KBLoader();

  // Build variantContext from stackConfig for KBLoader
  const variantContext = {
    kb_path: stackConfig.kbPath || {},
    patterns: stackConfig.patterns || {}
  };

  try {
    const kbs = kbLoader.loadKB(variantContext);
    return kbs[kbType] || { categories: [] };
  } catch (error) {
    console.warn(`Warning: Failed to load KB via KBLoader: ${error.message}`);
    return { categories: [] };
  }
}

// ============================================
// LANGUAGE DETECTION
// ============================================

/**
 * Get programming language for stack layer.
 * Reads from stack JSON `language` and `frontendLanguage` fields (data-driven).
 * Supports: java, csharp, python, typescript, dart, etc.
 */
function getStackLanguage(stackConfig, layer = 'backend') {
  if (layer === 'backend') {
    return stackConfig.language || 'java';
  }
  // Frontend language: default typescript, but support dart (Flutter), etc.
  return stackConfig.frontendLanguage || 'typescript';
}

/**
 * Get file extension for stack layer
 */
function getFileExtension(stackConfig, layer = 'backend') {
  const language = getStackLanguage(stackConfig, layer);

  // Use stack JSON extensions field if available
  if (stackConfig.extensions && stackConfig.extensions.length > 0) {
    return stackConfig.extensions[0];
  }

  const extensionMap = {
    java: '.java',
    csharp: '.cs',
    typescript: '.ts',
    javascript: '.js',
    python: '.py',
    dart: '.dart',
    php: '.php'
  };

  return extensionMap[language] || '.ts';
}

// ============================================
// INTEGRATION WORKFLOW
// ============================================

/**
 * Execute with multi-stack support
 * Integrates Days 3-6 with stack-specific routing
 *
 * @param {Object} step - Step definition
 * @param {Object} context - Validated context
 * @param {Object} options - Execution options
 * @returns {Object} - Execution result with stack info
 */
async function executeWithMultiStack(step, context, options = {}) {
  const result = {
    success: false,
    stack: null,
    specialist: null,
    template: null,
    language: null,
    errors: []
  };

  try {
    // Step 1: Resolve stack configuration
    const stackConfig = await resolveStackConfiguration(context);
    result.stack = {
      id: stackConfig.id,
      name: stackConfig.name,
      variant: stackConfig.variant
    };

    // Step 2: Select specialist
    const specialist = selectSpecialistByStack(step, stackConfig);
    result.specialist = specialist;

    // Step 3: Load template
    const templateName = step.template || step.type || 'service';
    const template = loadStackTemplate(templateName, stackConfig);
    result.template = templateName;

    // Step 4: Determine language
    const layer = step.layer || 'backend';
    const language = getStackLanguage(stackConfig, layer);
    result.language = language;

    // Step 5: Load KB
    const kb = loadStackKB(stackConfig, layer === 'frontend' ? 'frontend' : 'backend');
    result.kbPatterns = kb.patterns?.length || 0;

    result.success = true;
    return result;

  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Stack resolution
  resolveStackConfiguration,
  getStackDisplayName,

  // Specialist selection
  selectSpecialistByStack,
  getAllSpecialistsForStack,

  // Template loading
  loadStackTemplate,
  getBasicTemplate,

  // KB resolution
  resolveKBPath,
  loadStackKB,

  // Language detection
  getStackLanguage,
  getFileExtension,

  // Integration
  executeWithMultiStack,

  // Utilities
  resolveByConvention
};
