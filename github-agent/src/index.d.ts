import { BaseGitHubAgent } from './BaseGitHubAgent.js';
import type { AgentMessage } from '@developer-agent/shared';
/**
 * GitHub Agent
 * Discovers and analyzes GitHub repositories, detects repository types
 */
export declare class GitHubAgent extends BaseGitHubAgent {
    private octokit;
    private rateLimitRemaining;
    private rateLimitReset;
    private repositoryCache;
    init(): Promise<void>;
    handleRequest(request: unknown): Promise<unknown>;
    shutdown(): Promise<void>;
    /**
     * Discover repositories based on a search query
     */
    private discoverRepositories;
    /**
     * Analyze a specific repository
     */
    private analyzeRepository;
    /**
     * Extract metadata from a GitHub repository
     */
    private extractRepositoryMetadata;
    /**
     * Detect repository type based on files and structure
     */
    private detectRepositoryType;
    /**
     * Get file content from repository
     */
    private getFileContent;
    /**
     * Check GitHub API rate limit
     */
    private checkRateLimit;
    /**
     * Handle incoming agent messages
     */
    handleMessage(message: AgentMessage): Promise<AgentMessage | null>;
    /**
     * Create error response message
     */
    protected createErrorResponse(originalMessage: AgentMessage, code: string, message: string): AgentMessage;
}
//# sourceMappingURL=index.d.ts.map