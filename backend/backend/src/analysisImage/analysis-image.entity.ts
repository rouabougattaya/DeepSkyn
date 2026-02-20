import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class AnalysisImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  analysisId: string;

  @Column()
  imageUrl: string;

  @Column()
  storageKey: string;

  @CreateDateColumn()
  createdAt: Date;
}