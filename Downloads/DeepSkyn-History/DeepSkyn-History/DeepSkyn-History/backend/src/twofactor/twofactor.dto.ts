import { IsString, IsNotEmpty, Length } from 'class-validator';

export class EnableTwoFaDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  verificationCode: string;

  @IsString()
  @IsNotEmpty()
  secret: string;
}

export class VerifyTwoFaDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  code: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class DisableTwoFaDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
