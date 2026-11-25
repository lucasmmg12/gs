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
  directorio: number; // 0 - 10
  talento: number;     // 0 - 10
  finanzas: number;    // 0 - 10
  procesos: number;    // 0 - 10
  comercial: number;   // 0 - 10
  promedioGeneral: number; // 0 - 10
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

// 12 Dimensiones Oficiales del IRE con sus preguntas asignadas y pesos
interface IRERiskDimensionConfig {
  code: string;
  name: string;
  weight: number;
  questionIds: number[];
  category: string;
  mitigation: string;
}

const IRE_CONFIG: IRERiskDimensionConfig[] = [
  { code: 'R1', name: 'Dependencia del dueño', weight: 0.14, questionIds: [4, 7, 33, 35, 38], category: 'Gobernanza / Operativo', mitigation: 'Delegación de roles operativos y protocolo de directorio' },
  { code: 'R2', name: 'Estructura societaria / patrimonial', weight: 0.10, questionIds: [8, 10, 21, 89], category: 'Estratégico / Legal', mitigation: 'Constitución societaria, Estatuto de Convivencia y separación patrimonial' },
  { code: 'R3', name: 'Financiero y de liquidez', weight: 0.14, questionIds: [14, 15, 19, 20, 23], category: 'Financiero', mitigation: 'Flujo de caja proyectado a 6 meses y fondo de reserva segregado' },
  { code: 'R4', name: 'Concentración de clientes / mercado', weight: 0.11, questionIds: [54, 55], category: 'Comercial', mitigation: 'Plan de ventas y diversificación en nuevos segmentos de bajo riesgo' },
  { code: 'R5', name: 'Operativo y conocimiento clave', weight: 0.09, questionIds: [25, 32, 33], category: 'Operaciones', mitigation: 'Mapeo de procesos y documentación de instructivos críticos' },
  { code: 'R6', name: 'Comercial / pipeline', weight: 0.07, questionIds: [47, 48, 53], category: 'Comercial', mitigation: 'Sistematización del embudo de ventas y medición de conversión' },
  { code: 'R7', name: 'Cadena de valor / abastecimiento', weight: 0.06, questionIds: [74, 75, 76, 79], category: 'Proveedores', mitigation: 'Proveedores alternativos homologados y proceso de compras formal' },
  { code: 'R8', name: 'Regulatorio y de cumplimiento', weight: 0.06, questionIds: [36, 88, 90, 91], category: 'Legal / Externo', mitigation: 'Monitoreo normativo trimestral y regularización laboral/habilitaciones' },
  { code: 'R9', name: 'Procesos y calidad', weight: 0.06, questionIds: [28, 31, 59, 63, 64], category: 'Procesos', mitigation: 'Implementación de checklists y sistema de gestión de calidad' },
  { code: 'R10', name: 'Tecnológico y continuidad', weight: 0.04, questionIds: [69, 70, 71, 73], category: 'Tecnología', mitigation: 'Centralización documental en nube, integración de software y backup verificado' },
  { code: 'R11', name: 'Reputacional / marca', weight: 0.02, questionIds: [51, 56, 57], category: 'Comercial', mitigation: 'Canal único de postventa y medición sistemática de satisfacción (NPS)' },
  { code: 'R12', name: 'Contexto macro (PESTEL)', weight: 0.03, questionIds: [92, 93, 94, 99], category: 'Externo', mitigation: 'Pricing con cobertura inflacionaria y vigilancia sectorial/competitiva' },
  { code: 'R13', name: 'Seguridad, siniestralidad y coberturas', weight: 0.08, questionIds: [80, 81, 82, 83, 84, 85, 86, 87], category: 'Seguridad / Riesgos', mitigation: 'Adecuación integral de pólizas (RC, Todo Riesgo, ART, Vida) y protocolos HyS en obra' }
];

