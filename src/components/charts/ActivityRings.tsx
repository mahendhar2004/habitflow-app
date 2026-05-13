interface Ring {
  progress: number;
  color: string;
  glowColor: string;
  label: string;
  value: string;
}

interface ActivityRingsProps {
  rings: Ring[];
  size?: number;
}

export function ActivityRings({ rings, size = 140 }: ActivityRingsProps) {
  const strokeWidth = 10;
  const gap = 14;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => {
          const radius = center - strokeWidth / 2 - i * gap;
          const circumference = 2 * Math.PI * radius;
          const progress = Math.min(ring.progress, 100);
          const offset = circumference - (progress / 100) * circumference;

          return (
            <g key={i}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${center} ${center})`}
                style={{
                  filter: `drop-shadow(0 0 6px ${ring.glowColor})`,
                  transition: 'stroke-dashoffset 1s ease-out',
                }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text">{rings[0]?.value || ''}</span>
        <span className="text-[10px] text-text-2">{rings[0]?.label || ''}</span>
      </div>
    </div>
  );
}
