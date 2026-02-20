import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class SkinMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  analysisId: string;

  @Column({ type: 'varchar' })
  metricType: string; // ACNE / WRINKLES / PIGMENTATION / PORES…

  @Column({ type: 'float' })
  score: number;

  @Column({ type: 'varchar' })
  severityLevel: string;
}