export function calculateDiagnosticScores(
  answers: Record<number, ResponseOptionValue>
): FullDiagnosticResults {
  const allQuestions = getAllDiagnosticQuestions();
  let totalAnswered = 0;

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

  // 1. Calcular puntuaciones por Área
  const areaScores: AreaScore[] = DIAGNOSTIC_AREAS.map(area => {
    let areaAnswered = 0;
    let areaMaturitySum = 0;
    let areaRiskSum = 0;

    area.questions.forEach(q => {
      const chosenVal = answers[q.id];
      if (chosenVal) {
        areaAnswered++;
        totalAnswered++;

        const opt = q.options.find(o => o.value === chosenVal);
        if (opt) {
          areaMaturitySum += opt.maturityScore;
          areaRiskSum += opt.riskScore;

          // FODA Automático
          if (opt.maturityScore >= 70) {
            foda.fortalezas.push({
              id: `fort_${q.id}`,
              text: `${area.name}: ${q.title} — ${opt.label}`,
              areaName: area.name,
              questionCode: q.code
            });
          } else if (opt.maturityScore < 40) {
            foda.debilidades.push({
              id: `deb_${q.id}`,
              text: `${area.name}: Brecha en ${q.title} (${opt.shortLabel})`,
              areaName: area.name,
              questionCode: q.code
            });
          }

          // Riesgo Automático
          if (opt.riskScore >= 60) {
            const probNum = opt.riskScore >= 80 ? 4 : 3;
            const impNum = opt.riskScore >= 80 ? 4 : 3;
            const sev = probNum * impNum;
            detectedRisks.push({
              id: `risk_${q.id}`,
              code: `R-${String(riskCounter++).padStart(2, '0')}`,
              category: area.name,
              description: `Riesgo detectado en ${q.title}: ${opt.label}`,
              probability: probNum >= 4 ? 'Alta' : 'Media',
              impact: impNum >= 4 ? 'Alto' : 'Medio',
              severityScore: sev,
              severityLevel: sev >= 16 ? 'Extremo' : sev >= 10 ? 'Alto' : 'Medio',
              suggestedAction: `Plan de contingencia y mitigación en ${area.name} (Ref: ${q.code})`
            });
          }

          // PESTEL (Área 11 — Contexto Externo)
          if (area.number === 11) {
            const cat = q.id <= 91 ? 'politico' : q.id <= 94 ? 'economico' : q.id <= 95 ? 'social' : 'tecnologico';
            pestelMap[cat]?.push({
              category: cat as any,
              title: q.title,
              impactText: opt.label,
              trend: opt.maturityScore >= 50 ? 'favorable' : 'adverso'
            });
          }
        }
      }
    });

    const areaIme = areaAnswered > 0 ? Math.round(areaMaturitySum / areaAnswered) : 40; // baseline neutral si no hay
    const areaIre = areaAnswered > 0 ? Math.round(areaRiskSum / areaAnswered) : 60;

    return {
      areaId: area.id,
      areaNumber: area.number,
      areaName: area.name,
      pentagonAxis: area.pentagonAxis,
      answeredCount: areaAnswered,
      totalQuestions: area.questions.length,
      imeScore: areaIme,
      imeScale10: Number((areaIme / 10).toFixed(1)),
      ireScore: areaIre
    };
  });

  // 2. Cálculo Oficial del IME (Ponderado de 10 áreas internas Rev10, suma de pesos = 1.00)
  // Pesos: Dir 14%, Fin 14%, Op 14%, RRHH 9%, Com 13%, Clientes 9%, Proc 9%, Tec 5%, Prov 5%, Seg/Riesgos 8%
  const internalAreas = areaScores.filter(a => a.areaNumber <= 10);
  let weightedImeSum = 0;
  let weightsSum = 0;

  internalAreas.forEach(a => {
    const areaDef = DIAGNOSTIC_AREAS.find(d => d.id === a.areaId);
    const w = areaDef?.imeWeight || 0.10;
    weightedImeSum += a.imeScore * w;
    weightsSum += w;
  });

  const globalIme = weightsSum > 0 ? Math.round(weightedImeSum / weightsSum) : 46;
  const globalIme10 = Number((globalIme / 10).toFixed(1));

  // 3. Cálculo Oficial del IRE (12 Dimensiones Ponderadas)
  let weightedExposureSum = 0;
  IRE_CONFIG.forEach(dim => {
    let dimRiskSum = 0;
    let count = 0;

    dim.questionIds.forEach(qid => {
      const val = answers[qid];
      if (val) {
        const q = allQuestions.find(x => x.id === qid);
        const opt = q?.options.find(o => o.value === val);
        if (opt) {
          dimRiskSum += opt.riskScore;
          count++;
        }
      }
    });

    const dimRiskAvg = count > 0 ? dimRiskSum / count : 50; // valor por defecto 50%
    // Normalizar a escala de exposición 1 a 25
    const exposure = Math.min(25, Math.max(1, Math.round((dimRiskAvg / 100) * 24 + 1)));
    weightedExposureSum += exposure * dim.weight;
  });

  const globalIre = Math.min(100, Math.max(0, Math.round((weightedExposureSum / 25) * 100)));

  // 4. Mapeo a los 5 Ejes del Pentágono (Escala 0 a 10)
  const a1 = areaScores.find(a => a.areaNumber === 1)?.imeScore || 50; // Gobernanza
  const a2 = areaScores.find(a => a.areaNumber === 2)?.imeScore || 40; // Finanzas
  const a3 = areaScores.find(a => a.areaNumber === 3)?.imeScore || 30; // Operaciones
  const a4 = areaScores.find(a => a.areaNumber === 4)?.imeScore || 60; // RRHH
  const a5 = areaScores.find(a => a.areaNumber === 5)?.imeScore || 55; // Comercial
  const a6 = areaScores.find(a => a.areaNumber === 6)?.imeScore || 55; // Clientes
  const a7 = areaScores.find(a => a.areaNumber === 7)?.imeScore || 40; // Procesos
  const a8 = areaScores.find(a => a.areaNumber === 8)?.imeScore || 40; // Tecnología
  const a9 = areaScores.find(a => a.areaNumber === 9)?.imeScore || 50; // Proveedores
  const a10 = areaScores.find(a => a.areaNumber === 10)?.imeScore || 40; // Seguridad, Seguros y Riesgos

  // Eje 1 Gobernanza: 100% de Área 1
  const pentDirectorio = Number((a1 / 10).toFixed(1));
  // Eje 2 Procesos: Op (14%) + Proc (9%) + Tec (5%) + Prov (5%) + Seg/Riesgos (8%) = 41%
  const pentProcesos = Number(((a3 * 0.14 + a7 * 0.09 + a8 * 0.05 + a9 * 0.05 + a10 * 0.08) / 0.41 / 10).toFixed(1));
  // Eje 3 Finanzas: 100% de Área 2
  const pentFinanzas = Number((a2 / 10).toFixed(1));
  // Eje 4 Talento: 100% de Área 4
  const pentTalento = Number((a4 / 10).toFixed(1));
  // Eje 5 Comercial: Comercial (13%) + Clientes (9%) = 22%
  const pentComercial = Number(((a5 * 0.13 + a6 * 0.09) / 0.22 / 10).toFixed(1));

  const pentagon: PentagonScores = {
    directorio: pentDirectorio,
    procesos: pentProcesos,
    finanzas: pentFinanzas,
    talento: pentTalento,
    comercial: pentComercial,
    promedioGeneral: globalIme10
  };

  // 5. Bandas de Madurez
  let maturityStatus = {
    label: '5–6 EN DESARROLLO',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'Procesos activos, primeros sistemas de gestión y medición incipiente.'
  };

  if (globalIme10 < 3.0) {
    maturityStatus = {
      label: '2–3 CRÍTICO',
      color: 'text-red-700 bg-red-50 border-red-200',
      description: 'Acciones aisladas, sin proceso ni responsable. Alta dependencia del dueño.'
    };
  } else if (globalIme10 < 5.0) {
    maturityStatus = {
      label: '4–5 EN FORMACIÓN',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      description: 'Primeras prácticas definidas, aún no estandarizadas. Crecimiento desordenado.'
    };
  } else if (globalIme10 >= 7.0 && globalIme10 < 8.0) {
    maturityStatus = {
      label: '7–8 GESTIONADO',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description: 'Operación autónoma. Indicadores regulares y mejoras sustentadas en datos.'
    };
  } else if (globalIme10 >= 8.0) {
    maturityStatus = {
      label: '8–9 AVANZADO',
      color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
      description: 'Alto desempeño, cultura instalada. Empresa profesionalizada y lista para escalar.'
    };
  }

  // 6. Estrategias TOWS derivadas de FODA
  const tows: TOWSStrategy[] = [
    {
      type: 'FO',
      title: 'Estrategia de Crecimiento Acelerado (Maxi-Maxi)',
      description: 'Apalancar la reputación de la empresa y la cercanía del equipo directivo para capturar clientes de mayor envergadura.',
      sourceFODA: ['Fortaleza en calidad y compromiso', 'Oportunidad de profesionalización del sector']
    },
    {
      type: 'FA',
      title: 'Estrategia de Blindaje (Maxi-Mini)',
      description: 'Utilizar el know-how técnico interno para protegerse ante competidores de bajo costo y variaciones macroeconómicas.',
      sourceFODA: ['Equipo técnico sólido', 'Amenaza de inflación y contexto volátil']
    },
    {
      type: 'DO',
      title: 'Estrategia de Reordenamiento (Mini-Maxi)',
      description: 'Estandarizar procesos bajo ISO 9001 e implementar CRM para no perder oportunidades por falta de foco comercial.',
      sourceFODA: ['Debilidad en procesos no documentados', 'Oportunidad de apertura de nuevos mercados']
    },
    {
      type: 'DA',
      title: 'Estrategia de Supervivencia y Contención (Mini-Mini)',
      description: 'Institucionalizar el flujo de caja único y el protocolo de socios para eliminar riesgos de asfixia financiera o disputas.',
      sourceFODA: ['Debilidad en descalce de caja', 'Amenaza de dependencia de pocos clientes']
    }
  ];

  // 7. 5 Fuerzas de Porter
  const porter: PorterForce[] = [
    {
      name: 'Rivalidad entre Competidores',
      intensity: 'Alta',
      description: 'Gran cantidad de empresas informales compitiendo por precio, sumado al ingreso de jugadores de escala regional.',
      factors: ['Precios agresivos en el mercado informal', 'Poco diferencial percibido en servicios estándar']
    },
    {
      name: 'Poder de Negociación de los Clientes',
      intensity: 'Alta',
      description: 'Los clientes principales concentran alto volumen de facturación y condicionan plazos y financiación.',
      factors: ['Concentración de facturación en top 3 clientes', 'Plazos de cobro extendidos']
    },
    {
      name: 'Poder de Negociación de los Proveedores',
      intensity: 'Media',
      description: 'Insumos críticos importados con pocos distribuidores mayoristas homologados.',
      factors: ['Dependencia de proveedores clave', 'Calce de plazos de pago vs cobro']
    },
    {
      name: 'Amenaza de Nuevos Entrantes',
      intensity: 'Media',
      description: 'Barreras de entrada moderadas por exigencias técnicas, pero bajas en tareas de mano de obra genérica.',
      factors: ['Facilidad para armar estructuras pequeñas informales']
    },
    {
      name: 'Amenaza de Productos/Servicios Sustitutos',
      intensity: 'Baja',
      description: 'Servicios de alta complejidad y llave en mano difíciles de sustituir por soluciones enlatadas.',
      factors: ['Necesidad de diseño a medida y asistencia técnica en sitio']
    }
  ];

  const totalQuestions = allQuestions.length;
  const progressPercentage = Math.min(100, Math.round((totalAnswered / totalQuestions) * 100));
  const isComplete = progressPercentage >= 90;

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
