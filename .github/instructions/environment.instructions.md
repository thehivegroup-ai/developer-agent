---
description: 'Standards for managing environment variables and configuration files across all projects.'
applyTo: '**/.env*,**/config/**,**/*.config.js,**/*.config.ts,**/*.config.json'
---

# Environment & Configuration Standards

**Status:** Authoritative  
**Scope:** Universal environment and configuration practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines HOW to manage environment variables and configuration files. These standards are portable across all projects and languages.

## Environment Variables

### Storage and Security

- **Never commit secrets** - Store in `.env` file (add to `.gitignore`)
- **Provide templates** - Include `.env.template` or `.env.example` in repository
- **Document all variables** - Explain purpose, format, and required vs optional
- **Validate on startup** - Check for required variables before application starts
- **Fail fast** - Exit with clear error if required variables are missing

### Environment-Specific Files

Use separate files for different environments:

```
.env                    # Local development (gitignored)
.env.example           # Template with dummy values (committed)
.env.development       # Development environment
.env.staging           # Staging environment
.env.production        # Production environment (never committed)
.env.test              # Test environment
```

### Naming Conventions

**Use consistent, descriptive names:**

```bash
# Good
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY_OPENAI=sk-...
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Bad (avoid)
DB=localhost          # Too vague
key=abc123           # Not descriptive
p=3000               # Unclear abbreviation
```

**Conventions:**

- Use `SCREAMING_SNAKE_CASE` for environment variables
- Group related variables with common prefixes (`DATABASE_`, `API_`, `AWS_`)
- Be explicit about what service or resource the variable relates to

### Example .env.example Template

```bash
# Database Configuration
DATABASE_URL=postgresql://localhost:5432/dbname
DATABASE_POOL_SIZE=10

# API Keys (get from https://platform.openai.com)
API_KEY_OPENAI=sk-your-key-here
API_KEY_GITHUB=ghp_your-key-here

# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Optional: Redis Cache
REDIS_URL=redis://localhost:6379

# Optional: Email Service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=your-password
```

### Loading Environment Variables

**Node.js (using dotenv):**

```typescript
import dotenv from 'dotenv';

// Load before anything else
dotenv.config();

// Validate required variables
const requiredEnvVars = ['DATABASE_URL', 'API_KEY_OPENAI', 'PORT'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
```

**Python:**

```python
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Validate required variables
required_vars = ['DATABASE_URL', 'API_KEY_OPENAI', 'PORT']
missing = [var for var in required_vars if not os.getenv(var)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
```

**C# (.NET):**

```csharp
using Microsoft.Extensions.Configuration;

var configuration = new ConfigurationBuilder()
    .AddEnvironmentVariables()
    .AddJsonFile("appsettings.json", optional: true)
    .Build();

// Validate required variables
var requiredVars = new[] { "DatabaseUrl", "ApiKeyOpenAI", "Port" };
foreach (var key in requiredVars)
{
    if (string.IsNullOrEmpty(configuration[key]))
        throw new InvalidOperationException($"Missing required configuration: {key}");
}
```

## Configuration Files

### Configuration Strategy

**Separation of Concerns:**

- **Code** = Application logic
- **Configuration** = Values that change between environments
- **Secrets** = Sensitive values (API keys, passwords) → Environment variables only

### Configuration File Patterns

**Use hierarchical configuration:**

```
config/
├── default.json        # Default values for all environments
├── development.json    # Development overrides
├── staging.json        # Staging overrides
├── production.json     # Production overrides (no secrets!)
└── local.json          # Local developer overrides (gitignored)
```

**Or single file with environment sections:**

```json
{
  "default": {
    "server": {
      "port": 3000,
      "host": "localhost"
    }
  },
  "development": {
    "server": {
      "port": 3001
    },
    "logging": {
      "level": "debug"
    }
  },
  "production": {
    "server": {
      "port": 8080,
      "host": "0.0.0.0"
    },
    "logging": {
      "level": "warn"
    }
  }
}
```

### Configuration Best Practices

**Do:**

