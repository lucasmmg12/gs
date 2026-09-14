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

export interface DiagnosticQuestion {
  id: number;
  areaId: string;
  code: string;
  title: string;
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
    name: 'Dirección y Estrategia',
    icon: 'Compass',
    pentagonAxis: 'Directorio',
    description: 'Pensamiento estratégico, visión a 3 años, gobernanza y separación del rol de dueño vs operador.',
    imeWeight: 0.15,
    kpis: [
      {
            "name": "% tiempo semanal dedicado a estrategia",
            "unit": "%"
      },
      {
            "name": "N° reuniones estratégicas por mes",
            "unit": "N°"
      },
      {
            "name": "N° objetivos formalizados con KPI",
            "unit": "N°"
      },
      {
            "name": "Score de alineación en la dirección",
            "unit": "1-10"
      }
],
    questions: [
      {
        id: 1,
        areaId: 'area_1_direccion',
        code: 'Q1',
        title: "¿Tiene la empresa una Visión y una Misión formalmente definidas y comunicadas al equipo?",
        guide: "Si la empresa comunica un lema o mensaje comercial, ¿existe una Visión/Misión formal más allá de ese mensaje? Si existen, transcríbalas.",
        kpi: "Existencia de Visión/Misión documentada (Sí/No)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 2,
        areaId: 'area_1_direccion',
        code: 'Q2',
        title: "¿Cuáles son los 3 objetivos estratégicos más importantes para los próximos 12 meses?",
        guide: "Considere el foco del negocio y sus principales frentes de mercado. Incluya números, plazos y responsables.",
        kpi: "N° de objetivos formalizados con métricas",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 3,
        areaId: 'area_1_direccion',
        code: 'Q3',
        title: "¿Qué tan clara y compartida está la visión de largo plazo dentro de la dirección (Juan, Pedro, María, Luis, Ana)?",
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 4,
        areaId: 'area_1_direccion',
        code: 'Q4',
        title: "¿Cuántas horas por semana dedica el/la titular a pensar y trabajar EN la empresa (estrategia) vs. trabajar DENTRO de ella (dirección técnica, comercial, operación)?",
        guide: "Con frecuencia el/la titular concentra dirección, operaciones y comercial. Sea honesto: esta es una de las brechas más comunes y el eje de la \"poda\".",
        kpi: "% de tiempo en estrategia (meta: 30%+)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 5,
        areaId: 'area_1_direccion',
        code: 'Q5',
        title: "¿Existen reuniones estratégicas periódicas (no operativas)? ¿Con qué frecuencia? ¿Quiénes participan? ¿Hay agenda fija?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 6,
        areaId: 'area_1_direccion',
        code: 'Q6',
        title: "¿En qué medida la urgencia operativa del día a día impide trabajar en la estrategia?",
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 7,
        areaId: 'area_1_direccion',
        code: 'Q7',
        title: "¿Cómo se toman las decisiones importantes? ¿Quién decide sobre cada área: operaciones, finanzas, técnica, provisiones?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 8,
        areaId: 'area_1_direccion',
        code: 'Q8',
        title: "¿Existe un organigrama formal con roles y responsabilidades claras? ¿Se comparte con el equipo?",
        guide: "Si la empresa muestra distintas áreas de dirección, ¿está formalizado por escrito y con límites de autoridad?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 9,
        areaId: 'area_1_direccion',
        code: 'Q9',
        title: "¿Cuáles son los valores no negociables de la empresa? ¿Están documentados?",
        guide: "Si la empresa comunica valores como calidad, seguridad o cumplimiento de plazos, ¿son valores declarados y vividos, o solo comerciales?",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_2_finanzas',
    number: 2,
    name: 'Administración y Finanzas',
    icon: 'DollarSign',
    pentagonAxis: 'Finanzas',
    description: 'Salud financiera, flujo de caja, punto de equilibrio, rentabilidad por proyecto y ordenamiento contable.',
    imeWeight: 0.15,
    kpis: [
      {
            "name": "Facturación anual",
            "unit": "$"
      },
      {
            "name": "Margen bruto",
            "unit": "%"
      },
      {
            "name": "Margen neto",
            "unit": "%"
      },
      {
            "name": "Costos fijos mensuales (estructura)",
            "unit": "$"
      },
      {
            "name": "Punto de equilibrio",
            "unit": "$/mes"
      },
      {
            "name": "Runway (reserva)",
            "unit": "Meses"
      },
      {
            "name": "Plazo promedio de cobro",
            "unit": "Días"
      },
      {
            "name": "Deuda total",
            "unit": "$"
      }
],
    questions: [
      {
        id: 10,
        areaId: 'area_2_finanzas',
        code: 'Q10',
        title: "¿Cuál fue la facturación de los últimos 12 meses? ¿Cómo evolucionó mes a mes? ¿Hay estacionalidad?",
        guide: "Muchos negocios tienen estacionalidad según su mercado. Adjunte planilla si la tiene.",
        kpi: "Facturación anual ($) y variabilidad mensual (CV%)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 11,
        areaId: 'area_2_finanzas',
        code: 'Q11',
        title: "¿Cuáles son sus principales fuentes de ingreso y qué % representa cada una?",
        guide: "Abra el mix por línea de servicio o producto y por mercado o segmento de cliente.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 12,
        areaId: 'area_2_finanzas',
        code: 'Q12',
        title: "¿Conoce su margen bruto y neto? ¿Cómo los calcula? ¿Varían según el tipo de producto o servicio?",
        guide: "Compare márgenes entre las distintas líneas de negocio.",
        kpi: "Margen bruto (%) y margen neto (%)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 13,
        areaId: 'area_2_finanzas',
        code: 'Q13',
        title: "¿Tiene identificados sus costos fijos mensuales (estructura)? ¿Cuál es su punto de equilibrio?",
        guide: "Liste los principales costos fijos de la estructura estable que la empresa quiere mantener.",
        kpi: "Punto de equilibrio mensual ($)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 14,
        areaId: 'area_2_finanzas',
        code: 'Q14',
        title: "¿Existen costos ocultos o ineficiencias conocidas que aún no ha podido resolver?",
        guide: "¿Dónde se pierde dinero silenciosamente hoy: reprocesos, tiempos muertos, stock inmovilizado?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 15,
        areaId: 'area_2_finanzas',
        code: 'Q15',
        title: "¿Lleva registro de ingresos y egresos? ¿Con qué herramienta y frecuencia lo revisa?",
        guide: "Ejemplos: sistema contable, Excel, ERP.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 16,
        areaId: 'area_2_finanzas',
        code: 'Q16',
        title: "¿Tiene proyección de flujo de caja a 3, 6 o 12 meses? ¿Cuántos meses de reserva tiene la empresa?",
        guide: "Clave cuando el cobro suele demorar y exige capital de trabajo.",
        kpi: "Runway (meses de reserva)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 17,
        areaId: 'area_2_finanzas',
        code: 'Q17',
        title: "¿Están las finanzas de la empresa completamente separadas de las personales? ¿Hay cuenta bancaria empresarial? ¿Cómo retira el/la titular sus beneficios?",
        guide: "Punto crítico especialmente en empresas unipersonales: el patrimonio personal responde por la empresa. Evalúe el grado de separación real.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 18,
        areaId: 'area_2_finanzas',
        code: 'Q18',
        title: "¿Tiene deudas o compromisos financieros activos (préstamos, equipamiento, proveedores)? Detalle monto, tasa y plazo.",
        kpi: "Ratio deuda/patrimonio",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 19,
        areaId: 'area_2_finanzas',
        code: 'Q19',
        title: "¿Cómo calificaría la salud financiera actual de la empresa?",
        options: SCALE_1_TO_5_OPTIONS
      },
    ]
  },
  {
    id: 'area_3_operaciones',
    number: 3,
    name: 'Operaciones y Producción',
    icon: 'Settings',
    pentagonAxis: 'Procesos',
    description: 'Capacidad operativa, procesos de ejecución, cuellos de botella y estandarización.',
    imeWeight: 0.15,
    kpis: [
      {
            "name": "N° de proyectos simultáneos (capacidad)",
            "unit": "N°"
      },
      {
            "name": "Utilización actual de capacidad",
            "unit": "%"
      },
      {
            "name": "MVP operativo mensual",
            "unit": "$"
      },
      {
            "name": "Tasa de reproceso",
            "unit": "%"
      },
      {
            "name": "% procesos documentados",
            "unit": "%"
      },
      {
            "name": "Plazo comprometido vs. real",
            "unit": "Días"
      },
      {
            "name": "% trabajos entregados en fecha",
            "unit": "%"
      }
],
    questions: [
      {
        id: 20,
        areaId: 'area_3_operaciones',
        code: 'Q20',
        title: "¿Cuáles son sus procesos principales? Descríbalos paso a paso, desde que aparece una oportunidad hasta que se cierra el trabajo.",
        guide: "Sugerencia de etapas: Relevamiento/Factibilidad → Diseño/Propuesta → Cotización → Adjudicación → Planificación → Ejecución → Control de avance → Entrega/Cierre.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 21,
        areaId: 'area_3_operaciones',
        code: 'Q21',
        title: "¿Cuál es su capacidad máxima actual (N° de proyectos/contratos simultáneos) con la estructura de hoy?",
        guide: "Relacione con su capacidad instalada y de gestión. ¿Cuál es el \"techo\" real de gestión simultánea?",
        kpi: "N° de proyectos simultáneos y monto máximo gestionable",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 22,
        areaId: 'area_3_operaciones',
        code: 'Q22',
        title: "¿Cuál es el mínimo de facturación mensual (MVP operativo) para cubrir costos fijos y no perder dinero?",
        kpi: "MVP en $ mensuales",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 23,
        areaId: 'area_3_operaciones',
        code: 'Q23',
        title: "¿Qué porcentaje de trabajos requieren reproceso o corrección antes de la entrega? ¿Cuánto cuesta al mes?",
        kpi: "Tasa de reproceso (%) y costo mensual ($)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 24,
        areaId: 'area_3_operaciones',
        code: 'Q24',
        title: "¿Tiene indicadores de calidad activos? ¿Certificaciones (ISO, etc.)? ¿Cómo mide la satisfacción del trabajo entregado?",
        guide: "Considere estándares externos o habilitaciones ya alcanzadas como referencia.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 25,
        areaId: 'area_3_operaciones',
        code: 'Q25',
        title: "¿En qué medida los procesos operativos están documentados y estandarizados?",
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 26,
        areaId: 'area_3_operaciones',
        code: 'Q26',
        title: "¿Cuáles son los 3 principales cuellos de botella de la operación? ¿Dónde se \"rompe\" el sistema con mayor frecuencia?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 27,
        areaId: 'area_3_operaciones',
        code: 'Q27',
        title: "¿Hay personas cuya ausencia detendría o comprometería seriamente la operación? ¿Su conocimiento está documentado o solo en su cabeza?",
        guide: "Evalúe especialmente la dependencia de las personas clave de operaciones y de la propia dirección.",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_4_rrhh',
    number: 4,
    name: 'Recursos Humanos',
    icon: 'Users',
    pentagonAxis: 'Talento',
    description: 'Equipo, roles, liderazgo, cultura, retención y desarrollo del capital humano.',
    imeWeight: 0.1,
    kpis: [
      {
            "name": "N° empleados totales",
            "unit": "N°"
      },
      {
            "name": "N° mandos medios con rol definido",
            "unit": "N°"
      },
      {
            "name": "Tasa de rotación anual",
            "unit": "%"
      },
      {
            "name": "Horas de capacitación/persona/año",
            "unit": "Horas"
      },
      {
            "name": "Tiempo de onboarding",
            "unit": "Días"
      },
      {
            "name": "Score de clima laboral",
            "unit": "1-10"
      },
      {
            "name": "% conocimiento clave documentado",
            "unit": "%"
      }
],
    questions: [
      {
        id: 28,
        areaId: 'area_4_rrhh',
        code: 'Q28',
        title: "¿Cuántas personas integran la empresa (dirección, planta permanente, personal variable, subcontratos, freelance)? Detalle por área.",
        guide: "Detalle la dirección y las áreas, e incluya además la mano de obra o personal variable.",
        kpi: "N° empleados totales y por área",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 29,
        areaId: 'area_4_rrhh',
        code: 'Q29',
        title: "¿Cada persona tiene rol y responsabilidades definidos por escrito? ¿Existen descripciones de puesto?",
        kpi: "% roles con descripción formalizada",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 30,
        areaId: 'area_4_rrhh',
        code: 'Q30',
        title: "¿Tiene mandos medios o líderes de área capacitados para gestionar de forma autónoma?",
        guide: "¿Puede un proyecto avanzar sin la intervención directa del/de la titular?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 31,
        areaId: 'area_4_rrhh',
        code: 'Q31',
        title: "¿Cuánto tarda un nuevo integrante en ser productivo? ¿Existe un proceso de inducción estructurado?",
        kpi: "Tiempo de onboarding (días)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 32,
        areaId: 'area_4_rrhh',
        code: 'Q32',
        title: "¿Cuántas horas de capacitación formal recibe cada persona por año? ¿Hay presupuesto para formación?",
        kpi: "Horas de capacitación/persona/año",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 33,
        areaId: 'area_4_rrhh',
        code: 'Q33',
        title: "¿Cómo calificaría el clima laboral actual?",
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 34,
        areaId: 'area_4_rrhh',
        code: 'Q34',
        title: "¿Cuántas personas dejaron la empresa en los últimos 12 meses y por qué razones?",
        kpi: "Tasa de rotación anual (%)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 35,
        areaId: 'area_4_rrhh',
        code: 'Q35',
        title: "¿Qué hace la empresa para retener y motivar al talento clave?",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_5_comercial',
    number: 5,
    name: 'Comercial y Marketing',
    icon: 'TrendingUp',
    pentagonAxis: 'Comercial',
    description: 'Estrategia de ventas, propuesta de valor diferencial, canales y presencia de marca.',
    imeWeight: 0.15,
    kpis: [
      {
            "name": "N° cotizaciones/mes",
            "unit": "N°"
      },
      {
            "name": "Tasa de conversión cotización→adjudicación",
            "unit": "%"
      },
      {
            "name": "Ticket promedio por venta",
            "unit": "$"
      },
      {
            "name": "Ciclo de venta promedio",
            "unit": "Días"
      },
      {
            "name": "N° clientes activos",
            "unit": "N°"
      },
      {
            "name": "% facturación del top 3 clientes",
            "unit": "%"
      },
      {
            "name": "Inversión mensual en marketing",
            "unit": "$"
      }
],
    questions: [
      {
        id: 36,
        areaId: 'area_5_comercial',
        code: 'Q36',
        title: "¿Por qué los clientes eligen a la empresa y no a la competencia? ¿Cuál es su propuesta de valor diferencial?",
        guide: "Defina qué la hace única (ciclo de vida completo, experiencia, especialización). Evite \"buena calidad y buen precio\".",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 37,
        areaId: 'area_5_comercial',
        code: 'Q37',
        title: "¿En qué segmento está mejor posicionado hoy y en cuál quiere estar en 3 años?",
        guide: "Compare el posicionamiento actual con el objetivo de crecimiento.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 38,
        areaId: 'area_5_comercial',
        code: 'Q38',
        title: "¿Cómo consigue nuevos clientes hoy? Describa el proceso desde el primer contacto hasta el cierre.",
        guide: "Canales típicos: referencias, reactivación de vínculos, licitaciones, canales digitales, alianzas.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 39,
        areaId: 'area_5_comercial',
        code: 'Q39',
        title: "¿Cuántas cotizaciones/presupuestos envía por mes y cuántos se convierten en venta?",
        guide: "Si automatiza presupuestos con herramientas o IA, ¿mejoró el volumen o la velocidad de cotización?",
        kpi: "Tasa de conversión cotización→adjudicación (%)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 40,
        areaId: 'area_5_comercial',
        code: 'Q40',
        title: "¿Cuánto tarda en promedio desde el primer contacto hasta la adjudicación/cierre?",
        kpi: "Ciclo de venta promedio (días)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 41,
        areaId: 'area_5_comercial',
        code: 'Q41',
        title: "¿Su web y canales digitales están activos? ¿Con qué frecuencia se actualizan? ¿Generan consultas/leads?",
        guide: "Si cuenta con sitio propio y formulario de contacto, ¿cuántas consultas reales genera por mes?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 42,
        areaId: 'area_5_comercial',
        code: 'Q42',
        title: "¿Tiene una estrategia de marketing definida? ¿Cuánto invierte por mes?",
        guide: "Considere la tensión entre visibilidad comercial y el posicionamiento deseado.",
        kpi: "Inversión en marketing ($ y % de facturación)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 43,
        areaId: 'area_5_comercial',
        code: 'Q43',
        title: "¿Qué tan activa y estructurada es su estrategia comercial hoy?",
        options: SCALE_1_TO_5_OPTIONS
      },
    ]
  },
  {
    id: 'area_6_clientes',
    number: 6,
    name: 'Clientes y Experiencia',
    icon: 'HeartHandshake',
    pentagonAxis: 'Comercial',
    description: 'Cartera de clientes, satisfacción, postventa, fidelización y riesgo de concentración.',
    imeWeight: 0.1,
    kpis: [
      {
            "name": "N° clientes activos",
            "unit": "N°"
      },
      {
            "name": "% facturación top 1 cliente",
            "unit": "%"
      },
      {
            "name": "% facturación del principal segmento",
            "unit": "%"
      },
      {
            "name": "Tasa de retención anual",
            "unit": "%"
      },
      {
            "name": "NPS",
            "unit": "-100 a +100"
      },
      {
            "name": "N° reclamos/mes",
            "unit": "N°"
      },
      {
            "name": "Tiempo promedio de resolución",
            "unit": "Días"
      }
],
    questions: [
      {
        id: 44,
        areaId: 'area_6_clientes',
        code: 'Q44',
        title: "¿Quiénes son sus principales clientes y qué % de la facturación representa cada uno?",
        guide: "Identifique dependencia excesiva de un cliente o sector.",
        kpi: "% facturación del top 1 cliente (riesgo si >40%)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 45,
        areaId: 'area_6_clientes',
        code: 'Q45',
        title: "¿Qué % de clientes realiza compras/trabajos repetidos? ¿Cuánto dura en promedio la relación?",
        guide: "Los servicios recurrentes pueden convertir ventas puntuales en relaciones de largo plazo: ¿lo está aprovechando?",
        kpi: "Tasa de retención (%) y valor por cliente ($)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 46,
        areaId: 'area_6_clientes',
        code: 'Q46',
        title: "¿Mide la satisfacción de sus clientes? ¿Recibe feedback sistemático?",
        guide: "Encuestas, actas de recepción conforme, reuniones de cierre, NPS.",
        kpi: "NPS (si lo tiene)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 47,
        areaId: 'area_6_clientes',
        code: 'Q47',
        title: "¿Cuántos reclamos formales recibe por mes? ¿Cómo los gestiona y en cuánto tiempo resuelve?",
        kpi: "N° reclamos/mes y tiempo de resolución",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 48,
        areaId: 'area_6_clientes',
        code: 'Q48',
        title: "¿Qué hace la empresa después de entregar un trabajo para fidelizar al cliente?",
        guide: "Ej.: planes de mantenimiento/servicio, auditorías post-venta, garantías extendidas.",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_7_procesos',
    number: 7,
    name: 'Procesos y Sistemas de Gestión',
    icon: 'FileCheck',
    pentagonAxis: 'Procesos',
    description: 'Documentación, estandarización bajo ISO 9001, checklists y gestión de proyectos.',
    imeWeight: 0.1,
    kpis: [
      {
            "name": "N° procedimientos escritos activos",
            "unit": "N°"
      },
      {
            "name": "% procesos críticos documentados",
            "unit": "%"
      },
      {
            "name": "Certificaciones/habilitaciones activas",
            "unit": "N° y tipo"
      },
      {
            "name": "Score de madurez de sistemas",
            "unit": "1-5"
      },
      {
            "name": "% proyectos entregados en plazo",
            "unit": "%"
      },
      {
            "name": "% proyectos dentro de presupuesto",
            "unit": "%"
      }
],
    questions: [
      {
        id: 49,
        areaId: 'area_7_procesos',
        code: 'Q49',
        title: "¿Cuántos procedimientos o instructivos escritos tiene hoy? ¿Qué procesos críticos NO están documentados?",
        kpi: "N° procedimientos activos y % procesos documentados",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 50,
        areaId: 'area_7_procesos',
        code: 'Q50',
        title: "¿Existe un manual de operaciones, calidad o procedimientos? ¿Cuándo se actualizó por última vez?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 51,
        areaId: 'area_7_procesos',
        code: 'Q51',
        title: "¿Cómo asegura que todo el equipo trabaje de la misma manera? ¿Usa checklists?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 52,
        areaId: 'area_7_procesos',
        code: 'Q52',
        title: "¿Tiene alguna certificación de calidad (ISO 9001 u otra)? ¿Está vigente? ¿Cubre toda la operación?",
        guide: "Registre también otras habilitaciones o registros externos y su vencimiento, para planificar la renovación.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 53,
        areaId: 'area_7_procesos',
        code: 'Q53',
        title: "¿Cómo calificaría el nivel de madurez de sus sistemas de gestión?",
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 54,
        areaId: 'area_7_procesos',
        code: 'Q54',
        title: "¿Cómo planifica y hace seguimiento de los proyectos activos? ¿Qué herramienta usa?",
        guide: "¿Existe un tablero único de proyectos con avance, plazos y costos?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 55,
        areaId: 'area_7_procesos',
        code: 'Q55',
        title: "¿Con qué frecuencia los proyectos se entregan fuera de plazo o de presupuesto? ¿Cuál es la causa más común?",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_8_tecnologia',
    number: 8,
    name: 'Tecnología y Sistemas',
    icon: 'Laptop',
    pentagonAxis: 'Procesos',
    description: 'Madurez digital, herramientas de gestión, integración de software y uso de inteligencia artificial.',
    imeWeight: 0.05,
    kpis: [
      {
            "name": "N° sistemas/software activos",
            "unit": "N°"
      },
      {
            "name": "N° sistemas integrados",
            "unit": "N°"
      },
      {
            "name": "% procesos digitalizados",
            "unit": "%"
      },
      {
            "name": "Procesos asistidos con IA",
            "unit": "N°/desc."
      },
      {
            "name": "Score de madurez digital",
            "unit": "1-5"
      }
],
    questions: [
      {
        id: 56,
        areaId: 'area_8_tecnologia',
        code: 'Q56',
        title: "¿Qué sistemas o software usa hoy para gestionar la empresa? Mencione todas las herramientas.",
        guide: "Ej.: software de gestión/presupuestos, sistema contable, almacenamiento en la nube, comunicación.",
        kpi: "Score de madurez digital (1-5)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 57,
        areaId: 'area_8_tecnologia',
        code: 'Q57',
        title: "¿Sus sistemas están integrados o funcionan como \"silos\"? ¿Hay recarga de datos duplicada?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 58,
        areaId: 'area_8_tecnologia',
        code: 'Q58',
        title: "¿Qué % de sus procesos está digitalizado (vs. papel, verbal o email)?",
        kpi: "% procesos digitalizados",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 59,
        areaId: 'area_8_tecnologia',
        code: 'Q59',
        title: "¿Utiliza herramientas de IA (Claude, ChatGPT, Gemini)? ¿Para qué tareas?",
        guide: "Si ya implementa IA para automatizar presupuestos o procesos, describa alcance actual y resultados.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 60,
        areaId: 'area_8_tecnologia',
        code: 'Q60',
        title: "¿Cuáles son los principales dolores tecnológicos que enfrenta hoy?",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_9_proveedores',
    number: 9,
    name: 'Proveedores y Cadena de Valor',
    icon: 'Truck',
    pentagonAxis: 'Procesos',
    description: 'Abastecimiento, proveedores críticos sin alternativa, inventario y calce financiero cobro-pago.',
    imeWeight: 0.05,
    kpis: [
      {
            "name": "N° proveedores críticos",
            "unit": "N°"
      },
      {
            "name": "N° proveedores sin alternativa",
            "unit": "N°"
      },
      {
            "name": "Rotación de inventario",
            "unit": "Veces/año"
      },
      {
            "name": "DPO (días de pago a proveedores)",
            "unit": "Días"
      },
      {
            "name": "Brecha cobro-pago (calce financiero)",
            "unit": "Días"
      },
      {
            "name": "Costo de abastecimiento / facturación",
            "unit": "%"
      }
],
    questions: [
      {
        id: 61,
        areaId: 'area_9_proveedores',
        code: 'Q61',
        title: "¿Cuáles son sus 5 proveedores más críticos? ¿Qué pasaría si uno dejara de operar mañana?",
        guide: "Considere los insumos o servicios clave del negocio y las posibles sinergias internas.",
        kpi: "N° proveedores críticos sin alternativa",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 62,
        areaId: 'area_9_proveedores',
        code: 'Q62',
        title: "¿Tiene proveedores alternativos para los insumos más importantes? ¿Hay contratos o acuerdos formales?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 63,
        areaId: 'area_9_proveedores',
        code: 'Q63',
        title: "¿Cómo gestiona las compras? ¿Hay un responsable definido y un proceso de aprobación?",
        guide: "Describa el circuito de compra y aprobación y quién es el responsable.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 64,
        areaId: 'area_9_proveedores',
        code: 'Q64',
        title: "¿Tiene inventario/stock? ¿Cómo lo gestiona? ¿Conoce su rotación?",
        guide: "Si el control de stock es parte de la visión a futuro, ¿cómo funciona hoy?",
        kpi: "Rotación de inventario (veces/año)",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 65,
        areaId: 'area_9_proveedores',
        code: 'Q65',
        title: "¿Qué condiciones de pago negocia con proveedores (contado, 30, 60 días)? ¿Calzan con el plazo de cobro de sus clientes?",
        kpi: "DPO (días de pago) vs. plazo de cobro",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
  {
    id: 'area_10_contexto',
    number: 10,
    name: 'Contexto Externo (PESTEL) y Reflexión Final',
    icon: 'Globe',
    pentagonAxis: 'Directorio',
    description: 'Factores político-legales, económicos, sociales, tecnológicos, competencia y cierre reflexivo.',
    imeWeight: 0,
    kpis: [
      {
            "name": "N° regulaciones aplicables activas",
            "unit": "N°"
      },
      {
            "name": "Impacto de la inflación en costos",
            "unit": "%"
      },
      {
            "name": "Crecimiento estimado del mercado",
            "unit": "% anual"
      },
      {
            "name": "N° competidores directos identificados",
            "unit": "N°"
      },
      {
            "name": "Score de amenaza competitiva",
            "unit": "1-10"
      }
],
    questions: [
      {
        id: 66,
        areaId: 'area_10_contexto',
        code: 'Q66',
        title: "¿Qué regulaciones o normativas impactan directamente en el negocio?",
        guide: "Ej.: régimen de contrataciones, habilitaciones, seguridad e higiene / ART, registros sectoriales.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 67,
        areaId: 'area_10_contexto',
        code: 'Q67',
        title: "¿Hay algún cambio político o regulatorio que podría afectar a la empresa en los próximos 2 años?",
        guide: "Si el negocio es sensible a cambios de gobierno o regulación, evalúe cómo mitigar esa exposición diversificando.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 68,
        areaId: 'area_10_contexto',
        code: 'Q68',
        title: "¿Cómo afectan la inflación y el tipo de cambio al negocio? ¿Tiene mecanismos de cobertura (redeterminación de precios)?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 69,
        areaId: 'area_10_contexto',
        code: 'Q69',
        title: "¿Su sector está creciendo, estable o en declive? ¿Qué indicadores sigue para monitorearlo?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 70,
        areaId: 'area_10_contexto',
        code: 'Q70',
        title: "¿Hay tendencias sociales (sustentabilidad, eficiencia, nuevos hábitos) que estén afectando su mercado?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 71,
        areaId: 'area_10_contexto',
        code: 'Q71',
        title: "¿Existe alguna tecnología emergente que pueda disrumpir su sector en 3 años?",
        guide: "Ej.: IA aplicada a la gestión, automatización, nuevas plataformas o materiales.",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 72,
        areaId: 'area_10_contexto',
        code: 'Q72',
        title: "¿Quiénes son sus 3 principales competidores? ¿En qué se diferencia? ¿Qué hacen mejor que usted?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 73,
        areaId: 'area_10_contexto',
        code: 'Q73',
        title: "¿Está creciendo el mercado donde opera? ¿Qué oportunidades no exploradas ve hoy?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 74,
        areaId: 'area_10_contexto',
        code: 'Q74',
        title: "¿Cómo calificaría la intensidad competitiva de su sector?",
        options: SCALE_1_TO_5_OPTIONS
      },
      {
        id: 75,
        areaId: 'area_10_contexto',
        code: 'Q75',
        title: "¿Cuáles son los 3 mayores \"dolores\" que enfrenta la empresa HOY y que, si se resolvieran, cambiarían todo?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 76,
        areaId: 'area_10_contexto',
        code: 'Q76',
        title: "¿Cuál es el mayor freno o limitación que siente que le impide crecer más rápido?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 77,
        areaId: 'area_10_contexto',
        code: 'Q77',
        title: "¿Qué es lo que mejor hace la empresa? ¿Cuál es su \"superpoder\" que no debería perder bajo ninguna circunstancia?",
        options: STANDARD_CLOSED_OPTIONS
      },
      {
        id: 78,
        areaId: 'area_10_contexto',
        code: 'Q78',
        title: "¿Hay algo que no se preguntó y que considera importante que GS Consultora sepa sobre la empresa?",
        options: STANDARD_CLOSED_OPTIONS
      },
    ]
  },
];

export function getAllDiagnosticQuestions(): DiagnosticQuestion[] {
  return DIAGNOSTIC_AREAS.flatMap(area => area.questions);
}

export function getDiagnosticQuestionById(id: number): DiagnosticQuestion | undefined {
  return getAllDiagnosticQuestions().find(q => q.id === id);
}
