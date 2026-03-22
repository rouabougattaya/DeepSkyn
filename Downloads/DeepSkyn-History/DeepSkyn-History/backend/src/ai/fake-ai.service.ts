import { Injectable } from '@nestjs/common';
import { RawDetection } from './detection.interface';
import { SkinCondition } from './skin-condition.enum';

@Injectable()
export class FakeAiService {
  
  /**
   * Simule l'analyse d'image par le modèle IA
   * Retourne des détections simulées pour tester le système
   */
  async analyzeImage(imageId?: string): Promise<RawDetection[]> {
    // Pour le développement, on retourne des données simulées
    return this.generateMockDetections();
  }

  /**
   * Génère des détections simulées réalistes
   */
  private generateMockDetections(): RawDetection[] {
    return [
      // Acné multiple
      { class: "Acne", confidence: 0.91, bbox: [100, 200, 150, 250] },
      { class: "Acne", confidence: 0.83, bbox: [500, 600, 550, 650] },
      { class: "Acne", confidence: 0.76, bbox: [300, 400, 350, 450] },
      
      // Taches brunes
      { class: "Dark-Spots", confidence: 0.78, bbox: [200, 300, 250, 350] },
      { class: "Dark-Spots", confidence: 0.65, bbox: [400, 500, 450, 550] },
      
      // Pores dilatés
      { class: "Enlarged-Pores", confidence: 0.72, bbox: [150, 250, 200, 300] },
      { class: "Enlarged-Pores", confidence: 0.68, bbox: [350, 450, 400, 500] },
      
      // Rougeurs
      { class: "Skin Redness", confidence: 0.85, bbox: [120, 100, 200, 180] },
      
      // Points noirs
      { class: "Blackheads", confidence: 0.79, bbox: [180, 280, 220, 320] },
      { class: "Blackheads", confidence: 0.71, bbox: [380, 480, 420, 520] },
      
      // Cicatrices
      { class: "Atrophic Scars", confidence: 0.62, bbox: [250, 350, 300, 400] },
    ];
  }

  /**
   * Génère des détections aléatoires pour tester différents cas
   */
  generateRandomDetections(seed?: number): RawDetection[] {
    const classes = Object.values(SkinCondition);
    const detections: RawDetection[] = [];
    
    // Utiliser une seed pour la reproductibilité
    const random = seed ? this.seededRandom(seed) : Math.random;
    
    // Génère entre 5 et 20 détections
    const numDetections = Math.floor(random() * 15) + 5;
    
    for (let i = 0; i < numDetections; i++) {
      const randomClass = classes[Math.floor(random() * classes.length)];
      
      detections.push({
        class: randomClass,
        confidence: random() * 0.5 + 0.5, // Entre 0.5 et 1.0
        bbox: [
          Math.floor(random() * 500),
          Math.floor(random() * 500),
          Math.floor(random() * 100) + 50,
          Math.floor(random() * 100) + 50,
        ],
      });
    }
    
    return detections;
  }

  /**
   * Génère un cas spécifique pour tester
   */
  generateTestCase(testType: 'severe' | 'mild' | 'mixed'): RawDetection[] {
    switch (testType) {
      case 'severe':
        return this.generateSevereCase();
      case 'mild':
        return this.generateMildCase();
      case 'mixed':
        return this.generateMockDetections();
      default:
        return this.generateMockDetections();
    }
  }

  private generateSevereCase(): RawDetection[] {
    return [
      // Beaucoup d'acné sévère
      { class: "Acne", confidence: 0.95, bbox: [100, 200, 150, 250] },
      { class: "Acne", confidence: 0.92, bbox: [200, 300, 250, 350] },
      { class: "Acne", confidence: 0.89, bbox: [300, 400, 350, 450] },
      { class: "Acne", confidence: 0.87, bbox: [400, 500, 450, 550] },
      { class: "Acne", confidence: 0.91, bbox: [500, 600, 550, 650] },
      
      // Rougeurs étendues
      { class: "Skin Redness", confidence: 0.93, bbox: [50, 50, 300, 200] },
      { class: "Skin Redness", confidence: 0.88, bbox: [350, 100, 600, 250] },
      
      // Taches nombreuses
      { class: "Dark-Spots", confidence: 0.86, bbox: [150, 250, 200, 300] },
      { class: "Dark-Spots", confidence: 0.82, bbox: [250, 350, 300, 400] },
      { class: "Dark-Spots", confidence: 0.79, bbox: [350, 450, 400, 500] },
    ];
  }

  private generateMildCase(): RawDetection[] {
    return [
      // Quelques points mineurs
      { class: "Acne", confidence: 0.65, bbox: [200, 300, 250, 350] },
      { class: "Enlarged-Pores", confidence: 0.58, bbox: [300, 400, 350, 450] },
      { class: "Blackheads", confidence: 0.62, bbox: [400, 500, 450, 550] },
    ];
  }

  /**
   * Générateur pseudo-aléatoire pour les tests
   */
  private seededRandom(seed: number): () => number {
    let m = 0x80000000;
    let s = seed >>> 0;
    
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / m;
    };
  }
}
