import { Octokit } from '@octokit/rest';
import { v4 as uuidv4 } from 'uuid';
import { BaseGitHubAgent } from './BaseGitHubAgent.js';
import type { AgentMessage, RepositoryType, RepositoryMetadata } from '@developer-agent/shared';

interface RepositoryDiscoveryRequest {
  action: 'discover' | 'analyze' | 'detectType';
  owner?: string;
  repo?: string;
  query?: string;
  limit?: number;
}

interface RepositoryDiscoveryResponse {
  repositories?: RepositoryMetadata[];
  repository?: RepositoryMetadata;
  error?: string;
}

/**
 * GitHub Agent
 * Discovers and analyzes GitHub repositories, detects repository types
 */
export class GitHubAgent extends BaseGitHubAgent {
  private octokit: Octokit | null = null;
  private rateLimitRemaining = 5000;
  private rateLimitReset = 0;
  private repositoryCache = new Map<string, RepositoryMetadata>();
  private configuredRepositories: Array<{ owner: string; name: string; enabled: boolean }> = [];

  async init(): Promise<void> {
    // Initialize Octokit with token if available
    const githubToken = process.env.GITHUB_TOKEN;

    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'A2A-Developer-Agent/1.0',
    });

    // Load configured repositories
    await this.loadConfiguredRepositories();

    // Check rate limit
    await this.checkRateLimit();

    console.log('✅ GitHub Agent initialized');
  }

  /**
   * Load configured repositories from config/repositories.json
   */
  private async loadConfiguredRepositories(): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const { resolve, dirname } = await import('path');
      const { fileURLToPath } = await import('url');

      // Get project root (go up from github-agent/src to project root)
      const currentFile = fileURLToPath(import.meta.url);
      const projectRoot = resolve(dirname(currentFile), '../../..');
      const configPath = resolve(projectRoot, 'config/repositories.json');

      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      this.configuredRepositories = config.repositories || [];
      this.log('info', 'Loaded configured repositories', {
        count: this.configuredRepositories.length,
      });
    } catch (error) {
      this.log('warn', 'Failed to load configured repositories, will use GitHub search', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.configuredRepositories = [];
    }
  }

  /**
   * Handle incoming messages (A2A Pattern - Autonomous)
   * Process requests autonomously and initiate collaboration with other agents
   */
  override async handleMessage(message: AgentMessage): Promise<AgentMessage | null> {
    // Debug logging to understand message structure
    this.log('info', 'GitHub Agent handleMessage called', {
      messageId: message.id,
      hasContent: !!message.content,
      contentKeys: message.content ? Object.keys(message.content) : [],
      messageType: message.messageType,
    });

    // Defensive check: ensure message.content exists
    if (!message.content) {
      this.log('error', 'Received message with no content', { messageId: message.id, message });
      return null;
    }

    const params = message.content.parameters ?? {};
    const action = message.content.action;

    this.log('info', 'GitHub Agent received message', {
      from: message.from,
      action,
      taskId: params?.taskId,
    });

    if (message.messageType === 'request' && action === 'discover') {
      return await this.processSearchRequest(message);
    }

    if (message.messageType === 'command' && action === 'cancel') {
      return await this.processCancelCommand(message);
    }

    return null;
  }

  /**
   * Process search request autonomously
   * Discover repositories and initiate collaboration with Repository Agents
   */
  private async processSearchRequest(message: AgentMessage): Promise<AgentMessage> {
    // Defensive check: ensure message.content and parameters exist
    if (!message.content || !message.content.parameters) {
      this.log('error', 'Search request missing content or parameters', { messageId: message.id });
      return {
        id: uuidv4(),
        from: this.agentId,
        to: message.from,
        messageType: 'response',
        content: {
          status: { state: 'error', details: 'Invalid request: missing content or parameters' },
        },
        timestamp: new Date(),
        priority: 'normal',
      };
    }

    const params = message.content.parameters;
    const query = params?.query as string;
    const taskId = params?.taskId as string;
    const limit = (params?.limit as number) || 5;

    // Notify supervisor: starting work
    this.sendNotification(message.from, 'started', taskId, {
      action: 'discover',
      query,
    });

    try {
      // Discover repositories
      const result = await this.discoverRepositories(query, limit);

      if (result.repositories && result.repositories.length > 0) {
        this.log('info', 'Discovered repositories', {
          count: result.repositories.length,
          taskId,
        });

        // Autonomously initiate collaboration with Repository Agents
        // (In full implementation, would send messages to Repository Agents here)
        // For now, just notify supervisor of completion

        // Store results in message
        const responseMessage: AgentMessage = {
          id: this.generateMessageId(),
          from: this.agentId,
          to: message.from,
          messageType: 'response',
          content: {
            action: 'discover',
            data: result,
            parameters: { taskId },
          },
          timestamp: new Date(),
          priority: 'normal',
        };

        // Notify supervisor: completed
        this.sendNotification(message.from, 'completed', taskId, {
          repositoryCount: result.repositories.length,
          repositories: result.repositories.map((r) => r.fullName),
        });

        return responseMessage;
      } else {
        // No repositories found
        this.sendNotification(message.from, 'completed', taskId, {
          repositoryCount: 0,
          warning: 'No repositories found',
        });

        return {
          id: this.generateMessageId(),
          from: this.agentId,
          to: message.from,
          messageType: 'response',
          content: {
            action: 'discover',
            data: { repositories: [] },
            parameters: { taskId },
          },
          timestamp: new Date(),
          priority: 'normal',
        };
      }
    } catch (error) {
      this.log('error', 'Failed to discover repositories', { error, taskId });

      // Notify supervisor: failed
      this.sendNotification(message.from, 'failed', taskId, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        id: this.generateMessageId(),
        from: this.agentId,
        to: message.from,
        messageType: 'error',
        content: {
          action: 'discover',
          error: {
            code: 'DISCOVERY_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          },
          parameters: { taskId },
        },
        timestamp: new Date(),
        priority: 'normal',
      };
    }
  }

  /**
   * Process cancel command from supervisor
   */
  private async processCancelCommand(message: AgentMessage): Promise<AgentMessage> {
    // Defensive check: ensure message.content exists
    if (!message.content) {
      this.log('error', 'Cancel command missing content', { messageId: message.id });
      return {
        id: uuidv4(),
        from: this.agentId,
        to: message.from,
        messageType: 'response',
        content: {
          status: { state: 'error', details: 'Invalid cancel command: missing content' },
        },
        timestamp: new Date(),
        priority: 'normal',
      };
    }

    const params = message.content.parameters as Record<string, unknown>;
    const taskId = params?.taskId as string;
    const reason = params?.reason as string;

    this.log('warn', 'GitHub Agent received cancel command', { taskId, reason });

    // Cancel any ongoing operations (placeholder for now)
    // In a real implementation, would cancel API requests, cleanup resources, etc.

    return {
      id: this.generateMessageId(),
      from: this.agentId,
      to: message.from,
      messageType: 'response',
      content: {
        action: 'cancel',
        data: { success: true, cancelled: true },
        parameters: { taskId },
      },
      timestamp: new Date(),
      priority: 'normal',
    };
  }

  /**
   * Send status notification to supervisor
   */
  private sendNotification(
    to: string,
    status: string,
    taskId: string,
    details?: Record<string, unknown>
  ): void {
    // Note: In a real implementation, would use MessageRouter to send
    // For now, this is a placeholder showing the A2A pattern
    this.log('info', 'Sending notification', { to, status, taskId, details });
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  override async handleRequest(request: unknown): Promise<unknown> {
    const req = request as RepositoryDiscoveryRequest;

    switch (req.action) {
      case 'discover':
        return await this.discoverRepositories(req.query || '', req.limit);
      case 'analyze':
        return await this.analyzeRepository(req.owner!, req.repo!);
      case 'detectType':
        return await this.detectRepositoryType(req.owner!, req.repo!);
      default:
        return { error: 'Unknown action' };
    }
  }

  async shutdown(): Promise<void> {
    this.repositoryCache.clear();
    console.log('🔴 GitHub Agent shut down');
  }

  /**
   * Discover repositories based on a search query
   * Filters results to only include configured repositories
   */
  private async discoverRepositories(
    query: string,
    limit = 10
  ): Promise<RepositoryDiscoveryResponse> {
    if (!this.octokit) {
      return { error: 'GitHub client not initialized' };
    }

    try {
      // If we have configured repositories, filter by them
      if (this.configuredRepositories.length > 0) {
        this.log('info', 'Discovering from configured repositories', {
          query,
          configuredCount: this.configuredRepositories.length,
        });

        // Filter enabled repositories that match the query
        const enabledRepos = this.configuredRepositories.filter(
          (r) => r.enabled !== false
        );

        // Simple text matching on owner/name if query is provided
        const matchingRepos = query
          ? enabledRepos.filter((r) => {
              const fullName = `${r.owner}/${r.name}`.toLowerCase();
              const searchTerms = query.toLowerCase().split(' ');
              return searchTerms.some((term) => fullName.includes(term));
            })
          : enabledRepos;

        // Limit results
        const reposToAnalyze = matchingRepos.slice(0, limit);

        this.log('info', 'Analyzing matching configured repositories', {
          matchingCount: matchingRepos.length,
          analyzingCount: reposToAnalyze.length,
        });

        // Analyze each matching repository
        const repositories: RepositoryMetadata[] = await Promise.all(
          reposToAnalyze.map(async (repo) => {
            const fullName = `${repo.owner}/${repo.name}`;
            const cached = this.repositoryCache.get(fullName);
            if (cached) return cached;

            try {
              await this.checkRateLimit();
              const metadata = await this.extractRepositoryMetadata(repo.owner, repo.name);
              this.repositoryCache.set(fullName, metadata);
              return metadata;
            } catch (error) {
              this.log('warn', 'Failed to analyze repository', {
                repo: fullName,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              return null;
            }
          })
        ).then((repos) => repos.filter((r): r is RepositoryMetadata => r !== null));

        return { repositories };
      }

      // Fallback: use GitHub search API if no configured repositories
      this.log('info', 'No configured repositories, using GitHub search', { query });
      await this.checkRateLimit();

      const { data } = await this.octokit.rest.search.repos({
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: Math.min(limit, 100),
      });

      const repositories: RepositoryMetadata[] = await Promise.all(
        data.items.map(async (repo) => {
          const cached = this.repositoryCache.get(repo.full_name);
          if (cached) return cached;

          if (!repo.owner) return null;

          const metadata = await this.extractRepositoryMetadata(repo.owner.login, repo.name);
          this.repositoryCache.set(repo.full_name, metadata);
          return metadata;
        })
      ).then((repos) => repos.filter((r): r is RepositoryMetadata => r !== null));

      return { repositories };
    } catch (error) {
      console.error('Error discovering repositories:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Analyze a specific repository
   */
  private async analyzeRepository(
    owner: string,
    repo: string
  ): Promise<RepositoryDiscoveryResponse> {
    try {
      const cached = this.repositoryCache.get(`${owner}/${repo}`);
      if (cached) {
        return { repository: cached };
      }

      const metadata = await this.extractRepositoryMetadata(owner, repo);
      this.repositoryCache.set(`${owner}/${repo}`, metadata);

      return { repository: metadata };
    } catch (error) {
      console.error('Error analyzing repository:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Extract metadata from a GitHub repository
   */
  private async extractRepositoryMetadata(
    owner: string,
    repo: string
  ): Promise<RepositoryMetadata> {
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
  private async detectRepositoryType(
    owner: string,
    repo: string
  ): Promise<{ type: RepositoryType; confidence: number; indicators: string[] }> {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    await this.checkRateLimit();

    const indicators: string[] = [];
    let type: RepositoryType = 'unknown';
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
          const pkg = JSON.parse(packageJson) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          };

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
          const pkg = JSON.parse(packageJson) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          };
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
          } else {
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
        } else if (primaryLanguage === 'C#') {
          type = 'csharp-library';
          confidence = 50;
          indicators.push('Primary language: C#');
        }
      }

      return { type, confidence, indicators };
    } catch (error) {
      console.error('Error detecting repository type:', error);
      return { type: 'unknown', confidence: 0, indicators: [] };
    }
  }

  /**
   * Get file content from repository
   */
  private async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    if (!this.octokit) return null;

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
    } catch (error) {
      return null;
    }
  }

  /**
   * Check GitHub API rate limit
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.octokit) return;

    // Check if we're close to reset time
    const now = Date.now() / 1000;
    if (now < this.rateLimitReset && this.rateLimitRemaining < 100) {
      const waitTime = (this.rateLimitReset - now) * 1000;
      console.warn(
        `⚠️ GitHub rate limit low (${this.rateLimitRemaining} remaining). Waiting ${Math.round(waitTime / 1000)}s...`
      );
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
    } catch (error) {
      console.error('Error checking rate limit:', error);
    }
  }
}
