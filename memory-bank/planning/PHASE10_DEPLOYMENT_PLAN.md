# Phase 10: Deployment & DevOps

**Status:** Planning  
**Duration Estimate:** 1-2 weeks  
**Priority:** High  
**Prerequisites:** Phase 8 (AI Enhancement) & Phase 9 (Testing) complete

## Overview

Prepare the Developer Agent system for production deployment with Docker containerization, CI/CD pipelines, monitoring, logging, and production-ready configuration management.

## Goals

1. **Containerization** - Docker containers for all services
2. **Orchestration** - Docker Compose for local dev, Kubernetes for production
3. **CI/CD** - Automated testing, building, and deployment
4. **Monitoring** - Application metrics, health checks, alerts
5. **Logging** - Centralized logging with structured logs
6. **Security** - Secrets management, HTTPS, rate limiting
7. **Performance** - Production optimization and caching

## Phase 10 Breakdown

### 10.1: Docker Containerization (Days 1-2)

#### Services to Containerize

1. **API Gateway** - Backend REST API and WebSocket server
2. **Frontend** - React SPA (production build)
3. **PostgreSQL** - Database with pgvector
4. **Neo4j** - Graph database (optional)
5. **Nginx** - Reverse proxy and static file server

#### Dockerfiles

**API Gateway** (`api-gateway/Dockerfile`)

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api-gateway/package*.json ./api-gateway/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --workspace=api-gateway --workspace=shared

# Copy source code
COPY api-gateway/ ./api-gateway/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=shared
RUN npm run build --workspace=api-gateway

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY api-gateway/package*.json ./api-gateway/
COPY shared/package*.json ./shared/

# Install production dependencies only
RUN npm ci --workspace=api-gateway --workspace=shared --omit=dev

# Copy built files
COPY --from=builder /app/api-gateway/dist ./api-gateway/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run
CMD ["node", "api-gateway/dist/index.js"]
```

**Frontend** (`frontend/Dockerfile`)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci --workspace=frontend

COPY frontend/ ./frontend/
COPY tsconfig.json ./

RUN npm run build --workspace=frontend

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Config** (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api {
        proxy_pass http://api-gateway:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://api-gateway:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Docker Compose

**Development** (`docker-compose.dev.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: developer_agent_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./api-gateway/src/database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U devuser']
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5-community
    environment:
      NEO4J_AUTH: neo4j/devpassword
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - '7474:7474'
      - '7687:7687'
    volumes:
      - neo4j-data:/data
    healthcheck:
      test: ['CMD-SHELL', "cypher-shell -u neo4j -p devpassword 'RETURN 1'"]
      interval: 10s
      timeout: 5s
      retries: 5

  api-gateway:
    build:
      context: .
      dockerfile: api-gateway/Dockerfile
    environment:
      NODE_ENV: development
      PORT: 3000
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: developer_agent_dev
      NEO4J_URI: neo4j://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: devpassword
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
    ports:
      - '3000:3000'
    depends_on:
      postgres:
        condition: service_healthy
      neo4j:
        condition: service_healthy
    volumes:
      - ./api-gateway/src:/app/api-gateway/src
      - ./shared/src:/app/shared/src
    command: npm run dev --workspace=api-gateway

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      target: builder
    ports:
      - '5173:5173'
    volumes:
      - ./frontend/src:/app/frontend/src
    command: npm run dev --workspace=frontend
    environment:
      VITE_API_URL: http://localhost:3000

volumes:
  postgres-data:
  neo4j-data:
```

**Production** (`docker-compose.prod.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 30s
      timeout: 5s
      retries: 3

  neo4j:
    image: neo4j:5-community
    environment:
      NEO4J_AUTH: ${NEO4J_USER}/${NEO4J_PASSWORD}
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j-data:/data
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', "cypher-shell -u ${NEO4J_USER} -p ${NEO4J_PASSWORD} 'RETURN 1'"]
      interval: 30s
      timeout: 5s
      retries: 3

  api-gateway:
    build:
      context: .
      dockerfile: api-gateway/Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3000
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      NEO4J_URI: neo4j://neo4j:7687
      NEO4J_USER: ${NEO4J_USER}
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      LOG_LEVEL: info
    depends_on:
      - postgres
      - neo4j
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/health']
      interval: 30s
      timeout: 3s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-cache:/var/cache/nginx
    depends_on:
      - api-gateway
      - frontend
    restart: unless-stopped

volumes:
  postgres-data:
  neo4j-data:
  nginx-cache:
```

#### Acceptance Criteria

- [x] All services containerized
- [x] Multi-stage builds optimize image sizes
- [x] Health checks configured for all services
- [x] Development docker-compose works locally
- [x] Production docker-compose ready for deployment
- [x] Images under 500MB (API), 50MB (frontend)

---

### 10.2: CI/CD Pipeline (Days 3-4)

#### GitHub Actions Workflow

**File:** `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Run unit tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    name: Build Images
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name != 'pull_request'

    permissions:
      contents: read
      packages: write

    strategy:
      matrix:
        service: [api-gateway, frontend]

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.service }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./${{ matrix.service }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment..."
          # Add your deployment commands here
          # e.g., kubectl, helm, docker-compose, etc.

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/master' || github.event_name == 'release'
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          echo "Deploying to production environment..."
          # Add your deployment commands here
```

#### Acceptance Criteria

- [x] CI runs on every PR and push
- [x] Automated testing before build
- [x] Docker images built and pushed to registry
- [x] Separate staging and production deployments
- [x] Deployment approval gates for production
- [x] Rollback capability

---

### 10.3: Monitoring & Logging (Days 5-6)

#### Application Metrics

**Prometheus Integration** (`api-gateway/src/monitoring/metrics.ts`)

```typescript
import prometheus from 'prom-client';

// Register metrics
const register = new prometheus.Register();

// HTTP metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// AI metrics
export const aiRequestDuration = new prometheus.Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI API requests',
  labelNames: ['provider', 'model', 'type'],
  registers: [register],
});

