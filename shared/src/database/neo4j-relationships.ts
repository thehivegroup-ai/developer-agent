/**
 * Neo4j Relationship Management
 *
 * Handles storage and querying of repository relationships in Neo4j graph database.
 * Repository Agents extract dependencies (language-specific), this module manages the graph.
 */

import neo4j, { Driver } from 'neo4j-driver';
import { EnvConfigSchema } from '../config.js';

let driver: Driver | null = null;

/**
 * Dependency information extracted by Repository Agents
 */
export interface Dependency {
  name: string;
  version?: string;
  ecosystem: 'npm' | 'nuget' | 'pypi' | 'maven' | 'go' | 'unknown';
  isDirect: boolean;
}

/**
 * Repository node data
 */
export interface RepositoryNode {
  owner: string;
  name: string;
  fullName: string;
  primaryLanguage?: string;
  detectedType?: string;
  size?: number;
  description?: string;
  topics?: string[];
}

/**
 * Get or create Neo4j driver
 */
export function getNeo4jDriver(): Driver {
  if (!driver) {
    const env = EnvConfigSchema.parse(process.env);

    driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2000,
    });
  }

  return driver;
}

/**
 * Close Neo4j driver
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

/**
 * Test Neo4j connection
 */
export async function testNeo4jConnection(): Promise<boolean> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run('RETURN 1');
    return true;
  } catch (error) {
    console.error('Neo4j connection failed:', error);
    return false;
  } finally {
    await session.close();
  }
}

/**
 * Initialize Neo4j schema with constraints and indexes
 */
