import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsNumber } from 'class-validator';

export class LoginFaceDto {
  @IsEmail()
  email: string;

  @IsArray()
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  @IsNumber({}, { each: true })
  liveDescriptor: number[];
}