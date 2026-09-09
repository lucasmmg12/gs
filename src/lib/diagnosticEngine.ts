import { 
  DIAGNOSTIC_AREAS, 
  getAllDiagnosticQuestions
} from '../data/diagnosticQuestions';
import type { 
  ResponseOptionValue
} from '../data/diagnosticQuestions';

export interface AreaScore {
  areaId: string;
  areaNumber: number;
  areaName: string;
  pentagonAxis: string;
  answeredCount: number;
  totalQuestions: number;
  imeScore: number; // 0 - 100%
  imeScale10: number; // 0.0 - 10.0
  ireScore: number; // 0 - 100%
}

export interface PentagonScores {
  directorio: number; // 1 - 10
  talento: number;     // 1 - 10
  finanzas: number;    // 1 - 10
  procesos: number;    // 1 - 10
  comercial: number;   // 1 - 10
  promedioGeneral: number; // 1 - 10
}

export interface FODAItem {
  id: string;
  text: string;
  areaName: string;
  questionCode: string;
}

export interface FODAStructure {
  fortalezas: FODAItem[];
  oportunidades: FODAItem[];
  debilidades: FODAItem[];
  amenazas: FODAItem[];
}

export interface TOWSStrategy {
  type: 'FO' | 'DO' | 'FA' | 'DA';
  title: string;
  description: string;
  sourceFODA: string[];
}

export interface PESTELItem {
  category: 'politico' | 'economico' | 'social' | 'tecnologico' | 'ecologico' | 'legal';
  title: string;
  impactText: string;
  trend: 'favorable' | 'adverso' | 'neutro';
}

export interface PorterForce {
  name: string;
  intensity: 'Alta' | 'Media' | 'Baja';
  description: string;
  factors: string[];
}

export interface DetectedRisk {
  id: string;
  code: string;
  category: string;
  description: string;
  probability: 'Alta' | 'Media' | 'Baja';
  impact: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
  severityScore: number; // 1 - 25
  severityLevel: 'Extremo' | 'Alto' | 'Medio' | 'Bajo';
  suggestedAction: string;
}

export interface FullDiagnosticResults {
  globalIme: number; // 0 - 100%
  globalIme10: number; // 0.0 - 10.0
  globalIre: number; // 0 - 100%
  totalAnswered: number;
  totalQuestions: number;
  progressPercentage: number;
  isComplete: boolean;
  maturityStatus: {
    label: string;
    color: string;
    description: string;
  };
  areaScores: AreaScore[];
  pentagon: PentagonScores;
  foda: FODAStructure;
  tows: TOWSStrategy[];
  pestel: Record<string, PESTELItem[]>;
  porter: PorterForce[];
  risks: DetectedRisk[];
}

