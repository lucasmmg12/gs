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
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Progreso de Preguntas Respondidas */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Avance del Diagnóstico (8 a 10 Sesiones)
              </span>
              <span className="text-xs font-black text-blue-700">
                {diagnosticResults.totalAnswered} / {diagnosticResults.totalQuestions} preguntas ({diagnosticResults.progressPercentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${diagnosticResults.progressPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Cero texto libre: Las respuestas cerradas calculan en vivo los índices IME e IRE y alimentan el Master Plan.
            </p>
          </div>

          {/* Tarjetas de Indicadores en Vivo */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-50/80 border border-blue-100 px-4 py-2.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">IME (Madurez)</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-xl font-black text-blue-900">{diagnosticResults.globalIme}%</span>
                <span className="text-xs font-bold text-blue-600">({diagnosticResults.globalIme10}/10)</span>
              </div>
            </div>

            <div className="bg-rose-50/80 border border-rose-100 px-4 py-2.5 rounded-xl text-center min-w-[120px]">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">IRE (Riesgo)</span>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-xl font-black text-rose-900">{diagnosticResults.globalIre}%</span>
                <span className="text-[10px] text-rose-500 font-medium">Inverso</span>
              </div>
            </div>

            <button
              onClick={onViewMatrices}
              className="px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors shrink-0"
            >
              Ver Matrices y FODA
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Panel de Áreas y Formulario de Preguntas Cerradas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navegador Lateral de las 10 Áreas */}
        <div className="lg:col-span-1 space-y-1.5 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs h-fit">
          <div className="px-2 py-1 mb-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
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
                className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {area.number}
                  </span>
                  <span className="truncate">{area.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {isCompleted ? (
                    <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                  ) : (
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                      {areaScore?.answeredCount || 0}/{areaScore?.totalQuestions || 0}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bloque Central de Preguntas de Selección Rápida */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
                  Área {currentArea.number}
                </span>
                <h2 className="text-lg font-bold text-gray-900">{currentArea.name}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">{currentArea.description}</p>
            </div>

            {/* Score del Área Seleccionada */}
            {(() => {
              const currentScore = diagnosticResults.areaScores.find(a => a.areaId === currentArea.id);
              return (
                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">IME Área</span>
                    <span className="text-sm font-black text-gray-900">{currentScore?.imeScore || 0}%</span>
                  </div>
                  <div className="h-6 w-px bg-gray-300" />
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">IRE Área</span>
                    <span className="text-sm font-black text-rose-600">{currentScore?.ireScore || 0}%</span>
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
                  className={`p-4 rounded-xl border transition-all ${
                    isSubquestion 
                      ? 'bg-blue-50/40 border-blue-200 ml-6 border-l-4 border-l-blue-500' 
                      : selectedValue 
                        ? 'bg-white border-gray-200 shadow-xs' 
                        : 'bg-gray-50/50 border-dashed border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSubquestion ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {question.code}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 leading-snug">
                          {question.title}
                        </h4>
                        {question.guide && (
                          <p className="text-[11px] text-gray-400 italic mt-0.5 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-blue-500" />
                            {question.guide}
                          </p>
                        )}
                      </div>
                    </div>

                    {question.kpi && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md shrink-0">
                        KPI: {question.kpi}
                      </span>
                    )}
                  </div>

                  {/* Opciones de Selección Rápida (Botones Tipo Pastilla) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                    {question.options.map(option => {
                      const isOptionSelected = selectedValue === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onAnswerChange(question.id, option.value)}
                          className={`p-2.5 rounded-lg text-left text-xs font-medium transition-all flex items-start gap-2 border ${
                            isOptionSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            isOptionSelected ? 'border-white bg-blue-700' : 'border-gray-300 bg-white'
                          }`}>
                            {isOptionSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <span className="block font-bold">{option.shortLabel}</span>
                            <span className={`text-[10px] block leading-tight ${
                              isOptionSelected ? 'text-blue-100' : 'text-gray-400'
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
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Progreso de {currentArea.name}:{' '}
              <strong className="text-gray-900">
                {diagnosticResults.areaScores.find(a => a.areaId === currentArea.id)?.answeredCount || 0} de{' '}
                {diagnosticResults.areaScores.find(a => a.areaId === currentArea.id)?.totalQuestions || 0}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
