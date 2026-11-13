import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Activity, ShieldCheck, Building2, KeyRound, Lock, Users, ArrowRight } from 'lucide-react';

interface OrgOption {
  id: string;
  name: string;
  industry: string | null;
  portal_access_code?: string | null;
}

export default function Login() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<'consultant' | 'client'>('consultant');
  const [clientAuthMethod, setClientAuthMethod] = useState<'credentials' | 'code'>('credentials');

  // Email + Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direct Portal Access Code state for Clients
  const [orgs, setOrgs] = useState<OrgOption[]>([
    { id: '532a0405-02c2-4e45-8f77-c24bf13ea9de', name: 'EJEMPLO SAS', industry: 'Desarrollo e Ingeniería', portal_access_code: 'GS-DEMO-2026' }
  ]);
  const [selectedOrgId, setSelectedOrgId] = useState('532a0405-02c2-4e45-8f77-c24bf13ea9de');
  const [accessCode, setAccessCode] = useState('');

  useEffect(() => {
    supabase
      .from('organizations')
      .select('id, name, industry, portal_access_code')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOrgs(data);
          const ejemplo = data.find(o => o.name.toUpperCase().includes('EJEMPLO'));
          if (ejemplo) setSelectedOrgId(ejemplo.id);
        }
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (loginMode === 'client' && clientAuthMethod === 'code') {
      const targetOrg = orgs.find(o => o.id === selectedOrgId);
      const expectedCode = (targetOrg?.portal_access_code || 'GS-DEMO-2026').trim().toUpperCase();
      const entered = accessCode.trim().toUpperCase();

      if (!entered || entered !== expectedCode) {
        setError('Código de acceso corporativo inválido para la empresa seleccionada.');
        setLoading(false);
        return;
      }

      // Isolate session strictly to this single client organization
      sessionStorage.clear();
      sessionStorage.setItem(`gs_portal_verified_${selectedOrgId}`, 'true');
      sessionStorage.setItem('gs_active_client_org', selectedOrgId);
      setLoading(false);
      navigate(`/portal/${selectedOrgId}`);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Verifique su correo y contraseña.'
        : signInError.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 sm:p-10 shadow-obsidian border-2 border-zinc-900">
        {/* Header Institucional */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-crimson border-2 border-red-600">
            <Activity className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="mt-4 text-3xl font-black font-display uppercase tracking-wide text-zinc-950">
            Estudio GS <span className="text-red-600">Consultora</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            Plataforma de Diagnóstico 360°, Gobernanza y Tutoría Estratégica
          </p>
        </div>

        {/* Selector de Perfil de Usuario (2 Roles: Equipo Consultor GS vs Clientes) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-100 rounded-xl border border-zinc-200">
          <button
            type="button"
            onClick={() => {
              setLoginMode('consultant');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              loginMode === 'consultant'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ShieldCheck className={`h-4 w-4 ${loginMode === 'consultant' ? 'text-red-500' : 'text-zinc-400'}`} />
            Equipo Consultor GS
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('client');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              loginMode === 'client'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Building2 className={`h-4 w-4 ${loginMode === 'client' ? 'text-white' : 'text-zinc-400'}`} />
            Portal de Clientes
          </button>
        </div>

        {/* Explicación contextual de aislamiento según el rol */}
        <div className={`rounded-xl p-3.5 border text-xs ${
          loginMode === 'consultant'
            ? 'bg-zinc-50 border-zinc-200 text-zinc-700'
            : 'bg-red-50/60 border-red-200 text-zinc-800'
        }`}>
          {loginMode === 'consultant' ? (
            <div className="flex items-start gap-2.5">
              <Users className="h-4 w-4 text-zinc-900 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-900">Back-Office de Consultores GS</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Gestión multicartera de clientes, grabación de sesiones en vivo, checkout IA y control de calidad (Semáforo Rojo/Verde) para aprobar qué visualiza cada cliente.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Entorno Privado y Aislado por Cliente</p>
                <p className="text-[11px] text-red-800/80 mt-0.5">
                  Acceso exclusivo para Directorio y Socios. Cada empresa visualiza únicamente su propia información y los entregables aprobados por el equipo de Consultora GS.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sub-selector para Clientes: Usuario/Contraseña vs Código de Acceso */}
        {loginMode === 'client' && (
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => { setClientAuthMethod('credentials'); setError(null); }}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                clientAuthMethod === 'credentials'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              Ingresar con Correo Corporativo
            </button>
            <button
              type="button"
              onClick={() => { setClientAuthMethod('code'); setError(null); }}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                clientAuthMethod === 'code'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Ingresar con Código de Portal
            </button>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          {loginMode === 'client' && clientAuthMethod === 'code' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                  Organización / Empresa Cliente
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="block w-full rounded-xl border-2 border-zinc-300 py-2.5 px-3.5 text-zinc-900 focus:border-red-600 focus:ring-red-600 sm:text-sm font-bold bg-white"
                >
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} — {org.industry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                  Código Privado de Acceso GS
                </label>
                <input
                  type="password"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Ej: GS-DEMO-2026"
                  className="block w-full rounded-xl border-2 border-zinc-300 py-2.5 px-3.5 text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:ring-red-600 sm:text-sm font-mono font-bold tracking-widest uppercase"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-700 mb-1" htmlFor="email-address">
                  Correo Electrónico {loginMode === 'consultant' ? 'Consultor GS' : 'Corporativo Cliente'}
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-xl border-2 border-zinc-300 py-2.5 px-3.5 text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:ring-red-600 sm:text-sm font-medium"
                  placeholder={loginMode === 'consultant' ? 'admin@gs.com' : 'cliente@ejemplosas.com'}
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
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-bold">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold font-display uppercase tracking-wider text-white shadow-crimson disabled:opacity-70 transition-all hover:scale-[1.01] border ${
                loginMode === 'consultant'
                  ? 'bg-zinc-900 hover:bg-black border-zinc-800'
                  : 'bg-red-600 hover:bg-red-700 border-red-500'
              }`}
            >
              {loading
                ? 'Verificando credenciales...'
                : loginMode === 'consultant'
                ? 'Ingresar al Back-Office Consultor GS'
                : 'Ingresar al Portal Ejecutivo del Cliente'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Botones de Demostración Rápida para ambos roles */}
          <div className="pt-4 border-t-2 border-zinc-100 flex flex-col gap-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider text-center">
              Accesos Rápidos de Demostración (Q/A):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('consultant');
                  setEmail('admin@gs.com');
                  setPassword('admin123456');
                  setError(null);
                }}
                className="text-[11px] font-bold font-display uppercase tracking-wider text-zinc-900 hover:text-red-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-2.5 rounded-xl border border-zinc-300 transition-colors text-center"
              >
                1. Consultor GS (admin@gs.com)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('client');
                  setClientAuthMethod('credentials');
                  setEmail('cliente@ejemplosas.com');
                  setPassword('cliente123456');
                  setError(null);
                }}
                className="text-[11px] font-bold font-display uppercase tracking-wider text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-3 py-2.5 rounded-xl border border-red-200 transition-colors text-center"
              >
                2. Cliente (EJEMPLO SAS)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
