export interface GSAxisStrategicMeta {
  axisId: number;
  code: string;
  shortName: string;
  fullName: string;
  weight: number;
  baselineScore: number;
  targetScore: number;
  brechaAsociada: string;
  iniciativaEstrategica: string;
  okrText: string;
  criterioAvance: string;
  projectedCurve: {
    lb: number;
    m1: number;
    m2: number;
    m3: number;
    m4: number;
    m5: number;
    m6: number;
    m7: number;
    m8: number;
    meta: number;
  };
}

export interface OMVTargetRow {
  id: string;
  indicator: string;
  unit: string;
  currentValue: string;
  target3Years: string;
}

export interface IREDimensionDefinition {
  code: string;
  name: string;
  description: string;
  weight: number; // 0..1 (sums to 1.0)
  defaultProb: number; // 1..5
  defaultImp: number; // 1..5
  defaultMitigation: string;
}

export const DEFAULT_OMV_TARGETS: OMVTargetRow[] = [
  { id: 't1', indicator: 'Facturación anual', unit: 'USD / Moneda', currentValue: 'USD 1.1M', target3Years: 'USD 2.5M+' },
  { id: 't2', indicator: 'Margen neto', unit: '%', currentValue: '10% – 14% (sin conciliar)', target3Years: '≥ 18% conciliado contra balance' },
  { id: 't3', indicator: 'N° de personas (dotación total)', unit: 'Personas', currentValue: '18 colaboradores', target3Years: '36 – 44 colaboradores' },
  { id: 't4', indicator: 'N° de proyectos/contratos activos simultáneos', unit: 'N°', currentValue: '6 – 8 (al límite operativo)', target3Years: '12 – 15 planificados con PMO' },
  { id: 't5', indicator: 'Mix de mercados / líneas de negocio', unit: '% cada uno', currentValue: '80% línea principal / 20% servicios', target3Years: '55% proyectos / 25% nueva unidad / 20% recurrentes' },
  { id: 't6', indicator: 'Capacidad o fondo de reserva objetivo', unit: 'USD / Meses', currentValue: 'Sin reserva segregada', target3Years: 'Fondo de reserva ≥ 3 meses de estructura fija' },
  { id: 't7', indicator: 'Rol del titular (dueño operando vs. dirigiendo)', unit: 'Descripción', currentValue: '< 5% tiempo estratégico (95% operativo)', target3Years: '≥ 30%–50% dirección estratégica y alianzas; 0% micro-operación' },
  { id: 't8', indicator: 'Principal ventaja competitiva', unit: 'Descripción', currentValue: 'Soluciones llave en mano basadas en los fundadores', target3Years: 'Sistema de gestión trazable (ISO/PMO) + sucursal autosustentable' },
];

