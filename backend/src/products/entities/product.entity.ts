import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Core fields (Dev 3) ───────────────────────────────────────────────────

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'float', nullable: true })
  price: number;

  /** cleanser | serum | moisturizer | treatment */
  @Column({ name: 'product_type' })
  type: string;

  /**
   * Stored as a JSON array of strings.
   * In Dev 1 / seeder context, this may contain a single stringified CSV list.
   */
  @Column({ name: 'clean_ingreds', type: 'simple-array', nullable: true })
  ingredients: string[];

  /** Issues targeted by the product: acne, pores, wrinkles, etc. */
  @Column({ name: 'target_issues', type: 'simple-array', nullable: true })
  targetIssues: string[];

  @Column({ type: 'float', nullable: true })
  rating: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ name: 'is_clean', default: false })
  isClean: boolean;

  // ─── Backward-compat fields (Dev 1 / Dev 2) ───────────────────────────────

  /** External purchase URL (Dev 1 / Dev 2 use this for "Buy" links) */
  @Column({ name: 'product_url', type: 'text', nullable: true })
  url: string;

  /** Skin type targeted by this product: dry | oily | sensitive | normal */
  @Column({ name: 'skin_type', nullable: true })
  skinType: string;

  /** ML cluster number assigned by the Python recommendation engine */
  @Column({ type: 'int', nullable: true })
  cluster: number;

  // ─── Timestamps ───────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