export const aiTokensUsed = new prometheus.Counter({
  name: 'ai_tokens_total',
  help: 'Total AI tokens consumed',
  labelNames: ['provider', 'model', 'type'],
  registers: [register],
});

export const aiCacheHitRate = new prometheus.Gauge({
  name: 'ai_cache_hit_rate',
  help: 'AI cache hit rate percentage',
  registers: [register],
});

// WebSocket metrics
export const wsConnectionsActive = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
  registers: [register],
});

// Export metrics endpoint
export function getMetrics(): string {
  return register.metrics();
}
```

**Structured Logging** (`api-gateway/src/monitoring/logger.ts`)

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'api-gateway',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console for development
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    // File for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Add request ID to all logs
export function addRequestId(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  logger.defaultMeta.requestId = requestId;
  next();
}
```

**Health Check Endpoint** (`api-gateway/src/routes/health.ts`)

```typescript
export async function healthCheck(req: Request, res: Response) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      openai: await checkOpenAI(),
      memory: checkMemory(),
    },
  };

  const allHealthy = Object.values(health.checks).every((c) => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json(health);
}

async function checkDatabase(): Promise<HealthStatus> {
  try {
    await db.query('SELECT 1');
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkOpenAI(): Promise<HealthStatus> {
  try {
    const provider = getOpenAIService();
    await provider.checkAvailability();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

function checkMemory(): HealthStatus {
  const usage = process.memoryUsage();
  const threshold = 0.9 * 1024 * 1024 * 1024; // 900MB

  if (usage.heapUsed > threshold) {
    return { status: 'unhealthy', message: 'High memory usage' };
  }

  return { status: 'healthy', heapUsed: usage.heapUsed };
}
```

#### Grafana Dashboards

**File:** `monitoring/grafana/dashboards/developer-agent.json`

```json
{
  "dashboard": {
    "title": "Developer Agent - Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "AI Token Usage",
        "targets": [
          {
            "expr": "rate(ai_tokens_total[1h])"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "ai_cache_hit_rate"
          }
        ]
      },
      {
        "title": "Active WebSocket Connections",
        "targets": [
          {
            "expr": "websocket_connections_active"
          }
        ]
      }
    ]
  }
}
```

#### Acceptance Criteria

- [x] Prometheus metrics exposed at `/metrics`
- [x] Structured JSON logging
- [x] Health check endpoint functional
- [x] Grafana dashboards created
- [x] Alert rules configured
- [x] Log aggregation (ELK/Loki) set up

---

### 10.4: Security & Secrets Management (Day 7)

#### Environment Variables

**File:** `.env.production.template`

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=<vault:secret/postgres/user>
POSTGRES_PASSWORD=<vault:secret/postgres/password>
POSTGRES_DB=developer_agent

# Neo4j
NEO4J_URI=neo4j://neo4j:7687
NEO4J_USER=<vault:secret/neo4j/user>
NEO4J_PASSWORD=<vault:secret/neo4j/password>

# OpenAI
OPENAI_API_KEY=<vault:secret/openai/api_key>

# GitHub
GITHUB_TOKEN=<vault:secret/github/token>

# Security
JWT_SECRET=<vault:secret/jwt/secret>
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# CORS
CORS_ORIGIN=https://yourdomain.com

# Session
SESSION_SECRET=<vault:secret/session/secret>
```

#### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour
  message: 'AI rate limit exceeded',
});
```

#### HTTPS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://frontend;
    }
}
```

#### Acceptance Criteria

- [x] Secrets stored in vault/secrets manager
- [x] Rate limiting implemented
- [x] HTTPS configured with valid certificates
- [x] Security headers added
- [x] CORS properly configured
- [x] Input validation on all endpoints

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Database migrations prepared
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Secrets configured
- [ ] SSL certificates obtained

### Deployment

- [ ] Database migrated
- [ ] Docker images pushed
- [ ] Services deployed
- [ ] Health checks passing
- [ ] DNS configured
- [ ] CDN configured (if applicable)
- [ ] Backups verified

### Post-Deployment

- [ ] Smoke tests passing
- [ ] Monitoring dashboards checked
- [ ] Logs flowing correctly
- [ ] Performance metrics baseline established
- [ ] Team notified
- [ ] Documentation updated

## Success Metrics

- [ ] Zero-downtime deployments
- [ ] 99.9% uptime SLA
- [ ] Response time < 500ms (P95)
- [ ] Deployment time < 10 minutes
- [ ] Automated rollback works
- [ ] Monitoring covers all critical paths
- [ ] Security vulnerabilities addressed

## Deliverables

1. **Infrastructure as Code**
   - Dockerfiles for all services
   - Docker Compose configurations
   - Kubernetes manifests (if applicable)

2. **CI/CD Pipeline**
   - GitHub Actions workflows
   - Automated testing
   - Automated deployment

3. **Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Alert rules
   - Health checks

4. **Documentation**
   - Deployment guide
   - Operations runbook
   - Disaster recovery plan
   - Architecture diagrams

## Timeline Summary

```
Week 1:
  Day 1-2: Docker containerization
  Day 3-4: CI/CD pipeline setup
  Day 5-6: Monitoring & logging
  Day 7:   Security & secrets

Week 2 (if needed):
  Day 1-2: Production deployment
  Day 3:   Performance tuning
  Day 4-5: Documentation & training
```

---

_Last Updated: November 5, 2025_
