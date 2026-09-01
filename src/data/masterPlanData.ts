export interface MasterPlanTaskItem {
  id: string;
  axis: number;
  axisName: string;
  code: string;
  title: string;
  description?: string;
  priority: 'Alta' | 'Media' | 'Baja';
  startDate: string;
  dueDate: string;
  status: 'sin_iniciar' | 'en_proceso' | 'finalizado' | 'bloqueado';
  assignedRole: string;
  progress: number;
}

export const MASTER_PLAN_AXES = [
  { id: 1, name: 'Eje 1: Gobernanza y Conducción Estratégica', color: 'indigo' },
  { id: 2, name: 'Eje 2: Procesos y Operaciones', color: 'blue' },
  { id: 3, name: 'Eje 3: Finanzas y Control de Gestión', color: 'emerald' },
  { id: 4, name: 'Eje 4: Talento y Estructura Organizacional', color: 'amber' },
  { id: 5, name: 'Eje 5: Comercial y Expansión de Negocio', color: 'purple' },
];

export const INITIAL_MASTER_PLAN_TASKS: Omit<MasterPlanTaskItem, 'id'>[] = [
  {
    axis: 1,
    axisName: 'Gobernanza y Conducción Estratégica',
    code: '1.1',
    title: 'Formalización del Estatuto de Convivencia y Protocolo de Directorio',
    description: 'Consolidar régimen de votación, distribución de utilidades, ingreso de familiares y sucesión societaria.',
    priority: 'Alta',
    startDate: '2026-08-01',
    dueDate: '2026-10-31',
    status: 'en_proceso',
    assignedRole: 'Directorio / Asesor Legal',
    progress: 40
  },
  {
    axis: 1,
    axisName: 'Gobernanza y Conducción Estratégica',
    code: '1.2',
    title: 'Institucionalización de la Reunión Mensual de Directorio',
    description: 'Cadencia mensual con orden del día formal, análisis de desvíos y actas de directorio.',
    priority: 'Alta',
    startDate: '2026-08-15',
    dueDate: '2026-11-30',
    status: 'sin_iniciar',
    assignedRole: 'Socios Fundadores',
    progress: 0
  },
  {
    axis: 2,
    axisName: 'Procesos y Operaciones',
    code: '2.1',
    title: 'Mapeo de Procesos Principales bajo ISO 9001',
    description: 'Construir organigrama de procesos (no de personas) identificando Comercial, Proyectos, Servicios y Soporte.',
    priority: 'Alta',
    startDate: '2026-08-20',
    dueDate: '2026-10-15',
    status: 'en_proceso',
    assignedRole: 'Operaciones / Oficina Técnica',
    progress: 50
  },
  {
    axis: 2,
    axisName: 'Procesos y Operaciones',
    code: '2.2',
    title: 'Unificación del Eje de Abastecimiento (Compras, Logística y Almacén)',
    description: 'Garantizar trazabilidad total de órdenes de compra y separar función de compra de la de pago.',
    priority: 'Media',
    startDate: '2026-09-01',
    dueDate: '2026-12-15',
    status: 'sin_iniciar',
    assignedRole: 'Responsable de Compras',
    progress: 0
  },
  {
    axis: 3,
    axisName: 'Finanzas y Control de Gestión',
    code: '3.1',
    title: 'Implementación del Tablero de Flujo de Caja y Runway Proyectado',
    description: 'Proyección a 6 meses con control de cobranzas y punto de equilibrio mensual.',
    priority: 'Alta',
    startDate: '2026-08-10',
    dueDate: '2026-10-30',
    status: 'en_proceso',
    assignedRole: 'Administración y Finanzas',
    progress: 60
  },
  {
    axis: 4,
    axisName: 'Talento y Estructura Organizacional',
    code: '4.1',
    title: 'Definición de Perfiles de Puesto y Medianera Conceptual de Roles',
    description: 'Diseñar organigrama de puestos objetivo y evaluar brechas de competencia.',
    priority: 'Media',
    startDate: '2026-09-15',
    dueDate: '2026-12-30',
    status: 'sin_iniciar',
    assignedRole: 'RRHH / Consultoría GS',
    progress: 10
  },
  {
    axis: 5,
    axisName: 'Comercial y Expansión de Negocio',
    code: '5.1',
    title: 'Formalización del Proceso Comercial y Canal Único de Postventa',
    description: 'Definición de ciclo de venta, cálculo de CAC/LTV y segmentación de embudo CRM.',
    priority: 'Alta',
    startDate: '2026-08-25',
    dueDate: '2026-11-15',
    status: 'en_proceso',
    assignedRole: 'Líder Comercial',
    progress: 30
  }
];

export interface PentagonPeriod {
  label: string;
  measurementDate: string;
  gobernanza: number;
  procesos: number;
  finanzas: number;
  talento: number;
  comercial: number;
  imeActual: number;
  isBaseline?: boolean;
  isMeta?: boolean;
}

