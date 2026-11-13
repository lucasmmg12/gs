import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Mic,
  Sliders,
} from 'lucide-react';
import {
  DEFAULT_GS_PROMPTS,
  getStoredAISettings,
  loadAllGSPrompts,
  saveAISettings,
  saveGSPrompt,
  type GSAISettings,
  type GSPromptConfig,
  type GSPromptKey,
} from '../lib/gsPromptStore';

const PROMPT_ORDER: GSPromptKey[] = [
  'relevamiento_propuesta',
  'omb_synthesizer',
  'diagnostic_checkout',
  'minute_generator',
  'master_plan_generator',
  'client_meeting_prep',
];

export const SettingsPrompts: React.FC = () => {
  const [prompts, setPrompts] = useState<Record<GSPromptKey, GSPromptConfig>>(DEFAULT_GS_PROMPTS);
  const [selectedKey, setSelectedKey] = useState<GSPromptKey>('minute_generator');
  const [aiSettings, setAiSettings] = useState<GSAISettings>(() => getStoredAISettings());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadAllGSPrompts().then((loaded) => setPrompts(loaded));
  }, []);

  const currentPrompt = prompts[selectedKey] || DEFAULT_GS_PROMPTS[selectedKey];

  const showFeedback = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveCurrentPrompt = async () => {
    setSaving(true);
    const res = await saveGSPrompt({
      ...currentPrompt,
      ai_provider: aiSettings.preferredProvider,
      model_name:
        aiSettings.preferredProvider === 'openai' ? aiSettings.openaiModel : aiSettings.anthropicModel,
      updated_by: 'Consultor Senior GS',
    });
    saveAISettings(aiSettings);
    setSaving(false);
    showFeedback(
      res.persistedToDb
        ? `Prompt "${currentPrompt.title}" guardado en Supabase y activo en toda la plataforma.`
        : `Prompt "${currentPrompt.title}" guardado localmente y activo para las próximas sesiones.`
    );
  };

  const handleRestoreFactoryPrompt = async () => {
    const factory = DEFAULT_GS_PROMPTS[selectedKey];
    const next = { ...prompts, [selectedKey]: { ...factory, updated_at: new Date().toISOString() } };
    setPrompts(next);
    await saveGSPrompt(next[selectedKey]);
    showFeedback(`Restaurado el prompt oficial GS PyME 2.0 para "${factory.title}".`);
  };

  const handleSaveAISettingsOnly = () => {
    saveAISettings(aiSettings);
    showFeedback('Configuración de motor IA y prefijo documental guardada.');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F9EFF2] text-[#6B1D2F] text-[10px] font-bold uppercase tracking-wider border border-[#E6C5CD]">
              Exclusivo Consultores Estudio GS
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
              Sistema Metodológico PyME 2.0
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#6B1D2F]" />
            Centro de Prompts IA & Estándares Documentales GS
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl">
            Personalice exactamente las instrucciones metodológicas con las que la IA procesa grabaciones, redacta Minutas Oficiales (.DOCX), completa las 78/100 preguntas del Diagnóstico 360° y estructura el Workbook del Master Plan (.XLSX de 6 hojas). Los clientes nunca tienen acceso a esta sección.
          </p>
        </div>

        {toast && (
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
      </div>

      {/* Top Row: AI Provider & Official Document Compliance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Provider Selector */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <Cpu className="w-4 h-4 text-[#6B1D2F]" />
              Motor de Inteligencia Artificial y Política de Consumo
            </h2>
            <button
              type="button"
              onClick={handleSaveAISettingsOnly}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-[11px] font-bold uppercase tracking-wider"
            >
              Guardar Motor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAiSettings((s) => ({ ...s, preferredProvider: 'openai' }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiSettings.preferredProvider === 'openai'
                  ? 'border-[#6B1D2F] bg-[#F9EFF2]/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-slate-900 uppercase">
                  OpenAI (GPT-4o + Whisper)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Recomendado · Incluido
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                Óptimo para transcripciones largas (60–90 min) y extracción estructurada JSON. Consumo estimado para 10–20 clientes activos: <strong>&lt; USD 5/mes</strong> sin bloqueos de cupo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAiSettings((s) => ({ ...s, preferredProvider: 'anthropic' }))}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                aiSettings.preferredProvider === 'anthropic'
                  ? 'border-[#6B1D2F] bg-[#F9EFF2]/40'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-slate-900 uppercase">
                  Anthropic Claude (Sonnet)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Requiere Cupo Propio
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                Excelente redacción narrativa para Minutas y Master Plan, pero requiere que Estudio GS gestione su propia recarga de tokens API en Anthropic Console.
              </p>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Modelo OpenAI Activo</label>
              <select
                value={aiSettings.openaiModel}
                onChange={(e) => setAiSettings((s) => ({ ...s, openaiModel: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium text-slate-800"
              >
                <option value="gpt-4o">gpt-4o (Estándar Producción)</option>
                <option value="gpt-4.1">gpt-4.1 (Contexto Extendido)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (Ultra Rápido)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Modelo Claude (si aplica)</label>
              <select
                value={aiSettings.anthropicModel}
                onChange={(e) => setAiSettings((s) => ({ ...s, anthropicModel: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white font-medium text-slate-800"
              >
                <option value="claude-3-7-sonnet-latest">Claude 3.7 Sonnet</option>
                <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prefijo Código Proyecto GS</label>
              <input
                type="text"
                value={aiSettings.defaultProjectPrefix}
                onChange={(e) => setAiSettings((s) => ({ ...s, defaultProjectPrefix: e.target.value }))}
                placeholder="Ej: 26-030"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Compliance & Guardrails Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-red-400 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Reglas de Oro Operativas GS
            </div>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2">
                <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Audio en texto plano:</strong> Whisper transcribe sin separar hablantes (sin diarización). Hablar pausado y sin superposiciones.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Validación humana obligatoria:</strong> La IA redacta borradores, pero nada llega al Portal del Cliente sin el Semáforo en <strong>VERDE</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Formatos homologados:</strong> Exportación estricta en <code>.DOCX</code> (Minuta Rev0 & Diagnóstico 360°) y <code>.XLSX</code> de 6 hojas con fórmulas vivas.
                </span>
              </li>
            </ul>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Importante: Mantener la estructura de salida de los prompts garantiza que las tablas Word y fórmulas Excel no pierdan campos.
          </div>
        </div>
      </div>

      {/* Main Prompt Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of 6 Official Prompts */}
        <div className="lg:col-span-4 space-y-2.5">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Prompts Metodológicos Editables (6)
          </h3>
          {PROMPT_ORDER.map((key) => {
            const item = prompts[key];
            const active = selectedKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  active
                    ? 'bg-white border-2 border-[#6B1D2F] shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      active ? 'bg-[#6B1D2F] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.stageBadge}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{item.prompt_key}</span>
                </div>
                <h4 className="font-display text-xs font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
              </button>
            );
          })}
        </div>

        {/* Right Editor */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B1D2F]">
                {currentPrompt.stageBadge} · Clave BD: {currentPrompt.prompt_key}
              </span>
              <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Sparkles className="w-4 h-4 text-[#6B1D2F]" />
                {currentPrompt.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{currentPrompt.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreFactoryPrompt}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                title="Restaurar prompt oficial de fábrica Estudio GS"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Base GS
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCurrentPrompt}
                className="px-4 py-2 rounded-xl bg-[#6B1D2F] hover:bg-[#521523] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Guardando...' : 'Guardar Prompt'}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Instrucción del Sistema (System Prompt de Estudio GS)</span>
              <span className="text-[11px] font-normal text-slate-400">
                Última edición: {new Date(currentPrompt.updated_at).toLocaleDateString('es-AR')} ({currentPrompt.updated_by})
              </span>
            </label>
            <textarea
              rows={16}
              value={currentPrompt.prompt_text}
              onChange={(e) =>
                setPrompts((prev) => ({
                  ...prev,
                  [selectedKey]: { ...currentPrompt, prompt_text: e.target.value },
                }))
              }
              className="w-full flex-1 rounded-xl border border-slate-300 focus:border-[#6B1D2F] focus:ring-1 focus:ring-[#6B1D2F] p-4 font-mono text-xs text-slate-800 leading-relaxed bg-slate-50/60"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPrompts;

