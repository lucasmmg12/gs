import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Target, ShieldAlert, FileText, Calendar, 
  Layers, ChevronRight, ChevronLeft,
  Activity, Plus, Compass, Eye, Mic, CheckCircle2, Download, HardDrive, History
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'omv' | 'diagnostic' | 'matrices' | 'master_plan' | 'portal_preview' | 'meetings'
  >('dashboard');
  const [loading, setLoading] = useState(true);

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

  // Pentagon State
  const [pentagonData] = useState(INITIAL_PENTAGON_DATA);

  // Meetings & AI Interviews State
  const [meetings, setMeetings] = useState<any[]>([]);
  const [clientInterviews, setClientInterviews] = useState<any[]>([]);
  const [activeMeetingSession, setActiveMeetingSession] = useState(false);
  const [selectedInterviewDetail, setSelectedInterviewDetail] = useState<any | null>(null);

  const fetchClientData = async () => {
    setLoading(true);
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id as string)
      .single();

    if (org) setClient(org);

    const { data: mtgs } = await supabase
      .from('meetings')
      .select('*, minutes(*)')
      .eq('organization_id', id as string)
      .order('meeting_date', { ascending: false });

    if (mtgs) setMeetings(mtgs);

    const { data: interviews } = await (supabase
      .from('gobernanza_entrevistas') as any)
      .select('*')
      .eq('client_id', id as string)
      .order('created_at', { ascending: false });

    if (interviews) setClientInterviews(interviews);

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

  const handleSaveDiagnostic = () => {
    alert('¡Diagnóstico guardado con éxito! Indicadores y matrices estratégicas recalculados.');
  };

  // Radar en Negro, Rojo y Gris
  const radarChartData = [
    { subject: 'Gobernanza', Baseline: pentagonData[0].gobernanza, Actual: diagnosticResults.pentagon.directorio || 5.5, Meta: pentagonData[2].gobernanza },
    { subject: 'Procesos', Baseline: pentagonData[0].procesos, Actual: diagnosticResults.pentagon.procesos || 6.2, Meta: pentagonData[2].procesos },
    { subject: 'Finanzas', Baseline: pentagonData[0].finanzas, Actual: diagnosticResults.pentagon.finanzas || 5.8, Meta: pentagonData[2].finanzas },
    { subject: 'Talento', Baseline: pentagonData[0].talento, Actual: diagnosticResults.pentagon.talento || 5.1, Meta: pentagonData[2].talento },
    { subject: 'Comercial', Baseline: pentagonData[0].comercial, Actual: diagnosticResults.pentagon.comercial || 6.0, Meta: pentagonData[2].comercial },
  ];

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
      {/* Header Principal */}
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
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Expediente: <span className="font-mono text-zinc-700">{client.id.substring(0, 8)}</span> • Estudio GS Consultora • Sanatorio Argentino / Grow Labs
            </p>
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
            { id: 'meetings', name: 'Minutas de Sesiones', icon: Calendar },
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
                  <p className="text-xs text-zinc-500 font-medium">Comparativa: Línea Base vs. Medición Actual en Vivo vs. Meta</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-display uppercase tracking-wider font-bold">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-zinc-400" /> Línea Base</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Actual</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-zinc-950" /> Meta Trienal</span>
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
          onApprovalChange={(status, audit) => {
            setOmvApproval(status);
            setOmvAudit(audit);
          }}
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
          onApprovalChange={(status, audit) => {
            setDiagApproval(status);
            setDiagAudit(audit);
          }}
          onViewMatrices={() => setActiveTab('matrices')}
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
            onStatusChange={(status, audit) => {
              setMasterPlanApproval(status);
              setMasterPlanAudit(audit);
            }}
            clientName={client.name}
            onSendWhatsApp={() => {
              alert(`Enviado a WhatsApp de ${client.name}: "Se han actualizado las iniciativas del Master Plan Estratégico."`);
            }}
          />

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
        </div>
      )}

      {/* TAB 6: MINUTAS Y SESIONES DE ENTREVISTA CON IA */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          {activeMeetingSession ? (
            <ClientMeetingSession
              client={client}
              onBack={() => {
                setActiveMeetingSession(false);
                fetchClientData();
              }}
              onDiagnosticUpdated={() => {
                fetchClientData();
              }}
            />
          ) : selectedInterviewDetail ? (
            /* Vista Detallada de Auditoría / Entrevista Guardada (Réplica exacta de resultados) */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedInterviewDetail(null)}
                  className="flex items-center text-zinc-500 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-wider"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Lista de Sesiones
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-900 p-8 space-y-8">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950 mb-1">
                    {selectedInterviewDetail.titulo || 'Auditoría General'}
                  </h1>
                  <p className="text-zinc-600 text-xs">
                    Grabación y análisis estructurado realizado con IA para {client.name}.
                  </p>
                </div>

                {/* Banner Verde Exacto del Screenshot */}
                <div className="flex justify-between items-center bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center text-green-700 font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                    Análisis Completado
                  </div>
                  <button
                    onClick={() => {
                      alert(`Descargando reporte oficial para ${client.name}...`);
                    }}
                    className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50 text-xs font-bold transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Descargar PDF
                  </button>
                </div>

                {/* Dos Columnas: Resumen Ejecutivo y Mapa Conceptual */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Resumen Ejecutivo */}
                  <div className="space-y-4">
                    <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-600" />
                      Resumen Ejecutivo
                    </h3>
                    <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-200 text-sm">
                      {selectedInterviewDetail.resumen || 'No hay resumen registrado.'}
                    </p>
                  </div>

                  {/* Mapa Conceptual */}
                  <div className="space-y-4">
                    <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2">
                      Mapa Conceptual
                    </h3>
                    {selectedInterviewDetail.mapa_conceptual_mermaid ? (
                      <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 overflow-x-auto text-center font-mono text-xs text-zinc-800 p-4">
                        <pre className="text-left overflow-x-auto whitespace-pre-wrap">
                          {selectedInterviewDetail.mapa_conceptual_mermaid.replace(/```mermaid/g, '').replace(/```/g, '')}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-xs p-4 bg-zinc-50 rounded-lg border">No se generó mapa conceptual.</p>
                    )}
                  </div>
                </div>

                {/* Respuestas Extraídas */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2 flex items-center gap-2">
                    <History className="w-5 h-5 text-red-600" />
                    Respuestas Extraídas
                  </h3>
                  <div className="space-y-4">
                    {Array.isArray(selectedInterviewDetail.respuestas_cuestionario) ? (
                      selectedInterviewDetail.respuestas_cuestionario.map((ans: string, i: number) => (
                        <div key={i} className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                          <p className="font-bold text-zinc-900 mb-2 text-sm">
                            Pregunta #{i + 1}
                          </p>
                          <p className="text-zinc-600 pl-4 border-l-2 border-red-600 text-sm">
                            {ans}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-500 text-xs">Sin respuestas catalogadas.</p>
                    )}
                  </div>
                </div>

                {selectedInterviewDetail.transcripcion && (
                  <details className="mt-8 border-t border-zinc-200 pt-4">
                    <summary className="text-slate-500 cursor-pointer hover:text-slate-800 font-medium text-xs">
                      Ver Transcripción Completa
                    </summary>
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs text-slate-600 whitespace-pre-wrap font-mono">
                      {selectedInterviewDetail.transcripcion}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ) : (
            /* Lista Principal de Sesiones con Botón para Iniciar y Grabar */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                    <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
                      Gobernanza 360° & Grabación Continua
                    </span>
                  </div>
                  <h2 className="font-display text-2xl font-black text-zinc-950 uppercase tracking-tight">
                    Sesiones de Entrevista y Minutas IA
                  </h2>
                  <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
                    Planifique las preguntas del catálogo 360°, active el protector de pantalla (WakeLock) y grabe sesiones de más de 1 hora con persistencia de chunks de audio cada 30 segundos.
                  </p>
                </div>

                <button
                  onClick={() => setActiveMeetingSession(true)}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-2 shadow-crimson hover:scale-105 transition-all shrink-0"
                >
                  <Mic className="w-4 h-4" /> Iniciar y Grabar Sesión
                </button>
              </div>

              {/* Subsección: Entrevistas Grabadas con IA */}
              <div className="space-y-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-600" /> Entrevistas Estructuradas con IA ({clientInterviews.length})
                </h3>

                {clientInterviews.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border-2 border-zinc-300 text-center text-zinc-500 text-xs font-medium space-y-3">
                    <HardDrive className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p>No hay entrevistas de diagnóstico grabadas para este cliente aún.</p>
                    <button
                      onClick={() => setActiveMeetingSession(true)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold uppercase tracking-wider text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Planificar y Grabar la Primera Entrevista
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientInterviews.map(interview => (
                      <div
                        key={interview.id}
                        className="bg-white p-5 rounded-2xl border-2 border-zinc-900 hover:border-red-600 transition-all space-y-3 shadow-sm hover:shadow-crimson group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-display font-bold text-base text-zinc-950 group-hover:text-red-600 uppercase tracking-wide transition-colors">
                              {interview.titulo || 'Auditoría General'}
                            </h4>
                            <p className="text-xs text-zinc-500 mt-1 font-medium">
                              {new Date(interview.created_at).toLocaleDateString('es-AR')} • {Math.round((interview.duracion_segundos || 0) / 60)} min grabados
                            </p>
                          </div>
                          <span className={`px-2.5 py-0.5 font-display uppercase font-bold text-[10px] rounded ${
                            interview.estado === 'completado' 
                              ? 'bg-black text-emerald-400' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {interview.estado === 'completado' ? 'Análisis Listo' : interview.estado}
                          </span>
                        </div>

                        {interview.resumen && (
                          <p className="text-xs text-zinc-600 line-clamp-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                            {interview.resumen}
                          </p>
                        )}

                        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-zinc-400">
                            {Array.isArray(interview.selected_questions) ? `${interview.selected_questions.length} preguntas` : '360°'}
                          </span>
                          <button
                            onClick={() => setSelectedInterviewDetail(interview)}
                            className="text-xs font-bold font-display uppercase tracking-wider text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            Ver Resultados y Mapa <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subsección: Minutas Clásicas */}
              <div className="space-y-3 pt-4 border-t border-zinc-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-600" /> Minutas de Comités y Reuniones ({meetings.length})
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
                      No hay minutas adicionales registradas.
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
