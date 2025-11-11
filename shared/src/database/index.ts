export { getPgPool, closePgPool, testPgConnection, query } from './postgres.js';
export { runMigrations, rollbackLastMigration } from './migrate.js';
export { generateEmbedding, storeEmbedding, searchSimilarRepositories } from './embeddings.js';
export type { SearchResult } from './embeddings.js';
export {
  getNeo4jDriver,
  closeNeo4jDriver,
  testNeo4jConnection,
  initializeNeo4jSchema,
  storeRepositoryNode,
  storeDependencies,
  findDependents,
  findDependencies,
  findRepositoryDependencies,
  findRepositoryDependents,
  findRelatedRepositories,
  getDependencyStats,
} from './neo4j-relationships.js';
export type { Dependency, RepositoryNode } from './neo4j-relationships.js';
export {
  extractDependencies,
  extractNpmDependencies,
  extractNuGetDependencies,
} from './dependency-extractor.js';
export {
  getOrCreateUser,
  getUserByUsername,
  createConversation,
  getConversation,
  getConversationsByUser,
  updateConversationTitle,
  deleteConversation,
  createMessage,
  getMessagesByConversation,
  createQuery,
  updateQueryStatus,
  getQuery,
  logAgentActivity,
  getAgentActivityByQuery,
} from './chat-service.js';
export type { User, Conversation, Message, Query, AgentActivity } from './chat-service.js';
