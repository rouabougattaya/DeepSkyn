import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ type: 'json', nullable: true })
  lifestyleData: any;

  @Column({ type: 'json', nullable: true })
  skinConcerns: any;

  @CreateDateColumn()
  createdAt: Date;
}