import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MinLength(1, { message: 'Le refresh token est requis' })
  refreshToken: string;
}
