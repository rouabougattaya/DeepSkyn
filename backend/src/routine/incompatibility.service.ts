import { Injectable } from '@nestjs/common';
import { Product } from '../products/entities/product.entity';

export interface IncompatibilityResult {
  hasConflict: boolean;
  message: string;
}

@Injectable()
export class IncompatibilityService {
  checkRoutine(products: Product[]): IncompatibilityResult {
    // Protect against null/undefined products
    const validProducts = products.filter((p) => !!p);

    const productInfos = validProducts.map((p) => {
      // Gather all text fields that could contain ingredient info
      const allText = [
        p.name || '',
        p.description || '',
        ...(p.ingredients || []),
      ]
        .join(' ')
        .toLowerCase();

      return {
        product: p,
        hasRetinol:
          allText.includes('retinol') ||
          allText.includes('rétinol') ||
          allText.includes('retinoid'),
        hasAHA:
          allText.includes('aha') ||
          allText.includes('glycolic') ||
          allText.includes('lactic') ||
          allText.includes('mandelic') ||
          allText.includes('acide glycolique') ||
          allText.includes('acide lactique'),
        hasBHA:
          allText.includes('bha') ||
          allText.includes('salicylic') ||
          allText.includes('acide salicylique'),
        hasVitC:
          allText.includes('vitamin c') ||
          allText.includes('vitamine c') ||
          allText.includes('ascorbic') ||
          allText.includes('ascorbique'),
        hasBP:
          allText.includes('benzoyl peroxide') ||
          allText.includes('peroxyde de benzoyle'),
      };
    });

    const conflicts: {prod1: string; prod2: string; problem: string; solution: string}[] = [];

    // Check pairwise incompatibilities
    for (let i = 0; i < productInfos.length; i++) {
      for (let j = i + 1; j < productInfos.length; j++) {
        const p1 = productInfos[i];
        const p2 = productInfos[j];

        let problem: string | null = null;
        let solution = "Utiliser l'un le matin et l'autre le soir, ou alterner un jour sur deux.";

        if ((p1.hasRetinol && p2.hasAHA) || (p1.hasAHA && p2.hasRetinol)) {
          problem = "Rétinol + AHA (risque élevé d'irritation et d'exfoliation excessive)";
        } else if ((p1.hasRetinol && p2.hasBHA) || (p1.hasBHA && p2.hasRetinol)) {
          problem = "Rétinol + BHA (assèchement et irritation de la peau)";
        } else if ((p1.hasRetinol && p2.hasVitC) || (p1.hasVitC && p2.hasRetinol)) {
          problem = "Rétinol + Vitamine C (différence de pH, risque d'irritation redoublé)";
        } else if ((p1.hasVitC && p2.hasAHA) || (p1.hasAHA && p2.hasVitC)) {
          problem = "Vitamine C + AHA (déstabilise la vitamine C et irrite la peau)";
        } else if ((p1.hasBP && p2.hasRetinol) || (p1.hasRetinol && p2.hasBP)) {
          problem = "Benzoyl Peroxide + Rétinol (s'annulent mutuellement et assèchent fortement la peau)";
        }

        if (problem) {
          conflicts.push({
            prod1: p1.product.name,
            prod2: p2.product.name,
            problem,
            solution,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      // Build the requested exact message format
      let msg = `❌ Incompatibilité détectée\n\nProduits:\n`;

      // Extract unique product names involved in all conflicts
      const allInvolved = Array.from(
        new Set(conflicts.flatMap((c) => [c.prod1, c.prod2])),
      );
      allInvolved.forEach((name) => {
        msg += `- ${name}\n`;
      });

      msg += `\nProblème:\n${conflicts.map((c) => c.problem).join('\n')}\n`;
      msg += `\nSolution:\n${conflicts[0].solution}`;

      return { hasConflict: true, message: msg };
    }

    return {
      hasConflict: false,
      message: `✅ Aucun conflit entre les produits. Routine sûre.`,
    };
  }
}
