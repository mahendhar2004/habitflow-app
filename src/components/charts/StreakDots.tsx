interface StreakDotsProps {
  days: boolean[];
  color?: string;
}

export function StreakDots({ days, color = '#FF2D55' }: StreakDotsProps) {
  return (
    <div className="flex gap-[4px]">
      {days.map((done, i) => (
        <div
          key={i}
          className="w-[6px] h-[6px] rounded-full"
          style={{
            backgroundColor: done ? color : 'rgba(255,255,255,0.08)',
            boxShadow: done ? `0 0 4px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}
