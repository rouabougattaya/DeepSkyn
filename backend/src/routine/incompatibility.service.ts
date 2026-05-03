import { Injectable } from '@nestjs/common';
import { Product } from '../products/entities/product.entity';

export interface IncompatibilityResult {
  hasConflict: boolean;
  message: string;
}

@Injectable()
export class IncompatibilityService {
  checkRoutine(products: Product[]): IncompatibilityResult {
    const validProducts = products.filter((p) => !!p);
    const productInfos = validProducts.map((p) => this.analyzeProductIngredients(p));
    const conflicts = this.findConflicts(productInfos);

    if (conflicts.length > 0) {
      return {
        hasConflict: true,
        message: this.formatConflictMessage(conflicts),
      };
    }

    return {
      hasConflict: false,
      message: '✅ Aucun conflit entre les produits. Routine sûre.',
    };
  }

  private analyzeProductIngredients(p: Product) {
    const allText = [
      p.name || '',
      p.description || '',
      ...(p.ingredients || []),
    ].join(' ').toLowerCase();

    return {
      name: p.name,
      hasRetinol: /retinol|rétinol|retinoid/.test(allText),
      hasAHA: /aha|glycolic|lactic|mandelic|acide glycolique|acide lactique/.test(allText),
      hasBHA: /bha|salicylic|acide salicylique/.test(allText),
      hasVitC: /vitamin c|vitamine c|ascorbic|ascorbique/.test(allText),
      hasBP: /benzoyl peroxide|peroxyde de benzoyle/.test(allText),
    };
  }

  private findConflicts(productInfos: any[]) {
    const conflicts: any[] = [];
    for (let i = 0; i < productInfos.length; i++) {
      for (let j = i + 1; j < productInfos.length; j++) {
        const conflict = this.checkPairConflict(productInfos[i], productInfos[j]);
        if (conflict) conflicts.push(conflict);
      }
    }
    return conflicts;
  }

  private checkPairConflict(p1: any, p2: any) {
    const solution = "Utiliser l'un le matin et l'autre le soir, ou alterner un jour sur deux.";
    const problem = this.identifyConflictProblem(p1, p2);
    return problem ? { prod1: p1.name, prod2: p2.name, problem, solution } : null;
  }

  private identifyConflictProblem(p1: any, p2: any): string | null {
    if (this.hasRetinolAHAConflict(p1, p2)) {
      return "Rétinol + AHA (risque élevé d'irritation et d'exfoliation excessive)";
    }
    if (this.hasRetinolBHAConflict(p1, p2)) {
      return "Rétinol + BHA (assèchement et irritation de la peau)";
    }
    if (this.hasRetinolVitCConflict(p1, p2)) {
      return "Rétinol + Vitamine C (différence de pH, risque d'irritation redoublé)";
    }
    if (this.hasVitCAHAConflict(p1, p2)) {
      return "Vitamine C + AHA (déstabilise la vitamine C et irrite la peau)";
    }
    if (this.hasBPConflict(p1, p2)) {
      return "Benzoyl Peroxide + Rétinol (s'annulent mutuellement et assèchent fortement la peau)";
    }
    return null;
  }

  private hasRetinolAHAConflict(p1: any, p2: any): boolean {
    return (p1.hasRetinol && p2.hasAHA) || (p1.hasAHA && p2.hasRetinol);
  }

  private hasRetinolBHAConflict(p1: any, p2: any): boolean {
    return (p1.hasRetinol && p2.hasBHA) || (p1.hasBHA && p2.hasRetinol);
  }

  private hasRetinolVitCConflict(p1: any, p2: any): boolean {
    return (p1.hasRetinol && p2.hasVitC) || (p1.hasVitC && p2.hasRetinol);
  }

  private hasVitCAHAConflict(p1: any, p2: any): boolean {
    return (p1.hasVitC && p2.hasAHA) || (p1.hasAHA && p2.hasVitC);
  }

  private hasBPConflict(p1: any, p2: any): boolean {
    return (p1.hasBP && p2.hasRetinol) || (p1.hasRetinol && p2.hasBP);
  }

  private formatConflictMessage(conflicts: any[]): string {
    let msg = `❌ Incompatibilité détectée\n\nProduits:\n`;
    const allInvolved = Array.from(new Set(conflicts.flatMap((c) => [c.prod1, c.prod2])));
    allInvolved.forEach((name) => { msg += `- ${name}\n`; });
    msg += `\nProblème:\n${conflicts.map((c) => c.problem).join('\n')}\n`;
    msg += `\nSolution:\n${conflicts[0].solution}`;
    return msg;
  }
}