export const OFFICIAL_IRE_12_DIMENSIONS: IREDimensionDefinition[] = [
  {
    code: 'R1',
    name: 'Dependencia del dueño',
    description: 'Grado en que la dirección técnica, comercial y de decisión recae en el/la titular. Objetivo: que dependa de sistemas, no del dueño.',
    weight: 0.15,
    defaultProb: 4,
    defaultImp: 5,
    defaultMitigation: 'Separar Directorio de Gerencia Operativa y delegar en mandos medios (MPE Eje 1 y 4).',
  },
  {
    code: 'R2',
    name: 'Estructura societaria / patrimonial',
    description: 'Riesgo por reglas societarias informales, acuerdos no firmados o patrimonio expuesto.',
    weight: 0.10,
    defaultProb: 3,
    defaultImp: 5,
    defaultMitigation: 'Redactar y firmar Estatuto de Convivencia / Protocolo de Socios y política de retiros (MPE Eje 1).',
  },
  {
    code: 'R3',
    name: 'Financiero y de liquidez',
    description: 'Capital de trabajo, demora de cobro, inflación y calce entre cobros y pagos.',
    weight: 0.15,
    defaultProb: 5,
    defaultImp: 4,
    defaultMitigation: 'Flujo de caja único proyectado a 3/6/12 meses y fondo de reserva segregado (MPE Eje 3).',
  },
  {
    code: 'R4',
    name: 'Concentración de clientes / mercado',
    description: 'Dependencia excesiva de un cliente principal o una sola línea de producto.',
    weight: 0.12,
    defaultProb: 4,
    defaultImp: 4,
    defaultMitigation: 'Diversificación ordenada hacia nueva unidad de negocio y contratos recurrentes (MPE Eje 5).',
  },
  {
    code: 'R5',
    name: 'Operativo y conocimiento clave',
    description: 'Concentración del saber-hacer en pocas personas y bajo nivel de procesos documentados.',
    weight: 0.10,
    defaultProb: 4,
    defaultImp: 4,
    defaultMitigation: 'Documentar procesos críticos, manual de operaciones y checklists estandarizados (MPE Eje 2).',
  },
  {
    code: 'R6',
    name: 'Comercial / pipeline',
    description: 'Regularidad del flujo comercial, baja visibilidad de conversión y falta de segmentación.',
    weight: 0.08,
    defaultProb: 4,
    defaultImp: 3,
    defaultMitigation: 'Segmentar embudo CRM, medir tasa de conversión y formalizar política comercial (MPE Eje 5).',
  },
  {
    code: 'R7',
    name: 'Cadena de valor / abastecimiento',
    description: 'Proveedores críticos sin alternativa, compras sin proceso formal y stock sin rotación medida.',
    weight: 0.06,
    defaultProb: 4,
    defaultImp: 4,
    defaultMitigation: 'Formalizar responsable de compras, trazabilidad de pedidos y control de stock al 100% (MPE Eje 2).',
  },
  {
    code: 'R8',
    name: 'Regulatorio y de cumplimiento',
    description: 'Habilitaciones, normativa sectorial, seguridad e higiene / ART y certificaciones.',
    weight: 0.07,
    defaultProb: 3,
    defaultImp: 3,
    defaultMitigation: 'Vigilancia normativa en Directorio y roadmap planificado de habilitaciones/ISO.',
  },
  {
    code: 'R9',
    name: 'Procesos y calidad',
    description: 'Reprocesos, plazos y satisfacción sin medir formalmente; ausencia de registro de no conformidades.',
    weight: 0.07,
    defaultProb: 4,
    defaultImp: 3,
    defaultMitigation: 'Implementar indicadores de reprocesos, control cotizado vs. ejecutado y NPS post-entrega (MPE Eje 2).',
  },
  {
    code: 'R10',
    name: 'Tecnológico y continuidad',
    description: 'Sistemas en islas con doble carga, sin backup formal ni política de resguardo de información.',
    weight: 0.04,
    defaultProb: 3,
    defaultImp: 4,
    defaultMitigation: 'Integración hacia fuente única de verdad, backup verificado y canales corporativos (MPE Eje 2).',
  },
  {
    code: 'R11',
    name: 'Reputacional / marca',
    description: 'Riesgo de sobrecompromiso de plazos ante clientes o falta de posicionamiento corporativo.',
    weight: 0.03,
    defaultProb: 3,
    defaultImp: 3,
    defaultMitigation: 'Regla de aceptación de trabajos según capacidad real en cronograma maestro (MPE Eje 2).',
  },
  {
    code: 'R12',
    name: 'Contexto macro (PESTEL)',
    description: 'Inflación, tipo de cambio, aranceles de importación y ciclo económico del sector.',
    weight: 0.03,
    defaultProb: 4,
    defaultImp: 4,
    defaultMitigation: 'Incorporar costo financiero y cobertura cambiaria al pricing y cláusulas de ajuste (MPE Eje 3).',
  },
];

