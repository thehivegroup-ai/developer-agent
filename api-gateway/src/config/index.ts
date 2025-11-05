import { config } from 'dotenv';
import { EnvConfigSchema, buildAppConfig } from '@developer-agent/shared';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root directory
config({ path: path.resolve(__dirname, '../../../.env.local') });
config({ path: path.resolve(__dirname, '../../../.env') });

// Parse and validate environment configuration
const envConfig = EnvConfigSchema.parse(process.env);

// Build application configuration
export const appConfig = buildAppConfig(envConfig);

// Export for convenience
export const { database, OPENAI_API_KEY, GITHUB_TOKEN, NODE_ENV, LOG_LEVEL } = appConfig;
