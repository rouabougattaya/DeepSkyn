# 🔐 Authentification - Guide Concis

## 1️⃣ INSCRIPTION (Register)

**DTO Validation**
```typescript
// backend/src/auth/dto/register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(8)
  password: string;
  
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() birthDate?: string;
  @IsOptional() faceDescriptor?: number[];
}
```

**Service - Création du compte**
```typescript
// backend/src/auth/auth.service.ts
async register(dto: RegisterDto, metadata?: SessionMetadata): Promise<SessionTokens> {
  const emailNorm = dto.email.toLowerCase().trim();
  
  // Vérifier email unique
  const existing = await this.userRepository.findOne({ where: { email: emailNorm } });
  if (existing) throw new ConflictException('Email existe déjà');
  
  // Hash du mot de passe (bcrypt 12 rounds)
  const passwordHash = await bcrypt.hash(dto.password, 12);
  
  // Créer l'utilisateur
  const user = this.userRepository.create({
    email: emailNorm,
    passwordHash,
    firstName: dto.firstName,
    lastName: dto.lastName,
    isTwoFAEnabled: false,
    totpSecret: null,
  });
  await this.userRepository.save(user);
  
  // Émettre les tokens JWT
  return this.issueTokens(user, metadata);
}
```

**Endpoint**
```typescript
@Public()
@Throttle({ default: { limit: 3, ttl: 60_000 } })
@Post('register')
async register(@Body() dto: RegisterDto, @Req() req: Request, @Res() res: Response) {
  const metadata = getSessionMetadata(req);
  const result = await this.authService.register(dto, metadata, req);
  
  // Stocker refresh token en HttpOnly cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  const { refreshToken, ...responseData } = result;
  return res.json(responseData);
}
```

---

## 2️⃣ CONNEXION (Login)

**Service - Vérification du mot de passe**
```typescript
async login(dto: LoginDto, metadata?: SessionMetadata): Promise<SessionTokens> {
  const emailNorm = dto.email.toLowerCase().trim();
  
  // Chercher l'utilisateur
  const user = await this.userRepository.findOne({ where: { email: emailNorm } });
  if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');
  
  // Vérifier blocage (3 tentatives)
  const blockedMinutes = this.loginAttemptService.isBlocked(emailNorm);
  if (blockedMinutes !== null) {
    throw new UnauthorizedException(`Bloqué ${blockedMinutes} minute(s)`);
  }
  
  // Vérifier mot de passe (bcrypt.compare est coûteux = protection brute-force)
  const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!passwordValid) {
    this.loginAttemptService.recordFailure(emailNorm);
    const remaining = this.loginAttemptService.getRemainingAttempts(emailNorm);
    throw new UnauthorizedException(`${remaining} tentative(s) restante(s)`);
  }
  
  // Réinitialiser le compteur
  this.loginAttemptService.clearAttempts(emailNorm);
  
  // SI 2FA ACTIVÉ → Demander le code
  if (user.isTwoFAEnabled && user.totpSecret) {
    tempTwoFAStorage.set(user.id, { totpSecret: user.totpSecret });
    return {
      success: true,
      requiresTwoFa: true,
      message: 'Entrez votre code 2FA',
      user: { id: user.id, email: user.email },
    };
  }
  
  // Émettre les tokens
  const tokens = await this.issueTokens(user, metadata);
  await this.sessionService.createSession(user.id, tokens.refreshToken, req);
  return tokens;
}
```

**Endpoint**
```typescript
@Public()
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post('login')
async login(@Body() dto: LoginDto & { captchaToken?: string }, @Req() req: Request, @Res() res: Response) {
  // Valider captcha
  if (!dto.captchaToken) throw new UnauthorizedException('Captcha requis');
  const isValidCaptcha = await this.recaptchaService.validateToken(dto.captchaToken);
  if (!isValidCaptcha) throw new UnauthorizedException('Captcha échoué');
  
  const metadata = getSessionMetadata(req);
  const result = await this.authService.login(dto, metadata, req);
  
  // SI 2FA requis → retourner sans tokens
  if (result.requiresTwoFa) return res.json(result);
  
  // Stocker refresh token
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  
  const { refreshToken, ...responseData } = result;
  return res.json(responseData);
}
```

---

## 3️⃣ 2FA (Double Authentification)

**Service TOTP**
```typescript
// backend/src/twofactor/twofactor.service.ts
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

async generateSecret(email: string): Promise<{ secret: string; qrCode: string }> {
  const secret = generateSecret();
  
  const otpauthUrl = generateURI({
    issuer: 'DeepSkyn',
    label: email,
    secret: secret,
  });
  
  const qrCode = await QRCode.toDataURL(otpauthUrl);
  return { secret, qrCode };
}

verifyToken(secret: string, token: string): boolean {
  if (!secret || !token) return false;
  const result = verifySync({ token: token.trim(), secret });
  return result.valid;
}
```

