import { z } from 'zod';
export declare const EnvConfigSchema: z.ZodObject<{
    POSTGRES_HOST: z.ZodString;
    POSTGRES_PORT: z.ZodEffects<z.ZodString, number, string>;
    POSTGRES_USER: z.ZodString;
    POSTGRES_PASSWORD: z.ZodString;
    POSTGRES_DB: z.ZodString;
    NEO4J_URI: z.ZodString;
    NEO4J_USER: z.ZodString;
    NEO4J_PASSWORD: z.ZodString;
    NEO4J_DATABASE: z.ZodString;
    OPENAI_API_KEY: z.ZodString;
    GITHUB_TOKEN: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    WS_PORT: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    REPOSITORIES_CONFIG_PATH: z.ZodDefault<z.ZodString>;
    AGENT_TTL_SECONDS: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    AGENT_MAX_POOL_SIZE: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    GITHUB_RATE_LIMIT_WARNING_THRESHOLD: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
    OPENAI_RATE_LIMIT_WARNING_THRESHOLD: z.ZodDefault<z.ZodEffects<z.ZodString, number, string>>;
}, "strip", z.ZodTypeAny, {
    POSTGRES_HOST: string;
    POSTGRES_PORT: number;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    NEO4J_URI: string;
    NEO4J_USER: string;
    NEO4J_PASSWORD: string;
    NEO4J_DATABASE: string;
    OPENAI_API_KEY: string;
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    WS_PORT: number;
    LOG_LEVEL: "error" | "info" | "warn" | "debug";
    REPOSITORIES_CONFIG_PATH: string;
    AGENT_TTL_SECONDS: number;
    AGENT_MAX_POOL_SIZE: number;
    GITHUB_RATE_LIMIT_WARNING_THRESHOLD: number;
    OPENAI_RATE_LIMIT_WARNING_THRESHOLD: number;
    GITHUB_TOKEN?: string | undefined;
}, {
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    NEO4J_URI: string;
    NEO4J_USER: string;
    NEO4J_PASSWORD: string;
    NEO4J_DATABASE: string;
    OPENAI_API_KEY: string;
    GITHUB_TOKEN?: string | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: string | undefined;
    WS_PORT?: string | undefined;
    LOG_LEVEL?: "error" | "info" | "warn" | "debug" | undefined;
    REPOSITORIES_CONFIG_PATH?: string | undefined;
    AGENT_TTL_SECONDS?: string | undefined;
    AGENT_MAX_POOL_SIZE?: string | undefined;
    GITHUB_RATE_LIMIT_WARNING_THRESHOLD?: string | undefined;
    OPENAI_RATE_LIMIT_WARNING_THRESHOLD?: string | undefined;
}>;
export type EnvConfig = z.infer<typeof EnvConfigSchema>;
export interface AppConfig extends EnvConfig {
    database: {
        postgres: {
            connectionString: string;
        };
        neo4j: {
            uri: string;
            username: string;
            password: string;
            database: string;
        };
    };
}
export declare function buildAppConfig(env: EnvConfig): AppConfig;
//# sourceMappingURL=config.d.ts.map