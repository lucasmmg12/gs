import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Target, ShieldAlert, FileText, Calendar, 
  Layers, ChevronRight,
  Activity, Plus, Compass, Eye
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

  // Meetings State
  const [meetings, setMeetings] = useState<any[]>([]);

  const fetchClientData = async () => {
    setLoading(true);
    // 1. Fetch organization
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id as string)
      .single();

    if (org) setClient(org);

    // 2. Fetch meetings
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

  const handleSaveDiagnostic = () => {
    alert('¡Diagnóstico guardado con éxito! Indicadores y matrices estratégicas recalculados.');
  };

  const radarChartData = [
    { subject: 'Gobernanza', Baseline: pentagonData[0].gobernanza, Actual: diagnosticResults.pentagon.directorio || 5.5, Meta: pentagonData[2].gobernanza },
    { subject: 'Procesos', Baseline: pentagonData[0].procesos, Actual: diagnosticResults.pentagon.procesos || 6.2, Meta: pentagonData[2].procesos },
    { subject: 'Finanzas', Baseline: pentagonData[0].finanzas, Actual: diagnosticResults.pentagon.finanzas || 5.8, Meta: pentagonData[2].finanzas },
    { subject: 'Talento', Baseline: pentagonData[0].talento, Actual: diagnosticResults.pentagon.talento || 5.1, Meta: pentagonData[2].talento },
    { subject: 'Comercial', Baseline: pentagonData[0].comercial, Actual: diagnosticResults.pentagon.comercial || 6.0, Meta: pentagonData[2].comercial },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando información del cliente...</div>;
  if (!client) return <div className="p-8 text-center text-gray-500 font-medium">Cliente no encontrado.</div>;

  // VISTA CLIENTE EXCLUSIVA (FRONT)
  if (viewMode === 'cliente') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="bg-amber-500 text-white px-4 py-2 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
          <span>👀 Estás visualizando la plataforma en MODO CLIENTE (Portal Front). Solo se muestran datos aprobados en verde.</span>
          <button
            onClick={() => setViewMode('consultor')}
            className="px-3 py-1 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/clients" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{client.name}</h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {client.industry || 'PyME'}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">
                Etapa: {clientStage === 'kickoff_omv' ? '1. Kickoff (OMV)' : clientStage === 'diagnostic_in_progress' ? '2. Diagnóstico en curso' : clientStage === 'diagnostic_closed' ? '3. Diagnóstico cerrado' : '4. Master Plan activo'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Código: {client.id.substring(0, 8)} · Consultora GS · Sanatorio Argentino / Grow Labs
            </p>
          </div>
        </div>

        {/* Botón Switch Modo Portal Cliente */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('cliente')}
            className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            title="Previsualizar portal como lo ve el cliente"
          >
            <Eye className="w-4 h-4" />
            Ver como Cliente (Front)
          </button>
        </div>
      </div>

      {/* Tabs Principales de la Plataforma */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'dashboard', name: 'Dashboard 360', icon: Activity },
            { id: 'omv', name: '1. Kickoff & OMV (Audio/Texto)', icon: Compass },
            { id: 'diagnostic', name: '2. Diagnóstico Dinámico (~100 Preg)', icon: FileText, badge: `${diagnosticResults.progressPercentage}%` },
            { id: 'matrices', name: '3. Matrices & FODA/TOWS', icon: Layers },
            { id: 'master_plan', name: '4. Master Plan Estratégico', icon: Target },
            { id: 'meetings', name: 'Minutas de Sesiones', icon: Calendar },
            { id: 'portal_preview', name: 'Portal del Cliente (Preview)', icon: Eye }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 whitespace-nowrap py-3 px-2 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
              {tab.badge && (
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
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
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Índice Madurez (IME)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-600">{diagnosticResults.globalIme}%</span>
                <span className="text-sm font-bold text-gray-900">({diagnosticResults.globalIme10} / 10)</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Escala 1–10 · Meta trienal: 8.0</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Índice Riesgo (IRE)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-600">{diagnosticResults.globalIre}%</span>
                <span className="text-xs text-rose-500 font-medium">Inverso</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Matriz de Contingencias</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avance del Diagnóstico</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{diagnosticResults.progressPercentage}%</span>
                <span className="text-xs text-gray-500 font-medium">{diagnosticResults.totalAnswered} / {diagnosticResults.totalQuestions}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Preguntas cerradas respondidas</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sesiones & Minutas</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{meetings.length}</span>
                <span className="text-xs text-emerald-600 font-medium">Grabadas</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Alimentan el diagnóstico dinámico</p>
            </div>
          </div>

          {/* Radar Chart & Top Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Pentágono del Orden (Madurez en 5 Ejes)</h2>
                  <p className="text-xs text-gray-500">Comparativa: Línea Base vs. Medición Actual en Vivo vs. Meta</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Línea Base</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Actual</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Meta Trienal</span>
                </div>
              </div>
              <div className="h-80 w-full min-h-[320px] min-w-[280px]">
                <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={300}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#9ca3af" />
                    <Tooltip />
                    <Radar name="Línea Base" dataKey="Baseline" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.2} />
                    <Radar name="Actual" dataKey="Actual" stroke="#2563eb" fill="#2563eb" fillOpacity={0.5} />
                    <Radar name="Meta Trienal" dataKey="Meta" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeDasharray="3 3" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Critical Risks */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" /> Focos Críticos de Riesgo (IA)
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {diagnosticResults.risks.slice(0, 3).map(r => (
                  <div key={r.id} className="p-3 bg-rose-50/60 border border-rose-100 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                      <span>{r.code} · {r.category}</span>
                      <span className="bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">{r.severityLevel}</span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium mt-1">{r.description}</p>
                    <p className="text-[11px] text-gray-500 mt-1 italic">Acción: {r.suggestedAction}</p>
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

      {/* TAB 3: DIAGNÓSTICO DINÁMICO (CERO TEXTO LIBRE, PREGUNTAS EN CASCADA) */}
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

      {/* TAB 4: MATRICES ESTRATÉGICAS (FODA, TOWS, PESTEL, PORTER, RIESGOS E INFORME) */}
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedAxis('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedAxis === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos los Ejes (5)
              </button>
              {MASTER_PLAN_AXES.map(axis => (
                <button
                  key={axis.id}
                  onClick={() => setSelectedAxis(axis.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedAxis === axis.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {axis.name.split(':')[0]}
                </button>
              ))}
            </div>
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Plus className="h-3.5 w-3.5" /> Nueva Acción
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Acción / Iniciativa</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Prioridad</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Responsable</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Plazo</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tasks
                    .filter(t => selectedAxis === 'all' || t.axis === selectedAxis)
                    .map((t, idx) => (
                      <tr key={t.code || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{t.code}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{t.title}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.priority === 'Alta' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.assignedRole}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono">{t.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-medium rounded">
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

      {/* TAB 6: MINUTAS DE SESIONES */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Sesiones y Minutas Automatizadas por IA</h2>
            <Link
              to={`/meetings`}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              + Nueva Sesión
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-xs">
                No hay reuniones registradas para esta empresa.
              </div>
            ) : (
              meetings.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 transition-all space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{m.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Fecha: {new Date(m.meeting_date).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded">
                      Completada
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <Link
                      to={`/meetings/${m.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Ver Detalle de Minuta <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
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
