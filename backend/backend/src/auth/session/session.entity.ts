// backend/src/auth/session/session.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { User } from '../../user/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  @Index()
  refreshToken: string;

  @Column({ type: 'jsonb', nullable: true })
  fingerprint: {
    hash: string;
    browser: string;      // Simplifié en string
    os: string;           // Simplifié en string
    ip: string;
    isMobile: boolean;
    isTablet: boolean;
  };

  @Column({ 
    type: 'enum', 
    enum: ['low', 'medium', 'high'],
    default: 'low' 
  })
  riskLevel: 'low' | 'medium' | 'high';

  @Column({ type: 'jsonb', nullable: true })
  riskAnalysis: {
    score: number;
    anomalies: string[];
    warning: string | null;
    recommendation: 'keep' | 'review' | 'revoke';
  };

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActivity: Date;
}