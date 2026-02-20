import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

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
