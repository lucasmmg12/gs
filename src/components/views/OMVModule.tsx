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
      <div className="bg-white border-2 border-zinc-900 rounded-2xl p-6 shadow-sm">
        <span className="font-display text-xs font-bold text-zinc-900 uppercase tracking-widest block mb-3">
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
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isCurrent
                    ? 'bg-black text-white border-black shadow-md border-l-4 border-l-red-600'
                    : isPassed
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-display text-[11px] font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-red-400' : isPassed ? 'text-emerald-700' : 'text-zinc-400'
                  }`}>
                    Etapa {s.step}
                  </span>
                  {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <h4 className="font-display text-sm font-bold uppercase truncate">{s.label}</h4>
                <p className={`text-[11px] mt-1 line-clamp-2 font-medium ${
                  isCurrent ? 'text-zinc-300' : 'text-zinc-500'
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
        <div className="bg-gradient-to-b from-black via-zinc-950 to-red-950 text-white p-6 rounded-2xl shadow-obsidian border-2 border-red-900/50 space-y-5 lg:col-span-1">
          <div className="flex items-center gap-2 text-red-500">
            <Volume2 className="w-5 h-5" />
            <span className="font-display text-xs font-bold uppercase tracking-wider">Formato 1: Audio / Podcast</span>
          </div>

          <div>
            <h3 className="font-display text-2xl font-black text-white uppercase tracking-wide">
              Podcast OMV — Visión 3 Años
            </h3>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Narración estratégica inmersiva para el cliente, redactada como vivencia en presente.
            </p>
          </div>

          {/* Reproductor de Audio Simulado */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-red-400">03:45 / 08:20</span>
              <span className="font-display text-[10px] font-bold bg-red-600/30 text-red-300 px-2.5 py-0.5 rounded uppercase tracking-wider border border-red-500/40">
                IA Voice GS
              </span>
            </div>

            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden cursor-pointer">
              <div className="bg-red-600 h-full rounded-full w-2/5 shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-crimson transition-transform hover:scale-110"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert('Descargando archivo podcast_omv.mp3')}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-red-400" />
              Descargar Audio MP3 para el Cliente
            </button>
          </div>
        </div>

        {/* Columna Derecha: Minuta / Texto Formal en Tiempo Presente */}
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-display text-base font-bold text-zinc-950 uppercase tracking-wide">
                  Formato 2: Declaración Escrita OMV (Kickoff)
                </h3>
                <span className="text-[11px] text-zinc-500 font-medium">
                  Redacción en tiempo presente (situación vivida, no deseo a futuro)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingText(!isEditingText)}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-zinc-300"
              >
                {isEditingText ? <Save className="w-3.5 h-3.5 text-red-600" /> : <Edit3 className="w-3.5 h-3.5 text-red-600" />}
                {isEditingText ? 'Guardar' : 'Editar'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                Exportar
              </button>
            </div>
          </div>

          {isEditingText ? (
            <textarea
              rows={8}
              value={omvText}
              onChange={e => setOmvText(e.target.value)}
              className="w-full text-xs font-sans rounded-xl border-2 border-zinc-300 focus:border-red-600 focus:ring-red-600 p-4 leading-relaxed"
            />
          ) : (
            <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-xs text-zinc-800 leading-relaxed space-y-3 font-serif">
              {omvText.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}

          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-start gap-3 text-xs text-zinc-300">
            <Sparkles className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="font-medium">
              <strong className="text-white font-display uppercase tracking-wide">Requisito Metodológico GS:</strong> Este texto constituye la portada oficial del Master Plan Estratégico y sirve como ancla de alineación durante las remediciones trimestrales del Pentágono.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
