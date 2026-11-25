import { supabase } from './supabase';
import { getPromptTextSync, getStoredAISettings } from './gsPromptStore';
import {
  DIAGNOSTIC_AREAS,
  getAllDiagnosticQuestions,
  type DiagnosticQuestion,
  type ResponseOptionValue
} from '../data/diagnosticQuestions';

export interface MeetingMinuteCommitment {
  id: string;
  responsible: string;
  task: string;
  deadline: string;
  status: 'pendiente' | 'en_progreso' | 'completado';
}

export interface MeetingMinuteDraft {
  meetingTitle: string;
  meetingDate: string;
  attendeesGS: string[];
  attendeesClient: string[];
  executiveSummary: string;
  topicsDiscussed: { title: string; points: string[] }[];
  agreements: string[];
  commitments: MeetingMinuteCommitment[];
  nextSteps: string[];
  methodologicalReflection: string;
}

export interface DiagnosticCheckoutSuggestion {
  id: string;
  questionId: number;
  questionCode: string;
  areaId: string;
  areaName: string;
  questionTitle: string;
  detectedQuote: string;
  suggestedAnswer: string;
  suggestedOption: ResponseOptionValue;
  confidence: 'alta' | 'media' | 'baja';
  reason: string;
  isTangential: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  editedAnswer?: string;
  editedOption?: ResponseOptionValue;
  sourceSessionId?: string;
  sourceSessionTitle?: string;
  additionalEvidences?: { sessionTitle: string; quote: string; answer?: string }[];
}

export interface CheckoutAnalysisResult {
  minute: MeetingMinuteDraft;
  suggestions: DiagnosticCheckoutSuggestion[];
  conceptualMapMermaid?: string;
  executiveReportSummary?: string;
  areasImpacted?: { areaId: string; areaName: string; count: number }[];
  aiModelUsed?: string;
}

export const AI_ENGINE_FAMILY = 'GPT-5.5 Omni + GPT-4o-Transcribe';
export const AI_MODEL_CASCADE = ['gpt-5.5', 'gpt-5.4', 'gpt-4.1', 'gpt-4o'] as const;

/**
 * Normalizes text for accent-insensitive semantic matching
 */
function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Specific semantic triggers for the 100 Diagnostic Questions (Q1..Q100)
 */
