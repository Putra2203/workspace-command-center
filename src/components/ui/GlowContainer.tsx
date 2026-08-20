import React from 'react';

export type GlowVariant = 'system' | 'ai' | 'critical' | 'success' | 'surface';

interface GlowContainerProps {
  children: React.ReactNode;
  variant?: GlowVariant;
  className?: string;
  onClick?: () => void;
}

const GLOW_STYLES: Record<GlowVariant, string> = {
  system: 'bg-[#0B0F14] border-white/[0.08] hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(56,189,248,0.06)]',
  ai: 'bg-violet-950/[0.08] border-violet-500/25 hover:border-violet-400/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]',
  critical: 'bg-[#0B0F14] border-rose-500/30 hover:border-rose-400/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.08)]',
  success: 'bg-[#0B0F14] border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-[0_0_25px_rgba(52,211,153,0.08)]',
  surface: 'bg-[#0B0F14] border-white/[0.06] hover:border-white/[0.12]',
};

export function GlowContainer({
  children,
  variant = 'surface',
  className = '',
  onClick,
}: GlowContainerProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border transition-all duration-200 ${GLOW_STYLES[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
