import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-text-2 uppercase tracking-wider">{label}</label>}
      <input
        {...props}
        className={`w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-red/50 focus:ring-1 focus:ring-red/30 transition-all ${className}`}
      />
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className = '', ...props }: TextAreaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-text-2 uppercase tracking-wider">{label}</label>}
      <textarea
        {...props}
        className={`w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-red/50 focus:ring-1 focus:ring-red/30 transition-all resize-none ${className}`}
      />
    </div>
  );
}
