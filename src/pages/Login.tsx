import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 sm:p-10 shadow-obsidian border-2 border-zinc-900">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-crimson border-2 border-red-600">
            <Activity className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="mt-5 text-3xl font-black font-display uppercase tracking-wide text-zinc-950">
            Estudio GS <span className="text-red-600">Consultora</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Plataforma de Diagnóstico y Tutoría Estratégica
          </p>
        </div>
        <form className="mt-6 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-700 mb-1" htmlFor="email-address">
                Correo Electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="block w-full rounded-xl border-2 border-zinc-300 py-2.5 px-3.5 text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:ring-red-600 sm:text-sm font-medium"
                placeholder="consultor@gs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-700 mb-1" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full rounded-xl border-2 border-zinc-300 py-2.5 px-3.5 text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:ring-red-600 sm:text-sm font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full justify-center rounded-xl bg-red-600 hover:bg-red-700 py-3 text-xs font-bold font-display uppercase tracking-wider text-white shadow-crimson disabled:opacity-70 transition-all hover:scale-[1.02] border border-red-500"
            >
              {loading ? 'Iniciando sesión...' : 'Ingresar al Portal'}
            </button>
          </div>

          <div className="pt-4 border-t-2 border-zinc-100 flex flex-col items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
              Acceso Rápido de Demostración:
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@gs.com');
                setPassword('admin123456');
              }}
              className="text-xs font-bold font-display uppercase tracking-wider text-zinc-900 hover:text-red-600 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-xl border border-zinc-300 transition-colors w-full text-center"
            >
              Cargar Credenciales (admin@gs.com)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