export async function initializeNeo4jSchema(): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Create uniqueness constraints
    await session.run(`
      CREATE CONSTRAINT repository_unique IF NOT EXISTS
      FOR (r:Repository) REQUIRE r.fullName IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT dependency_unique IF NOT EXISTS
      FOR (d:Dependency) REQUIRE (d.name, d.ecosystem) IS UNIQUE
    `);

    // Create indexes for performance
    await session.run(`
      CREATE INDEX repository_owner IF NOT EXISTS
      FOR (r:Repository) ON (r.owner)
    `);

    await session.run(`
      CREATE INDEX repository_language IF NOT EXISTS
      FOR (r:Repository) ON (r.primaryLanguage)
    `);

    await session.run(`
      CREATE INDEX dependency_name IF NOT EXISTS
      FOR (d:Dependency) ON (d.name)
    `);

    console.log('✅ Neo4j schema initialized');
  } catch (error) {
    console.error('Failed to initialize Neo4j schema:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Store repository node in Neo4j
 */
export async function storeRepositoryNode(repo: RepositoryNode): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (r:Repository {fullName: $fullName})
      SET r.owner = $owner,
          r.name = $name,
          r.primaryLanguage = $primaryLanguage,
          r.detectedType = $detectedType,
          r.size = $size,
          r.description = $description,
          r.topics = $topics,
          r.updatedAt = datetime()
      RETURN r
      `,
      {
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        primaryLanguage: repo.primaryLanguage || 'Unknown',
        detectedType: repo.detectedType || 'unknown',
        size: repo.size || 0,
        description: repo.description || '',
        topics: repo.topics || [],
      }
    );
  } finally {
    await session.close();
  }
}

/**
 * Store dependencies for a repository
 */
export async function storeDependencies(
  repoFullName: string,
  dependencies: Dependency[]
): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // First, clear existing dependencies for this repo
    await session.run(
      `
      MATCH (r:Repository {fullName: $repoFullName})-[rel:DEPENDS_ON]->()
      DELETE rel
      `,
      { repoFullName }
    );

    // Store each dependency
    for (const dep of dependencies) {
      // Check if this dependency is actually another repository in our system
      const repoDepResult = await session.run(
        `
        MATCH (target:Repository)
        WHERE toLower(target.name) = toLower($depName)
        RETURN target
        LIMIT 1
        `,
        { depName: dep.name }
      );

      if (repoDepResult.records.length > 0) {
        // This is a repository dependency - create direct repo-to-repo relationship
        const targetRepo = repoDepResult.records[0]!.get('target').properties;
        await session.run(
          `
          MATCH (r1:Repository {fullName: $sourceRepo})
          MATCH (r2:Repository {fullName: $targetRepo})
          MERGE (r1)-[rel:DEPENDS_ON_REPO]->(r2)
          SET rel.version = $version,
              rel.isDirect = $isDirect,
              rel.ecosystem = $ecosystem,
              rel.updatedAt = datetime()
          RETURN r1, r2, rel
          `,
          {
            sourceRepo: repoFullName,
            targetRepo: targetRepo.fullName,
            version: dep.version || 'unknown',
            isDirect: dep.isDirect,
            ecosystem: dep.ecosystem,
          }
        );
      } else {
        // External package dependency
        await session.run(
          `
          MATCH (r:Repository {fullName: $repoFullName})
          MERGE (d:Dependency {name: $depName, ecosystem: $ecosystem})
          MERGE (r)-[rel:DEPENDS_ON]->(d)
          SET rel.version = $version,
              rel.isDirect = $isDirect,
              rel.updatedAt = datetime()
          RETURN r, d, rel
          `,
          {
            repoFullName,
            depName: dep.name,
            ecosystem: dep.ecosystem,
            version: dep.version || 'unknown',
            isDirect: dep.isDirect,
          }
        );
      }
    }

    // Create SIMILAR_TO relationships based on shared dependencies
    await session.run(
      `
      MATCH (r1:Repository {fullName: $repoFullName})-[:DEPENDS_ON]->(d:Dependency)<-[:DEPENDS_ON]-(r2:Repository)
      WHERE r1 <> r2
      WITH r1, r2, count(d) as sharedDeps
      WHERE sharedDeps >= 2
      MERGE (r1)-[rel:SIMILAR_TO]-(r2)
      SET rel.sharedDependencies = sharedDeps,
          rel.updatedAt = datetime()
      `,
      { repoFullName }
    );
  } finally {
    await session.close();
  }
}

/**
 * Find repositories that depend on a given dependency
 */
export async function findDependents(
  dependencyName: string,
  ecosystem?: string
): Promise<RepositoryNode[]> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const query = ecosystem
      ? `
        MATCH (r:Repository)-[:DEPENDS_ON]->(d:Dependency {name: $depName, ecosystem: $ecosystem})
        RETURN r
        ORDER BY r.fullName
      `
      : `
        MATCH (r:Repository)-[:DEPENDS_ON]->(d:Dependency {name: $depName})
        RETURN r
        ORDER BY r.fullName
      `;

    const result = await session.run(query, { depName: dependencyName, ecosystem });

    return result.records.map((record) => {
      const node = record.get('r').properties;
      return {
        owner: node.owner,
        name: node.name,
        fullName: node.fullName,
        primaryLanguage: node.primaryLanguage,
        detectedType: node.detectedType,
        size: node.size ? Number(node.size) : undefined,
        description: node.description,
        topics: node.topics,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Find dependencies of a repository
 */
export async function findDependencies(
  repoFullName: string
): Promise<Array<Dependency & { usedBy?: number }>> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (r:Repository {fullName: $repoFullName})-[rel:DEPENDS_ON]->(d:Dependency)
      OPTIONAL MATCH (d)<-[:DEPENDS_ON]-(other:Repository)
      WITH d, rel, count(DISTINCT other) as usageCount
      RETURN d, rel, usageCount
      ORDER BY d.name
      `,
      { repoFullName }
    );

    return result.records.map((record) => {
      const dep = record.get('d').properties;
      const rel = record.get('rel').properties;
      const usageCount = record.get('usageCount');

      return {
        name: dep.name,
        version: rel.version,
        ecosystem: dep.ecosystem as Dependency['ecosystem'],
        isDirect: rel.isDirect,
        usedBy: usageCount ? Number(usageCount) : 0,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Find repository dependencies (repos that this repo depends on)
 */
export async function findRepositoryDependencies(
  repoFullName: string
): Promise<Array<RepositoryNode & { version?: string }>> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (r1:Repository {fullName: $repoFullName})-[rel:DEPENDS_ON_REPO]->(r2:Repository)
      RETURN r2, rel.version as version
      ORDER BY r2.name
      `,
      { repoFullName }
    );

    return result.records.map((record) => {
      const node = record.get('r2').properties;
      const version = record.get('version');

      return {
        owner: node.owner,
        name: node.name,
        fullName: node.fullName,
        primaryLanguage: node.primaryLanguage,
        detectedType: node.detectedType,
        size: node.size ? Number(node.size) : undefined,
        description: node.description,
        topics: node.topics,
        version: version || undefined,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Find repository dependents (repos that depend on this repo)
 */
export async function findRepositoryDependents(
  repoFullName: string
): Promise<Array<RepositoryNode & { version?: string }>> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (r1:Repository)-[rel:DEPENDS_ON_REPO]->(r2:Repository {fullName: $repoFullName})
      RETURN r1, rel.version as version
      ORDER BY r1.name
      `,
      { repoFullName }
    );

    return result.records.map((record) => {
      const node = record.get('r1').properties;
      const version = record.get('version');

      return {
        owner: node.owner,
        name: node.name,
        fullName: node.fullName,
        primaryLanguage: node.primaryLanguage,
        detectedType: node.detectedType,
        size: node.size ? Number(node.size) : undefined,
        description: node.description,
        topics: node.topics,
        version: version || undefined,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Find related repositories (similar dependencies or same tech)
 */
export async function findRelatedRepositories(
  repoFullName: string,
  limit: number = 5
): Promise<Array<RepositoryNode & { relationshipType: string; score: number }>> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (r1:Repository {fullName: $repoFullName})
      MATCH (r1)-[rel:SIMILAR_TO]-(r2:Repository)
      RETURN r2, 'SIMILAR_TO' as relType, rel.sharedDependencies as score
      ORDER BY score DESC
      LIMIT $limit
      `,
      { repoFullName, limit: neo4j.int(limit) }
    );

    return result.records.map((record) => {
      const node = record.get('r2').properties;
      const relType = record.get('relType');
      const score = record.get('score');

      return {
        owner: node.owner,
        name: node.name,
        fullName: node.fullName,
        primaryLanguage: node.primaryLanguage,
        detectedType: node.detectedType,
        size: node.size ? Number(node.size) : undefined,
        description: node.description,
        topics: node.topics,
        relationshipType: relType,
        score: score ? Number(score) : 0,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Get dependency statistics
 */
export async function getDependencyStats(): Promise<{
  totalRepositories: number;
  totalDependencies: number;
  totalRelationships: number;
  topDependencies: Array<{ name: string; ecosystem: string; usageCount: number }>;
}> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const stats = await session.run(`
      MATCH (r:Repository)
      WITH count(r) as repoCount
      MATCH (d:Dependency)
      WITH repoCount, count(d) as depCount
      MATCH ()-[rel:DEPENDS_ON]->()
      RETURN repoCount, depCount, count(rel) as relCount
    `);

    const topDeps = await session.run(`
      MATCH (d:Dependency)<-[:DEPENDS_ON]-(r:Repository)
      WITH d, count(r) as usageCount
      ORDER BY usageCount DESC
      LIMIT 10
      RETURN d.name as name, d.ecosystem as ecosystem, usageCount
    `);

    const statsRecord = stats.records[0];

    return {
      totalRepositories: statsRecord ? Number(statsRecord.get('repoCount')) : 0,
      totalDependencies: statsRecord ? Number(statsRecord.get('depCount')) : 0,
      totalRelationships: statsRecord ? Number(statsRecord.get('relCount')) : 0,
      topDependencies: topDeps.records.map((record) => ({
        name: record.get('name'),
        ecosystem: record.get('ecosystem'),
        usageCount: Number(record.get('usageCount')),
      })),
    };
  } finally {
    await session.close();
  }
}
