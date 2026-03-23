import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'product_type' })
  type: string; // Moisturiser, Serum, Cleanser, Mask, etc.

  @Column({ name: 'product_url', type: 'text', nullable: true })
  url: string;

  @Column({ name: 'clean_ingreds', type: 'text' })
  ingredients: string;

  @Column({ type: 'float', nullable: true })
  price: number;

  @Column({ name: 'skin_type', nullable: true })
  skinType: string; // dry, oily, sensitive

  @Column({ type: 'int', nullable: true })
  cluster: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
