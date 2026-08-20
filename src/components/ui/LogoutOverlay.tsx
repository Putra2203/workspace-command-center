'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Radio } from 'lucide-react';

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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-[#05070A]/95 bg-technical-grid flex flex-col items-center justify-center p-6 text-center select-none transform-gpu will-change-opacity"
        >
          {/* Zero-Overhead Hardware-Accelerated Radial Ambient Lights */}
          <div
            className="absolute inset-0 pointer-events-none transform-gpu"
            style={{
              background: `
                radial-gradient(circle 300px at 35% 35%, rgba(244, 63, 94, 0.08), transparent 70%),
                radial-gradient(circle 300px at 65% 65%, rgba(56, 189, 248, 0.08), transparent 70%)
              `,
            }}
          />

          {/* Central Termination Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm bg-[#0B0F14] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-5 transform-gpu will-change-transform will-change-opacity"
          >
            {/* Beacon */}
            <div className="relative flex items-center justify-center mx-auto">
              <div className="w-12 h-12 rounded-xl bg-[#10151C] border border-rose-400/40 text-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
            </div>

            {/* Termination Sequence Details */}
            <div className="space-y-1.5 font-mono">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#FAFAFA]">
                Session Termination
              </h2>
              <div className="text-[10px] uppercase text-rose-400 tracking-[0.16em] flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
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
              <div className="flex items-center justify-between text-rose-400 font-semibold">
                <span>● DISPATCHING TO GATEWAY...</span>
                <span className="animate-pulse">REDIRECTING</span>
              </div>
            </div>

            {/* Progress Track (GPU Transform Only) */}
            <div className="w-full h-1 bg-[#18181B] rounded-full overflow-hidden relative">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full bg-gradient-to-r from-rose-500 to-cyan-400 rounded-full origin-left transform-gpu"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
