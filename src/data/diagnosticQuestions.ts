export type ResponseOptionValue = 
  | 'formal_active'       // Sí, formalizado y en uso activo / Nivel 5
  | 'informal_active'     // Lo tiene pero es informal / superficial / Nivel 3-4
  | 'partial_dev'         // Parcialmente / En desarrollo / Nivel 2-3
  | 'none_no_record'      // No tiene registro / Inexistente / Nivel 1
  | 'unknown_na';         // No sabe / No aplica

export interface QuestionOption {
  value: ResponseOptionValue;
  label: string;
  shortLabel: string;
  maturityScore: number; // 0 to 100
  riskScore: number;     // 0 to 100 (inverso)
  strategicImpact?: {
    fodaType?: 'fortaleza' | 'oportunidad' | 'debilidad' | 'amenaza';
    fodaText?: string;
    pestelCategory?: 'politico' | 'economico' | 'social' | 'tecnologico' | 'ecologico' | 'legal';
    pestelText?: string;
    porterForce?: 'rivalidad' | 'clientes' | 'proveedores' | 'nuevos_entrantes' | 'sustitutos';
    porterText?: string;
    riskCategory?: 'Estratégico' | 'Operativo' | 'Financiero' | 'Comercial' | 'Legal/Gobernanza';
    riskProbability?: 'Alta' | 'Media' | 'Baja';
    riskImpact?: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
    riskDescription?: string;
  };
}

export interface CascadeCondition {
  parentQuestionId: number;
  triggerOptionValues: ResponseOptionValue[];
}

export type DiagnosticQuestionType = 'open_diagnostic' | 'maturity_level' | 'indicator';

export interface DiagnosticQuestion {
  id: number;
  areaId: string;
  code: string;
  title: string;
  questionType?: DiagnosticQuestionType;
  guide?: string;
  kpi?: string;
  isParent?: boolean;
  cascadeCondition?: CascadeCondition;
  options: QuestionOption[];
}

export interface DiagnosticArea {
  id: string;
  number: number;
  name: string;
  icon: string;
  pentagonAxis: 'Directorio' | 'Talento' | 'Finanzas' | 'Procesos' | 'Comercial';
  description: string;
  imeWeight: number; // 0.00 to 0.20
  kpis: { name: string; unit: string; baseline?: string; target?: string }[];
  questions: DiagnosticQuestion[];
}

export const STANDARD_CLOSED_OPTIONS: QuestionOption[] = [
  {
    value: 'formal_active',
    label: 'Sí, formalizado con procedimiento escrito y en uso real',
    shortLabel: 'Formalizado',
    maturityScore: 100,
    riskScore: 10
  },
  {
    value: 'informal_active',
    label: 'Lo tiene, pero de forma informal o superficial',
    shortLabel: 'Informal',
    maturityScore: 50,
    riskScore: 50
  },
  {
    value: 'partial_dev',
    label: 'Parcialmente implementado / En desarrollo',
    shortLabel: 'En desarrollo',
    maturityScore: 35,
    riskScore: 65
  },
  {
    value: 'none_no_record',
    label: 'No lo tiene / No tiene registro ni procedimiento',
    shortLabel: 'Inexistente',
    maturityScore: 0,
    riskScore: 90
  },
  {
    value: 'unknown_na',
    label: 'No sabe / Requiere relevamiento adicional',
    shortLabel: 'No sabe',
    maturityScore: 15,
    riskScore: 75
  }
];

export const SCALE_1_TO_5_OPTIONS: QuestionOption[] = [
  {
    value: 'formal_active',
    label: 'Nivel 5 — Excelente / Totalmente optimizado / Siempre',
    shortLabel: 'Nivel 5',
    maturityScore: 100,
    riskScore: 10
  },
  {
    value: 'informal_active',
    label: 'Nivel 4 — Bueno / Bastante claro / Gestionado',
    shortLabel: 'Nivel 4',
    maturityScore: 75,
    riskScore: 30
  },
  {
    value: 'partial_dev',
    label: 'Nivel 3 — Moderado / Aceptable / En desarrollo',
    shortLabel: 'Nivel 3',
    maturityScore: 50,
    riskScore: 50
  },
  {
    value: 'unknown_na',
    label: 'Nivel 2 — Poco claro / Ajustado / Incipiente',
    shortLabel: 'Nivel 2',
    maturityScore: 25,
    riskScore: 75
  },
  {
    value: 'none_no_record',
    label: 'Nivel 1 — Nada claro / Muy crítico / Informal',
    shortLabel: 'Nivel 1',
    maturityScore: 0,
    riskScore: 95
  }
];

