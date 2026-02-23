// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: ['USER', 'ADMIN'], default: 'USER' })
  role: 'USER' | 'ADMIN';

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ type: 'varchar', nullable: true })
  totpSecret: string | null;

  @Column({ default: false })
  isTwoFAEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  // ✅ Face embedding (128 floats) stocké en JSON
  @Column({ type: 'simple-json', nullable: true })
  faceDescriptor: number[] | null;

  // Optionnel: dernière mise à jour de l'empreinte
  @Column({ type: 'timestamptz', nullable: true })
  faceUpdatedAt: Date | null;
  @Column({ nullable: true })
webauthnCredentialID?: string;

@Column({ type: 'text', nullable: true })
webauthnPublicKey?: string;

@Column({ nullable: true })
webauthnCounter?: number;
@Column({ type: 'text', nullable: true })
webauthnChallenge: string | null;
  
}