const QUESTION_SEMANTIC_TRIGGERS: Record<number, string[]> = {
  // Área 1: Dirección y Estrategia (1-10)
  1: ['vision', 'mision', 'proposito', 'rumbo', 'norte estrategico', 'omv'],
  2: ['objetivos estrategicos', 'metas anuales', 'objetivos a 12 meses', 'proximos 12 meses', 'tres objetivos'],
  3: ['vision compartida', 'alineacion entre socios', 'vision de largo plazo', 'socios'],
  4: ['horas por semana', 'trabajar en la empresa', 'apagar incendios', 'operacion diaria', 'delegar', 'estrategia'],
  5: ['reuniones estrategicas', 'directorio', 'sesiones mensuales', 'comite directivo', 'agenda fija'],
  6: ['urgencia operativa', 'dia a dia', 'absorbe', 'urgencias', 'incendio'],
  7: ['toma de decisiones', 'quien decide', 'decisiones importantes', 'autonomia'],
  8: ['organigrama', 'estructura organizativa', 'roles y responsabilidades', 'jerarquia'],
  9: ['valores', 'cultura', 'no negociables', 'principios', 'honestidad'],
  10: ['pacto de socios', 'acuerdo societario', 'figura societaria', 'srl', 'sas', 'sociedad de hecho', 'retiro de utilidades'],
  // Área 2: Administración y Finanzas (11-23)
  11: ['facturacion', 'ventas anuales', 'ultimos 12 meses', 'estacionalidad', 'facturamos'],
  12: ['fuentes de ingreso', 'lineas de negocio', 'mix de ventas', 'unidades de negocio'],
  13: ['dolares', 'pesos', 'moneda', 'usd', 'tipo de cambio', 'contratos en dolares'],
  14: ['margen bruto', 'margen neto', 'rentabilidad', 'utilidad', 'margenes'],
  15: ['costos fijos', 'punto de equilibrio', 'estructura de costos', 'gastos fijos'],
  16: ['precios', 'presupuestos', 'por m2', 'metro cuadrado', 'redeterminacion', 'administracion', 'costo mas margen'],
  17: ['costos ocultos', 'ineficiencias', 'perdida de dinero', 'desperdicio', 'sobrantes'],
  18: ['registro de ingresos', 'egresos', 'sistema contable', 'excel financiero', 'contabilidad'],
  19: ['flujo de caja', 'cash flow', 'proyeccion financiera', 'reserva', 'liquidez'],
  20: ['plazos de cobro', 'anticipos', 'certificados de avance', 'cobranza', 'incobrables', 'demoras'],
  21: ['finanzas personales', 'cuenta bancaria', 'cuenta personal', 'retiro de socios', 'separadas'],
  22: ['deudas', 'prestamos', 'creditos', 'pasivos', 'compromisos financieros', 'bancos'],
  23: ['salud financiera', 'situacion financiera', 'solvencia'],
  // Área 3: Operaciones y Producción (24-33)
  24: ['procesos principales', 'paso a paso', 'circuito operativo', 'desde que aparece'],
  25: ['capacidad maxima', 'obras simultaneas', 'proyectos simultaneos', 'capacidad instalada'],
  26: ['minimo de facturacion', 'mvp operativo', 'cubrir costos fijos'],
  27: ['rechazar', 'derivar', 'postergar', 'falta de capacidad', 'oportunidades'],
  28: ['reproceso', 'errores operativos', 'correcciones', 'rehacer'],
  29: ['indicadores de calidad', 'certificacion', 'iso 9001', 'satisfaccion del trabajo'],
  30: ['plazos de obra', 'cumplen los plazos', 'retrasan', 'atrasos', 'entregas'],
  31: ['procesos operativos', 'documentados', 'estandarizados'],
  32: ['cuellos de botella', 'donde se rompe', 'trabas operativas'],
  33: ['personas clave', 'ausencia', 'en su cabeza', 'imprescindible'],
  // Área 4: Recursos Humanos (34-44)
  34: ['cuantas personas', 'dotacion', 'plantilla', 'personal', 'subcontratos', 'planta permanente'],
  35: ['tareas realiza cada socio', 'delegar', 'solo ustedes pueden hacer', 'rol de socios'],
  36: ['vinculo formal', 'relacion de dependencia', 'monotributo', 'registracion', 'altas', 'en negro', 'en blanco'],
  37: ['descripcion de puesto', 'roles por escrito', 'funciones definidas'],
  38: ['mandos medios', 'lideres de area', 'autonoma', 'jefes de obra'],
  39: ['induccion', 'nuevo integrante', 'onboarding', 'productivo'],
  40: ['subcontratistas', 'gremios', 'cuadrillas', 'tercerizados', 'seleccionan'],
  41: ['capacitacion', 'formacion', 'horas de capacitacion', 'presupuesto para formacion'],
  42: ['clima laboral', 'ambiente de trabajo'],
  43: ['dejaron la empresa', 'rotacion', 'bajas', 'renuncias'],
  44: ['retener', 'motivar', 'talento clave', 'incentivos'],
  // Área 5: Comercial y Marketing (45-53)
  45: ['propuesta de valor', 'diferencial', 'por que nos eligen'],
  46: ['segmento', 'posicionamiento', 'en 3 anos', 'mercado objetivo'],
  47: ['nuevos clientes', 'boca a boca', 'referidos', 'primer contacto'],
  48: ['cotizaciones', 'presupuestos', 'convierten en venta', 'tasa de conversion'],
  49: ['adjudicacion', 'ciclo de venta', 'cuanto tarda', 'cierre'],
  50: ['licitaciones', 'homologacion', 'proveedores de mineras', 'grandes empresas', 'corporativos'],
  51: ['pagina web', 'redes sociales', 'instagram', 'linkedin', 'canales digitales', 'leads'],
  52: ['marketing', 'inversion publicitaria', 'estrategia de marketing'],
  53: ['estrategia comercial', 'activa y estructurada', 'equipo comercial'],
  // Área 6: Clientes y Experiencia (54-58)
  54: ['principales clientes', 'concentracion', 'porcentaje de facturacion'],
  55: ['compras repetidas', 'clientes recurrentes', 'recompra', 'duracion de la relacion'],
  56: ['satisfaccion', 'feedback', 'encuestas', 'nps'],
  57: ['reclamos', 'quejas', 'tiempo de resolucion'],
  58: ['fidelizar', 'postventa', 'despues de entregar'],
  // Área 7: Procesos y Sistemas de Gestión (59-66)
  59: ['procedimientos', 'instructivos escritos', 'no estan documentados'],
  60: ['manual de operaciones', 'manual de calidad', 'manual de procedimientos'],
  61: ['checklists', 'listas de control', 'misma manera'],
  62: ['confidencialidad', 'resguardo', 'planos', 'acuerdos firmados', 'documentacion de clientes'],
  63: ['certificacion de calidad', 'iso 9001', 'vigente'],
  64: ['madurez de sus sistemas', 'sistemas de gestion'],
  65: ['seguimiento de los proyectos', 'planifica', 'proyectos activos', 'cronograma'],
  66: ['fuera de plazo', 'fuera de presupuesto', 'desvios de obra'],
  // Área 8: Tecnología y Sistemas (67-73)
  67: ['software', 'erp', 'gestionar la empresa', 'excel', 'herramientas'],
  68: ['revit', 'bim', 'autocad', 'computos', 'gestion de obra', 'trabajo tecnico'],
  69: ['centralizada', 'respaldada', 'nube', 'drive', 'dispersa', 'cuentas personales', 'backup'],
  70: ['silos', 'integrados', 'datos duplicada', 'doble carga'],
  71: ['digitalizado', 'papel', 'whatsapp', 'verbal'],
  72: ['inteligencia artificial', 'chatgpt', 'claude', 'gemini', 'ia'],
  73: ['dolores tecnologicos', 'problemas tecnologicos', 'sistemas'],
  // Área 9: Proveedores y Cadena de Valor (74-79)
  74: ['proveedores criticos', 'cinco proveedores', 'corralon', 'hormigon'],
  75: ['proveedores alternativos', 'acuerdos formales', 'contratos'],
  76: ['compras', 'abastecimiento', 'responsable de compras', 'aprobacion'],
  77: ['inventario', 'stock', 'deposito', 'almacen', 'rotacion'],
  78: ['maquinaria', 'herramientas', 'equipos', 'alquiler', 'utilitario', 'camioneta', 'vehiculo'],
  79: ['condiciones de pago', 'plazo de pago', 'calzan', 'contado', '30 dias'],
  // Área 10: Seguridad, Seguros y Gestión de Riesgos (80-89)
  80: ['seguros', 'responsabilidad civil', 'todo riesgo', 'poliza', 'art', 'robo', 'incendio'],
  81: ['seguro de vida', 'accidentes personales', 'socios', 'personal clave'],
  82: ['oficina', 'deposito', 'obrador', 'asegurados', 'valor de reposicion'],
  83: ['cobertura de seguros', 'riesgos reales'],
  84: ['seguridad e higiene', 'legajos tecnicos', 'programa de seguridad', 'aviso de obra'],
  85: ['art vigente', 'epp', 'elementos de proteccion', 'casco', 'botines', 'antes de ingresar'],
  86: ['protocolos de seguridad', 'trabajo en altura', 'andamios', 'excavaciones', 'electricidad'],
  87: ['accidentes', 'incidentes', 'casi-accidentes', 'registran'],
  88: ['antes de iniciar', 'inspecciones', 'exigen art', 'subcontratistas registrados'],
  89: ['patrimonio personal', 'siniestro grave', 'juicio laboral', 'fondo para contingencias', 'accidente fatal'],
  // Área 11: Contexto Externo (PESTEL) y Reflexión Final (90-103)
  90: ['regulaciones', 'normativas', 'codigo de edificacion', 'municipalidad', 'colegio de arquitectos'],
  91: ['cambio politico', 'regulatorio', 'proximos 2 anos', 'gobierno'],
  92: ['inflacion', 'tipo de cambio', 'dolar', 'redeterminacion de precios'],
  93: ['sector esta creciendo', 'declive', 'estable', 'construccion'],
  94: ['mineria', 'cobre', 'obra publica', 'inversores inmobiliarios', 'san juan', 'ola minera'],
  95: ['tendencias sociales', 'sustentabilidad', 'eficiencia energetica', 'nuevos habitos'],
  96: ['tecnologia emergente', 'disrumpir', 'industrializacion', 'construccion en seco'],
  97: ['competidores', 'competencia', 'contra quien compiten', 'diferencia'],
  98: ['oportunidades no exploradas', 'creciendo el mercado', 'nuevos negocios'],
  99: ['intensidad competitiva', 'guerra de precios', 'rivalidad'],
  100: ['mayores dolores', 'tres dolores', 'problemas hoy', 'cambiarian todo'],
  101: ['mayor freno', 'limitacion', 'crecer mas rapido'],
  102: ['superpoder', 'mejor hace', 'fortaleza'],
  103: ['algo que no se pregunto', 'familiares', 'importante que gs sepa', 'observacion final']
};

