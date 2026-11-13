import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Target, FileText, Calendar, 
  Layers, ChevronRight,
  Activity, Compass, Eye, Mic, ShieldAlert, Plus, ShieldCheck, Folder,
  Briefcase, Download, CheckCircle2
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { ResponseOptionValue } from '../data/diagnosticQuestions';
import { MASTER_PLAN_AXES, INITIAL_MASTER_PLAN_TASKS, INITIAL_PENTAGON_DATA, INITIAL_RISKS } from '../data/masterPlanData';
import { DEFAULT_GS_AXES_META, type GSAxisStrategicMeta } from '../data/gsAxisMetadata';
import { exportOfficialMasterPlanWorkbook } from '../lib/gsOfficialExporter';
import { RelevamientoPropuestaModule } from '../components/views/RelevamientoPropuestaModule';
import { calculateDiagnosticScores } from '../lib/diagnosticEngine';
import type { FullDiagnosticResults } from '../lib/diagnosticEngine';
import { DynamicDiagnosticForm } from '../components/views/DynamicDiagnosticForm';
import { StrategicMatricesView } from '../components/views/StrategicMatricesView';
import { OMBModule } from '../components/views/OMBModule';
import type { ClientStage } from '../components/views/OMBModule';
import { ClientPortalView } from '../components/views/ClientPortalView';
import { QualityApprovalBadge } from '../components/QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../components/QualityApprovalBadge';
import ClientMeetingSession from '../components/views/ClientMeetingSession';
import type { MeetingType } from '../components/views/ClientMeetingSession';
import type { PlannedMeetingData } from '../components/views/ClientMeetingPlanner';
import ClientRecordingsHistory from '../components/views/ClientRecordingsHistory';
import MasterPlanQuarterlyTracking from '../components/views/MasterPlanQuarterlyTracking';
import { DocumentosCliente } from '../components/views/DocumentosCliente';

// Circular Gauge Meter for IME Score (e.g. 7.8 / 10)
function CircularImeMeter({ score = 7.8, maxScore = 10 }: { score: number; maxScore?: number }) {
  const size = 62;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(maxScore, Math.max(0, score));
  const progressPercent = (normalizedScore / maxScore) * 100;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#6B1D2F"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-slate-900 leading-none font-display">{score}</span>
          <span className="text-[8px] text-slate-400 font-medium">/{maxScore}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Madurez IME</span>
        <span className="text-xs font-bold text-slate-900">Score {score} / 10</span>
        <span className="text-[10px] text-slate-400">Meta trienal: 8.0</span>
      </div>
    </div>
  );
}

// Risk Index Card (e.g. 22%)
function RiskIndexMeter({ riskPercentage = 22 }: { riskPercentage: number }) {
  return (
    <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
      <div className="w-11 h-11 rounded-xl bg-[#F9EFF2] border border-[#E6C5CD] flex flex-col items-center justify-center shrink-0">
        <span className="text-xs font-bold font-display text-[#6B1D2F] leading-none">{riskPercentage}%</span>
        <span className="text-[7px] font-bold text-[#6B1D2F] uppercase mt-0.5">IRE</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Índice Riesgo</span>
        <span className="text-xs font-bold text-slate-900">{riskPercentage < 30 ? 'Bajo / Moderado' : 'Crítico'}</span>
        <span className="text-[10px] text-slate-400">Matriz Contingencias</span>
      </div>
    </div>
  );
}

