import { useState, useMemo } from 'react';
import { 
  DIAGNOSTIC_AREAS, 
  type DiagnosticArea, 
  type DiagnosticQuestion 
} from '../../data/diagnosticQuestions';
import { 
  Target, 
  Mic, 
  Calendar, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Save, 
  X
} from 'lucide-react';
import type { MeetingType } from './ClientMeetingSession';

export interface PlannedMeetingData {
  meetingType: MeetingType;
  title: string;
  date: string;
  attendees: string;
  selectedQuestions: DiagnosticQuestion[];
  selectedAreaIds: string[];
  customTopics?: string[];
}

interface ClientMeetingPlannerProps {
  client: any;
  diagnosticAnswers?: Record<string, any>;
  initialType?: MeetingType;
  onStartLiveMeeting: (plannedData: PlannedMeetingData) => void;
  onSavePlannedMeeting?: (plannedData: PlannedMeetingData) => void;
  onCancel: () => void;
}

// Temas y preguntas guía predefinidas para Kickoff
const KICKOFF_TOPICS = [
  {
    id: 'ko_vision',
    title: '1. Visión OMV a 3 Años',
    desc: 'Metas cuantitativas y cualitativas de facturación, dotación, posicionamiento y rentabilidad.',
    questions: [
      { id: 9001, code: 'OMV-01', areaId: 'kickoff', title: '¿Dónde debe estar la empresa en 36 meses en facturación y margen neto?', options: [] },
      { id: 9002, code: 'OMV-02', areaId: 'kickoff', title: '¿Qué cuota de mercado, productos estrella o expansión territorial visualizan?', options: [] },
      { id: 9003, code: 'OMV-03', areaId: 'kickoff', title: '¿Qué estructura organizativa y de gobierno corporativo debe estar operando?', options: [] },
    ]
  },
  {
    id: 'ko_dolores',
    title: '2. Situación Actual y Puntos de Dolor',
    desc: 'Cuellos de botella, dependencia del fundador y vulnerabilidades que frenan el crecimiento hoy.',
    questions: [
      { id: 9004, code: 'DOL-01', areaId: 'kickoff', title: '¿Cuáles son los 3 mayores obstáculos que impiden a la dirección delegar y crecer hoy?', options: [] },
      { id: 9005, code: 'DOL-02', areaId: 'kickoff', title: '¿Qué procesos o áreas sufren mayor desorden o descontrol de costos?', options: [] },
    ]
  },
  {
    id: 'ko_expectativas',
    title: '3. Expectativas de los Socios y Gobierno',
    desc: 'Alineación de visiones entre socios, protocolo familiar o societario y reglas de juego.',
    questions: [
      { id: 9006, code: 'SOC-01', areaId: 'kickoff', title: '¿Existe consenso pleno entre los socios respecto al rumbo y dividendos de la empresa?', options: [] },
      { id: 9007, code: 'SOC-02', areaId: 'kickoff', title: '¿Qué esperan concretamente del acompañamiento de Consultora GS?', options: [] },
    ]
  }
];

// Temas y preguntas guía predefinidas para Seguimiento Trimestral
const QUARTERLY_TOPICS = [
  {
    id: 'qr_pentagono',
    title: '1. Evaluación del Pentágono de Madurez',
    desc: 'Remedición de los 5 ejes: Gobernanza, Procesos, Finanzas, Talento y Comercial.',
    questions: [
      { id: 9101, code: 'TRI-01', areaId: 'trimestral', title: '¿Cómo evolucionó la formalización de comités y actas de directorio en los últimos 90 días?', options: [] },
      { id: 9102, code: 'TRI-02', areaId: 'trimestral', title: '¿Se cumplieron los objetivos de flujo de caja, margen y presupuesto del trimestre?', options: [] },
      { id: 9103, code: 'TRI-03', areaId: 'trimestral', title: '¿Qué avances tangibles se lograron en estandarización de procesos y manuales?', options: [] },
    ]
  },
  {
    id: 'qr_master_plan',
    title: '2. Auditoría del Master Plan de Tareas',
    desc: 'Revisión de tareas comprometidas, entregables presentados y porcentaje de avance.',
    questions: [
      { id: 9104, code: 'TRI-04', areaId: 'trimestral', title: '¿Qué iniciativas del Master Plan fueron concluidas con entregable validado?', options: [] },
      { id: 9105, code: 'TRI-05', areaId: 'trimestral', title: '¿Qué tareas presentaron demoras o desvíos y cuáles fueron las causas raíz?', options: [] },
    ]
  },
  {
    id: 'qr_prioridades',
    title: '3. Prioridades Innegociables Q+1 (Próximos 90 Días)',
    desc: 'Focos de intervención estratégica y metas del nuevo ciclo trimestral.',
    questions: [
      { id: 9106, code: 'TRI-06', areaId: 'trimestral', title: '¿Cuáles son los 3 hitos innegociables que deben completarse en el próximo trimestre?', options: [] },
    ]
  }
];

