import React, { useState } from 'react';
import { 
  Play, Pause, Download, Volume2, FileText, 
  CheckCircle2, Sparkles, Edit3, Save
} from 'lucide-react';
import { QualityApprovalBadge } from '../QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../QualityApprovalBadge';
import type { Client } from '../../data/mockData';

export type ClientStage = 'kickoff_omv' | 'diagnostic_in_progress' | 'diagnostic_closed' | 'master_plan_active';

interface OMVModuleProps {
  client: Client;
  stage: ClientStage;
  onStageChange: (stage: ClientStage) => void;
  approvalStatus: ApprovalStatus;
  auditConsultants: AuditConsultants;
  onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
}

export const OMVModule: React.FC<OMVModuleProps> = ({
  client,
  stage,
  onStageChange,
  approvalStatus,
  auditConsultants,
  onApprovalChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  // OMV redactado en tiempo presente ("situación vivida", requisito explícito del doc 2)
  const defaultPresentTenseOMV = `Hoy es septiembre de 2029. ${client.name} opera con un Directorio consolidado que sesiona mensualmente con actas formales. Los socios fundadores delegan la operación diaria en un equipo de mandos medios autónomos y dedican su tiempo al crecimiento y alianzas estratégicas. 

La empresa factura más de $2.5M USD anuales con un margen neto superior al 18%, cuenta con un flujo de caja proyectado a 6 meses y una reserva de liquidez de 90 días. Sus procesos operativos y de abastecimiento están formalizados bajo estándares de calidad, logrando una tasa de satisfacción de clientes del 92% y cero dependencia del boca a boca gracias a un proceso comercial sistematizado.`;

  const [omvText, setOmvText] = useState(defaultPresentTenseOMV);

  const STAGES: { id: ClientStage; label: string; step: number; desc: string }[] = [
    { id: 'kickoff_omv', label: '1. Kickoff y OMV', step: 1, desc: 'Definición de OMV a 3 años y entrega de Podcast + Minuta escrita' },
    { id: 'diagnostic_in_progress', label: '2. Diagnóstico en Curso', step: 2, desc: '8 a 10 sesiones de relevamiento con ~100 preguntas cerradas' },
    { id: 'diagnostic_closed', label: '3. Diagnóstico Cerrado', step: 3, desc: 'Generación del Informe de Diagnóstico Oficial e indicadores' },
    { id: 'master_plan_active', label: '4. Master Plan Activo', step: 4, desc: 'Pentágono del Orden en 5 ejes con remedición trimestral' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Semáforo de Aprobación */}
      <QualityApprovalBadge
        moduleName="Minuta de Sesión"
        status={approvalStatus}
        audit={auditConsultants}
        onStatusChange={onApprovalChange}
        clientName={client.name}
        onSendWhatsApp={() => {
          alert(`Enviado al grupo de WhatsApp de ${client.name}: "Se ha validado y publicado el OMV a 3 años y la Minuta de Kickoff oficial."`);
        }}
      />

      {/* 1. Hoja de Ruta del Cliente (4 Etapas del Documento) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
          Hoja de Ruta del Ciclo de Tutoría
        </span>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {STAGES.map((s, idx) => {
            const isCurrent = stage === s.id;
            const isPassed = STAGES.findIndex(x => x.id === stage) > idx;

            return (
              <button
                key={s.id}
                onClick={() => onStageChange(s.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isPassed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-blue-100' : isPassed ? 'text-emerald-700' : 'text-gray-400'
                  }`}>
                    Etapa {s.step}
                  </span>
                  {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <h4 className="text-xs font-bold truncate">{s.label}</h4>
                <p className={`text-[11px] mt-1 line-clamp-2 ${
                  isCurrent ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {s.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. OMV en los 2 Formatos Exigidos: Podcast/Audio y Documento Escrito en Presente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Reproductor Podcast OMV */}
        <div className="bg-gradient-to-br from-gray-900 to-blue-950 text-white p-6 rounded-2xl shadow-sm space-y-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-blue-400">
            <Volume2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Formato 1: Audio / Podcast</span>
          </div>

          <div>
            <h3 className="text-lg font-black text-white">Podcast OMV — Visión a 3 Años</h3>
            <p className="text-xs text-gray-300 mt-1">
              Narración estratégica inmersiva para el cliente, redactada como vivencia en presente.
            </p>
          </div>

          {/* Reproductor de Audio Simulado */}
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-3 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-blue-300">03:45 / 08:20</span>
              <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">
                IA Voice GS
              </span>
            </div>

            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden cursor-pointer">
              <div className="bg-blue-400 h-full rounded-full w-2/5" />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 bg-white text-gray-900 hover:bg-blue-50 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert('Descargando archivo podcast_omv.mp3')}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar Audio MP3 para el Cliente
            </button>
          </div>
        </div>

        {/* Columna Derecha: Minuta / Texto Formal en Tiempo Presente */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Formato 2: Minuta Escrita de Kickoff y Declaración OMV
                </h3>
                <span className="text-[11px] text-gray-400">
                  Redacción en tiempo presente (situación vivida, no deseo a futuro)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingText(!isEditingText)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {isEditingText ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                {isEditingText ? 'Guardar' : 'Editar'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar
              </button>
            </div>
          </div>

          {isEditingText ? (
            <textarea
              rows={8}
              value={omvText}
              onChange={e => setOmvText(e.target.value)}
              className="w-full text-xs font-sans rounded-xl border-gray-300 focus:border-blue-600 focus:ring-blue-500 p-4 border leading-relaxed"
            />
          ) : (
            <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-200 text-xs text-gray-800 leading-relaxed space-y-3 font-serif">
              {omvText.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              <strong>Requisito Metodológico GS:</strong> Este texto constituye la portada oficial del Master Plan Estratégico y sirve como ancla psicológica durante las remediciones trimestrales del Pentágono.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
