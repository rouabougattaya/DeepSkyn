import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsDateString } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  passwordHash: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(['USER', 'ADMIN'])
  @IsOptional()
  role?: 'USER' | 'ADMIN';

  @IsOptional()
  isEmailVerified?: boolean;

  @IsOptional()
  isPremium?: boolean;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
