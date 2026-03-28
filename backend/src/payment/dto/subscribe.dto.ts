import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsIn(['PRO', 'PREMIUM'])
  plan: 'PRO' | 'PREMIUM';

  /** Simulated card holder name */
  @IsString()
  @IsNotEmpty()
  cardHolder: string;

  /** Last 4 digits stored only (never full card!) */
  @IsString()
  @IsNotEmpty()
  cardLast4: string;
}