export const OFFICIAL_IME_9_AREA_WEIGHTS: { areaNumber: number; name: string; weight: number }[] = [
  { areaNumber: 1, name: '1. Dirección y Estrategia', weight: 0.15 },
  { areaNumber: 2, name: '2. Administración y Finanzas', weight: 0.15 },
  { areaNumber: 3, name: '3. Operaciones y Producción', weight: 0.15 },
  { areaNumber: 4, name: '4. Recursos Humanos', weight: 0.10 },
  { areaNumber: 5, name: '5. Comercial y Marketing', weight: 0.15 },
  { areaNumber: 6, name: '6. Clientes y Experiencia', weight: 0.10 },
  { areaNumber: 7, name: '7. Procesos y Gestión', weight: 0.10 },
  { areaNumber: 8, name: '8. Tecnología y Sistemas', weight: 0.05 },
  { areaNumber: 9, name: '9. Proveedores y Cadena de Valor', weight: 0.05 },
];

export const LIKERT_1_TO_5_QUESTION_IDS: Record<number, string[]> = {
  3: ['Nada clara', 'Poco clara', 'Moderada', 'Bastante clara', 'Totalmente clara y compartida'],
  6: ['Nunca', 'Rara vez', 'A veces', 'Frecuentemente', 'Siempre me consume'],
  19: ['Muy crítica', 'Ajustada', 'Estable', 'Sólida', 'Excelente'],
  25: ['Nada documentado', 'Muy poco', 'Parcialmente', 'Mayormente', 'Completo y actualizado'],
  33: ['Muy malo', 'Regular', 'Aceptable', 'Bueno', 'Excelente'],
  43: ['Completamente reactiva', 'Poco activa', 'Moderada', 'Bastante activa', 'Muy estructurada y proactiva'],
  53: ['Informal/caótico', 'Incipiente', 'En desarrollo', 'Gestionado', 'Optimizado'],
  74: ['Muy baja', 'Baja', 'Moderada', 'Alta', 'Muy alta / agresiva'],
};

