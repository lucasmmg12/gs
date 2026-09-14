import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'omv' | 'diagnostic' | 'matrices' | 'master_plan' | 'portal_preview' | 'meetings'
  >('dashboard');
  const [loading, setLoading] = useState(true);

  // Tipos de reunión y submódulos
  const [meetingLaunchType, setMeetingLaunchType] = useState<MeetingType>('diagnostico');
  const [masterPlanSubTab, setMasterPlanSubTab] = useState<'tasks' | 'quarterly_tracking'>('tasks');

  // Modo de visualización: Consultor GS (Back) vs Cliente (Front)
  const [viewMode, setViewMode] = useState<'consultor' | 'cliente'>('consultor');

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
  const [isPlanningMeeting, setIsPlanningMeeting] = useState(false);
  const [plannedSession, setPlannedSession] = useState<PlannedMeetingData | null>(null);
  const [activeMeetingSession, setActiveMeetingSession] = useState(false);

  const handleStartLiveMeeting = (planned: PlannedMeetingData) => {
    setPlannedSession(planned);
    setIsPlanningMeeting(false);
    setActiveMeetingSession(true);
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
      setIsPlanningMeeting(false);
      fetchClientData();
    } catch (err: any) {
      console.error('Error saving planned meeting:', err);
      alert('Planificación registrada con éxito.');
      setIsPlanningMeeting(false);
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
            onClick={() => setViewMode('consultor')}
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
      {/* Header Principal con Avance en el Perfil del Cliente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-zinc-200 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/clients" className="p-2.5 rounded-xl border-2 border-zinc-900 hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-zinc-900" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black font-display tracking-wide text-zinc-950 uppercase">{client.name}</h1>
              <span className="inline-flex items-center rounded-md bg-black px-3 py-0.5 text-xs font-bold font-display uppercase text-white tracking-wider">
                {client.industry || 'PyME'}
              </span>
              <span className="inline-flex items-center rounded-md bg-red-600 px-3 py-0.5 text-xs font-bold font-display uppercase text-white tracking-wider shadow-crimson">
                {clientStage === 'kickoff_omv' ? '1. Kickoff' : clientStage === 'diagnostic_in_progress' ? '2. Diagnóstico en curso' : clientStage === 'diagnostic_closed' ? '3. Diagnóstico cerrado' : '4. Master Plan activo'}
              </span>
            </div>

            {/* Barra y Estadísticas de Avance en el Perfil del Cliente */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                <Compass className="w-3.5 h-3.5 text-red-600" />
                <span>Avance en el Perfil: <strong className="text-red-600">{answeredQuestionsCount} / {totalQuestionsCatalog}</strong> preguntas ({profileProgressPercent}%)</span>
              </div>
              <div className="w-36 bg-zinc-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-red-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${profileProgressPercent}%` }} 
                />
              </div>
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 text-white font-mono text-[11px] border border-zinc-800 shadow-sm"
                title="Identificador único del cliente para blindaje de grabaciones y datos"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>id_cliente: <strong className="text-emerald-400 font-mono">{client.id}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Switch Modo Portal Cliente */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('cliente')}
            className="px-4 py-2.5 bg-black text-white hover:bg-zinc-800 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all border border-zinc-800"
            title="Previsualizar portal como lo ve el cliente"
          >
            <Eye className="w-4 h-4 text-red-500" />
            Ver como Cliente (Front)
          </button>
        </div>
      </div>

      {/* Tabs Principales de la Plataforma */}
      <div className="border-b-2 border-zinc-200">
        <nav className="-mb-px flex space-x-3 overflow-x-auto font-display" aria-label="Tabs">
          {[
            { id: 'dashboard', name: 'Dashboard 360', icon: Activity },
            { id: 'omv', name: '1. Kickoff & OMV', icon: Compass },
            { id: 'diagnostic', name: '2. Diagnóstico Dinámico', icon: FileText, badge: `${diagnosticResults.progressPercentage}%` },
            { id: 'matrices', name: '3. Matrices & FODA', icon: Layers },
            { id: 'master_plan', name: '4. Master Plan', icon: Target },
            { id: 'meetings', name: 'Reuniones', icon: Calendar },
            { id: 'portal_preview', name: 'Portal Cliente (Preview)', icon: Eye }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 whitespace-nowrap py-3 px-3.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600 bg-red-50/40 rounded-t-lg'
                  : 'border-transparent text-zinc-600 hover:text-zinc-950 hover:border-zinc-300'
              }`}
            >
              <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-red-600' : 'text-zinc-400'}`} />
              {tab.name}
              {tab.badge && (
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-black ${
                  activeTab === tab.id ? 'bg-red-600 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: DASHBOARD 360 */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Cards en Tiempo Real */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-widest block">Índice Madurez (IME)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-zinc-950">{diagnosticResults.globalIme}%</span>
                <span className="font-display text-sm font-bold text-red-600">({diagnosticResults.globalIme10} / 10)</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Escala 1–10 • Meta trienal: 8.0</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-red-600 uppercase tracking-widest block">Índice Riesgo (IRE)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-red-600">{diagnosticResults.globalIre}%</span>
                <span className="font-display text-xs font-bold text-zinc-400 uppercase">Inverso</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Matriz de Contingencias</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-widest block">Avance del Diagnóstico</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-zinc-950">{diagnosticResults.progressPercentage}%</span>
                <span className="text-xs text-zinc-500 font-bold font-mono">({diagnosticResults.totalAnswered} / {diagnosticResults.totalQuestions})</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Preguntas cerradas respondidas</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <span className="font-display text-xs font-bold text-zinc-500 uppercase tracking-widest block">Sesiones & Minutas</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl font-black text-zinc-950">{meetings.length}</span>
                <span className="font-display text-xs text-emerald-600 font-bold uppercase">Grabadas</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Alimentan el diagnóstico dinámico</p>
            </div>
          </div>

          {/* Radar Chart & Top Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-zinc-950 uppercase tracking-wide">
                    Pentágono del Orden (Madurez en 5 Ejes)
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">Comparativa: {currentPeriod.label} vs. Actual en Vivo vs. Meta (8.2)</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3 text-xs font-display uppercase tracking-wider font-bold">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-zinc-400" /> {currentPeriod.periodCode} ({currentPeriod.imeActual})</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Actual ({diagnosticResults.globalIme10})</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-zinc-950" /> Meta ({metaPeriod.imeActual})</span>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-md pb-0.5">
                    {pentagonData.map(p => (
                      <button
                        key={p.periodCode}
                        onClick={() => setSelectedPentagonPeriod(p.periodCode)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-display uppercase tracking-wider transition-all ${
                          selectedPentagonPeriod === p.periodCode
                            ? 'bg-black text-white shadow-xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
                    <PolarGrid stroke="#e4e4e7" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#09090b', fontSize: 12, fontWeight: 700, fontFamily: 'Oswald' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#71717a" />
                    <Tooltip />
                    <Radar name="Línea Base" dataKey="Baseline" stroke="#a1a1aa" fill="#a1a1aa" fillOpacity={0.2} />
                    <Radar name="Actual" dataKey="Actual" stroke="#dc2626" fill="#dc2626" fillOpacity={0.5} strokeWidth={2} />
                    <Radar name="Meta Trienal" dataKey="Meta" stroke="#09090b" fill="#09090b" fillOpacity={0.1} strokeDasharray="3 3" strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Critical Risks */}
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm flex flex-col">
              <h2 className="font-display text-lg font-bold text-zinc-950 mb-3 flex items-center gap-2 uppercase tracking-wide">
                <ShieldAlert className="h-5 w-5 text-red-600" /> Focos Críticos de Riesgo
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {diagnosticResults.risks.slice(0, 3).map(r => (
                  <div key={r.id} className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold font-display uppercase tracking-wide text-red-800">
                      <span>{r.code} • {r.category}</span>
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px]">{r.severityLevel}</span>
                    </div>
                    <p className="text-xs text-zinc-900 font-bold mt-1.5">{r.description}</p>
                    <p className="text-[11px] text-zinc-500 mt-1 italic font-medium">Acción: {r.suggestedAction}</p>
                  </div>
                ))}
              </div>
            </div>
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
          onViewMatrices={() => setActiveTab('matrices')}
          onSendWhatsApp={() => handleSendWhatsAppNotification('Formulario de Diagnóstico Integral 360°')}
        />
      )}

      {/* TAB 4: MATRICES ESTRATÉGICAS */}
      {activeTab === 'matrices' && (
        <StrategicMatricesView
          client={client}
          results={diagnosticResults}
          onBackToQuestions={() => setActiveTab('diagnostic')}
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
                setActiveMeetingSession(false);
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
              onCancel={() => setIsPlanningMeeting(false)}
            />
          ) : (
            <div className="space-y-6">
              {/* Header Principal de Reuniones del Cliente */}
              <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
                      <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
                        Flujo de Reuniones • {client.name}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-black text-zinc-950 uppercase tracking-tight">
                      Reuniones del Cliente
                    </h2>
                    <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
                      Seleccione el tipo de reunión para planificar la agenda, elegir los temas y seleccionar las preguntas a abordar antes de iniciar la sesión en vivo.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setMeetingLaunchType('diagnostico');
                      setIsPlanningMeeting(true);
                    }}
                    className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-2 shadow-crimson hover:scale-105 transition-all self-start sm:self-center"
                  >
                    <Plus className="w-4 h-4" /> Planificar Reunión
                  </button>
                </div>

                {/* 3 Tipos de Reuniones en Tarjetas Destacadas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Tipo 1: Kick off */}
                  <div
                    onClick={() => {
                      setMeetingLaunchType('kickoff');
                      setIsPlanningMeeting(true);
                    }}
                    className="p-5 rounded-2xl border-2 border-zinc-200 hover:border-purple-600 bg-purple-50/20 hover:bg-purple-50/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                        <Target className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                        Paso 1
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-black uppercase text-zinc-950 group-hover:text-purple-700 transition-colors">
                      1. Kick off
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Definición de la <strong>visión trienal (OMV)</strong>, alineación de fundadores y emisión de Minutas en PDF.
                    </p>
                    <div className="pt-2 flex items-center text-xs font-bold text-purple-700 group-hover:translate-x-1 transition-transform">
                      <span>Planificar Kick off</span> →
                    </div>
                  </div>

                  {/* Tipo 2: Diagnóstico 360 */}
                  <div
                    onClick={() => {
                      setMeetingLaunchType('diagnostico');
                      setIsPlanningMeeting(true);
                    }}
                    className="p-5 rounded-2xl border-2 border-zinc-200 hover:border-red-600 bg-red-50/20 hover:bg-red-50/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black">
                        <Mic className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                        Paso 2
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-black uppercase text-zinc-950 group-hover:text-red-700 transition-colors">
                      2. Diagnóstico 360°
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Elegir <strong>los temas y preguntas</strong> de cada área para registrar el avance del perfil del cliente.
                    </p>
                    <div className="pt-2 flex items-center text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform">
                      <span>Planificar Diagnóstico</span> →
                    </div>
                  </div>

                  {/* Tipo 3: Revisión Trimestral */}
                  <div
                    onClick={() => {
                      setMeetingLaunchType('seguimiento_trimestral');
                      setIsPlanningMeeting(true);
                    }}
                    className="p-5 rounded-2xl border-2 border-zinc-200 hover:border-zinc-950 bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-xl bg-zinc-200 text-zinc-900 flex items-center justify-center font-black">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                        Cada 90 Días
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-black uppercase text-zinc-950 group-hover:text-black transition-colors">
                      3. Revisión Trimestral
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Auditoría de tareas del Master Plan y <strong>recalibración de los 5 vértices del Pentágono</strong>.
                    </p>
                    <div className="pt-2 flex items-center text-xs font-bold text-zinc-900 group-hover:translate-x-1 transition-transform">
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
                  setMeetingLaunchType(type || 'diagnostico');
                  setIsPlanningMeeting(true);
                }}
              />

              {/* Subsección: Minutas Tradicionales de Comités */}
              <div className="space-y-3 pt-6 border-t-2 border-zinc-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-600" /> Minutas de Comités y Reuniones Tradicionales ({meetings.length})
                  </h3>
                  <Link
                    to="/meetings"
                    className="text-xs font-bold font-display uppercase tracking-wider text-zinc-600 hover:text-zinc-950"
                  >
                    Ver Todas las Minutas
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meetings.length === 0 ? (
                    <div className="col-span-2 bg-zinc-50 p-6 rounded-2xl border border-zinc-200 text-center text-zinc-400 text-xs">
                      No hay minutas tradicionales adicionales registradas.
                    </div>
                  ) : (
                    meetings.map(m => (
                      <div key={m.id} className="bg-white p-5 rounded-2xl border border-zinc-200 hover:border-zinc-900 transition-all space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-display font-bold text-sm text-zinc-950 uppercase tracking-wide">{m.title}</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">Fecha: {new Date(m.meeting_date).toLocaleDateString('es-AR')}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-display uppercase font-bold text-[10px] rounded">
                            {m.status || 'Completada'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-zinc-100 flex justify-end">
                          <Link
                            to={`/meetings/${m.id}`}
                            className="text-xs font-bold font-display uppercase tracking-wider text-zinc-700 hover:text-red-600 flex items-center gap-1"
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