// 1. Motor de Cálculo de Puntuaciones
export function calculateDiagnosticScores(
  answers: Record<number, ResponseOptionValue>
): FullDiagnosticResults {
  const allQuestions = getAllDiagnosticQuestions();
  let totalAnswered = 0;
  let sumImePoints = 0;
  let sumIrePoints = 0;
  let evaluatedQuestionsCount = 0;

  const foda: FODAStructure = {
    fortalezas: [],
    oportunidades: [],
    debilidades: [],
    amenazas: []
  };

  const pestelMap: Record<string, PESTELItem[]> = {
    politico: [],
    economico: [],
    social: [],
    tecnologico: [],
    ecologico: [],
    legal: []
  };

  const detectedRisks: DetectedRisk[] = [];
  let riskCounter = 1;

  const areaScores: AreaScore[] = DIAGNOSTIC_AREAS.map(area => {
    let areaAnswered = 0;
    let areaImeSum = 0;
    let areaIreSum = 0;
    let activeQuestionsInArea = 0;

    area.questions.forEach(q => {
      // Verificar si está habilitada por cascada
      let isVisible = true;
      if (q.cascadeCondition) {
        const parentVal = answers[q.cascadeCondition.parentQuestionId];
        isVisible = Boolean(parentVal && q.cascadeCondition.triggerOptionValues.includes(parentVal));
      }

      if (!isVisible) return;

      activeQuestionsInArea++;
      const chosenVal = answers[q.id];

      if (chosenVal) {
        areaAnswered++;
        totalAnswered++;

        const opt = q.options.find(o => o.value === chosenVal);
        if (opt) {
          areaImeSum += opt.maturityScore;
          areaIreSum += opt.riskScore;
          sumImePoints += opt.maturityScore;
          sumIrePoints += opt.riskScore;
          evaluatedQuestionsCount++;

          // Extract strategic impacts
          if (opt.strategicImpact) {
            const si = opt.strategicImpact;
            if (si.fodaType && si.fodaText) {
              const item: FODAItem = {
                id: `${q.code}_foda`,
                text: si.fodaText,
                areaName: area.name,
                questionCode: q.code
              };
              if (si.fodaType === 'fortaleza') foda.fortalezas.push(item);
              if (si.fodaType === 'oportunidad') foda.oportunidades.push(item);
              if (si.fodaType === 'debilidad') foda.debilidades.push(item);
              if (si.fodaType === 'amenaza') foda.amenazas.push(item);
            }

            if (si.pestelCategory && si.pestelText) {
              pestelMap[si.pestelCategory]?.push({
                category: si.pestelCategory,
                title: `${area.name} - ${q.code}`,
                impactText: si.pestelText,
                trend: opt.maturityScore >= 50 ? 'favorable' : 'adverso'
              });
            }

            if (si.riskDescription) {
              const probNum = si.riskProbability === 'Alta' ? 5 : si.riskProbability === 'Media' ? 3 : 1;
              const impNum = si.riskImpact === 'Crítico' ? 5 : si.riskImpact === 'Alto' ? 4 : si.riskImpact === 'Medio' ? 3 : 2;
              const severity = probNum * impNum;

              let sevLabel: 'Extremo' | 'Alto' | 'Medio' | 'Bajo' = 'Bajo';
              if (severity >= 16) sevLabel = 'Extremo';
              else if (severity >= 10) sevLabel = 'Alto';
              else if (severity >= 6) sevLabel = 'Medio';

              detectedRisks.push({
                id: `risk_${q.id}`,
                code: `R-${String(riskCounter++).padStart(2, '0')}`,
                category: si.riskCategory || 'Operativo',
                description: si.riskDescription,
                probability: si.riskProbability || 'Media',
                impact: si.riskImpact || 'Medio',
                severityScore: severity,
                severityLevel: sevLabel,
                suggestedAction: `Plan de contingencia y mitigación en ${area.name} (Ref: ${q.code})`
              });
            }
          }
        }
      }
    });

    const areaIme = activeQuestionsInArea > 0 && areaAnswered > 0 
      ? Math.round(areaImeSum / areaAnswered) 
      : 0;
    const areaIre = activeQuestionsInArea > 0 && areaAnswered > 0 
      ? Math.round(areaIreSum / areaAnswered) 
      : 0;

    return {
      areaId: area.id,
      areaNumber: area.number,
      areaName: area.name,
      pentagonAxis: area.pentagonAxis || 'Procesos',
      answeredCount: areaAnswered,
      totalQuestions: activeQuestionsInArea,
      imeScore: areaIme,
      imeScale10: Number((areaIme / 10).toFixed(1)),
      ireScore: areaIre
    };
  });

  // Calculate Global
  const totalQuestions = allQuestions.length;
  const progressPercentage = Math.min(100, Math.round((totalAnswered / totalQuestions) * 100));
  const isComplete = progressPercentage >= 95;

  const globalIme = evaluatedQuestionsCount > 0 
    ? Math.round(sumImePoints / evaluatedQuestionsCount) 
    : 0;
  const globalIme10 = Number((globalIme / 10).toFixed(1));
  const globalIre = evaluatedQuestionsCount > 0 
    ? Math.round(sumIrePoints / evaluatedQuestionsCount) 
    : 0;

  // Maturity classification
  let maturityStatus = {
    label: 'Nivel Crítico / Inicial',
    color: 'text-red-600 bg-red-50 border-red-200',
    description: 'La PyME opera con alta informalidad y fuerte dependencia del dueño. Urge ordenamiento básico.'
  };

  if (globalIme >= 75) {
    maturityStatus = {
      label: 'Nivel Óptimo / Gobernanza Consolidada',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description: 'Empresa profesionalizada, procesos documentados y mandos medios autónomos. Preparada para escalar.'
    };
  } else if (globalIme >= 50) {
    maturityStatus = {
      label: 'Nivel Intermedio / En Formalización',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      description: 'Avance significativo en procedimientos pero persisten brechas en delegación y control de gestión.'
    };
  } else if (globalIme >= 30) {
    maturityStatus = {
      label: 'Nivel Básico / Vulnerable',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      description: 'Estructura frágil con riesgos operativos y financieros latentes. Se requiere intervención del Master Plan.'
    };
  }

  // 2. Cálculo del Pentágono del Orden (5 Ejes: Directorio, Talento, Finanzas, Procesos, Comercial)
  const getAxisAvg = (axisName: string): number => {
    const matching = areaScores.filter(a => a.pentagonAxis === axisName);
    if (matching.length === 0) return 0;
    const avg = matching.reduce((acc, curr) => acc + curr.imeScale10, 0) / matching.length;
    return Number(avg.toFixed(1));
  };

  const pentagon: PentagonScores = {
    directorio: getAxisAvg('Directorio'),
    talento: getAxisAvg('Talento'),
    finanzas: getAxisAvg('Finanzas'),
    procesos: getAxisAvg('Procesos'),
    comercial: getAxisAvg('Comercial'),
    promedioGeneral: globalIme10
  };

  // 3. Generación de Matriz TOWS (Cruces Estratégicos)
  const tows: TOWSStrategy[] = [
    {
      type: 'FO',
      title: 'Estrategias Ofensivas (Fortalezas + Oportunidades)',
      description: 'Aprovechar las capacidades formalizadas de la empresa para capturar las oportunidades de mercado detectadas en la tutoría.',
      sourceFODA: foda.fortalezas.slice(0, 3).map(f => f.text)
    },
    {
      type: 'DO',
      title: 'Estrategias de Reorientación (Debilidades + Oportunidades)',
      description: 'Superar cuellos de botella y falta de procedimientos aprovechando la incorporación de nuevas herramientas e IA.',
      sourceFODA: foda.debilidades.slice(0, 3).map(d => d.text)
    },
    {
      type: 'FA',
      title: 'Estrategias Defensivas (Fortalezas + Amenazas)',
      description: 'Utilizar el blindaje financiero y la gobernanza para resistir turbulencias económicas o pérdida de clientes.',
      sourceFODA: foda.fortalezas.slice(0, 2).map(f => f.text)
    },
    {
      type: 'DA',
      title: 'Estrategias de Supervivencia (Debilidades + Amenazas)',
      description: 'Priorizar de inmediato las acciones del Master Plan para erradicar las vulnerabilidades críticas antes de una crisis.',
      sourceFODA: foda.amenazas.slice(0, 3).map(a => a.text)
    }
  ];

  // 4. Las 5 Fuerzas de Porter
  const porter: PorterForce[] = [
    {
      name: 'Rivalidad entre Competidores Existentes',
      intensity: globalIme < 50 ? 'Alta' : 'Media',
      description: 'Nivel de disputa en el segmento PyME donde compite la empresa.',
      factors: [
        foda.fortalezas.some(f => f.text.includes('premium') || f.text.includes('diferenciada')) 
          ? 'Posicionamiento con propuesta de valor diferenciada que reduce la guerra de precios.'
          : 'Presión por precios y productos similares en el mercado local.'
      ]
    },
    {
      name: 'Poder de Negociación de los Clientes',
      intensity: detectedRisks.some(r => r.category === 'Comercial') ? 'Alta' : 'Media',
      description: 'Grado de exigencia y concentración de la cartera de compradores.',
      factors: [
        'Dependencia de clientes clave exige profesionalizar el servicio post-venta y contratos formales.'
      ]
    },
    {
      name: 'Poder de Negociación de los Proveedores',
      intensity: areaScores.find(a => a.areaId === 'area_3_operaciones')?.imeScore! < 60 ? 'Alta' : 'Media',
      description: 'Dependencia de insumos críticos y plazos de entrega de proveedores.',
      factors: [
        'La unificación de Compras y Almacén fortalece la capacidad de negociación por volumen.'
      ]
    },
    {
      name: 'Amenaza de Nuevos Competidores Entrantes',
      intensity: globalIme >= 70 ? 'Baja' : 'Media',
      description: 'Barreras de entrada normativas, de capital o tecnológicas.',
      factors: [
        'Las certificaciones de calidad (ISO) y el orden de procesos actúan como barrera defensiva.'
      ]
    },
    {
      name: 'Amenaza de Productos o Servicios Sustitutos',
      intensity: 'Media',
      description: 'Soluciones alternativas o digitalizaciones que reemplazan el servicio tradicional.',
      factors: [
        'Adopción de IA y automatizaciones asegura la vigencia y competitividad de la oferta.'
      ]
    }
  ];

  return {
    globalIme,
    globalIme10,
    globalIre,
    totalAnswered,
    totalQuestions,
    progressPercentage,
    isComplete,
    maturityStatus,
    areaScores,
    pentagon,
    foda,
    tows,
    pestel: pestelMap,
    porter,
    risks: detectedRisks
  };
}