export const DEFAULT_GS_AXES_META: GSAxisStrategicMeta[] = [
  {
    axisId: 1,
    code: 'E1',
    shortName: 'Gobernanza',
    fullName: 'EJE 1 — Gobernanza y Conducción Estratégica',
    weight: 0.15,
    baselineScore: 5.0,
    targetScore: 8.5,
    brechaAsociada:
      'Gobierno informal: las decisiones se toman por consenso de varios socios, sin Gerente General ni reglas formales de votación, y el rumbo se dispersa entre iniciativas simultáneas. No existe Estatuto de Convivencia ni protocolo de directorio firmado. El tiempo estratégico de los socios es <5% (meta CVA: 30%+); las reuniones mezclan lo operativo con lo estratégico. Sin organigrama formal con responsables por área.',
    iniciativaEstrategica:
      'Institucionalizar el gobierno societario y la conducción estratégica (OE1): formalizar el Estatuto de Convivencia / Protocolo de Directorio, instituir una cadencia mensual de Directorio con agenda separada de lo operativo, formalizar Visión, Misión y OMV institucional como brújula de decisión y separar progresivamente el rol de dueño del rol de operador.',
    okrText:
      'Objetivo: conducción colegiada institucionalizada, que decide con reglas y libera tiempo estratégico.\n• KR1: Estatuto de Convivencia / Protocolo de Directorio firmado para Feb 2027.\n• KR2: Reunión de Directorio mensual con agenda fija sostenida ≥6 meses para May 2027.\n• KR3: Visión, Misión y OMV institucional formalizados y comunicados para Dic 2026.\n• KR4: Tablero de control del Directorio (≤10 KPIs) operativo para Jun 2027.\n• KR5: Tiempo estratégico de los socios ≥30% (línea base <5%) para Dic 2028.',
    criterioAvance:
      'Estatuto y cadencia de Directorio en 6 meses (tareas duras); el cambio de hábito operativo→estratégico madura hacia 2028.',
    projectedCurve: { lb: 5.0, m1: 5.5, m2: 6.0, m3: 6.5, m4: 7.0, m5: 7.2, m6: 7.5, m7: 7.7, m8: 8.0, meta: 8.5 },
  },
  {
    axisId: 2,
    code: 'E2',
    shortName: 'Procesos',
    fullName: 'EJE 2 — Procesos y Operaciones',
    weight: 0.35,
    baselineScore: 3.7,
    targetScore: 8.0,
    brechaAsociada:
      'Eje más crítico del diagnóstico (IME Operaciones 30/100 · IRE 78/100 Alto). La operación trabaja al ~100% de capacidad sin cronograma maestro: programación semanal reactiva y sobrecompromiso. Fracción mínima de procesos documentada; calidad no procedimentada (reprocesos y plazos sin medir). Compras sin responsable formal y sistemas en islas sin backup formal.',
    iniciativaEstrategica:
      'Estandarizar y planificar la operación como sistema: instituir planificación maestra de trabajos y capacidad, documentar procesos críticos con checklists, crear control de calidad y gestión (cotizado vs. ejecutado), formalizar compras e inventario y ordenar la arquitectura digital hacia una fuente única de verdad con backup verificado.',
    okrText:
      'Objetivo: operación planificada, documentada y medida, capaz de escalar con calidad.\n• KR1: Cronograma maestro de trabajos y capacidad actualizado semanalmente para Nov 2026.\n• KR2: 100% de procesos críticos documentados con checklists para Ago 2027.\n• KR3: Indicadores de reprocesos, plazos y satisfacción reportados al Directorio para Feb 2027.\n• KR4: Control de stock de almacén al 100% con rotación y DPO para Feb 2027.\n• KR5: Control de gestión (cotizado vs. ejecutado) operativo para May 2027.\n• KR6: Sistemas integrados y backup formal verificado para Ago 2027.',
    criterioAvance:
      'Eje más crítico: arranca primero. Cronograma maestro y compras rápidos; documentación y cultura de calidad son progresivas.',
    projectedCurve: { lb: 3.7, m1: 4.5, m2: 5.2, m3: 5.8, m4: 6.2, m5: 6.6, m6: 7.0, m7: 7.3, m8: 7.5, meta: 8.0 },
  },
  {
    axisId: 3,
    code: 'E3',
    shortName: 'Finanzas',
    fullName: 'EJE 3 — Finanzas y Control de Gestión',
    weight: 0.15,
    baselineScore: 4.0,
    targetScore: 8.5,
    brechaAsociada:
      'Gestión financiera artesanal para el volumen actual (IME 40/100 · IRE 70/100 Alto). Ingresos y egresos en planillas separadas sin flujo de caja único proyectado ni cronograma de vencimientos. Sin fondo de reserva segregado ni política de retiros justificada por balance. Costo financiero y riesgo cambiario no trasladados al pricing; márgenes de gestión sin conciliar contra balance.',
    iniciativaEstrategica:
      'Profesionalizar la función financiera como sistema de anticipación: consolidar flujo de caja único proyectado a 3/6/12 meses, constituir fondo de reserva votado por Directorio, cuantificar costos ocultos e incorporar costo financiero/cambiario al pricing, implementar cierre de proyecto (real vs. presupuestado) y conciliar márgenes contra balance.',
    okrText:
      'Objetivo: rentabilidad y liquidez como variables gestionadas, no como sorpresas.\n• KR1: Flujo de caja único operativo para Oct 2026.\n• KR2: Proyección de flujo a 3/6/12 meses con runway medido para Feb 2027.\n• KR3: Fondo de reserva constituido y segregado de la operación para May 2027.\n• KR4: Costo financiero y riesgo cambiario incorporados al pricing para May 2027.\n• KR5: Cierre de proyecto real vs. presupuestado en el 100% de proyectos para Ago 2027.\n• KR6: Márgenes de gestión conciliados contra balance trimestralmente para Feb 2028.',
    criterioAvance:
      'Flujo único, fondo de reserva y cierre de proyecto en el primer año; conciliación contra balance consolida en 2028.',
    projectedCurve: { lb: 4.0, m1: 5.0, m2: 6.0, m3: 6.5, m4: 7.0, m5: 7.2, m6: 7.5, m7: 7.7, m8: 8.0, meta: 8.5 },
  },
  {
    axisId: 4,
    code: 'E4',
    shortName: 'Talento',
    fullName: 'EJE 4 — Talento y Estructura Organizacional',
    weight: 0.10,
    baselineScore: 6.0,
    targetScore: 8.0,
    brechaAsociada:
      'Crecimiento acelerado con informalidad estructural: sólo una fracción de roles tiene descripción de puesto formalizada y no hay organigrama formal comunicado. Inducción estructurada discontinuada; sin evaluación de desempeño formal, ni plan anual de capacitación con presupuesto, ni medición sistemática de rotación y clima.',
    iniciativaEstrategica:
      'Profesionalizar la gestión del capital humano y la estructura: formalizar el organigrama por procesos y áreas, completar el 100% de descripciones de puesto, estructurar inducción, evaluación de desempeño y capacitación anual, y diseñar propuesta de valor al empleado y plan de carrera para retener talento clave.',
    okrText:
      'Objetivo: estructura formal y equipo autónomo, con talento clave retenido.\n• KR1: Organigrama formal con responsables por área comunicado para Dic 2026.\n• KR2: 100% de los roles con descripción de puesto formalizada para Ago 2027.\n• KR3: Inducción estructurada aplicada a todo ingreso desde May 2027.\n• KR4: Primer ciclo de evaluación de desempeño completado para Dic 2027.\n• KR5: Plan anual de capacitación con horas y presupuesto vigente desde Ene 2028.\n• KR6: Rotación y clima medidos sistemáticamente y propuesta de valor activa para May 2028.',
    criterioAvance:
      'Eje blando: inducción, desempeño y carrera maduran progresivamente. Parte de la base más alta del diagnóstico.',
    projectedCurve: { lb: 6.0, m1: 6.2, m2: 6.4, m3: 6.6, m4: 6.8, m5: 7.0, m6: 7.2, m7: 7.4, m8: 7.6, meta: 8.0 },
  },
  {
    axisId: 5,
    code: 'E5',
    shortName: 'Comercial',
    fullName: 'EJE 5 — Comercial y Diversificación',
    weight: 0.25,
    baselineScore: 5.5,
    targetScore: 8.0,
    brechaAsociada:
      'Buena reputación y propuesta llave en mano, pero baja conversión (~12%) sin visibilidad de dónde se pierde. Embudo sin segmentar, sin atribución de leads ni ROI de marketing. Política comercial no formalizada (falta foco entre clientes corporativos y chicos) y alta concentración en la línea y cliente principal.',
    iniciativaEstrategica:
      'Formalizar la política comercial y diversificar ingresos ordenadamente: segmentar el embudo y priorizar el segmento objetivo, medir conversión y ROI comercial, desarrollar una nueva unidad de negocio entrando por servicios de bajo riesgo y consolidar la nueva sucursal como unidad autosustentable.',
    okrText:
      'Objetivo: motor comercial medido y cartera diversificada, reduciendo concentración.\n• KR1: Política comercial formalizada con criterios de segmentación y foco para May 2027.\n• KR2: Embudo segmentado en CRM con conversión medida por segmento para Ago 2027.\n• KR3: Tablero mensual de atribución de leads y ROI/CAC comercial para Ago 2027.\n• KR4: Nueva unidad de negocio operativa con primeros contratos para May 2028.\n• KR5: Nueva sucursal con estructura y resultado autosustentable para Dic 2028.\n• KR6: Reducción de dependencia de la línea principal para Dic 2029.',
    criterioAvance:
      'Política comercial y CRM en 2027; nuevas unidades de negocio y sucursal traccionan 2028–2029.',
    projectedCurve: { lb: 5.5, m1: 5.6, m2: 5.8, m3: 6.2, m4: 6.6, m5: 7.0, m6: 7.3, m7: 7.5, m8: 7.7, meta: 8.0 },
  },
];

