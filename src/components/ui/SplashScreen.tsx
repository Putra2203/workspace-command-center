'use client';

import { motion } from 'motion/react';
import { Sparkles, Command } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
  submessage?: string;
}

export function SplashScreen({
  message = 'Connecting to Plane Command Center...',
  submessage = 'Synchronizing real-time project metrics & AI insights'
}: SplashScreenProps) {
  return (
    <motion.div
      key="unified-splash-screen"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.04,
        filter: 'blur(8px)',
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[100] bg-[#09090B] flex flex-col items-center justify-center overflow-hidden selection:bg-blue-500/30"
    >
      {/* Background Ambient Glowing Lights */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          scale: [1.1, 0.9, 1.1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[130px] pointer-events-none"
      />

      {/* Splash Content Box */}
      <div className="relative flex flex-col items-center gap-6 z-10 p-6 text-center">
        {/* Logo Icon with Spring Scale & Rotation */}
        <div className="relative flex items-center justify-center">
          {/* Outer Infinite Rotating Border */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-400 p-[2px] opacity-80 shadow-2xl shadow-blue-500/30"
          >
            <div className="w-full h-full bg-[#09090B] rounded-[22px]" />
          </motion.div>

          {/* Pulsing Outer Ring */}
          <motion.div
            animate={{
              scale: [0.9, 1.2, 0.9],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-32 h-32 rounded-3xl border border-blue-400/30"
          />

          {/* Central Logo Box */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="absolute w-16 h-16 rounded-2xl bg-blue-600/25 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner backdrop-blur-md"
          >
            <Sparkles className="w-8 h-8 text-blue-400" />
          </motion.div>
        </div>

        {/* Brand Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-extrabold text-xl sm:text-2xl text-[#FAFAFA] tracking-tight">
              Plane AI
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold tracking-wider">
              Command Center
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] font-medium leading-relaxed max-w-xs sm:max-w-sm mx-auto">
            {message}
          </p>
          {submessage && (
            <p className="text-[11px] text-[#71717A] max-w-xs mx-auto">
              {submessage}
            </p>
          )}
        </motion.div>

        {/* Shimmering Loading Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="w-44 sm:w-52 h-1 bg-[#18181B] border border-white/10 rounded-full overflow-hidden relative mt-1"
        >
          <motion.div
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-indigo-500 rounded-full"
          />
        </motion.div>

        {/* Footer Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex items-center gap-1.5 text-[10px] text-[#52525B] font-mono mt-3"
        >
          <Command className="w-3 h-3 text-[#52525B]" />
          <span>v1.0 · Readying your workspace</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
