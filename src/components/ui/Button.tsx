import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const base = 'font-medium rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-red text-white glow-red hover:brightness-110',
    secondary: 'bg-surface-2 text-text border border-border hover:bg-surface-3',
    danger: 'bg-red/10 text-red border border-red/30 hover:bg-red/20',
    ghost: 'bg-transparent text-text-2 hover:bg-surface-2',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
