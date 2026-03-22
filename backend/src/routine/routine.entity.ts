import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Routine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['AM', 'PM'] })
  type: 'AM' | 'PM';

  @Column({ default: false })
  generatedByAI: boolean;

  @CreateDateColumn()
  createdAt: Date;
}