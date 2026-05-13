import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export function PageContainer({ children, title, subtitle, rightAction }: PageContainerProps) {
  return (
    <div className="px-4 pt-2 pb-24 lg:pb-8 animate-fade-in">
      {(title || rightAction) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h1 className="text-xl font-bold text-text">{title}</h1>}
            {subtitle && <p className="text-xs text-text-2 mt-0.5">{subtitle}</p>}
          </div>
          {rightAction}
        </div>
      )}
      {children}
    </div>
  );
}
