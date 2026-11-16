import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { loadPublicOrgsDirectoryFromDb } from '../lib/gsCloudSync';
import {
  ShieldCheck,
  Building2,
  KeyRound,
  Lock,
  Users,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface OrgOption {
  id: string;
  name: string;
  industry: string | null;
  portal_access_code?: string | null;
}

export default function Login() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<'consultant' | 'client'>('consultant');
  const [clientAuthMethod, setClientAuthMethod] = useState<'credentials' | 'code'>('code');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<OrgOption[]>([
    {
      id: '532a0405-02c2-4e45-8f77-c24bf13ea9de',
      name: 'EJEMPLO SAS',
      industry: 'Desarrollo e Ingeniería',
      portal_access_code: 'GS-DEMO-2026',
    },
  ]);
  const [selectedOrgId, setSelectedOrgId] = useState('532a0405-02c2-4e45-8f77-c24bf13ea9de');
  const [accessCode, setAccessCode] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, industry, portal_access_code')
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setOrgs(data);
        const ejemplo = data.find((o) => o.name.toUpperCase().includes('EJEMPLO'));
        if (ejemplo) setSelectedOrgId(ejemplo.id);
        return;
      }

      const directory = await loadPublicOrgsDirectoryFromDb();
      if (directory.length > 0) {
        setOrgs(directory);
        const ejemplo = directory.find((o) => o.name.toUpperCase().includes('EJEMPLO'));
        if (ejemplo) setSelectedOrgId(ejemplo.id);
      }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (loginMode === 'client' && clientAuthMethod === 'code') {
      const targetOrg = orgs.find((o) => o.id === selectedOrgId);
      const expectedCode = (targetOrg?.portal_access_code || 'GS-DEMO-2026').trim().toUpperCase();
      const entered = accessCode.trim().toUpperCase();

      if (!entered || entered !== expectedCode) {
        setError('Código corporativo inválido para la organización seleccionada.');
        setLoading(false);
        return;
      }

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
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifique su correo y contraseña.'
          : signInError.message
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#F8FAFC]">
      {/* Left Showcase Panel (Nordic Petrol & Emerald Architecture) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative overflow-hidden bg-gradient-to-br from-[#0F2438] via-[#17324D] to-[#134E4A] text-white p-12 xl:p-16 flex-col justify-between">
        {/* Ambient Decorative Glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#0D9488]/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-12 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-sm">
            <Layers className="h-5 w-5 text-[#2DD4BF]" />
          </div>
          <div>
            <span className="font-display text-base font-bold tracking-tight block">
              Estudio GS · <span className="text-[#2DD4BF]">Grow Labs</span>
            </span>
            <span className="text-[11px] text-slate-300 tracking-wide">
              Corporate Strategy & AI Governance Suite
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-[#5EEAD4]">
              <Sparkles className="w-3.5 h-3.5" /> Arquitectura Dual Multi-Tenant v3.0
            </span>
            <h1 className="font-display text-4xl xl:text-[42px] font-bold leading-[1.15] tracking-tight text-white">
              Profesionalización empresarial con precisión matemática e IA auditada.
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
              Un entorno unificado donde el equipo consultor lidera el Diagnóstico 360° y el Master Plan, mientras cada Directorio cliente gestiona sus avances con privacidad absoluta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/7 backdrop-blur-md border border-white/12 space-y-1.5">
              <div className="flex items-center gap-2 text-[#5EEAD4] text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Entregables Oficiales
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Exportación directa de Master Plan en Excel de 6 hojas con fórmulas vivas y documentos Word nativos.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/7 backdrop-blur-md border border-white/12 space-y-1.5">
              <div className="flex items-center gap-2 text-[#5EEAD4] text-xs font-semibold">
                <Database className="w-4 h-4" /> Persistencia en Vivo
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Sincronización continua en PostgreSQL con aislamiento estricto por empresa y Semáforo de Calidad.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>Grow Labs · Ingeniería de Software & IA</span>
          <span>Estética Nórdica Ejecutiva · Seguridad RLS</span>
        </div>
      </div>

      {/* Right Minimalist Figma Studio Login */}
      <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-[0_20px_50px_-15px_rgba(23,50,77,0.08)] space-y-7">
          {/* Mobile Header */}
          <div className="space-y-1.5 text-center lg:text-left">
            <div className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#17324D] to-[#0D9488] text-white mb-2">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#17324D]">
              Bienvenido a Estudio GS
            </h2>
            <p className="text-xs text-slate-500">
              Seleccione su perfil de acceso para ingresar a su espacio de trabajo.
            </p>
          </div>

          {/* Apple/Linear Segmented Control */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => {
                setLoginMode('consultant');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                loginMode === 'consultant'
                  ? 'bg-white text-[#17324D] shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck
                className={`h-4 w-4 ${loginMode === 'consultant' ? 'text-[#0D9488]' : 'text-slate-400'}`}
              />
              Consultor GS
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('client');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                loginMode === 'client'
                  ? 'bg-white text-[#0F766E] shadow-xs border border-teal-200/70'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2
                className={`h-4 w-4 ${loginMode === 'client' ? 'text-[#0D9488]' : 'text-slate-400'}`}
              />
              Portal Clientes
            </button>
          </div>

          {/* Contextual Info Pill */}
          <div
            className={`rounded-2xl p-3.5 border text-xs leading-relaxed ${
              loginMode === 'consultant'
                ? 'bg-[#EDF3F8]/70 border-slate-200 text-slate-700'
                : 'bg-[#F0FDFA] border-teal-200/80 text-slate-700'
            }`}
          >
            {loginMode === 'consultant' ? (
              <div className="flex items-start gap-2.5">
                <Users className="h-4 w-4 text-[#17324D] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#17324D]">Back-Office de Consultoría</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gestión integral de cartera (Etapas 0 a 4), sesiones con IA y control de publicación.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-[#0D9488] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#0F766E]">Portal Ejecutivo Aislado</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Acceso exclusivo de Directorio para consultar indicadores aprobados y autogestionar avances.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Client Auth Sub-selector */}
          {loginMode === 'client' && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setClientAuthMethod('code');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl border font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  clientAuthMethod === 'code'
                    ? 'bg-[#17324D] text-white border-[#17324D]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Código de Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientAuthMethod('credentials');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl border font-medium transition-all cursor-pointer ${
                  clientAuthMethod === 'credentials'
                    ? 'bg-[#17324D] text-white border-[#17324D]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Correo Corporativo
              </button>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            {loginMode === 'client' && clientAuthMethod === 'code' ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Organización Cliente
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.industry ? `— ${o.industry}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Código Corporativo de Acceso
                  </label>
                  <input
                    type="password"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Ej: GS-DEMO-2026"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-mono font-semibold uppercase tracking-widest text-slate-900 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Solicite su clave privada a su consultor líder (Demo: <code className="font-mono text-slate-600">GS-DEMO-2026</code>).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      loginMode === 'consultant' ? 'consultor@estudiogs.com' : 'directorio@empresa.com'
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                loginMode === 'consultant' ? 'btn-nordic-primary' : 'btn-nordic-teal'
              }`}
            >
              {loading
                ? 'Verificando acceso...'
                : loginMode === 'consultant'
                  ? 'Ingresar al Back-Office GS'
                  : 'Acceder a Mi Portal Ejecutivo'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
