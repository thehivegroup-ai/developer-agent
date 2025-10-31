import { BaseRelationshipAgent } from './BaseRelationshipAgent.js';
import {
  initializeNeo4jSchema,
  storeRepositoryNode,
  storeDependencies,
  findDependents,
  findDependencies,
  findRelatedRepositories,
  getDependencyStats,
  type Dependency,
  type RepositoryNode,
} from '@developer-agent/shared';

/**
 * Request types for Relationship Agent
 */
interface RelationshipRequest {
  action:
    | 'store-repository'
    | 'store-dependencies'
    | 'find-dependents'
    | 'find-dependencies'
    | 'find-related'
    | 'get-stats';
  repository?: RepositoryNode;
  repoFullName?: string;
  dependencies?: Dependency[];
  dependencyName?: string;
  ecosystem?: string;
  limit?: number;
}

/**
 * Relationship Agent
 * Builds and maintains the Neo4j knowledge graph of repository relationships
 */
export class RelationshipAgent extends BaseRelationshipAgent {
  private initialized = false;

  override async init(): Promise<void> {
    try {
      // Initialize Neo4j schema (constraints and indexes)
      await initializeNeo4jSchema();
      this.initialized = true;
      console.log('✅ Relationship Agent initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Relationship Agent:', error);
      throw error;
    }
  }

  override async handleRequest(request: unknown): Promise<unknown> {
    if (!this.initialized) {
      return { error: 'Relationship Agent not initialized' };
    }

    const req = request as RelationshipRequest;

    try {
      switch (req.action) {
        case 'store-repository':
          if (!req.repository) {
            return { error: 'Missing repository data' };
          }
          await storeRepositoryNode(req.repository);
          return { success: true, message: 'Repository stored in graph' };

        case 'store-dependencies':
          if (!req.repoFullName || !req.dependencies) {
            return { error: 'Missing repository name or dependencies' };
          }
          await storeDependencies(req.repoFullName, req.dependencies);
          return {
            success: true,
            message: `Stored ${req.dependencies.length} dependencies for ${req.repoFullName}`,
          };

        case 'find-dependents':
          if (!req.dependencyName) {
            return { error: 'Missing dependency name' };
          }
          const dependents = await findDependents(req.dependencyName, req.ecosystem);
          return { success: true, dependents };

        case 'find-dependencies':
          if (!req.repoFullName) {
            return { error: 'Missing repository name' };
          }
          const dependencies = await findDependencies(req.repoFullName);
          return { success: true, dependencies };

        case 'find-related':
          if (!req.repoFullName) {
            return { error: 'Missing repository name' };
          }
          const related = await findRelatedRepositories(req.repoFullName, req.limit || 5);
          return { success: true, related };

        case 'get-stats':
          const stats = await getDependencyStats();
          return { success: true, stats };

        default:
          return { error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Error handling relationship request:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  override async shutdown(): Promise<void> {
    // Note: We don't close the Neo4j driver here as it's shared
    // The driver is closed when the application shuts down
    this.initialized = false;
    console.log('🔴 Relationship Agent shut down');
  }
}
