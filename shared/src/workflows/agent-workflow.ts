/**
 * LangGraph Workflow for Developer Agent System
 *
 * This workflow orchestrates the multi-agent system using workflow patterns.
 * It defines the flow from query processing through GitHub discovery to repository analysis.
 */

import type { AgentSystemState } from '../state/AgentSystemState.js';
import type { IAgent } from '../IAgent.js';

/**
 * Node: Query Decomposition
 * Breaks down user query into actionable tasks
 */
export async function queryDecompositionNode(
  state: AgentSystemState
): Promise<Partial<AgentSystemState>> {
  console.log('📋 Query Decomposition Node');

  const query = state.query.toLowerCase();
  const tasks = [];

  // Always start with repository discovery
  tasks.push({
    id: `task-${Date.now()}-1`,
    description: 'Discover and identify repositories',
    assignedTo: 'github',
    status: 'pending' as const,
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Check if query involves code analysis
  if (
    query.includes('code') ||
    query.includes('function') ||
    query.includes('class') ||
    query.includes('analyze') ||
    query.includes('dependencies')
  ) {
    tasks.push({
      id: `task-${Date.now()}-2`,
      description: 'Analyze code structure and semantics',
      assignedTo: 'repository',
      status: 'pending' as const,
      dependencies: [tasks[0]!.id],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Check if query involves relationships
  if (query.includes('relationship') || query.includes('depend') || query.includes('connect')) {
    tasks.push({
      id: `task-${Date.now()}-3`,
      description: 'Analyze repository relationships',
      assignedTo: 'relationship',
      status: 'pending' as const,
      dependencies: [tasks[0]!.id],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`   Created ${tasks.length} task(s)`);

  return {
    tasks,
    status: 'processing',
  };
}

/**
 * Node: GitHub Repository Discovery
 * Analyzes repositories from config/repositories.json
 */
export async function githubDiscoveryNode(
  state: AgentSystemState,
  agents: Map<string, IAgent>
): Promise<Partial<AgentSystemState>> {
  console.log('🔍 GitHub Discovery Node');

  const githubAgent = agents.get('github');
  if (!githubAgent) {
    throw new Error('GitHub Agent not registered');
  }

  // Find the GitHub task
  const githubTask = state.tasks.find((t) => t.assignedTo === 'github');
  if (!githubTask) {
    return state;
  }

  try {
    // Load repositories from config file
    const { readFile } = await import('fs/promises');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');

    // Get project root (go up from shared/src/workflows to project root)
    const currentFile = fileURLToPath(import.meta.url);
    const projectRoot = resolve(dirname(currentFile), '../../..');
    const configPath = resolve(projectRoot, 'config/repositories.json');

    console.log(`   Loading config from: ${configPath}`);
    const configData = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Filter enabled repositories
    const enabledRepos = config.repositories.filter((r: any) => r.enabled !== false);

    console.log(`   Analyzing ${enabledRepos.length} configured repositories...`);

    // Analyze each repository
    const repositories = [];
    for (const repo of enabledRepos) {
      try {
        const result = (await githubAgent.handleRequest({
          action: 'analyze',
          owner: repo.owner,
          repo: repo.name,
        })) as { repository?: any };

        if (result && result.repository) {
          repositories.push(result.repository);
        }
      } catch (error) {
        console.error(`   ⚠️  Failed to analyze ${repo.owner}/${repo.name}:`, error);
      }
    }

    const result = { repositories };
    console.log(`   Successfully analyzed ${repositories.length} repositories`);

    // Update task status
    const updatedTasks = state.tasks.map((t) =>
      t.id === githubTask.id
        ? { ...t, status: 'completed' as const, result, updatedAt: new Date() }
        : t
    );

    // Add result
    const newResult = {
      agentId: githubAgent.getMetadata().agentId,
      agentType: githubAgent.getMetadata().agentType,
      data: result,
      timestamp: new Date(),
    };

    return {
      tasks: updatedTasks,
      results: [...state.results, newResult],
    };
  } catch (error) {
    console.error('   GitHub discovery failed:', error);

    const updatedTasks = state.tasks.map((t) =>
      t.id === githubTask.id
        ? {
            ...t,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          }
        : t
    );

    return {
      tasks: updatedTasks,
      status: 'failed',
      error: error instanceof Error ? error.message : 'GitHub discovery failed',
    };
  }
}

/**
 * Node: Repository Code Analysis
 * Generates embeddings from repository metadata instead of cloning
 */
export async function repositoryAnalysisNode(
  state: AgentSystemState
): Promise<Partial<AgentSystemState>> {
  console.log('📊 Repository Analysis Node');

  // Find the repository task
  const repoTask = state.tasks.find((t) => t.assignedTo === 'repository');
  if (!repoTask) {
    return state;
  }

  // Get GitHub results
  const githubResult = state.results.find((r) => r.agentType === 'github');
  if (!githubResult || !githubResult.data) {
    console.log('   No GitHub results found, skipping analysis');
    return state;
  }

  const repositories = (
    githubResult.data as {
      repositories?: Array<{
        owner: string;
        name: string;
        primaryLanguage?: string;
        detectedType?: string;
      }>;
    }
  ).repositories;

  if (!repositories || repositories.length === 0) {
    console.log('   No repositories to analyze');
    return state;
  }

  // Analyze ALL repositories (support all languages and types)
  console.log(`   Analyzing ${repositories.length} repositories...`);

  const analyzedRepos = [];

  for (const repo of repositories) {
    if (!repo) continue;

    console.log(
      `   • ${repo.owner}/${repo.name} (${repo.primaryLanguage || 'unknown'}, ${(repo as any).detectedType || 'unknown'})`
    );

    try {
      // Generate embeddings from metadata for this repository
      const { generateEmbedding, storeEmbedding } = await import('../database/embeddings.js');

      // Create a rich text representation based on repository type
      let repoText = `
Repository: ${repo.owner}/${repo.name}
Description: ${(repo as any).description || 'No description'}
Primary Language: ${repo.primaryLanguage || 'Unknown'}
Type: ${(repo as any).detectedType || 'unknown'}
Size: ${(repo as any).sizeKb || 0} KB
Topics: ${(repo as any).topics?.join(', ') || 'None'}
Last Updated: ${(repo as any).lastUpdated || 'Unknown'}

This is a ${repo.primaryLanguage || 'unknown'} repository of type ${(repo as any).detectedType || 'unknown'}.
${(repo as any).description ? `It is described as: ${(repo as any).description}` : ''}
      `.trim();

      // Add type-specific context
      const repoType = (repo as any).detectedType;
      if (repoType === 'node-api') {
        repoText +=
          '\n\nThis is a Node.js API server, likely built with Express, Fastify, or NestJS.';
      } else if (repoType === 'react') {
        repoText += '\n\nThis is a React application with component-based architecture.';
      } else if (repoType === 'angular') {
        repoText += '\n\nThis is an Angular application with modular architecture.';
      } else if (repoType === 'csharp-api') {
        repoText += '\n\nThis is an ASP.NET Core Web API project.';
      } else if (repoType === 'csharp-library') {
        repoText += '\n\nThis is a .NET library or NuGet package.';
      }

      // Generate embedding
      const embedding = await generateEmbedding(repoText);

      // Store in database with metadata
      await storeEmbedding({
        repositoryOwner: repo.owner,
        repositoryName: repo.name,
        content: repoText,
        metadata: {
          primaryLanguage: repo.primaryLanguage || 'unknown',
          detectedType: repoType || 'unknown',
          description: (repo as any).description || '',
          topics: (repo as any).topics || [],
          sizeKb: (repo as any).sizeKb || 0,
          lastUpdated: (repo as any).lastUpdated || null,
          source: 'metadata',
        },
        embedding,
      });

      console.log(`     ✅ Embedding generated and stored`);

      analyzedRepos.push(repo);
    } catch (error) {
      console.error(`     ❌ Failed to analyze ${repo.owner}/${repo.name}:`, error);
    }
  }

  console.log(
    `   Analysis complete: ${analyzedRepos.length}/${repositories.length} repositories processed`
  );

  // Create result for analyzed repositories
  const result = {
    repositoriesAnalyzed: analyzedRepos.length,
    repositories: analyzedRepos,
    source: 'metadata',
  };

  // Update task status
  const updatedTasks = state.tasks.map((t) =>
    t.id === repoTask.id ? { ...t, status: 'completed' as const, result, updatedAt: new Date() } : t
  );

  // Add result
  const newResult = {
    agentId: `metadata-analyzer-${Date.now()}`,
    agentType: 'repository' as const,
    data: result,
    timestamp: new Date(),
  };

  return {
    tasks: updatedTasks,
    results: [...state.results, newResult],
  };
}

/**
 * Node: Relationship Analysis
 * Extracts dependencies and builds knowledge graph in Neo4j
 */
export async function relationshipAnalysisNode(
  state: AgentSystemState,
  agents: Map<string, IAgent>
): Promise<Partial<AgentSystemState>> {
  console.log('🕸️  Relationship Analysis Node');

  // Get Relationship Agent
  const relationshipAgent = Array.from(agents.values()).find(
    (a) => a.getMetadata().agentType === 'relationship'
  );

  if (!relationshipAgent) {
    console.log('   ⚠️  No Relationship Agent available, skipping relationship analysis');
    return {};
  }

  // Get analyzed repositories from previous results
  const repoResult = state.results.find((r) => r.agentType === 'repository');
  if (!repoResult) {
    console.log('   ⚠️  No repository data available for relationship analysis');
    return {};
  }

  const resultData = repoResult.data as { repositories?: unknown[] };
  if (!resultData.repositories) {
    console.log('   ⚠️  No repositories in result data');
    return {};
  }

  const repositories = resultData.repositories as Array<{
    owner: string;
    name: string;
    primaryLanguage?: string;
    detectedType?: string;
    description?: string;
    sizeKb?: number;
    topics?: string[];
  }>;

  console.log(`   Analyzing relationships for ${repositories.length} repositories...`);

  // Import dependency extractor
  const { extractDependencies } = await import('../database/dependency-extractor.js');

  // Get GitHub agent for fetching dependency files
  const githubResult = state.results.find((r) => r.agentType === 'github');
  if (!githubResult) {
    console.log('   ⚠️  No GitHub agent available');
    return {};
  }

  // Get Octokit instance from environment
  const { Octokit } = await import('@octokit/rest');
  const githubToken = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({
    auth: githubToken,
    userAgent: 'A2A-Developer-Agent/1.0',
  });

  let relationshipsCreated = 0;

  for (const repo of repositories) {
    try {
      // Store repository node in Neo4j
      await relationshipAgent.handleRequest({
        action: 'store-repository',
        repository: {
          owner: repo.owner,
          name: repo.name,
          fullName: `${repo.owner}/${repo.name}`,
          primaryLanguage: repo.primaryLanguage,
          detectedType: repo.detectedType,
          size: repo.sizeKb,
          description: repo.description,
          topics: repo.topics,
        },
      });

      // Extract dependencies based on repository type
      const dependencies = await extractDependencies(
        octokit,
        repo.owner,
        repo.name,
        repo.detectedType || 'unknown',
        'develop' // Use develop branch for cortside repos
      );

      if (dependencies.length > 0) {
        console.log(`   • ${repo.owner}/${repo.name}: ${dependencies.length} dependencies`);

        // Store dependencies in Neo4j
        await relationshipAgent.handleRequest({
          action: 'store-dependencies',
          repoFullName: `${repo.owner}/${repo.name}`,
          dependencies,
        });

        relationshipsCreated += dependencies.length;
      } else {
        console.log(`   • ${repo.owner}/${repo.name}: No dependencies found`);
      }
    } catch (error) {
      console.error(`   ❌ Error analyzing relationships for ${repo.owner}/${repo.name}:`, error);
    }
  }

  console.log(`   Relationship analysis complete: ${relationshipsCreated} dependencies stored`);

  return {};
}

/**
 * Node: Finalization
 * Marks workflow as complete
 */
export function finalizationNode(state: AgentSystemState): Partial<AgentSystemState> {
  console.log('✅ Finalization Node');

  // Check if all tasks completed
  const allCompleted = state.tasks.every((t) => t.status === 'completed');
  const anyFailed = state.tasks.some((t) => t.status === 'failed');

  return {
    status: anyFailed ? 'failed' : allCompleted ? 'completed' : 'processing',
  };
}

/**
 * Router: Determines next step after GitHub discovery
 */
export function routeAfterGithub(state: AgentSystemState): string {
  // Check if we have a repository analysis task
  const hasRepoTask = state.tasks.some((t) => t.assignedTo === 'repository');

  if (hasRepoTask) {
    // Check if GitHub task completed successfully
    const githubTask = state.tasks.find((t) => t.assignedTo === 'github');
    if (githubTask?.status === 'completed') {
      return 'repository_analysis';
    }
  }

  return 'finalize';
}

/**
 * Router: Determines if we should continue or end
 */
export function routeAfterRepository(state: AgentSystemState): string {
  // Check if there are more tasks to process
  const pendingTasks = state.tasks.filter((t) => t.status === 'pending');

  if (pendingTasks.length > 0) {
    // Could add more task routing here
    return 'finalize';
  }

  return 'finalize';
}

/**
 * Workflow Executor
 * Simpler execution model that mimics LangGraph flow without full graph construction
 */
export class WorkflowExecutor {
  private agents: Map<string, IAgent>;

  constructor(agents: Map<string, IAgent>) {
    this.agents = agents;
  }

  /**
   * Execute the workflow
   */
  async execute(initialState: AgentSystemState): Promise<AgentSystemState> {
    let state = { ...initialState };

    try {
      // Step 1: Query Decomposition
      console.log('\n🚀 Starting Workflow Execution\n');
      const decompositionResult = await queryDecompositionNode(state);
      state = { ...state, ...decompositionResult };

      // Step 2: GitHub Discovery
      const githubResult = await githubDiscoveryNode(state, this.agents);
      state = { ...state, ...githubResult };

      // Router: Check if we should do repository analysis
      const nextStep = routeAfterGithub(state);

      if (nextStep === 'repository_analysis') {
        // Step 3: Repository Analysis (metadata-based)
        const repoResult = await repositoryAnalysisNode(state);
        state = { ...state, ...repoResult };

        // Step 4: Relationship Analysis (dependency graph)
        const relationshipResult = await relationshipAnalysisNode(state, this.agents);
        state = { ...state, ...relationshipResult };
      }

      // Step 5: Finalization
      const finalResult = finalizationNode(state);
      state = { ...state, ...finalResult };

      console.log('\n✅ Workflow Execution Complete\n');

      return state;
    } catch (error) {
      console.error('\n❌ Workflow Execution Failed\n', error);

      return {
        ...state,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Workflow execution failed',
      };
    }
  }
}

/**
 * Create a workflow executor
 */
export function createWorkflowExecutor(agents: Map<string, IAgent>): WorkflowExecutor {
  return new WorkflowExecutor(agents);
}
