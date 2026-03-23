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

  @Column({ type: 'enum', enum: ['email', 'google', 'apple'], default: 'email' })
  authMethod: 'email' | 'google' | 'apple';

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ type: 'varchar', nullable: true })
  totpSecret: string | null;

  @Column({ default: false })
  isTwoFAEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  authHistory: any[];

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  // ✅ Face embedding (128 floats) stocké en JSON
  @Column({ type: 'simple-json', nullable: true })
  faceDescriptor: number[] | null;

  // Optionnel: dernière mise à jour de l'empreinte
  @Column({ type: 'timestamptz', nullable: true })
  faceUpdatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  webauthnCredentialID: string | null;

  @Column({ type: 'text', nullable: true })
  webauthnPublicKey: string | null;

  @Column({ type: 'integer', nullable: true })
  webauthnCounter: number | null;

  @Column({ type: 'text', nullable: true })
  webauthnChallenge: string | null;

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
