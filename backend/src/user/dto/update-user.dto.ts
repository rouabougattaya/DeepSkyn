import { IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  faceDescriptor?: number[];

  @IsOptional()
  faceUpdatedAt?: Date;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
