import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class DigitalTwinSimulation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: false })
  userId!: string;

  @Column({ nullable: false })
  baseAnalysisId!: string;

  // Simulation data for month 1
  @Column({ type: 'json' })
  month1Prediction!: {
    skinScore: number;
    skinAge: number;
    metrics: {
      hydration: number;
      oil: number;
      acne: number;
      wrinkles: number;
    };
    improvements: string[];
    degradations: string[];
    summary: string;
  };

  // Simulation data for month 3
  @Column({ type: 'json' })
  month3Prediction!: {
    skinScore: number;
    skinAge: number;
    metrics: {
      hydration: number;
      oil: number;
      acne: number;
      wrinkles: number;
    };
    improvements: string[];
    degradations: string[];
    summary: string;
  };

  // Simulation data for month 6
  @Column({ type: 'json' })
  month6Prediction!: {
    skinScore: number;
    skinAge: number;
    metrics: {
      hydration: number;
      oil: number;
      acne: number;
      wrinkles: number;
    };
    improvements: string[];
    degradations: string[];
    summary: string;
  };

  // Context used for simulation
  @Column({ type: 'json', nullable: true })
  simulationContext!: {
    routineConsistency: 'high' | 'medium' | 'low';
    lifestyleFactors: string[];
    currentSkinType: string;
    mainConcerns: string[];
  };

  // Overall recommendations
  @Column({ type: 'text', nullable: true })
  overallRecommendation!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
