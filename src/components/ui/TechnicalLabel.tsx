import React from 'react';

interface TechnicalLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function TechnicalLabel({ children, className = '' }: TechnicalLabelProps) {
  return (
    <span
      className={`text-[10px] uppercase font-mono tracking-[0.16em] font-medium text-[#71717A] select-none ${className}`}
    >
      {children}
    </span>
  );
}
