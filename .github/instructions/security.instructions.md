---
applyTo: '**'
---

# Security Best Practices

**Status:** Authoritative  
**Scope:** Universal security practices (portable to any project)  
**Last Updated:** November 5, 2025

This document defines HOW to write secure code. These standards are portable across all projects and languages.

## Security Philosophy

### Defense in Depth

Apply security at multiple layers:

1. **Network layer:** Firewalls, VPNs, network segmentation
2. **Application layer:** Input validation, authentication, authorization
3. **Data layer:** Encryption at rest, encrypted connections
4. **Code layer:** Secure coding practices, dependency scanning

### Principle of Least Privilege

- Grant minimum permissions necessary
- Use role-based access control (RBAC)
- Limit API token scopes
- Restrict database user permissions
- Use read-only credentials when possible

### Assume Breach Mindset

- Plan for security incidents
- Implement monitoring and alerting
- Have incident response procedures
- Log security-relevant events
- Test disaster recovery plans

## Secrets Management

### Never Commit Secrets

**What are secrets?**

- API keys and tokens
- Database passwords
- Private keys and certificates
- OAuth client secrets
- Encryption keys
- Service account credentials

**❌ Never do this:**

```typescript
// DON'T hardcode secrets
const apiKey = 'sk-1234567890abcdef';
const dbPassword = 'MyP@ssw0rd123';
const privateKey = '-----BEGIN RSA PRIVATE KEY-----\n...';
```

**✅ Always do this:**

```typescript
// DO use environment variables
const apiKey = process.env.API_KEY_OPENAI;
const dbPassword = process.env.DATABASE_PASSWORD;
const privateKey = process.env.PRIVATE_KEY;
```

### Git History Scanning

If you accidentally commit a secret:

```bash
# Remove from history (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file" \
  --prune-empty --tag-name-filter cat -- --all

# Or use BFG Repo-Cleaner
bfg --replace-text passwords.txt

# Force push (coordinate with team!)
git push --force --all
```

**Important:** Rotate the compromised secret immediately!

### Secrets in Logs and Errors

```typescript
// ❌ Bad: Logs secret
console.log('Using API key:', process.env.API_KEY);

// ✅ Good: Redacts secret
console.log('Using API key:', process.env.API_KEY?.substring(0, 7) + '...');

// ❌ Bad: Exposes secret in error
throw new Error(`Failed to connect with password: ${dbPassword}`);

// ✅ Good: Generic error message
throw new Error('Failed to connect to database');
```

### Production Secrets Management

**Use secure secrets management services:**

- **AWS:** AWS Secrets Manager, AWS Systems Manager Parameter Store
- **Azure:** Azure Key Vault
- **GCP:** Google Secret Manager
- **HashiCorp:** Vault
- **Kubernetes:** Sealed Secrets, External Secrets Operator

**Don't:**

- Store secrets in environment variables in container images
- Commit secrets to version control
- Share secrets via email or chat
- Store secrets in plain text files on servers

## Input Validation & Sanitization

### Validate All User Input

**Never trust user input:**

```typescript
// ❌ Bad: No validation
app.post('/users', (req, res) => {
  const { email, age } = req.body;
  db.users.create({ email, age }); // What if age is 'DROP TABLE users'?
});

// ✅ Good: Validate input
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email().max(255),
  age: z.number().int().min(0).max(150),
});

app.post('/users', (req, res) => {
  const result = userSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  db.users.create(result.data);
});
```

### SQL Injection Prevention

**Use parameterized queries:**

```typescript
// ❌ Bad: Vulnerable to SQL injection
const userId = req.query.id;
const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);
// If userId is "1' OR '1'='1", returns all users!

// ✅ Good: Parameterized query
const userId = req.query.id;
const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

// ✅ Good: ORM with proper escaping
const user = await db.users.findById(userId);
```

### Cross-Site Scripting (XSS) Prevention

```typescript
// ❌ Bad: Renders raw HTML from user
function displayComment(comment: string) {
  document.innerHTML = comment; // XSS if comment contains <script>alert('XSS')</script>
}

// ✅ Good: Escape HTML
function displayComment(comment: string) {
  document.textContent = comment; // Automatically escaped
}

// ✅ Good: Sanitize HTML (if you must allow some HTML)
import DOMPurify from 'dompurify';
function displayComment(comment: string) {
  const clean = DOMPurify.sanitize(comment);
  document.innerHTML = clean;
}
```

### Command Injection Prevention

```typescript
// ❌ Bad: Vulnerable to command injection
const filename = req.query.file;
exec(`cat ${filename}`, (error, stdout) => {
  res.send(stdout);
});
// If filename is "; rm -rf /", disaster!

// ✅ Good: Validate and escape
const filename = req.query.file;
if (!/^[a-zA-Z0-9_-]+\.txt$/.test(filename)) {
  return res.status(400).send('Invalid filename');
}
exec(`cat ${filename}`, (error, stdout) => {
  res.send(stdout);
});

// ✅ Better: Use safe alternatives
import { readFile } from 'fs/promises';
const filename = req.query.file;
const content = await readFile(path.join('/safe/directory', filename), 'utf-8');
res.send(content);
```

