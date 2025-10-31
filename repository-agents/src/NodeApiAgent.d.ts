import { BaseAgent, type BaseAgentConfig, type AgentMessage } from '@developer-agent/shared';
/**
 * Node.js API Repository Agent
 * Analyzes Node.js API repositories, extracts dependencies, generates embeddings
 */
export declare class NodeApiAgent extends BaseAgent {
    private embeddings;
    private octokit;
    private pgPool;
    private analysisCache;
    constructor(repositoryName: string, config?: Partial<BaseAgentConfig>);
    init(): Promise<void>;
    handleRequest(request: unknown): Promise<unknown>;
    shutdown(): Promise<void>;
    /**
     * Analyze a Node.js API repository
     */
    private analyzeRepository;
    /**
     * Extract dependencies from package.json
     */
    private extractDependencies;
    /**
     * Categorize a dependency
     */
    private categorizeDependency;
    /**
     * Detect the main framework
     */
    private detectFramework;
    /**
     * Get file structure of repository
     */
    private getFileStructure;
    /**
     * Extract API endpoints from code (basic implementation)
     */
    private extractApiEndpoints;
    /**
     * Semantic search using embeddings
     */
    private semanticSearch;
    /**
     * Store embedding in PostgreSQL
     */
    private storeEmbedding;
    /**
     * Create a text description of the repository for embedding
     */
    private createRepositoryDescription;
    /**
     * Get file content from GitHub
     */
    private getFileContent;
    /**
     * Handle incoming agent messages
     */
    handleMessage(message: AgentMessage): Promise<AgentMessage | null>;
    /**
     * Create error response message
     */
    protected createErrorResponse(originalMessage: AgentMessage, code: string, message: string): AgentMessage;
}
//# sourceMappingURL=NodeApiAgent.d.ts.map