export const INITIAL_PENTAGON_DATA: PentagonPeriod[] = [
  {
    label: 'Línea Base (Ago 2026)',
    measurementDate: '2026-08-06',
    gobernanza: 5.0,
    procesos: 3.7,
    finanzas: 4.0,
    talento: 6.0,
    comercial: 5.5,
    imeActual: 4.84,
    isBaseline: true
  },
  {
    label: 'Medición 1 (Nov 2026)',
    measurementDate: '2026-11-06',
    gobernanza: 5.8,
    procesos: 4.5,
    finanzas: 5.0,
    talento: 6.2,
    comercial: 6.0,
    imeActual: 5.50
  },
  {
    label: 'Meta Trienal (Dic 2029)',
    measurementDate: '2029-12-31',
    gobernanza: 8.5,
    procesos: 8.0,
    finanzas: 8.5,
    talento: 8.0,
    comercial: 8.0,
    imeActual: 8.20,
    isMeta: true
  }
];

export interface RiskItem {
  id: string;
  code: string;
  category: string;
  riskName: string;
  cause: string;
  consequence: string;
  probInherent: number;
  impInherent: number;
  levelInherent: number;
  strategy: 'Mitigar' | 'Evitar' | 'Transferir' | 'Aceptar';
  mitigationActions: string;
  responsibleRole: string;
  probResidual: number;
  impResidual: number;
  levelResidual: number;
  earlyWarningKpi: string;
}

export const INITIAL_RISKS: RiskItem[] = [
  {
    id: 'r1',
    code: 'R-01',
    category: 'A. Estratégico / Gobierno',
    riskName: 'Conflicto societario por gobierno informal sin Estatuto firmado',
    cause: 'Conducción colegiada sin instrumentos formales de gobierno; acuerdos verbalizados pero no firmados.',
    consequence: 'Bloqueo de decisiones, conflicto entre socios y riesgo de continuidad operativa.',
    probInherent: 3,
    impInherent: 5,
    levelInherent: 15,
    strategy: 'Mitigar',
    mitigationActions: 'Firmar el Estatuto de Convivencia y Protocolo de Directorio (MPE Eje 1, acción 1).',
    responsibleRole: 'Directorio',
    probResidual: 2,
    impResidual: 4,
    levelResidual: 8,
    earlyWarningKpi: 'Estatuto firmado (S/N); % decisiones en actas'
  },
  {
    id: 'r2',
    code: 'R-02',
    category: 'A. Estratégico / Gobierno',
    riskName: 'El Master Plan no se ejecuta por urgencias operativas',
    cause: 'Rol de dueño y operador superpuestos; tiempo estratégico de los socios <5%.',
    consequence: 'Plan trienal incumplido; la empresa sigue reactiva y las brechas del diagnóstico se profundizan.',
    probInherent: 4,
    impInherent: 4,
    levelInherent: 16,
    strategy: 'Mitigar',
    mitigationActions: 'Cadencia de Directorio con agenda separada de lo operativo; delegación en responsables por área.',
    responsibleRole: 'Directorio',
    probResidual: 3,
    impResidual: 3,
    levelResidual: 9,
    earlyWarningKpi: '% de hitos del MPE cumplidos en fecha; % tiempo estratégico'
  },
  {
    id: 'r3',
    code: 'R-03',
    category: 'B. Comercial / Mercado',
    riskName: 'Concentración excesiva de ingresos en el cliente principal',
    cause: 'Cartera dependiente de un cliente top (>40% de facturación).',
    consequence: 'Alta vulnerabilidad ante pérdida del cliente principal o freno del sector.',
    probInherent: 4,
    impInherent: 4,
    levelInherent: 16,
    strategy: 'Mitigar',
    mitigationActions: 'Diversificación ordenada: nuevas unidades de negocio y prospección proactiva (MPE Eje 5).',
    responsibleRole: 'Dirección / Comercial',
    probResidual: 3,
    impResidual: 4,
    levelResidual: 12,
    earlyWarningKpi: '% de facturación del cliente principal'
  },
  {
    id: 'r4',
    code: 'R-04',
    category: 'C. Operaciones / Calidad',
    riskName: 'Dependencia de personas clave en operaciones sin procesos documentados',
    cause: 'El know-how técnico vive en la cabeza de los fundadores sin estandarizar bajo ISO 9001.',
    consequence: 'Cuellos de botella graves y paralización de obras si falta un responsable.',
    probInherent: 4,
    impInherent: 4,
    levelInherent: 16,
    strategy: 'Mitigar',
    mitigationActions: 'Mapeo de subprocesos y redactar instructivos técnicos con copilotos de IA (MPE Eje 2).',
    responsibleRole: 'Operaciones',
    probResidual: 2,
    impResidual: 3,
    levelResidual: 6,
    earlyWarningKpi: '% procesos documentados; tasa de reprocesos'
  }
];
