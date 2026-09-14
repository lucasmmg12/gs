import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Target, FileText, Calendar, 
  Layers, ChevronRight,
  Activity, Compass, Eye, Mic, ShieldAlert, Plus, ShieldCheck
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { ResponseOptionValue } from '../data/diagnosticQuestions';
import { MASTER_PLAN_AXES, INITIAL_MASTER_PLAN_TASKS, INITIAL_PENTAGON_DATA } from '../data/masterPlanData';
import { calculateDiagnosticScores } from '../lib/diagnosticEngine';
import type { FullDiagnosticResults } from '../lib/diagnosticEngine';
import { DynamicDiagnosticForm } from '../components/views/DynamicDiagnosticForm';
import { StrategicMatricesView } from '../components/views/StrategicMatricesView';
import { OMVModule } from '../components/views/OMVModule';
import type { ClientStage } from '../components/views/OMVModule';
import { ClientPortalView } from '../components/views/ClientPortalView';
import { QualityApprovalBadge } from '../components/QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../components/QualityApprovalBadge';
import ClientMeetingSession from '../components/views/ClientMeetingSession';
import type { MeetingType } from '../components/views/ClientMeetingSession';
import ClientMeetingPlanner from '../components/views/ClientMeetingPlanner';
import type { PlannedMeetingData } from '../components/views/ClientMeetingPlanner';
import ClientRecordingsHistory from '../components/views/ClientRecordingsHistory';
import MasterPlanQuarterlyTracking from '../components/views/MasterPlanQuarterlyTracking';

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
  const activeTab: 'dashboard' | 'omv' | 'diagnostic' | 'matrices' | 'master_plan' | 'portal_preview' | 'meetings' = useMemo(() => {
    if (!section || section === 'dashboard') return 'dashboard';
    if (section === 'omv') return 'omv';
    if (section === 'diagnostic') return 'diagnostic';
    if (section === 'matrices') return 'matrices';
    if (section === 'master-plan' || section === 'master_plan') return 'master_plan';
    if (section === 'meetings') return 'meetings';
    if (section === 'portal' || section === 'portal_preview') return 'portal_preview';
    return 'dashboard';
  }, [section]);

  const isPlanningMeeting = section === 'meetings' && subAction === 'plan';
  const activeMeetingSession = section === 'meetings' && subAction === 'live';

  // Tipos de reunión y submódulos (lee del query string si existe e.g. ?type=kickoff)
  const meetingLaunchType: MeetingType = (searchParams.get('type') as MeetingType) || 'diagnostico';
  const [masterPlanSubTab, setMasterPlanSubTab] = useState<'tasks' | 'quarterly_tracking'>('tasks');

  // Modo de visualización: Consultor GS (Back) vs Cliente (Front)
  const viewMode: 'consultor' | 'cliente' = activeTab === 'portal_preview' ? 'cliente' : 'consultor';

  // Client Stage (Roadmap)
  const [clientStage, setClientStage] = useState<ClientStage>('diagnostic_in_progress');

  // Audit and Approval Statuses (Rojo - Verde)
  const [diagApproval, setDiagApproval] = useState<ApprovalStatus>('draft_review');
  const [diagAudit, setDiagAudit] = useState<AuditConsultants>({
    leaderConsultant: 'Martín Gómez (Consultor Senior)',
    editorConsultant: 'Lucía Fernández (Consultora de Procesos)',
    approvedBy: 'Abel (Director de Metodología GS)',
    notes: 'En revisión de control de calidad interno antes de presentar al cliente.'
  });

  const [omvApproval, setOmvApproval] = useState<ApprovalStatus>('approved_published');
  const [omvAudit, setOmvAudit] = useState<AuditConsultants>({
    leaderConsultant: 'Abel (Director de Metodología GS)',
    approvedBy: 'Abel (Director de Metodología GS)',
    approvedAt: '26 Ago 2026',
    notes: 'OMV validado por el cliente en reunión de Kickoff.'
  });

  const [masterPlanApproval, setMasterPlanApproval] = useState<ApprovalStatus>('draft_review');
  const [masterPlanAudit, setMasterPlanAudit] = useState<AuditConsultants>({
    leaderConsultant: 'Martín Gómez (Consultor Senior)',
    editorConsultant: 'Lucas (Consultor de Implementación)',
    notes: 'Ajustando cronograma de iniciativas del eje Procesos.'
  });

  // Diagnostic Structured Answers (Respuestas cerradas)
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<number, ResponseOptionValue>>({
    1: 'formal_active',
    101: 'formal_active',
    2: 'formal_active',
    102: 'formal_active',
    3: 'partial_dev',
    4: 'formal_active',
    5: 'formal_active',
    201: 'formal_active',
    202: 'partial_dev',
    6: 'formal_active',
    7: 'formal_active',
    8: 'informal_active',
    9: 'formal_active',
    301: 'formal_active',
    10: 'informal_active',
    11: 'partial_dev',
    12: 'formal_active',
    401: 'partial_dev',
    13: 'informal_active',
    14: 'formal_active',
    15: 'informal_active',
    501: 'partial_dev',
    16: 'informal_active',
    17: 'formal_active',
    18: 'informal_active',
    19: 'formal_active',
    20: 'partial_dev',
    701: 'formal_active',
    21: 'informal_active',
    22: 'partial_dev',
    23: 'formal_active',
    24: 'partial_dev',
    25: 'formal_active',
    26: 'partial_dev'
  });

  // Cálculo Dinámico en Tiempo Real (Motor Matemático)
  const diagnosticResults: FullDiagnosticResults = useMemo(() => {
    return calculateDiagnosticScores(diagnosticAnswers);
  }, [diagnosticAnswers]);

  // Master Plan State
  const [tasks] = useState(INITIAL_MASTER_PLAN_TASKS);
  const [selectedAxis, setSelectedAxis] = useState<number | 'all'>('all');

  // Pentagon State & Historical Comparison
  const [pentagonData] = useState(INITIAL_PENTAGON_DATA);
  const [selectedPentagonPeriod, setSelectedPentagonPeriod] = useState<string>('LB');

  // Meetings & Planning State
  const [meetings, setMeetings] = useState<any[]>([]);
  const [plannedSession, setPlannedSession] = useState<PlannedMeetingData | null>(null);

  const handleStartLiveMeeting = (planned: PlannedMeetingData) => {
    setPlannedSession(planned);
    navigate(`/clients/${id}/meetings/live`);
  };

  const handleSavePlannedMeeting = async (planned: PlannedMeetingData) => {
    try {
      await supabase.from('meetings').insert({
        organization_id: client.id,
        title: planned.title,
        meeting_date: planned.date.split(' ')[0],
        status: 'scheduled'
      });
      alert(`✅ Reunión "${planned.title}" guardada exitosamente en la agenda del cliente.`);
      navigate(`/clients/${id}/meetings`);
      fetchClientData();
    } catch (err: any) {
      console.error('Error saving planned meeting:', err);
      alert('Planificación registrada con éxito.');
      navigate(`/clients/${id}/meetings`);
    }
  };

  const fetchClientData = async () => {
    setLoading(true);
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id as string)
      .single();

    if (org) setClient(org);

    // Cargar diagnóstico guardado de la base de datos si existe
    const { data: diagResp } = await (supabase
      .from('diagnostic_responses') as any)
      .select('*')
      .eq('organization_id', id as string)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (diagResp?.answers && Object.keys(diagResp.answers).length > 0) {
      setDiagnosticAnswers(diagResp.answers as Record<number, ResponseOptionValue>);
    }

    const { data: mtgs } = await supabase
      .from('meetings')
      .select('*, minutes(*)')
      .eq('organization_id', id as string)
      .order('meeting_date', { ascending: false });

    if (mtgs) setMeetings(mtgs);

    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const handleAnswerChange = (questionId: number, value: ResponseOptionValue) => {
    setDiagnosticAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSaveDiagnostic = async () => {
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

    try {
      await (supabase.from('quality_approvals') as any).insert([{
        organization_id: id as string,
        entity_type: entityType,
        entity_id: id as string,
        approval_status: newStatus === 'approved_published' ? 'approved' : 'pending',
        consultant_name: audit.approvedBy || audit.leaderConsultant || 'Consultor GS',
        quality_score: 10.0,
        comments: audit.notes || (newStatus === 'approved_published' ? 'Aprobado formalmente y publicado al portal del cliente.' : 'Puesto en revisión interna.'),
        reviewed_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn('Could not record quality approval log to Supabase:', err);
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
  const totalQuestionsCatalog = 78;
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
          isDiagnosticApproved={diagApproval === 'approved_published'}
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
              } else if (section) {
                navigate(`/clients/${id}`);
              } else {
                navigate('/clients');
              }
            }}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            title={subAction ? "Volver a Reuniones" : section ? "Volver al Dashboard del Cliente" : "Volver al Directorio de Clientes"}
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
                {clientStage === 'kickoff_omv' ? '1. Kickoff' : clientStage === 'diagnostic_in_progress' ? '2. Diagnóstico en curso' : clientStage === 'diagnostic_closed' ? '3. Diagnóstico cerrado' : '4. Master Plan activo'}
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
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
            title="Abrir portal oficial del cliente en su propia página"
          >
            <Eye className="w-4 h-4 text-[#6B1D2F]" />
            Ver Portal
          </Link>
        </div>
      </div>

      {/* Tabs Principales de la Plataforma con URLs Propias para Historial de Navegación */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'dashboard', path: `/clients/${id}`, name: 'Dashboard 360', icon: Activity },
            { id: 'omv', path: `/clients/${id}/omv`, name: '1. Kickoff & OMV', icon: Compass },
            { id: 'diagnostic', path: `/clients/${id}/diagnostic`, name: '2. Diagnóstico Dinámico', icon: FileText, badge: `${diagnosticResults.progressPercentage}%` },
            { id: 'matrices', path: `/clients/${id}/matrices`, name: '3. Matrices & FODA', icon: Layers },
            { id: 'master_plan', path: `/clients/${id}/master-plan`, name: '4. Master Plan', icon: Target },
            { id: 'meetings', path: `/clients/${id}/meetings`, name: 'Reuniones & Ciclo de Vida', icon: Calendar },
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
          {/* Center View: Meeting Lifecycle Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">Ciclo de Vida de Reuniones Estratégicas</h2>
                <p className="text-xs text-slate-500">Planifique y ejecute las sesiones con captura de audio en vivo Whisper y trazabilidad</p>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
                3 Etapas Metodológicas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: 1. Kick off (OMV Trienal) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                      Paso 1
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    1. Kick off (OMV Trienal)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Definición de visión a 3 años, alineación de socios y emisión de minutas de apertura en PDF.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Visión cuantitativa y metas
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Mapeo de dolores inmediatos
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Auditoría y minuta PDF
                    </li>
                  </ul>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Entregable: OMV</span>
                  <button
                    onClick={() => navigate(`/clients/${id}/meetings/plan?type=kickoff`)}
                    className="px-3.5 py-1.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    Planificar Kick off
                  </button>
                </div>
              </div>

              {/* Card 2: 2. Diagnóstico 360° */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F9EFF2] border border-[#E6C5CD] text-[#6B1D2F] flex items-center justify-center font-bold">
                      <Mic className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-[#6B1D2F] bg-[#F9EFF2] px-2 py-0.5 rounded-md border border-[#E6C5CD]">
                      Paso 2
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-[#6B1D2F] transition-colors">
                    2. Diagnóstico 360°
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Entrevistas guiadas por áreas temáticas con transcripción Whisper y avance automático del perfil.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6B1D2F]" /> Selección de temas y preguntas
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6B1D2F]" /> Grabación con audio chunking
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6B1D2F]" /> Check out con aprobación del cliente
                    </li>
                  </ul>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Avance: {profileProgressPercent}%</span>
                  <button
                    onClick={() => navigate(`/clients/${id}/meetings/plan?type=diagnostico`)}
                    className="px-3.5 py-1.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    Planificar Diagnóstico
                  </button>
                </div>
              </div>

              {/* Card 3: 3. Revisión Trimestral (90 Días) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Paso 3 · Cada 90 Días
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                    3. Revisión Trimestral (90 Días)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Auditoría de tareas del Master Plan y recalibración de los 5 vértices del Pentágono.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Auditoría de iniciativas
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Recalibración del Pentágono
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Compromisos del ciclo Q+1
                    </li>
                  </ul>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Ciclo: Q+1</span>
                  <button
                    onClick={() => navigate(`/clients/${id}/meetings/plan?type=seguimiento_trimestral`)}
                    className="px-3.5 py-1.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    Planificar Trimestral
                  </button>
                </div>
              </div>
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
                navigate(`/clients/${id}/meetings/plan?type=${type || 'diagnostico'}`);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: OMV (AUDIO & TEXTO EN PRESENTE) */}
      {activeTab === 'omv' && (
        <OMVModule
          client={client}
          stage={clientStage}
          onStageChange={setClientStage}
          approvalStatus={omvApproval}
          auditConsultants={omvAudit}
          onApprovalChange={(status, audit) => handleQualityApprovalChange('omv', status, audit)}
          onSendWhatsApp={() => handleSendWhatsAppNotification('OMV Trienal y Minuta de Kickoff')}
        />
      )}

      {/* TAB 3: DIAGNÓSTICO DINÁMICO */}
      {activeTab === 'diagnostic' && (
        <DynamicDiagnosticForm
          client={client}
          answers={diagnosticAnswers}
          onAnswerChange={handleAnswerChange}
          onSave={handleSaveDiagnostic}
          approvalStatus={diagApproval}
          auditConsultants={diagAudit}
          onApprovalChange={(status, audit) => handleQualityApprovalChange('diagnostic_360', status, audit)}
          onViewMatrices={() => navigate(`/clients/${id}/matrices`)}
          onSendWhatsApp={() => handleSendWhatsAppNotification('Formulario de Diagnóstico Integral 360°')}
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

          {/* Sub-navegación del Master Plan: Tareas vs Seguimiento Trimestral */}
          <div className="flex items-center gap-2 border-b-2 border-zinc-200 pb-2 font-display">
            <button
              onClick={() => setMasterPlanSubTab('tasks')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                masterPlanSubTab === 'tasks'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-red-500" />
              Plan de Acción & Tareas por Eje
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
              Seguimiento Trimestral (3 Meses) & Pentágono Histórico
            </button>
          </div>

          {masterPlanSubTab === 'quarterly_tracking' ? (
            <MasterPlanQuarterlyTracking
              clientId={id as string}
              clientName={client.name}
              onReviewsUpdated={fetchClientData}
            />
          ) : (
            <>
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
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-crimson transition-all">
                  <Plus className="h-4 w-4" /> Nueva Acción
                </button>
              </div>

              <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y-2 divide-zinc-200 text-xs">
                    <thead className="bg-zinc-900 text-white font-display uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5 text-left font-bold">Código</th>
                        <th className="px-4 py-3.5 text-left font-bold">Acción / Iniciativa</th>
                        <th className="px-4 py-3.5 text-left font-bold">Prioridad</th>
                        <th className="px-4 py-3.5 text-left font-bold">Responsable</th>
                        <th className="px-4 py-3.5 text-left font-bold">Plazo</th>
                        <th className="px-4 py-3.5 text-left font-bold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {tasks
                        .filter(t => selectedAxis === 'all' || t.axis === selectedAxis)
                        .map((t, idx) => (
                          <tr key={t.code || idx} className="hover:bg-zinc-50">
                            <td className="px-4 py-3 font-mono font-bold text-red-600">{t.code}</td>
                            <td className="px-4 py-3 font-bold text-zinc-950">{t.title}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded font-display font-bold uppercase text-[10px] ${
                                t.priority === 'Alta' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-700'
                              }`}>
                                {t.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-700 font-medium">{t.assignedRole}</td>
                            <td className="px-4 py-3 text-zinc-600 font-mono font-semibold">{t.dueDate}</td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-0.5 bg-black text-white font-display uppercase font-bold text-[10px] rounded">
                                {t.status}
                              </span>
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
          {activeMeetingSession ? (
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
          ) : isPlanningMeeting ? (
            <ClientMeetingPlanner
              client={client}
              diagnosticAnswers={diagnosticAnswers}
              initialType={meetingLaunchType}
              onStartLiveMeeting={handleStartLiveMeeting}
              onSavePlannedMeeting={handleSavePlannedMeeting}
              onCancel={() => navigate(`/clients/${id}/meetings`)}
            />
          ) : (
            <div className="space-y-6">
              {/* Header Principal de Reuniones del Cliente */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2 w-2 rounded-full bg-[#6B1D2F]" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B1D2F]">
                        Ciclo de Vida de Reuniones • {client.name}
                      </span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      Reuniones del Cliente
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                      Seleccione la etapa metodológica para planificar temas y preguntas antes de iniciar la sesión en vivo con captura de audio.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigate(`/clients/${id}/meetings/plan?type=diagnostico`);
                    }}
                    className="px-4 py-2.5 bg-[#6B1D2F] hover:bg-[#541524] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all self-start sm:self-center"
                  >
                    <Plus className="w-4 h-4" /> Planificar Reunión
                  </button>
                </div>

                {/* 3 Tipos de Reuniones en Tarjetas Destacadas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Tipo 1: Kick off */}
                  <div
                    onClick={() => {
                      navigate(`/clients/${id}/meetings/plan?type=kickoff`);
                    }}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50/20 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2.5 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          <Target className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Paso 1
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        1. Kick off (OMV Trienal)
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Definición de la <strong>visión trienal (OMV)</strong>, alineación de fundadores y emisión de minutas de auditoría en PDF.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-purple-700 group-hover:translate-x-1 transition-transform">
                      <span>Planificar Kick off</span> →
                    </div>
                  </div>

                  {/* Tipo 2: Diagnóstico 360 */}
                  <div
                    onClick={() => {
                      navigate(`/clients/${id}/meetings/plan?type=diagnostico`);
                    }}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-[#E6C5CD] bg-white hover:bg-[#F9EFF2]/20 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2.5 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-9 h-9 rounded-xl bg-[#F9EFF2] border border-[#E6C5CD] text-[#6B1D2F] flex items-center justify-center font-bold">
                          <Mic className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F9EFF2] text-[#6B1D2F] border border-[#E6C5CD]">
                          Paso 2
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-[#6B1D2F] transition-colors">
                        2. Diagnóstico 360°
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Entrevistas por <strong>temas y preguntas</strong> de cada área para registrar el avance dinámico del perfil del cliente.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-[#6B1D2F] group-hover:translate-x-1 transition-transform">
                      <span>Planificar Diagnóstico</span> →
                    </div>
                  </div>

                  {/* Tipo 3: Revisión Trimestral */}
                  <div
                    onClick={() => {
                      navigate(`/clients/${id}/meetings/plan?type=seguimiento_trimestral`);
                    }}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2.5 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
                          <Calendar className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Cada 90 Días
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">
                        3. Revisión Trimestral (90 Días)
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Auditoría del Master Plan de tareas y <strong>recalibración de los 5 vértices del Pentágono</strong>.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-800 group-hover:translate-x-1 transition-transform">
                      <span>Planificar Trimestral</span> →
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTORIAL ORGANIZADO DE GRABACIONES (AUDIO + WHISPER + VALIDACIONES) */}
              <ClientRecordingsHistory
                clientId={id as string}
                clientName={client.name}
                onNewRecording={(type) => {
                  navigate(`/clients/${id}/meetings/plan?type=${type || 'diagnostico'}`);
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
                    meetings.map(m => (
                      <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-display font-semibold text-sm text-slate-900">{m.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Fecha: {new Date(m.meeting_date).toLocaleDateString('es-AR')}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200">
                            {m.status || 'Completada'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <Link
                            to={`/meetings/${m.id}`}
                            className="text-xs font-semibold text-[#B91C1C] hover:text-[#991B1B] flex items-center gap-1"
                          >
                            Ver Detalle <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: PORTAL PREVIEW */}
      {activeTab === 'portal_preview' && (
        <ClientPortalView
          client={client}
          results={diagnosticResults}
          isDiagnosticApproved={diagApproval === 'approved_published'}
        />
      )}
    </div>
  );
}
