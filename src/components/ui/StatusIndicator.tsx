import React from 'react';

export type SystemStatusType = 'online' | 'processing' | 'warning' | 'critical' | 'offline';

interface StatusIndicatorProps {
  status: SystemStatusType;
  label?: string;
  className?: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<
  SystemStatusType,
  { color: string; border: string; bg: string; text: string; dot: string }
> = {
  online: {
    color: '#34D399',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  processing: {
    color: '#38BDF8',
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
  },
  warning: {
    color: '#FBBF24',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  critical: {
    color: '#F43F5E',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  offline: {
    color: '#71717A',
    border: 'border-zinc-500/20',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    dot: 'bg-zinc-500',
  },
};

export function StatusIndicator({
  status = 'online',
  label,
  className = '',
  pulse = true,
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.online;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold whitespace-nowrap ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${
          pulse && status !== 'offline' ? 'animate-pulse' : ''
        }`}
      />
      {label && <span>{label}</span>}
    </div>
  );
}
