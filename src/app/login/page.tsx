'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/day';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        router.push(redirectTarget);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Username atau password salah');
      }
    } catch (err) {
      console.error('Login request failed:', err);
      setErrorMessage('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm sm:max-w-md bg-[#111113] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30 shadow-inner">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#FAFAFA] tracking-tight">Plane AI</h1>
        <p className="text-xs text-[#71717A]">Masuk ke Command Center</p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider block">
            Username
          </label>
          <div className="relative flex items-center">
            <User className="w-4 h-4 text-[#71717A] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username..."
              required
              className="w-full bg-[#18181B] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider block">
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-[#71717A] absolute left-3 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password..."
              required
              className="w-full bg-[#18181B] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#FAFAFA] placeholder-[#71717A] outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!username.trim() || !password.trim() || isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memvalidasi...</span>
            </>
          ) : (
            <>
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer info */}
      <div className="text-center text-[10px] text-[#52525B]">
        Akses terbatas · Plane Command Center Security
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center p-4 selection:bg-blue-500/30">
      {/* Subtle Background Glow Effect */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-sm sm:max-w-md bg-[#111113] border border-white/10 rounded-2xl p-8 text-center text-xs text-[#71717A] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Memuat halaman login...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