- ✅ Keep configuration separate from code
- ✅ Use environment variables for secrets and environment-specific values
- ✅ Provide sensible defaults
- ✅ Document all configuration options (comments or README)
- ✅ Validate configuration on load
- ✅ Use type-safe configuration objects
- ✅ Version control non-sensitive configuration files

**Don't:**

- ❌ Hardcode values in source code
- ❌ Commit secrets to version control
- ❌ Use magic numbers or strings without explanation
- ❌ Mix configuration with business logic
- ❌ Assume configuration values are valid without validation

### Example Configuration Module

**TypeScript:**

```typescript
import { z } from 'zod';

// Define schema for type safety and validation
const configSchema = z.object({
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().min(1).max(100).default(10),
  }),
  api: z.object({
    openai: z.string().min(1),
    github: z.string().min(1),
  }),
  server: z.object({
    port: z.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

// Load and validate configuration
export const config = configSchema.parse({
  database: {
    url: process.env.DATABASE_URL,
    poolSize: process.env.DATABASE_POOL_SIZE ? parseInt(process.env.DATABASE_POOL_SIZE) : undefined,
  },
  api: {
    openai: process.env.API_KEY_OPENAI,
    github: process.env.API_KEY_GITHUB,
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    host: process.env.HOST,
  },
  logging: {
    level: process.env.LOG_LEVEL as any,
  },
});

export type Config = z.infer<typeof configSchema>;
```

### Configuration Documentation

**Always document configuration in README:**

```markdown
## Configuration

### Required Environment Variables

| Variable         | Description                  | Example                            |
| ---------------- | ---------------------------- | ---------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://localhost:5432/mydb` |
| `API_KEY_OPENAI` | OpenAI API key               | `sk-...`                           |
| `PORT`           | Server port                  | `3000`                             |

### Optional Environment Variables

| Variable             | Description                   | Default | Example                  |
| -------------------- | ----------------------------- | ------- | ------------------------ |
| `LOG_LEVEL`          | Logging verbosity             | `info`  | `debug`, `warn`, `error` |
| `DATABASE_POOL_SIZE` | Database connection pool size | `10`    | `20`                     |
```

## Security Considerations

### Secrets Management

**Development:**

- Use `.env` file for local development
- Never commit `.env` to version control
- Use dummy values in `.env.example`

**Production:**

- Use secure secrets management (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- Inject secrets as environment variables at runtime
- Rotate secrets regularly
- Limit access to secrets (principle of least privilege)

### Common Pitfalls

**Don't:**

```bash
# ❌ Committing secrets
git add .env

# ❌ Logging sensitive values
console.log('API Key:', process.env.API_KEY);

# ❌ Exposing secrets in error messages
throw new Error(`Failed to connect with key: ${apiKey}`);

# ❌ Hardcoding secrets
const apiKey = 'sk-1234567890abcdef';
```

**Do:**

```bash
# ✅ Add .env to .gitignore
echo ".env" >> .gitignore

# ✅ Log safely (redact secrets)
console.log('API Key:', process.env.API_KEY?.substring(0, 7) + '...');

# ✅ Generic error messages
throw new Error('Failed to authenticate with API');

# ✅ Use environment variables
const apiKey = process.env.API_KEY;
```

## Environment-Specific Behavior

### Detecting Environment

```typescript
// Node.js
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
```

```python
# Python
import os
is_development = os.getenv('ENVIRONMENT') == 'development'
is_production = os.getenv('ENVIRONMENT') == 'production'
```

```csharp
// C#
var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
var isProduction = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production";
```

### Environment-Specific Logic

```typescript
if (isDevelopment) {
  // Verbose logging, hot reloading, etc.
  app.use(morgan('dev'));
  app.use(errorHandler());
}

if (isProduction) {
  // Optimized, secure settings
  app.use(helmet());
  app.use(compression());
}
```

---

**This is the authoritative standard for environment and configuration management.**

These practices are portable across all projects, languages, and teams.

_Last Updated: November 5, 2025_  
_This file can be copied to any project._
