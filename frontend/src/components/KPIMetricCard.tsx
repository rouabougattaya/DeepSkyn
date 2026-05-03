import React from 'react';

interface KPIMetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

export const KPIMetricCard: React.FC<KPIMetricCardProps> = ({ title, value, subtitle, icon, color, trend }) => {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          background: `${color}15`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{value}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{subtitle}</div>
    </div>
  );
};
