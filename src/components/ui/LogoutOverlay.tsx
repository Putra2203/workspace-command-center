'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Radio, ShieldAlert } from 'lucide-react';

interface LogoutOverlayProps {
  isVisible: boolean;
}

export function LogoutOverlay({ isVisible }: LogoutOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] bg-[#05070A]/95 bg-technical-grid backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none"
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

          {/* Central Termination Card */}
          <motion.div
            initial={{ scale: 0.9, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#0B0F14] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-5"
          >
            {/* Pulsing Beacon */}
            <div className="relative flex items-center justify-center mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-xl border border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.2)]"
              />
              <div className="absolute w-11 h-11 rounded-lg bg-[#10151C] border border-rose-400/40 text-rose-400 flex items-center justify-center shadow-inner">
                <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
            </div>

            {/* Termination Sequence Details */}
            <div className="space-y-1.5 font-mono">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#FAFAFA]">
                Session Termination
              </h2>
              <div className="text-[10px] uppercase text-rose-400 tracking-[0.16em] flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                <span>DISCONNECTING OPERATOR</span>
              </div>
            </div>

            {/* Sequence Status Box */}
            <div className="p-3 rounded-xl bg-[#10151C] border border-white/[0.06] text-left space-y-1.5 font-mono text-[10px] text-[#A1A1AA]">
              <div className="flex items-center justify-between text-emerald-400">
                <span>● PURGING AUTH TOKENS</span>
                <span>CLEARED</span>
              </div>
              <div className="flex items-center justify-between text-cyan-400">
                <span>● CLOSING WORKSPACE SYNC</span>
                <span>SYNCED</span>
              </div>
              <div className="flex items-center justify-between text-rose-400 font-semibold animate-pulse">
                <span>● DISPATCHING TO GATEWAY...</span>
                <span>REDIRECTING</span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="w-full h-1 bg-[#18181B] rounded-full overflow-hidden relative">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full h-full bg-gradient-to-r from-transparent via-rose-500 to-cyan-400 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