export default function ClientDetail() {
  const { id, section, subAction } = useParams<{ id: string; section?: string; subAction?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active section derived directly from URL route for native browser back/forward history
  const effectiveSection = section || (subAction ? 'meetings' : undefined);

  const activeTab: 'dashboard' | 'relevamiento' | 'omv' | 'diagnostic' | 'matrices' | 'master_plan' | 'portal_preview' | 'meetings' | 'documents' = useMemo(() => {
    if (!effectiveSection || effectiveSection === 'dashboard') return 'dashboard';
    if (effectiveSection === 'relevamiento') return 'relevamiento';
    if (effectiveSection === 'omv' || effectiveSection === 'omb') return 'omv';
    if (effectiveSection === 'diagnostic') return 'diagnostic';
    if (effectiveSection === 'matrices') return 'matrices';
    if (effectiveSection === 'master-plan' || effectiveSection === 'master_plan') return 'master_plan';
    if (effectiveSection === 'meetings') return 'meetings';
    if (effectiveSection === 'portal' || effectiveSection === 'portal_preview') return 'portal_preview';
    if (effectiveSection === 'documents') return 'documents';
    return 'dashboard';
  }, [effectiveSection]);

  const isPlanningMeeting = effectiveSection === 'meetings' && subAction === 'plan';
  const activeMeetingSession = effectiveSection === 'meetings' && subAction === 'live';

  // Tipos de reunión y submódulos (lee del query string si existe e.g. ?type=kickoff)
  const meetingLaunchType: MeetingType = (searchParams.get('type') as MeetingType) || 'diagnostico';
  const [masterPlanSubTab, setMasterPlanSubTab] = useState<'tasks' | 'quarterly_tracking'>('tasks');

  // Modo de visualización: Consultor GS (Back) vs Cliente (Front)
  const viewMode: 'consultor' | 'cliente' = activeTab === 'portal_preview' ? 'cliente' : 'consultor';

  // Client Stage (Roadmap) persisted per client
  const [clientStage, setClientStageState] = useState<ClientStage>(() => {
    try {
      const saved = id ? localStorage.getItem(`gs_client_stage_${id}`) : null;
      if (saved) return saved as ClientStage;
    } catch { /* ignore */ }
    return 'diagnostic_in_progress';
  });

  const setClientStage = (nextStage: ClientStage) => {
    setClientStageState(nextStage);
    if (id) {
      try {
        localStorage.setItem(`gs_client_stage_${id}`, nextStage);
      } catch { /* ignore */ }
    }
  };

  // Strategic Axis Metadata (Brecha, Iniciativa Estratégica, OKRs) per client
  const [axesMeta, setAxesMeta] = useState<GSAxisStrategicMeta[]>(() => {
    try {
      const saved = id ? localStorage.getItem(`gs_axes_meta_${id}`) : null;
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_GS_AXES_META;
  });

  const handleUpdateAxisMeta = (axisId: number, field: 'brechaAsociada' | 'iniciativaEstrategica' | 'okrText', val: string) => {
    const next = axesMeta.map((a) => (a.axisId === axisId ? { ...a, [field]: val } : a));
    setAxesMeta(next);
    if (id) {
      try {
        localStorage.setItem(`gs_axes_meta_${id}`, JSON.stringify(next));
      } catch { /* ignore */ }
    }
  };

  // Client-reported task progress updates from Client Portal
  const [clientTaskUpdates, setClientTaskUpdates] = useState<Record<string, { suggestedStatus: string; progress: number; note: string; updatedAt: string }>>(() => {
    try {
      const saved = id ? localStorage.getItem(`gs_client_task_updates_${id}`) : null;
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {};
  });

  const handleAcceptClientTaskUpdate = (code: string) => {
    const upd = clientTaskUpdates[code];
    if (!upd) return;
    const updatedTasks = tasks.map((t) =>
      t.code === code
        ? { ...t, status: upd.suggestedStatus as any, progress: upd.progress }
        : t
    );
    setTasks(updatedTasks);
    if (id) {
      localStorage.setItem(`gs_master_plan_tasks_${id}`, JSON.stringify(updatedTasks));
    }
    const nextUpdates = { ...clientTaskUpdates };
    delete nextUpdates[code];
    setClientTaskUpdates(nextUpdates);
    if (id) {
      localStorage.setItem(`gs_client_task_updates_${id}`, JSON.stringify(nextUpdates));
    }
  };

  // Audit and Approval Statuses (Rojo - Verde) scoped strictly per client
  const [diagApproval, setDiagApproval] = useState<ApprovalStatus>('draft_review');
  const [diagAudit, setDiagAudit] = useState<AuditConsultants>({
    leaderConsultant: 'Martín Gómez (Consultor Senior)',
    editorConsultant: 'Lucía Fernández (Consultora de Procesos)',
    approvedBy: 'Abel (Director de Metodología GS)',
    notes: 'En revisión de control de calidad interno antes de presentar al cliente.'
  });

  const [omvApproval, setOmvApproval] = useState<ApprovalStatus>('draft_review');
  const [omvAudit, setOmvAudit] = useState<AuditConsultants>({
    leaderConsultant: 'Abel (Director de Metodología GS)',
    approvedBy: 'Abel (Director de Metodología GS)',
    approvedAt: '20 Ago 2026',
    notes: 'OMB Rev 0 validado por el cliente en sesión de Kickoff.'
  });

  const [masterPlanApproval, setMasterPlanApproval] = useState<ApprovalStatus>('draft_review');
  const [masterPlanAudit, setMasterPlanAudit] = useState<AuditConsultants>({
    leaderConsultant: 'Martín Gómez (Consultor Senior)',
    editorConsultant: 'Lucas (Consultor de Implementación)',
    notes: 'Master Plan de 5 ejes estructurado según Diagnóstico 360°.'
  });

  const EJEMPLO_SAS_ID = '532a0405-02c2-4e45-8f77-c24bf13ea9de';
  const EJEMPLO_SAS_DEFAULT_ANSWERS: Record<number, ResponseOptionValue> = {
    1: 'partial_dev',
    101: 'partial_dev',
    2: 'informal_active',
    102: 'partial_dev',
    3: 'partial_dev',
    4: 'informal_active',
    5: 'partial_dev',
    201: 'partial_dev',
    202: 'informal_active',
    6: 'informal_active',
    7: 'partial_dev',
    8: 'informal_active',
    9: 'partial_dev',
    301: 'partial_dev',
    10: 'informal_active',
    11: 'partial_dev',
    12: 'informal_active',
    401: 'partial_dev',
    13: 'informal_active',
    14: 'partial_dev',
    15: 'informal_active',
    501: 'partial_dev',
    16: 'informal_active',
    17: 'partial_dev',
    18: 'informal_active',
    19: 'partial_dev',
    20: 'partial_dev',
    701: 'partial_dev',
    21: 'informal_active',
    22: 'partial_dev',
    23: 'partial_dev',
    24: 'partial_dev',
    25: 'partial_dev',
    26: 'partial_dev'
  };

  // Diagnostic Structured Answers (Respuestas cerradas) scoped per client
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<number, ResponseOptionValue>>({});

  // Cálculo Dinámico en Tiempo Real (Motor Matemático)
  const diagnosticResults: FullDiagnosticResults = useMemo(() => {
    return calculateDiagnosticScores(diagnosticAnswers);
  }, [diagnosticAnswers]);

  // Master Plan State scoped per client
  const [tasks, setTasks] = useState(INITIAL_MASTER_PLAN_TASKS);
  const [selectedAxis, setSelectedAxis] = useState<number | 'all'>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskCode, setNewTaskCode] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAxis, setNewTaskAxis] = useState<number>(1);
  const [newTaskPriority, setNewTaskPriority] = useState<'Alta' | 'Media' | 'Baja'>('Alta');
  const [newTaskResponsible, setNewTaskResponsible] = useState('Socio / Líder de Área');

  // Pentagon State & Historical Comparison
  const [pentagonData] = useState(INITIAL_PENTAGON_DATA);
  const [selectedPentagonPeriod, setSelectedPentagonPeriod] = useState<string>('LB');

  // Meetings & Planning State
  const [meetings, setMeetings] = useState<any[]>([]);
  const [minuteApprovals, setMinuteApprovals] = useState<Record<string, boolean>>({});
  const [plannedSession, setPlannedSession] = useState<PlannedMeetingData | null>(null);

  const fetchClientData = async () => {
    setLoading(true);
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id as string)
      .single();

    if (org) setClient(org);

    // 1. Reset and load Diagnostic Answers strictly for this client (no cross-client bleed)
    let clientAnswers: Record<number, ResponseOptionValue> =
      id === EJEMPLO_SAS_ID ? { ...EJEMPLO_SAS_DEFAULT_ANSWERS } : {};

    const { data: diagResp } = await (supabase
      .from('diagnostic_responses') as any)
      .select('*')
      .eq('organization_id', id as string)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (diagResp?.answers && Object.keys(diagResp.answers).length > 0) {
      const normalizedAnswers: Record<number, ResponseOptionValue> = {};
      Object.entries(diagResp.answers).forEach(([key, val]) => {
        const qId = Number(key.replace('q_', ''));
        if (!isNaN(qId)) {
          if (typeof val === 'string') {
            normalizedAnswers[qId] = val as ResponseOptionValue;
          } else if (val && typeof val === 'object' && 'value' in (val as any)) {
            normalizedAnswers[qId] = (val as any).value as ResponseOptionValue;
          }
        }
      });
      if (Object.keys(normalizedAnswers).length > 0) {
        clientAnswers = { ...clientAnswers, ...normalizedAnswers };
      }
    }

    try {
      const localSaved = localStorage.getItem(`gs_diag_answers_${id}`);
      if (localSaved) {
        const parsedLocal = JSON.parse(localSaved);
        clientAnswers = { ...clientAnswers, ...parsedLocal };
      }
    } catch (e) {
      console.warn('Error reading local diag answers:', e);
    }

    setDiagnosticAnswers(clientAnswers);

    // 2. Load Quality Approvals (Rojo vs Verde) for this client
    let nextOmv: ApprovalStatus = id === EJEMPLO_SAS_ID ? 'approved_published' : 'draft_review';
    let nextDiag: ApprovalStatus = id === EJEMPLO_SAS_ID ? 'approved_published' : 'draft_review';
    let nextMp: ApprovalStatus = id === EJEMPLO_SAS_ID ? 'approved_published' : 'draft_review';

    const { data: dbApprovals } = await (supabase.from('quality_approvals') as any)
      .select('entity_type, approval_status')
      .eq('organization_id', id as string);

    if (dbApprovals && dbApprovals.length > 0) {
      const omvRow = dbApprovals.find((a: any) => a.entity_type === 'omv');
      const diagRow = dbApprovals.find((a: any) => a.entity_type === 'diagnostic_360');
      const mpRow = dbApprovals.find((a: any) => a.entity_type === 'master_plan');
      if (omvRow) nextOmv = omvRow.approval_status === 'approved' || omvRow.approval_status === 'approved_published' ? 'approved_published' : 'draft_review';
      if (diagRow) nextDiag = diagRow.approval_status === 'approved' || diagRow.approval_status === 'approved_published' ? 'approved_published' : 'draft_review';
      if (mpRow) nextMp = mpRow.approval_status === 'approved' || mpRow.approval_status === 'approved_published' ? 'approved_published' : 'draft_review';
    }

    const localAppRaw = localStorage.getItem(`gs_approvals_${id}`);
    if (localAppRaw) {
      try {
        const parsed = JSON.parse(localAppRaw);
        if (parsed.omv) nextOmv = parsed.omv;
        if (parsed.diagnostic_360) nextDiag = parsed.diagnostic_360;
        if (parsed.master_plan) nextMp = parsed.master_plan;
      } catch {
        // ignore
      }
    }

    setOmvApproval(nextOmv);
    setDiagApproval(nextDiag);
    setMasterPlanApproval(nextMp);

    // 3. Load Master Plan Tasks strictly for this client
    const localTasksRaw = localStorage.getItem(`gs_master_plan_tasks_${id}`);
    if (localTasksRaw) {
      try {
        setTasks(JSON.parse(localTasksRaw));
      } catch {
        setTasks(id === EJEMPLO_SAS_ID ? INITIAL_MASTER_PLAN_TASKS : []);
      }
    } else if (id === EJEMPLO_SAS_ID) {
      setTasks(INITIAL_MASTER_PLAN_TASKS);
    } else {
      const { data: dbTasks } = await (supabase.from('master_plan_tasks') as any)
        .select('*')
        .eq('organization_id', id as string)
        .order('code', { ascending: true });
      if (dbTasks && dbTasks.length > 0) {
        setTasks(
          dbTasks.map((t: any, idx: number) => ({
            id: String(t.id || idx + 1),
            axis: t.axis || 1,
            axisName: MASTER_PLAN_AXES.find((a) => a.id === (t.axis || 1))?.name || `Eje ${t.axis || 1}`,
            code: t.code,
            title: t.title,
            priority: (t.priority === 'ALTA' ? 'Alta' : t.priority === 'BAJA' ? 'Baja' : 'Media') as 'Alta' | 'Media' | 'Baja',
            startDate: t.start_date || 'Ago 2026',
            dueDate: t.due_date || 'Nov 2026',
            status: (t.status || 'SIN INICIAR').toUpperCase() as any,
            assignedRole: t.assigned_role || 'Líder de Área',
            progress: t.progress || 0,
          }))
        );
      } else {
        setTasks([]);
      }
    }

    // 4. Load Meetings & Minutes
    const { data: mtgs } = await supabase
      .from('meetings')
      .select('*, minutes(*)')
      .eq('organization_id', id as string)
      .order('meeting_date', { ascending: false });

    if (mtgs) {
      setMeetings(mtgs);
      const localMinRaw = localStorage.getItem(`gs_minute_approvals_${id}`);
      const parsedMin: Record<string, boolean> = localMinRaw ? JSON.parse(localMinRaw) : {};
      for (const m of mtgs as any[]) {
        const mins = Array.isArray(m.minutes) ? m.minutes : m.minutes ? [m.minutes] : [];
        for (const min of mins) {
          if (parsedMin[min.id] === undefined) {
            parsedMin[min.id] = min.status === 'approved' || min.status === 'published' || min.quality_status === 'approved';
          }
        }
      }
      setMinuteApprovals(parsedMin);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const handleAnswerChange = (questionId: number, value: ResponseOptionValue) => {
    setDiagnosticAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      if (id) {
        localStorage.setItem(`gs_diag_answers_${id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleSaveDiagnostic = async () => {
    if (id) {
      localStorage.setItem(`gs_diag_answers_${id}`, JSON.stringify(diagnosticAnswers));
    }
    try {
      const { error } = await (supabase
        .from('diagnostic_responses') as any)
        .upsert([{
          organization_id: id as string,
          answers: diagnosticAnswers,
          pentagon_calculated: diagnosticResults.pentagon,
          ime_score: diagnosticResults.globalIme,
          ire_score: diagnosticResults.globalIre,
          status: 'completed'
        }]);

      if (error) throw error;
      alert('¡Diagnóstico guardado con éxito en Supabase! Indicadores y matrices recalculados.');
    } catch (err: any) {
      console.error('Error guardando diagnóstico:', err);
      alert('¡Diagnóstico guardado localmente! (Nota: ' + (err?.message || 'sincronizado') + ')');
    }
  };

  // Persistencia de auditoría de control de calidad (Rojo - Verde)
  const handleQualityApprovalChange = async (
    entityType: 'diagnostic_360' | 'omv' | 'master_plan' | 'minute',
    newStatus: ApprovalStatus,
    audit: AuditConsultants
  ) => {
    const nextApprovals = {
      omv: entityType === 'omv' ? newStatus : omvApproval,
      diagnostic_360: entityType === 'diagnostic_360' ? newStatus : diagApproval,
      master_plan: entityType === 'master_plan' ? newStatus : masterPlanApproval,
    };

    if (entityType === 'diagnostic_360') {
      setDiagApproval(newStatus);
      setDiagAudit(audit);
    } else if (entityType === 'omv') {
      setOmvApproval(newStatus);
      setOmvAudit(audit);
    } else if (entityType === 'master_plan') {
      setMasterPlanApproval(newStatus);
      setMasterPlanAudit(audit);
    }

    if (id) {
      localStorage.setItem(`gs_approvals_${id}`, JSON.stringify(nextApprovals));
    }

    try {
      await (supabase.from('quality_approvals') as any)
        .delete()
        .eq('organization_id', id as string)
        .eq('entity_type', entityType);

      await (supabase.from('quality_approvals') as any).insert([{
        organization_id: id as string,
        entity_type: entityType,
        entity_id: id as string,
        approval_status: newStatus === 'approved_published' ? 'approved' : 'in_review',
        consultant_name: audit.approvedBy || audit.leaderConsultant || 'Consultor GS',
        quality_score: newStatus === 'approved_published' ? 9.8 : 0,
        comments: audit.notes || (newStatus === 'approved_published' ? 'Aprobado formalmente y publicado al portal del cliente.' : 'Puesto en revisión interna.'),
        reviewed_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn('Could not record quality approval log to Supabase:', err);
    }
  };

  const handleTaskStatusChange = async (code: string, newStatus: string) => {
    const updated = tasks.map((t) =>
      t.code === code
        ? {
            ...t,
            status: newStatus as any,
            progress: newStatus === 'FINALIZADO' ? 100 : newStatus === 'EN PROCESO' ? 55 : 0,
          }
        : t
    );
    setTasks(updated);
    if (id) {
      localStorage.setItem(`gs_master_plan_tasks_${id}`, JSON.stringify(updated));
    }
    try {
      await (supabase.from('master_plan_tasks') as any)
        .update({ status: newStatus, progress: newStatus === 'FINALIZADO' ? 100 : newStatus === 'EN PROCESO' ? 55 : 0 })
        .eq('organization_id', id as string)
        .eq('code', code);
    } catch {
      // ignore
    }
  };

  const handleCreateMasterPlanTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const axisObj = MASTER_PLAN_AXES.find((a) => a.id === newTaskAxis) || MASTER_PLAN_AXES[0];
    const generatedCode = newTaskCode.trim() || `${newTaskAxis}.${tasks.filter((t) => t.axis === newTaskAxis).length + 1}`;
    const newItem = {
      id: `mpe_${Date.now()}`,
      axis: newTaskAxis,
      axisName: axisObj.name,
      code: generatedCode,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      startDate: 'Ago 2026',
      dueDate: 'Nov 2026',
      status: 'SIN INICIAR' as const,
      assignedRole: newTaskResponsible.trim() || 'Líder de Área',
      progress: 0,
    };
    const updated = [...tasks, newItem];
    setTasks(updated);
    if (id) {
      localStorage.setItem(`gs_master_plan_tasks_${id}`, JSON.stringify(updated));
    }
    try {
      await (supabase.from('master_plan_tasks') as any).insert([{
        organization_id: id as string,
        axis: newTaskAxis,
        code: generatedCode,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        status: 'SIN INICIAR',
        assigned_role: newTaskResponsible.trim() || 'Líder de Área',
        progress: 0,
      }]);
    } catch {
      // ignore
    }
    setIsNewTaskModalOpen(false);
    setNewTaskCode('');
    setNewTaskTitle('');
  };

  const handleToggleMinuteApproval = async (minuteId: string) => {
    const current = minuteApprovals[minuteId] ?? true;
    const nextVal = !current;
    const updated = { ...minuteApprovals, [minuteId]: nextVal };
    setMinuteApprovals(updated);
    if (id) {
      localStorage.setItem(`gs_minute_approvals_${id}`, JSON.stringify(updated));
    }
    try {
      await (supabase.from('minutes') as any)
        .update({
          status: nextVal ? 'published' : 'draft',
          quality_status: nextVal ? 'approved' : 'in_review',
        })
        .eq('id', minuteId);
    } catch {
      // ignore
    }
  };

  // Despacho de notificaciones oficiales por WhatsApp al grupo del cliente
  const handleSendWhatsAppNotification = async (moduleName: string) => {
    if (!client) return;
    const portalUrl = `${window.location.origin}/portal/${client.id}`;
    const message = `🔔 *CONSULTORA GS - NOTIFICACIÓN ESTRATÉGICA*\n\nEstimado equipo de *${client.name}*:\nLes informamos que se ha aprobado y publicado oficialmente el módulo: *${moduleName}*.\n\nPueden acceder al Portal de Gestión Estratégica con su código de acceso:\n🔑 Código: *${client.portal_access_code || 'GS-DEMO-2026'}*\n🔗 Enlace: ${portalUrl}\n\n_Consultora GS · Metodología GrowLabs_`;

    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          organization_id: client.id,
          number: client.whatsapp_group_id || client.phone || '5491100000000',
          message: message
        }
      });
      if (error) throw error;
      alert(`✅ Notificación enviada con éxito al WhatsApp del cliente (${client.name}).`);
    } catch (err: any) {
      console.warn('Edge function send-whatsapp no disponible o error:', err);
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  // Comparativa del Radar: Período Seleccionado vs Actual en Vivo vs Meta Trienal
  const currentPeriod = pentagonData.find(p => p.periodCode === selectedPentagonPeriod) || pentagonData[0];
  const metaPeriod = pentagonData[pentagonData.length - 1];

  const radarChartData = [
    { subject: 'Gobernanza', Baseline: currentPeriod.gobernanza, Actual: diagnosticResults.pentagon.directorio || 5.0, Meta: metaPeriod.gobernanza },
    { subject: 'Procesos', Baseline: currentPeriod.procesos, Actual: diagnosticResults.pentagon.procesos || 3.7, Meta: metaPeriod.procesos },
    { subject: 'Finanzas', Baseline: currentPeriod.finanzas, Actual: diagnosticResults.pentagon.finanzas || 4.0, Meta: metaPeriod.finanzas },
    { subject: 'Talento', Baseline: currentPeriod.talento, Actual: diagnosticResults.pentagon.talento || 6.0, Meta: metaPeriod.talento },
    { subject: 'Comercial', Baseline: currentPeriod.comercial, Actual: diagnosticResults.pentagon.comercial || 5.5, Meta: metaPeriod.comercial },
  ];

  const answeredQuestionsCount = Object.keys(diagnosticAnswers).length;
  const totalQuestionsCatalog = 100;
  const profileProgressPercent = Math.min(100, Math.round((answeredQuestionsCount / totalQuestionsCatalog) * 100));

  if (loading) return <div className="p-8 text-center text-zinc-500 font-bold font-display uppercase tracking-wider">Cargando información del cliente...</div>;
  if (!client) return <div className="p-8 text-center text-zinc-500 font-bold font-display uppercase tracking-wider">Cliente no encontrado.</div>;

  // VISTA CLIENTE EXCLUSIVA (FRONT)
  if (viewMode === 'cliente') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="bg-black text-white border-2 border-red-600 px-5 py-3 rounded-2xl flex items-center justify-between text-xs font-bold font-display uppercase tracking-wider shadow-crimson">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            Modo Portal Cliente (Front Activo) • Visualización de datos oficiales aprobados
          </span>
          <button
            onClick={() => navigate(`/clients/${id}`)}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors border border-red-500"
          >
            Volver a Modo Consultor GS (Back)
          </button>
        </div>
        <ClientPortalView
          client={client}
          results={diagnosticResults}
          isOmvApproved={omvApproval === 'approved_published'}
          isDiagnosticApproved={diagApproval === 'approved_published'}
          isMasterPlanApproved={masterPlanApproval === 'approved_published'}
          masterPlanTasks={tasks.map((t) => ({
            code: t.code,
            axis: t.axis || 1,
            axisName: t.axisName,
            title: t.title,
            priority: t.priority,
            status: t.status,
            responsible: t.assignedRole,
            dueDate: t.dueDate,
            progress: t.progress,
          }))}
        />
      </div>
    );
  }

  // VISTA CONSULTOR GS (BACK)
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Principal con Avance en el Perfil del Cliente & Executive Gauges */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-200 pb-5 bg-white p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (subAction) {
                navigate(`/clients/${id}/meetings`);
              } else if (effectiveSection && effectiveSection !== 'dashboard') {
                navigate(`/clients/${id}`);
              } else {
                navigate('/clients');
              }
            }}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title={subAction ? "Volver a Reuniones" : (effectiveSection && effectiveSection !== 'dashboard') ? "Volver al Dashboard del Cliente" : "Volver al Directorio de Clientes"}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900">{client.name}</h1>
              <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {client.industry || 'Empresa SAS'}
              </span>
              <span className="inline-flex items-center rounded-lg bg-[#F9EFF2] border border-[#E6C5CD] px-2.5 py-0.5 text-xs font-semibold text-[#6B1D2F]">
                {clientStage === 'relevamiento'
                  ? '0. Relevamiento & Propuesta'
                  : clientStage === 'kickoff_omv'
                    ? '1. Kickoff & OMV'
                    : clientStage === 'diagnostic_in_progress'
                      ? '2. Diagnóstico 360° en curso'
                      : clientStage === 'diagnostic_closed'
                        ? '3. Diagnóstico cerrado'
                        : '4. Master Plan activo'}
              </span>
            </div>

            {/* Barra y Estadísticas de Avance en el Perfil del Cliente */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Compass className="w-3.5 h-3.5 text-[#6B1D2F]" />
                <span>Avance de Perfil: <strong className="text-slate-900 font-semibold">{answeredQuestionsCount} / {totalQuestionsCatalog}</strong> ({profileProgressPercent}%)</span>
              </div>
              <div className="w-32 bg-slate-100 border border-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#6B1D2F] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${profileProgressPercent}%` }} 
                />
              </div>
              <div 
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-700 font-mono text-[11px] border border-slate-200 shadow-xs"
                title="Identificador único del cliente para blindaje de grabaciones y datos"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>id_cliente: <strong className="text-slate-900 font-mono font-semibold">{client.id}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Gauges: IME 7.8/10 circular meter, Risk Index 22% & Link al Portal Cliente */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <CircularImeMeter 
            score={diagnosticResults.globalIme10 || 7.8} 
            maxScore={10} 
          />
          <RiskIndexMeter 
            riskPercentage={diagnosticResults.globalIre || 22} 
          />
          <Link
            to={`/portal/${client.id}`}
            className="px-3.5 py-2.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
            title="Abrir portal oficial del cliente en su propia página"
          >
            <Eye className="w-4 h-4" />
            Abrir Portal Cliente ({client.portal_access_code || 'GS-DEMO-2026'})
          </Link>
        </div>
      </div>

      {/* Panel de Gobernanza Consultor GS: Qué puede ver este Cliente en su Portal (Semáforo Rojo / Verde) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B1D2F] block">
              Control de Visibilidad del Cliente • Código Portal: <strong className="font-mono text-slate-900">{client.portal_access_code || 'GS-DEMO-2026'}</strong>
            </span>
            <p className="text-xs text-slate-600">
              Active en <strong className="text-emerald-700">VERDE (Publicado)</strong> los módulos que <strong>{client.name}</strong> tiene permitido visualizar, o pase a <strong className="text-red-700">ROJO (Revisión Interna)</strong> para ocultarlos del Portal del Cliente.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {[
            {
              key: 'omv' as const,
              label: '1. Visión 2029 (OMB)',
              status: omvApproval,
              audit: omvAudit,
            },
            {
              key: 'diagnostic_360' as const,
              label: '2. Diagnóstico 360° & Pentágono',
              status: diagApproval,
              audit: diagAudit,
            },
            {
              key: 'master_plan' as const,
              label: '3. Master Plan (5 Ejes)',
              status: masterPlanApproval,
              audit: masterPlanAudit,
            },
          ].map((item) => {
            const isApproved = item.status === 'approved_published';
            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  handleQualityApprovalChange(
                    item.key,
                    isApproved ? 'draft_review' : 'approved_published',
                    item.audit
                  )
                }
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                  isApproved
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                }`}
                title="Clic para alternar visibilidad en el Portal de este Cliente"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isApproved ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                />
                {item.label}: {isApproved ? 'Visible (Verde)' : 'Oculto (Rojo)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs Principales de la Plataforma con URLs Propias para Historial de Navegación */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'dashboard', path: `/clients/${id}`, name: 'Dashboard 360', icon: Activity },
            { id: 'relevamiento', path: `/clients/${id}/relevamiento`, name: '0. Relevamiento & Propuesta', icon: Briefcase },
            { id: 'omv', path: `/clients/${id}/omb`, name: '1. Kickoff & OMV', icon: Compass },
            { id: 'diagnostic', path: `/clients/${id}/diagnostic`, name: '2. Diagnóstico 360°', icon: FileText, badge: `${diagnosticResults.progressPercentage}%` },
            { id: 'matrices', path: `/clients/${id}/matrices`, name: '3. Matrices & Riesgos', icon: Layers },
            { id: 'master_plan', path: `/clients/${id}/master-plan`, name: '4. Master Plan', icon: Target },
            { id: 'documents', path: `/clients/${id}/documents`, name: 'Gestor Documental', icon: Folder },
            { id: 'meetings', path: `/clients/${id}/meetings`, name: 'Reuniones & Minutas', icon: Calendar },
            { id: 'portal_preview', path: `/clients/${id}/portal`, name: 'Portal Cliente', icon: Eye }
          ].map(tab => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-2 whitespace-nowrap py-2.5 px-3.5 border-b-2 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-[#6B1D2F] text-[#6B1D2F] font-semibold bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-[#6B1D2F]' : 'text-slate-400'}`} />
              {tab.name}
              {tab.badge && (
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                  activeTab === tab.id ? 'bg-[#6B1D2F] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* TAB 1: DASHBOARD 360 */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Direct Audio & Transcription Automatic Card */}
          <div className="bg-zinc-950 text-white p-6 rounded-2xl border-2 border-zinc-900 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-display text-[11px] font-bold uppercase tracking-widest text-red-400">
                  Flujo Automático de Relevamiento
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-display uppercase tracking-tight">
                Grabar o Subir Audio → Responder las 100 Preguntas + Generar Informe y Minuta
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Toma el audio de la sesión (grabándolo en vivo o subiendo el archivo). El sistema identifica automáticamente cuáles de las <strong>100 preguntas</strong> se pueden responder, las contesta en el perfil ({answeredQuestionsCount}/100 respondidas) y genera el Informe con las Minutas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => navigate(`/clients/${id}/meetings/live`)}
                className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-display text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                Grabar / Subir Audio Ahora
              </button>
            </div>
          </div>

          {/* Polished Pentagon Radar Chart & Recent Recordings Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pentagon Radar Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Pentágono de Madurez (5 Ejes Estratégicos)
                  </h2>
                  <p className="text-xs text-slate-500">Comparativa histórica: {currentPeriod.label} vs. Actual en Vivo vs. Meta (8.2)</p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1 text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> {currentPeriod.periodCode} ({currentPeriod.imeActual})
                    </span>
                    <span className="flex items-center gap-1 text-[#6B1D2F] font-semibold">
                      <span className="h-2 w-2 rounded-full bg-[#6B1D2F]" /> Actual ({diagnosticResults.globalIme10})
                    </span>
                    <span className="flex items-center gap-1 text-slate-900 font-medium">
                      <span className="h-2 w-2 rounded-full bg-slate-900" /> Meta ({metaPeriod.imeActual})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md pb-0.5">
                    {pentagonData.map(p => (
                      <button
                        key={p.periodCode}
                        onClick={() => setSelectedPentagonPeriod(p.periodCode)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                          selectedPentagonPeriod === p.periodCode
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={p.label}
                      >
                        {p.periodCode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-80 w-full min-h-[320px] min-w-[280px]">
                <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={300}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#94a3b8" />
                    <Tooltip />
                    <Radar name="Línea Base" dataKey="Baseline" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} />
                    <Radar name="Actual" dataKey="Actual" stroke="#6B1D2F" fill="#6B1D2F" fillOpacity={0.32} strokeWidth={2} />
                    <Radar name="Meta Trienal" dataKey="Meta" stroke="#0f172a" fill="#0f172a" fillOpacity={0.08} strokeDasharray="3 3" strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Critical Risks Column */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#6B1D2F]" /> Focos Críticos de Riesgo
                </h2>
                <p className="text-xs text-slate-500 mb-4">Vulnerabilidades de impacto directo en la gobernanza</p>

                <div className="space-y-3 overflow-y-auto max-h-[250px]">
                  {diagnosticResults.risks.slice(0, 3).map(r => (
                    <div key={r.id} className="p-3 bg-[#F9EFF2]/70 border border-[#E6C5CD] rounded-xl">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                        <span>{r.code} • {r.category}</span>
                        <span className="bg-[#6B1D2F] text-white px-1.5 py-0.2 rounded text-[9px] font-medium">{r.severityLevel}</span>
                      </div>
                      <p className="text-xs text-slate-900 font-medium mt-1">{r.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1 italic">Acción: {r.suggestedAction}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Total detectados: {diagnosticResults.risks.length}</span>
                <button
                  onClick={() => navigate(`/clients/${id}/matrices`)}
                  className="text-xs font-semibold text-[#6B1D2F] hover:underline"
                >
                  Ver Matriz de Riesgos →
                </button>
              </div>
            </div>
          </div>

          {/* Quick Recordings Preview Strip */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#6B1D2F]" />
                <h3 className="font-display text-base font-bold text-slate-900">
                  Grabaciones Recientes de Sesiones ({meetings.length})
                </h3>
              </div>
              <button
                onClick={() => navigate(`/clients/${id}/meetings`)}
                className="text-xs font-semibold text-[#6B1D2F] hover:underline flex items-center gap-1"
              >
                Ir a Grabaciones & Minutas →
              </button>
            </div>
            
            <ClientRecordingsHistory
              clientId={id as string}
              clientName={client.name}
              onNewRecording={(type) => {
                navigate(`/clients/${id}/meetings/live?type=${type || 'diagnostico'}`);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 0: RELEVAMIENTO COMERCIAL & PROPUESTA PREVIA AL KICKOFF */}
      {activeTab === 'relevamiento' && (
        <RelevamientoPropuestaModule
          client={client}
          onApproveAndGenerateKickoff={(projectCode) => {
            if (id && projectCode) {
              localStorage.setItem(`gs_project_code_${id}`, projectCode);
            }
            setClientStage('kickoff_omv');
            navigate(`/clients/${id}/omb`);
          }}
          onStartRecording={() => {
            navigate(`/clients/${id}/meetings/live?type=relevamiento`);
          }}
        />
      )}

      {/* TAB 1: OMV & KICKOFF (AUDIO & TEXTO EN PRESENTE + 8 TARGETS CVA) */}
      {activeTab === 'omv' && (
        <OMBModule
          client={client}
          stage={clientStage}
          onStageChange={setClientStage}
          approvalStatus={omvApproval}
          auditConsultants={omvAudit}
          onApprovalChange={(status, audit) => handleQualityApprovalChange('omv', status, audit)}
          onSendWhatsApp={() => handleSendWhatsAppNotification('OMV Trienal y Minuta de Kickoff')}
        />
      )}

      {/* TAB 2: DIAGNÓSTICO DINÁMICO 360° */}
      {activeTab === 'diagnostic' && (
        <DynamicDiagnosticForm
          client={client}
          stage={clientStage}
          answers={diagnosticAnswers}
          onAnswerChange={handleAnswerChange}
          onSave={handleSaveDiagnostic}
          approvalStatus={diagApproval}
          auditConsultants={diagAudit}
          onApprovalChange={(status, audit) => handleQualityApprovalChange('diagnostic_360', status, audit)}
          onViewMatrices={() => navigate(`/clients/${id}/matrices`)}
          onSendWhatsApp={() => handleSendWhatsAppNotification('Formulario de Diagnóstico Integral 360°')}
          onOpenAudioSession={() => navigate(`/clients/${id}/meetings/live`)}
        />
      )}

      {/* TAB 4: MATRICES ESTRATÉGICAS */}
      {activeTab === 'matrices' && (
        <StrategicMatricesView
          client={client}
          results={diagnosticResults}
          onBackToQuestions={() => navigate(`/clients/${id}/diagnostic`)}
        />
      )}

      {/* TAB 5: MASTER PLAN ESTRATÉGICO */}
      {activeTab === 'master_plan' && (
        <div className="space-y-6">
          <QualityApprovalBadge
            moduleName="Master Plan Estratégico"
            status={masterPlanApproval}
            audit={masterPlanAudit}
            onStatusChange={(status, audit) => handleQualityApprovalChange('master_plan', status, audit)}
            clientName={client.name}
            onSendWhatsApp={() => handleSendWhatsAppNotification('Master Plan Estratégico')}
          />

          {/* Sub-navegación del Master Plan + Exportación Oficial 6 Hojas (.XLSX) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-zinc-200 pb-3 font-display">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMasterPlanSubTab('tasks')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  masterPlanSubTab === 'tasks'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-red-500" />
                Plan de Acción MPE & Puente AVANCE-EJES
              </button>
              <button
                onClick={() => setMasterPlanSubTab('quarterly_tracking')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  masterPlanSubTab === 'quarterly_tracking'
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Seguimiento Trimestral PENT-PE (3 Meses)
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const projectCode = localStorage.getItem(`gs_project_code_${client.id}`) || '26-030';
                let omvText = '';
                try {
                  const rawRevs = localStorage.getItem(`gs_omb_revisions_${client.id}`);
                  if (rawRevs) {
                    const revs = JSON.parse(rawRevs);
                    const rev0 = revs.find((r: any) => r.isBaselineRev0) || revs[0];
                    if (rev0?.declarationText) omvText = rev0.declarationText;
                  }
                } catch { /* ignore */ }

                exportOfficialMasterPlanWorkbook({
                  projectCode,
                  clientName: client.name,
                  revision: 'd',
                  omvText:
                    omvText ||
                    `Hoy es 2029. ${client.name} opera con Directorio activo, procesos trazables, finanzas previsibles, talento autónomo y motor comercial sistemático.`,
                  globalIme: diagnosticResults.globalIme || 48,
                  globalIre: diagnosticResults.globalIre || 38,
                  axesMeta,
                  tasks,
                  pentagonPeriods: pentagonData,
                  risks: INITIAL_RISKS,
                });
              }}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar Workbook Oficial GS (.XLSX — 6 Hojas con Fórmulas)
            </button>
          </div>

          {/* Bandeja de Avances Reportados por el Cliente desde el Portal */}
          {Object.keys(clientTaskUpdates).length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                  Avances Reportados por el Cliente pendientes de Validación Consultor GS ({Object.keys(clientTaskUpdates).length})
                </span>
                <span className="text-[11px] text-amber-800">
                  Regla GS: El avance del cliente requiere validación humana antes de impactar MPE / PENT-PE
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(clientTaskUpdates).map(([code, upd]) => {
                  const taskObj = tasks.find((x) => x.code === code);
                  return (
                    <div key={code} className="bg-white rounded-xl border border-amber-200 p-3 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-zinc-900">
                          <span className="font-mono text-red-600 mr-1.5">{code}</span>
                          {taskObj?.title || 'Tarea del Master Plan'}
                        </div>
                        <p className="text-zinc-600">
                          Estado sugerido: <strong>{upd.suggestedStatus}</strong> ({upd.progress}%) — <em>"{upd.note}"</em>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcceptClientTaskUpdate(code)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-display text-[10px] font-bold uppercase shrink-0 cursor-pointer"
                      >
                        Validar e Impactar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {masterPlanSubTab === 'quarterly_tracking' ? (
            <MasterPlanQuarterlyTracking
              clientId={id as string}
              clientName={client.name}
              onReviewsUpdated={fetchClientData}
            />
          ) : (
            <>
              {/* Puente AVANCE-EJES en vivo (Coherencia MPE <-> PENT-PE) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-xs font-black uppercase tracking-wider text-slate-900">
                    Puente Oficial AVANCE-EJES (Ejecución Ponderada MPE ↔ Madurez PENT-PE)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tolerancia metodológica GS: ±0,5 pp • Validación humana del consultor antes de actualizar PENT-PE
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  {axesMeta.map((ax) => {
                    const axisTasks = tasks.filter((t) => (t.axis || 1) === ax.axisId);
                    const avgMpePct =
                      axisTasks.length > 0
                        ? Math.round(axisTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / axisTasks.length)
                        : 0;
                    const pentScore =
                      ax.axisId === 1
                        ? diagnosticResults.pentagon.directorio || 5.0
                        : ax.axisId === 2
                          ? diagnosticResults.pentagon.procesos || 3.7
                          : ax.axisId === 3
                            ? diagnosticResults.pentagon.finanzas || 4.0
                            : ax.axisId === 4
                              ? diagnosticResults.pentagon.talento || 6.0
                              : diagnosticResults.pentagon.comercial || 5.5;
                    const pentPct = Math.round(pentScore * 10);
                    return (
                      <div key={ax.axisId} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="font-display font-bold text-slate-900 truncate text-[11px]">
                          Eje {ax.axisId}: {ax.shortName}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">MPE Pond.:</span>
                          <strong className="font-mono text-slate-900">{avgMpePct}%</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">PENT-PE:</span>
                          <strong className="font-mono text-[#6B1D2F]">{pentScore.toFixed(1)} ({pentPct}%)</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 font-display">
                  <button
                    onClick={() => setSelectedAxis('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                      selectedAxis === 'all' ? 'bg-black text-white shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    Todos los Ejes (5)
                  </button>
                  {MASTER_PLAN_AXES.map(axis => (
                    <button
                      key={axis.id}
                      onClick={() => setSelectedAxis(axis.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                        selectedAxis === axis.id ? 'bg-black text-white shadow-sm' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {axis.name.split(':')[0]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-crimson transition-all"
                >
                  <Plus className="h-4 w-4" /> Nueva Acción
                </button>
              </div>

              {/* Ficha Estratégica Editable del Eje (Brecha Asociada, Iniciativa Estratégica, OKRs — Hoja MPE Excel) */}
              {selectedAxis !== 'all' && (() => {
                const currentAxisMeta = axesMeta.find((a) => a.axisId === selectedAxis);
                if (!currentAxisMeta) return null;
                return (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-xs font-black uppercase tracking-wider text-[#6B1D2F]">
                        Cabecera Estratégica Hoja MPE — {currentAxisMeta.fullName}
                      </h4>
                      <span className="text-[11px] text-slate-400">Se exporta directamente al bloque superior del Eje en el Excel Oficial</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Brecha Asociada (Diagnóstico → OMV)</label>
                        <textarea
                          rows={2}
                          value={currentAxisMeta.brechaAsociada}
                          onChange={(e) => handleUpdateAxisMeta(currentAxisMeta.axisId, 'brechaAsociada', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Iniciativa Estratégica Rectora</label>
                        <textarea
                          rows={2}
                          value={currentAxisMeta.iniciativaEstrategica}
                          onChange={(e) => handleUpdateAxisMeta(currentAxisMeta.axisId, 'iniciativaEstrategica', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">OKRs del Eje</label>
                        <textarea
                          rows={2}
                          value={currentAxisMeta.okrText}
                          onChange={(e) => handleUpdateAxisMeta(currentAxisMeta.axisId, 'okrText', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {isNewTaskModalOpen && (
                <div className="bg-zinc-50 p-5 rounded-2xl border-2 border-zinc-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-black uppercase text-zinc-900">
                      Agregar Nueva Acción al Master Plan de {client.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsNewTaskModalOpen(false)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-900"
                    >
                      Cerrar ✕
                    </button>
                  </div>
                  <form onSubmit={handleCreateMasterPlanTask} className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">Eje Pentágono</label>
                      <select
                        value={newTaskAxis}
                        onChange={(e) => setNewTaskAxis(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 font-bold bg-white"
                      >
                        {MASTER_PLAN_AXES.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">Código</label>
                      <input
                        type="text"
                        value={newTaskCode}
                        onChange={(e) => setNewTaskCode(e.target.value)}
                        placeholder="Ej: 1.5.1"
                        className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-zinc-700 mb-1">Acción / Iniciativa *</label>
                      <input
                        type="text"
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Descripción de la acción estratégica..."
                        className="w-full rounded-lg border border-zinc-300 px-2.5 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-zinc-700 mb-1">Responsable</label>
                      <input
                        type="text"
                        value={newTaskResponsible}
                        onChange={(e) => setNewTaskResponsible(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 px-2.5 py-2"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as 'Alta' | 'Media' | 'Baja')}
                        className="rounded-lg border border-zinc-300 px-2 py-2 font-bold bg-white"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold uppercase tracking-wider shrink-0"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="min-w-full divide-y-2 divide-zinc-200 text-xs">
                    <thead className="bg-zinc-900 text-white font-display uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3.5 text-left font-bold">Código</th>
                        <th className="px-4 py-3.5 text-left font-bold">Acción / Iniciativa ({client.name})</th>
                        <th className="px-4 py-3.5 text-left font-bold">Prioridad</th>
                        <th className="px-4 py-3.5 text-left font-bold">Responsable</th>
                        <th className="px-4 py-3.5 text-left font-bold">Plazo</th>
                        <th className="px-4 py-3.5 text-left font-bold">Estado (Interactivo)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {tasks
                        .filter(t => selectedAxis === 'all' || t.axis === selectedAxis)
                        .map((t, idx) => (
                          <tr key={`${t.code}-${idx}`} className="hover:bg-zinc-50">
                            <td className="px-4 py-3 font-mono font-bold text-red-600">{t.code}</td>
                            <td className="px-4 py-3 font-bold text-zinc-950">
                              {t.title}
                              <span className="block text-[10px] font-normal text-zinc-400">{t.axisName}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded font-display font-bold uppercase text-[10px] ${
                                String(t.priority).toUpperCase() === 'ALTA' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-700'
                              }`}>
                                {t.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-700 font-medium">{t.assignedRole}</td>
                            <td className="px-4 py-3 text-zinc-600 font-mono font-semibold">
                              {t.dueDate || '90 días'}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={t.status}
                                onChange={(e) => handleTaskStatusChange(t.code, e.target.value)}
                                className={`px-2.5 py-1 font-display uppercase font-bold text-[10px] rounded border cursor-pointer ${
                                  t.status === 'FINALIZADO'
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : t.status === 'EN PROCESO'
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : t.status === 'RETRASADO'
                                    ? 'bg-red-600 text-white border-red-700'
                                    : 'bg-zinc-900 text-white border-zinc-800'
                                }`}
                              >
                                <option value="SIN INICIAR">SIN INICIAR</option>
                                <option value="EN PROCESO">EN PROCESO</option>
                                <option value="FINALIZADO">FINALIZADO</option>
                                <option value="RETRASADO">RETRASADO</option>
                                <option value="CANCELADO">CANCELADO</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 6: REUNIONES, GRABACIONES CONTINUAS E HISTORIAL IA */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          {(activeMeetingSession || isPlanningMeeting) ? (
            <ClientMeetingSession
              client={client}
              initialMeetingType={plannedSession?.meetingType || meetingLaunchType}
              initialTitle={plannedSession?.title}
              initialQuestions={plannedSession?.selectedQuestions}
              initialStep="recording"
              onBack={() => {
                navigate(`/clients/${id}/meetings`);
                setPlannedSession(null);
                fetchClientData();
              }}
              onDiagnosticUpdated={() => {
                fetchClientData();
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Header Principal Simplificado: Audio -> 100 Preguntas -> Informe y Minuta */}
              <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B1D2F]">
                        Flujo Simplificado Automático • {client.name}
                      </span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight">
                      Audio y Transcripción → 100 Preguntas + Informe y Minutas
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Graba la reunión en vivo o sube un audio. El sistema analiza automáticamente cuáles de las <strong>100 preguntas</strong> se responden en la charla, las contesta en el diagnóstico y genera el <strong>Informe con la Minuta Ejecutiva</strong> en un solo paso.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigate(`/clients/${id}/meetings/live?type=diagnostico`);
                    }}
                    className="px-6 py-3.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-xl font-display text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:scale-105 transition-all self-start sm:self-center shrink-0 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" /> Grabar / Subir Audio Ahora
                  </button>
                </div>
              </div>

              {/* HISTORIAL ORGANIZADO DE GRABACIONES (AUDIO + WHISPER + VALIDACIONES) */}
              <ClientRecordingsHistory
                clientId={id as string}
                clientName={client.name}
                onNewRecording={(type) => {
                  navigate(`/clients/${id}/meetings/live?type=${type || 'diagnostico'}`);
                }}
              />

              {/* Subsección: Minutas Tradicionales de Comités */}
              <div className="space-y-3 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" /> Minutas de Comités y Reuniones Tradicionales ({meetings.length})
                  </h3>
                  <Link
                    to="/meetings"
                    className="text-xs font-semibold text-[#B91C1C] hover:text-[#991B1B]"
                  >
                    Ver Todas las Minutas
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meetings.length === 0 ? (
                    <div className="col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                      No hay minutas tradicionales adicionales registradas.
                    </div>
                  ) : (
                    meetings.map(m => {
                      const mins = Array.isArray(m.minutes) ? m.minutes : m.minutes ? [m.minutes] : [];
                      const firstMin = mins[0];
                      const isMinApproved = firstMin ? (minuteApprovals[firstMin.id] ?? true) : false;
                      return (
                        <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-display font-semibold text-sm text-slate-900">{m.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">Fecha: {new Date(m.meeting_date).toLocaleDateString('es-AR')}</p>
                            </div>
                            {firstMin && (
                              <button
                                type="button"
                                onClick={() => handleToggleMinuteApproval(firstMin.id)}
                                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-colors ${
                                  isMinApproved
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                                }`}
                                title="Clic para publicar u ocultar esta minuta en el Portal del Cliente"
                              >
                                {isMinApproved ? '✓ Publicada en Portal (Verde)' : '✕ Borrador Interno (Rojo)'}
                              </button>
                            )}
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              {isMinApproved ? 'Visible para el cliente' : 'Oculta para el cliente'}
                            </span>
                            <Link
                              to={`/meetings/${m.id}`}
                              className="text-xs font-semibold text-[#B91C1C] hover:text-[#991B1B] flex items-center gap-1"
                            >
                              Ver y Editar Minuta <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: GESTOR DOCUMENTAL (RAG) */}
      {activeTab === 'documents' && (
        <DocumentosCliente
          client={client}
          isClientPortal={effectiveSection === 'portal'}
        />
      )}

      {/* TAB 7: PORTAL PREVIEW */}
      {activeTab === 'portal_preview' && (
        <ClientPortalView
          client={client}
          results={diagnosticResults}
          isOmvApproved={omvApproval === 'approved_published'}
          isDiagnosticApproved={diagApproval === 'approved_published'}
          isMasterPlanApproved={masterPlanApproval === 'approved_published'}
          masterPlanTasks={tasks.map((t) => ({
            code: t.code,
            axis: t.axis || 1,
            axisName: t.axisName,
            title: t.title,
            priority: t.priority,
            status: t.status,
            responsible: t.assignedRole,
            dueDate: t.dueDate,
            progress: t.progress,
          }))}
        />
      )}
    </div>
  );
}