## Authentication & Authorization

### Password Security

```typescript
// ✅ Hash passwords (NEVER store plain text)
import bcrypt from 'bcrypt';

// Register user
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
await db.users.create({ email, password: hashedPassword });

// Login user
const user = await db.users.findByEmail(email);
const isValid = await bcrypt.compare(password, user.password);
if (!isValid) {
  throw new Error('Invalid credentials');
}
```

**Password requirements:**

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Check against common password lists
- Implement rate limiting on login attempts
- Consider multi-factor authentication (MFA)

### Session Management

```typescript
// ✅ Use secure session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Strong random secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true, // Not accessible via JavaScript
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // CSRF protection
    },
  })
);
```

### JWT Best Practices

```typescript
// ✅ Generate secure JWT
import jwt from 'jsonwebtoken';

const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
  expiresIn: '1h',
  algorithm: 'HS256',
});

// ✅ Verify JWT
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// ✅ Use short expiration times
// ✅ Implement token refresh mechanism
// ✅ Store tokens securely (httpOnly cookies, not localStorage)
```

### Authorization Checks

```typescript
// ✅ Check permissions for every protected operation
async function updateUser(currentUserId: string, targetUserId: string, updates: any) {
  const currentUser = await db.users.findById(currentUserId);

  // Check if user can update this resource
  if (currentUser.id !== targetUserId && currentUser.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return db.users.update(targetUserId, updates);
}

// ✅ Implement middleware for route protection
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.delete('/users/:id', requireAdmin, async (req, res) => {
  // Only admins can reach this
});
```

## HTTPS & Transport Security

### Force HTTPS

```typescript
// ✅ Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// ✅ Use HSTS header
app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  })
);
```

### Secure Headers

```typescript
// ✅ Use helmet for security headers
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  })
);
```

## Rate Limiting & DDoS Prevention

### Implement Rate Limiting

```typescript
// ✅ Rate limit API endpoints
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

app.use('/api/', limiter);

// ✅ Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.post('/login', authLimiter, loginHandler);
```

## Dependency Security

### Keep Dependencies Updated

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Use Dependency Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Pin Dependencies

```json
// ✅ Use exact versions for production
{
  "dependencies": {
    "express": "4.18.2", // Not "^4.18.2"
    "helmet": "7.0.0"
  }
}
```

## Error Handling & Information Disclosure

### Don't Leak Information in Errors

```typescript
// ❌ Bad: Exposes internal details
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Exposes file paths and code structure!
    query: req.query, // May contain sensitive data
  });
});

// ✅ Good: Generic error messages
app.use((err, req, res, next) => {
  // Log detailed error server-side
  logger.error('Request failed', { error: err, path: req.path });

  // Send generic error to client
  res.status(500).json({
    error: 'Internal server error',
  });
});

// ✅ Good: Different behavior for dev vs production
app.use((err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
});
```

## CORS Configuration

```typescript
// ❌ Bad: Allow all origins
app.use(
  cors({
    origin: '*', // Dangerous!
  })
);

// ✅ Good: Whitelist specific origins
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://myapp.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

## File Upload Security

```typescript
// ✅ Validate file uploads
import multer from 'multer';

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only images allowed'));
    }
    cb(null, true);
  },
});

app.post('/upload', upload.single('file'), (req, res) => {
  // Validate file exists
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Don't trust file extension from client
  // Verify file type with magic numbers
  const fileType = await FileType.fromFile(req.file.path);
  if (!fileType || !fileType.mime.startsWith('image/')) {
    fs.unlinkSync(req.file.path); // Delete invalid file
    return res.status(400).json({ error: 'Invalid file type' });
  }

  res.json({ success: true });
});
```

## Security Checklist

### Before Deploying

- [ ] All secrets in environment variables (not hardcoded)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize/escape output)
- [ ] HTTPS enforced in production
- [ ] Security headers configured (helmet)
- [ ] Rate limiting implemented
- [ ] Authentication & authorization on protected routes
- [ ] Passwords hashed with bcrypt/argon2
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages don't leak sensitive information
- [ ] CORS configured (not allowing all origins)
- [ ] File uploads validated and restricted
- [ ] Logging configured (without logging secrets)
- [ ] Security monitoring/alerting configured

### During Development

- [ ] Never commit secrets to git
- [ ] Review dependency updates for security patches
- [ ] Follow principle of least privilege
- [ ] Validate and sanitize all user input
- [ ] Use security linters (eslint-plugin-security)
- [ ] Write security tests for critical flows
- [ ] Perform security code reviews

### Regular Maintenance

- [ ] Rotate secrets periodically
- [ ] Update dependencies regularly
- [ ] Review access logs for suspicious activity
- [ ] Test incident response procedures
- [ ] Conduct security audits
- [ ] Perform penetration testing
- [ ] Review and update security policies

---

**This is the authoritative standard for security practices.**

These practices are portable across all projects, languages, and teams.

_Last Updated: November 5, 2025_  
_This file can be copied to any project._
