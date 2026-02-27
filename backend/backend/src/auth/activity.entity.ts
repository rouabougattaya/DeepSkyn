import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../user/user.entity';

export enum ActivityType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    EMAIL_CHANGED = 'EMAIL_CHANGED',
    SESSION_CREATED = 'SESSION_CREATED',
    SESSION_TERMINATED = 'SESSION_TERMINATED',
    ROLE_UPDATED = 'ROLE_UPDATED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    SENSITIVE_ACTION = 'SENSITIVE_ACTION',
}

export enum RiskLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

@Entity('activities')
@Index(['userId', 'createdAt'])
@Index(['userId', 'type'])
export class Activity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({
        type: 'enum',
        enum: ActivityType,
    })
    type: ActivityType;

    @Column({ type: 'jsonb', nullable: true, default: {} })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    ipAddress: string;

    @Column({ nullable: true })
    deviceInfo: string;

    @Column({ type: 'jsonb', nullable: true, default: {} })
    location: { country?: string; city?: string; region?: string };

    @Column({
        type: 'enum',
        enum: RiskLevel,
        default: RiskLevel.LOW,
    })
    riskLevel: RiskLevel;

    @Column({ nullable: true, type: 'text' })
    riskExplanation: string;

    @Column({ nullable: true })
    recommendedAction: string;

    @Column({ nullable: true, type: 'text' })
    previousHash: string;

    @Column({ nullable: true, type: 'text' })
    currentHash: string;

    @CreateDateColumn()
    createdAt: Date;
}
