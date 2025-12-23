import { useState } from 'react';

export default function ExpenseChart({ data, goals = [], year, customData, customLabels }) {
    // data: { '2023-01': { income: 1000, expense: 500, ... }, ... }

    // 1. Prepare Realized Data
    let realizedData;
    let axisLabels;

    if (customData && customLabels) {
        // Rolling/Custom Mode
        realizedData = customData;
        axisLabels = customLabels;
    } else {
        // Standard Calendar Year Mode
        const months = Array.from({ length: 12 }, (_, i) => i);
        axisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

        const getValueForMonth = (monthIndex) => {
            const entry = Object.entries(data).find(([key]) => parseInt(key.split('-')[1]) === monthIndex + 1 && parseInt(key.split('-')[0]) === year);
            const targetKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            return data[targetKey]?.expense || 0;
        };
        realizedData = months.map(i => getValueForMonth(i));
    }

    // 2. Prepare Goal Data (Calendar mode only for now)
    let goalData = [];
    if (!customData) {
        const months = Array.from({ length: 12 }, (_, i) => i);
        const getGoalForMonth = (monthIndex) => {
            const mKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            // Assuming goals might support 'expense' type in future, or reuse revenue goals? 
            // Usually expense goals are "Limit Budget". 
            // For now, let's look for 'expense' type goals. If none, it just won't show.
            const goal = goals.find(g => g.type === 'expense' && g.period === 'month' && g.period_key === mKey);
            return goal ? goal.target_amount : null;
        };
        goalData = months.map(i => getGoalForMonth(i));
    }


    // Check if we have ANY goals to display
    const hasGoals = goalData.some(v => v !== null);

    // 3. Scaling
    // Max value should consider both realized and goals
    const allValues = [...realizedData, ...(hasGoals ? goalData.filter(v => v !== null) : [])];
    const maxVal = Math.max(...allValues, 100);

    const chartHeight = 250;
    const chartWidth = 600;
    const padding = 40;
    const graphHeight = chartHeight - padding * 2;
    const graphWidth = chartWidth - padding * 2;

    const xScale = (index) => padding + (index * (graphWidth / 11));
    const yScale = (val) => chartHeight - padding - ((val / maxVal) * graphHeight);

    // 4. Paths

    // Realized Path
    const realizedPoints = realizedData.map((val, i) => `${xScale(i)},${yScale(val)}`).join(' ');
    const areaPoints = `${xScale(0)},${chartHeight - padding} ${realizedPoints} ${xScale(11)},${chartHeight - padding}`;

    // Goal Path
    const goalPointsArray = goalData.map((val, i) => val !== null ? `${xScale(i)},${yScale(val)}` : null).filter(p => p !== null);
    const goalPathString = goalPointsArray.join(' ');


    const [hoveredMonth, setHoveredMonth] = useState(null);


    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Évolution des Dépenses</h2>

            <div className="relative w-full overflow-hidden">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" style={{ maxHeight: '350px' }}>

                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = yScale(maxVal * ratio);
                        return (
                            <g key={ratio}>
                                <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                <text x={padding - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400">{Math.round(maxVal * ratio)}€</text>
                            </g>
                        );
                    })}

                    {/* Area under Realized Curve (Red tint) */}
                    <path d={`M ${areaPoints} Z`} fill="rgba(239, 68, 68, 0.1)" stroke="none" />

                    {/* Realized Line (Red) */}
                    <polyline points={realizedPoints} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Goal Line (if exists) */}
                    {hasGoals && goalPointsArray.length > 1 && (
                        <polyline points={goalPathString} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
                    )}

                    {/* Data Points - Realized */}
                    {realizedData.map((val, i) => (
                        <circle
                            key={`real-${i}`}
                            cx={xScale(i)} cy={yScale(val)} r="4"
                            fill="white" stroke="#ef4444" strokeWidth="2"
                            className="transition-all duration-200 hover:r-6 cursor-pointer"
                            onMouseEnter={() => setHoveredMonth({ index: i, value: val, goal: goalData[i], x: xScale(i), y: yScale(val) })}
                            onMouseLeave={() => setHoveredMonth(null)}
                        />
                    ))}

                    {/* Data Points - Goals */}
                    {hasGoals && goalData.map((val, i) => (
                        val !== null && (
                            <circle
                                key={`goal-${i}`}
                                cx={xScale(i)} cy={yScale(val)} r="4"
                                fill="white" stroke="#f59e0b" strokeWidth="2"
                                className="cursor-pointer"
                            />
                        )
                    ))}

                    {/* X Axis Labels */}
                    {axisLabels.map((name, i) => (
                        <text key={i} x={xScale(i)} y={chartHeight - 10} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                            {name}
                        </text>
                    ))}

                </svg>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-xs font-medium text-slate-600">Dépenses</span>
                    </div>
                    {hasGoals && (
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-500"></div>
                            <span className="text-xs font-medium text-slate-600">Budget (Mensuel)</span>
                        </div>
                    )}
                </div>

                {/* Tooltip */}
                {hoveredMonth && (
                    <div
                        className="absolute bg-slate-800 text-white text-xs rounded px-2 py-1 pointer-events-none transform -translate-x-1/2 -translate-y-full shadow-lg z-10"
                        style={{
                            left: `${(hoveredMonth.x / chartWidth) * 100}%`,
                            top: `${(hoveredMonth.y / chartHeight) * 100}%`,
                            marginTop: '-10px'
                        }}
                    >
                        <div className="font-bold mb-1">{axisLabels[hoveredMonth.index]}</div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-red-300">Dépenses:</span>
                            <span className="font-mono">{hoveredMonth.value.toFixed(2)}€</span>
                        </div>
                        {hoveredMonth.goal !== null && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-amber-400">Budget:</span>
                                <span className="font-mono">{hoveredMonth.goal.toFixed(2)}€</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
