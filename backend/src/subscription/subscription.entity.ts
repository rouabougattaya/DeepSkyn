import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  planId: string;

  @Column({ type: 'enum', enum: ['FREE', 'PRO', 'PREMIUM'], default: 'FREE' })
  plan: 'FREE' | 'PRO' | 'PREMIUM';

  @Column({ type: 'enum', enum: ['ACTIVE', 'CANCELED', 'EXPIRED'], default: 'ACTIVE' })
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';

  @Column({ type: 'int', default: 0 })
  imagesUsed: number;

  @Column({ type: 'int', default: 0 })
  messagesUsed: number;

  @Column({ type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastImageAt: Date | null;
}