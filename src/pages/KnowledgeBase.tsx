import { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  Target, 
  Mic, 
  ShieldCheck, 
  Calendar, 
  Activity, 
  ChevronRight, 
  UserCheck, 
  Sparkles,
  Award,
  Terminal,
  FileText
} from 'lucide-react';

interface GuideItem {
  id: string;
  title: string;
  category: 'consultor' | 'cliente' | 'tecnico' | 'tutorial';
  readTime: string;
  summary: string;
  steps?: { title: string; desc: string; tip?: string }[];
  contentSections?: { heading: string; body: string; alert?: string }[];
  tags: string[];
}

const KNOWLEDGE_ITEMS: GuideItem[] = [
  {
    id: 'tut-whisper-checkout',
    title: 'Tutorial Interactivo: Sesión en Vivo con Whisper y Check out',
    category: 'tutorial',
    readTime: '4 min',
    summary: 'Guía paso a paso para ejecutar una entrevista con transcripción WebSockets en tiempo real, persistencia en chunks de 30s y validación final de respuestas.',
    tags: ['Whisper', 'Check out', 'Grabación', 'Diagnóstico'],
    steps: [
      {
        title: '1. Planificación y Mapeo de la Agenda',
        desc: 'En el expediente del cliente, pestaña "Minutas de Sesiones", elija un preset rápido (ej. Diagnóstico 360° o Kickoff) o busque preguntas específicas por área temática.',
        tip: 'Planifique entre 4 y 8 preguntas para una reunión de 60 minutos.'
      },
      {
        title: '2. Inicio de Grabación y Streaming en Vivo',
        desc: 'Conecte el micrófono y pulse "Iniciar Grabación". El sistema activa WakeLock para que la pantalla no se apague y modula el audio en la barra Redline. Verá la transcripción en vivo palabra por palabra.',
        tip: 'Cada 30 segundos exactos se guarda un chunk en IndexedDB local y en la nube.'
      },
      {
        title: '3. Finalización y Análisis con Inteligencia Artificial',
        desc: 'Haga clic en "Finalizar Sesión & Analizar". La IA compilará el audio, redactará el resumen ejecutivo, generará el mapa conceptual Mermaid y asignará respuestas tentativas.',
        tip: 'Los datos de la IA son estrictamente preliminares hasta el paso de Check out.'
      },
      {
        title: '4. Paso de Check out (Validación Humana Obligatoria)',
        desc: 'Proyecte la pantalla al cliente. Revisen juntos cada respuesta extraída y edítela si requiere ajustes. Ingrese el nombre del directivo que valida y las observaciones.',
        tip: 'Al pulsar "Confirmar Check out e Impactar en Diagnóstico", las respuestas se consolidan de manera oficial en la base de datos.'
      }
    ]
  },
  {
    id: 'tut-quarterly-review',
    title: 'Tutorial Interactivo: Seguimiento Trimestral del Master Plan (Ciclo 90 Días)',
    category: 'tutorial',
    readTime: '3 min',
    summary: 'Procedimiento formal para la recalibración de metas, evaluación del Pentágono y generación de acuerdos en el comité de cada 3 meses.',
    tags: ['Master Plan', 'Trimestral', 'Pentágono', 'Radar'],
    steps: [
      {
        title: '1. Verificación de la Alerta de Cadencia',
        desc: 'Revise el contador de días en Master Plan > Seguimiento Trimestral. Si supera los 90 días, la alerta roja pulsante indica que el comité está vencido.',
        tip: 'Convoque a los directores de la PyME con al menos 7 días de antelación.'
      },
      {
        title: '2. Sesión Trimestral con Grabación',
        desc: 'Abra la sesión "3. Seguimiento Trimestral". Evalúe los hitos completados, los bloqueos y los desvíos ocurridos en el trimestre.',
        tip: 'Valide las decisiones tomadas durante el Check out de la reunión.'
      },
      {
        title: '3. Registro de Puntajes del Pentágono',
        desc: 'Pulse "+ Registrar Nueva Revisión Trimestral". Ingrese las nuevas calificaciones del 1 al 10 para Gobernanza, Procesos, Finanzas, Talento y Comercial.',
        tip: 'Escriba con claridad los logros clave y las 3 prioridades innegociables del próximo trimestre.'
      },
      {
        title: '4. Análisis del Radar Trienal y Ajuste de Tareas',
        desc: 'Verifique la evolución en el gráfico Radar (Línea Base vs Actual vs Meta Trienal). Vuelva a "Plan de Acción" para reprogramar tareas pendientes.',
        tip: 'Descargue la Minuta Trimestral en PDF para la firma de los accionistas.'
      }
    ]
  },
  {
    id: 'manual-consultor-gs',
    title: 'Manual Completo del Consultor GS • Metodología en 5 Fases',
    category: 'consultor',
    readTime: '12 min',
    summary: 'Estatuto operativo obligatorio para consultores líderes y auditores de Consultora GS: desde el Kickoff hasta el gobierno corporativo trienal.',
    tags: ['Metodología', 'Fases', 'Auditoría', 'Calidad', 'IME'],
    contentSections: [
      {
        heading: '1. Filosofía de Consultora GS',
        body: 'GS busca institucionalizar PyMEs reduciendo la dependencia de sus fundadores. Todo diagnóstico se fundamenta en evidencias medibles y se rige por el principio de confidencialidad absoluta.',
        alert: 'Estrictamente prohibido compartir datos, minutas o estadísticas de un cliente con otro.'
      },
      {
        heading: '2. Las 5 Fases del Ciclo de Vida',
        body: 'Fase 1: Kickoff & OMV (Visión trienal consensuada) → Fase 2: Diagnóstico Dinámico 360° (78 preguntas en 10 áreas) → Fase 3: Matrices Estratégicas y FODA ponderado → Fase 4: Master Plan Trienal (4 Ejes de acción) → Fase 5: Seguimiento Trimestral cada 90 días.'
      },
      {
        heading: '3. Semáforo de Calidad y Auditoría de Reportes',
        body: 'Los diagnósticos y planes se clasifican en: ROJO (Borrador interno en recopilación, oculto para el cliente), AMARILLO (Revisado por Auditoría GS) y VERDE (Aprobado y publicado para visualización del cliente en su portal).'
      }
    ]
  },
  {
    id: 'manual-cliente-portal',
    title: 'Manual del Cliente • Portal de Dirección y KPIs Estratégicos',
    category: 'cliente',
    readTime: '8 min',
    summary: 'Guía para socios fundadores, directores generales y gerentes de PyMEs sobre cómo interpretar el IME, IRE, Pentágono y Master Plan.',
    tags: ['Cliente', 'IME', 'IRE', 'Portal', 'Directorio'],
    contentSections: [
      {
        heading: '1. ¿Qué es el Índice de Madurez Empresarial (IME)?',
        body: 'El IME mide en una escala de 1 a 10 el nivel de profesionalización de su empresa. Puntajes de 1 a 3.9 reflejan alta informalidad; de 4 a 6.9 representan transición; y de 7 a 10 constituyen una empresa institucionalizada y autónoma. La meta del programa es alcanzar al menos 8.0 en 36 meses.'
      },
      {
        heading: '2. ¿Qué es el Índice de Riesgo Empresarial (IRE)?',
        body: 'Mide la probabilidad de contingencias críticas que amenazan la continuidad patrimonial o legal de la firma. Es inversamente proporcional al IME: a mayor madurez, menor riesgo.'
      },
      {
        heading: '3. El Entregable OMV (Visión a 3 Años)',
        body: 'El Objetivo Material Visualizado resume la meta económica, comercial y organizativa de la empresa a 36 meses. Es el faro con el que el directorio toma decisiones de inversión.'
      },
      {
        heading: '4. Cómo Utilizar el Portal en sus Comités Internos',
        body: 'Utilice el Portal GS en sus reuniones semanales para auditar las tareas en curso, chequear el estado de los proyectos y descargar minutas formales.'
      }
    ]
  },
  {
    id: 'manual-seguridad-growy',
    title: 'Guía Técnica: Aislamiento Multi-Tenant y Agente "Growy"',
    category: 'tecnico',
    readTime: '10 min',
    summary: 'Especificación técnica sobre la arquitectura de datos, WebSocket streaming Whisper y el blindaje anti-fugas de información para el asistente Growy.',
    tags: ['Growy', 'Seguridad', 'Multi-tenant', 'Edge Functions', 'Supabase'],
    contentSections: [
      {
        heading: '1. Principio de Aislamiento de Datos por id_cliente',
        body: 'El agente de Inteligencia Artificial "Growy" tiene acceso profundo al contexto de cada cliente, pero tiene estrictamente prohibido responder o filtrar datos hacia otros expedientes.',
        alert: 'El backend forzará en cada consulta scopedOrgId = organization_id sin excepciones.'
      },
      {
        heading: '2. Capas de Seguridad Implementadas',
        body: '1. System Prompt con directiva de confidencialidad Nivel 0. 2. Filtrado duro por organization_id en todas las herramientas del bot (meetings, minutes, master_plan, diagnostic_responses). 3. Row-Level Security (RLS) en PostgreSQL.'
      },
      {
        heading: '3. Streaming Whisper con Fallback Automático',
        body: 'El audio se transmite a 16 kHz PCM vía WebSockets. Si la conexión se degrada, el sistema conmuta sin pausa a la Web Speech API del navegador, garantizando 0% de interrupciones.'
      }
    ]
  }
];

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tutorial' | 'consultor' | 'cliente' | 'tecnico'>('all');
  const [activeGuideId, setActiveGuideId] = useState<string>(KNOWLEDGE_ITEMS[0].id);

  // Filtrado de ítems
  const filteredGuides = useMemo(() => {
    return KNOWLEDGE_ITEMS.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const activeGuide = KNOWLEDGE_ITEMS.find(g => g.id === activeGuideId) || KNOWLEDGE_ITEMS[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
              Centro de Conocimiento Oficial • Consultora GS
            </span>
          </div>
          <h1 className="text-3xl font-black font-display tracking-tight text-zinc-950 uppercase">
            Manuales, Guías y Tutoriales
          </h1>
          <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
            Protocolos operativos, metodologías de diagnóstico, tutoriales interactivos de reuniones en vivo y especificaciones de seguridad.
          </p>
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar guías, IME, Whisper..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border-2 border-zinc-900 focus:border-red-600 focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Tabs de Filtro por Categoría */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todos los Documentos', icon: BookOpen },
          { id: 'tutorial', label: 'Tutoriales Paso a Paso', icon: Sparkles },
          { id: 'consultor', label: 'Manual del Consultor GS', icon: Award },
          { id: 'cliente', label: 'Manual del Cliente (Portal)', icon: UserCheck },
          { id: 'tecnico', label: 'Guía Técnica & Growy', icon: Terminal }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all ${
              selectedCategory === tab.id
                ? 'bg-zinc-950 text-white shadow-sm'
                : 'bg-white border-2 border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-950'
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${selectedCategory === tab.id ? 'text-red-500' : 'text-zinc-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Layout de Dos Columnas: Selector Lateral + Visor Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Lista de Guías */}
        <div className="lg:col-span-5 space-y-3">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-zinc-500 block px-1">
            Artículos y Módulos ({filteredGuides.length})
          </span>

          {filteredGuides.map(guide => {
            const isActive = guide.id === activeGuide.id;
            return (
              <div
                key={guide.id}
                onClick={() => setActiveGuideId(guide.id)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
                  isActive
                    ? 'border-red-600 bg-red-50/50 shadow-crimson'
                    : 'border-zinc-200 bg-white hover:border-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${
                    guide.category === 'tutorial' 
                      ? 'bg-purple-100 text-purple-700' 
                      : guide.category === 'consultor'
                      ? 'bg-red-100 text-red-700'
                      : guide.category === 'cliente'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    {guide.category.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {guide.readTime}
                  </span>
                </div>

                <h3 className={`font-display text-sm font-black uppercase tracking-tight ${
                  isActive ? 'text-zinc-950' : 'text-zinc-800'
                }`}>
                  {guide.title}
                </h3>

                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                  {guide.summary}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {guide.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-zinc-200 text-zinc-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Columna Derecha: Visor de Contenido Activo */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border-2 border-zinc-900 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Header del Artículo */}
            <div className="border-b-2 border-zinc-200 pb-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-zinc-950 text-white rounded text-[10px] font-display font-bold uppercase tracking-wider">
                  {activeGuide.category.toUpperCase()}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  Lectura estimada: {activeGuide.readTime}
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950">
                {activeGuide.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                {activeGuide.summary}
              </p>
            </div>

            {/* Caso 1: Tutorial Interactivo Paso a Paso */}
            {activeGuide.steps && (
              <div className="space-y-4">
                <h3 className="font-display text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Pasos de Ejecución Obligatoria
                </h3>

                <div className="space-y-3">
                  {activeGuide.steps.map((step, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50/60 space-y-2 hover:border-zinc-900 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-950 text-white text-xs font-display font-black">
                          {idx + 1}
                        </span>
                        <h4 className="font-display text-xs sm:text-sm font-black uppercase text-zinc-950">
                          {step.title}
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed pl-8">
                        {step.desc}
                      </p>
                      {step.tip && (
                        <div className="ml-8 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-medium flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span><strong>Consejo GS:</strong> {step.tip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caso 2: Secciones de Contenido de Manual */}
            {activeGuide.contentSections && (
              <div className="space-y-5">
                {activeGuide.contentSections.map((sec, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="font-display text-sm sm:text-base font-black uppercase tracking-wide text-zinc-950 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-red-600" />
                      {sec.heading}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed pl-6">
                      {sec.body}
                    </p>
                    {sec.alert && (
                      <div className="ml-6 p-3 rounded-xl bg-red-50 border-2 border-red-300 text-xs text-red-950 font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{sec.alert}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Matriz de Accesos Directos a Referencias */}
            <div className="p-4 rounded-xl bg-zinc-950 text-white space-y-3">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Referencias Rápidas y Atajos
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>IME: Escala 1.0 a 10.0 (Meta: 8.0)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                  <Target className="w-3.5 h-3.5 text-red-400" />
                  <span>OMV: Visión trienal consensuada</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                  <Mic className="w-3.5 h-3.5 text-purple-400" />
                  <span>Whisper: WebSockets 16kHz PCM</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seguimiento: Cadencia cada 90 días</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
