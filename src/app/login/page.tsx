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
        }, 550);
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
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-sm sm:max-w-md bg-[#0B0F14]/95 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 transform-gpu will-change-transform will-change-opacity overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {isAuthorized ? (
          /* Authorization Success HUD */
          <motion.div
            key="authorized-hud"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="py-6 text-center space-y-5 transform-gpu"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(52,211,153,0.2)]">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
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

            {/* Launch Progress Track (Compositor-Only ScaleX Transform for 60/120 FPS) */}
            <div className="w-full h-1.5 bg-[#18181B] rounded-full overflow-hidden relative">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-500 rounded-full origin-left transform-gpu"
              />
            </div>
          </motion.div>
        ) : (
          /* Normal Login Form */
          <motion.div
            key="login-form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="space-y-6 transform-gpu"
          >
            {/* Brand Header with Mission Control Beacon */}
            <div className="text-center space-y-3">
              <div className="relative flex items-center justify-center mx-auto mb-1">
                {/* Central Beacon Box */}
                <div className="w-12 h-12 rounded-xl bg-[#10151C] border border-cyan-400/40 text-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                  <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-base sm:text-lg font-bold font-mono tracking-wider text-[#FAFAFA] uppercase">
                  Erdavid Work OS
                </h1>
                <div className="text-[10px] font-mono uppercase text-cyan-400 tracking-[0.16em] flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>MISSION CONTROL GATEWAY</span>
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
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
                    autoComplete="username"
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
                    autoComplete="current-password"
                    className="w-full bg-[#10151C] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#FAFAFA] placeholder-[#52525B] outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!username.trim() || !password.trim() || isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#05070A] font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(56,189,248,0.25)] disabled:opacity-40 disabled:cursor-not-allowed mt-2 cursor-pointer active:scale-[0.98]"
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
      {/* Zero-Overhead Hardware Accelerated Radial Glow (Replaces Heavy Multi-Pass Blur) */}
      <div
        className="fixed inset-0 pointer-events-none transform-gpu"
        style={{
          background: `
            radial-gradient(circle 320px at 25% 30%, rgba(56, 189, 248, 0.08), transparent 70%),
            radial-gradient(circle 320px at 75% 70%, rgba(139, 92, 246, 0.08), transparent 70%)
          `,
        }}
      />

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
