import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, unique: true })
  googleId: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  photoAnalysis: any;

  @Column({ type: 'jsonb', nullable: true })
  emailAnalysis: any;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, default: 0.5 })
  aiScore: number;

  @Column({ type: 'enum', enum: ['USER', 'ADMIN'], default: 'USER' })
  role: 'USER' | 'ADMIN';

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations (to be implemented)
  // @OneToMany(() => Session, session => session.user)
  // sessions: Session[];
  // @OneToMany(() => SkinAnalysis, analysis => analysis.user)
  // skinAnalyses: SkinAnalysis[];
  // @OneToMany(() => Routine, routine => routine.user)
  // routines: Routine[];
  // @OneToMany(() => Subscription, subscription => subscription.user)
  // subscriptions: Subscription[];
  // @OneToMany(() => ChatMessage, chatMessage => chatMessage.user)
  // chatMessages: ChatMessage[];
}