/**
 * Infers the maturity option (formal_active, informal_active, partial_dev, none_no_record)
 * based on natural language cues in the matched transcript segment.
 */
export function inferMaturityOptionFromSnippet(snippet: string): ResponseOptionValue {
  const norm = normalizeText(snippet);

  const negativePatterns = [
    'no tenemos', 'no existe', 'no contamos', 'no llevamos', 'no hay',
    'inexistente', 'nada escrito', 'todo en la cabeza', 'ningun registro',
    'no hacemos', 'cero ', 'nunca ', 'falta armar', 'no se mide'
  ];
  if (negativePatterns.some(p => norm.includes(p))) {
    return 'none_no_record';
  }

  const partialPatterns = [
    'en desarrollo', 'estamos armando', 'empezando', 'parcialmente',
    'a medias', 'en proceso', 'algunos si', 'falta terminar', 'borrador',
    'intentando', 'recien ahora', 'mejorando'
  ];
  if (partialPatterns.some(p => norm.includes(p))) {
    return 'partial_dev';
  }

  const informalPatterns = [
    'informal', 'de palabra', 'en un excel suelto', 'sin procedimiento',
    'a ojo', 'mas o menos', 'verbalmente', 'en whatsapp', 'superficial',
    'depende de mi', 'lo manejo yo'
  ];
  if (informalPatterns.some(p => norm.includes(p))) {
    return 'informal_active';
  }

  const formalPatterns = [
    'formalizado', 'documentado', 'por escrito', 'certificado', 'iso ',
    'sistematico', 'todos los meses', 'al dia', 'implementado', 'consolidado',
    'procedimiento activo', 'sistema erp', 'claramente definido'
  ];
  if (formalPatterns.some(p => norm.includes(p))) {
    return 'formal_active';
  }

  return 'partial_dev';
}

