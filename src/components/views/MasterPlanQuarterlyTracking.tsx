import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, 
  TrendingUp, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

interface QuarterlyReview {
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
  initiatives_status?: any[];
  summary_notes?: string;
  consultant_name?: string;
  next_review_date?: string;
  status: string;
}

interface MasterPlanQuarterlyTrackingProps {
  clientId: string;
  clientName: string;
  onReviewsUpdated?: () => void;
}

export interface AxisWeightedAction {
  id: string;
  axis: 'gobernanza' | 'procesos' | 'finanzas' | 'talento' | 'comercial';
  title: string;
  weightPct: number;
  progressPct: number;
}

const DEFAULT_WEIGHTED_ACTIONS: AxisWeightedAction[] = [
  // Gobernanza
  { id: 'wa-1', axis: 'gobernanza', title: 'Formalización de Directorio mensual con actas', weightPct: 50, progressPct: 40 },
  { id: 'wa-2', axis: 'gobernanza', title: 'Protocolo de socios y ordenamiento de dividendos', weightPct: 50, progressPct: 30 },
  // Procesos
  { id: 'wa-3', axis: 'procesos', title: 'Mapeo y manual de procesos estándar (ISO 9001)', weightPct: 40, progressPct: 50 },
  { id: 'wa-4', axis: 'procesos', title: 'Trazabilidad y control de tiempos de entrega', weightPct: 30, progressPct: 35 },
  { id: 'wa-5', axis: 'procesos', title: 'Gestión de no conformidades y reclamos', weightPct: 30, progressPct: 20 },
  // Finanzas
  { id: 'wa-6', axis: 'finanzas', title: 'Flujo de caja proyectado a 6 meses', weightPct: 40, progressPct: 60 },
  { id: 'wa-7', axis: 'finanzas', title: 'Punto de equilibrio y rentabilidad por unidad', weightPct: 35, progressPct: 45 },
  { id: 'wa-8', axis: 'finanzas', title: 'Reserva de liquidez operativa (90 días)', weightPct: 25, progressPct: 30 },
  // Talento
  { id: 'wa-9', axis: 'talento', title: 'Organigrama y perfiles de mandos medios', weightPct: 40, progressPct: 45 },
  { id: 'wa-10', axis: 'talento', title: 'Evaluación de desempeño y metas por área', weightPct: 35, progressPct: 30 },
  { id: 'wa-11', axis: 'talento', title: 'Plan de capacitación y autonomía operativa', weightPct: 25, progressPct: 25 },
  // Comercial
  { id: 'wa-12', axis: 'comercial', title: 'Sistematización comercial (reducción boca a boca)', weightPct: 40, progressPct: 35 },
  { id: 'wa-13', axis: 'comercial', title: 'Medición de satisfacción NPS y recompra', weightPct: 30, progressPct: 40 },
  { id: 'wa-14', axis: 'comercial', title: 'Estrategia de pricing y cartera de clientes clave', weightPct: 30, progressPct: 30 },
];