export const DIAGNOSTIC_AREAS: DiagnosticArea[] = [
  {
    id: 'area_1_direccion',
    number: 1,
    name: "Dirección y Estrategia",
    icon: 'Compass',
    pentagonAxis: 'Directorio',
    description: "Visión, objetivos estratégicos, toma de decisiones, organigrama y acuerdos societarios.",
    imeWeight: 0.14,
    kpis: [
      { name: "Horas/semana en estrategia (EN vs DENTRO)", unit: "hs/sem", target: ">= 8 hs/sem" },
      { name: "Reuniones de Directorio realizadas/año", unit: "reuniones", target: "12/año" },
      { name: "Grado de formalización societaria", unit: "1-5", target: "5" }
    ],
    questions: [
      {
        id: 1,
        areaId: 'area_1_direccion',
        code: 'Q1',
        title: "¿Tiene la empresa una Visión y una Misión formalmente definidas y comunicadas al equipo?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 2,
        areaId: 'area_1_direccion',
        code: 'Q2',
        title: "¿Cuáles son los 3 objetivos estratégicos más importantes para los próximos 12 meses?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 3,
        areaId: 'area_1_direccion',
        code: 'Q3',
        title: "¿Qué tan clara y compartida está la visión de largo plazo dentro de la dirección (socios / dirección)?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 4,
        areaId: 'area_1_direccion',
        code: 'Q4',
        title: "¿Cuántas horas por semana dedica el/la titular a pensar y trabajar EN la empresa (estrategia) vs. trabajar DENTRO de ella (dirección técnica, comercial, operación)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 5,
        areaId: 'area_1_direccion',
        code: 'Q5',
        title: "¿Existen reuniones estratégicas periódicas (no operativas)? ¿Con qué frecuencia? ¿Quiénes participan? ¿Hay agenda fija?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 6,
        areaId: 'area_1_direccion',
        code: 'Q6',
        title: "¿En qué medida la urgencia operativa del día a día impide trabajar en la estrategia?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 7,
        areaId: 'area_1_direccion',
        code: 'Q7',
        title: "¿Cómo se toman las decisiones importantes? ¿Quién decide sobre cada área: operaciones, finanzas, técnica, provisiones?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 8,
        areaId: 'area_1_direccion',
        code: 'Q8',
        title: "¿Existe un organigrama formal con roles y responsabilidades claras? ¿Se comparte con el equipo?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 9,
        areaId: 'area_1_direccion',
        code: 'Q9',
        title: "¿Cuáles son los valores no negociables de la empresa? ¿Están documentados?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 10,
        areaId: 'area_1_direccion',
        code: 'Q10',
        title: "Como sociedad entre socios: ¿existen acuerdos formales entre ustedes —pacto de socios, reglas de retiro de utilidades, protocolo ante desacuerdos o ante la salida de un socio— y una figura societaria que ordene todo esto?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_2_finanzas',
    number: 2,
    name: "Administración y Finanzas",
    icon: 'DollarSign',
    pentagonAxis: 'Finanzas',
    description: "Facturación, márgenes, estructura de costos, precios/redeterminación, flujo de caja y separación patrimonial.",
    imeWeight: 0.14,
    kpis: [
      { name: "Margen neto operativo", unit: "%", target: ">= 15%" },
      { name: "Meses de reserva de caja (Runway)", unit: "meses", target: ">= 3 meses" },
      { name: "Plazo promedio de cobro (DSO)", unit: "días", target: "<= 30 días" }
    ],
    questions: [
      {
        id: 11,
        areaId: 'area_2_finanzas',
        code: 'Q11',
        title: "¿Cuál fue la facturación de los últimos 12 meses? ¿Cómo evolucionó mes a mes? ¿Hay estacionalidad?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 12,
        areaId: 'area_2_finanzas',
        code: 'Q12',
        title: "¿Cuáles son sus principales fuentes de ingreso y qué % representa cada una?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 13,
        areaId: 'area_2_finanzas',
        code: 'Q13',
        title: "¿En qué monedas facturan y cobran (pesos, dólares)? ¿Qué porcentaje representa cada una? ¿Tienen contratos u obras nominados en USD (p. ej. sector minero)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 14,
        areaId: 'area_2_finanzas',
        code: 'Q14',
        title: "¿Conoce su margen bruto y neto? ¿Cómo los calcula? ¿Varían según el tipo de producto o servicio?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 15,
        areaId: 'area_2_finanzas',
        code: 'Q15',
        title: "¿Tiene identificados sus costos fijos mensuales (estructura)? ¿Cuál es su punto de equilibrio?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 16,
        areaId: 'area_2_finanzas',
        code: 'Q16',
        title: "¿Cómo definen los precios y presupuestos de cada obra o servicio (por m², presupuesto cerrado, por administración / costo + margen)? ¿Con qué frecuencia y criterio los actualizan (redeterminación por inflación)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 17,
        areaId: 'area_2_finanzas',
        code: 'Q17',
        title: "¿Existen costos ocultos o ineficiencias conocidas que aún no ha podido resolver?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 18,
        areaId: 'area_2_finanzas',
        code: 'Q18',
        title: "¿Lleva registro de ingresos y egresos? ¿Con qué herramienta y frecuencia lo revisa?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 19,
        areaId: 'area_2_finanzas',
        code: 'Q19',
        title: "¿Tiene proyección de flujo de caja a 3, 6 o 12 meses? ¿Cuántos meses de reserva tiene la empresa?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 20,
        areaId: 'area_2_finanzas',
        code: 'Q20',
        title: "¿Cuáles son los plazos reales de cobro de sus clientes? ¿Trabajan con anticipos, certificados de avance o pagos contra entrega? ¿Existen demoras o incobrables? ¿Cómo gestionan la cobranza?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 21,
        areaId: 'area_2_finanzas',
        code: 'Q21',
        title: "¿Están las finanzas de la empresa completamente separadas de las personales? ¿Hay cuenta bancaria empresarial? ¿Cómo retira el/la titular sus beneficios?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 22,
        areaId: 'area_2_finanzas',
        code: 'Q22',
        title: "¿Tiene deudas o compromisos financieros activos (préstamos, equipamiento, proveedores)? Detalle monto, tasa y plazo.",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 23,
        areaId: 'area_2_finanzas',
        code: 'Q23',
        title: "¿Cómo calificaría la salud financiera actual de la empresa?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      }
    ]
  },
  {
    id: 'area_3_operaciones',
    number: 3,
    name: "Operaciones y Producción",
    icon: 'Settings',
    pentagonAxis: 'Procesos',
    description: "Procesos principales, capacidad instalada, cumplimiento de plazos, reprocesos y cuellos de botella.",
    imeWeight: 0.14,
    kpis: [
      { name: "Proyectos / obras simultáneas (capacidad)", unit: "unidades", target: "Definida" },
      { name: "% trabajos con reproceso", unit: "%", target: "< 5%" },
      { name: "% cumplimiento de plazos comprometidos", unit: "%", target: ">= 90%" }
    ],
    questions: [
      {
        id: 24,
        areaId: 'area_3_operaciones',
        code: 'Q24',
        title: "¿Cuáles son sus procesos principales? Descríbalos paso a paso, desde que aparece una oportunidad hasta que se cierra el trabajo.",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 25,
        areaId: 'area_3_operaciones',
        code: 'Q25',
        title: "¿Cuál es su capacidad máxima actual (N° de proyectos/contratos simultáneos) con la estructura de hoy?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 26,
        areaId: 'area_3_operaciones',
        code: 'Q26',
        title: "¿Cuál es el mínimo de facturación mensual (MVP operativo) para cubrir costos fijos y no perder dinero?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 27,
        areaId: 'area_3_operaciones',
        code: 'Q27',
        title: "¿Qué porcentaje de las oportunidades u obras deben rechazar, derivar o postergar por falta de capacidad de gestión o de estructura, y qué hacen en esos casos?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 28,
        areaId: 'area_3_operaciones',
        code: 'Q28',
        title: "¿Qué porcentaje de trabajos requieren reproceso o corrección antes de la entrega? ¿Cuánto cuesta al mes?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 29,
        areaId: 'area_3_operaciones',
        code: 'Q29',
        title: "¿Tiene indicadores de calidad activos? ¿Certificaciones (ISO, etc.)? ¿Cómo mide la satisfacción del trabajo entregado?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 30,
        areaId: 'area_3_operaciones',
        code: 'Q30',
        title: "¿Cumplen los plazos de obra y entrega comprometidos? ¿Con qué frecuencia se retrasan, cuáles son las causas más frecuentes y cómo lo comunican al cliente?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 31,
        areaId: 'area_3_operaciones',
        code: 'Q31',
        title: "¿En qué medida los procesos operativos están documentados y estandarizados?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 32,
        areaId: 'area_3_operaciones',
        code: 'Q32',
        title: "¿Cuáles son los 3 principales cuellos de botella de la operación? ¿Dónde se \"rompe\" el sistema con mayor frecuencia?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 33,
        areaId: 'area_3_operaciones',
        code: 'Q33',
        title: "¿Hay personas cuya ausencia detendría o comprometería seriamente la operación? ¿Su conocimiento está documentado o solo en su cabeza?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_4_rrhh',
    number: 4,
    name: "Recursos Humanos",
    icon: 'Users',
    pentagonAxis: 'Talento',
    description: "Dotación, roles de socios, registración formal, mandos medios, inducción, capacitación y clima laboral.",
    imeWeight: 0.09,
    kpis: [
      { name: "Dotación total (propios + subcontratos)", unit: "personas", target: "Estructurada" },
      { name: "% roles con descripción escrita", unit: "%", target: "100%" },
      { name: "Rotación anual de personal clave", unit: "%", target: "< 10%" }
    ],
    questions: [
      {
        id: 34,
        areaId: 'area_4_rrhh',
        code: 'Q34',
        title: "¿Cuántas personas integran la empresa (dirección, planta permanente, personal variable, subcontratos, freelance)? Detalle por área.",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 35,
        areaId: 'area_4_rrhh',
        code: 'Q35',
        title: "¿Qué tareas realiza hoy cada socio (comerciales, proyecto/técnica, obra, administrativas)? ¿Cuáles consideran que solo ustedes pueden hacer y cuáles podrían delegar?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 36,
        areaId: 'area_4_rrhh',
        code: 'Q36',
        title: "¿Qué tipo de vínculo formal tienen con el personal y los subcontratistas (relación de dependencia, monotributo/factura, acuerdos verbales)? ¿Cómo se gestionan las altas y la registración?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 37,
        areaId: 'area_4_rrhh',
        code: 'Q37',
        title: "¿Cada persona tiene rol y responsabilidades definidos por escrito? ¿Existen descripciones de puesto?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 38,
        areaId: 'area_4_rrhh',
        code: 'Q38',
        title: "¿Tiene mandos medios o líderes de área capacitados para gestionar de forma autónoma?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 39,
        areaId: 'area_4_rrhh',
        code: 'Q39',
        title: "¿Cuánto tarda un nuevo integrante en ser productivo? ¿Existe un proceso de inducción estructurado?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 40,
        areaId: 'area_4_rrhh',
        code: 'Q40',
        title: "¿Cómo seleccionan y evalúan a los subcontratistas, gremios y personal de obra (cuadrillas, tercerizados)? ¿Qué requisitos exigen (experiencia, referencias, papeles, seguridad)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 41,
        areaId: 'area_4_rrhh',
        code: 'Q41',
        title: "¿Cuántas horas de capacitación formal recibe cada persona por año? ¿Hay presupuesto para formación?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 42,
        areaId: 'area_4_rrhh',
        code: 'Q42',
        title: "¿Cómo calificaría el clima laboral actual?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 43,
        areaId: 'area_4_rrhh',
        code: 'Q43',
        title: "¿Cuántas personas dejaron la empresa en los últimos 12 meses y por qué razones?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 44,
        areaId: 'area_4_rrhh',
        code: 'Q44',
        title: "¿Qué hace la empresa para retener y motivar al talento clave?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_5_comercial',
    number: 5,
    name: "Comercial y Marketing",
    icon: 'TrendingUp',
    pentagonAxis: 'Comercial',
    description: "Propuesta de valor, posicionamiento, canales de captación, licitaciones, conversión y marketing digital.",
    imeWeight: 0.13,
    kpis: [
      { name: "Tasa de conversión de presupuestos", unit: "%", target: ">= 30%" },
      { name: "Ciclo promedio de cierre", unit: "días", target: "<= 30 días" },
      { name: "Consultas / leads calificados por mes", unit: "leads/mes", target: ">= 10" }
    ],
    questions: [
      {
        id: 45,
        areaId: 'area_5_comercial',
        code: 'Q45',
        title: "¿Por qué los clientes eligen a la empresa y no a la competencia? ¿Cuál es su propuesta de valor diferencial?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 46,
        areaId: 'area_5_comercial',
        code: 'Q46',
        title: "¿En qué segmento está mejor posicionado hoy y en cuál quiere estar en 3 años?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 47,
        areaId: 'area_5_comercial',
        code: 'Q47',
        title: "¿Cómo consigue nuevos clientes hoy? Describa el proceso desde el primer contacto hasta el cierre.",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 48,
        areaId: 'area_5_comercial',
        code: 'Q48',
        title: "¿Cuántas cotizaciones/presupuestos envía por mes y cuántos se convierten en venta?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 49,
        areaId: 'area_5_comercial',
        code: 'Q49',
        title: "¿Cuánto tarda en promedio desde el primer contacto hasta la adjudicación/cierre?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 50,
        areaId: 'area_5_comercial',
        code: 'Q50',
        title: "¿Participan en licitaciones, procesos de homologación o registros de proveedores de grandes empresas (mineras, Estado, corporativos)? ¿Cómo les ha ido y qué requisitos les exigieron (calidad, seguridad, administración)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 51,
        areaId: 'area_5_comercial',
        code: 'Q51',
        title: "¿Su web y canales digitales están activos? ¿Con qué frecuencia se actualizan? ¿Generan consultas/leads?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 52,
        areaId: 'area_5_comercial',
        code: 'Q52',
        title: "¿Tiene una estrategia de marketing definida? ¿Cuánto invierte por mes?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 53,
        areaId: 'area_5_comercial',
        code: 'Q53',
        title: "¿Qué tan activa y estructurada es su estrategia comercial hoy?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      }
    ]
  },
  {
    id: 'area_6_clientes',
    number: 6,
    name: "Clientes y Experiencia",
    icon: 'HeartHandshake',
    pentagonAxis: 'Comercial',
    description: "Concentración de cartera, recurrencia, satisfacción (NPS), reclamos y postventa.",
    imeWeight: 0.09,
    kpis: [
      { name: "% facturación en top 3 clientes", unit: "%", target: "< 45%" },
      { name: "Tasa de recompra / recurrencia", unit: "%", target: ">= 50%" },
      { name: "Reclamos formales / mes", unit: "cant/mes", target: "0-1" }
    ],
    questions: [
      {
        id: 54,
        areaId: 'area_6_clientes',
        code: 'Q54',
        title: "¿Quiénes son sus principales clientes y qué % de la facturación representa cada uno?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 55,
        areaId: 'area_6_clientes',
        code: 'Q55',
        title: "¿Qué % de clientes realiza compras/trabajos repetidos? ¿Cuánto dura en promedio la relación?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 56,
        areaId: 'area_6_clientes',
        code: 'Q56',
        title: "¿Mide la satisfacción de sus clientes? ¿Recibe feedback sistemático?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 57,
        areaId: 'area_6_clientes',
        code: 'Q57',
        title: "¿Cuántos reclamos formales recibe por mes? ¿Cómo los gestiona y en cuánto tiempo resuelve?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 58,
        areaId: 'area_6_clientes',
        code: 'Q58',
        title: "¿Qué hace la empresa después de entregar un trabajo para fidelizar al cliente?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_7_procesos',
    number: 7,
    name: "Procesos y Sistemas de Gestión",
    icon: 'ClipboardCheck',
    pentagonAxis: 'Procesos',
    description: "Instructivos escritos, manual de operaciones, checklists, confidencialidad, certificaciones y seguimiento de proyectos.",
    imeWeight: 0.09,
    kpis: [
      { name: "Procesos críticos documentados", unit: "%", target: ">= 80%" },
      { name: "Proyectos entregados en plazo y presupuesto", unit: "%", target: ">= 85%" }
    ],
    questions: [
      {
        id: 59,
        areaId: 'area_7_procesos',
        code: 'Q59',
        title: "¿Cuántos procedimientos o instructivos escritos tiene hoy? ¿Qué procesos críticos NO están documentados?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 60,
        areaId: 'area_7_procesos',
        code: 'Q60',
        title: "¿Existe un manual de operaciones, calidad o procedimientos? ¿Cuándo se actualizó por última vez?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 61,
        areaId: 'area_7_procesos',
        code: 'Q61',
        title: "¿Cómo asegura que todo el equipo trabaje de la misma manera? ¿Usa checklists?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 62,
        areaId: 'area_7_procesos',
        code: 'Q62',
        title: "¿Cómo gestionan la confidencialidad y el resguardo de la información y documentación de los clientes y de las obras (planos, proyectos, contratos, cómputos)? ¿Existen protocolos, respaldos y acuerdos firmados?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 63,
        areaId: 'area_7_procesos',
        code: 'Q63',
        title: "¿Tiene alguna certificación de calidad (ISO 9001 u otra)? ¿Está vigente? ¿Cubre toda la operación?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 64,
        areaId: 'area_7_procesos',
        code: 'Q64',
        title: "¿Cómo calificaría el nivel de madurez de sus sistemas de gestión?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 65,
        areaId: 'area_7_procesos',
        code: 'Q65',
        title: "¿Cómo planifica y hace seguimiento de los proyectos activos? ¿Qué herramienta usa?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 66,
        areaId: 'area_7_procesos',
        code: 'Q66',
        title: "¿Con qué frecuencia los proyectos se entregan fuera de plazo o de presupuesto? ¿Cuál es la causa más común?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_8_tecnologia',
    number: 8,
    name: "Tecnología y Sistemas",
    icon: 'Cpu',
    pentagonAxis: 'Procesos',
    description: "Software de gestión, herramientas técnicas, centralización/respaldo de datos, integración y adopción de IA.",
    imeWeight: 0.05,
    kpis: [
      { name: "% procesos digitalizados", unit: "%", target: ">= 80%" },
      { name: "Backup automático verificado", unit: "Sí/No", target: "Sí (100%)" }
    ],
    questions: [
      {
        id: 67,
        areaId: 'area_8_tecnologia',
        code: 'Q67',
        title: "¿Qué sistemas o software usa hoy para gestionar la empresa? Mencione todas las herramientas.",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 68,
        areaId: 'area_8_tecnologia',
        code: 'Q68',
        title: "¿Qué herramientas profesionales usan para el trabajo técnico en sí (Revit, BIM, AutoCAD, software de cómputos y presupuestos, gestión de obra)? ¿Cuáles, para qué etapa y con qué nivel de dominio del equipo?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 69,
        areaId: 'area_8_tecnologia',
        code: 'Q69',
        title: "¿La información de la empresa (proyectos, planos, datos de clientes, registros administrativos) está centralizada y respaldada, o dispersa en dispositivos y cuentas personales de cada socio?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 70,
        areaId: 'area_8_tecnologia',
        code: 'Q70',
        title: "¿Sus sistemas están integrados o funcionan como \"silos\"? ¿Hay recarga de datos duplicada?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 71,
        areaId: 'area_8_tecnologia',
        code: 'Q71',
        title: "¿Qué % de sus procesos está digitalizado (vs. papel, verbal o email)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 72,
        areaId: 'area_8_tecnologia',
        code: 'Q72',
        title: "¿Utiliza herramientas de IA (Claude, ChatGPT, Gemini)? ¿Para qué tareas?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 73,
        areaId: 'area_8_tecnologia',
        code: 'Q73',
        title: "¿Cuáles son los principales dolores tecnológicos que enfrenta hoy?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_9_proveedores',
    number: 9,
    name: "Proveedores y Cadena de Valor",
    icon: 'Truck',
    pentagonAxis: 'Procesos',
    description: "Proveedores críticos y alternativos, compras, inventario/stock, maquinaria/equipos y calce de pagos.",
    imeWeight: 0.05,
    kpis: [
      { name: "Proveedores críticos con alternativa", unit: "%", target: "100%" },
      { name: "Calce financiero cobros vs pagos", unit: "días", target: ">= 0 días" }
    ],
    questions: [
      {
        id: 74,
        areaId: 'area_9_proveedores',
        code: 'Q74',
        title: "¿Cuáles son sus 5 proveedores más críticos? ¿Qué pasaría si uno dejara de operar mañana?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 75,
        areaId: 'area_9_proveedores',
        code: 'Q75',
        title: "¿Tiene proveedores alternativos para los insumos más importantes? ¿Hay contratos o acuerdos formales?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 76,
        areaId: 'area_9_proveedores',
        code: 'Q76',
        title: "¿Cómo gestiona las compras? ¿Hay un responsable definido y un proceso de aprobación?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 77,
        areaId: 'area_9_proveedores',
        code: 'Q77',
        title: "¿Tiene inventario/stock? ¿Cómo lo gestiona? ¿Conoce su rotación?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 78,
        areaId: 'area_9_proveedores',
        code: 'Q78',
        title: "Sobre maquinaria, herramientas y equipos: ¿qué inventario propio tienen frente a lo que aporta el constructor o los subcontratistas? ¿Cómo deciden entre equipo propio, alquiler o tercerización? ¿Qué valor de reposición estiman y cómo lo protegen?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 79,
        areaId: 'area_9_proveedores',
        code: 'Q79',
        title: "¿Qué condiciones de pago negocia con proveedores (contado, 30, 60 días)? ¿Calzan con el plazo de cobro de sus clientes?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_10_seguridad',
    number: 10,
    name: "Seguridad, Seguros y Gestión de Riesgos",
    icon: 'ShieldAlert',
    pentagonAxis: 'Procesos',
    description: "Coberturas de seguros, seguridad e higiene, ART/EPP, protocolos en obra, registro de incidentes y blindaje patrimonial.",
    imeWeight: 0.08,
    kpis: [
      { name: "% personal/subcontratos con ART vigente", unit: "%", target: "100%" },
      { name: "Cobertura de seguros actualizada", unit: "1-5", target: "5" },
      { name: "Incidentes / accidentes registrados", unit: "cant/año", target: "0" }
    ],
    questions: [
      {
        id: 80,
        areaId: 'area_10_seguridad',
        code: 'Q80',
        title: "¿Qué seguros tiene contratada la empresa hoy? Detalle coberturas y montos: responsabilidad civil, todo riesgo construcción/obra, ART, seguro de vida, accidentes personales, equipos/maquinaria, vehículos, robo e incendio.",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 81,
        areaId: 'area_10_seguridad',
        code: 'Q81',
        title: "¿Cuentan con seguro de vida y/o de accidentes personales para los socios y para el personal clave? ¿Qué capital y qué coberturas incluyen?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 82,
        areaId: 'area_10_seguridad',
        code: 'Q82',
        title: "¿Las instalaciones (oficina, depósito, obrador) y los bienes (equipos, herramientas, vehículos) están asegurados contra incendio, robo y daños? ¿El valor asegurado está actualizado respecto del valor de reposición?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 83,
        areaId: 'area_10_seguridad',
        code: 'Q83',
        title: "¿Cómo calificarían el nivel de cobertura de seguros de la empresa frente a los riesgos reales de su operación?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 84,
        areaId: 'area_10_seguridad',
        code: 'Q84',
        title: "¿Cuentan con un servicio o responsable de Seguridad e Higiene? ¿Elaboran legajos técnicos, programas de seguridad y aviso de obra cuando corresponde?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 85,
        areaId: 'area_10_seguridad',
        code: 'Q85',
        title: "¿El personal de obra —propio y subcontratado— cuenta con ART vigente y con elementos de protección personal (EPP)? ¿Cómo lo verifican antes de que ingresen a la obra?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 86,
        areaId: 'area_10_seguridad',
        code: 'Q86',
        title: "¿Qué protocolos de seguridad aplican en obra (trabajo en altura, andamios, excavaciones, electricidad, orden y limpieza)? ¿Están documentados y se controlan?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 87,
        areaId: 'area_10_seguridad',
        code: 'Q87',
        title: "¿Registran los accidentes, incidentes y \"casi-accidentes\" en obra? ¿Con qué frecuencia ocurren y cómo los gestionan e investigan?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 88,
        areaId: 'area_10_seguridad',
        code: 'Q88',
        title: "¿El personal y los subcontratistas están correctamente registrados y cubiertos (altas, ART, seguros) ANTES de iniciar tareas, o se regulariza solo ante inspecciones? ¿Exigen ART y seguros a los subcontratistas?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 89,
        areaId: 'area_10_seguridad',
        code: 'Q89',
        title: "¿Qué pasaría con la empresa y con el patrimonio personal de los socios ante un siniestro grave (accidente fatal en obra, incendio del obrador, derrumbe, juicio laboral)? ¿Está el patrimonio personal protegido de los riesgos de la operación? ¿Prevén un fondo o mecanismo para contingencias?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  },
  {
    id: 'area_11_contexto',
    number: 11,
    name: "Contexto Externo (PESTEL) y Reflexión Final",
    icon: 'Globe',
    pentagonAxis: 'Directorio',
    description: "Regulaciones, entorno macroeconómico, dinámica sectorial, competidores, dolores principales y fortalezas.",
    imeWeight: 0,
    kpis: [
      { name: "Mecanismo de redeterminación activo", unit: "Sí/No", target: "Sí" },
      { name: "Intensidad competitiva percibida", unit: "1-5", target: "Monitoreada" }
    ],
    questions: [
      {
        id: 90,
        areaId: 'area_11_contexto',
        code: 'Q90',
        title: "¿Qué regulaciones o normativas impactan directamente en el negocio?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 91,
        areaId: 'area_11_contexto',
        code: 'Q91',
        title: "¿Hay algún cambio político o regulatorio que podría afectar a la empresa en los próximos 2 años?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 92,
        areaId: 'area_11_contexto',
        code: 'Q92',
        title: "¿Cómo afectan la inflación y el tipo de cambio al negocio? ¿Tiene mecanismos de cobertura (redeterminación de precios)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 93,
        areaId: 'area_11_contexto',
        code: 'Q93',
        title: "¿Su sector está creciendo, estable o en declive? ¿Qué indicadores sigue para monitorearlo?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 94,
        areaId: 'area_11_contexto',
        code: 'Q94',
        title: "¿Cómo evalúan la actividad de los sectores que los contratan (minería, obra pública, inversores inmobiliarios, privados)? ¿Qué indicadores o señales siguen para anticipar la demanda (p. ej. la ola minera de cobre en San Juan)?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 95,
        areaId: 'area_11_contexto',
        code: 'Q95',
        title: "¿Hay tendencias sociales (sustentabilidad, eficiencia, nuevos hábitos) que estén afectando su mercado?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 96,
        areaId: 'area_11_contexto',
        code: 'Q96',
        title: "¿Existe alguna tecnología emergente que pueda disrumpir su sector en 3 años?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 97,
        areaId: 'area_11_contexto',
        code: 'Q97',
        title: "¿Quiénes son sus 3 principales competidores? ¿En qué se diferencia? ¿Qué hacen mejor que usted?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 98,
        areaId: 'area_11_contexto',
        code: 'Q98',
        title: "¿Está creciendo el mercado donde opera? ¿Qué oportunidades no exploradas ve hoy?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 99,
        areaId: 'area_11_contexto',
        code: 'Q99',
        title: "¿Cómo calificaría la intensidad competitiva de su sector?",
        questionType: 'maturity_level',
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 100,
        areaId: 'area_11_contexto',
        code: 'Q100',
        title: "¿Cuáles son los 3 mayores \"dolores\" que enfrenta la empresa HOY y que, si se resolvieran, cambiarían todo?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 101,
        areaId: 'area_11_contexto',
        code: 'Q101',
        title: "¿Cuál es el mayor freno o limitación que siente que le impide crecer más rápido?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 102,
        areaId: 'area_11_contexto',
        code: 'Q102',
        title: "¿Qué es lo que mejor hace la empresa? ¿Cuál es su \"superpoder\" que no debería perder bajo ninguna circunstancia?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 103,
        areaId: 'area_11_contexto',
        code: 'Q103',
        title: "¿Hay algo que no se preguntó y que considera importante que GS Consultora sepa sobre la empresa?",
        questionType: 'open_diagnostic',
        options: STANDARD_CLOSED_OPTIONS
      }
    ]
  }
];

export function getAllDiagnosticQuestions(): DiagnosticQuestion[] {
  return DIAGNOSTIC_AREAS.flatMap(area => area.questions);
}

export function getDiagnosticQuestionById(id: number): DiagnosticQuestion | undefined {
  return getAllDiagnosticQuestions().find(q => q.id === id);
}
