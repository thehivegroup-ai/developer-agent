import { OpenAIEmbeddings } from '@langchain/openai';
import { BaseAgent } from '@developer-agent/shared';
import { Pool } from 'pg';
import { Octokit } from '@octokit/rest';
/**
 * Node.js API Repository Agent
 * Analyzes Node.js API repositories, extracts dependencies, generates embeddings
 */
export class NodeApiAgent extends BaseAgent {
    embeddings = null;
    octokit = null;
    pgPool = null;
    analysisCache = new Map();
    constructor(repositoryName, config) {
        super({
            agentType: 'repository',
            repositoryType: 'node-api',
            repositoryName,
            ttlMinutes: config?.ttlMinutes || 60,
            ...config,
        });
    }
    async init() {
        // Initialize OpenAI embeddings
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
            this.embeddings = new OpenAIEmbeddings({
                openAIApiKey: openaiApiKey,
                modelName: 'text-embedding-3-small',
            });
        }
        else {
            console.warn('⚠️ OPENAI_API_KEY not set, embeddings disabled');
        }
        // Initialize GitHub client
        const githubToken = process.env.GITHUB_TOKEN;
        this.octokit = new Octokit({
            auth: githubToken,
            userAgent: 'A2A-Developer-Agent/1.0',
        });
        // Initialize PostgreSQL connection
        this.pgPool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
        });
        console.log(`✅ Node API Agent initialized for ${this.repositoryName}`);
    }
    async handleRequest(request) {
        const req = request;
        switch (req.action) {
            case 'analyze':
                return await this.analyzeRepository(req.owner, req.repo, req.branch);
            case 'search':
                return await this.semanticSearch(req.query);
            case 'extract-endpoints':
                return await this.extractApiEndpoints(req.owner, req.repo);
            default:
                return { error: 'Unknown action' };
        }
    }
    async shutdown() {
        if (this.pgPool) {
            await this.pgPool.end();
        }
        this.analysisCache.clear();
        console.log(`🔴 Node API Agent shut down for ${this.repositoryName}`);
    }
    /**
     * Analyze a Node.js API repository
     */
    async analyzeRepository(owner, repo, branch = 'main') {
        const cacheKey = `${owner}/${repo}@${branch}`;
        const cached = this.analysisCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            if (!this.octokit) {
                return { error: 'GitHub client not initialized' };
            }
            // Get package.json
            const packageJson = await this.getFileContent(owner, repo, 'package.json', branch);
            if (!packageJson) {
                return { error: 'package.json not found' };
            }
            const pkg = JSON.parse(packageJson);
            // Extract dependencies
            const dependencies = this.extractDependencies(pkg);
            // Detect framework
            const framework = this.detectFramework(dependencies);
            // Get file structure
            const fileStructure = await this.getFileStructure(owner, repo, branch);
            // Generate embedding for the repository
            let embedding;
            if (this.embeddings) {
                const description = this.createRepositoryDescription(pkg, dependencies, framework);
                const embeddingResult = await this.embeddings.embedQuery(description);
                embedding = embeddingResult;
                // Store in PostgreSQL
                await this.storeEmbedding(owner, repo, description, embedding);
            }
            const result = {
                repository: `${owner}/${repo}`,
                framework,
                dependencies,
                fileStructure,
                embedding,
            };
            this.analysisCache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            console.error('Error analyzing repository:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Extract dependencies from package.json
     */
    extractDependencies(pkg) {
        const dependencies = [];
        // Process regular dependencies
        if (pkg.dependencies) {
            for (const [name, version] of Object.entries(pkg.dependencies)) {
                dependencies.push({
                    name,
                    version,
                    isDev: false,
                    category: this.categorizeDependency(name),
                });
            }
        }
        // Process dev dependencies
        if (pkg.devDependencies) {
            for (const [name, version] of Object.entries(pkg.devDependencies)) {
                dependencies.push({
                    name,
                    version,
                    isDev: true,
                    category: this.categorizeDependency(name),
                });
            }
        }
        return dependencies;
    }
    /**
     * Categorize a dependency
     */
    categorizeDependency(name) {
        const frameworks = ['express', 'fastify', 'koa', 'nestjs', 'hapi'];
        const databases = ['pg', 'mysql', 'mongodb', 'redis', 'sqlite'];
        const testing = ['jest', 'mocha', 'vitest', 'chai', 'jasmine'];
        if (frameworks.some((f) => name.includes(f)))
            return 'framework';
        if (databases.some((d) => name.includes(d)))
            return 'database';
        if (testing.some((t) => name.includes(t)))
            return 'testing';
        return 'utility';
    }
    /**
     * Detect the main framework
     */
    detectFramework(dependencies) {
        const frameworks = ['express', 'fastify', 'koa', '@nestjs/core', 'hapi'];
        for (const framework of frameworks) {
            if (dependencies.some((d) => d.name === framework || d.name.includes(framework))) {
                return framework;
            }
        }
        return 'unknown';
    }
    /**
     * Get file structure of repository
     */
    async getFileStructure(owner, repo, branch) {
        if (!this.octokit)
            return [];
        try {
            const { data: tree } = await this.octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: 'true',
            });
            return tree.tree
                .filter((item) => item.type === 'blob')
                .map((item) => item.path || '')
                .filter((path) => path.endsWith('.js') || path.endsWith('.ts'));
        }
        catch (error) {
            console.error('Error getting file structure:', error);
            return [];
        }
    }
    /**
     * Extract API endpoints from code (basic implementation)
     */
    async extractApiEndpoints(owner, repo) {
        try {
            // Look for common route files
            const routeFiles = ['routes/index.js', 'routes/index.ts', 'src/routes.ts', 'src/app.ts'];
            const endpoints = [];
            for (const file of routeFiles) {
                const content = await this.getFileContent(owner, repo, file);
                if (content) {
                    // Simple regex to find route definitions
                    const routePatterns = [
                        /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
                        /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
                        /\.route\(['"]([^'"]+)['"]/g,
                    ];
                    for (const pattern of routePatterns) {
                        let match;
                        while ((match = pattern.exec(content)) !== null) {
                            const endpoint = match[2] || match[1];
                            if (endpoint && !endpoints.includes(endpoint)) {
                                endpoints.push(endpoint);
                            }
                        }
                    }
                }
            }
            return { endpoints };
        }
        catch (error) {
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Semantic search using embeddings
     */
    async semanticSearch(query, limit = 10) {
        if (!this.embeddings || !this.pgPool) {
            return { error: 'Embeddings or database not initialized' };
        }
        try {
            // Generate embedding for query
            const queryEmbedding = await this.embeddings.embedQuery(query);
            // Search in PostgreSQL using pgvector
            const result = await this.pgPool.query(`
        SELECT 
          repository,
          description,
          1 - (embedding <=> $1::vector) as similarity
        FROM repository_embeddings
        WHERE repository_type = 'node-api'
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `, [JSON.stringify(queryEmbedding), limit]);
            return result.rows.map((row) => ({
                repository: row.repository,
                similarity: row.similarity,
                description: row.description,
            }));
        }
        catch (error) {
            console.error('Error performing semantic search:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Store embedding in PostgreSQL
     */
    async storeEmbedding(owner, repo, description, embedding) {
        if (!this.pgPool)
            return;
        try {
            await this.pgPool.query(`
        INSERT INTO repository_embeddings (repository, repository_type, description, embedding, created_at)
        VALUES ($1, $2, $3, $4::vector, NOW())
        ON CONFLICT (repository, repository_type)
        DO UPDATE SET
          description = EXCLUDED.description,
          embedding = EXCLUDED.embedding,
          updated_at = NOW()
      `, [`${owner}/${repo}`, 'node-api', description, JSON.stringify(embedding)]);
        }
        catch (error) {
            console.error('Error storing embedding:', error);
        }
    }
    /**
     * Create a text description of the repository for embedding
     */
    createRepositoryDescription(pkg, dependencies, framework) {
        const parts = [];
        parts.push(`Node.js API project: ${pkg.name}`);
        if (pkg.description) {
            parts.push(pkg.description);
        }
        parts.push(`Framework: ${framework}`);
        const mainDeps = dependencies
            .filter((d) => !d.isDev && d.category === 'framework')
            .map((d) => d.name);
        if (mainDeps.length > 0) {
            parts.push(`Uses: ${mainDeps.join(', ')}`);
        }
        const dbDeps = dependencies.filter((d) => d.category === 'database').map((d) => d.name);
        if (dbDeps.length > 0) {
            parts.push(`Databases: ${dbDeps.join(', ')}`);
        }
        return parts.join('. ');
    }
    /**
     * Get file content from GitHub
     */
    async getFileContent(owner, repo, path, branch = 'main') {
        if (!this.octokit)
            return null;
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref: branch,
            });
            if ('content' in data && data.content) {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Handle incoming agent messages
     */
    async handleMessage(message) {
        const action = message.content.action;
        if (!action) {
            return this.createErrorResponse(message, 'NO_ACTION', 'Message does not contain an action');
        }
        try {
            const result = await this.handleRequest(message.content.parameters || {});
            return {
                id: `response-${Date.now()}`,
                timestamp: new Date(),
                from: `node-api-agent-${this.repositoryName}`,
                to: message.from,
                messageType: 'response',
                content: {
                    data: result,
                },
                parentMessageId: message.id,
                conversationId: message.conversationId,
                priority: message.priority,
            };
        }
        catch (error) {
            return this.createErrorResponse(message, 'HANDLER_ERROR', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Create error response message
     */
    createErrorResponse(originalMessage, code, message) {
        return {
            id: `error-${Date.now()}`,
            timestamp: new Date(),
            from: `node-api-agent-${this.repositoryName}`,
            to: originalMessage.from,
            messageType: 'error',
            content: {
                error: {
                    code,
                    message,
                    recoverable: true,
                },
            },
            parentMessageId: originalMessage.id,
            conversationId: originalMessage.conversationId,
            priority: originalMessage.priority,
        };
    }
}
//# sourceMappingURL=NodeApiAgent.js.map