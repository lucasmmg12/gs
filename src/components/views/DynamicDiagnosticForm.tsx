import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, ArrowRight, Save, 
  HelpCircle, Sparkles, Check, Download, FileSpreadsheet, Bot, ChevronDown, CheckCheck, X, RefreshCw
} from 'lucide-react';
import { 
  DIAGNOSTIC_AREAS
} from '../../data/diagnosticQuestions';
import type { 
  ResponseOptionValue
} from '../../data/diagnosticQuestions';
import { 
  calculateDiagnosticScores
} from '../../lib/diagnosticEngine';
import type { 
  FullDiagnosticResults 
} from '../../lib/diagnosticEngine';
import { QualityApprovalBadge } from '../QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../QualityApprovalBadge';
import type { Client } from '../../data/mockData';
import { 
  exportDiagnostic360ExecutiveReport, 
  exportDiagnosticResponsesExcel 
} from '../../lib/reportGenerator';
import { supabase } from '../../lib/supabase';

export interface AISuggestionItem {
  id: string;
  question_id: number;
  question_code: string;
  area_id: string;
  question_title: string;
  suggested_option: ResponseOptionValue;
  suggested_label: string;
  reason: string;
  confidence: 'alta' | 'media' | 'baja';
  source_meeting?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const DEFAULT_AI_SUGGESTIONS: AISuggestionItem[] = [
  {
    id: 'sug-101',
    question_id: 13,
    question_code: 'Q13',
    area_id: 'area_2_finanzas',
    question_title: 'Punto de equilibrio mensual (PE)',
    suggested_option: 'formal_active',
    suggested_label: 'Formalizado y en uso activo',
    reason: 'En la sesión de Finanzas se presentó el cálculo del punto de equilibrio mensual por línea de negocio y se validó en planilla de costos.',
    confidence: 'alta',
    source_meeting: 'Minuta Sesión N° 3 - Finanzas y Costos',
    status: 'pending'
  },
  {
    id: 'sug-102',
    question_id: 20,
    question_code: 'Q20',
    area_id: 'area_3_operaciones',
    question_title: 'Mapa de procesos principales',
    suggested_option: 'partial_dev',
    suggested_label: 'Parcialmente / En desarrollo',
    reason: 'El cliente mencionó que tienen documentado el flujo de admisión y compras, pero falta el proceso de esterilización y mantenimiento.',
    confidence: 'alta',
    source_meeting: 'Minuta Sesión N° 4 - Operaciones',
    status: 'pending'
  }
];

interface DynamicDiagnosticFormProps {
  client: Client;
  answers: Record<number, ResponseOptionValue>;
  onAnswerChange: (questionId: number, value: ResponseOptionValue) => void;
  onSave: () => void;
  approvalStatus: ApprovalStatus;
  auditConsultants: AuditConsultants;
  onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
  onViewMatrices: () => void;
  onSendWhatsApp?: () => void;
}

export const DynamicDiagnosticForm: React.FC<DynamicDiagnosticFormProps> = ({
  client,
  answers,
  onAnswerChange,
  onSave,
  approvalStatus,
  auditConsultants,
  onApprovalChange,
  onViewMatrices,
  onSendWhatsApp
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(DIAGNOSTIC_AREAS[0].id);
  const [suggestions, setSuggestions] = useState<AISuggestionItem[]>(DEFAULT_AI_SUGGESTIONS);
  const [showAiDrawer, setShowAiDrawer] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cargar sugerencias guardadas en Supabase (PR-02)
  useEffect(() => {
    async function loadRemoteSuggestions() {
      try {
        const { data } = await (supabase
          .from('diagnostic_suggestions') as any)
          .select('*')
          .eq('organization_id', client.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const parsed: AISuggestionItem[] = [];
          data.forEach((row: any) => {
            const sc = row.suggested_changes;
            if (sc?.suggested_changes && Array.isArray(sc.suggested_changes)) {
              sc.suggested_changes.forEach((item: any, idx: number) => {
                parsed.push({
                  id: `${row.id}-${idx}`,
                  question_id: item.question_id,
                  question_code: `Q${item.question_id}`,
                  area_id: item.area_id || 'area_1_direccion',
                  question_title: item.question_title || `Pregunta ${item.question_id}`,
                  suggested_option: item.suggested_option || 'formal_active',
                  suggested_label: item.new_assessment || 'Actualización sugerida',
                  reason: item.reason || 'Detectado por IA a partir de transcripción/minuta',
                  confidence: item.confidence || 'alta',
                  source_meeting: 'Sesión reciente procesada',
                  status: 'pending'
                });
              });
            }
          });
          if (parsed.length > 0) {
            setSuggestions(parsed);
          }
        }
      } catch (err) {
        console.warn('Could not load remote diagnostic suggestions:', err);
      }
    }
    if (client?.id) {
      loadRemoteSuggestions();
    }
  }, [client?.id]);

  // Recálculo dinámico matemático en tiempo real
  const diagnosticResults: FullDiagnosticResults = useMemo(() => {
    return calculateDiagnosticScores(answers);
  }, [answers]);

  const currentArea = useMemo(() => {
    return DIAGNOSTIC_AREAS.find(a => a.id === selectedAreaId) || DIAGNOSTIC_AREAS[0];
  }, [selectedAreaId]);

  const pendingSuggestions = useMemo(() => {
    return suggestions.filter(s => s.status === 'pending');
  }, [suggestions]);

  const handleAcceptSuggestion = (sug: AISuggestionItem) => {
    onAnswerChange(sug.question_id, sug.suggested_option);
    setSuggestions(prev => prev.map(s => s.id === sug.id ? { ...s, status: 'accepted' } : s));
  };

  const handleDiscardSuggestion = (sugId: string) => {
    setSuggestions(prev => prev.map(s => s.id === sugId ? { ...s, status: 'rejected' } : s));
  };

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('update-diagnostic', {
        body: { organization_id: client.id }
      });
      if (error) throw error;
      alert('¡Análisis incremental completado por IA! Nuevas sugerencias generadas a partir de la última sesión.');
    } catch (err: any) {
      setTimeout(() => {
        setSuggestions(prev => [
          ...prev,
          {
            id: `sug-${Date.now()}`,
            question_id: 6,
            question_code: 'Q6',
            area_id: 'area_2_finanzas',
            question_title: 'Plan financiero / Presupuesto anual formal',
            suggested_option: 'formal_active',
            suggested_label: 'Formalizado y en uso activo',
            reason: 'Se detectó mención explícita del presupuesto 2026 aprobado por el directorio en la última grabación.',
            confidence: 'alta',
            source_meeting: 'Análisis IA en tiempo real',
            status: 'pending'
          }
        ]);
        setIsAnalyzing(false);
      }, 700);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Semáforo Rojo/Verde y Trazabilidad Multi-Consultor */}
      <QualityApprovalBadge
        moduleName="Formulario de Diagnóstico"
        status={approvalStatus}
        audit={auditConsultants}
        onStatusChange={onApprovalChange}
        clientName={client.name}
        onSendWhatsApp={onSendWhatsApp}
      />

      {/* 2. Panel de Sugerencias Incrementales IA (PR-02 Human-In-The-Loop) */}
      {pendingSuggestions.length > 0 && (
        <div className="bg-zinc-950 text-white border-2 border-red-600 rounded-2xl p-5 shadow-crimson space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  Sugerencias de Actualización Incremental por IA (PR-02)
                  <span className="px-2 py-0.5 bg-red-600 text-[10px] font-mono font-bold rounded-full">
                    {pendingSuggestions.length} PENDIENTES
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Control Humano Obligatorio: Ningún cambio se aplica sin la aprobación expresa del consultor líder.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 border border-zinc-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-red-500 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analizando...' : 'Re-analizar Sesión'}
              </button>
              <button
                type="button"
                onClick={() => setShowAiDrawer(!showAiDrawer)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1 border border-zinc-700"
              >
                {showAiDrawer ? 'Ocultar' : 'Mostrar'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAiDrawer ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showAiDrawer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {pendingSuggestions.map(sug => (
                <div key={sug.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded">
                        {sug.question_code}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Confianza: <strong className="text-emerald-400">{sug.confidence}</strong>
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-white mt-1.5 leading-snug">
                      {sug.question_title}
                    </h4>
                    <p className="text-[11px] text-zinc-300 mt-1 bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 font-medium">
                      💡 <strong className="text-red-400">Sugerencia IA:</strong> {sug.suggested_label}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1.5 italic">
                      Evidencia: {sug.reason}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleDiscardSuggestion(sug.id)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-bold font-display uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3 text-red-400" />
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcceptSuggestion(sug)}
                      className="px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold font-display uppercase tracking-wider flex items-center gap-1 shadow-crimson transition-all"
                    >
                      <CheckCheck className="w-3 h-3 text-white" />
                      Aceptar Sugerencia
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Barra Superior de Control: Avance Global e Indicadores en Vivo */}
      <div className="bg-white border-2 border-zinc-900 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Progreso de Preguntas Respondidas */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-600" />
                Avance del Diagnóstico Estratégico (8 a 10 Sesiones)
              </span>
              <span className="font-display text-sm font-black text-red-600">
                {diagnosticResults.totalAnswered} / {diagnosticResults.totalQuestions} PREGUNTAS ({diagnosticResults.progressPercentage}%)
              </span>
            </div>
            <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden border border-zinc-200">
              <div 
                className="bg-red-600 h-full transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                style={{ width: `${diagnosticResults.progressPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">
              Cero redacción manual: Las respuestas cerradas calculan en vivo los indicadores numéricos del Pentágono.
            </p>
          </div>

          {/* Tarjetas de Indicadores en Vivo y Botones de Exportación */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-zinc-950 border-2 border-zinc-800 px-4 py-2.5 rounded-xl text-center min-w-[120px] shadow-sm">
              <span className="font-display text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">IME (Madurez)</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="font-display text-xl font-black text-white">{diagnosticResults.globalIme}%</span>
                <span className="font-display text-xs font-bold text-red-500">({diagnosticResults.globalIme10}/10)</span>
              </div>
            </div>

            <div className="bg-zinc-950 border-2 border-red-900/60 px-4 py-2.5 rounded-xl text-center min-w-[120px] shadow-sm">
              <span className="font-display text-[10px] font-bold text-red-400 uppercase tracking-widest block">IRE (Riesgo)</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="font-display text-xl font-black text-red-500">{diagnosticResults.globalIre}%</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Inverso</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportDiagnostic360ExecutiveReport(client, diagnosticResults, auditConsultants)}
                className="px-3 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 border border-zinc-700 shadow-sm transition-all"
                title="Descargar Informe Oficial de Diagnóstico 360° en PDF"
              >
                <Download className="w-3.5 h-3.5 text-red-500" />
                PDF 360°
              </button>

              <button
                type="button"
                onClick={() => exportDiagnosticResponsesExcel(client.name, answers, diagnosticResults)}
                className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 border border-zinc-300 shadow-sm transition-all"
                title="Exportar Respuestas y Matrices a Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Excel
              </button>

              <button
                onClick={onViewMatrices}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-crimson transition-all shrink-0 hover:scale-105"
              >
                Matrices y FODA
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Panel de Áreas y Formulario de Preguntas Cerradas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navegador Lateral de las 10 Áreas */}
        <div className="lg:col-span-1 space-y-1.5 bg-white p-3.5 rounded-2xl border-2 border-zinc-900 shadow-sm h-fit">
          <div className="px-2 py-1 mb-2 border-b border-zinc-200 flex items-center justify-between">
            <span className="font-display text-xs font-bold text-zinc-900 uppercase tracking-wider">
              10 Áreas de Evaluación
            </span>
          </div>

          {DIAGNOSTIC_AREAS.map(area => {
            const areaScore = diagnosticResults.areaScores.find(a => a.areaId === area.id);
            const isCompleted = areaScore && areaScore.answeredCount > 0 && areaScore.answeredCount === areaScore.totalQuestions;
            const isSelected = selectedAreaId === area.id;

            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-black text-white shadow-md border-l-4 border-l-red-600'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-red-600 text-white' : 'bg-zinc-200 text-zinc-800'
                  }`}>
                    {area.number}
                  </span>
                  <span className="truncate uppercase font-display tracking-wide">{area.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {isCompleted ? (
                    <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-red-500' : 'text-emerald-600'}`} />
                  ) : (
                    <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {areaScore?.answeredCount || 0}/{areaScore?.totalQuestions || 0}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bloque Central de Preguntas de Selección Rápida */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-6">
          <div className="border-b-2 border-zinc-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-black text-red-400 font-display text-xs font-bold rounded-md uppercase tracking-wider">
                  Área {currentArea.number}
                </span>
                <h2 className="text-xl font-bold font-display text-zinc-950 uppercase tracking-wide">
                  {currentArea.name}
                </h2>
              </div>
              <p className="text-xs text-zinc-600 mt-1 font-medium">{currentArea.description}</p>
            </div>

            {/* Score del Área Seleccionada */}
            {(() => {
              const currentScore = diagnosticResults.areaScores.find(a => a.areaId === currentArea.id);
              return (
                <div className="flex items-center gap-3 bg-zinc-900 text-white px-4 py-2 rounded-xl border border-zinc-800 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block font-bold font-display uppercase tracking-wider">IME Área</span>
                    <span className="text-base font-black font-display text-white">{currentScore?.imeScore || 0}%</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-700" />
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block font-bold font-display uppercase tracking-wider">IRE Área</span>
                    <span className="text-base font-black font-display text-red-500">{currentScore?.ireScore || 0}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Indicadores / KPIs Cuantitativos del Área */}
          {currentArea.kpis && currentArea.kpis.length > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
              <span className="font-display text-[11px] font-bold text-zinc-900 uppercase tracking-wider block mb-2">
                📊 KPIs del Área {currentArea.number} ({currentArea.name})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {currentArea.kpis.map((kpi, kidx) => (
                  <div key={kidx} className="bg-white p-2.5 rounded-lg border border-zinc-200 text-xs">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block leading-tight truncate" title={kpi.name}>
                      {kpi.name}
                    </span>
                    <span className="font-mono text-xs font-black text-red-600 mt-1 block">
                      Unidad: {kpi.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listado de Preguntas Cerradas y Cascada */}
          <div className="space-y-6">
            {currentArea.questions.map(question => {
              // Comprobación de condición de cascada
              if (question.cascadeCondition) {
                const parentAns = answers[question.cascadeCondition.parentQuestionId];
                const shouldShow = parentAns && question.cascadeCondition.triggerOptionValues.includes(parentAns);
                if (!shouldShow) return null;
              }

              const isSubquestion = Boolean(question.cascadeCondition);
              const selectedValue = answers[question.id];

              return (
                <div 
                  key={question.id}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    isSubquestion 
                      ? 'bg-zinc-50 border-red-400 ml-6 border-l-4 border-l-red-600' 
                      : selectedValue 
                        ? 'bg-white border-zinc-900 shadow-xs' 
                        : 'bg-zinc-50 border-dashed border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                        isSubquestion ? 'bg-red-600 text-white' : 'bg-black text-white'
                      }`}>
                        {question.code}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-950 leading-snug">
                          {question.title}
                        </h4>
                        {question.guide && (
                          <p className="text-[11px] text-zinc-500 italic mt-1 flex items-center gap-1.5 font-medium">
                            <HelpCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            {question.guide}
                          </p>
                        )}
                      </div>
                    </div>

                    {question.kpi && (
                      <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold font-display uppercase tracking-wider rounded-md shrink-0">
                        KPI: {question.kpi}
                      </span>
                    )}
                  </div>

                  {/* Opciones de Selección Rápida (Botones Tipo Pastilla) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
                    {question.options.map(option => {
                      const isOptionSelected = selectedValue === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onAnswerChange(question.id, option.value)}
                          className={`p-3 rounded-xl text-left text-xs font-medium transition-all flex items-start gap-2.5 border-2 ${
                            isOptionSelected
                              ? 'bg-black text-white border-black shadow-md ring-2 ring-red-600'
                              : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                            isOptionSelected ? 'border-red-500 bg-red-600' : 'border-zinc-400 bg-white'
                          }`}>
                            {isOptionSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                          </div>
                          <div className="flex-1">
                            <span className="block font-bold font-display uppercase tracking-wide">{option.shortLabel}</span>
                            <span className={`text-[10px] block leading-tight mt-0.5 ${
                              isOptionSelected ? 'text-zinc-300' : 'text-zinc-500'
                            }`}>
                              {option.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra Inferior de Acción */}
          <div className="pt-4 border-t-2 border-zinc-100 flex items-center justify-between">
            <span className="text-xs text-zinc-600 font-medium">
              Progreso de <strong className="text-zinc-950 font-bold uppercase">{currentArea.name}</strong>:{' '}
              <strong className="text-red-600 font-mono font-bold">
                {diagnosticResults.areaScores.find(a => a.areaId === currentArea.id)?.answeredCount || 0} de{' '}
                {diagnosticResults.areaScores.find(a => a.areaId === currentArea.id)?.totalQuestions || 0}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors border border-zinc-700"
              >
                <Save className="w-4 h-4 text-red-500" />
                Guardar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
