import neo4j from 'neo4j-driver';
import { appConfig } from '../config/index.js';

const { uri, username, password, database } = appConfig.database.neo4j;

export const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 2000,
});

export async function executeQuery<T = unknown>(
  cypher: string,
  parameters?: Record<string, unknown>
): Promise<T[]> {
  const session = driver.session({ database });
  try {
    const result = await session.run(cypher, parameters);
    return result.records.map((record) => record.toObject()) as T[];
  } finally {
    await session.close();
  }
}

export async function executeWrite<T = unknown>(
  cypher: string,
  parameters?: Record<string, unknown>
): Promise<T[]> {
  const session = driver.session({ database });
  try {
    const result = await session.executeWrite((tx) => tx.run(cypher, parameters));
    return result.records.map((record) => record.toObject()) as T[];
  } finally {
    await session.close();
  }
}

// Test connection
driver
  .getServerInfo()
  .then(() => {
    console.log('Neo4j connected');
  })
  .catch((error) => {
    console.error('Neo4j connection failed:', error);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  await driver.close();
  process.exit(0);
});
