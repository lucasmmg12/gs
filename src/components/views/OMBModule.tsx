import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Download, Volume2, FileText, 
  CheckCircle2, Sparkles, Edit3, Save, Plus, 
  Users, History, Trash2, Upload, Target
} from 'lucide-react';
import { QualityApprovalBadge } from '../QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../QualityApprovalBadge';
import type { Client } from '../../data/mockData';
import { supabase } from '../../lib/supabase';
import { DEFAULT_OMV_TARGETS, type OMVTargetRow } from '../../data/gsAxisMetadata';

export type ClientStage = 'relevamiento' | 'kickoff_omv' | 'diagnostic_in_progress' | 'diagnostic_closed' | 'master_plan_active';

export interface PartnerVisionInput {
  id: string;
  partnerName: string;
  partnerRole: string;
  visionText: string;
}

export interface OMBRevision {
  id: string;
  revisionCode: string;
  title: string;
  date: string;
  status: 'borrador' | 'en_revision' | 'consensuado_rev0';
  isBaselineRev0: boolean;
  declarationText: string;
  audioPodcastUrl?: string;
  partnerInputs: PartnerVisionInput[];
  notes?: string;
}

interface OMBModuleProps {
  client: Client;
  stage: ClientStage;
  onStageChange: (stage: ClientStage) => void;
  approvalStatus: ApprovalStatus;
  auditConsultants: AuditConsultants;
  onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
  onSendWhatsApp?: () => void;
}

