import { Octokit } from '@octokit/rest';
import { BaseGitHubAgent } from './BaseGitHubAgent.js';
/**
 * GitHub Agent
 * Discovers and analyzes GitHub repositories, detects repository types
 */
export class GitHubAgent extends BaseGitHubAgent {
    octokit = null;
    rateLimitRemaining = 5000;
    rateLimitReset = 0;
    repositoryCache = new Map();
    async init() {
        // Initialize Octokit with token if available
        const githubToken = process.env.GITHUB_TOKEN;
        this.octokit = new Octokit({
            auth: githubToken,
            userAgent: 'A2A-Developer-Agent/1.0',
        });
        // Check rate limit
        await this.checkRateLimit();
        console.log('✅ GitHub Agent initialized');
    }
    async handleRequest(request) {
        const req = request;
        switch (req.action) {
            case 'discover':
                return await this.discoverRepositories(req.query || '', req.limit);
            case 'analyze':
                return await this.analyzeRepository(req.owner, req.repo);
            case 'detectType':
                return await this.detectRepositoryType(req.owner, req.repo);
            default:
                return { error: 'Unknown action' };
        }
    }
    async shutdown() {
        this.repositoryCache.clear();
        console.log('🔴 GitHub Agent shut down');
    }
    /**
     * Discover repositories based on a search query
     */
    async discoverRepositories(query, limit = 10) {
        if (!this.octokit) {
            return { error: 'GitHub client not initialized' };
        }
        try {
            await this.checkRateLimit();
            const { data } = await this.octokit.rest.search.repos({
                q: query,
                sort: 'stars',
                order: 'desc',
                per_page: Math.min(limit, 100),
            });
            const repositories = await Promise.all(data.items.map(async (repo) => {
                const cached = this.repositoryCache.get(repo.full_name);
                if (cached)
                    return cached;
                if (!repo.owner)
                    return null;
                const metadata = await this.extractRepositoryMetadata(repo.owner.login, repo.name);
                this.repositoryCache.set(repo.full_name, metadata);
                return metadata;
            })).then((repos) => repos.filter((r) => r !== null));
            return { repositories };
        }
        catch (error) {
            console.error('Error discovering repositories:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Analyze a specific repository
     */
    async analyzeRepository(owner, repo) {
        try {
            const cached = this.repositoryCache.get(`${owner}/${repo}`);
            if (cached) {
                return { repository: cached };
            }
            const metadata = await this.extractRepositoryMetadata(owner, repo);
            this.repositoryCache.set(`${owner}/${repo}`, metadata);
            return { repository: metadata };
        }
        catch (error) {
            console.error('Error analyzing repository:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    /**
     * Extract metadata from a GitHub repository
     */
    async extractRepositoryMetadata(owner, repo) {
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }
        await this.checkRateLimit();
        // Get repository details
        const { data: repoData } = await this.octokit.rest.repos.get({
            owner,
            repo,
        });
        // Get languages
        const { data: languages } = await this.octokit.rest.repos.listLanguages({
            owner,
            repo,
        });
        // Detect repository type
        const detectedType = await this.detectRepositoryType(owner, repo);
        return {
            fullName: repoData.full_name,
            owner: repoData.owner.login,
            name: repoData.name,
            description: repoData.description || undefined,
            detectedType: detectedType.type || 'unknown',
            detectionConfidence: detectedType.confidence || 0,
            defaultBranch: repoData.default_branch,
            primaryLanguage: repoData.language || 'unknown',
            languages,
            sizeKb: repoData.size,
            lastUpdated: new Date(repoData.updated_at),
            topics: repoData.topics || [],
            cachedAt: new Date(),
        };
    }
    /**
     * Detect repository type based on files and structure
     */
    async detectRepositoryType(owner, repo) {
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }
        await this.checkRateLimit();
        const indicators = [];
        let type = 'unknown';
        let confidence = 0;
        try {
            // Get repository contents at root
            const { data: contents } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path: '',
            });
            if (!Array.isArray(contents)) {
                return { type: 'unknown', confidence: 0, indicators: [] };
            }
            const files = contents.map((item) => item.name.toLowerCase());
            // Detect Node.js API
            if (files.includes('package.json')) {
                const packageJson = await this.getFileContent(owner, repo, 'package.json');
                if (packageJson) {
                    const pkg = JSON.parse(packageJson);
                    // Check for Express/Fastify/NestJS
                    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                    if (deps?.express || deps?.fastify || deps?.['@nestjs/core']) {
                        type = 'node-api';
                        confidence = 90;
                        indicators.push('package.json with API framework');
                    }
                }
            }
            // Detect React
            if (files.includes('package.json')) {
                const packageJson = await this.getFileContent(owner, repo, 'package.json');
                if (packageJson) {
                    const pkg = JSON.parse(packageJson);
                    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                    if (deps?.react) {
                        type = 'react';
                        confidence = 90;
                        indicators.push('package.json with React');
                    }
                }
            }
            // Detect Angular
            if (files.includes('angular.json') || files.includes('angular-cli.json')) {
                type = 'angular';
                confidence = 95;
                indicators.push('angular.json found');
            }
            // Detect C# API
            if (files.some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))) {
                const csprojFiles = contents.filter((item) => item.name.toLowerCase().endsWith('.csproj'));
                if (csprojFiles.length > 0 && csprojFiles[0]) {
                    const csprojContent = await this.getFileContent(owner, repo, csprojFiles[0].name);
                    if (csprojContent?.includes('Microsoft.AspNetCore')) {
                        type = 'csharp-api';
                        confidence = 90;
                        indicators.push('.csproj with AspNetCore');
                    }
                    else {
                        type = 'csharp-library';
                        confidence = 85;
                        indicators.push('.csproj found');
                    }
                }
            }
            // If still unknown, make educated guess based on languages
            if (type === 'unknown') {
                const { data: languages } = await this.octokit.rest.repos.listLanguages({
                    owner,
                    repo,
                });
                const primaryLanguage = Object.keys(languages)[0];
                if (primaryLanguage === 'TypeScript' || primaryLanguage === 'JavaScript') {
                    type = 'node-api';
                    confidence = 50;
                    indicators.push(`Primary language: ${primaryLanguage}`);
                }
                else if (primaryLanguage === 'C#') {
                    type = 'csharp-library';
                    confidence = 50;
                    indicators.push('Primary language: C#');
                }
            }
            return { type, confidence, indicators };
        }
        catch (error) {
            console.error('Error detecting repository type:', error);
            return { type: 'unknown', confidence: 0, indicators: [] };
        }
    }
    /**
     * Get file content from repository
     */
    async getFileContent(owner, repo, path) {
        if (!this.octokit)
            return null;
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
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
     * Check GitHub API rate limit
     */
    async checkRateLimit() {
        if (!this.octokit)
            return;
        // Check if we're close to reset time
        const now = Date.now() / 1000;
        if (now < this.rateLimitReset && this.rateLimitRemaining < 100) {
            const waitTime = (this.rateLimitReset - now) * 1000;
            console.warn(`⚠️ GitHub rate limit low (${this.rateLimitRemaining} remaining). Waiting ${Math.round(waitTime / 1000)}s...`);
            await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 60000)));
        }
        // Update rate limit info
        try {
            const { data } = await this.octokit.rest.rateLimit.get();
            this.rateLimitRemaining = data.rate.remaining;
            this.rateLimitReset = data.rate.reset;
            if (this.rateLimitRemaining < 50) {
                console.warn(`⚠️ GitHub API rate limit low: ${this.rateLimitRemaining} remaining`);
            }
        }
        catch (error) {
            console.error('Error checking rate limit:', error);
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
                from: 'github-agent',
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
            from: 'github-agent',
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
//# sourceMappingURL=index.js.map