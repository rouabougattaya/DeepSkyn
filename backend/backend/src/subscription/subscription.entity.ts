import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  planId: string;

  @Column({ type: 'enum', enum: ['ACTIVE', 'CANCELED', 'EXPIRED'] })
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;
}