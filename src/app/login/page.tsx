'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Radio, Lock, User, ArrowRight, Loader2, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/day';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthorized(true);
        setTimeout(() => {
          router.push(redirectTarget);
          router.refresh();
        }, 900);
      } else {
        setErrorMessage(data.error || 'Username atau password tidak valid');
      }
    } catch (err) {
      console.error('Login request failed:', err);
      setErrorMessage('Terjadi gangguan jaringan ke gateway autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="relative w-full max-w-sm sm:max-w-md bg-[#0B0F14]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {isAuthorized ? (
          /* Authorization Success HUD */
          <motion.div
            key="authorized-hud"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 text-center space-y-5"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(52,211,153,0.25)]">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-bounce" />
            </div>

            <div className="space-y-1 font-mono">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#FAFAFA]">
                Operator Authorized
              </h2>
              <div className="text-[10px] uppercase text-emerald-400 tracking-[0.16em]">
                ACCESS GRANTED · DISPATCHING TO CONSOLE
              </div>
            </div>

            {/* Terminal Boot Sequence */}
            <div className="p-3 rounded-xl bg-[#10151C] border border-white/[0.06] text-left space-y-1.5 font-mono text-[10px] text-[#A1A1AA]">
              <div className="flex items-center justify-between text-emerald-400">
                <span>● VERIFYING SECURITY TOKEN</span>
                <span>OK</span>
              </div>
              <div className="flex items-center justify-between text-cyan-400">
                <span>● MOUNTING WORKSPACE STATE</span>
                <span>READY</span>
              </div>
              <div className="flex items-center justify-between text-violet-400">
                <span>● INITIALIZING MISSION CONTROL</span>
                <span className="animate-pulse">LAUNCHING...</span>
              </div>
            </div>

            {/* Launch Progress Track */}
            <div className="w-full h-1.5 bg-[#18181B] rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-500 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.5)]"
              />
            </div>
          </motion.div>
        ) : (
          /* Normal Login Form */
          <motion.div
            key="login-form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Brand Header with Mission Control Beacon */}
            <div className="text-center space-y-3">
              <div className="relative flex items-center justify-center mx-auto mb-1">
                {/* Subtle Outer Cyan Orbit */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="w-16 h-16 rounded-xl border border-cyan-500/20 shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                />

                {/* Central Beacon Box */}
                <div className="absolute w-11 h-11 rounded-lg bg-[#10151C] border border-cyan-400/40 text-cyan-400 flex items-center justify-center shadow-inner">
                  <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-base sm:text-lg font-bold font-mono tracking-wider text-[#FAFAFA] uppercase">
                  Erdavid Work OS
                </h1>
                <div className="text-[10px] font-mono uppercase text-cyan-400 tracking-[0.16em] flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>MISSION CONTROL GATEWAY</span>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-400 font-mono"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{errorMessage}</div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase font-mono tracking-wider block">
                  Operator Identifier
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#71717A] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username..."
                    required
                    className="w-full bg-[#10151C] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#FAFAFA] placeholder-[#52525B] outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase font-mono tracking-wider block">
                  Security Passkey
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#71717A] absolute left-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password..."
                    required
                    className="w-full bg-[#10151C] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#FAFAFA] placeholder-[#52525B] outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!username.trim() || !password.trim() || isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#05070A] font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(56,189,248,0.25)] disabled:opacity-40 disabled:cursor-not-allowed mt-2 cursor-pointer active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING OPERATOR...</span>
                  </>
                ) : (
                  <>
                    <span>AUTHORIZE SESSION</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Security Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#52525B] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#52525B]" />
              <span>ACCESS CONTROL SECURITY · v1.0.0</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#05070A] bg-technical-grid flex items-center justify-center p-4 selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Background Ambient Glowing Lights */}
      <div className="fixed top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-sm sm:max-w-md bg-[#0B0F14] border border-white/[0.08] rounded-2xl p-8 text-center text-xs font-mono text-[#71717A] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>MOUNTING GATEWAY...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
