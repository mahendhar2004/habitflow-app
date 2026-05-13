import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: 'red' | 'green' | 'orange' | 'none';
  onClick?: () => void;
}

export function Card({ children, className = '', glow = 'none', onClick }: CardProps) {
  const glowClass =
    glow === 'red' ? 'glow-red' : glow === 'green' ? 'glow-green' : glow === 'orange' ? 'glow-orange' : '';

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border p-4 ${glowClass} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
