import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Tracks each personalized routine update — stores the adjustments
 * made, the source trends, and the resulting routine configuration.
 */
@Entity()
export class RoutinePersonalization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  /** The skin type inferred at the time of the update */
  @Column({ type: 'varchar', length: 50 })
  inferredSkinType: string;

  /** Snapshot of skin metric trends used for this adjustment */
  @Column({ type: 'json', nullable: true })
  trendSnapshot: {
    hydration: { current: number; previous: number; trend: string };
    oil: { current: number; previous: number; trend: string };
    acne: { current: number; previous: number; trend: string };
    wrinkles: { current: number; previous: number; trend: string };
    globalScoreTrend: string;
  };

  /** The adjustment rules that were applied */
  @Column({ type: 'json', nullable: true })
  appliedAdjustments: {
    rule: string;
    action: string;
    reason: string;
  }[];

  /** IDs of the generated AM and PM routines */
  @Column({ type: 'varchar', nullable: true })
  amRoutineId: string;

  @Column({ type: 'varchar', nullable: true })
  pmRoutineId: string;

  /** Number of analyses used to compute trends */
  @Column({ type: 'int', default: 0 })
  analysisCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