**Stockage temporaire (5 minutes)**
```typescript
// backend/src/twofactor/temp-2fa-storage.ts
class TempTwoFAStorage {
  private storage = new Map<string, { userId: string; totpSecret: string; createdAt: number }>();
  private EXPIRATION_TIME = 5 * 60 * 1000;
  
  set(userId: string, data: { totpSecret: string }): void {
    this.storage.set(userId, { userId, totpSecret: data.totpSecret, createdAt: Date.now() });
  }
  
  get(userId: string): { totpSecret: string } | null {
    const data = this.storage.get(userId);
    if (!data) return null;
    if (Date.now() - data.createdAt > this.EXPIRATION_TIME) {
      this.storage.delete(userId);
      return null;
    }
    return { totpSecret: data.totpSecret };
  }
  
  delete(userId: string): void {
    this.storage.delete(userId);
  }
}

export const tempTwoFAStorage = new TempTwoFAStorage();
```

**Activation du 2FA**
```typescript
@Get('setup')
@UseGuards(JwtAccessGuard)
async setupTwoFa(@CurrentUser() user: User) {
  const setup = await this.twoFactorService.generateSecret(user.email);
  return { success: true, qrCode: setup.qrCode, secret: setup.secret };
}

@Post('enable')
@UseGuards(JwtAccessGuard)
async enableTwoFa(@CurrentUser() user: User, @Body() dto: { secret: string; verificationCode: string }) {
  const isCodeValid = this.twoFactorService.verifyToken(dto.secret, dto.verificationCode);
  if (!isCodeValid) return { success: false, message: 'Code incorrect' };
  
  await this.userRepository.update(user.id, {
    totpSecret: dto.secret,
    isTwoFAEnabled: true,
  });
  
  return { success: true, message: '2FA activé!' };
}
```

**Vérification du code lors du login**
```typescript
@Post('verify')
@Public()
async verifyTwoFa(@Body() dto: { userId: string; code: string }) {
  const tempData = tempTwoFAStorage.get(dto.userId);
  if (!tempData) return { success: false, message: 'Session 2FA invalide' };
  
  const isCodeValid = this.twoFactorService.verifyToken(tempData.totpSecret, dto.code);
  if (!isCodeValid) return { success: false, message: 'Code incorrect' };
  
  const user = await this.userRepository.findOne({ where: { id: dto.userId } });
  const tokens = await this.authService.issueTokens(user, {});
  tempTwoFAStorage.delete(dto.userId);
  
  return {
    success: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: tokens.user,
  };
}
```

---

## 4️⃣ BRUTE-FORCE PROTECTION (3 tentatives)

**Service**
```typescript
// backend/src/auth/services/login-attempt.service.ts
const MAX_ATTEMPTS = 3;
const BLOCK_DURATION_MS = 3 * 60 * 1000; // 3 minutes

@Injectable()
export class LoginAttemptService {
  private readonly attempts = new Map<string, { count: number; blockedUntil: Date | null }>();
  
  isBlocked(email: string): number | null {
    const key = email.toLowerCase().trim();
    const record = this.attempts.get(key);
    if (!record?.blockedUntil) return null;
    
    if (new Date() < record.blockedUntil) {
      const remainingMs = record.blockedUntil.getTime() - Date.now();
      return Math.ceil(remainingMs / 60_000);
    }
    
    this.attempts.delete(key);
    return null;
  }
  
  recordFailure(email: string): void {
    const key = email.toLowerCase().trim();
    const existing = this.attempts.get(key);
    const count = (existing?.count ?? 0) + 1;
    
    const blockedUntil = count >= MAX_ATTEMPTS 
      ? new Date(Date.now() + BLOCK_DURATION_MS) 
      : null;
    
    this.attempts.set(key, { count, blockedUntil });
  }
  
  clearAttempts(email: string): void {
    this.attempts.delete(email.toLowerCase().trim());
  }
  
  getRemainingAttempts(email: string): number {
    const key = email.toLowerCase().trim();
    const record = this.attempts.get(key);
    return record ? Math.max(0, MAX_ATTEMPTS - record.count) : MAX_ATTEMPTS;
  }
}
```

---

## 5️⃣ JWT - TOKENS SÉCURISÉS

**Génération des tokens**
```typescript
// backend/src/auth/services/jwt-token.service.ts
@Injectable()
export class JwtTokenService {
  constructor(private jwtService: JwtService, private configService: ConfigService) {}
  
  generateAccessToken(user: User, tokenVersion = 1): string {
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tokenType: 'access',
      version: tokenVersion,
      jti: crypto.randomUUID(),
    };
    
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '900s', // 15 minutes
    });
  }
  
  generateRefreshToken(user: User, tokenVersion = 1): string {
    const payload = {
      sub: user.id,
      email: user.email,
      tokenType: 'refresh',
      version: tokenVersion,
      jti: crypto.randomUUID(),
    };
    
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '604800s', // 7 jours
    });
  }
  
  verifyAccessToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      return null;
    }
  }
  
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }
  
  async verifyHashedToken(plainToken: string, hashedToken: string): Promise<boolean> {
    return bcrypt.compare(plainToken, hashedToken);
  }
}
```

