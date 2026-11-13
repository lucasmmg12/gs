import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  Copy,
  Download,
  Check,
  Lock,
  ShieldCheck,
  FileText,
  Target,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  FolderCheck,
  TrendingUp,
  Briefcase,
  MessageSquarePlus
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FullDiagnosticResults } from '../../lib/diagnosticEngine';
import type { Client } from '../../data/mockData';
import { exportDiagnostic360ExecutiveReport } from '../../lib/reportGenerator';
import {
  exportOfficialMasterPlanWorkbook,
  exportOfficialMinuteDocx,
  exportOfficialDiagnostic360Docx,
  exportOwnerMeetingBriefDocx
} from '../../lib/gsOfficialExporter';
import { DEFAULT_GS_AXES_META, DEFAULT_OMV_TARGETS, type OMVTargetRow } from '../../data/gsAxisMetadata';
import { INITIAL_PENTAGON_DATA, INITIAL_RISKS } from '../../data/masterPlanData';

export interface ApprovedPortalMinute {
  id: string;
  title: string;
  date: string;
  consultant: string;
  objective: string;
  participants: string[];
  topics: { numero: string; titulo: string; resumen: string; acuerdos: string }[];
  commitments: { accion: string; responsable: string; fecha: string; estado?: string }[];
  reflection?: string;
}

export interface ApprovedPortalOMB {
  revisionCode: string;
  title: string;
  declarationText: string;
  partnerInputs: { partnerName: string; visionText: string }[];
  roadmapStages: { year: number; title: string; milestone: string }[];
  kpiTargets: { kpi: string; baseline: string; target: string }[];
  approvedBy: string;
}

export interface ApprovedPortalTask {
  code: string;
  axis: number;
  axisName: string;
  title: string;
  priority: string;
  status: string;
  responsible: string;
  dueDate: string;
  progress: number;
}

export interface ApprovedPortalRisk {
  code: string;
  category: string;
  risk_name: string;
  cause: string;
  consequence: string;
  prob_inherent: number;
  imp_inherent: number;
  strategy: string;
  mitigation_actions: string;
  responsible_role: string;
  prob_residual: number;
  imp_residual: number;
  early_warning_kpi: string;
}

export interface ApprovedPortalDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: string;
  scope_level: string;
  uploader_name: string;
  description: string;
  created_at: string;
}

export interface ApprovedQuarterlyReview {
  id: string;
  quarter: string;
  review_date: string;
  pentagon_scores: {
    gobernanza: number;
    procesos: number;
    finanzas: number;
    talento: number;
    comercial: number;
  };
  ime_score: number;
  ire_score: number;
  summary_notes: string;
}

interface ClientPortalViewProps {
  client: Client;
  results: FullDiagnosticResults;
  isDiagnosticApproved?: boolean;
  isOmvApproved?: boolean;
  isMasterPlanApproved?: boolean;
  ombData?: ApprovedPortalOMB | null;
  approvedMinutes?: ApprovedPortalMinute[];
  masterPlanTasks?: ApprovedPortalTask[];
  riskMatrix?: ApprovedPortalRisk[];
  approvedDocuments?: ApprovedPortalDocument[];
  quarterlyReviews?: ApprovedQuarterlyReview[];
}