export const OMBModule: React.FC<OMBModuleProps> = ({
  client,
  stage,
  onStageChange,
  approvalStatus,
  auditConsultants,
  onApprovalChange,
  onSendWhatsApp
}) => {
  // Initial default revisions
  const defaultPresentTenseOMB = `Hoy es septiembre de 2029. ${client.name} opera con un Directorio consolidado que sesiona mensualmente con actas formales. Los socios fundadores delegan la operación diaria en un equipo de mandos medios autónomos y dedican su tiempo al crecimiento y alianzas estratégicas.

La empresa factura más de $2.5M USD anuales con un margen neto superior al 18%, cuenta con un flujo de caja proyectado a 6 meses y una reserva de liquidez de 90 días. Sus procesos operativos y de abastecimiento están formalizados bajo estándares de calidad, logrando una tasa de satisfacción de clientes del 92% y cero dependencia del boca a boca gracias a un proceso comercial sistematizado.`;

  const initialRevisions: OMBRevision[] = [
    {
      id: 'rev-a',
      revisionCode: 'Rev A (Kickoff Inicial)',
      title: 'Visión Preliminar de Lanzamiento',
      date: '15/05/2026',
      status: 'en_revision',
      isBaselineRev0: false,
      declarationText: defaultPresentTenseOMB,
      audioPodcastUrl: '',
      partnerInputs: [
        {
          id: 'p-1',
          partnerName: 'Socio Fundador 1',
          partnerRole: 'Director General',
          visionText: 'Quiero que la empresa facture el doble pero sin que yo tenga que estar apagando incendios en el taller todos los días.'
        },
        {
          id: 'p-2',
          partnerName: 'Socio Fundador 2',
          partnerRole: 'Director Comercial',
          visionText: 'Consolidar 3 líneas de productos industriales estandarizados y tener presencia en todo el país con vendedores por comisión.'
        }
      ]
    },
    {
      id: 'rev-b',
      revisionCode: 'Rev B (Ajuste Post-Diagnóstico)',
      title: 'Ajuste tras Relevamiento FODA',
      date: '10/07/2026',
      status: 'en_revision',
      isBaselineRev0: false,
      declarationText: `${defaultPresentTenseOMB}\n\nSe incorporó el plan de mitigación del riesgo operativo y el protocolo de asignación de dividendos acordado entre los socios.`,
      partnerInputs: []
    }
  ];

  const storageKey = `gs_omb_revisions_${client.id}`;
  const [revisions, setRevisions] = useState<OMBRevision[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading local OMB revisions:', e);
    }
    return initialRevisions;
  });

  const [selectedRevIndex, setSelectedRevIndex] = useState<number>(0);
  const activeRev = revisions[selectedRevIndex] || revisions[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [currentText, setCurrentText] = useState(activeRev.declarationText);
  const [activeSubTab, setActiveSubTab] = useState<'declaration' | 'targets' | 'partners' | 'audio'>('declaration');

  const targetsKey = `gs_omv_targets_${client.id}`;
  const [omvTargets, setOmvTargets] = useState<OMVTargetRow[]>(() => {
    try {
      const saved = localStorage.getItem(targetsKey);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_OMV_TARGETS;
  });

  const handleTargetUpdate = (id: string, field: 'currentValue' | 'target3Years', val: string) => {
    const next = omvTargets.map((row) => (row.id === id ? { ...row, [field]: val } : row));
    setOmvTargets(next);
    try {
      localStorage.setItem(targetsKey, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  // Multi-partner new input form
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerRole, setNewPartnerRole] = useState('');
  const [newPartnerText, setNewPartnerText] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when active revision changes
  useEffect(() => {
    if (activeRev) {
      setCurrentText(activeRev.declarationText);
      setIsPlaying(false);
    }
  }, [selectedRevIndex, revisions]);

  // Persist locally and in Supabase
  const persistRevisions = async (updated: OMBRevision[]) => {
    setRevisions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }

    try {
      if (activeRev) {
        await ((supabase as any).from('client_omb_revisions')).upsert({
          id: activeRev.id.includes('rev-') ? undefined : activeRev.id,
          organization_id: client.id,
          revision_code: activeRev.revisionCode,
          title: activeRev.title,
          declaration_text: activeRev.declarationText,
          partner_inputs: activeRev.partnerInputs,
          audio_podcast_url: activeRev.audioPodcastUrl,
          is_baseline_rev0: activeRev.isBaselineRev0,
          status: activeRev.status,
          updated_at: new Date().toISOString()
        });
      }
    } catch (dbErr) {
      console.warn('DB sync error (handled gracefully):', dbErr);
    }
  };

  // Create new revision
  const handleCreateRevision = () => {
    const nextLetter = String.fromCharCode(65 + revisions.length);
    const newCode = `Rev ${nextLetter} (Ajuste ${new Date().toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })})`;
    const newRev: OMBRevision = {
      id: crypto.randomUUID(),
      revisionCode: newCode,
      title: `Revisión ${nextLetter} de la Visión`,
      date: new Date().toLocaleDateString('es-AR'),
      status: 'borrador',
      isBaselineRev0: false,
      declarationText: activeRev.declarationText,
      partnerInputs: [...(activeRev.partnerInputs || [])],
      audioPodcastUrl: activeRev.audioPodcastUrl
    };

    const next = [...revisions, newRev];
    persistRevisions(next);
    setSelectedRevIndex(next.length - 1);
  };

  // Mark as Consensual Revision 0 (Línea Base Oficial)
  const handleMarkAsRev0 = () => {
    const updated = revisions.map((r, i) => {
      if (i === selectedRevIndex) {
        return {
          ...r,
          revisionCode: 'Rev 0 (Consensuada Definitiva)',
          status: 'consensuado_rev0' as const,
          isBaselineRev0: true
        };
      }
      return { ...r, isBaselineRev0: false };
    });
    persistRevisions(updated);
  };

  // Save edited text
  const handleSaveText = () => {
    const updated = revisions.map((r, i) => i === selectedRevIndex ? { ...r, declarationText: currentText } : r);
    persistRevisions(updated);
    setIsEditingText(false);
  };

  // Add partner vision
  const handleAddPartnerInput = () => {
    if (!newPartnerName.trim() || !newPartnerText.trim()) {
      alert('Por favor ingrese el nombre del socio y el texto de su visión.');
      return;
    }
    const newPartner: PartnerVisionInput = {
      id: crypto.randomUUID(),
      partnerName: newPartnerName.trim(),
      partnerRole: newPartnerRole.trim() || 'Socio',
      visionText: newPartnerText.trim()
    };
    const updated = revisions.map((r, i) => {
      if (i === selectedRevIndex) {
        return {
          ...r,
          partnerInputs: [...(r.partnerInputs || []), newPartner]
        };
      }
      return r;
    });
    persistRevisions(updated);
    setNewPartnerName('');
    setNewPartnerRole('');
    setNewPartnerText('');
  };

  // Synthesize partners' visions with Growy IA
  const handleSynthesizeWithGrowy = () => {
    if (!activeRev.partnerInputs || activeRev.partnerInputs.length === 0) {
      alert('No hay visiones de socios cargadas para unificar.');
      return;
    }

    const partnerSummary = activeRev.partnerInputs
      .map(p => `• ${p.partnerName} (${p.partnerRole}): "${p.visionText}"`)
      .join('\n');

    const synthesizedText = `Hoy es septiembre de 2029. ${client.name} ha integrado exitosamente las visiones de sus socios fundadores en una dirección común.\n\n${partnerSummary}\n\nLa empresa consolida sus operaciones bajo un Directorio profesional con sesiones mensuales, delegando la ejecución en mandos medios y alcanzando la autonomía operativa y financiera deseada.`;

    setCurrentText(synthesizedText);
    const updated = revisions.map((r, i) => i === selectedRevIndex ? { ...r, declarationText: synthesizedText } : r);
    persistRevisions(updated);
    setActiveSubTab('declaration');
    alert('¡Visiones de los socios sintetizadas con éxito en el OMB!');
  };

  // Audio Playback simulation or real audio
  const togglePlayAudio = () => {
    if (activeRev.audioPodcastUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Handle Audio File Upload
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fakeUrl = URL.createObjectURL(file);
    const updated = revisions.map((r, i) => i === selectedRevIndex ? { ...r, audioPodcastUrl: fakeUrl } : r);
    persistRevisions(updated);
    alert(`Podcast de audio cargado exitosamente para ${activeRev.revisionCode}`);
  };

  const STAGES: { id: ClientStage; label: string; step: number; desc: string }[] = [
    { id: 'relevamiento', label: '0. Relevamiento & Propuesta', step: 0, desc: 'Entrevista comercial inicial, diagnóstico preliminar y presupuesto' },
    { id: 'kickoff_omv', label: '1. Kickoff (Patada Inicial)', step: 1, desc: 'Lanzamiento formal, visión inicial OMV y entrega de Podcast + Minuta' },
    { id: 'diagnostic_in_progress', label: '2. Diagnóstico 360° en Curso', step: 2, desc: '8 a 10 sesiones de relevamiento (~100 preguntas), OMV Rev A/B y filtro humano' },
    { id: 'diagnostic_closed', label: '3. Diagnóstico Cerrado', step: 3, desc: 'Informe Oficial Word (.DOCX), IRE (12 dim.) e IME (9 áreas) + OMV Rev 0' },
    { id: 'master_plan_active', label: '4. Master Plan Activo', step: 4, desc: 'Workbook 6 hojas (.XLSX): MPE, AVANCE-EJES, PENT-PE y Matriz de Riesgos' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300 pb-12">
      {/* Semáforo de Aprobación */}
      <QualityApprovalBadge
        moduleName="Minuta de Sesión"
        status={approvalStatus}
        audit={auditConsultants}
        onStatusChange={onApprovalChange}
        clientName={client.name}
        onSendWhatsApp={onSendWhatsApp}
      />

      {/* 1. Hoja de Ruta del Cliente */}
      <div className="bg-white border-2 border-zinc-900 rounded-2xl p-6 shadow-sm">
        <span className="font-display text-xs font-bold text-zinc-900 uppercase tracking-widest block mb-3">
          Hoja de Ruta del Ciclo de Consultoría GS (Etapas 0 a 4)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {STAGES.map((s, idx) => {
            const isCurrent = stage === s.id;
            const isPassed = STAGES.findIndex(x => x.id === stage) > idx;

            return (
              <button
                key={s.id}
                type="button"
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

      {/* 2. Barra Superior de Control de Revisiones del OMB */}
      <div className="bg-white border-2 border-zinc-900 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] font-black uppercase tracking-widest text-white bg-red-600 px-2.5 py-0.5 rounded-full">
                Marco CVA • OMV Oficial GS
              </span>
              <span className="text-xs font-bold text-zinc-500">
                Objetivo Material Visualizado — Construir desde el Valor Aspirado (3 Años)
              </span>
            </div>
            <h2 className="font-display text-2xl font-black uppercase text-zinc-950 mt-1">
              {activeRev.title} • {activeRev.revisionCode}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!activeRev.isBaselineRev0 && (
              <button
                type="button"
                onClick={handleMarkAsRev0}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                title="Consensuar esta versión como la Línea Base Rev 0 para el Master Plan"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Fijar como Rev 0 (Línea Base)
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateRevision}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Nueva Revisión (Rev {String.fromCharCode(65 + revisions.length)})
            </button>
          </div>
        </div>

        {/* Timeline / Selector de Versiones */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-zinc-100">
          <span className="text-xs font-bold text-zinc-400 flex items-center gap-1 shrink-0 mr-1">
            <History className="w-3.5 h-3.5" /> Versiones:
          </span>
          {revisions.map((rev, idx) => (
            <button
              key={rev.id}
              type="button"
              onClick={() => setSelectedRevIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                idx === selectedRevIndex
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {rev.revisionCode}
              {rev.isBaselineRev0 && (
                <span className="ml-1.5 text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full">
                  REV 0
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Sub-Navegación: Declaración Escrita vs. 8 Targets CVA vs. Visiones de Socios vs. Audio/Podcast */}
      <div className="flex flex-wrap border-b border-zinc-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('declaration')}
          className={`px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'declaration'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Declaración OMV (Tiempo Presente)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('targets')}
          className={`px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'targets'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Target className="w-4 h-4" />
          Valores TARGET a 3 Años (8 KPIs CVA)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('partners')}
          className={`px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'partners'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Visiones de Socios ({activeRev.partnerInputs?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audio')}
          className={`px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
            activeSubTab === 'audio'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          Audio / Podcast de la Revisión
        </button>
      </div>

      {/* SUBTAB TARGETS: TABLA DE 8 VALORES TARGET A 3 AÑOS (MARCO CVA) */}
      {activeSubTab === 'targets' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
            <div>
              <h3 className="font-display text-lg font-black uppercase text-zinc-950">
                Valores TARGET a 3 Años — Marco CVA (Construir desde el Valor Aspirado)
              </h3>
              <p className="text-xs text-zinc-500">
                Estos 8 indicadores alimentan directamente la Pregunta Central CVA del Informe Word Diagnóstico 360° (.DOCX) y el Portal Cliente.
              </p>
            </div>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full self-start">
              Sincronizado con Exportador Word 360°
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950 text-white uppercase font-display text-[11px] tracking-wider">
                  <th className="p-3 w-[42%]">Dimensión / Indicador CVA</th>
                  <th className="p-3 w-[29%]">Situación Actual (Línea Base)</th>
                  <th className="p-3 w-[29%]">Valor TARGET a 3 Años</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {omvTargets.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-bold text-zinc-900">
                      {row.indicator}
                      <span className="block text-[10px] font-normal text-zinc-400">{row.unit}</span>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={row.currentValue}
                        onChange={(e) => handleTargetUpdate(row.id, 'currentValue', e.target.value)}
                        placeholder="Ej: USD 1.2M / año..."
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-800 focus:border-red-600 focus:outline-none"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={row.target3Years}
                        onChange={(e) => handleTargetUpdate(row.id, 'target3Years', e.target.value)}
                        placeholder="Ej: USD 2.5M / año..."
                        className="w-full px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/40 font-semibold text-xs text-zinc-900 focus:border-red-600 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB A: DECLARACIÓN ESCRITA FORMAL */}
      {activeSubTab === 'declaration' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mini Reproductor de Podcast */}
          <div className="bg-gradient-to-b from-black via-zinc-950 to-red-950 text-white p-6 rounded-2xl shadow-obsidian border-2 border-red-900/50 space-y-5 lg:col-span-1">
            <div className="flex items-center gap-2 text-red-500">
              <Volume2 className="w-5 h-5" />
              <span className="font-display text-xs font-bold uppercase tracking-wider">
                Podcast Asociado • {activeRev.revisionCode}
              </span>
            </div>

            <div>
              <h3 className="font-display text-xl font-black text-white uppercase tracking-wide">
                Podcast OMB
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium leading-relaxed">
                Audio inmersivo para que los dueños se escuchen a sí mismos viviendo la visión a 3 años.
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-red-400">03:45 / 08:20</span>
                <span className="font-display text-[10px] font-bold bg-red-600/30 text-red-300 px-2 py-0.5 rounded uppercase tracking-wider border border-red-500/40">
                  Voz GS IA
                </span>
              </div>

              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden cursor-pointer">
                <div className="bg-red-600 h-full rounded-full w-2/5 shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-crimson transition-transform hover:scale-110"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/*"
                onChange={handleAudioFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-colors text-zinc-200"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-300" />
                Subir Audio para esta Versión
              </button>
              <button
                type="button"
                onClick={() => alert(`Descargando podcast de ${activeRev.revisionCode}`)}
                className="w-full py-2 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl text-[11px] font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                Descargar Archivo MP3
              </button>
            </div>
          </div>

          {/* Columna Derecha: Texto Formal en Presente */}
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b-2 border-zinc-100 pb-3 gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-zinc-950 uppercase tracking-wide">
                  Declaración Escrita Oficial del OMB
                </h3>
                <span className="text-[11px] text-zinc-500 font-medium">
                  Redacción obligatoria en tiempo presente ("situación vivida, no deseo a futuro")
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingText) {
                      handleSaveText();
                    } else {
                      setIsEditingText(true);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-zinc-300"
                >
                  {isEditingText ? <Save className="w-3.5 h-3.5 text-red-600" /> : <Edit3 className="w-3.5 h-3.5 text-red-600" />}
                  {isEditingText ? 'Guardar Cambios' : 'Editar Texto'}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  Exportar PDF
                </button>
              </div>
            </div>

            {isEditingText ? (
              <textarea
                rows={10}
                value={currentText}
                onChange={e => setCurrentText(e.target.value)}
                className="w-full text-xs font-sans rounded-xl border-2 border-zinc-300 focus:border-red-600 focus:ring-red-600 p-4 leading-relaxed bg-white"
              />
            ) : (
              <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-xs text-zinc-800 leading-relaxed space-y-3 font-serif">
                {currentText.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            )}

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-start gap-3 text-xs text-zinc-300">
              <Sparkles className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="font-medium">
                <strong className="text-white font-display uppercase tracking-wide">Criterio Metodológico GS:</strong> A medida que el diagnóstico destapa problemas y se analiza el FODA, la visión se madura. Al llegar al Master Plan se valida como <strong>Revisión 0</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB B: VISIONES DE MÚLTIPLES SOCIOS */}
      {activeSubTab === 'partners' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
              <div>
                <h3 className="font-display text-lg font-black uppercase text-zinc-950">
                  Visiones de los Socios Fundadores
                </h3>
                <p className="text-xs text-zinc-500">
                  Espacio para registrar las aspiraciones de cada socio individualmente y consolidarlas en un OMB consensuado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSynthesizeWithGrowy}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Unificar Visiones con Growy IA
              </button>
            </div>

            {/* Lista de Visiones de Socios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRev.partnerInputs && activeRev.partnerInputs.length > 0 ? (
                activeRev.partnerInputs.map((partner) => (
                  <div key={partner.id} className="p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-bold text-xs uppercase text-zinc-900">
                          {partner.partnerName}
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-semibold">{partner.partnerRole}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = revisions.map((r, i) => {
                            if (i === selectedRevIndex) {
                              return {
                                ...r,
                                partnerInputs: r.partnerInputs.filter(p => p.id !== partner.id)
                              };
                            }
                            return r;
                          });
                          persistRevisions(updated);
                        }}
                        className="text-zinc-400 hover:text-rose-600 p-1"
                        title="Eliminar visión"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-700 italic border-l-2 border-red-500 pl-3">
                      "{partner.visionText}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-zinc-400 text-xs">
                  No hay aportes individuales registrados aún. Ingrese las visiones de los socios abajo.
                </div>
              )}
            </div>

            {/* Formulario para Agregar Visión de Socio */}
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3 pt-4">
              <h4 className="font-display text-xs font-bold uppercase text-zinc-800">
                Registrar Aporte de un Socio Fundador
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre del Socio (ej: Martín Rossi)"
                  value={newPartnerName}
                  onChange={e => setNewPartnerName(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
                />
                <input
                  type="text"
                  placeholder="Rol en la Empresa (ej: Socio Fundador / Director Comercial)"
                  value={newPartnerRole}
                  onChange={e => setNewPartnerRole(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
                />
              </div>
              <textarea
                rows={3}
                placeholder="¿Cómo visualiza la empresa en 3 años? (metas cuantitativas, calidad de vida, rol del dueño)..."
                value={newPartnerText}
                onChange={e => setNewPartnerText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddPartnerInput}
                  className="px-4 py-2 bg-zinc-900 hover:bg-black text-white font-display text-xs font-bold uppercase rounded-lg tracking-wider"
                >
                  Agregar Visión del Socio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB C: GESTIÓN DE AUDIO / PODCAST */}
      {activeSubTab === 'audio' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-6">
          <div className="border-b border-zinc-200 pb-3">
            <h3 className="font-display text-lg font-black uppercase text-zinc-950">
              Registro del Podcast de Audio • {activeRev.revisionCode}
            </h3>
            <p className="text-xs text-zinc-500">
              Cada iteración del OMB cuenta con su propio archivo de audio para seguimiento auditivo del cliente.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-900 text-white">
            <div className="w-20 h-20 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <Volume2 className="w-10 h-10 text-red-500" />
            </div>

            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold">
                Audio MP3 Asociado
              </span>
              <h4 className="font-display text-lg font-bold uppercase">
                {client.name} — Podcast OMB ({activeRev.revisionCode})
              </h4>
              <p className="text-xs text-zinc-400">
                {activeRev.audioPodcastUrl ? 'Archivo de audio cargado y disponible.' : 'Aún no se ha cargado un archivo de audio para esta revisión.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlayAudio}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-crimson"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pausar' : 'Reproducir'}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Subir Audio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
