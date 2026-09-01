export interface DiagnosticQuestion {
  id: number;
  areaId: string;
  code: string;
  title: string;
  guide?: string;
  hasScale?: boolean;
  kpi?: string;
}

export interface DiagnosticArea {
  id: string;
  number: number;
  name: string;
  icon: string;
  description: string;
  questions: DiagnosticQuestion[];
  kpis: { name: string; unit: string; baseline?: string; target?: string }[];
}

export const DIAGNOSTIC_AREAS: DiagnosticArea[] = [
  {
    id: 'area_1_direccion',
    number: 1,
    name: 'Dirección y Estrategia',
    icon: 'Compass',
    description: 'Pensamiento estratégico, visión, toma de decisiones y separación entre el rol de dueño y el de operador.',
    kpis: [
      { name: '% tiempo semanal dedicado a estrategia', unit: '%' },
      { name: 'N° reuniones estratégicas por mes', unit: 'N°' },
      { name: 'N° objetivos formalizados con KPI', unit: 'N°' },
      { name: 'Score de alineación en la dirección', unit: '1-10' }
    ],
    questions: [
      { id: 1, areaId: 'area_1_direccion', code: '1.1', title: '¿Tiene la empresa una Visión y una Misión formalmente definidas y comunicadas al equipo?', guide: 'Transcribir si existen más allá del lema comercial.', kpi: 'Existencia de Visión/Misión documentada (Sí/No)' },
      { id: 2, areaId: 'area_1_direccion', code: '1.2', title: '¿Cuáles son los 3 objetivos estratégicos más importantes para los próximos 12 meses?', guide: 'Incluir números, plazos y responsables.', kpi: 'N° de objetivos formalizados con métricas' },
      { id: 3, areaId: 'area_1_direccion', code: '1.3', title: '¿Qué tan clara y compartida está la visión de largo plazo dentro de la dirección?', hasScale: true },
      { id: 4, areaId: 'area_1_direccion', code: '1.4', title: '¿Cuántas horas por semana dedica el/la titular a pensar y trabajar EN la empresa vs DENTRO de ella?', guide: 'Eje de la poda y separación de roles.', kpi: '% de tiempo en estrategia (meta: 30%+)' },
      { id: 5, areaId: 'area_1_direccion', code: '1.5', title: '¿Existen reuniones estratégicas periódicas (no operativas)? ¿Con qué frecuencia y agenda fija?' },
      { id: 6, areaId: 'area_1_direccion', code: '1.6', title: '¿En qué medida la urgencia operativa del día a día impide trabajar en la estrategia?', hasScale: true },
      { id: 7, areaId: 'area_1_direccion', code: '1.7', title: '¿Cómo se toman las decisiones importantes? ¿Quién decide sobre cada área?' },
      { id: 8, areaId: 'area_1_direccion', code: '1.8', title: '¿Existe un organigrama formal con roles y responsabilidades claras?' },
      { id: 9, areaId: 'area_1_direccion', code: '1.9', title: '¿Cuáles son los valores no negociables de la empresa? ¿Están documentados?' }
    ]
  },
  {
    id: 'area_2_finanzas',
    number: 2,
    name: 'Administración y Finanzas',
    icon: 'DollarSign',
    description: 'Salud financiera, flujo de caja, rentabilidad por proyecto y ordenamiento contable.',
    kpis: [
      { name: 'Facturación anual', unit: '$' },
      { name: 'Margen bruto', unit: '%' },
      { name: 'Margen neto', unit: '%' },
      { name: 'Costos fijos mensuales (estructura)', unit: '$' },
      { name: 'Punto de equilibrio', unit: '$/mes' },
      { name: 'Runway (reserva)', unit: 'Meses' },
      { name: 'Plazo promedio de cobro', unit: 'Días' },
      { name: 'Deuda total', unit: '$' }
    ],
    questions: [
      { id: 10, areaId: 'area_2_finanzas', code: '2.1', title: '¿Cuál fue la facturación de los últimos 12 meses? ¿Cómo evolucionó mes a mes? ¿Hay estacionalidad?', kpi: 'Facturación anual ($) y variabilidad' },
      { id: 11, areaId: 'area_2_finanzas', code: '2.2', title: '¿Cuáles son sus principales fuentes de ingreso y qué % representa cada una?' },
      { id: 12, areaId: 'area_2_finanzas', code: '2.3', title: '¿Conoce su margen bruto y neto? ¿Cómo los calcula por línea de negocio?', kpi: 'Margen bruto (%) y margen neto (%)' },
      { id: 13, areaId: 'area_2_finanzas', code: '2.4', title: '¿Tiene identificados sus costos fijos mensuales (estructura)? ¿Cuál es su punto de equilibrio?', kpi: 'Punto de equilibrio mensual ($)' },
      { id: 14, areaId: 'area_2_finanzas', code: '2.5', title: '¿Existen costos ocultos o ineficiencias conocidas (reprocesos, stock inmovilizado)?' },
      { id: 15, areaId: 'area_2_finanzas', code: '2.6', title: '¿Lleva registro de ingresos y egresos? ¿Con qué herramienta y frecuencia lo revisa?' },
      { id: 16, areaId: 'area_2_finanzas', code: '2.7', title: '¿Tiene proyección de flujo de caja a 3, 6 o 12 meses? ¿Cuántos meses de reserva tiene?', kpi: 'Runway (meses de reserva)' },
      { id: 17, areaId: 'area_2_finanzas', code: '2.8', title: '¿Están las finanzas de la empresa completamente separadas de las personales? ¿Hay cuenta bancaria empresarial?' },
      { id: 18, areaId: 'area_2_finanzas', code: '2.9', title: '¿Tiene deudas o compromisos financieros activos? Detalle monto, tasa y plazo.', kpi: 'Ratio deuda/patrimonio' },
      { id: 19, areaId: 'area_2_finanzas', code: '2.10', title: '¿Cómo calificaría la salud financiera actual de la empresa?', hasScale: true }
    ]
  },
  {
    id: 'area_3_operaciones',
    number: 3,
    name: 'Operaciones y Producción',
    icon: 'Settings',
    description: 'Capacidad operativa, procesos de ejecución, cuellos de botella y documentación.',
    kpis: [
      { name: 'N° de proyectos simultáneos (capacidad)', unit: 'N°' },
      { name: 'Utilización actual de capacidad', unit: '%' },
      { name: 'MVP operativo mensual', unit: '$' },
      { name: 'Tasa de reproceso', unit: '%' },
      { name: '% procesos documentados', unit: '%' },
      { name: '% trabajos entregados en fecha', unit: '%' }
    ],
    questions: [
      { id: 20, areaId: 'area_3_operaciones', code: '3.1', title: '¿Cuáles son sus procesos principales de punta a punta desde la oportunidad hasta el cierre?' },
      { id: 21, areaId: 'area_3_operaciones', code: '3.2', title: '¿Cuál es su capacidad máxima actual con la estructura de hoy?', kpi: 'N° de proyectos simultáneos y monto máximo gestionable' },
      { id: 22, areaId: 'area_3_operaciones', code: '3.3', title: '¿Cuál es el mínimo de facturación mensual (MVP operativo) para cubrir costos fijos?', kpi: 'MVP en $ mensuales' },
      { id: 23, areaId: 'area_3_operaciones', code: '3.4', title: '¿Qué porcentaje de trabajos requieren reproceso o corrección antes de la entrega?', kpi: 'Tasa de reproceso (%) y costo mensual' },
      { id: 24, areaId: 'area_3_operaciones', code: '3.5', title: '¿Tiene indicadores de calidad activos o certificaciones (ISO 9001)?' },
      { id: 25, areaId: 'area_3_operaciones', code: '3.6', title: '¿En qué medida los procesos operativos están documentados y estandarizados?', hasScale: true },
      { id: 26, areaId: 'area_3_operaciones', code: '3.7', title: '¿Cuáles son los 3 principales cuellos de botella de la operación?' },
      { id: 27, areaId: 'area_3_operaciones', code: '3.8', title: '¿Hay personas cuya ausencia detendría o comprometería seriamente la operación?' }
    ]
  },
  {
    id: 'area_4_rrhh',
    number: 4,
    name: 'Recursos Humanos',
    icon: 'Users',
    description: 'Equipo, roles, liderazgo, cultura, retención y desarrollo del capital humano.',
    kpis: [
      { name: 'N° empleados totales', unit: 'N°' },
      { name: 'N° mandos medios con rol definido', unit: 'N°' },
      { name: 'Tasa de rotación anual', unit: '%' },
      { name: 'Horas de capacitación/persona/año', unit: 'Horas' },
      { name: 'Tiempo de onboarding', unit: 'Días' },
      { name: 'Score de clima laboral', unit: '1-10' }
    ],
    questions: [
      { id: 28, areaId: 'area_4_rrhh', code: '4.1', title: '¿Cuántas personas integran la empresa por área (dirección, planta permanente, variables)?', kpi: 'N° empleados totales' },
      { id: 29, areaId: 'area_4_rrhh', code: '4.2', title: '¿Cada persona tiene rol y responsabilidades definidos por escrito?', kpi: '% roles con descripción formalizada' },
      { id: 30, areaId: 'area_4_rrhh', code: '4.3', title: '¿Tiene mandos medios o líderes de área capacitados para gestionar de forma autónoma?' },
      { id: 31, areaId: 'area_4_rrhh', code: '4.4', title: '¿Cuánto tarda un nuevo integrante en ser productivo? ¿Existe inducción estructurada?', kpi: 'Tiempo de onboarding (días)' },
      { id: 32, areaId: 'area_4_rrhh', code: '4.5', title: '¿Cuántas horas de capacitación formal recibe cada persona por año?', kpi: 'Horas de capacitación/persona/año' },
      { id: 33, areaId: 'area_4_rrhh', code: '4.6', title: '¿Cómo calificaría el clima laboral actual?', hasScale: true },
      { id: 34, areaId: 'area_4_rrhh', code: '4.7', title: '¿Cuántas personas dejaron la empresa en los últimos 12 meses y por qué?', kpi: 'Tasa de rotación anual (%)' },
      { id: 35, areaId: 'area_4_rrhh', code: '4.8', title: '¿Qué hace la empresa para retener y motivar al talento clave?' }
    ]
  },
  {
    id: 'area_5_comercial',
    number: 5,
    name: 'Comercial y Marketing',
    icon: 'TrendingUp',
    description: 'Estrategia de ventas, propuesta de valor, canales y presencia de marca.',
    kpis: [
      { name: 'N° cotizaciones/mes', unit: 'N°' },
      { name: 'Tasa de conversión', unit: '%' },
      { name: 'Ticket promedio por venta', unit: '$' },
      { name: 'Ciclo de venta promedio', unit: 'Días' },
      { name: 'Inversión mensual en marketing', unit: '$' }
    ],
    questions: [
      { id: 36, areaId: 'area_5_comercial', code: '5.1', title: '¿Por qué los clientes eligen a la empresa y no a la competencia? ¿Cuál es la propuesta de valor?' },
      { id: 37, areaId: 'area_5_comercial', code: '5.2', title: '¿En qué segmento está mejor posicionado hoy y en cuál quiere estar en 3 años?' },
      { id: 38, areaId: 'area_5_comercial', code: '5.3', title: '¿Cómo consigue nuevos clientes hoy? Describa el proceso desde el primer contacto hasta el cierre.' },
      { id: 39, areaId: 'area_5_comercial', code: '5.4', title: '¿Cuántas cotizaciones envía por mes y cuántas se convierten en venta?', kpi: 'Tasa de conversión cotización→adjudicación (%)' },
      { id: 40, areaId: 'area_5_comercial', code: '5.5', title: '¿Cuánto tarda en promedio desde el primer contacto hasta el cierre?', kpi: 'Ciclo de venta promedio (días)' },
      { id: 41, areaId: 'area_5_comercial', code: '5.6', title: '¿Su web y canales digitales están activos y generan consultas/leads?' },
      { id: 42, areaId: 'area_5_comercial', code: '5.7', title: '¿Tiene una estrategia de marketing definida? ¿Cuánto invierte por mes?', kpi: 'Inversión en marketing ($ y %)' },
      { id: 43, areaId: 'area_5_comercial', code: '5.8', title: '¿Qué tan activa y estructurada es su estrategia comercial hoy?', hasScale: true }
    ]
  },
  {
    id: 'area_6_clientes',
    number: 6,
    name: 'Clientes y Experiencia',
    icon: 'Smile',
    description: 'Cartera de clientes, satisfacción, fidelización y riesgo de concentración.',
    kpis: [
      { name: 'N° clientes activos', unit: 'N°' },
      { name: '% facturación top 1 cliente', unit: '%' },
      { name: 'Tasa de retención anual', unit: '%' },
      { name: 'NPS', unit: 'Score' },
      { name: 'N° reclamos/mes', unit: 'N°' }
    ],
    questions: [
      { id: 44, areaId: 'area_6_clientes', code: '6.1', title: '¿Quiénes son sus principales clientes y qué % de la facturación representa cada uno?', kpi: '% facturación del top 1 cliente (riesgo si >40%)' },
      { id: 45, areaId: 'area_6_clientes', code: '6.2', title: '¿Qué % de clientes realiza trabajos repetidos? ¿Cuánto dura la relación?', kpi: 'Tasa de retención (%)' },
      { id: 46, areaId: 'area_6_clientes', code: '6.3', title: '¿Mide la satisfacción de sus clientes? ¿Recibe feedback sistemático (NPS)?', kpi: 'NPS' },
      { id: 47, areaId: 'area_6_clientes', code: '6.4', title: '¿Cuántos reclamos formales recibe por mes y en cuánto tiempo resuelve?', kpi: 'N° reclamos/mes' },
      { id: 48, areaId: 'area_6_clientes', code: '6.5', title: '¿Qué hace la empresa después de entregar un trabajo para fidelizar al cliente?' }
    ]
  },
  {
    id: 'area_7_procesos',
    number: 7,
    name: 'Procesos y Sistemas de Gestión',
    icon: 'Layers',
    description: 'Documentación, estandarización, calidad y madurez de los procesos internos bajo ISO 9001.',
    kpis: [
      { name: 'N° procedimientos activos', unit: 'N°' },
      { name: '% procesos documentados', unit: '%' },
      { name: 'Nivel de madurez ISO', unit: '1-5' }
    ],
    questions: [
      { id: 49, areaId: 'area_7_procesos', code: '7.1', title: '¿Cuántos procedimientos o instructivos escritos tiene hoy? ¿Qué procesos críticos NO están documentados?' },
      { id: 50, areaId: 'area_7_procesos', code: '7.2', title: '¿Existe un manual de operaciones, calidad o procedimientos actualizado?' },
      { id: 51, areaId: 'area_7_procesos', code: '7.3', title: '¿Cómo asegura que todo el equipo trabaje de la misma manera? ¿Usa checklists?' },
      { id: 52, areaId: 'area_7_procesos', code: '7.4', title: '¿Tiene alguna certificación de calidad (ISO 9001 u otra) vigente?' },
      { id: 53, areaId: 'area_7_procesos', code: '7.5', title: '¿Cómo calificaría el nivel de madurez de sus sistemas de gestión?', hasScale: true }
    ]
  },
  {
    id: 'area_8_tecnologia',
    number: 8,
    name: 'Tecnología e Innovación',
    icon: 'Cpu',
    description: 'Digitalización, herramientas ERP/CRM, automatización y seguridad de datos.',
    kpis: [
      { name: 'N° herramientas de software integradas', unit: 'N°' },
      { name: '% procesos digitalizados', unit: '%' }
    ],
    questions: [
      { id: 54, areaId: 'area_8_tecnologia', code: '8.1', title: '¿Qué herramientas de software utiliza para gestionar la empresa (ERP, CRM, gestión de proyectos)?' },
      { id: 55, areaId: 'area_8_tecnologia', code: '8.2', title: '¿Están las herramientas integradas entre sí o la información vive fragmentada?' },
      { id: 56, areaId: 'area_8_tecnologia', code: '8.3', title: '¿Cómo realiza copias de seguridad de la información crítica de la empresa?' },
      { id: 57, areaId: 'area_8_tecnologia', code: '8.4', title: '¿Utiliza herramientas de inteligencia artificial o automatizaciones para acelerar tareas?', hasScale: true }
    ]
  },
  {
    id: 'area_9_gobernanza',
    number: 9,
    name: 'Gobernanza y Directorio',
    icon: 'Briefcase',
    description: 'Protocolo de socios, reuniones de directorio, acuerdos de convivencia y sucesión.',
    kpis: [
      { name: 'Estatuto de socios firmado (S/N)', unit: 'S/N' },
      { name: 'Frecuencia de reuniones de directorio', unit: 'Meses' },
      { name: '% acuerdos documentados en actas', unit: '%' }
    ],
    questions: [
      { id: 58, areaId: 'area_9_gobernanza', code: '9.1', title: '¿Existe un Estatuto de Convivencia o Protocolo de Socios firmado por escrito?' },
      { id: 59, areaId: 'area_9_gobernanza', code: '9.2', title: '¿Cómo se resuelven los desacuerdos o empates en las votaciones entre socios?' },
      { id: 60, areaId: 'area_9_gobernanza', code: '9.3', title: '¿Existe una política formal para el ingreso de familiares a la empresa?' },
      { id: 61, areaId: 'area_9_gobernanza', code: '9.4', title: '¿Se realizan reuniones de Directorio mensuales con acta y orden del día?', hasScale: true },
      { id: 62, areaId: 'area_9_gobernanza', code: '9.5', title: '¿Existe un plan de sucesión formalizado ante el retiro o ausencia de un socio fundador?' }
    ]
  },
  {
    id: 'area_10_riesgo',
    number: 10,
    name: 'Continuidad y Riesgo Empresario',
    icon: 'ShieldAlert',
    description: 'Matriz IRE, contingencias operativas, financieras y de mercado.',
    kpis: [
      { name: 'Índice de Riesgo Empresario (IRE)', unit: '0-100' },
      { name: 'N° riesgos en nivel extremo/alto', unit: 'N°' }
    ],
    questions: [
      { id: 63, areaId: 'area_10_riesgo', code: '10.1', title: '¿Tiene la empresa un registro formal de riesgos organizacionales (Matriz IRE)?' },
      { id: 64, areaId: 'area_10_riesgo', code: '10.2', title: '¿Cuáles son los principales riesgos que amenazan la continuidad de la empresa en los próximos 24 meses?' },
      { id: 65, areaId: 'area_10_riesgo', code: '10.3', title: '¿Existen planes de contingencia documentados ante la pérdida de un cliente principal o falla operativa clave?' },
      { id: 66, areaId: 'area_10_riesgo', code: '10.4', title: '¿Cómo calificaría la capacidad de la empresa para absorber un shock económico externo?', hasScale: true }
    ]
  }
];
