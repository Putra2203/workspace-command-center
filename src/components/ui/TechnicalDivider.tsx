import React from 'react';

interface TechnicalDividerProps {
  label?: string;
  className?: string;
}

export function TechnicalDivider({ label, className = '' }: TechnicalDividerProps) {
  if (!label) {
    return <hr className={`border-t border-white/[0.06] my-3 ${className}`} />;
  }

  return (
    <div className={`flex items-center gap-2 my-3 text-[10px] uppercase font-mono tracking-[0.18em] text-[#52525B] select-none ${className}`}>
      <span className="h-px bg-white/[0.06] flex-1" />
      <span>{label}</span>
      <span className="h-px bg-white/[0.06] flex-1" />
    </div>
  );
}
