import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ClientPortalView } from '../components/views/ClientPortalView';
import { calculateDiagnosticScores, type FullDiagnosticResults } from '../lib/diagnosticEngine';
import { ArrowLeft, ShieldCheck, Lock, Activity } from 'lucide-react';

export default function ClientPortalPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [results, setResults] = useState<FullDiagnosticResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!id) return;
      setLoading(true);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (orgError || !org) {
        console.error('Error fetching portal client:', orgError);
        setLoading(false);
        return;
      }

      setClient(org);

      // Si no tiene código de acceso configurado, habilitar acceso directo
      if (!org.portal_access_code) {
        setIsAuthenticated(true);
      }

      // Fetch diagnostic responses
      const { data: diagResp } = await (supabase
        .from('diagnostic_responses') as any)
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const answers = diagResp?.answers || {};
      const calculated = calculateDiagnosticScores(answers);
      setResults(calculated);
      setLoading(false);
    };

    fetchPortalData();
  }, [id]);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const expected = client.portal_access_code || 'GS-DEMO-2026';
    if (accessCode.trim().toUpperCase() === expected.toUpperCase()) {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Código de acceso inválido. Verifique el código enviado por su consultor.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF2F6] flex flex-col items-center justify-center p-6 text-slate-500">
        <Activity className="w-8 h-8 text-[#6B1D2F] animate-spin mb-3" />
        <p className="text-sm font-medium">Cargando Portal de Gestión Estratégica...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#EEF2F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full space-y-4">
          <h2 className="text-xl font-bold text-slate-900 font-display">Portal no disponible</h2>
          <p className="text-xs text-slate-500">No se encontró la empresa solicitada o el enlace ha caducado.</p>
          <Link
            to="/clients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6B1D2F] text-white rounded-xl text-xs font-semibold hover:bg-[#541524] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Si requiere autenticación por código de acceso de la empresa
  if (!isAuthenticated && client.portal_access_code) {
    return (
      <div className="min-h-screen bg-[#EEF2F6] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-[#6B1D2F] text-white flex items-center justify-center font-bold">
              GS
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">{client.name}</h2>
              <span className="text-[11px] text-slate-400 font-medium">Portal de Gestión Estratégica</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#6B1D2F]" /> Ingrese su Código de Acceso
            </h3>
            <p className="text-xs text-slate-500">
              Introduzca la clave confidencial compartida por su consultor GS para ver sus diagnósticos e informes aprobados.
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Ej: GS-2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#6B1D2F] focus:ring-1 focus:ring-[#6B1D2F] text-sm uppercase tracking-wider font-mono"
                required
              />
              {errorMsg && <p className="text-xs text-[#6B1D2F] mt-1.5 font-medium">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Acceder al Portal
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Aislamiento de Datos
            </span>
            <Link to={`/clients/${client.id}`} className="hover:text-slate-600 font-medium">
              Acceso Consultor →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6] pb-16">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/clients/${client.id}`}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Volver a Modo Consultor"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] font-semibold text-[#6B1D2F] uppercase tracking-wider block">
              Portal Oficial de la Empresa
            </span>
            <h1 className="text-sm font-bold text-slate-900 font-display leading-tight">{client.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Datos Aprobados
          </span>
          <Link
            to={`/clients/${client.id}`}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Modo Consultor GS
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ClientPortalView
          client={client}
          results={results || ({} as any)}
          isDiagnosticApproved={true}
        />
      </div>
    </div>
  );
}