type PortalTab =
  | 'omb'
  | 'pentagon'
  | 'minutes'
  | 'diagnostic'
  | 'master_plan'
  | 'documents'
  | 'self_assessment'
  | 'meeting_prep'
  | 'content_generator';

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  client,
  results,
  isDiagnosticApproved = false,
  isOmvApproved = false,
  isMasterPlanApproved = false,
  ombData = null,
  approvedMinutes = [],
  masterPlanTasks = [],
  riskMatrix = [],
  approvedDocuments = [],
  quarterlyReviews = [],
}) => {
  const [activeTab, setActiveTab] = useState<PortalTab>('omb');
  const [expandedMinuteId, setExpandedMinuteId] = useState<string | null>(
    approvedMinutes[0]?.id || null
  );
  const [selectedAxisFilter, setSelectedAxisFilter] = useState<number | 'ALL'>('ALL');
  const [selectedContentType, setSelectedContentType] = useState<'propuesta_valor' | 'brochure' | 'pitch'>('propuesta_valor');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Self assessment interactive state
  const [selfAssessmentAnswers, setSelfAssessmentAnswers] = useState<Record<number, string>>({});
  const [selfAssessmentSent, setSelfAssessmentSent] = useState(false);

  // Client task progress reporting state (co-gestión con validación GS)
  const [reportingTaskCode, setReportingTaskCode] = useState<string | null>(null);
  const [reportSuggestedStatus, setReportSuggestedStatus] = useState<string>('EN PROCESO');
  const [reportProgress, setReportProgress] = useState<number>(55);
  const [reportNote, setReportNote] = useState<string>('');
  const [submittedReports, setSubmittedReports] = useState<Record<string, { suggestedStatus: string; progress: number; note: string; updatedAt: string }>>(() => {
    try {
      const saved = localStorage.getItem(`gs_client_task_updates_${client.id}`);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  const handleSubmitTaskReport = (code: string) => {
    const next = {
      ...submittedReports,
      [code]: {
        suggestedStatus: reportSuggestedStatus,
        progress: reportProgress,
        note: reportNote.trim() || 'Avance reportado desde Portal Cliente para validación del Consultor GS.',
        updatedAt: new Date().toLocaleDateString('es-AR'),
      },
    };
    setSubmittedReports(next);
    try {
      localStorage.setItem(`gs_client_task_updates_${client.id}`, JSON.stringify(next));
    } catch { /* ignore */ }
    setReportingTaskCode(null);
    setReportNote('');
  };

  // Owner AI Meeting Prep state (Preparador de Reuniones para el Dueño)
  const [prepType, setPrepType] = useState<'Directorio / Socios' | 'Cliente Corporativo' | 'Mandos Medios' | 'Banco / Financiamiento'>('Directorio / Socios');
  const [prepCounterpart, setPrepCounterpart] = useState<string>('Socios Fundadores y Gerencia');
  const [prepObjective, setPrepObjective] = useState<string>('Alinear prioridades trimestrales del Master Plan, revisar caja a 12 semanas y destrabar cuellos de botella operativos.');
  const [prepBriefGenerated, setPrepBriefGenerated] = useState<boolean>(false);

  // Load 8 CVA OMV Targets
  const omvTargets: OMVTargetRow[] = (() => {
    try {
      const saved = localStorage.getItem(`gs_omv_targets_${client.id}`);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_OMV_TARGETS;
  })();

  const handleDownloadMinutePDF = (minute: ApprovedPortalMinute) => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTUDIO GS CONSULTORA — MINUTA EJECUTIVA OFICIAL', 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Organización Cliente: ${client.name}  |  Fecha: ${minute.date}`, 14, 24);
    doc.text(`Documento Aprobado por Control de Calidad GS (${minute.consultant})`, 14, 31);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(minute.title, 14, 46);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const objLines = doc.splitTextToSize(`Objetivo: ${minute.objective}`, 182);
    doc.text(objLines, 14, 53);

    const topicsBody = minute.topics.map((t) => [
      t.numero,
      t.titulo,
      t.resumen,
      t.acuerdos,
    ]);

    autoTable(doc, {
      startY: 64,
      head: [['#', 'Pilar / Tema Tratado', 'Diagnóstico / Observación', 'Acuerdo / Acción']],
      body: topicsBody,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [107, 29, 47], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 42, fontStyle: 'bold' },
        2: { cellWidth: 68 },
        3: { cellWidth: 60 },
      },
    });

    const afterTopicsY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 140;

    if (minute.commitments && minute.commitments.length > 0) {
      autoTable(doc, {
        startY: afterTopicsY + 8,
        head: [['Compromiso / Próximo Paso (30 Días)', 'Responsable', 'Fecha Límite']],
        body: minute.commitments.map((c) => [c.accion, c.responsable, c.fecha]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      });
    }

    if (minute.reflection) {
      const afterCommY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 200;
      if (afterCommY < 250) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Reflexión General del Consultor GS:', 14, afterCommY + 10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        const refLines = doc.splitTextToSize(minute.reflection, 182);
        doc.text(refLines, 14, afterCommY + 16);
      }
    }

    const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`00-000-${safeName}-Minuta_de_Seguimiento_Rev0.pdf`);
  };

  const handleGenerateContent = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let text = '';
      if (selectedContentType === 'propuesta_valor') {
        text = `# PROPUESTA DE VALOR INSTITUCIONAL — ${client.name.toUpperCase()}

## Nuestra Razón de Ser
En ${client.name}, transformamos desafíos del sector ${client.industry || 'Empresarial'} con un enfoque basado en procesos estandarizados, rigor técnico y cercanía estratégica.

## Por qué nos eligen nuestros clientes (Diferencial Comprobado):
1. **Calidad y Previsibilidad Operativa:** Operamos con flujogramas y checklists de calidad auditados, reduciendo retrabajos y garantizando trazabilidad total desde la Orden de Compra hasta la Entrega Final.
2. **Dirección Profesionalizada:** Directorio quincenal activo con seguimiento semanal de 5 KPIs críticos y mandos medios con roles definidos.
3. **Agilidad Comercial:** Presupuestación modular con respuesta garantizada en 48 horas y solvencia proyectada.

---
*Documento generado automáticamente a partir del Diagnóstico Estratégico GS de ${client.name}.*`;
      } else if (selectedContentType === 'brochure') {
        text = `# BROCHURE CORPORATIVO DE PRESENTACIÓN — ${client.name.toUpperCase()}

### ¿Quiénes Somos?
Somos una organización referente en el sector ${client.industry || 'PyME'}, comprometida con la excelencia técnica y el servicio de alto valor añadido.

### Nuestras Capacidades Clave:
- **Gestión Integral:** Procesos core mapeados de punta a punta con control de calidad en cada hito.
- **Equipo y Liderazgo:** Mandos medios especializados en Operaciones, Comercial y Administración con coordinación semanal.
- **Visión 2029:** Hoja de ruta estratégica auditada por Consultora GS.

### Contáctenos:
- Sitio Web: www.${client.name.toLowerCase().replace(/\s+/g, '')}.com.ar
- Atención Corporativa directa con nuestro equipo directivo.`;
      } else {
        text = `# PITCH COMERCIAL / DISCURSO EJECUTIVO (3 MINUTOS) — ${client.name.toUpperCase()}

"Buenas tardes a todos. Mi nombre es [Nombre del Socio], socio director de ${client.name}.

Iniciamos este camino con la convicción de que el sector ${client.industry || 'productivo'} necesitaba un socio estratégico que combine capacidad técnica probada con orden estructural y cumplimiento estricto de plazos.

Hoy, gracias a nuestro programa de profesionalización junto a Consultora GS, en ${client.name} cotizamos proyectos complejos en 48 horas, operamos con procesos estandarizados y contamos con un tablero de comando semanal que garantiza previsibilidad de punta a punta.

Los invitamos a construir juntos la próxima etapa de crecimiento."`;
      }

      setGeneratedContent(text);
      setIsGenerating(false);
    }, 450);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderQualityGateLock = (moduleName: string, description: string) => (
    <div className="bg-white p-10 rounded-2xl border-2 border-amber-200 shadow-sm text-center max-w-2xl mx-auto my-4 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-black uppercase tracking-wider">
        Semáforo GS: En Revisión Interna de Calidad
      </div>
      <h3 className="font-display text-xl font-black text-zinc-950 uppercase tracking-wide">
        {moduleName} — Pendiente de Liberación por Consultor GS
      </h3>
      <p className="text-xs text-zinc-600 leading-relaxed max-w-lg mx-auto">
        {description}
      </p>
      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-500 font-medium">
        Por política de confidencialidad y rigor metodológico de <strong>Consultora GS</strong>, el cliente solo visualiza dictámenes, puntajes y planes de acción que han superado la auditoría interna y cuentan con <strong>Aprobación en Verde</strong>.
      </div>
    </div>
  );

  const filteredTasks =
    selectedAxisFilter === 'ALL'
      ? masterPlanTasks
      : masterPlanTasks.filter((t) => t.axis === selectedAxisFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Encabezado Ejecutivo del Portal del Cliente */}
      <div className="bg-gradient-to-r from-black via-zinc-950 to-red-950 text-white p-7 rounded-2xl shadow-obsidian border-2 border-red-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase tracking-widest text-red-400 font-bold">
              Portal Ejecutivo Exclusivo del Cliente • Entorno Aislado
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
              ID: {client.name}
            </span>
          </div>
          <h1 className="font-display text-3xl font-black mt-1 uppercase tracking-wide">{client.name}</h1>
          <p className="text-xs text-zinc-300 mt-1 font-medium">
            {client.industry || 'Desarrollo Organizacional'} • Solo se exhibe la información validada y aprobada por su equipo de Consultores GS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-black/60 px-5 py-3 rounded-xl border border-red-900/50 backdrop-blur-xs flex items-center gap-3">
            <Award className="w-7 h-7 text-red-500 shrink-0" />
            <div>
              <span className="font-display text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                Madurez Empresarial (IME)
              </span>
              {isDiagnosticApproved ? (
                <span className="font-display text-xl font-black text-white">
                  {results.globalIme10} / 10{' '}
                  <span className="text-xs text-red-400 font-bold">(IME {results.globalIme}%)</span>
                </span>
              ) : (
                <span className="font-display text-xs font-bold text-amber-400 uppercase">
                  En Auditoría GS
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de Estado de Aprobación de Módulos (Transparencia Consultor -> Cliente) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Visión 2029 (OMV)', approved: isOmvApproved, tab: 'omb' as PortalTab },
          { label: 'Diagnóstico 360° y Pentágono', approved: isDiagnosticApproved, tab: 'pentagon' as PortalTab },
          { label: 'Master Plan (5 Ejes)', approved: isMasterPlanApproved, tab: 'master_plan' as PortalTab },
          { label: `Minutas Oficiales (${approvedMinutes.length})`, approved: approvedMinutes.length > 0, tab: 'minutes' as PortalTab },
        ].map((mod) => (
          <button
            key={mod.label}
            type="button"
            onClick={() => setActiveTab(mod.tab)}
            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
              mod.approved
                ? 'bg-white border-emerald-200 hover:border-emerald-400'
                : 'bg-zinc-50 border-zinc-200 opacity-80'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Estado Entregable
              </span>
              <span className="text-xs font-bold text-zinc-900">{mod.label}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                mod.approved
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {mod.approved ? 'Aprobado' : 'En Revisión'}
            </span>
          </button>
        ))}
      </div>

      {/* Navegación del Portal */}
      <div className="flex items-center gap-1.5 border-b-2 border-zinc-200 pb-2 overflow-x-auto text-xs font-bold font-display uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('omb')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'omb' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-red-500" />
          Visión 2029 (OMV)
        </button>

        <button
          onClick={() => setActiveTab('pentagon')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'pentagon' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Pentágono & Evolución
        </button>

        <button
          onClick={() => setActiveTab('minutes')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'minutes' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Minutas Aprobadas ({approvedMinutes.length})
        </button>

        <button
          onClick={() => setActiveTab('diagnostic')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'diagnostic' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Diagnóstico 360° & Riesgos
        </button>

        <button
          onClick={() => setActiveTab('master_plan')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'master_plan' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Master Plan ({masterPlanTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'documents' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <FolderCheck className="w-3.5 h-3.5" />
          Documentos ({approvedDocuments.length})
        </button>

        <button
          onClick={() => setActiveTab('self_assessment')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'self_assessment' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Autoevaluación
        </button>

        <button
          onClick={() => setActiveTab('meeting_prep')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'meeting_prep' ? 'bg-blue-900 text-white shadow-md' : 'text-blue-900 hover:bg-blue-50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          Preparar Reunión IA
        </button>

        <button
          onClick={() => setActiveTab('content_generator')}
          className={`px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'content_generator' ? 'bg-red-600 text-white shadow-crimson' : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generador IA
        </button>
      </div>

      {/* 1. PESTAÑA: VISIÓN 2029 (OMV — MARCO CVA) */}
      {activeTab === 'omb' && (
        !isOmvApproved ? (
          renderQualityGateLock(
            'Objetivo Material Visualizado a 3 Años (OMV)',
            'El equipo de Consultores GS se encuentra consolidando las visiones individuales de los socios fundadores en la Declaración Oficial Rev 0 y los 8 Valores TARGET CVA. Una vez aprobada, podrá consultarla aquí.'
          )
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-7 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                      {ombData?.revisionCode || 'Rev 0'} • Marco CVA Consensuado
                    </span>
                    <span className="text-[11px] text-zinc-400 font-bold">
                      Validado por: {ombData?.approvedBy || 'Director Metodológico GS'}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-black text-zinc-950 uppercase tracking-wide mt-1">
                    {ombData?.title || `Declaración OMV a 3 Años (2029) — ${client.name}`}
                  </h3>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-950 to-zinc-900 text-white border border-zinc-800 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block mb-2">
                  Objetivo Material Visualizado — Redactado en Tiempo Presente ("Situación Vivida")
                </span>
                <p className="text-sm sm:text-base leading-relaxed font-medium text-zinc-100 italic">
                  "{ombData?.declarationText || `Hoy es septiembre de 2029. ${client.name} opera con Directorio mensual activo, procesos estandarizados, flujo de caja previsible a 90 días y un equipo de líderes autónomos.`}"
                </p>
              </div>

              {/* Tabla Oficial de 8 Valores TARGET a 3 Años (Marco CVA) */}
              <div>
                <h4 className="font-display text-xs font-black uppercase tracking-wider text-zinc-800 mb-3">
                  Valores TARGET a 3 Años — 8 Indicadores CVA (Construir desde el Valor Aspirado)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 text-white font-display uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Dimensión Estratégica CVA</th>
                        <th className="py-2.5 px-4">Punto de Partida (Línea Base)</th>
                        <th className="py-2.5 px-4">Meta TARGET a 3 Años</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {omvTargets.map((row) => (
                        <tr key={row.id} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-4 font-bold text-zinc-900">
                            {row.indicator} <span className="text-[10px] font-normal text-zinc-400">({row.unit})</span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-500">{row.currentValue}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700">{row.target3Years}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {ombData?.kpiTargets && ombData.kpiTargets.length > 0 && (
                <div>
                  <h4 className="font-display text-xs font-black uppercase tracking-wider text-zinc-700 mb-3">
                    Metas Cuantificadas Línea Base vs. Visión 2029
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {ombData.kpiTargets.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 block">{item.kpi}</span>
                        <div className="flex items-baseline justify-between mt-1.5">
                          <span className="text-xs text-zinc-500 line-through">{item.baseline}</span>
                          <span className="text-base font-black text-emerald-700">{item.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ombData?.roadmapStages && ombData.roadmapStages.length > 0 && (
                <div>
                  <h4 className="font-display text-xs font-black uppercase tracking-wider text-zinc-700 mb-3">
                    Hoja de Ruta Trienal (Hitos Anuales)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ombData.roadmapStages.map((stage) => (
                      <div key={stage.year} className="p-4 rounded-xl border-2 border-zinc-200 bg-white space-y-1.5">
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-black uppercase">
                          Año {stage.year}
                        </span>
                        <h5 className="font-display text-xs font-bold text-zinc-900">{stage.title}</h5>
                        <p className="text-xs text-zinc-600 leading-relaxed">{stage.milestone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* 2. PESTAÑA: PENTÁGONO DE MADUREZ & EVOLUCIÓN TRIMESTRAL */}
      {activeTab === 'pentagon' && (
        !isDiagnosticApproved ? (
          renderQualityGateLock(
            'Pentágono de Madurez y Evolución Trimestral',
            'Los puntajes del Pentágono del Orden (IME / IRE) están siendo auditados por el Consultor Senior GS antes de su publicación oficial.'
          )
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
                <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                  Pentágono del Orden Actual (Escala 1 a 10)
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Evaluación oficial aprobada del grado de autonomía y profesionalización de {client.name}.
                </p>

                <div className="space-y-4 pt-2">
                  {[
                    { name: '1. Directorio y Gobernanza', score: results.pentagon.directorio, meta: 8.0 },
                    { name: '2. Talento y Estructura', score: results.pentagon.talento, meta: 7.5 },
                    { name: '3. Finanzas y Rentabilidad', score: results.pentagon.finanzas, meta: 8.0 },
                    { name: '4. Procesos y Calidad', score: results.pentagon.procesos, meta: 7.5 },
                    { name: '5. Comercial y Clientes', score: results.pentagon.comercial, meta: 8.0 },
                  ].map((axis) => (
                    <div key={axis.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="font-display text-zinc-800 uppercase tracking-wide">{axis.name}</span>
                        <span className="font-display text-zinc-950 text-sm">
                          {axis.score} / 10{' '}
                          <span className="text-zinc-400 font-normal font-sans text-xs">(Meta: {axis.meta})</span>
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200">
                        <div
                          className="bg-red-600 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(220,38,38,0.4)]"
                          style={{ width: `${Math.min(100, (axis.score / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs text-zinc-700 font-medium">
                  Objetivo de la tutoría: Consolidar una puntuación general superior a 7.5 para asegurar delegación efectiva y autonomía operativa.
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                    Dictamen Oficial de Madurez y Riesgo
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">
                    Indicadores auditados por Consultora GS tras el control de calidad.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-white">
                      <span className="font-display text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Índice de Madurez Empresarial (IME)
                      </span>
                      <p className="font-display text-lg font-bold text-white mt-0.5">
                        {results.globalIme}% — {results.maturityStatus.label}
                      </p>
                    </div>

                    <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-white">
                      <span className="font-display text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        Índice de Riesgo Empresario (IRE)
                      </span>
                      <p className="font-display text-lg font-bold text-red-400 mt-0.5">
                        {results.globalIre}% — Riesgo en Mitigación Activa
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => exportDiagnostic360ExecutiveReport(client, results)}
                    className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-red-500" />
                    Descargar Informe Diagnóstico PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Historial de Revisiones Trimestrales (Cada 90 Días) */}
            {quarterlyReviews.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                    Evolución Trimestral del Pentágono (Ciclos de 90 Días)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quarterlyReviews.map((rev) => (
                    <div key={rev.id} className="p-5 rounded-xl border-2 border-zinc-200 bg-zinc-50/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-black text-zinc-900 uppercase">
                          {rev.quarter}
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-500">{rev.review_date}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="px-2.5 py-1 rounded bg-zinc-900 text-white">
                          IME: {Number(rev.ime_score).toFixed(1)} / 10
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200">
                          IRE: {Number(rev.ire_score).toFixed(1)} / 10
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">{rev.summary_notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* 3. PESTAÑA: MINUTAS APROBADAS */}
      {activeTab === 'minutes' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                Historial de Minutas Oficiales Aprobadas — {client.name}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                Solo se exhiben las minutas auditadas y publicadas en verde por el equipo de Consultores GS para su organización.
              </p>
            </div>
          </div>

          {approvedMinutes.length === 0 ? (
            <div className="p-10 text-center bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
              <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-sm font-bold text-zinc-800">No hay minutas publicadas aún para {client.name}</p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Las minutas de sesión se encuentran en elaboración o revisión interna por parte de su consultor GS y aparecerán aquí en cuanto sean aprobadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedMinutes.map((m) => {
                const isExpanded = expandedMinuteId === m.id;
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border-2 border-zinc-200 hover:border-zinc-900 transition-all overflow-hidden bg-white"
                  >
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/70">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold font-display uppercase tracking-wider rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Aprobada por GS
                          </span>
                          <span className="text-xs font-mono font-bold text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {m.date}
                          </span>
                          <span className="text-xs text-zinc-500 font-medium">• {m.consultant}</span>
                        </div>
                        <h4 className="text-base font-black text-zinc-950 font-display uppercase tracking-wide">
                          {m.title}
                        </h4>
                        <p className="text-xs text-zinc-600 font-medium">{m.objective}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            const projectCode = localStorage.getItem(`gs_project_code_${client.id}`) || '00-000';
                            await exportOfficialMinuteDocx({
                              projectCode,
                              clientName: client.name,
                              revision: '0',
                              meetingTitle: m.title,
                              meetingDate: m.date,
                              motivo: m.objective,
                              attendeesGS: [m.consultant || 'Consultor Senior GS'],
                              attendeesClient: m.participants || [client.name],
                              topicsDiscussed: m.topics.map((t) => ({
                                title: t.titulo,
                                intro: t.acuerdos || undefined,
                                points: [t.resumen],
                              })),
                              commitments: m.commitments.map((c) => ({
                                responsible: c.responsable,
                                task: c.accion,
                                deadline: c.fecha,
                              })),
                              reflection:
                                m.reflection ||
                                'El cumplimiento riguroso de los acuerdos semanales consolida la autonomía operativa buscada en el OMV.',
                            });
                          }}
                          className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-200" />
                          Word Oficial (.DOCX)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadMinutePDF(m)}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedMinuteId(isExpanded ? null : m.id)}
                          className="px-3 py-2 bg-white hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold border border-zinc-300 flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Ocultar Detalle <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              Ver {m.topics.length} Pilares y Compromisos <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-6 border-t border-zinc-200 space-y-6">
                        {m.participants && m.participants.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase text-zinc-400">Participantes:</span>
                            {m.participants.map((p, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-700"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 9 Temas Tratados */}
                        <div className="space-y-3">
                          <h5 className="font-display text-xs font-black uppercase tracking-wider text-zinc-900">
                            Desarrollo de Pilares Tratados en la Sesión ({m.topics.length})
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {m.topics.map((t, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-mono font-bold">
                                    {t.numero}
                                  </span>
                                  <h6 className="font-display text-xs font-bold text-zinc-900 uppercase">
                                    {t.titulo}
                                  </h6>
                                </div>
                                <p className="text-xs text-zinc-600 leading-relaxed">{t.resumen}</p>
                                {t.acuerdos && (
                                  <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                                    <strong className="font-bold">Acuerdo / Acción: </strong>
                                    {t.acuerdos}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tabla de Compromisos y Próximos Pasos */}
                        {m.commitments && m.commitments.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-display text-xs font-black uppercase tracking-wider text-zinc-900">
                              Compromisos y Próximos Pasos (30 Días)
                            </h5>
                            <div className="overflow-x-auto rounded-xl border border-zinc-200">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-zinc-900 text-white font-display uppercase text-[10px] tracking-wider">
                                    <th className="py-2.5 px-4">Acción / Compromiso</th>
                                    <th className="py-2.5 px-4">Responsable</th>
                                    <th className="py-2.5 px-4">Fecha Objetivo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                  {m.commitments.map((c, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-50">
                                      <td className="py-2.5 px-4 font-medium text-zinc-900">{c.accion}</td>
                                      <td className="py-2.5 px-4 text-zinc-600 font-semibold">{c.responsable}</td>
                                      <td className="py-2.5 px-4 font-mono font-bold text-red-700">{c.fecha}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {m.reflection && (
                          <div className="p-4 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block">
                              Reflexión General del Consultor GS
                            </span>
                            <p className="text-xs leading-relaxed italic">"{m.reflection}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. PESTAÑA: ESTADO DEL DIAGNÓSTICO 360° & MATRIZ DE RIESGOS */}
      {activeTab === 'diagnostic' && (
        !isDiagnosticApproved ? (
          renderQualityGateLock(
            'Diagnóstico 360° (10 Áreas) y Matriz de Riesgos',
            'El relevamiento de las 100 preguntas de Diagnóstico 360° y la Matriz de Riesgos Inherentes/Residuales se encuentran en proceso de validación técnica por Consultora GS.'
          )
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                    Resultado Auditado del Diagnóstico 360° (10 Áreas)
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Evaluación integral aprobada por Consultora GS para {client.name}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const projectCode = localStorage.getItem(`gs_project_code_${client.id}`) || '26-030';
                      let savedAnswers = {};
                      let savedQual = {};
                      let savedKpis = {};
                      try {
                        savedAnswers = JSON.parse(localStorage.getItem(`gs_diag_answers_${client.id}`) || '{}');
                        savedQual = JSON.parse(localStorage.getItem(`gs_qualitative_answers_${client.id}`) || '{}');
                        savedKpis = JSON.parse(localStorage.getItem(`gs_area_kpis_${client.id}`) || '{}');
                      } catch { /* ignore */ }

                      await exportOfficialDiagnostic360Docx({
                        client: {
                          name: client.name,
                          rubro: client.industry || 'PyME en Profesionalización',
                        },
                        projectCode,
                        omvText:
                          ombData?.declarationText ||
                          `Hoy es 2029. ${client.name} opera con Directorio activo, procesos trazables y rentabilidad previsible.`,
                        omvTargets,
                        answers: savedAnswers,
                        qualitativeMap: savedQual,
                        areaKpiValues: savedKpis,
                        results,
                      });
                    }}
                    className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-200" /> Word 360° Oficial (.DOCX)
                  </button>
                  <button
                    type="button"
                    onClick={() => exportDiagnostic360ExecutiveReport(client, results)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Informe Ejecutivo PDF
                  </button>
                </div>
              </div>

              <div className="p-5 bg-zinc-950 text-white rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-display text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Preguntas Auditadas y Validadas
                  </span>
                  <span className="font-display text-xl font-black text-white mt-0.5 block">
                    {results.totalAnswered} de {results.totalQuestions} ({results.progressPercentage}%)
                  </span>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-bold font-display uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Aprobado y Publicado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                {results.areaScores.map((a) => (
                  <div key={a.areaId} className="p-4 bg-white border-2 border-zinc-200 rounded-xl text-center">
                    <span className="font-display text-[10px] text-zinc-500 font-bold uppercase tracking-wider block truncate">
                      {a.areaName}
                    </span>
                    <span className="font-display text-xl font-black text-zinc-950 mt-1 block">{a.imeScore}%</span>
                    <span className="text-[10px] text-zinc-400 font-mono font-bold">
                      {a.answeredCount}/{a.totalQuestions} resp.
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matriz de Riesgos Estratégicos Aprobada */}
            {riskMatrix.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                      Matriz de Riesgos Estratégicos y Mitigación — {client.name}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      Riesgos críticos detectados en el Diagnóstico 360° y su plan de mitigación asociado al Master Plan.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 text-white font-display uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Código / Eje</th>
                        <th className="py-3 px-4">Riesgo Identificado y Causa Raíz</th>
                        <th className="py-3 px-4 text-center">Riesgo Inherente</th>
                        <th className="py-3 px-4">Plan de Mitigación GS</th>
                        <th className="py-3 px-4 text-center">Riesgo Residual</th>
                        <th className="py-3 px-4">KPI Alerta Temprana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {riskMatrix.map((r) => {
                        const inh = r.prob_inherent * r.imp_inherent;
                        const res = r.prob_residual * r.imp_residual;
                        return (
                          <tr key={r.code} className="hover:bg-zinc-50">
                            <td className="py-3 px-4 font-mono font-bold text-red-700 whitespace-nowrap">
                              {r.code}
                              <span className="block text-[10px] font-sans text-zinc-500">{r.category}</span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-zinc-900">{r.risk_name}</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">Causa: {r.cause}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded bg-red-100 text-red-800 font-mono font-black">
                                {inh} ({r.prob_inherent}x{r.imp_inherent})
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-700">
                              <p className="font-medium">{r.mitigation_actions}</p>
                              <span className="text-[10px] text-zinc-400 font-bold">Resp: {r.responsible_role}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-mono font-black">
                                {res} ({r.prob_residual}x{r.imp_residual})
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-zinc-700">{r.early_warning_kpi}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* 5. PESTAÑA: MASTER PLAN ESTRATÉGICO */}
      {activeTab === 'master_plan' && (
        !isMasterPlanApproved ? (
          renderQualityGateLock(
            'Master Plan Estratégico (Plan de Acción en 5 Ejes)',
            'El Master Plan de su organización se encuentra en etapa de estructuración y ponderación por parte de los Consultores GS. Se habilitará automáticamente al ser aprobado en verde.'
          )
        ) : (
          <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-zinc-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                  Master Plan Estratégico Oficial — {client.name}
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Iniciativas y compromisos aprobados organizados bajo los 5 Ejes del Pentágono del Orden ({masterPlanTasks.length} acciones).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const projectCode = localStorage.getItem(`gs_project_code_${client.id}`) || '26-030';
                  let axesMeta = DEFAULT_GS_AXES_META;
                  try {
                    const savedAxes = localStorage.getItem(`gs_axes_meta_${client.id}`);
                    if (savedAxes) axesMeta = JSON.parse(savedAxes);
                  } catch { /* ignore */ }

                  exportOfficialMasterPlanWorkbook({
                    projectCode,
                    clientName: client.name,
                    revision: 'd',
                    omvText:
                      ombData?.declarationText ||
                      `Hoy es 2029. ${client.name} opera con Directorio activo, procesos trazables y rentabilidad previsible.`,
                    globalIme: results.globalIme || 48,
                    globalIre: results.globalIre || 38,
                    axesMeta,
                    tasks: masterPlanTasks.map((t, idx) => ({
                      id: `mp_${idx + 1}`,
                      code: t.code,
                      axis: t.axis || 1,
                      axisName: t.axisName,
                      title: t.title,
                      priority: (t.priority === 'Alta' || t.priority === 'Baja' ? t.priority : 'Media') as 'Alta' | 'Media' | 'Baja',
                      status: (t.status as any) || 'SIN INICIAR',
                      assignedRole: t.responsible,
                      startDate: 'Ago 2026',
                      dueDate: t.dueDate,
                      progress: t.progress,
                    })),
                    pentagonPeriods: INITIAL_PENTAGON_DATA,
                    risks: INITIAL_RISKS,
                  });
                }}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 self-start sm:self-center cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Workbook Oficial GS (.XLSX — 6 Hojas con Fórmulas)
              </button>
            </div>

            {/* Filtro por Eje del Pentágono */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'ALL' as const, label: `Todos los Ejes (${masterPlanTasks.length})` },
                { id: 1, label: 'Eje 1: Gobernanza' },
                { id: 2, label: 'Eje 2: Estructura y RRHH' },
                { id: 3, label: 'Eje 3: Finanzas' },
                { id: 4, label: 'Eje 4: Procesos' },
                { id: 5, label: 'Eje 5: Comercial' },
              ].map((ax) => (
                <button
                  key={String(ax.id)}
                  type="button"
                  onClick={() => setSelectedAxisFilter(ax.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedAxisFilter === ax.id
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {ax.label}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {filteredTasks.map((task) => {
                const pendingRep = submittedReports[task.code];
                const isReporting = reportingTaskCode === task.code;
                return (
                  <div
                    key={task.code}
                    className="p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-400 transition-all space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded shrink-0">
                          {task.code}
                        </span>
                        <div>
                          <h4 className="font-bold text-zinc-950 text-xs font-display uppercase tracking-wide">
                            {task.title}
                          </h4>
                          <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">
                            {task.axisName} • Responsable: <strong className="text-zinc-800">{task.responsible}</strong> • Prioridad: {task.priority}
                          </span>
                          {pendingRep && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                              Avance enviado a Consultor GS: {pendingRep.suggestedStatus} ({pendingRep.progress}%) — "{pendingRep.note}"
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className="text-zinc-500 font-mono font-bold text-[11px]">{task.dueDate}</span>
                        <span
                          className={`px-2.5 py-1 font-bold font-display uppercase text-[10px] rounded ${
                            task.status === 'FINALIZADO' || task.status === 'COMPLETED'
                              ? 'bg-emerald-600 text-white'
                              : task.status === 'EN PROCESO'
                              ? 'bg-amber-500 text-white'
                              : 'bg-zinc-900 text-white'
                          }`}
                        >
                          {task.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isReporting) {
                              setReportingTaskCode(null);
                            } else {
                              setReportingTaskCode(task.code);
                              setReportSuggestedStatus(task.status === 'SIN INICIAR' ? 'EN PROCESO' : task.status);
                              setReportProgress(task.progress || 55);
                              setReportNote(pendingRep?.note || '');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-zinc-300 hover:border-zinc-900 bg-white text-zinc-800 font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquarePlus className="w-3 h-3 text-red-600" />
                          Reportar Avance
                        </button>
                      </div>
                    </div>

                    {isReporting && (
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">Estado Propuesto</label>
                          <select
                            value={reportSuggestedStatus}
                            onChange={(e) => {
                              const v = e.target.value;
                              setReportSuggestedStatus(v);
                              setReportProgress(v === 'FINALIZADO' ? 100 : v === 'EN PROCESO' ? 55 : 0);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs font-bold"
                          >
                            <option value="EN PROCESO">EN PROCESO</option>
                            <option value="FINALIZADO">FINALIZADO</option>
                            <option value="RETRASADO">RETRASADO</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">Nota o Evidencia para su Consultor GS</label>
                          <input
                            type="text"
                            value={reportNote}
                            onChange={(e) => setReportNote(e.target.value)}
                            placeholder="Ej: Ya aprobamos el flujo de compras y designamos responsable..."
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitTaskReport(task.code)}
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-display text-[11px] font-bold uppercase cursor-pointer"
                          >
                            Enviar a GS
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* 6. PESTAÑA: DOCUMENTOS Y ENTREGABLES APROBADOS */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="border-b-2 border-zinc-100 pb-3">
            <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
              Repositorio de Entregables y Documentos Aprobados — {client.name}
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Archivos técnicos, plantillas e informes liberados por Consultora GS para su organización. Los papeles de trabajo internos de la consultora permanecen ocultos.
            </p>
          </div>

          {approvedDocuments.length === 0 ? (
            <div className="p-10 text-center bg-zinc-50 rounded-xl border border-zinc-200">
              <p className="text-sm font-bold text-zinc-700">No hay documentos liberados para este cliente aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-900 transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-mono font-bold uppercase">
                        {doc.file_type}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Visible Cliente
                      </span>
                    </div>
                    <h4 className="font-display text-xs font-bold text-zinc-950 break-all">{doc.file_name}</h4>
                    {doc.description && <p className="text-xs text-zinc-600">{doc.description}</p>}
                    <span className="text-[10px] text-zinc-400 font-medium block">
                      Tamaño: {doc.file_size || '35 KB'} • Subido por: {doc.uploader_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. PESTAÑA: ESPACIO DE AUTOEVALUACIÓN */}
      {activeTab === 'self_assessment' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4 max-w-3xl mx-auto">
          <div>
            <h3 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
              Autoevaluación Mensual del Directorio — {client.name}
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Espacio exclusivo para que los socios evalúen su percepción del orden antes de la sesión de seguimiento con su consultor GS.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              '¿Siente que esta semana dedicó tiempo a pensar en la estrategia y no solo a apagar incendios operativos?',
              '¿Se cumplieron los 5 compromisos asumidos en la última minuta de seguimiento?',
              '¿El Cash Flow proyectado a 12 semanas le brinda visibilidad tranquila para las obligaciones inmediatas?',
              '¿Pudo delegar decisiones operativas en los líderes de área respetando el nuevo organigrama?',
            ].map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 space-y-2">
                <label className="text-xs font-bold text-zinc-950 block">
                  {idx + 1}. {q}
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Totalmente', 'Parcialmente', 'Aún no'].map((opt) => {
                    const selected = selfAssessmentAnswers[idx] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelfAssessmentAnswers((prev) => ({ ...prev, [idx]: opt }));
                          setSelfAssessmentSent(false);
                        }}
                        className={`px-4 py-1.5 border-2 rounded-lg text-xs font-display font-bold uppercase tracking-wide transition-all ${
                          selected
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white border-zinc-300 hover:border-black text-zinc-800'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {selfAssessmentSent && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ¡Autoevaluación registrada y enviada al equipo de Consultores GS para la próxima sesión!
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                localStorage.setItem(
                  `gs_self_assessment_${client.id}`,
                  JSON.stringify({ answers: selfAssessmentAnswers, sentAt: new Date().toISOString() })
                );
                setSelfAssessmentSent(true);
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider shadow-crimson transition-colors"
            >
              Enviar Autoevaluación al Consultor GS
            </button>
          </div>
        </div>
      )}

      {/* 7.5 PESTAÑA: PREPARADOR DE REUNIONES ESTRATÉGICAS IA PARA EL DUEÑO */}
      {activeTab === 'meeting_prep' && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-6">
          <div className="border-b-2 border-zinc-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Asistente Estratégico del Dueño • Metodología GS
              </span>
              <h3 className="font-display text-xl font-black text-zinc-950 uppercase tracking-wide mt-1.5">
                Preparador de Reuniones Clave con IA — {client.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Cruza su OMV 2029, su Matriz de Riesgos y las prioridades activas de su Master Plan para armar su hoja de ruta antes de entrar a una reunión decisiva.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {(
              [
                { id: 'Directorio / Socios', desc: 'Alinear decisiones entre socios, caja y desvíos del Master Plan' },
                { id: 'Cliente Corporativo', desc: 'Negociación comercial B2B respaldada por procesos y SLA' },
                { id: 'Mandos Medios', desc: 'Delegación efectiva, revisión de KPIs semanales y orden operativo' },
                { id: 'Banco / Financiamiento', desc: 'Presentación de solvencia, flujo proyectado y gobernanza profesional' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPrepType(opt.id);
                  setPrepBriefGenerated(false);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  prepType === opt.id
                    ? 'bg-blue-950 text-white border-blue-900 shadow-sm'
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 text-zinc-800'
                }`}
              >
                <div className="font-display text-xs font-black uppercase tracking-wide">{opt.id}</div>
                <p className={`text-[11px] mt-1 ${prepType === opt.id ? 'text-blue-200' : 'text-zinc-500'}`}>{opt.desc}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Contraparte / Participantes de la Reunión
              </label>
              <input
                type="text"
                value={prepCounterpart}
                onChange={(e) => setPrepCounterpart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white font-medium"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-zinc-700 mb-1">
                Objetivo Concreto que Necesita Lograr
              </label>
              <input
                type="text"
                value={prepObjective}
                onChange={(e) => setPrepObjective(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white font-medium"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPrepBriefGenerated(true)}
              className="px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-display text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              Generar Brief Ejecutivo de Reunión
            </button>

            {prepBriefGenerated && (
              <button
                type="button"
                onClick={async () => {
                  await exportOwnerMeetingBriefDocx({
                    clientName: client.name,
                    meetingTypeLabel: prepType,
                    counterpart: prepCounterpart,
                    goal: prepObjective,
                    briefSections: [
                      {
                        heading: '1. Agenda Sugerida (45 Minutos)',
                        bullets: [
                          `Apertura ejecutiva (5 min): Encuadre del objetivo ("${prepObjective}") conectado con la meta trienal OMV de ${client.name}.`,
                          `Revisión de indicadores duros (15 min): Estado actual de madurez (IME ${results.globalIme10}/10) y seguimiento de las ${masterPlanTasks.slice(0, 3).length || 3} iniciativas prioritarias activas.`,
                          `Resolución de cuellos de botella y riesgos (15 min): Mitigación activa del Índice de Riesgo (${results.globalIre}%) evitando decisiones informales fuera de circuito.`,
                          `Cierre de acuerdos con responsable y fecha cierta (10 min): Definición escrita de próximos pasos verificables en 15 días.`,
                        ],
                      },
                      {
                        heading: '2. Argumentos Estratégicos y Anclaje OMV',
                        bullets: [
                          `Anclar toda decisión en los Valores TARGET a 3 años de ${client.name}, priorizando rentabilidad neta y previsibilidad de caja a 90 días.`,
                          `Respaldar la posición de la empresa en sus procesos auditados y su Directorio activo acompañado por Estudio GS.`,
                          `Evitar absorber tareas operativas durante la reunión: asignar dueño y fecha límite a cada acción acordada.`,
                        ],
                      },
                      {
                        heading: '3. Alertas de Riesgo y Preguntas de Cierre',
                        bullets: [
                          `Alerta GS: No comprometer plazos ni desembolsos sin validar antes el flujo de caja proyectado a 12 semanas.`,
                          `Pregunta clave 1: ¿Cuál es el único indicador numérico que definirá en 30 días si lo acordado hoy fue exitoso?`,
                          `Pregunta clave 2: ¿Quién queda como único responsable directo del seguimiento hasta nuestra próxima revisión?`,
                        ],
                      },
                    ],
                  });
                }}
                className="px-5 py-3 bg-zinc-950 hover:bg-black text-white rounded-xl font-display text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-300" />
                Descargar Brief en Word Oficial (.DOCX)
              </button>
            )}
          </div>

          {prepBriefGenerated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs">
                <h4 className="font-display font-black uppercase text-blue-950 tracking-wider">
                  1. Agenda Sugerida (45 Minutos) — {prepType}
                </h4>
                <ul className="space-y-2 text-zinc-700 list-disc list-inside leading-relaxed">
                  <li><strong>00–05 min:</strong> Encuadre directo del objetivo con <strong>{prepCounterpart}</strong> alineado al OMV 2029.</li>
                  <li><strong>05–20 min:</strong> Evidencias cuantitativas (IME {results.globalIme10}/10) y foco en acciones de Prioridad Alta del Master Plan.</li>
                  <li><strong>20–35 min:</strong> Tratamiento de desvíos y blindaje frente a riesgos detectados (IRE {results.globalIre}%).</li>
                  <li><strong>35–45 min:</strong> Cierre formal de compromisos (Responsable + Entregable + Fecha).</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5 text-xs">
                <h4 className="font-display font-black uppercase text-amber-950 tracking-wider">
                  2. Alertas de Riesgo y Preguntas de Cierre del Dueño
                </h4>
                <ul className="space-y-2 text-amber-950 list-disc list-inside leading-relaxed">
                  <li><strong>Resguardo Financiero:</strong> No comprometer caja ni plazos extraordinarios fuera del presupuesto validado en Eje 3.</li>
                  <li><strong>Delegación Efectiva:</strong> Si surge una tarea operativa, asignarla al líder del área correspondiente del Master Plan.</li>
                  <li><strong>Pregunta de Cierre:</strong> <em>"¿Quién es el único responsable de este entregable y qué fecha exacta revisamos su cumplimiento?"</em></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. PESTAÑA: GENERADOR DE CONTENIDOS IA */}
      {activeTab === 'content_generator' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-6">
          <div className="border-b-2 border-zinc-100 pb-3">
            <h3 className="font-display text-xl font-bold text-zinc-950 flex items-center gap-2 uppercase tracking-wide">
              <Sparkles className="w-5 h-5 text-red-600" />
              Generador de Contenidos Institucionales con IA — {client.name}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Aproveche los datos estratégicos unificados de su diagnóstico aprobado para crear material comercial, discursos y propuestas de valor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'propuesta_valor', label: 'Propuesta de Valor', desc: 'Diferencial para presentar a clientes corporativos' },
              { id: 'brochure', label: 'Brochure Institucional', desc: 'Presentación formal de servicios y capacidades' },
              { id: 'pitch', label: 'Discurso Comercial (Pitch)', desc: 'Guion verbal de 3 minutos para reuniones de venta' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedContentType(item.id as 'propuesta_valor' | 'brochure' | 'pitch')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedContentType === item.id
                    ? 'bg-black text-white border-black ring-2 ring-red-600'
                    : 'bg-white border-zinc-200 hover:border-zinc-900 text-zinc-800'
                }`}
              >
                <h4 className="font-display text-sm font-bold uppercase tracking-wide">{item.label}</h4>
                <p
                  className={`text-[11px] mt-1 font-medium ${
                    selectedContentType === item.id ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  {item.desc}
                </p>
              </button>
            ))}
          </div>

          <div className="flex justify-start">
            <button
              onClick={handleGenerateContent}
              disabled={isGenerating}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-crimson transition-all disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Analizando diagnóstico y redactando...' : 'Generar Contenido con IA'}
            </button>
          </div>

          {generatedContent && (
            <div className="p-6 rounded-2xl bg-zinc-950 text-white border-2 border-zinc-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="font-display text-xs font-bold text-red-400 uppercase tracking-widest">
                  Contenido Generado Listo para Usar
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-1.5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar Texto'}
                  </button>
                </div>
              </div>

              <div className="whitespace-pre-line text-xs text-zinc-200 leading-relaxed font-mono bg-black/60 p-5 rounded-xl border border-zinc-800 max-h-96 overflow-y-auto">
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
