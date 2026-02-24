import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;
}

export class LoginResponseDto {
  success: boolean;
  requiresTwoFa?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isTwoFAEnabled?: boolean;
  };
}
