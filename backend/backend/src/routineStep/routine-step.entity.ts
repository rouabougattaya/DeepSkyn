import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class RoutineStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  routineId: string;

  @Column()
  productId: string;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}