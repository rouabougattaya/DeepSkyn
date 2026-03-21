import { IsEmail, IsString, IsEnum, IsOptional, Length, MinLength, Matches } from 'class-validator';

export class CreateAdminDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password: string;

  @IsString()
  @Length(1, 50)
  firstName: string;

  @IsString()
  @Length(1, 50)
  lastName: string;

  @IsOptional()
  @IsEnum(['USER', 'ADMIN'], { message: 'Rôle invalide (USER ou ADMIN)' })
  role?: 'USER' | 'ADMIN' = 'USER';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;
}
