'use client';

import { motion } from 'motion/react';
import { Radio } from 'lucide-react';

interface CoolLoadingScreenProps {
  message?: string;
  submessage?: string;
}

export function CoolLoadingScreen({
  message = 'SYSTEM INITIALIZING...',
  submessage = 'Synchronizing real-time project telemetry & mission context',
}: CoolLoadingScreenProps) {
  return (
    <div className="h-screen w-screen fixed inset-0 z-50 bg-[#05070A] bg-technical-grid flex flex-col items-center justify-center overflow-hidden selection:bg-cyan-500/30">
      {/* Background Radial Glow Effects */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.18, 0.1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Main Animated Container */}
      <div className="relative flex flex-col items-center gap-6 z-10 p-6 text-center max-w-sm sm:max-w-md">
        {/* Mission Control Glowing Beacon */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-24 h-24 rounded-2xl border border-cyan-500/20 shadow-[0_0_25px_rgba(56,189,248,0.15)]"
          />

          <motion.div
            animate={{
              scale: [0.85, 1.15, 0.85],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-28 h-28 rounded-2xl border border-violet-400/25"
          />

          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-14 h-14 rounded-xl bg-[#0B0F14] border border-cyan-400/40 text-cyan-400 flex items-center justify-center shadow-inner"
          >
            <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
          </motion.div>
        </div>

        {/* Text Container */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-extrabold text-base sm:text-lg text-[#FAFAFA] font-mono tracking-wider uppercase">
              Erdavid Work OS
            </span>
          </div>

          <div className="text-[10px] font-mono uppercase text-cyan-400 tracking-[0.16em]">
            {message}
          </div>

          {submessage && (
            <p className="text-[11px] text-[#71717A] max-w-xs mx-auto font-mono">
              {submessage}
            </p>
          )}
        </motion.div>

        {/* Animated Progress Track */}
        <div className="w-48 sm:w-56 h-1 bg-[#10151C] border border-white/[0.08] rounded-full overflow-hidden relative">
          <motion.div
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-violet-500 rounded-full"
          />
        </div>

        {/* Animated Pulse Dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
