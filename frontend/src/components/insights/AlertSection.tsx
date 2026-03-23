import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Insight } from '../../services/analysisService';
import InsightCard from './InsightCard';

interface AlertSectionProps {
    insights: Insight[];
}

const AlertSection: React.FC<AlertSectionProps> = ({ insights }) => {
    const highSeverityInsights = insights.filter(i => i.severity === 'high');

    if (highSeverityInsights.length === 0) return null;

    return (
        <div className="mb-8">
            <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                Alertes Prioritaires
            </h3>
            <div className="grid grid-cols-1 gap-4">
                {highSeverityInsights.map((insight, idx) => (
                    <InsightCard key={idx} insight={insight} />
                ))}
            </div>
        </div>
    );
};

export default AlertSection;
