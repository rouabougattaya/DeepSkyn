import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'Le rôle est requis' })
  @IsEnum(['USER', 'ADMIN'], { message: 'Rôle invalide (USER ou ADMIN)' })
  role: 'USER' | 'ADMIN';
}
