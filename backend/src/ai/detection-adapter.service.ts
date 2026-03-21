import { Injectable } from '@nestjs/common';
import { RawDetection, SkinMetric } from './detection.interface';
import { SkinCondition } from './skin-condition.enum';

@Injectable()
export class DetectionAdapterService {
  
  /**
   * Transforme les détections brutes de l'IA en métriques structurées
   */
  aggregateDetections(detections: RawDetection[]): SkinMetric[] {
    const grouped = this.groupDetectionsByClass(detections);
    
    return Object.entries(grouped).map(([className, items]) => ({
      type: this.mapToSkinCondition(className),
      count: items.length,
      severity: this.calculateSeverity(items),
      averageConfidence: this.calculateAverageConfidence(items),
    }));
  }

  /**
   * Regroupe les détections par classe
   */
  private groupDetectionsByClass(detections: RawDetection[]): Record<string, RawDetection[]> {
    const grouped: Record<string, RawDetection[]> = {};
    
    for (const detection of detections) {
      if (!grouped[detection.class]) {
        grouped[detection.class] = [];
      }
      grouped[detection.class].push(detection);
    }
    
    return grouped;
  }

  /**
   * Map le nom de classe vers l'enum SkinCondition
   */
  private mapToSkinCondition(className: string): SkinCondition {
    const mapping: Record<string, SkinCondition> = {
      'Acne': SkinCondition.ACNE,
      'Enlarged-Pores': SkinCondition.PORES,
      'Atrophic Scars': SkinCondition.SCARS,
      'Skin Redness': SkinCondition.REDNESS,
      'Blackheads': SkinCondition.BLACKHEADS,
      'Dark-Spots': SkinCondition.DARK_SPOTS,
      'black_dots': SkinCondition.BLACK_DOTS,
    };

    const condition = mapping[className];
    if (!condition) {
      throw new Error(`Unknown skin condition class: ${className}`);
    }

    return condition;
  }

  /**
   * Calcule la sévérité moyenne pour un groupe de détections
   */
  private calculateSeverity(detections: RawDetection[]): number {
    if (detections.length === 0) return 0;
    
    // La sévérité est basée sur la confiance moyenne
    // Plus haute confiance = plus sévère
    const totalConfidence = detections.reduce((sum, detection) => sum + detection.confidence, 0);
    return totalConfidence / detections.length;
  }

  /**
   * Calcule la confiance moyenne
   */
  private calculateAverageConfidence(detections: RawDetection[]): number {
    if (detections.length === 0) return 0;
    
    const totalConfidence = detections.reduce((sum, detection) => sum + detection.confidence, 0);
    return totalConfidence / detections.length;
  }

  /**
   * Valide que les détections ont le format attendu
   */
  validateDetections(detections: RawDetection[]): boolean {
    if (!Array.isArray(detections)) return false;
    
    return detections.every(detection => 
      typeof detection.class === 'string' &&
      typeof detection.confidence === 'number' &&
      detection.confidence >= 0 && detection.confidence <= 1 &&
      Array.isArray(detection.bbox) &&
      detection.bbox.length === 4
    );
  }
}
