# JWT Authentication Architecture & Security Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Access Token & Refresh Token Architecture](#access-token--refresh-token-architecture)
3. [Refresh Token Rotation](#refresh-token-rotation)
4. [CSRF Protection](#csrf-protection)
5. [HTTPOnly Cookie Security](#httponly-cookie-security)
6. [Token Reuse Attack Prevention](#token-reuse-attack-prevention)
7. [API Flow Diagrams](#api-flow-diagrams)
8. [Security Best Practices](#security-best-practices)
9. [Frontend Integration](#frontend-integration)

---

## System Overview

This is a **professional-grade JWT authentication system** with:

- ✅ **Dual-token architecture** (Access + Refresh)
- ✅ **Refresh token rotation** (v1, v2, v3... on each refresh)
- ✅ **Token reuse attack prevention** (revoke all tokens if detected)
- ✅ **HTTPOnly secure cookies** for refresh tokens
- ✅ **CSRF protection** (double-submit cookie pattern)
- ✅ **2FA integration** ready
- ✅ **Token version tracking** for rotation management
- ✅ **Hashed token storage** in database
- ✅ **Minimum viable security** for production

**Key Improvement**: Unlike session-based auth, JWT tokens are:
- Stateless (can verify without DB on simple implementations)
- Scalable across multiple servers
- Self-contained with claims
- Support token rotation for security

---

## Access Token & Refresh Token Architecture

### 1. What are Access Tokens?

**Access Token** (JWT)
- **Lifetime**: 15 minutes (short-lived)
- **Purpose**: Authenticate API requests
- **Storage**: Response body (NOT in cookie)
- **Sent via**: `Authorization: Bearer <token>` header
- **Contains**: User ID, email, name, role
- **Revocation**: Immediate expiration when stored token expires

```
Access Token Claims:
{
  "sub": "user-uuid",           // User ID
  "email": "user@example.com",  // Email
  "firstName": "John",
  "lastName": "Doe",
  "role": "USER",
  "type": "access",              // Distinguish from refresh
  "iat": 1708604400,             // Issued at
  "exp": 1708605300              // Expiration (900s = 15min)
}
```

**Why short-lived?**
- If token is compromised, window of exposure is limited
- Forces client to refresh frequently
- Refresh token is stored securely (HTTPOnly cookie)

### 2. What are Refresh Tokens?

**Refresh Token** (JWT)
- **Lifetime**: 7 days (long-lived)
- **Purpose**: Generate new access tokens
- **Storage**: HTTPOnly secure cookie (NOT accessible via JavaScript)
- **Sent via**: Cookie `refreshToken` (automatic by browser)
- **Contains**: User ID, token version (for rotation tracking)
- **Revocation**: Marked as revoked in database

```
Refresh Token Claims:
{
  "sub": "user-uuid",         // User ID
  "tokenVersion": 1,           // Incremented on rotation
  "type": "refresh",           // Distinguish from access
  "iat": 1708604400,           // Issued at
  "exp": 1709209200            // Expiration (7 days)
}
```

**Why stored in HTTPOnly cookie?**
- Cannot be accessed by JavaScript (XSS protection)
- Automatically sent by browser (CSRF protected)
- More secure than localStorage
- Still vulnerable to CSRF, hence CSRF protection

### 3. Comparison: Access vs Refresh

| Aspect | Access Token | Refresh Token |
|--------|-------------|---------------|
| Lifetime | 15 minutes | 7 days |
| Storage | Response body | HTTPOnly cookie |
| Sent via | Authorization header | Cookie |
| Purpose | Authenticate requests | Generate new tokens |
| Revocation | Automatic (expiry) | Explicit (DB mark) |
| Compromised window | 15 min exposure | Full 7 days exposure |

---

## Refresh Token Rotation

### What is Token Rotation?

Token rotation is a security mechanism that:
1. **Invalidates old tokens** after each use
2. **Issues new tokens** with incremented version
3. **Detects reuse attacks** when old token is replayed
4. **Revokes all user tokens** if reuse detected

### Why is Rotation Important?

**Threat Models**:
- **Token Compromise**: Attacker obtains refresh token
- **Man-in-the-Middle**: Attacker intercepts token during transmission
- **Token Reuse**: Attacker replays an old token after new one issued

**Rotation Benefits**:
- Old tokens become invalid immediately
- Token reuse is detectable (version mismatch)
- Limits attacker's window of opportunity
- Requires active attacker interception (can't just store old token)

### How Rotation Works (Step-by-Step)

#### Step 1: User Logs In
```
Client sends: email + password
Server creates:
  - Access Token (v1, exp: 15 min)
  - Refresh Token v1 (hashed in DB)
  - Token Version: 1
Response:
  - Access Token in body
  - Refresh Token cookie (HttpOnly)
```

#### Step 2: Access Token Expires (15 minutes later)
```
Client sends: POST /auth/refresh
  - Refresh Token from cookie (auto)
  - CSRF Token in header
```

#### Step 3: Server Validates Refresh Token
```
Server checks:
  1. Refresh token exists in DB
  2. Token not revoked
  3. Token not expired
  4. Hash matches (bcrypt.compare)
  5. No version mismatch
```

#### Step 4: Rotation Occurs
```
Server actions:
  1. Mark old token as REVOKED (revoked: true, DB)
  2. Increment version (1 → 2)
  3. Generate new Refresh Token v2
  4. Hash new token (bcrypt)
  5. Store in DB with version: 2
  6. Generate new Access Token
```

#### Step 5: Return New Tokens
```
Response:
  - New Access Token (v2, exp: 15 min)
  - New Refresh Token cookie (HttpOnly, v2)
```

#### Step 6: Old Token Cannot Be Reused
```
If attacker tries old token:
  - Token is marked as REVOKED
  - Validation fails
  - SERVER REVOKES ALL TOKENS
  - User must log in again
```

### Database Schema

```sql
-- RefreshToken Entity
CREATE TABLE refresh_token (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  hashedToken VARCHAR(255) NOT NULL,    -- bcrypt hash
  version INT DEFAULT 1,                 -- 1, 2, 3, ...
  revoked BOOLEAN DEFAULT false,         -- Rotation tracking
  expiresAt TIMESTAMP NOT NULL,
  ipAddress VARCHAR(45),                 -- Security metadata
  userAgent TEXT,
  deviceName VARCHAR(255),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_refresh_token_userId ON refresh_token(userId);
CREATE INDEX idx_refresh_token_expiresAt ON refresh_token(expiresAt);
```

### Rotation Flow Diagram

```
User Login
    ↓
Generate Tokens (v1)
    ↓
Store Refresh Token (v1, not revoked)
    ↓
15 minutes later... Access Token Expires
    ↓
Client: POST /auth/refresh + refresh_token(v1)
    ↓
Server: Find token record for user
    ↓
Server: Validate v1 token
    ↓
Server: Mark v1 as REVOKED ← KEY SECURITY POINT
    ↓
Server: Create new token v2
    ↓
Server: Generate + return new tokens (v2)
    ↓
Response: New Access Token + Refresh Token v2
    ↓
Update Client State
    ↓
Continue Using API with new Access Token
    ↓
    ... 15 minutes later ...
    ↓
Client: POST /auth/refresh + refresh_token(v2)
    ↓
Server: Find v2, validate, rotate to v3
    ↓
...infinite rotation...

ATTACK SCENARIO: Token Reuse
─────────────────────────────────
Attacker has old v1 token (somehow)
    ↓
Attacker: POST /auth/refresh + refresh_token(v1)
    ↓
Server: Query DB for user's token
    ↓
Server: Find v2 (current), v1 is REVOKED
    ↓
Server: ERROR - token is revoked
    ↓
Server: SECURITY ALERT - possible attack
    ↓
Server: REVOKE ALL TOKENS for user
    ↓
User must log in again ← Containment
```

---

## CSRF Protection

### What is CSRF?

**Cross-Site Request Forgery (CSRF)**:
- Attacker tricks browser into making unwanted requests
- Example: Click malicious link, browser auto-sends authenticated request
- Works because cookies are sent automatically by browser

### Why CSRF Matters with HTTPOnly Cookies?

Even though refresh token is HTTPOnly:
- **GET requests** are still vulnerable (no CSRF token)
- **POST requests** can be forged from other sites
- Browser auto-sends cookie even on cross-origin requests

### Double-Submit Cookie Pattern

Our implementation uses **double-submit cookie pattern**:

#### How It Works:

1. **GET Request to Any Endpoint**
   ```
   Client: GET /any-endpoint
   Server: Generate random CSRF token
   Server: Set XSRF-TOKEN cookie
   Server: Send token in X-CSRF-Token header (response body)
   Client: JavaScript reads token, stores in memory
   ```

2. **POST/PUT/PATCH/DELETE Request**
   ```
   Client: POST /auth/refresh
     Headers: {
       "X-CSRF-Token": "token-from-get-response"
     }
     Cookies: {
       "XSRF-TOKEN": "same-token"
     }
   ```

3. **Server Validation**
   ```
   Server: Extract token from header
   Server: Extract token from cookie
   Server: Compare tokens
   If different OR missing: block request (403)
   If same: allow request
   ```

### Why This Works:

- **Token in Header**: JavaScript can read headers (not auto-sent)
- **Token in Cookie**: Browser auto-sends same cookie
- **Same Site**: If attacker is on different site, cannot read token
- **Different Site**: Cannot read header from other site (CORS)
- **Same Site, Different Tab**: Cannot read headers in iframe

### Configuration:

```typescript
// Middleware applies to all requests
app.use(csrf({
  cookie: {
    httpOnly: false,  // JavaScript must read it
    secure: true,     // HTTPS only (production)
    sameSite: 'strict'  // No cross-site requests
  }
}));

// GET: Token auto-generated and set in cookie
// POST/PUT/PATCH/DELETE: Must include X-CSRF-Token header

// Special handling for refresh endpoint:
// - CSRF token validated
// - Refresh token from cookie validated
// - Both must be valid
```

---

## HTTPOnly Cookie Security

### Why HTTPOnly Cookies?

**Comparison: Storage Methods**

| Method | JavaScript Access | CSRF Vulnerable | XSS Vulnerable | Browser Send |
|--------|------------------|-----------------|----------------|--------------|
| localStorage | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| sessionStorage | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| Regular Cookie | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| HTTPOnly Cookie | ❌ No | ✅ Yes | ❌ No | ✅ Yes |

**Our Configuration: HTTPOnly Cookie**
- ❌ Cannot access via `document.cookie`
- ✅ Automatically sent by browser
- ✅ Protected from XSS attacks
- ✅ Requires CSRF protection (but we have it)
- ✅ Server-side validation before use

### Cookie Settings

```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,
  // ↑ Cannot be read by JavaScript (XSS protection)

  secure: process.env.NODE_ENV === 'production',
  // ↑ Only sent over HTTPS (prevents man-in-the-middle)

  sameSite: 'strict',
  // ↑ Only sent to exact same site (CSRF protection)

  path: '/auth/refresh',
  // ↑ Only sent to this specific path

  maxAge: 7 * 24 * 60 * 60 * 1000
  // ↑ Expires after 7 days (matches JWT exp)
});
```

### Threat Mitigation

| Threat | HTTPOnly | Secure | SameSite | CSRF Token |
|--------|----------|--------|----------|-----------|
| XSS | ✅ Blocked | - | - | - |
| Man-in-the-middle | - | ✅ Blocked | - | - |
| CSRF | - | - | ✅ Blocked | ✅ Extra |
| Token Theft | ✅ Harder | ✅ Harder | ✅ Blocked | ✅ Won't work |

---

## Token Reuse Attack Prevention

### Scenario: How Attackers Steal Tokens

```
1. Attacker intercepts network traffic
2. Attacker obtains refresh token
3. Attacker waits for legitimate user to refresh
4. User refreshes → gets new token
5. Both attacker and user have tokens
6. Attacker replays old token...
```

### Our Defense: Version Tracking

```
User Timeline:           Attacker Timeline:
─────────────────        ──────────────────
1. Login (v1)
2. Intercept (no steal)

                         Has v1? Tries to refresh
                              ↓
                         Server checks: current is v2
                              ↓
                         v1 is marked REVOKED
                              ↓
                         SECURITY ALERT!
                              ↓
                         REVOKE ALL TOKENS
                              ↓
                         User forced to login
```

### Implementation Details

```typescript
// RefreshTokenService.rotateRefreshToken()
async rotateRefreshToken(
  user: User,
  oldRefreshToken: string,
  newTokenVersion: number
) {
  // 1. Find current token record
  const current = await find({ userId, revoked: false });

  // 2. Verify old token matches
  const isValid = await bcrypt.compare(oldRefreshToken, current.hash);
  
  if (!isValid) {
    // ATTACK DETECTED: Token mismatch
    await revokeAllUserTokens(user.id);  // ← CRITICAL
    throw UnauthorizedException('Reuse detected');
  }

  // 3. Mark current as revoked
  await update(current.id, { revoked: true });

  // 4. Create new token with incremented version
  const newToken = generateToken(user, newTokenVersion + 1);
  await store({ ...newToken, version: newTokenVersion + 1 });
}
```

---

## API Flow Diagrams

### Login Flow

```
┌─────────────────────────────────────────┐
│         Client (Browser)                │
└─────────────────────────────────────────┘
              ↓ POST /auth/login
              │ (email + password)
              ↓
┌─────────────────────────────────────────┐
│  Server - JwtAuthService.login()        │
├─────────────────────────────────────────┤
│ 1. Find user by email                   │
│ 2. Verify password (bcrypt)             │
│ 3. If 2FA enabled: return requiresTwoFa │
│ 4. Generate Access Token                │
│ 5. Create Refresh Token                 │
│ 6. Hash & store in DB                   │
└─────────────────────────────────────────┘
              ↓
              ↓ Response 200 OK
              │ Body: 
              │ {
              │   "accessToken": "jwt...",
              │   "accessTokenExpiresAt": "...",
              │   "user": { ... }
              │ }
              │
              ↓ Set-Cookie: refreshToken=...
              │  (HttpOnly, Secure, SameSite)
              ↓
┌─────────────────────────────────────────┐
│         Client (Browser)                │
│ ┌─────────────────────────────────────┐ │
│ │ Memory: accessToken                 │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Cookie: refreshToken (HttpOnly)     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Refresh Token Flow

```
     15 minutes later... (Access Token Expired)

┌─────────────────────────────────────────┐
│         Client (Browser)                │
└─────────────────────────────────────────┘
              ↓ POST /auth/refresh
              │ Headers: {
              │   "X-CSRF-Token": "token"
              │ }
              │ Cookies: {
              │   "refreshToken": "...",
              │   "XSRF-TOKEN": "token"
              │ }
              ↓
┌─────────────────────────────────────────┐
│  Server - CsrfMiddleware                │
├─────────────────────────────────────────┤
│ 1. Extract X-CSRF-Token from header     │
│ 2. Extract XSRF-TOKEN from cookie       │
│ 3. Compare tokens                       │
│ 4. If match: allow through              │
│ 5. If diff: throw 403 Forbidden         │
└─────────────────────────────────────────┘
              ↓
              ├─ allowed ─→
              ↓
┌─────────────────────────────────────── ┐
│  Server - JwtRefreshGuard               │
├─────────────────────────────────────────┤
│ 1. Extract refreshToken from cookie     │
│ 2. Verify JWT signature                 │
│ 3. Check token type == "refresh"        │
│ 4. Pass to JwtAuthService               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Server - JwtAuthService.refresh()      │
├─────────────────────────────────────────┤
│ 1. Call RefreshTokenService.rotate()    │
│ 2. Validate old token against DB hash   │
│ 3. If invalid: REVOKE ALL tokens        │
│ 4. Mark old token as revoked            │
│ 5. Create new tokens (version++)        │
│ 6. Store new token hash in DB           │
│ 7. Generate new Access Token            │
└─────────────────────────────────────────┘
              ↓
              ↓ Response 200 OK
              │ Body: {
              │   "accessToken": "new_jwt...",
              │   "accessTokenExpiresAt": "..."
              │ }
              │
              ↓ Set-Cookie: refreshToken=...
              │  (new token, HttpOnly, Secure)
              ↓
┌─────────────────────────────────────────┐
│         Client (Browser)                │
│ ┌─────────────────────────────────────┐ │
│ │ Memory: NEW accessToken             │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Cookie: NEW refreshToken (HttpOnly) │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Protected API Request

```
┌─────────────────────────────────────────┐
│         Client (Browser)                │
└─────────────────────────────────────────┘
              ↓ GET /users/profile
              │ Headers: {
              │   "Authorization": "Bearer <accessToken>"
              │ }
              ↓
┌─────────────────────────────────────────┐
│  Server - JwtAccessGuard                │
├─────────────────────────────────────────┤
│ 1. Extract Bearer token from header     │
│ 2. Verify JWT signature                 │
│ 3. Check expiration                     │
│ 4. Check token type == "access"         │
│ 5. Attach user to request               │
│ 6. Pass to route handler                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Server - Route Handler                 │
├─────────────────────────────────────────┤
│ @Get('profile')                         │
│ @UseGuards(JwtAccessGuard)              │
│ profile(@CurrentUser() user) {          │
│   return { ...user profile... }         │
│ }                                       │
└─────────────────────────────────────────┘
              ↓
              ↓ Response 200 OK
              │ Body: { profile data }
              ↓
┌─────────────────────────────────────────┐
│         Client (Browser)                │
│ Display profile data                    │
└─────────────────────────────────────────┘
```

---

## Security Best Practices

### 1. Token Generation & Storage

```typescript
// ✅ DO: Generate cryptographically secure tokens
const token = jwt.sign(payload, secret, { expiresIn: '15m' });

// ❌ DON'T: Use predictable values
const token = 'token_' + Date.now();

// ✅ DO: Hash tokens before storage
const hash = await bcrypt.hash(token, 12);

// ❌ DON'T: Store raw tokens
db.save({ rawToken: token });
```

### 2. Secret Management

```typescript
// ✅ DO: Use environment variables
const secret = process.env.JWT_ACCESS_SECRET;

// ✅ DO: Use different secrets for access and refresh
JWT_ACCESS_SECRET=access_secret
JWT_REFRESH_SECRET=refresh_secret

// ❌ DON'T: Hardcode secrets
const secret = 'my-secret-key';

// ❌ DON'T: Share secrets in repositories
git add .env  // will be rejected by .gitignore
```

### 3. Expiration & Rotation

```typescript
// ✅ DO: Keep access tokens short-lived
JWT_ACCESS_TTL=900  // 15 minutes

// ✅ DO: Implement rotation on each refresh
rotation_count++

// ❌ DON'T: Use excessively long-lived tokens
JWT_ACCESS_TTL=604800  // 7 days (too long)

// ❌ DON'T: Skip rotation
// Old tokens remain valid indefinitely
```

### 4. CSRF Protection

```typescript
// ✅ DO: Validate CSRF tokens on state-changing requests
if (token_from_header !== token_from_cookie) {
  throw ForbiddenException();
}

// ✅ DO: Use SameSite=strict
cookie: { sameSite: 'strict' }

// ❌ DON'T: Disable CSRF protection
// app.use(csrf({ cookie: { httpOnly: true } })); // Wrong!

// ❌ DON'T: Send tokens in query parameters
// GET /api?csrfToken=xxx  (can be logged/leaked)
```

### 5. HTTPOnly Cookies

```typescript
// ✅ DO: Disable JavaScript access
httpOnly: true

// ✅ DO: Require HTTPS in production
secure: process.env.NODE_ENV === 'production'

// ✅ DO: Restrict to specific path
path: '/auth/refresh'

// ❌ DON'T: Allow JavaScript access
httpOnly: false  // Only if token must be read by JS

// ❌ DON'T: Allow insecure transmission
secure: false  // Allows HTTP (insecure)
```

### 6. Error Messages

```typescript
// ✅ DO: Generic error messages
throw new UnauthorizedException('Invalid credentials');

// ❌ DON'T: Leak information
throw new UnauthorizedException('User not found');
throw new UnauthorizedException('Invalid password');

// These allow attackers to enumerate users!
```

### 7. Token Validation

```typescript
// ✅ DO: Always validate all token properties
1. Check signature (JWT integrity)
2. Check expiration (time-based)
3. Check type field (access vs refresh)
4. Check user exists (DB validation optional)

// ❌ DON'T: Skip validation steps
// Only checking signature is insufficient
```

### 8. Refresh Token Rotation

```typescript
// ✅ DO: Detect token reuse
if (old_token_hash !== db_token_hash) {
  revoke_all_user_tokens();  // Containment
}

// ✅ DO: Increment version
new_version = old_version + 1;

// ❌ DON'T: Allow token reuse
// Never invalidate old tokens

// ❌ DON'T: Ignore version mismatches
// Could allow multiple simultaneous tokens
```

---

## Frontend Integration

###  Installation

```bash
npm install axios jwt-decode
```

### Setup Axios Interceptor

```typescript
// services/api.ts
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true  // ← IMPORTANT: Send cookies
});

// Response Interceptor for token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    // If 401 (unauthorized) and haven't tried refresh yet
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      
      try {
        // Attempt to refresh token
        await api.post('/auth/refresh', {}, {
          headers: {
            'X-CSRF-Token': getCsrfToken()
          }
        });
        
        // Retry original request
        return api(error.config);
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Login Example

```typescript
// pages/LoginPage.tsx
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    
    if (response.data.requiresTwoFa) {
      // Redirect to 2FA verification
      navigate('/2fa-verify', { state: { userId: response.data.user.id } });
      return;
    }
    
    // Store access token in memory (NOT localStorage)
    const accessToken = response.data.accessToken;
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    // Refresh token is in HTTPOnly cookie (automatic)
    
    // Redirect to dashboard
    navigate('/dashboard');
  } catch (error) {
    setError('Login failed');
  }
};
```

### Protected API Call

```typescript
// API call with access token (from memory)
const response = await api.get('/users/profile');
// Automatically includes Authorization header

// If token expired:
// 1. Server returns 401
// 2. Interceptor detects 401
// 3. Calls POST /auth/refresh
// 4. Server validates refresh token (from cookie)
// 5. Server returns new access token
// 6. Interceptor retries original request
// 7. Request succeeds
```

### Logout Example

```typescript
const handleLogout = async (revokeAll = false) => {
  try {
    await api.post('/auth/logout', { revokeAll });
    
    // Clear access token from memory
    delete api.defaults.headers.common['Authorization'];
    
    // Refresh token cookie is cleared by server
    
    // Redirect to login
    navigate('/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

---

## Comparison with Previous Session-Based Auth

| Feature | Session-Based | JWT-Based |
|---------|---------------|-----------|
| Token Type | Opaque (random) | JWT (claims) |
| Token Storage | DB + memory | JWT payload + DB |
| Revocation | Immediate | Immediate (refresh only) |
| Scalability | Requires session store | Stateless (optional DB) |
| Refresh Support | Yes | Yes + rotation |
| CSRF Protection | Via session | Double-submit cookie |
| 2FA Support | Yes | Yes |
| Token Reuse | Not checked | Detected + contained |
| Performance | DB lookup per request | JWT verification |

**Key Differences**:
1. JWT tokens are self-contained
2. Refresh tokens now stored hashed in table with version tracking
3. Rotation detection via version field
4. HTTP-only cookies for safety
5. CSRF protection ready

---

## Migration Checklist

- [ ] Install dependencies (@nestjs/jwt, @nestjs/passport, passport-jwt, csurf, cookie-parser)
- [ ] Create RefreshToken entity
- [ ] Create JWT strategies (access + refresh)
- [ ] Create JWT guards
- [ ] Create CSRF middleware
- [ ] Create JWT token service
- [ ] Create refresh token service
- [ ] Refactor auth service
- [ ] Update auth controller
- [ ] Update auth module
- [ ] Update main.ts with middleware
- [ ] Configure .env with secrets
- [ ] Update frontend (axios + interceptors)
- [ ] Test login flow
- [ ] Test token refresh
- [ ] Test CSRF protection
- [ ] Test 2FA integration
- [ ] Test token reuse detection
- [ ] Deploy production secrets

---

## Support & Questions

For issues or questions about JWT implementation:
1. Check token claims: `jwt.io` paste token
2. Verify secrets match (.env)
3. Check cookie settings (HttpOnly, Secure, SameSite)
4. Monitor DB for revoked tokens
5. Review server logs for rotation events
