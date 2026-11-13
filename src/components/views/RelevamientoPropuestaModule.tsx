import React, { useState, useEffect } from 'react';
import {
  Mic,
  FileText,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Sparkles,
  Save,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import type { Client } from '../../data/mockData';

export interface CommercialProposalState {
  projectCode: string; // e.g. '26-030'
  contactPerson: string;
  contactRole: string;
  employeesCount: string;
  declaredPains: string;
  initialAssessment: string;
  proposedScope: string;
  monthlyFee: string;
  currency: 'USD' | 'ARS';
  estimatedSessionsDiagnostic: string;
  proposalStatus: 'relevamiento_inicial' | 'propuesta_enviada' | 'aprobada_kickoff';
  updatedAt: string;
}

interface RelevamientoPropuestaModuleProps {
  client: Client;
  onStartRecording: () => void;
  onApproveAndGenerateKickoff: (projectCode: string) => void;
}

export const RelevamientoPropuestaModule: React.FC<RelevamientoPropuestaModuleProps> = ({
  client,
  onStartRecording,
  onApproveAndGenerateKickoff,
}) => {
  const storageKey = `gs_relevamiento_propuesta_${client.id}`;

  const [state, setState] = useState<CommercialProposalState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const isEjemplo = client.name?.toUpperCase().includes('EJEMPLO');
    return {
      projectCode: isEjemplo ? '26-030' : '26-031',
      contactPerson: 'Socios Fundadores / Directorio',
      contactRole: 'Titulares',
      employeesCount: isEjemplo ? '18 colaboradores (Meta 3 años: 36–44)' : 'En relevamiento',
      declaredPains: isEjemplo
        ? '1) Socios absorbidos >95% por la operación diaria sin tiempo estratégico.\n2) Ausencia de Estatuto de Convivencia formalizado pese a acuerdos verbales.\n3) Crecimiento reactivo sin cronograma maestro ni flujo de caja único proyectado.'
        : '',
      initialAssessment: isEjemplo
        ? 'Empresa con alto know-how técnico y reputación comercial en soluciones llave en mano, pero con techo de escalabilidad por informalidad en procesos, compras y gobernanza societaria. Candidata ideal para el Sistema Metodológico Integrado PyME 2.0.'
        : '',
      proposedScope:
        'Etapa 1: Kickoff y consenso de OMV a 3 años (Enfoque CVA).\nEtapa 2: Diagnóstico Integral 360° (10 Áreas · 78 Preguntas · KPIs · Matriz IME/IRE en 8 a 10 sesiones semanales).\nEtapa 3: Construcción y Tutoría del Master Plan Estratégico (5 Ejes + Pentágono del Orden con revisión trimestral).',
      monthlyFee: isEjemplo ? '1.800' : '',
      currency: 'USD',
      estimatedSessionsDiagnostic: '8 a 10 sesiones semanales (1h c/u)',
      proposalStatus: isEjemplo ? 'aprobada_kickoff' : 'relevamiento_inicial',
      updatedAt: new Date().toISOString(),
    };
  });

  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    localStorage.setItem(`gs_project_code_${client.id}`, state.projectCode || '00-000');
  }, [client.id, state.projectCode]);

  const handleSave = () => {
    const next = { ...state, updatedAt: new Date().toISOString() };
    setState(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    localStorage.setItem(`gs_project_code_${client.id}`, next.projectCode || '00-000');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleGenerateKickoff = () => {
    const next: CommercialProposalState = {
      ...state,
      proposalStatus: 'aprobada_kickoff',
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    localStorage.setItem(`gs_project_code_${client.id}`, next.projectCode || '00-000');
    onApproveAndGenerateKickoff(next.projectCode || '00-000');
  };

  return (
    <div className="space-y-6">
      {/* Banner Etapa 0 Comercial Interna */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
              Etapa 0 · Uso Interno Estudio GS (Oculto al Cliente)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
              Proyecto GS: {state.projectCode || '00-000'}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Relevamiento Comercial Inicial & Propuesta Económica — {client.name}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Primera entrevista para conocer la necesidad de la empresa, grabar la conversación exploratoria, elaborar la evaluación preliminar y emitir el presupuesto mensual. <strong>Una vez aprobado el presupuesto por el cliente, presione &ldquo;Generar Kickoff Oficial&rdquo;</strong> para habilitar la Etapa 1 (Kickoff & OMV) y el Diagnóstico de 78/100 preguntas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onStartRecording}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Mic className="w-4 h-4 text-red-400" />
            Grabar Entrevista Inicial
          </button>

          <button
            type="button"
            onClick={handleGenerateKickoff}
            className="px-5 py-2.5 rounded-xl bg-[#6B1D2F] hover:bg-[#531523] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Presupuesto Aprobado → Generar Kickoff
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nota Aclaratoria Audio Texto Plano */}
      <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>Nota sobre grabación de relevamiento:</strong> El sistema transcribe el audio en <strong>texto plano continuo (sin identificación automática de interlocutores / sin diarización)</strong>. Para obtener una síntesis preliminar y propuesta comercial precisa, se recomienda hablar de a una persona por vez y mencionar en voz alta cifras o nombres relevantes.
        </div>
      </div>

      {/* Formulario de Relevamiento y Presupuesto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos Comerciales y Código Documental GS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Building2 className="w-4 h-4 text-[#6B1D2F]" />
            Codificación & Presupuesto GS
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Código Proyecto GS (para .DOCX y .XLSX) *
              </label>
              <input
                type="text"
                value={state.projectCode}
                onChange={(e) => setState((s) => ({ ...s, projectCode: e.target.value }))}
                placeholder="Ej: 26-030"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Se usará en: {state.projectCode || '00-000'}-{client.name.replace(/\s+/g, '_')}-Master_Plan...
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Interlocutor / Socios Relevados</label>
              <input
                type="text"
                value={state.contactPerson}
                onChange={(e) => setState((s) => ({ ...s, contactPerson: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Dotación Actual y Proyección</label>
              <input
                type="text"
                value={state.employeesCount}
                onChange={(e) => setState((s) => ({ ...s, employeesCount: e.target.value }))}
                placeholder="Ej: 18 (Meta 2029: 36-44)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#6B1D2F]" /> Honorario Mensual
                </label>
                <input
                  type="text"
                  value={state.monthlyFee}
                  onChange={(e) => setState((s) => ({ ...s, monthlyFee: e.target.value }))}
                  placeholder="Ej: 1.800"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Moneda</label>
                <select
                  value={state.currency}
                  onChange={(e) => setState((s) => ({ ...s, currency: e.target.value as 'USD' | 'ARS' }))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 bg-white font-bold"
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Estado de la Propuesta</label>
              <select
                value={state.proposalStatus}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    proposalStatus: e.target.value as CommercialProposalState['proposalStatus'],
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white font-bold text-slate-800"
              >
                <option value="relevamiento_inicial">1. Relevamiento Inicial en Curso</option>
                <option value="propuesta_enviada">2. Evaluación + Presupuesto Entregado</option>
                <option value="aprobada_kickoff">3. Presupuesto Aprobado (Listo Kickoff)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Columnas Derecha (2 cols): Necesidad, Evaluación Preliminar y Alcance */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6B1D2F]" />
              Síntesis de Necesidad & Propuesta de Trabajo
            </h3>
            <div className="flex items-center gap-2">
              {savedNotice && (
                <span className="text-xs font-semibold text-emerald-700">✓ Guardado</span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Ficha Comercial
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                1. Dolores y Necesidades Declaradas en la 1ª Charla
              </label>
              <textarea
                rows={4}
                value={state.declaredPains}
                onChange={(e) => setState((s) => ({ ...s, declaredPains: e.target.value }))}
                placeholder="Principales motivos por los que nos contactan, dolores societarios, operativos o comerciales..."
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-800 leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6B1D2F]" />
                2. Diagnóstico Preliminar Comercial (Para presentar junto al presupuesto)
              </label>
              <textarea
                rows={4}
                value={state.initialAssessment}
                onChange={(e) => setState((s) => ({ ...s, initialAssessment: e.target.value }))}
                placeholder="Cómo vemos hoy a la empresa y dónde generará mayor retorno el ordenamiento metodológico GS..."
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-800 leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                3. Alcance Metodológico Propuesto ({state.estimatedSessionsDiagnostic})
              </label>
              <textarea
                rows={3}
                value={state.proposedScope}
                onChange={(e) => setState((s) => ({ ...s, proposedScope: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 p-3 text-slate-800 leading-relaxed bg-slate-50/70"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelevamientoPropuestaModule;

