'use client';

import { motion } from 'motion/react';
import { Sparkles, TerminalSquare } from 'lucide-react';

interface CoolLoadingScreenProps {
  message?: string;
  submessage?: string;
}

export function CoolLoadingScreen({
  message = 'Connecting to Plane Command Center...',
  submessage = 'Synchronizing real-time project metrics & AI insights'
}: CoolLoadingScreenProps) {
  return (
    <div className="h-screen w-screen fixed inset-0 z-50 bg-[#09090B] flex flex-col items-center justify-center overflow-hidden selection:bg-blue-500/30">
      {/* Background Radial Glow Effects */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Main Animated Container */}
      <div className="relative flex flex-col items-center gap-8 z-10 p-6 text-center max-w-sm sm:max-w-md">
        {/* Futuristic Glowing Logo Box */}
        <div className="relative flex items-center justify-center">
          {/* Infinite Rotating Gradient Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 p-[2px] opacity-75 shadow-lg shadow-blue-500/20"
          >
            <div className="w-full h-full bg-[#09090B] rounded-[22px]" />
          </motion.div>

          {/* Pulsing Aura Ring */}
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
            className="absolute w-28 h-28 rounded-3xl border border-blue-400/30"
          />

          {/* Center Brand Icon */}
          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner backdrop-blur-sm"
          >
            <Sparkles className="w-7 h-7 text-blue-400" />
          </motion.div>
        </div>

        {/* Text Container with Framer Fade & Slide */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-base sm:text-lg text-[#FAFAFA] tracking-tight">
              Plane AI
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              Command Center
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#A1A1AA] font-medium leading-relaxed">
            {message}
          </p>

          {submessage && (
            <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
              {submessage}
            </p>
          )}
        </motion.div>

        {/* Animated Progress Bar */}
        <div className="w-48 sm:w-56 h-1.5 bg-[#18181B] border border-white/10 rounded-full overflow-hidden relative">
          <motion.div
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-indigo-500 rounded-full"
          />
        </div>

        {/* Animated Pulse Dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="w-1.5 h-1.5 rounded-full bg-blue-500"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
