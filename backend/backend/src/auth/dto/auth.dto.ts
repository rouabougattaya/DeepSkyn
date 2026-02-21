import { IsEmail, IsString, IsOptional, IsObject } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class GoogleAuthDto {
  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  picture: string;

    @IsOptional()
  verified_email?: boolean; 
  
  @IsString()
  given_name: string;

  @IsString()
  family_name: string;

  @IsOptional()
  @IsObject()
  photoAnalysis?: any;

  @IsOptional()
  @IsObject()
  emailAnalysis?: any;

  @IsOptional()
  aiScore?: number;
}

export class CheckUserDto {
  @IsEmail()
  email: string;
}

export class UpdateAIScoreDto {
  @IsString()
  userId: string;

  @IsString()
  aiScore: string;

  @IsObject()
  photoAnalysis: any;

  @IsObject()
  emailAnalysis: any;
}
