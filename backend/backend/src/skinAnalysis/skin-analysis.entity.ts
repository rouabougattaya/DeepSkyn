import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class SkinAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['PENDING', 'COMPLETED'], default: 'PENDING' })
  status: 'PENDING' | 'COMPLETED';

  @Column({ type: 'float', nullable: true })
  skinScore: number;

  @Column({ type: 'int', nullable: true })
  skinAge: number;

  @Column({ type: 'int', nullable: true })
  realAge: number;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'json', nullable: true })
  aiRawResponse: any;

  @CreateDateColumn()
  createdAt: Date;
}