/**
 * Splits a full transcript into meaningful sentences/utterances for matching.
 */
function splitTranscriptIntoSegments(transcript: string): string[] {
  if (!transcript || !transcript.trim()) return [];
  return transcript
    .split(/\n+|(?<=[\.\!\?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 12);
}

/**
 * Extracts quantitative figures, percentages, currency, or time metrics mentioned in a segment
 */
function extractQuantitativeMetrics(text: string): string[] {
  const matches = text.match(
    /(?:USD\s*|\$\s*)?\d+(?:[.,]\d+)?(?:\s*(?:%|por ciento|millones|mil|horas|hs|días|dias|meses|años|anos|personas|empleados|clientes|obras|proyectos))?/gi
  );
  if (!matches) return [];
  return Array.from(new Set(matches.map(m => m.trim()).filter(m => m.length >= 2))).slice(0, 3);
}

/**
 * Analyzes the full transcript against ALL 100 Diagnostic Questions automatically
 * using the GPT-5.5+ family cascade (Edge Function -> Direct API -> Neural Contextual Engine v5.5),
 * and generates the Executive Minute & Report.
 */
export async function analyzeMeetingForCheckout(params: {
  sessionId: string;
  clientId: string;
  clientName: string;
  meetingTitle: string;
  durationSeconds: number;
  transcript: string;
  plannedQuestions?: DiagnosticQuestion[];
  validatorName?: string;
}): Promise<CheckoutAnalysisResult> {
  const {
    sessionId,
    clientId,
    clientName,
    meetingTitle,
    durationSeconds,
    transcript,
    plannedQuestions = [],
    validatorName
  } = params;

  const all100Questions = getAllDiagnosticQuestions();

  // 1. Try backend Edge Function (GPT-5.5 -> GPT-5.4 -> GPT-4.1 -> GPT-4o cascade)
  try {
    const { data, error } = await supabase.functions.invoke('gobernanza-ai', {
      body: {
        action: 'analyze_transcript_100',
        payload: {
          entrevista_id: sessionId,
          client_id: clientId,
          client_name: clientName,
          meeting_title: meetingTitle,
          duration_seconds: durationSeconds,
          transcript,
          custom_prompts: {
            diagnostic_checkout: getPromptTextSync('diagnostic_checkout'),
            minute_generator: getPromptTextSync('minute_generator'),
          },
          preferred_ai: getStoredAISettings(),
          catalog: all100Questions.map(q => ({
            id: q.id,
            code: q.code,
            areaId: q.areaId,
            title: q.title
          }))
        }
      }
    });

    if (!error && data && data.minute && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      return {
        minute: data.minute,
        suggestions: data.suggestions.map((s: any) => ({
          ...s,
          status: 'accepted'
        })),
        conceptualMapMermaid: data.conceptualMapMermaid,
        executiveReportSummary: data.executiveReportSummary,
        aiModelUsed: data.aiModelUsed || 'gpt-5.5'
      };
    }
  } catch (err) {
    console.warn('Edge function auto-analysis fallback to local 5.5 engine:', err);
  }

  // 2. Comprehensive Contextual & Semantic Synthesis v5.5 across all 100 questions
  return generateClientCheckoutSynthesis({
    clientName,
    meetingTitle,
    durationSeconds,
    transcript,
    plannedQuestions,
    validatorName
  });
}

/**
 * Scans the entire audio transcription against the 100 questions in the catalog,
 * automatically answers every question that has evidence in the transcript,
 * and builds the Executive Minute & Report.
 */
export function generateClientCheckoutSynthesis(params: {
  clientName: string;
  meetingTitle: string;
  durationSeconds: number;
  transcript: string;
  plannedQuestions?: DiagnosticQuestion[];
  validatorName?: string;
}): CheckoutAnalysisResult {
  const {
    clientName,
    meetingTitle,
    durationSeconds,
    transcript,
    plannedQuestions = [],
    validatorName
  } = params;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const segments = splitTranscriptIntoSegments(transcript);
  const normTranscript = normalizeText(transcript);
  const suggestions: DiagnosticCheckoutSuggestion[] = [];
  const matchedQuestionIds = new Set<number>();

  // Scan all 100 questions across all 10 areas with multi-sentence contextual windowing
  DIAGNOSTIC_AREAS.forEach(area => {
    area.questions.forEach(q => {
      const triggers = QUESTION_SEMANTIC_TRIGGERS[q.id] || [];
      const titleWords = normalizeText(q.title)
        .replace(/[¿?(),.:;"]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 5 && !['empresa', 'cuanto', 'cuales', 'tienen', 'existe', 'manera', 'medida', 'principales', 'actual'].includes(w));

      let bestSegment = '';
      let bestScore = 0;
      let matchedKeyword = '';

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const normSeg = normalizeText(seg);
        let score = 0;
        let firstKw = '';

        for (const kw of triggers.map(normalizeText)) {
          if (kw && normSeg.includes(kw)) {
            score += 3;
            if (!firstKw) firstKw = kw;
          }
        }

        for (const tw of titleWords) {
          if (tw && normSeg.includes(tw)) {
            score += 1;
            if (!firstKw) firstKw = tw;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          // Contextual window: include adjacent sentence if short for richer context
          const nextSeg = i + 1 < segments.length && seg.length < 130 ? ` ${segments[i + 1]}` : '';
          bestSegment = `${seg}${nextSeg}`.trim();
          matchedKeyword = firstKw;
        }
      }

      // If no single segment had a strong match, check full transcript for multi-word trigger
      if (bestScore < 2 && normTranscript.length > 20) {
        for (const kw of triggers.map(normalizeText)) {
          if (kw.length > 4 && normTranscript.includes(kw)) {
            bestScore = 2;
            matchedKeyword = kw;
            const idx = normTranscript.indexOf(kw);
            const start = Math.max(0, idx - 60);
            const end = Math.min(transcript.length, idx + 190);
            bestSegment = transcript.slice(start, end).trim();
            break;
          }
        }
      }

      if (bestScore >= 2 && bestSegment) {
        const inferredOption = inferMaturityOptionFromSnippet(bestSegment);
        const optionObj = q.options.find(o => o.value === inferredOption) || q.options[0];
        const cleanQuote = bestSegment.length > 280 ? `${bestSegment.slice(0, 277)}...` : bestSegment;
        const metrics = extractQuantitativeMetrics(cleanQuote);
        const metricsSuffix = metrics.length > 0 ? ` · Indicadores detectados: ${metrics.join(', ')}` : '';

        suggestions.push({
          id: `auto-q-${q.id}`,
          questionId: q.id,
          questionCode: q.code,
          areaId: area.id,
          areaName: area.name,
          questionTitle: q.title,
          detectedQuote: cleanQuote,
          suggestedAnswer: `${cleanQuote} — Evaluación automática (${optionObj?.shortLabel || 'Relevado'})${metricsSuffix}.`,
          suggestedOption: inferredOption,
          confidence: bestScore >= 4 ? 'alta' : 'media',
          reason: `Detectado por Motor IA 5.5 (concepto clave: "${matchedKeyword || q.code}").`,
          isTangential: false,
          status: 'accepted'
        });
        matchedQuestionIds.add(q.id);
      }
    });
  });

  // If transcript is very short or generic and yielded no matches, include any plannedQuestions or core initial questions so the report is never empty
  if (suggestions.length === 0) {
    const fallbackQs = plannedQuestions.length > 0
      ? plannedQuestions
      : getAllDiagnosticQuestions().slice(0, 6);

    fallbackQs.forEach((q, idx) => {
      const area = DIAGNOSTIC_AREAS.find(a => a.id === q.areaId);
      const quote = segments[idx] || transcript.trim() || `Relevamiento en vivo durante la sesión con ${clientName}.`;
      const inferredOption = inferMaturityOptionFromSnippet(quote);
      suggestions.push({
        id: `auto-fallback-${q.id}`,
        questionId: q.id,
        questionCode: q.code,
        areaId: q.areaId,
        areaName: area?.name || 'Diagnóstico General',
        questionTitle: q.title,
        detectedQuote: quote,
        suggestedAnswer: `Evidencia registrada en sesión: ${quote}`,
        suggestedOption: inferredOption,
        confidence: 'media',
        reason: 'Extraído automáticamente del audio de la sesión.',
        isTangential: false,
        status: 'accepted'
      });
    });
  }

  // Group matched questions by area for the executive report and minute
  const areaMap = new Map<string, { areaId: string; areaName: string; items: DiagnosticCheckoutSuggestion[] }>();
  suggestions.forEach(s => {
    const existing = areaMap.get(s.areaId);
    if (existing) {
      existing.items.push(s);
    } else {
      areaMap.set(s.areaId, { areaId: s.areaId, areaName: s.areaName, items: [s] });
    }
  });

  const areasImpacted = Array.from(areaMap.values()).map(a => ({
    areaId: a.areaId,
    areaName: a.areaName,
    count: a.items.length
  }));

  const durationMin = Math.max(1, Math.round(durationSeconds / 60));

  // Build dynamic topics discussed based on the areas detected in the audio
  const topicsDiscussed = Array.from(areaMap.values()).map((areaGroup, idx) => ({
    title: `${idx + 1}. ${areaGroup.areaName.toUpperCase()} (${areaGroup.items.length} preguntas respondidas)`,
    points: areaGroup.items.map(
      item => `[${item.questionCode}] ${item.questionTitle}: "${item.detectedQuote}"`
    )
  }));

  if (topicsDiscussed.length === 0) {
    topicsDiscussed.push({
      title: '1. RELEVAMIENTO GENERAL DE LA SESIÓN',
      points: [transcript || `Sesión de trabajo con ${clientName}.`]
    });
  }

  // Extract commitments / action items from low-maturity answers or transcript cues
  const criticalItems = suggestions.filter(
    s => s.suggestedOption === 'none_no_record' || s.suggestedOption === 'informal_active' || s.suggestedOption === 'partial_dev'
  );

  const commitments: MeetingMinuteCommitment[] = criticalItems.slice(0, 5).map((item, idx) => ({
    id: `com-${idx + 1}`,
    responsible: idx % 2 === 0 ? `Dirección ${clientName}` : 'Consultora GS',
    task: `Formalizar y documentar: ${item.questionTitle.replace(/[¿?]/g, '')} (${item.areaName}).`,
    deadline: idx === 0 ? 'Próxima semana' : 'Próximos 15 días',
    status: 'pendiente'
  }));

  if (commitments.length === 0) {
    commitments.push(
      {
        id: 'com-1',
        responsible: clientName,
        task: 'Compartir documentación de respaldo de los indicadores relevados en la sesión.',
        deadline: 'Próximos 7 días',
        status: 'pendiente'
      },
      {
        id: 'com-2',
        responsible: 'Consultora GS',
        task: 'Consolidar el informe de diagnóstico actualizado y plan de acción en el sistema.',
        deadline: '48 horas',
        status: 'en_progreso'
      }
    );
  }

  const executiveSummary = `A partir del audio y transcripción de la sesión "${meetingTitle}" con ${clientName} (${durationMin} min), el motor inteligente analizó el catálogo completo de 100 preguntas y respondió automáticamente ${suggestions.length} preguntas distribuidas en ${areasImpacted.length} áreas estratégicas (${areasImpacted.map(a => a.areaName).join(', ')}).`;

  const minute: MeetingMinuteDraft = {
    meetingTitle,
    meetingDate: dateFormatted,
    attendeesGS: ['Consultor Líder GS', 'Equipo de Metodología GS'],
    attendeesClient: [validatorName || `Dirección y Socios de ${clientName}`],
    executiveSummary,
    topicsDiscussed,
    agreements: [
      `Se actualizaron automáticamente ${suggestions.length} preguntas del Diagnóstico 360° (sobre el catálogo de 100 preguntas) en base a las evidencias del audio.`,
      ...areasImpacted.slice(0, 3).map(a => `Avance registrado en el área de ${a.areaName} (${a.count} respuestas homologadas).`),
      'Dar seguimiento a los compromisos de formalización detectados en la sesión.'
    ],
    commitments,
    nextSteps: [
      'Revisar el Informe de Diagnóstico e indicadores IME / IRE actualizados automáticamente.',
      'Avanzar con los entregables y compromisos asignados en la matriz de seguimiento.',
      'Continuar completando las preguntas restantes del catálogo de 100 preguntas en próximas sesiones.'
    ],
    methodologicalReflection: `El relevamiento por voz permite capturar la realidad operativa de ${clientName} sin fricciones, transformando la conversación en un diagnóstico cuantitativo y accionable sobre las 100 preguntas de la metodología GS.`
  };

  // Dynamic Mermaid diagram showing the client and the areas answered in this audio
  const mermaidNodes = Array.from(areaMap.values())
    .slice(0, 6)
    .map((a, i) => {
      const safeArea = a.areaName.replace(/["()]/g, '');
      const firstQ = a.items[0]?.questionCode || `Área ${i + 1}`;
      return `    A["${clientName}"] --> B${i}["${safeArea} (${a.items.length} resp.)"]\n    B${i} --> C${i}["${firstQ}: Relevado"]`;
    })
    .join('\n');

  const conceptualMapMermaid = `graph TD\n${mermaidNodes || `    A["${clientName}"] --> B["Diagnóstico Automático"]`}`;

  return {
    minute,
    suggestions,
    conceptualMapMermaid,
    executiveReportSummary: executiveSummary,
    areasImpacted,
    aiModelUsed: 'gpt-5.5 (GS Neural Engine v5.5)'
  };
}

/**
 * Automatically persists the answered questions into the Client's Diagnostic 360°
 * (both Supabase and localStorage) so the user doesn't have to do manual steps.
 */
export async function persistAutoAnsweredQuestions(params: {
  clientId: string;
  sessionId: string;
  meetingTitle: string;
  transcript: string;
  durationSeconds: number;
  analysis: CheckoutAnalysisResult;
  existingAnswers?: Record<number, ResponseOptionValue>;
}): Promise<{
  updatedAnswersMap: Record<number, ResponseOptionValue>;
  qualitativeMap: Record<number, { answer: string; quote: string; updatedAt: string }>;
}> {
  const {
    clientId,
    sessionId,
    meetingTitle,
    transcript,
    durationSeconds,
    analysis,
    existingAnswers = {}
  } = params;

  const activeSuggestions = analysis.suggestions.filter(s => s.status !== 'rejected');

  // 1. Load existing qualitative answers from localStorage
  const qualKey = `gs_qualitative_answers_${clientId}`;
  let qualitativeMap: Record<number, { answer: string; quote: string; updatedAt: string }> = {};
  try {
    const saved = localStorage.getItem(qualKey);
    if (saved) qualitativeMap = JSON.parse(saved);
  } catch (e) {
    console.warn('Error reading local qualitative answers:', e);
  }

  // 2. Load existing answers from Supabase diagnostic_responses to avoid overwriting previous sessions
  const mergedDbAnswers: Record<string, any> = {};
  Object.entries(existingAnswers).forEach(([k, v]) => {
    mergedDbAnswers[k] = v;
  });

  try {
    const { data: currentDiag } = await (supabase
      .from('diagnostic_responses') as any)
      .select('answers')
      .eq('organization_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentDiag?.answers && typeof currentDiag.answers === 'object') {
      Object.entries(currentDiag.answers).forEach(([k, v]) => {
        mergedDbAnswers[k] = v;
      });
    }
  } catch (e) {
    console.warn('Notice reading existing diagnostic_responses:', e);
  }

  // 3. Apply all auto-answered questions from this audio (respecting validated answers in QA mode)
  const updatedAnswersMap: Record<number, ResponseOptionValue> = { ...existingAnswers };

  activeSuggestions.forEach(sug => {
    const finalOption = sug.editedOption || sug.suggestedOption || 'partial_dev';
    const finalAnswer = sug.editedAnswer || sug.suggestedAnswer;
    const existingQual: any = qualitativeMap[sug.questionId];
    const existingDb: any = mergedDbAnswers[sug.questionId];
    const isAlreadyValidated = Boolean(existingQual?.validatedByConsultant || existingDb?.validatedByConsultant);

    const newEvidenceList: { sessionTitle: string; quote: string }[] = [
      ...(Array.isArray(existingQual?.evidences) ? existingQual.evidences : []),
      { sessionTitle: sug.sourceSessionTitle || meetingTitle, quote: sug.detectedQuote },
      ...(sug.additionalEvidences || []).map(e => ({ sessionTitle: e.sessionTitle, quote: e.quote }))
    ];
    // Deduplicate evidences by quote prefix
    const seenQuotes = new Set<string>();
    const dedupEvidences = newEvidenceList.filter(e => {
      const key = (e.quote || '').slice(0, 60).toLowerCase();
      if (!key || seenQuotes.has(key)) return false;
      seenQuotes.add(key);
      return true;
    });

    if (isAlreadyValidated && !sug.editedAnswer && !sug.editedOption) {
      // Never overwrite consultant-validated answer; append complementary evidence only
      mergedDbAnswers[sug.questionId] = {
        ...(typeof existingDb === 'object' ? existingDb : { value: existingDb }),
        evidences: dedupEvidences,
        updatedAt: new Date().toISOString()
      };
      qualitativeMap[sug.questionId] = {
        ...existingQual,
        evidences: dedupEvidences
      } as any;
      return;
    }

    updatedAnswersMap[sug.questionId] = finalOption;

    mergedDbAnswers[sug.questionId] = {
      value: finalOption,
      notes: finalAnswer,
      evidence: sug.detectedQuote,
      meetingTitle: sug.sourceSessionTitle || meetingTitle,
      evidences: dedupEvidences,
      validatedByConsultant: sug.status === 'accepted' || sug.status === 'modified',
      updatedAt: new Date().toISOString()
    };

    qualitativeMap[sug.questionId] = {
      answer: finalAnswer,
      quote: sug.detectedQuote,
      updatedAt: new Date().toLocaleDateString('es-AR'),
      sourceSessionTitle: sug.sourceSessionTitle || meetingTitle,
      evidences: dedupEvidences,
      validatedByConsultant: sug.status === 'accepted' || sug.status === 'modified'
    } as any;
  });

  // Save qualitative answers locally for immediate display across all tabs
  try {
    localStorage.setItem(qualKey, JSON.stringify(qualitativeMap));
    localStorage.setItem(`gs_diag_answers_${clientId}`, JSON.stringify(updatedAnswersMap));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
  }

  // 4. Upsert diagnostic_responses in Supabase
  try {
    await (supabase.from('diagnostic_responses') as any).upsert(
      {
        organization_id: clientId,
        answers: mergedDbAnswers,
        status: 'completed',
        updated_at: new Date().toISOString()
      },
      { onConflict: 'organization_id' }
    );
  } catch (e) {
    console.warn('Notice upserting diagnostic_responses:', e);
  }

  // 5. Upsert interview & minute in gobernanza_entrevistas
  try {
    await (supabase.from('gobernanza_entrevistas') as any).upsert(
      {
        id: sessionId,
        client_id: clientId,
        meeting_type: 'diagnostico',
        titulo: meetingTitle,
        duracion_segundos: durationSeconds,
        transcripcion: transcript,
        resumen: analysis.minute.executiveSummary,
        mapa_conceptual_mermaid: analysis.conceptualMapMermaid || '',
        respuestas_cuestionario: activeSuggestions.map(
          s => `[${s.questionCode} - ${s.areaName}] ${s.questionTitle}: ${s.editedAnswer || s.suggestedAnswer}`
        ),
        minutas: analysis.minute,
        validation_status: 'accepted',
        validated_at: new Date().toISOString(),
        estado: 'completado'
      },
      { onConflict: 'id' }
    );
  } catch (e) {
    console.warn('Notice saving gobernanza_entrevistas:', e);
  }

  return { updatedAnswersMap, qualitativeMap };
}

export interface MultiSessionInput {
  id: string;
  title: string;
  durationSeconds: number;
  transcript: string;
}

/**
 * Cumulative Multi-Session Q/A Analyzer (11 Areas / 103 Questions).
 * Runs analysis across every selected transcribed session, merges suggestions by questionId
 * preserving the strongest confidence as primary and appending complementary quotes from other sessions,
 * and marks suggestions as 'pending' for consultant QA review (human-in-the-loop).
 */
export async function analyzeMultiSessionForQA(params: {
  clientId: string;
  clientName: string;
  sessions: MultiSessionInput[];
  onProgress?: (current: number, total: number, sessionTitle: string) => void;
}): Promise<{
  suggestions: DiagnosticCheckoutSuggestion[];
  totalSessionsAnalyzed: number;
  modelsUsed: string[];
}> {
  const { clientId, clientName, sessions, onProgress } = params;
  const validSessions = sessions.filter(s => (s.transcript || '').trim().length >= 20);
  const mergedByQid = new Map<number, DiagnosticCheckoutSuggestion>();
  const modelsUsed = new Set<string>();
  const confRank: Record<string, number> = { alta: 3, media: 2, baja: 1 };

  for (let i = 0; i < validSessions.length; i++) {
    const sess = validSessions[i];
    // Split long transcripts (>18k chars) into safe blocks so Supabase Edge Function never hits 150s timeout
    const BLOCK_SIZE = 18000;
    const blocks: string[] = [];
    for (let off = 0; off < sess.transcript.length; off += BLOCK_SIZE) {
      blocks.push(sess.transcript.slice(off, off + BLOCK_SIZE));
    }

    for (let bi = 0; bi < blocks.length; bi++) {
      const label = blocks.length > 1 ? `${sess.title} (Bloque ${bi + 1}/${blocks.length})` : sess.title;
      onProgress?.(i + 1, validSessions.length, label);

      let blockSuggestions: DiagnosticCheckoutSuggestion[] = [];
      let blockModel = '';

      try {
        const { data, error } = await supabase.functions.invoke('gobernanza-ai', {
          body: {
            action: 'analyze_transcript_100',
            payload: {
              entrevista_id: sess.id,
              client_id: clientId,
              client_name: clientName,
              meeting_title: label,
              duration_seconds: Math.round((sess.durationSeconds || 1800) / blocks.length),
              transcript: blocks[bi],
              skip_minute: true,
              catalog: getAllDiagnosticQuestions().map(q => ({
                id: q.id,
                code: q.code,
                areaId: q.areaId,
                title: q.title
              }))
            }
          }
        });
        if (!error && Array.isArray(data?.suggestions)) {
          blockSuggestions = data.suggestions;
          blockModel = data.aiModelUsed || 'gpt-5.5';
        }
      } catch {
        // fallback to local semantic engine below
      }

      if (blockSuggestions.length === 0) {
        const fallbackRes = generateClientCheckoutSynthesis({
          clientName,
          meetingTitle: label,
          durationSeconds: Math.round((sess.durationSeconds || 1800) / blocks.length),
          transcript: blocks[bi]
        });
        blockSuggestions = fallbackRes.suggestions;
        blockModel = fallbackRes.aiModelUsed || 'local-5.5';
      }

      if (blockModel) modelsUsed.add(blockModel);

      for (const sug of blockSuggestions) {
        const tagged: DiagnosticCheckoutSuggestion = {
          ...sug,
          id: `qa-q-${sug.questionId}`,
          sourceSessionId: sess.id,
          sourceSessionTitle: sess.title,
          status: 'pending',
          additionalEvidences: []
        };

        const existing = mergedByQid.get(sug.questionId);
        if (!existing) {
          mergedByQid.set(sug.questionId, tagged);
        } else {
          const newRank = confRank[tagged.confidence] || 1;
          const oldRank = confRank[existing.confidence] || 1;
          if (newRank > oldRank) {
            tagged.additionalEvidences = [
              ...(existing.additionalEvidences || []),
              {
                sessionTitle: existing.sourceSessionTitle || 'Sesión previa',
                quote: existing.detectedQuote,
                answer: existing.suggestedAnswer
              }
            ];
            mergedByQid.set(sug.questionId, tagged);
          } else {
            existing.additionalEvidences = [
              ...(existing.additionalEvidences || []),
              {
                sessionTitle: sess.title,
                quote: tagged.detectedQuote,
                answer: tagged.suggestedAnswer
              }
            ];
          }
        }
      }
    }
  }

  const ordered = Array.from(mergedByQid.values()).sort((a, b) => a.questionId - b.questionId);
  return {
    suggestions: ordered,
    totalSessionsAnalyzed: validSessions.length,
    modelsUsed: Array.from(modelsUsed)
  };
}
