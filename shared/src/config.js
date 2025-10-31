import { z } from 'zod';
// Environment configuration schema
export const EnvConfigSchema = z.object({
    // PostgreSQL
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.string().transform(Number),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    // Neo4j
    NEO4J_URI: z.string(),
    NEO4J_USER: z.string(),
    NEO4J_PASSWORD: z.string(),
    NEO4J_DATABASE: z.string(),
    // OpenAI
    OPENAI_API_KEY: z.string(),
    // GitHub (optional)
    GITHUB_TOKEN: z.string().optional(),
    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    WS_PORT: z.string().transform(Number).default('3001'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    // Paths
    REPOSITORIES_CONFIG_PATH: z.string().default('./config/repositories.json'),
    // Agent Configuration
    AGENT_TTL_SECONDS: z.string().transform(Number).default('3600'),
    AGENT_MAX_POOL_SIZE: z.string().transform(Number).default('10'),
    // Rate Limiting
    GITHUB_RATE_LIMIT_WARNING_THRESHOLD: z.string().transform(Number).default('50'),
    OPENAI_RATE_LIMIT_WARNING_THRESHOLD: z.string().transform(Number).default('100'),
});
export function buildAppConfig(env) {
    return {
        ...env,
        database: {
            postgres: {
                connectionString: `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`,
            },
            neo4j: {
                uri: env.NEO4J_URI,
                username: env.NEO4J_USER,
                password: env.NEO4J_PASSWORD,
                database: env.NEO4J_DATABASE,
            },
        },
    };
}
//# sourceMappingURL=config.js.map