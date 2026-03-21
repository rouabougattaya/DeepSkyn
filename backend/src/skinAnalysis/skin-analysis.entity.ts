import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class SkinAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @Column({ type: 'enum', enum: ['PENDING', 'COMPLETED'], default: 'PENDING' })
  status: 'PENDING' | 'COMPLETED';

  @Column({ type: 'float', nullable: true })
  skinScore: number;

  @Column({ type: 'int', nullable: true })
  skinAge: number;

  @Column({ type: 'int', nullable: true })
  realAge: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  hydration: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  oil: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  acne: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  wrinkles: number;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'json', nullable: true })
  aiRawResponse: any;

  @CreateDateColumn()
  createdAt: Date;
}