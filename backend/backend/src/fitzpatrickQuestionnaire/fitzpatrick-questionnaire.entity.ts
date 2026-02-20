import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class FitzpatrickQuestionnaire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'json' })
  answers: any;

  @Column({ type: 'varchar' })
  computedSkinType: string; // I–VI

  @CreateDateColumn()
  createdAt: Date;
}