export default function MasterPlanQuarterlyTracking({
  clientId,
  clientName,
  onReviewsUpdated
}: MasterPlanQuarterlyTrackingProps) {
  const [reviews, setReviews] = useState<QuarterlyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State for New Quarterly Review
  const [formQuarter, setFormQuarter] = useState('Q3-2026');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState({
    gobernanza: 7.0,
    procesos: 6.5,
    finanzas: 7.2,
    talento: 6.8,
    comercial: 6.0
  });
  const [summaryNotes, setSummaryNotes] = useState('');
  const [consultantName, setConsultantName] = useState('Martín Gómez (Consultor Senior)');
  const [saving, setSaving] = useState(false);

  // Ponderación Matemática por Incidencias (Metodología Abel)
  const [useMathCalc, setUseMathCalc] = useState(true);
  const [activeAxisTab, setActiveAxisTab] = useState<'gobernanza' | 'procesos' | 'finanzas' | 'talento' | 'comercial'>('gobernanza');
  const [weightedActions, setWeightedActions] = useState<AxisWeightedAction[]>(DEFAULT_WEIGHTED_ACTIONS);

  const baselineScores = useMemo(() => {
    const lb = reviews.find(r => r.id.includes('lb') || r.quarter.toLowerCase().includes('base')) || reviews[0];
    return lb?.pentagon_scores || { gobernanza: 5.2, procesos: 4.5, finanzas: 6.0, talento: 5.0, comercial: 4.8 };
  }, [reviews]);

  const updateActionProgress = (actionId: string, progress: number) => {
    const nextActions = weightedActions.map(a => a.id === actionId ? { ...a, progressPct: progress } : a);
    setWeightedActions(nextActions);

    if (useMathCalc) {
      const axes: Array<'gobernanza' | 'procesos' | 'finanzas' | 'talento' | 'comercial'> = [
        'gobernanza', 'procesos', 'finanzas', 'talento', 'comercial'
      ];
      const newScores = { ...scores };
      axes.forEach(ax => {
        const axActions = nextActions.filter(a => a.axis === ax);
        const totalContribution = axActions.reduce((sum, a) => sum + (a.weightPct / 100) * (a.progressPct / 100), 0);
        const base = (baselineScores as any)[ax] || 1.0;
        const calculated = base + (10 - base) * totalContribution;
        newScores[ax] = Math.min(10, Math.max(1, parseFloat(calculated.toFixed(1))));
      });
      setScores(newScores);
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('master_plan_quarterly_reviews')
        .select('*')
        .eq('organization_id', clientId)
        .order('review_date', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setReviews(data);
      } else {
        // Fallback initial reviews if table empty
        const initialLB: QuarterlyReview = {
          id: 'lb-1',
          quarter: 'Q1-2026 (Línea Base)',
          review_date: '2026-06-01',
          pentagon_scores: { gobernanza: 5.2, procesos: 4.5, finanzas: 6.0, talento: 5.0, comercial: 4.8 },
          ime_score: 5.1,
          ire_score: 4.9,
          summary_notes: 'Medición de inicio de tutoría estratégica GS. Enfoque en ordenamiento de procesos operativos.',
          status: 'completed',
          next_review_date: '2026-09-01'
        };
        const initialQ2: QuarterlyReview = {
          id: 'q2-1',
          quarter: 'Q2-2026 (Primer Trimestre)',
          review_date: '2026-09-01',
          pentagon_scores: { gobernanza: 6.8, procesos: 5.9, finanzas: 7.1, talento: 6.3, comercial: 5.5 },
          ime_score: 6.32,
          ire_score: 3.68,
          summary_notes: 'Consolidación de directorio e inicio de estandarización ISO 9001 en operaciones.',
          status: 'completed',
          next_review_date: '2026-12-01'
        };
        setReviews([initialLB, initialQ2]);
      }
    } catch (err: any) {
      console.warn('Error fetching quarterly reviews:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchReviews();
    }
  }, [clientId]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const ime = Number(((scores.gobernanza + scores.procesos + scores.finanzas + scores.talento + scores.comercial) / 5).toFixed(2));
    const ire = Number((10 - ime).toFixed(2));

    const nextDate = new Date(formDate);
    nextDate.setDate(nextDate.getDate() + 90); // 90 days = 3 months

    try {
      const newRecord = {
        organization_id: clientId,
        quarter: formQuarter,
        review_date: formDate,
        pentagon_scores: scores,
        ime_score: ime,
        ire_score: ire,
        summary_notes: summaryNotes,
        consultant_name: consultantName,
        next_review_date: nextDate.toISOString().split('T')[0],
        status: 'completed'
      };

      const { data, error } = await (supabase as any)
        .from('master_plan_quarterly_reviews')
        .insert(newRecord)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setReviews(prev => [...prev, data]);
      }
      setShowModal(false);
      if (onReviewsUpdated) onReviewsUpdated();
      alert('¡Remedición trimestral guardada con éxito! Pentágono del Orden e indicadores actualizados.');
    } catch (err: any) {
      console.error('Error saving review:', err);
      // Local addition
      const localReview: QuarterlyReview = {
        id: crypto.randomUUID(),
        quarter: formQuarter,
        review_date: formDate,
        pentagon_scores: scores,
        ime_score: ime,
        ire_score: ire,
        summary_notes: summaryNotes,
        consultant_name: consultantName,
        next_review_date: nextDate.toISOString().split('T')[0],
        status: 'completed'
      };
      setReviews(prev => [...prev, localReview]);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  // Prepare radar chart data comparing Linea Base vs Latest Remediation
  const latestReview = reviews[reviews.length - 1];
  const baselineReview = reviews[0];

  const radarData = [
    {
      subject: '1. Gobernanza',
      lineaBase: baselineReview?.pentagon_scores?.gobernanza || 5.0,
      actual: latestReview?.pentagon_scores?.gobernanza || 6.5,
      metaTrienal: 8.5
    },
    {
      subject: '2. Procesos',
      lineaBase: baselineReview?.pentagon_scores?.procesos || 4.5,
      actual: latestReview?.pentagon_scores?.procesos || 6.0,
      metaTrienal: 8.0
    },
    {
      subject: '3. Finanzas',
      lineaBase: baselineReview?.pentagon_scores?.finanzas || 6.0,
      actual: latestReview?.pentagon_scores?.finanzas || 7.0,
      metaTrienal: 8.5
    },
    {
      subject: '4. Talento',
      lineaBase: baselineReview?.pentagon_scores?.talento || 5.0,
      actual: latestReview?.pentagon_scores?.talento || 6.5,
      metaTrienal: 8.0
    },
    {
      subject: '5. Comercial',
      lineaBase: baselineReview?.pentagon_scores?.comercial || 4.8,
      actual: latestReview?.pentagon_scores?.comercial || 5.8,
      metaTrienal: 8.0
    }
  ];

  // Calculate days until next review
  const nextReviewDateStr = latestReview?.next_review_date || '';
  let daysUntilNext = 90;
  let isOverdue = false;
  if (nextReviewDateStr) {
    const diffTime = new Date(nextReviewDateStr).getTime() - new Date().getTime();
    daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOverdue = daysUntilNext < 0;
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
              Gestión a Largo Plazo • Tutoría GS
            </span>
          </div>
          <h2 className="font-display text-2xl font-black text-zinc-950 uppercase tracking-tight flex items-center gap-2">
            Seguimiento Trimestral: {clientName}
            {loading && <RefreshCw className="w-4 h-4 text-red-600 animate-spin" />}
          </h2>
          <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
            Conforme al procedimiento GS, las remediciones formales del Pentágono del Orden y del avance de OKRs se registran cada 3 meses para monitorear el progreso hacia la madurez meta (7.5 - 8.0).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-crimson hover:scale-105 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Registrar Remedición Trimestral
        </button>
      </div>

      {/* Cadence Alert Badge */}
      <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
        isOverdue 
          ? 'bg-amber-50 border-amber-400 text-amber-900' 
          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          {isOverdue ? (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          ) : (
            <Clock className="w-5 h-5 text-emerald-600" />
          )}
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider">
              {isOverdue 
                ? '¡Remedición Trimestral Requerida!' 
                : 'Ciclo de Seguimiento en Plazo Regular'}
            </span>
            <p className="text-xs mt-0.5">
              {isOverdue 
                ? `Han transcurrido más de 90 días desde la última medición formal de ${latestReview?.quarter}. Se recomienda agendar la sesión de remedición.`
                : `Próxima evaluación trimestral programada para el ${new Date(nextReviewDateStr || Date.now()).toLocaleDateString('es-AR')} (en ${daysUntilNext} días).`}
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold px-3 py-1 bg-white rounded-lg border shadow-sm">
          Cadencia: 90 Días
        </span>
      </div>

      {/* Two Columns: Historical Timeline & Radar Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timeline of Quarterly Reviews (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h3 className="font-display text-base font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Historial de Mediciones Trimestrales ({reviews.length})
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Meta GS: 7.5 - 8.0 IME
            </span>
          </div>

          <div className="space-y-4">
            {reviews.map((rev, index) => {
              const isLatest = index === reviews.length - 1;
              return (
                <div
                  key={rev.id || index}
                  className={`p-4 rounded-xl border-2 transition-all space-y-3 ${
                    isLatest 
                      ? 'border-red-600 bg-red-50/40 shadow-sm ring-2 ring-red-500/10' 
                      : 'border-zinc-200 bg-zinc-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-black uppercase text-zinc-950">
                          {rev.quarter}
                        </span>
                        {isLatest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-600 text-white font-display">
                            Última Medición
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        Fecha de Evaluación: {new Date(rev.review_date).toLocaleDateString('es-AR')} • {rev.consultant_name || 'Consultor GS'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-black text-zinc-950">
                        IME: <strong className="text-red-600 text-sm">{rev.ime_score}</strong> / 10
                      </span>
                      <p className="text-[10px] font-mono text-zinc-500">
                        IRE: {rev.ire_score}
                      </p>
                    </div>
                  </div>

                  {rev.summary_notes && (
                    <p className="text-xs text-zinc-700 bg-white p-3 rounded-lg border border-zinc-200 leading-relaxed">
                      {rev.summary_notes}
                    </p>
                  )}

                  {/* Pentágono Scores Mini-Bar */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-[10px]">
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="block text-zinc-400">GOB</span>
                      <strong className="text-zinc-900">{rev.pentagon_scores?.gobernanza}</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="block text-zinc-400">PROC</span>
                      <strong className="text-zinc-900">{rev.pentagon_scores?.procesos}</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="block text-zinc-400">FIN</span>
                      <strong className="text-zinc-900">{rev.pentagon_scores?.finanzas}</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="block text-zinc-400">TAL</span>
                      <strong className="text-zinc-900">{rev.pentagon_scores?.talento}</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="block text-zinc-400">COM</span>
                      <strong className="text-zinc-900">{rev.pentagon_scores?.comercial}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Radar Comparison & Evolution (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 pb-3">
            <h3 className="font-display text-base font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-600" />
              Pentágono del Orden: Evolución
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Comparativa de Madurez (Escala 1 a 10) entre Línea Base vs Remedición Actual vs Meta Trienal.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#09090b', fontSize: 11, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#a1a1aa" />
                <Radar 
                  name="Línea Base" 
                  dataKey="lineaBase" 
                  stroke="#94a3b8" 
                  fill="#94a3b8" 
                  fillOpacity={0.2} 
                />
                <Radar 
                  name="Medición Actual" 
                  dataKey="actual" 
                  stroke="#dc2626" 
                  fill="#dc2626" 
                  fillOpacity={0.4} 
                />
                <Radar 
                  name="Meta Trienal" 
                  dataKey="metaTrienal" 
                  stroke="#059669" 
                  fill="#059669" 
                  fillOpacity={0.15} 
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-600">Evolución Neta IME:</span>
              <span className="font-mono font-black text-emerald-600 text-sm">
                +{(Number(latestReview?.ime_score || 0) - Number(baselineReview?.ime_score || 0)).toFixed(2)} pts
              </span>
            </div>
            <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-red-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, ((latestReview?.ime_score || 0) / 10) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 text-center">
              Madurez Actual: {latestReview?.ime_score || 0}/10 • Objetivo Metodológico GS: 7.5/10
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVA REMEDICIÓN TRIMESTRAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border-2 border-zinc-900 max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <span className="font-display text-[10px] font-bold uppercase tracking-widest text-red-600">
                  Cadencia Trimestral (3 Meses)
                </span>
                <h3 className="font-display text-xl font-black uppercase tracking-tight text-zinc-950">
                  Nueva Remedición del Pentágono
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-900 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                    Trimestre
                  </label>
                  <input
                    type="text"
                    value={formQuarter}
                    onChange={e => setFormQuarter(e.target.value)}
                    placeholder="Ej. Q3-2026"
                    required
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-300 focus:border-red-600 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                    Fecha de Medición
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-300 focus:border-red-600 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Modo de Cálculo: Matemático Ponderado vs Directo */}
              <div className="space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-2.5">
                  <div>
                    <span className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-950">
                      Metodología del Pentágono Ponderado:
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      El puntaje evoluciona matemáticamente por la incidencia real de cada acción
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUseMathCalc(true)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        useMathCalc
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white text-zinc-600 border border-zinc-300'
                      }`}
                    >
                      ⚡ Por Incidencias (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseMathCalc(false)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        !useMathCalc
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-white text-zinc-600 border border-zinc-300'
                      }`}
                    >
                      Ajuste Manual
                    </button>
                  </div>
                </div>

                {useMathCalc ? (
                  <div className="space-y-3 pt-1">
                    {/* Selector de Eje */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {(['gobernanza', 'procesos', 'finanzas', 'talento', 'comercial'] as const).map(ax => (
                        <button
                          key={ax}
                          type="button"
                          onClick={() => setActiveAxisTab(ax)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider capitalize whitespace-nowrap transition-colors border ${
                            activeAxisTab === ax
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {ax} ({scores[ax]})
                        </button>
                      ))}
                    </div>

                    {/* Acciones e Incidencias del Eje Activo */}
                    <div className="bg-white p-3 rounded-xl border border-zinc-200 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-800 border-b border-zinc-100 pb-1.5">
                        <span className="capitalize">Acciones del Eje: {activeAxisTab}</span>
                        <span className="text-[10px] text-zinc-500">Incidencia Ponderada</span>
                      </div>

                      {weightedActions.filter(a => a.axis === activeAxisTab).map(action => (
                        <div key={action.id} className="space-y-1.5 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-900 pr-2">{action.title}</span>
                            <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0">
                              {action.weightPct}% Incidencia
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={action.progressPct}
                              onChange={e => updateActionProgress(action.id, parseInt(e.target.value) || 0)}
                              className="w-full accent-red-600 h-1.5 bg-zinc-200 rounded-lg cursor-pointer"
                            />
                            <span className="font-mono text-xs font-bold text-zinc-900 w-12 text-right shrink-0">
                              {action.progressPct}%
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Caja de Explicación de la Fórmula de Abel */}
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-[11px] text-emerald-950 flex items-center justify-between">
                        <div>
                          <span className="font-bold block">Fórmula de Madurez Ponderada:</span>
                          <span className="font-mono text-[10px] text-emerald-800">
                            Base ({(baselineScores as any)[activeAxisTab] || 1.0}) + (10 - Base) × Σ(%Incidencia × %Avance)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Puntaje Calculado</span>
                          <span className="font-mono text-base font-black text-emerald-900 leading-none">
                            {scores[activeAxisTab]} / 10
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Resumen de los 5 Puntajes Resultantes */}
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-zinc-200">
                  {(['gobernanza', 'procesos', 'finanzas', 'talento', 'comercial'] as const).map(ax => (
                    <div key={ax} className="text-center bg-white p-2 rounded-lg border border-zinc-200">
                      <span className="block text-[9px] text-zinc-500 font-bold uppercase truncate">{ax}</span>
                      {useMathCalc ? (
                        <span className="font-mono font-black text-sm text-zinc-950 block mt-0.5">
                          {scores[ax]}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          value={scores[ax]}
                          onChange={e => setScores({ ...scores, [ax]: parseFloat(e.target.value) || 0 })}
                          className="w-full p-1 text-center text-xs font-mono font-bold rounded border border-zinc-300 mt-0.5"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                  Resumen de Avances y Decisiones Estratégicas
                </label>
                <textarea
                  value={summaryNotes}
                  onChange={e => setSummaryNotes(e.target.value)}
                  rows={3}
                  placeholder="Detalle de hitos alcanzados en este trimestre y ajustes para los próximos 3 meses..."
                  className="w-full p-2.5 rounded-lg border-2 border-zinc-300 focus:border-red-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                  Consultor / Auditor Responsable
                </label>
                <input
                  type="text"
                  value={consultantName}
                  onChange={e => setConsultantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-300 focus:border-red-600 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-950 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Guardar Remedición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
