'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Radio, Terminal, Cpu, Database, Cloud } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
  submessage?: string;
}

const BOOT_STEPS = [
  { id: 1, label: 'CONNECTING PLANE API', icon: Cloud },
  { id: 2, label: 'CONNECTING DATABASE', icon: Database },
  { id: 3, label: 'INITIALIZING AI ENGINE', icon: Cpu },
  { id: 4, label: 'MOUNTING WORKSPACE', icon: Terminal },
];

export function SplashScreen({
  message = 'SYSTEM INITIALIZING...',
  submessage = 'Synchronizing real-time project telemetry & mission context',
}: SplashScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(2), 250);
    const timer2 = setTimeout(() => setCurrentStep(3), 550);
    const timer3 = setTimeout(() => setCurrentStep(4), 850);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <motion.div
      key="unified-splash-screen"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.02,
        filter: 'blur(10px)',
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      }}
      className="fixed inset-0 z-[100] bg-[#05070A] bg-technical-grid flex flex-col items-center justify-center overflow-hidden selection:bg-cyan-500/30"
    >
      {/* Background Ambient Glowing Lights (Cyan top-left, Purple bottom-right) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Center Console Container */}
      <div className="relative flex flex-col items-center gap-6 z-10 p-6 text-center max-w-sm w-full">
        {/* Logo / Beacon Icon with Spring Scale & Rings */}
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Cyan Orbit */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-24 h-24 rounded-2xl border border-cyan-500/20 shadow-[0_0_30px_rgba(56,189,248,0.15)]"
          />

          {/* Inner Violet Orbit */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute w-20 h-20 rounded-xl border border-violet-500/25"
          />

          {/* Central Logo Box */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
            className="absolute w-14 h-14 rounded-xl bg-[#0B0F14] border border-cyan-400/40 text-cyan-400 flex items-center justify-center shadow-inner shadow-cyan-500/20"
          >
            <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
          </motion.div>
        </div>

        {/* Brand Title & Technical Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="font-extrabold text-lg sm:text-xl text-[#FAFAFA] font-mono tracking-wider uppercase">
              Erdavid Work OS
            </span>
          </div>
          <div className="text-[10px] font-mono uppercase text-cyan-400 tracking-[0.18em] flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>MISSION CONTROL CENTER</span>
          </div>
        </motion.div>

        {/* Technical Boot Steps Status Console */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="w-full p-3 rounded-xl bg-[#0B0F14]/90 border border-white/[0.08] text-left space-y-2 font-mono text-[11px] shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 text-[9px] uppercase tracking-wider text-[#71717A]">
            <span>SYSTEM TELEMETRY</span>
            <span className="text-cyan-400">BOOT SEQUENCE</span>
          </div>

          <div className="space-y-1.5">
            {BOOT_STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex items-center justify-between transition-colors ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                      ? 'text-cyan-300 font-bold'
                      : 'text-[#52525B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">
                      {isDone ? '●' : isCurrent ? '●' : '○'}
                    </span>
                    <span className="text-[10px] tracking-wide">{step.label}</span>
                  </div>

                  <span className="text-[9px] uppercase">
                    {isDone ? 'READY' : isCurrent ? 'CONNECTING...' : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Shimmering Loading Progress Track */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="w-full h-1 bg-[#10151C] border border-white/[0.06] rounded-full overflow-hidden relative"
        >
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
        </motion.div>

        {/* Footer Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-[10px] text-[#52525B] font-mono tracking-wider"
        >
          <span>v1.0.0 · OPERATIONAL READINESS</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
