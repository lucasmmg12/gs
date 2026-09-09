import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, ArrowRight, Save, 
  HelpCircle, Sparkles, Check
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

interface DynamicDiagnosticFormProps {
  client: Client;
  answers: Record<number, ResponseOptionValue>;
  onAnswerChange: (questionId: number, value: ResponseOptionValue) => void;
  onSave: () => void;
  approvalStatus: ApprovalStatus;
  auditConsultants: AuditConsultants;
  onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
  onViewMatrices: () => void;
}

export const DynamicDiagnosticForm: React.FC<DynamicDiagnosticFormProps> = ({
  client,
  answers,
  onAnswerChange,
  onSave,
  approvalStatus,
  auditConsultants,
  onApprovalChange,
  onViewMatrices
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(DIAGNOSTIC_AREAS[0].id);

  // Recálculo dinámico matemático en tiempo real
  const diagnosticResults: FullDiagnosticResults = useMemo(() => {
    return calculateDiagnosticScores(answers);
  }, [answers]);

  const currentArea = useMemo(() => {
    return DIAGNOSTIC_AREAS.find(a => a.id === selectedAreaId) || DIAGNOSTIC_AREAS[0];
  }, [selectedAreaId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Semáforo Rojo/Verde y Trazabilidad Multi-Consultor */}
      <QualityApprovalBadge
        moduleName="Formulario de Diagnóstico"
        status={approvalStatus}
        audit={auditConsultants}
        onStatusChange={onApprovalChange}
        clientName={client.name}
        onSendWhatsApp={() => {
          alert(`Notificación WhatsApp enviada al grupo de ${client.name}: "Se ha actualizado y publicado el Diagnóstico Estratégico Oficial."`);
        }}
      />

      {/* 2. Barra Superior de Control: Avance Global e Indicadores en Vivo */}
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

          {/* Tarjetas de Indicadores en Vivo con Oswald Font */}
          <div className="flex items-center gap-3">
            <div className="bg-zinc-950 border-2 border-zinc-800 px-5 py-3 rounded-xl text-center min-w-[130px] shadow-sm">
              <span className="font-display text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">IME (Madurez)</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="font-display text-2xl font-black text-white">{diagnosticResults.globalIme}%</span>
                <span className="font-display text-xs font-bold text-red-500">({diagnosticResults.globalIme10}/10)</span>
              </div>
            </div>

            <div className="bg-zinc-950 border-2 border-red-900/60 px-5 py-3 rounded-xl text-center min-w-[130px] shadow-sm">
              <span className="font-display text-[10px] font-bold text-red-400 uppercase tracking-widest block">IRE (Riesgo)</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="font-display text-2xl font-black text-red-500">{diagnosticResults.globalIre}%</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Inverso</span>
              </div>
            </div>

            <button
              onClick={onViewMatrices}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-crimson transition-all shrink-0 hover:scale-105"
            >
              Ver Matrices y FODA
              <ArrowRight className="w-4 h-4" />
            </button>
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
