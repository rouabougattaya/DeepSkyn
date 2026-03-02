import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Hash du token envoyé au client (on ne stocke jamais le token en clair) */
  @Column()
  accessTokenHash: string;

  /** Hash du refresh token */
  @Column()
  refreshTokenHash: string;

  /** Empreinte SHA-256 du refresh token pour lookup rapide (POST /auth/refresh). Nullable pour sessions créées avant ajout de ce champ. */
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  refreshTokenLookup: string | null;

  /** Empreinte SHA-256 de l'access token pour lookup rapide (Guard / validation). Nullable pour rétrocompatibilité. */
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  accessTokenLookup: string | null;

  /** IP au moment de la création (détection de sessions suspectes). */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /** User-Agent au moment de la création (détection de sessions suspectes). */
  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column()
  accessTokenExpiresAt: Date;

  @Column()
  refreshTokenExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
