import { Injectable, Logger } from '@nestjs/common';
import { SkinMetricService } from '../skinMetric/skin-metric.service';

export interface Insight {
    type: 'stagnation' | 'improvement' | 'fluctuation' | 'info';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}

@Injectable()
export class InsightsService {
    private readonly logger = new Logger(InsightsService.name);

    constructor(private readonly skinMetricService: SkinMetricService) { }

    async generateInsights(userId: string): Promise<Insight[]> {
        // Fetch up to 50 recent analyses to generate meaningful insights
        const response = await this.skinMetricService.getUserAnalyses(userId, 1, 50);
        const analyses = response.data;

        // On trie par date croissante pour l'analyse temporelle
        const sortedAnalyses = [...analyses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (sortedAnalyses.length < 2) {
            return [{
                type: 'info',
                title: 'Bienvenue !',
                message: 'Continuez vos analyses pour obtenir des insights personnalisés sur l\'évolution de votre peau.',
                severity: 'low'
            }];
        }

        const insights: Insight[] = [];
        const lastThree = sortedAnalyses.slice(-3);
        const latest = lastThree[lastThree.length - 1];
        const previous = lastThree[lastThree.length - 2];

        // 1. Détection de Fluctuations Anormales (> 15 points)
        const diff = Math.abs(latest.skinScore - previous.skinScore);
        if (diff > 15) {
            insights.push({
                type: 'fluctuation',
                title: 'Changement Rapide',
                message: `Votre score a varié de ${diff.toFixed(1)} points. Vérifiez si vous avez changé de routine récemment.`,
                severity: 'high'
            });
        }

        // 2. Détection d'Amélioration or Stagnation (nécessite 3 analyses pour être pertinent)
        if (lastThree.length === 3) {
            const first = lastThree[0];
            const second = lastThree[1];
            const third = lastThree[2];

            const isImproving = third.skinScore > second.skinScore && second.skinScore > first.skinScore;
            const scores = lastThree.map(a => a.skinScore);
            const avg = scores.reduce((a, b) => a + b, 0) / 3;
            const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / 3;

            if (isImproving) {
                insights.push({
                    type: 'improvement',
                    title: 'Amélioration Continue',
                    message: 'Bravo ! Votre score de peau est en hausse constante sur vos 3 dernières analyses.',
                    severity: 'low'
                });
            } else if (variance < 2) {
                insights.push({
                    type: 'stagnation',
                    title: 'Stagnation du Score',
                    message: 'Votre score est très stable. C\'est le bon moment pour essayer un nouveau produit ciblé.',
                    severity: 'medium'
                });
            }
        }

        return insights;
    }
}
