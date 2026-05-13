import { getLastNDays } from '../../utils/dates';

interface HeatmapProps {
  data: Record<string, number>;
  days?: number;
  color?: string;
}

export function Heatmap({ data, days = 91, color = '#FF2D55' }: HeatmapProps) {
  const allDays = getLastNDays(days);
  const maxVal = Math.max(1, ...Object.values(data));

  return (
    <div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(13, 1fr)` }}>
        {allDays.map((day) => {
          const val = data[day] || 0;
          const intensity = val / maxVal;
          const opacity = val === 0 ? 0.06 : 0.15 + intensity * 0.75;
          const glow = intensity > 0.6 ? `0 0 4px ${color}` : 'none';

          return (
            <div
              key={day}
              className="aspect-square rounded-[2px]"
              style={{
                backgroundColor: val === 0 ? 'rgba(255,255,255,0.04)' : color,
                opacity,
                boxShadow: glow,
              }}
              title={`${day}: ${val}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[9px] text-text-3">Less</span>
        {[0.06, 0.2, 0.45, 0.7, 0.95].map((op, i) => (
          <div
            key={i}
            className="w-[9px] h-[9px] rounded-[2px]"
            style={{
              backgroundColor: i === 0 ? 'rgba(255,255,255,0.04)' : color,
              opacity: op,
              boxShadow: op > 0.6 ? `0 0 3px ${color}` : 'none',
            }}
          />
        ))}
        <span className="text-[9px] text-text-3">More</span>
      </div>
    </div>
  );
}