**Rotation des refresh tokens**
```typescript
// backend/src/auth/services/refresh-token.service.ts
async createRefreshToken(user: User, ipAddress?: string, userAgent?: string) {
  const refreshToken = this.jwtTokenService.generateRefreshToken(user, 1);
  const hashedToken = await this.jwtTokenService.hashToken(refreshToken);
  
  const record = this.refreshTokenRepository.create({
    userId: user.id,
    hashedToken,
    version: 1,
    revoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });
  
  await this.refreshTokenRepository.save(record);
  return { ...record, refreshToken };
}

async rotateRefreshToken(user: User, oldRefreshToken: string, newTokenVersion: number) {
  const decoded = this.jwtTokenService.verifyRefreshToken(oldRefreshToken);
  if (!decoded) throw new UnauthorizedException('Token invalide');
  
  const oldRecord = await this.refreshTokenRepository.findOne({
    where: { userId: user.id, version: decoded.version },
  });
  
  if (!oldRecord) throw new UnauthorizedException('Token non trouvé');
  
  const isValid = await this.jwtTokenService.verifyHashedToken(oldRefreshToken, oldRecord.hashedToken);
  if (!isValid) throw new UnauthorizedException('Token invalide');
  
  oldRecord.revoked = true;
  await this.refreshTokenRepository.save(oldRecord);
  
  const newRefreshToken = this.jwtTokenService.generateRefreshToken(user, newTokenVersion);
  const hashedNewToken = await this.jwtTokenService.hashToken(newRefreshToken);
  
  const newRecord = this.refreshTokenRepository.create({
    userId: user.id,
    hashedToken: hashedNewToken,
    version: newTokenVersion,
    revoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  
  await this.refreshTokenRepository.save(newRecord);
  return { ...newRecord, refreshToken: newRefreshToken };
}
```

**Entité Refresh Token**
```typescript
// backend/src/auth/entities/refresh-token.entity.ts
@Entity('refresh_tokens')
@Index(['userId', 'version'], { unique: true })
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column('uuid')
  userId: string;
  
  @Column('varchar')
  hashedToken: string;
  
  @Column('int', { default: 1 })
  version: number;
  
  @Column('boolean', { default: false })
  revoked: boolean;
  
  @Column('timestamp')
  expiresAt: Date;
  
  @Column('varchar', { nullable: true })
  ipAddress: string | null;
  
  @Column('varchar', { nullable: true })
  userAgent: string | null;
  
  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

**Guard JWT**
```typescript
// backend/src/auth/guards/jwt-access.guard.ts
@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }
  
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }
  
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) return user || null;
    if (err || !user) throw err || new UnauthorizedException('Token invalide');
    return user;
  }
}
```

**Émission complète des tokens**
```typescript
// backend/src/auth/auth.service.ts
private async issueTokens(user: User, metadata?: SessionMetadata): Promise<SessionTokens> {
  const accessToken = this.jwtTokenService.generateAccessToken(user);
  const accessTokenExpiresAt = new Date(Date.now() + 900 * 1000);
  
  const refreshTokenResult = await this.refreshTokenService.createRefreshToken(
    user,
    metadata?.ipAddress ?? null,
    metadata?.userAgent ?? null
  );
  const refreshToken = refreshTokenResult.refreshToken;
  
  if (!refreshToken) throw new Error('Refresh token manquant');
  
  return {
    success: true,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt: refreshTokenResult.expiresAt,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  };
}
```

---

## 📋 Configuration .env

```env
JWT_SECRET=your-super-secret-key-change-this
JWT_ACCESS_SECRET=access-secret-key-change-this
JWT_REFRESH_SECRET=refresh-secret-key-change-this
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800

RECAPTCHA_SECRET_KEY=your-recaptcha-secret
RECAPTCHA_SITE_KEY=your-recaptcha-site

DATABASE_URL=postgresql://user:password@localhost:5432/deepskyn

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="DeepSkyn <support@deepskyn.com>"

FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🎯 Résumé des flux

```
REGISTER → Hash password → Créer user → Émettre tokens
LOGIN → Vérifier password → Check 3 tentatives → Check 2FA → Tokens
2FA → TOTP 6 chiffres → Vérifier code → Tokens finaux
BRUTE-FORCE → 3 tentatives → Blocage 3 minutes
JWT → Access (15 min, Bearer) + Refresh (7 j, HttpOnly cookie)
```
