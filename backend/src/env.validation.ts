import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUrl,
  validate,
  ValidationError,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export class EnvironmentVariables {
  // ✅ Core Configuration
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3001;

  // ✅ Database (REQUIRED in production)
  @IsNotEmpty({
    message: 'DATABASE_URL is required. Format: postgres://user:pass@host:port/db',
  })
  @IsUrl()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsNumber()
  DB_PORT?: number;

  @IsOptional()
  @IsString()
  DB_USER?: string;

  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  @IsOptional()
  @IsString()
  DB_NAME?: string;

  @IsNumber()
  DB_POOL_SIZE: number = 10;

  @IsNumber()
  DB_MAX_QUERY_TIME: number = 5000;

  // ✅ JWT (REQUIRED in production - must be >= 32 chars)
  @IsNotEmpty({
    message:
      'JWT_SECRET is required and must be >= 32 characters. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  })
  @IsString()
  JWT_SECRET!: string;

  @IsNumber()
  JWT_EXPIRY: number = 3600; // 1 hour

  @IsNumber()
  JWT_REFRESH_EXPIRY: number = 604800; // 7 days

  // ✅ Stripe (REQUIRED for payments)
  @IsNotEmpty({ message: 'STRIPE_SECRET_KEY is required for payment processing' })
  @IsString()
  STRIPE_SECRET_KEY!: string;

  @IsNotEmpty({ message: 'STRIPE_WEBHOOK_SECRET is required for webhook validation' })
  @IsString()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsOptional()
  @IsString()
  STRIPE_PUBLISHABLE_KEY?: string;

  // ✅ CORS (REQUIRED)
  @IsNotEmpty({ message: 'CORS_ORIGIN is required. Format: http://localhost:5173' })
  @IsString()
  CORS_ORIGIN!: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  // ✅ Google OAuth (Optional but recommended)
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CALLBACK_URL?: string;

  // ✅ AI Services
  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENROUTER_API_KEY?: string;

  // ✅ Logging & Monitoring
  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  // ✅ Email (Optional)
  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  SENDGRID_API_KEY?: string;

  // ✅ reCAPTCHA
  @IsOptional()
  @IsString()
  RECAPTCHA_SECRET_KEY?: string;

  // ✅ Rate Limiting
  @IsNumber()
  THROTTLE_TTL: number = 60000; // 1 minute

  @IsNumber()
  THROTTLE_LIMIT: number = 100;

  // ✅ Application
  @IsString()
  APP_NAME: string = 'DeepSkyn';

  @IsString()
  APP_VERSION: string = '1.0.0';

  // ✅ Security
  @IsString()
  COOKIE_SECRET: string =
    process.env.NODE_ENV === 'production'
      ? process.env.COOKIE_SECRET || 'change-me-in-production'
      : 'dev-secret';
}

/**
 * Validate and transform environment variables
 * Throws error if required variables are missing or invalid
 */
export async function validateEnvironment(
  config: Record<string, unknown>,
): Promise<EnvironmentVariables> {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = await validate(validatedConfig);

  if (errors.length > 0) {
    const message = errors
      .map((error: ValidationError) => {
        const constraints = Object.values(error.constraints || {});
        return `  ❌ ${error.property}: ${constraints.join(', ')}`;
      })
      .join('\n');

    throw new Error(
      `❌ Environment validation failed:\n${message}\n\n` +
      `See .env.example for all required variables.`,
    );
  }

  // ✅ Additional production checks
  if (validatedConfig.NODE_ENV === Environment.Production) {
    const productionRequiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'CORS_ORIGIN',
    ];

    const missing = productionRequiredVars.filter((key) => !config[key]);

    if (missing.length > 0) {
      throw new Error(
        `❌ Production missing required variables:\n` +
        missing.map((v) => `  - ${v}`).join('\n'),
      );
    }

    // Validate JWT secret length
    if (validatedConfig.JWT_SECRET.length < 32) {
      throw new Error(
        `❌ JWT_SECRET must be at least 32 characters in production. ` +
        `Current length: ${validatedConfig.JWT_SECRET.length}`,
      );
    }

    // Validate CORS origin is not localhost
    if (validatedConfig.CORS_ORIGIN.includes('localhost')) {
      console.warn('⚠️  WARNING: CORS_ORIGIN contains localhost in production');
    }
  }

  return validatedConfig;
}

/**
 * Get environment variable with fallback
 * Useful for optional config
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
