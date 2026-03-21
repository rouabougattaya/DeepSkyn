import React from 'react';
import type { Insight } from '../../services/analysisService';
import {
    FiTrendingUp,
    FiAlertCircle,
    FiSmile,
    FiMinus,
    FiInfo
} from 'react-icons/fi';

interface InsightCardProps {
    insight: Insight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
    const getIcon = () => {
        switch (insight.type) {
            case 'improvement': return <FiTrendingUp className="text-green-500" />;
            case 'fluctuation': return <FiAlertCircle className="text-red-500" />;
            case 'stagnation': return <FiMinus className="text-yellow-500" />;
            case 'info': return <FiInfo className="text-blue-500" />;
            default: return <FiSmile className="text-gray-500" />;
        }
    };

    const getSeverityClass = () => {
        switch (insight.severity) {
            case 'high': return 'border-red-500 bg-red-50';
            case 'medium': return 'border-yellow-500 bg-yellow-50';
            case 'low': return 'border-green-500 bg-green-50';
            default: return 'border-gray-200 bg-white';
        }
    };

    return (
        <div className={`p-4 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${getSeverityClass()} flex items-start gap-4 mb-4`}>
            <div className="text-2xl mt-1">
                {getIcon()}
            </div>
            <div>
                <h4 className="font-bold text-gray-800">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {insight.message}
                </p>
            </div>
        </div>
    );
};

export default InsightCard;
