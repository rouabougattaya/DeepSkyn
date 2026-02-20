import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  analysisId: string;

  @CreateDateColumn()
  generatedAt: Date;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'float', nullable: true })
  aiConfidenceScore: number;
}