export default function ClientMeetingPlanner({
  client,
  diagnosticAnswers = {},
  initialType = 'diagnostico',
  onStartLiveMeeting,
  onSavePlannedMeeting,
  onCancel
}: ClientMeetingPlannerProps) {
  const [meetingType, setMeetingType] = useState<MeetingType>(initialType);
  const [title, setTitle] = useState(() => {
    if (initialType === 'kickoff') return `Reunión de Kickoff & Definición OMV - ${client.name}`;
    if (initialType === 'seguimiento_trimestral') return `Comité Trimestral de Seguimiento (90 Días) - ${client.name}`;
    return `Sesión de Diagnóstico 360° - ${client.name}`;
  });
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [attendees, setAttendees] = useState(client.client_lead_name ? `${client.client_lead_name} (Dirección)` : 'Director General, Consultor Líder GS');

  // Selección en Diagnóstico: Temas (Áreas) y Preguntas de cada tema
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(['area_1_personas', 'area_3_operaciones']);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>('area_1_personas');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>(() => {
    // Por defecto seleccionar 2 preguntas de las áreas iniciales
    const initialQs: number[] = [];
    DIAGNOSTIC_AREAS.filter(a => a.id === 'area_1_personas' || a.id === 'area_3_operaciones').forEach(a => {
      if (a.questions[0]) initialQs.push(a.questions[0].id);
      if (a.questions[1]) initialQs.push(a.questions[1].id);
    });
    return initialQs;
  });
  const [searchQuestion, setSearchQuestion] = useState('');

  // Selección en Kickoff y Trimestral
  const [selectedTopicIds] = useState<string[]>(['ko_vision', 'ko_dolores', 'ko_expectativas', 'qr_pentagono', 'qr_master_plan', 'qr_prioridades']);
  const [selectedCustomQuestionIds, setSelectedCustomQuestionIds] = useState<number[]>([9001, 9002, 9003, 9004, 9101, 9102, 9104]);

  // Actualizar título por defecto al cambiar de tipo
  const handleTypeChange = (newType: MeetingType) => {
    setMeetingType(newType);
    if (newType === 'kickoff') {
      setTitle(`Reunión de Kickoff & Definición OMV - ${client.name}`);
    } else if (newType === 'seguimiento_trimestral') {
      setTitle(`Comité Trimestral de Seguimiento (90 Días) - ${client.name}`);
    } else {
      setTitle(`Sesión de Diagnóstico 360° - ${client.name}`);
    }
  };

  // Toggle de Tema (Área) en Diagnóstico
  const toggleArea = (areaId: string) => {
    if (selectedAreaIds.includes(areaId)) {
      // Deseleccionar tema y sus preguntas
      setSelectedAreaIds(selectedAreaIds.filter(id => id !== areaId));
      const area = DIAGNOSTIC_AREAS.find(a => a.id === areaId);
      if (area) {
        const areaQIds = area.questions.map(q => q.id);
        setSelectedQuestionIds(selectedQuestionIds.filter(id => !areaQIds.includes(id)));
      }
    } else {
      // Seleccionar tema y automáticamente sus primeras preguntas
      setSelectedAreaIds([...selectedAreaIds, areaId]);
      const area = DIAGNOSTIC_AREAS.find(a => a.id === areaId);
      if (area && area.questions.length > 0) {
        const newIds = area.questions.slice(0, 3).map(q => q.id);
        setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...newIds])));
      }
      setExpandedAreaId(areaId);
    }
  };

  // Toggle de Pregunta individual
  const toggleQuestion = (questionId: number, areaId: string) => {
    if (selectedQuestionIds.includes(questionId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== questionId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, questionId]);
      if (!selectedAreaIds.includes(areaId)) {
        setSelectedAreaIds([...selectedAreaIds, areaId]);
      }
    }
  };

  // Seleccionar todas las preguntas de un área
  const selectAllInArea = (area: DiagnosticArea) => {
    const areaQIds = area.questions.map(q => q.id);
    setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...areaQIds])));
    if (!selectedAreaIds.includes(area.id)) {
      setSelectedAreaIds([...selectedAreaIds, area.id]);
    }
  };

  // Deseleccionar todas las preguntas de un área
  const deselectAllInArea = (area: DiagnosticArea) => {
    const areaQIds = area.questions.map(q => q.id);
    setSelectedQuestionIds(selectedQuestionIds.filter(id => !areaQIds.includes(id)));
  };

  // Construir array final de preguntas seleccionadas
  const finalSelectedQuestions = useMemo<DiagnosticQuestion[]>(() => {
    if (meetingType === 'diagnostico') {
      const allDiagQuestions = DIAGNOSTIC_AREAS.flatMap(a => a.questions);
      return allDiagQuestions.filter(q => selectedQuestionIds.includes(q.id));
    }
    if (meetingType === 'kickoff') {
      const koQuestions = KICKOFF_TOPICS.flatMap(t => t.questions) as any[];
      return koQuestions.filter(q => selectedCustomQuestionIds.includes(q.id));
    }
    if (meetingType === 'seguimiento_trimestral') {
      const qrQuestions = QUARTERLY_TOPICS.flatMap(t => t.questions) as any[];
      return qrQuestions.filter(q => selectedCustomQuestionIds.includes(q.id));
    }
    return [];
  }, [meetingType, selectedQuestionIds, selectedCustomQuestionIds]);

  const estimatedDurationMinutes = Math.max(15, finalSelectedQuestions.length * 6);

  // Iniciar reunión en vivo
  const handleStartNow = () => {
    if (finalSelectedQuestions.length === 0) {
      alert('Por favor seleccione al menos un tema o pregunta para la agenda de la reunión.');
      return;
    }
    onStartLiveMeeting({
      meetingType,
      title,
      date: `${date} ${time}`,
      attendees,
      selectedQuestions: finalSelectedQuestions,
      selectedAreaIds,
    });
  };

  // Guardar planificación para después
  const handleSaveOnly = () => {
    if (onSavePlannedMeeting) {
      onSavePlannedMeeting({
        meetingType,
        title,
        date: `${date} ${time}`,
        attendees,
        selectedQuestions: finalSelectedQuestions,
        selectedAreaIds,
      });
    } else {
      alert('Planificación guardada con éxito.');
      onCancel();
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm overflow-hidden animate-in fade-in duration-300">
      {/* Encabezado Principal del Planificador */}
      <div className="bg-zinc-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-900">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-red-500">
              Planificación de Reunión • {client.name}
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Planificar Nueva Reunión
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Defina el tipo de sesión, seleccione los temas y elija las preguntas específicas que se abordarán con el cliente.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="self-start sm:self-center p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          title="Cancelar planificación"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* PASO 1: SELECCIÓN DEL TIPO DE REUNIÓN */}
        <div className="space-y-3">
          <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-950 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black">1</span>
            Seleccione el Tipo de Reunión
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Opción 1: Kickoff */}
            <div
              onClick={() => handleTypeChange('kickoff')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 relative ${
                meetingType === 'kickoff'
                  ? 'border-red-600 bg-red-50/50 shadow-crimson ring-2 ring-red-600/20'
                  : 'border-zinc-200 hover:border-zinc-900 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-sm font-black uppercase text-zinc-950">
                    1. Kick off
                  </h3>
                </div>
                {meetingType === 'kickoff' && (
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Alineación inicial, definición del <strong>Objetivo Material Visualizado (OMV) a 3 años</strong> y minutas ejecutivas en PDF.
              </p>
              <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                Entregable OMV + Minutas
              </span>
            </div>

            {/* Opción 2: Diagnóstico 360 */}
            <div
              onClick={() => handleTypeChange('diagnostico')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 relative ${
                meetingType === 'diagnostico'
                  ? 'border-red-600 bg-red-50/50 shadow-crimson ring-2 ring-red-600/20'
                  : 'border-zinc-200 hover:border-zinc-900 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-sm font-black uppercase text-zinc-950">
                    2. Diagnóstico 360°
                  </h3>
                </div>
                {meetingType === 'diagnostico' && (
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Relevamiento exhaustivo por <strong>temas y preguntas</strong>. Registra el avance en el perfil, cálculo de IME/IRE y Check out.
              </p>
              <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                78 Preguntas • 10 Áreas
              </span>
            </div>

            {/* Opción 3: Seguimiento Trimestral */}
            <div
              onClick={() => handleTypeChange('seguimiento_trimestral')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all space-y-2 relative ${
                meetingType === 'seguimiento_trimestral'
                  ? 'border-red-600 bg-red-50/50 shadow-crimson ring-2 ring-red-600/20'
                  : 'border-zinc-200 hover:border-zinc-900 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="font-display text-sm font-black uppercase text-zinc-950">
                    3. Revisión Trimestral
                  </h3>
                </div>
                {meetingType === 'seguimiento_trimestral' && (
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                )}
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Comité de <strong>cadencia cada 90 días</strong>: auditoría del Master Plan, recalibración de los 5 vértices del Pentágono y radar.
              </p>
              <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                Ciclo 90 Días • Radar Histórico
              </span>
            </div>
          </div>
        </div>

        {/* PASO 2: DATOS BÁSICOS DE LA REUNIÓN */}
        <div className="space-y-4 pt-4 border-t border-zinc-200">
          <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-950 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-950 text-white text-[11px] font-black">2</span>
            Datos y Convocatoria de la Sesión
          </label>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 space-y-1">
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-600">
                Título de la Reunión
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border-2 border-zinc-300 focus:border-red-600 focus:outline-none text-xs font-medium"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-600">
                Fecha Programada
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border-2 border-zinc-300 focus:border-red-600 focus:outline-none text-xs font-medium"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-600">
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border-2 border-zinc-300 focus:border-red-600 focus:outline-none text-xs font-medium"
              />
            </div>

            <div className="md:col-span-12 space-y-1">
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-600">
                Participantes / Asistentes Convocados
              </label>
              <input
                type="text"
                value={attendees}
                onChange={e => setAttendees(e.target.value)}
                placeholder="Ej. Roberto Gómez (Director General), Laura Pérez (Gerente Finanzas), Consultor GS"
                className="w-full px-3.5 py-2 rounded-xl border-2 border-zinc-300 focus:border-red-600 focus:outline-none text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* PASO 3: QUÉ SE VA A HABLAR EN LA REUNIÓN (TEMAS Y PREGUNTAS) */}
        <div className="space-y-4 pt-4 border-t border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black">3</span>
                Temario y Preguntas de la Reunión
              </label>
              <p className="text-xs text-zinc-500 mt-0.5">
                {meetingType === 'diagnostico' 
                  ? 'Seleccione los temas del catálogo y marque las preguntas específicas que se abordarán en esta entrevista.'
                  : 'Seleccione los temas clave y preguntas guía para estructurar la sesión.'}
              </p>
            </div>

            {/* Contador en Vivo de Temas y Preguntas */}
            <div className="flex items-center gap-2 bg-zinc-950 text-white px-3.5 py-1.5 rounded-xl text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>
                <strong>{meetingType === 'diagnostico' ? selectedAreaIds.length : selectedTopicIds.length}</strong> temas • <strong>{finalSelectedQuestions.length}</strong> preguntas
              </span>
              <span className="text-zinc-400">
                (~{estimatedDurationMinutes} min)
              </span>
            </div>
          </div>

          {/* CASO A: DIAGNÓSTICO (ELEGIR TEMAS Y PREGUNTAS DE CADA TEMA) */}
          {meetingType === 'diagnostico' && (
            <div className="space-y-6">
              {/* Buscador de preguntas rápido */}
              <div className="flex items-center justify-between gap-4">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Catálogo de Diagnóstico: 10 Temas Estratégicos
                </span>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuestion}
                    onChange={e => setSearchQuestion(e.target.value)}
                    placeholder="Filtrar por código o palabra..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Mosaico de Temas / Áreas con Acordeón Desplegable */}
              <div className="space-y-3">
                {DIAGNOSTIC_AREAS.map(area => {
                  const isAreaSelected = selectedAreaIds.includes(area.id);
                  const isExpanded = expandedAreaId === area.id;
                  const selectedInAreaCount = area.questions.filter(q => selectedQuestionIds.includes(q.id)).length;

                  // Filtrar preguntas si hay búsqueda
                  const displayedQuestions = searchQuestion.trim()
                    ? area.questions.filter(q => 
                        q.title.toLowerCase().includes(searchQuestion.toLowerCase()) ||
                        q.code.toLowerCase().includes(searchQuestion.toLowerCase())
                      )
                    : area.questions;

                  if (searchQuestion.trim() && displayedQuestions.length === 0) {
                    return null; // Ocultar si no coincide con búsqueda
                  }

                  return (
                    <div
                      key={area.id}
                      className={`rounded-2xl border-2 transition-all overflow-hidden ${
                        isAreaSelected 
                          ? 'border-red-600 bg-red-50/20 shadow-sm' 
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      {/* Barra del Tema (Cabecera) */}
                      <div className="p-4 flex items-center justify-between gap-3 bg-white">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleArea(area.id)}
                            className="text-red-600 hover:scale-110 transition-transform"
                            title={isAreaSelected ? 'Quitar tema de la reunión' : 'Incluir tema en la reunión'}
                          >
                            {isAreaSelected ? (
                              <CheckSquare className="w-5 h-5 fill-red-600 text-white" />
                            ) : (
                              <Square className="w-5 h-5 text-zinc-400" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800">
                                Tema #{area.number}
                              </span>
                              <h4 className="font-display text-sm font-black uppercase text-zinc-950">
                                {area.name}
                              </h4>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                              {area.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                            selectedInAreaCount > 0 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {selectedInAreaCount} / {area.questions.length} preguntas
                          </span>

                          <button
                            type="button"
                            onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors"
                            title={isExpanded ? 'Colapsar preguntas' : 'Ver preguntas de este tema'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Lista Desplegable de Preguntas de este Tema */}
                      {isExpanded && (
                        <div className="p-4 pt-2 border-t border-zinc-200 bg-zinc-50/50 space-y-3">
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200">
                            <span className="font-bold text-zinc-700">
                              Preguntas del Tema: {area.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => selectAllInArea(area)}
                                className="text-[11px] font-bold text-red-600 hover:text-red-700 uppercase"
                              >
                                Seleccionar Todas ({area.questions.length})
                              </button>
                              <span className="text-zinc-300">|</span>
                              <button
                                type="button"
                                onClick={() => deselectAllInArea(area)}
                                className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 uppercase"
                              >
                                Desmarcar Todas
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
                            {displayedQuestions.map(q => {
                              const isQSelected = selectedQuestionIds.includes(q.id);
                              const isAnswered = Boolean(diagnosticAnswers[q.id]);

                              return (
                                <div
                                  key={q.id}
                                  onClick={() => toggleQuestion(q.id, area.id)}
                                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                                    isQSelected
                                      ? 'border-red-600 bg-white shadow-sm ring-1 ring-red-600/10'
                                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                                  }`}
                                >
                                  <div className="mt-0.5 text-red-600">
                                    {isQSelected ? (
                                      <CheckSquare className="w-4 h-4 fill-red-600 text-white" />
                                    ) : (
                                      <Square className="w-4 h-4 text-zinc-300" />
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800">
                                        {q.code}
                                      </span>
                                      {isAnswered ? (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                          <CheckCircle2 className="w-2.5 h-2.5" /> Ya Relevada
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                          Pendiente de Relevamiento
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-bold text-zinc-900 mt-1">
                                      {q.title}
                                    </p>
                                    {q.guide && (
                                      <p className="text-[11px] text-zinc-500 mt-0.5 italic">
                                        Pauta: {q.guide}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CASO B: KICKOFF (VISIÓN OMV, DOLORES, EXPECTATIVAS) */}
          {meetingType === 'kickoff' && (
            <div className="space-y-4">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 block">
                Temas Clave de la Sesión de Kickoff
              </span>

              <div className="space-y-3">
                {KICKOFF_TOPICS.map(topic => (
                  <div key={topic.id} className="p-4 rounded-2xl border-2 border-zinc-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-display text-sm font-black uppercase text-zinc-950">
                          {topic.title}
                        </h4>
                        <p className="text-xs text-zinc-500">{topic.desc}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      {topic.questions.map(q => {
                        const isQSelected = selectedCustomQuestionIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              if (isQSelected) {
                                setSelectedCustomQuestionIds(selectedCustomQuestionIds.filter(id => id !== q.id));
                              } else {
                                setSelectedCustomQuestionIds([...selectedCustomQuestionIds, q.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                              isQSelected ? 'border-red-600 bg-red-50/30' : 'border-zinc-200 bg-white'
                            }`}
                          >
                            <div className="mt-0.5 text-red-600">
                              {isQSelected ? (
                                <CheckSquare className="w-4 h-4 fill-red-600 text-white" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-300" />
                              )}
                            </div>
                            <div>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                {q.code}
                              </span>
                              <p className="text-xs font-bold text-zinc-900 mt-1">
                                {q.title}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CASO C: REVISIÓN TRIMESTRAL (PENTÁGONO, MASTER PLAN, PRIORIDADES Q+1) */}
          {meetingType === 'seguimiento_trimestral' && (
            <div className="space-y-4">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-zinc-700 block">
                Temas Clave de la Revisión Trimestral (90 Días)
              </span>

              <div className="space-y-3">
                {QUARTERLY_TOPICS.map(topic => (
                  <div key={topic.id} className="p-4 rounded-2xl border-2 border-zinc-200 bg-white space-y-3">
                    <div>
                      <h4 className="font-display text-sm font-black uppercase text-zinc-950">
                        {topic.title}
                      </h4>
                      <p className="text-xs text-zinc-500">{topic.desc}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      {topic.questions.map(q => {
                        const isQSelected = selectedCustomQuestionIds.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              if (isQSelected) {
                                setSelectedCustomQuestionIds(selectedCustomQuestionIds.filter(id => id !== q.id));
                              } else {
                                setSelectedCustomQuestionIds([...selectedCustomQuestionIds, q.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                              isQSelected ? 'border-red-600 bg-red-50/30' : 'border-zinc-200 bg-white'
                            }`}
                          >
                            <div className="mt-0.5 text-red-600">
                              {isQSelected ? (
                                <CheckSquare className="w-4 h-4 fill-red-600 text-white" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-300" />
                              )}
                            </div>
                            <div>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800">
                                {q.code}
                              </span>
                              <p className="text-xs font-bold text-zinc-900 mt-1">
                                {q.title}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE ACCIÓN INFERIOR */}
        <div className="pt-6 border-t-2 border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-zinc-300 hover:border-zinc-900 text-xs font-display font-bold uppercase tracking-wider text-zinc-700 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-zinc-900 hover:bg-zinc-100 text-xs font-display font-black uppercase tracking-wider text-zinc-950 flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar Planificación
            </button>

            <button
              type="button"
              onClick={handleStartNow}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-crimson hover:scale-105 transition-all"
            >
              <Mic className="w-4 h-4" />
              Iniciar Reunión con Whisper en Vivo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
