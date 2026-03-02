import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface TimelineViewProps {
    data: { date: string; score: number }[];
    height?: number | string;
    showTitle?: boolean;
}

const TimelineView: React.FC<TimelineViewProps> = ({ data, height = 320, showTitle = true }) => {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-300"
                style={{ height }}
            >
                <p className="text-slate-400 font-medium">No analysis data available yet.</p>
            </div>
        );
    }

    return (
        <div
            className={`bg-white rounded-3xl ${showTitle ? 'p-6 border border-slate-100 shadow-sm' : ''}`}
            style={{ height }}
        >
            {showTitle && (
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Skin Score Evolution</h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-[#0d9488]"></span>
                            Score
                        </span>
                    </div>
                </div>
            )}

            <ResponsiveContainer width="100%" height={showTitle ? "85%" : "100%"}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0.01} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            padding: '12px'
                        }}
                        itemStyle={{ fontWeight: 'bold' }}
                        labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#0d9488"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TimelineView;
