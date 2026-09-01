import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Target, ShieldAlert, FileText, Calendar, 
  Sparkles, CheckCircle2, XCircle, ChevronRight, Layers,
  Activity, Plus
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { DIAGNOSTIC_AREAS } from '../data/diagnosticQuestions';
import { MASTER_PLAN_AXES, INITIAL_MASTER_PLAN_TASKS, INITIAL_PENTAGON_DATA, INITIAL_RISKS } from '../data/masterPlanData';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'diagnostic' | 'master_plan' | 'pentagon' | 'risks' | 'meetings'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Diagnostic State
  const [selectedArea, setSelectedArea] = useState(DIAGNOSTIC_AREAS[0].id);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<number, string>>({});
  const [diagnosticScale, setDiagnosticScale] = useState<Record<number, number>>({});
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Master Plan State
  const [tasks] = useState(INITIAL_MASTER_PLAN_TASKS);
  const [selectedAxis, setSelectedAxis] = useState<number | 'all'>('all');

  // Pentagon State
  const [pentagonData] = useState(INITIAL_PENTAGON_DATA);

  // Risks State
  const [risks] = useState(INITIAL_RISKS);

  // Meetings State
  const [meetings, setMeetings] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

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

    // 3. Fetch diagnostic suggestions
    const { data: sugs } = await (supabase.from('diagnostic_suggestions' as any) as any)
      .select('*')
      .eq('organization_id', id as string)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (sugs && sugs.length > 0) {
      setSuggestions(sugs[0].suggested_changes?.suggested_changes || []);
    }

    setLoading(false);
  };

  const handleApplySuggestion = (questionId: number, text: string) => {
    setDiagnosticAnswers(prev => ({ ...prev, [questionId]: text }));
    setSuggestions(prev => prev.filter(s => s.question_id !== questionId));
  };

  const radarChartData = [
    { subject: 'Gobernanza', Baseline: pentagonData[0].gobernanza, Actual: pentagonData[1]?.gobernanza || pentagonData[0].gobernanza, Meta: pentagonData[2].gobernanza },
    { subject: 'Procesos', Baseline: pentagonData[0].procesos, Actual: pentagonData[1]?.procesos || pentagonData[0].procesos, Meta: pentagonData[2].procesos },
    { subject: 'Finanzas', Baseline: pentagonData[0].finanzas, Actual: pentagonData[1]?.finanzas || pentagonData[0].finanzas, Meta: pentagonData[2].finanzas },
    { subject: 'Talento', Baseline: pentagonData[0].talento, Actual: pentagonData[1]?.talento || pentagonData[0].talento, Meta: pentagonData[2].talento },
    { subject: 'Comercial', Baseline: pentagonData[0].comercial, Actual: pentagonData[1]?.comercial || pentagonData[0].comercial, Meta: pentagonData[2].comercial },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando información del cliente...</div>;
  if (!client) return <div className="p-8 text-center text-gray-500 font-medium">Cliente no encontrado.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
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
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Código: {client.id.substring(0, 8)} · Consultor a cargo: GS Senior</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'dashboard', name: 'Dashboard 360', icon: Activity },
            { id: 'diagnostic', name: 'Diagnóstico 360° (78 Preguntas)', icon: FileText, badge: suggestions.length > 0 ? `${suggestions.length} sugerencias IA` : null },
            { id: 'master_plan', name: 'Master Plan Estratégico', icon: Target },
            { id: 'pentagon', name: 'Pentágono del Orden', icon: Layers },
            { id: 'risks', name: 'Matriz de Riesgos (5x5)', icon: ShieldAlert },
            { id: 'meetings', name: 'Reuniones & Minutas', icon: Calendar },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
              {tab.badge && (
                <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
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
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Índice Madurez (IME)</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-600">5.5</span>
                <span className="text-xs font-bold text-emerald-600">▲ +0.7 vs Línea Base</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Escala 0–10 · Meta trienal: 8.2</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avance Master Plan</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">42%</span>
                <span className="text-xs text-gray-500">7 de 18 hitos</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">5 Ejes estratégicos en ejecución</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Riesgos Extremos / Altos</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-red-600">4</span>
                <span className="text-xs text-red-600 font-medium">Requieren mitigación</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Matriz IRE · PxI ≥ 12</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sesiones & Minutas</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900">{meetings.length}</span>
                <span className="text-xs text-emerald-600 font-medium">100% auditadas</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Flujo PR-01 bajo norma GS</p>
            </div>
          </div>

          {/* Radar Chart & Top Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Pentágono del Orden (Evolución de Madurez)</h2>
                  <p className="text-xs text-gray-500">Comparativa: Línea Base vs. Medición Actual vs. Meta Trienal</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Línea Base</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Actual (Nov 2026)</span>
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
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" /> Focos Críticos de Riesgo
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {risks.slice(0, 3).map(r => (
                  <div key={r.id} className="p-3 bg-red-50/60 border border-red-100 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-bold text-red-800">
                      <span>{r.code} · {r.category}</span>
                      <span className="bg-red-200 text-red-900 px-1.5 py-0.5 rounded">Nivel {r.levelInherent}</span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium mt-1">{r.riskName}</p>
                    <p className="text-[11px] text-gray-500 mt-1 italic">Acción: {r.mitigationActions}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIAGNÓSTICO 360 (78 PREGUNTAS) */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-6">
          {/* AI Suggestions Box (if pending) */}
          {suggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Sparkles className="h-5 w-5 text-amber-600" />
                Sugerencias de Actualización Incremental por IA ({suggestions.length} pendientes de validación)
              </div>
              <p className="text-xs text-amber-800">
                La IA analizó la última reunión y propone actualizar las siguientes preguntas sin alterar el resto del documento:
              </p>
              <div className="space-y-3 mt-2">
                {suggestions.map((sug, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-blue-600">Pregunta #{sug.question_id}: {sug.question_title}</span>
                      <p className="text-xs text-gray-700">{sug.new_assessment}</p>
                      <p className="text-[11px] text-gray-400 italic">Razón: {sug.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleApplySuggestion(sug.question_id, sug.new_assessment)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Aceptar
                      </button>
                      <button 
                        onClick={() => setSuggestions(prev => prev.filter((_, i) => i !== idx))}
                        className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5 text-gray-400" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Area Selector and Questions Form */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Areas List */}
            <div className="lg:col-span-1 space-y-1.5 bg-white p-3 rounded-xl border border-gray-200 shadow-sm h-fit">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 block mb-2">10 Áreas de Diagnóstico</span>
              {DIAGNOSTIC_AREAS.map(area => (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    selectedArea === area.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">Área {area.number}: {area.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </button>
              ))}
            </div>

            {/* Questions of Selected Area */}
            <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              {(() => {
                const current = DIAGNOSTIC_AREAS.find(a => a.id === selectedArea)!;
                return (
                  <>
                    <div className="border-b border-gray-200 pb-4">
                      <h2 className="text-lg font-bold text-gray-900">Área {current.number}: {current.name}</h2>
                      <p className="text-xs text-gray-500 mt-1">{current.description}</p>
                    </div>

                    {/* Area KPIs */}
                    {current.kpis.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">KPIs del Área</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                          {current.kpis.map((k, i) => (
                            <div key={i} className="bg-white p-2.5 rounded border border-gray-200">
                              <p className="text-[11px] text-gray-500 truncate">{k.name}</p>
                              <input 
                                type="text"
                                placeholder={`Valor (${k.unit})`}
                                className="w-full mt-1 text-xs border-0 border-b border-gray-300 focus:border-blue-600 focus:ring-0 p-0 font-semibold text-gray-900"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Questions */}
                    <div className="space-y-6">
                      {current.questions.map(q => (
                        <div key={q.id} className="space-y-2 border-b border-gray-100 pb-5 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <label className="text-sm font-semibold text-gray-900">
                              {q.id}. {q.title}
                            </label>
                            {q.kpi && (
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
                                KPI
                              </span>
                            )}
                          </div>
                          {q.guide && <p className="text-xs text-gray-400 italic">💡 {q.guide}</p>}
                          
                          {q.hasScale && (
                            <div className="flex items-center gap-2 pt-1 pb-2">
                              <span className="text-xs text-gray-400">Escala (1-5):</span>
                              {[1, 2, 3, 4, 5].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setDiagnosticScale(prev => ({ ...prev, [q.id]: val }))}
                                  className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                                    diagnosticScale[q.id] === val
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          )}

                          <textarea
                            rows={3}
                            value={diagnosticAnswers[q.id] || ''}
                            onChange={e => setDiagnosticAnswers({ ...diagnosticAnswers, [q.id]: e.target.value })}
                            placeholder="Escribe aquí la evaluación detallada o evidencia recolectada..."
                            className="w-full text-xs rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <button 
                        onClick={() => alert('Diagnóstico guardado correctamente en Supabase.')}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                      >
                        Guardar Respuestas del Área
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER PLAN ESTRATÉGICO */}
      {activeTab === 'master_plan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Código</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Eje & Acción Estratégica</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Prioridad</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Plazos</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Responsable</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Progreso</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks
                    .filter(t => selectedAxis === 'all' || t.axis === selectedAxis)
                    .map((task, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{task.code}</td>
                        <td className="px-4 py-3 max-w-sm">
                          <p className="font-bold text-gray-900">{task.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.priority === 'Alta' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {task.startDate} → {task.dueDate}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700">{task.assignedRole}</td>
                        <td className="px-4 py-3 w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${task.progress}%` }} />
                            </div>
                            <span className="font-semibold text-gray-600">{task.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            task.status === 'en_proceso' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {task.status.replace('_', ' ')}
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

      {/* TAB 4: PENTÁGONO DEL ORDEN */}
      {activeTab === 'pentagon' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">Medición Trimestral de Madurez (PENT-PE)</h2>
            <p className="text-xs text-gray-500 mb-6">Registro histórico de scores en escala 0–10 para cada uno de los 5 ejes estratégicos.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Eje Estratégico</th>
                    <th className="px-4 py-3 text-center">Línea Base (Ago 2026)</th>
                    <th className="px-4 py-3 text-center">M1 (+3m Nov 2026)</th>
                    <th className="px-4 py-3 text-center">M2 (+6m Feb 2027)</th>
                    <th className="px-4 py-3 text-center bg-blue-50/50 text-blue-900">IME Actual (0-10)</th>
                    <th className="px-4 py-3 text-center bg-emerald-50/50 text-emerald-900">Meta Trienal (2029)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">EJE 1: Gobernanza y Conducción Estratégica</td>
                    <td className="px-4 py-3 text-center">5.0</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">5.8</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center font-bold bg-blue-50/30 text-blue-800">5.8</td>
                    <td className="px-4 py-3 text-center font-bold bg-emerald-50/30 text-emerald-800">8.5</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">EJE 2: Procesos y Operaciones</td>
                    <td className="px-4 py-3 text-center">3.7</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">4.5</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center font-bold bg-blue-50/30 text-blue-800">4.5</td>
                    <td className="px-4 py-3 text-center font-bold bg-emerald-50/30 text-emerald-800">8.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">EJE 3: Finanzas y Control de Gestión</td>
                    <td className="px-4 py-3 text-center">4.0</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">5.0</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center font-bold bg-blue-50/30 text-blue-800">5.0</td>
                    <td className="px-4 py-3 text-center font-bold bg-emerald-50/30 text-emerald-800">8.5</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">EJE 4: Talento y Estructura Organizacional</td>
                    <td className="px-4 py-3 text-center">6.0</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">6.2</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center font-bold bg-blue-50/30 text-blue-800">6.2</td>
                    <td className="px-4 py-3 text-center font-bold bg-emerald-50/30 text-emerald-800">8.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">EJE 5: Comercial y Expansión de Negocio</td>
                    <td className="px-4 py-3 text-center">5.5</td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600">6.0</td>
                    <td className="px-4 py-3 text-center text-gray-400">-</td>
                    <td className="px-4 py-3 text-center font-bold bg-blue-50/30 text-blue-800">6.0</td>
                    <td className="px-4 py-3 text-center font-bold bg-emerald-50/30 text-emerald-800">8.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MATRIZ DE RIESGOS (5x5) */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-1">Registro de Riesgos Organizacionales (Matriz IRE)</h2>
            <p className="text-xs text-gray-500 mb-6">Calificación de Probabilidad (1–5) e Impacto (1–5). Nivel Inherente = P × I.</p>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 font-bold text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Categoría & Riesgo</th>
                    <th className="px-4 py-3 text-center">Prob (1-5)</th>
                    <th className="px-4 py-3 text-center">Imp (1-5)</th>
                    <th className="px-4 py-3 text-center">Nivel Inherente</th>
                    <th className="px-4 py-3 text-left">Estrategia & Mitigación</th>
                    <th className="px-4 py-3 text-center">Nivel Residual</th>
                    <th className="px-4 py-3 text-left">Alerta Temprana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {risks.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-red-600">{r.code}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{r.category}</span>
                        <p className="font-bold text-gray-900 mt-0.5">{r.riskName}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{r.probInherent}</td>
                      <td className="px-4 py-3 text-center font-bold">{r.impInherent}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded font-extrabold bg-red-100 text-red-800">
                          {r.levelInherent}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-bold text-blue-700 uppercase text-[10px] block">{r.strategy}</span>
                        <p className="text-gray-600 text-[11px] mt-0.5">{r.mitigationActions}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded font-extrabold bg-yellow-100 text-yellow-800">
                          {r.levelResidual}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">{r.earlyWarningKpi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REUNIONES & MINUTAS */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Historial de Sesiones de Tutoría</h2>
            <button className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Nueva Reunión
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {meetings.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {meetings.map((m) => (
                  <li key={m.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <Link to={`/meetings/${m.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors">
                          {m.title}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Fecha: {new Date(m.meeting_date).toLocaleDateString()} · Estado: {m.status}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/meetings/${m.id}`}
                      className="px-3 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700"
                    >
                      Ver Minuta & Audio →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-10 text-center text-gray-400 text-xs font-medium">No hay reuniones registradas para este cliente.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
