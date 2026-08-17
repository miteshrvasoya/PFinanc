import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ArrowRight, UserCheck, Lock, Mail, User, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, register, switchDemoUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const success = await register(email, password, name);
        if (!success) setError('Registration failed. Please check your credentials.');
      } else {
        const success = await login(email, password);
        if (!success) setError('Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'Mitesh Vasoya', email: 'mitesh@pfinanc.local', role: 'Household Owner', color: 'border-indigo-500/40 bg-indigo-500/10' },
    { name: 'Father Vasoya', email: 'father@pfinanc.local', role: 'Household Admin', color: 'border-sky-500/40 bg-sky-500/10' },
    { name: 'Mother Vasoya', email: 'mother@pfinanc.local', role: 'Household Member', color: 'border-emerald-500/40 bg-emerald-500/10' },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">PFinanc</h1>
          <p className="text-sm text-slate-400">Self-Hosted Personal & Family Finance Ledger</p>
        </div>

        {/* Fast 1-Click Demo Login Personas */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Fast 1-Click Family Personas</span>
          </div>

          <div className="space-y-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => switchDemoUser(acc.email)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all hover:scale-[1.01] ${acc.color}`}
              >
                <div>
                  <p className="font-bold text-white text-xs">{acc.name}</p>
                  <p className="text-[10px] text-slate-400">{acc.role} • {acc.email}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-indigo-300 font-semibold">
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Regular Login / Register Form */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-white text-sm">
              {isRegister ? 'Create a Family Account' : 'Sign in with Credentials'}
            </h2>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              {isRegister ? 'Already have an account?' : 'Register new user'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {isRegister && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Mitesh Vasoya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="mitesh@pfinanc.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/25 transition-all text-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Register & Setup Household' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
