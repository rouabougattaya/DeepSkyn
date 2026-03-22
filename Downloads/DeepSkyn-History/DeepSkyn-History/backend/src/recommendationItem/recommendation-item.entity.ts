import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class RecommendationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recommendationId: string;

  @Column()
  productId: string;

  @Column({ type: 'int' })
  ranking: number;

  @Column({ type: 'text', nullable: true })
  reason: string;
}