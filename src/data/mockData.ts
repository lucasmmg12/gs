export interface Client {
  id: string;
  name: string;
  industry: string;
  contact: {
    ceo: string;
    email: string;
    phone: string;
    address: string;
  };
  executiveSummary: string;
  radarData: { subject: string; A: number; fullMark: number }[];
  kpis: {
    tasksCompleted: string;
    daysInProgram: string;
    nextMeeting: string;
    attentionRequiredArea: string;
    attentionRequiredText: string;
  };
  processes: {
    id: string;
    name: string;
    status: 'Iniciado' | 'En Progreso' | 'Completado' | 'Bloqueado';
    progress: number;
  }[];
  intervenciones: {
    id: string;
    topic: string;
    tutor: string;
    date: string;
    status: 'Diagnóstico Conjunto' | 'Intervención Activa' | 'Praxis Aplicada';
    progress: number;
    linkedProblem: string;
    checklists?: { id: string; task: string; completed: boolean }[];
  }[];
  metrics: {
    revenueGrowth: number;
    costReduction: number;
    teamSatisfaction: number;
    productivityIndex: number;
    realityAdherence: number; // New KPI
    monthlyPerformance: { month: string; value: number; benchmark: number }[];
  };
  gantt: {
    id: string;
    task: string;
    startMonth: number;
    durationMonths: number;
    progress: number;
  }[];
}

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Minera Sur S.A.',
    industry: 'Minería',
    contact: {
      ceo: 'Carlos Méndez',
      email: 'carlos@minerasur.com',
      phone: '+54 9 11 4532-8901',
      address: 'Ruta Nacional 3, Km 1500, Patagonia',
    },
    executiveSummary: 'La empresa presenta una sólida estructura financiera y operativa, pero experimenta cuellos de botella severos en sus procesos logísticos y de recursos humanos. El enfoque actual debe ser desatascar la expansión hacia el norte mediante la optimización de flujos de trabajo internos.',
    radarData: [
      { subject: 'Finanzas', A: 85, fullMark: 100 },
      { subject: 'Estructura', A: 65, fullMark: 100 },
      { subject: 'Comercial', A: 90, fullMark: 100 },
      { subject: 'Cultura', A: 70, fullMark: 100 },
      { subject: 'Procesos', A: 60, fullMark: 100 },
    ],
    kpis: {
      tasksCompleted: '85%',
      daysInProgram: '120',
      nextMeeting: 'Mañana, 10:00 AM',
      attentionRequiredArea: 'Procesos',
      attentionRequiredText: 'Leve caída respecto al mes anterior. Recomendamos priorizar la revisión de flujos de trabajo.',
    },
    processes: [
      { id: 'p1', name: 'Auditoría Contable', status: 'Completado', progress: 100 },
      { id: 'p2', name: 'Optimización Logística', status: 'En Progreso', progress: 65 },
      { id: 'p3', name: 'Reestructuración RRHH', status: 'En Progreso', progress: 40 },
      { id: 'p4', name: 'Expansión Norte', status: 'Bloqueado', progress: 15 },
    ],
    intervenciones: [
      { id: 't1', topic: 'Desbloqueo Logístico', tutor: 'Carlos Gómez', date: '2026-05-20', status: 'Intervención Activa', progress: 45, linkedProblem: 'Cuello de botella en Expansión Norte' },
      { id: 't2', topic: 'Reingeniería Financiera', tutor: 'Ana Silva', date: '2026-05-15', status: 'Praxis Aplicada', progress: 100, linkedProblem: 'Fuga de capital operativo' },
      { id: 't3', topic: 'Gestión de Operaciones', tutor: 'Roberto D.', date: '2026-06-01', status: 'Diagnóstico Conjunto', progress: 0, linkedProblem: 'Ineficiencia en planta central' },
      { id: 't4', topic: 'Reestructuración RRHH', tutor: 'Lucía M.', date: '2026-05-28', status: 'Intervención Activa', progress: 70, linkedProblem: 'Alta fricción sindical' },
    ],
    metrics: {
      revenueGrowth: 12.5,
      costReduction: 5.2,
      teamSatisfaction: 78,
      productivityIndex: 85,
      realityAdherence: 68,
      monthlyPerformance: [
        { month: 'Ene', value: 65, benchmark: 60 },
        { month: 'Feb', value: 68, benchmark: 62 },
        { month: 'Mar', value: 75, benchmark: 65 },
        { month: 'Abr', value: 80, benchmark: 70 },
        { month: 'May', value: 85, benchmark: 75 },
      ],
    },
    gantt: [
      { id: 'g1', task: 'Diagnóstico Inicial', startMonth: 0, durationMonths: 1, progress: 100 },
      { id: 'g2', task: 'Implementación ISO 9001', startMonth: 1, durationMonths: 3, progress: 80 },
      { id: 'g3', task: 'Capacitación Personal', startMonth: 2, durationMonths: 2, progress: 50 },
      { id: 'g4', task: 'Auditoría Final', startMonth: 4, durationMonths: 1, progress: 0 },
    ],
  },
  {
    id: '2',
    name: 'TechFlow Solutions',
    industry: 'Software',
    contact: {
      ceo: 'Mariana López',
      email: 'm.lopez@techflow.io',
      phone: '+54 9 11 2341-9988',
      address: 'Polo Tecnológico, CABA',
    },
    executiveSummary: 'Startup tecnológica con excelente cultura remota y finanzas saneadas por rondas de inversión recientes. Sin embargo, sufren una alta rotación en el área comercial (SDRs) que está frenando el levantamiento de capital serie A. Requieren intervención urgente en retención de talento comercial y reestructuración de incentivos.',
    radarData: [
      { subject: 'Finanzas', A: 95, fullMark: 100 },
      { subject: 'Estructura', A: 85, fullMark: 100 },
      { subject: 'Comercial', A: 60, fullMark: 100 },
      { subject: 'Cultura', A: 90, fullMark: 100 },
      { subject: 'Procesos', A: 90, fullMark: 100 },
    ],
    kpis: {
      tasksCompleted: '45%',
      daysInProgram: '45',
      nextMeeting: 'Hoy, 15:30 PM',
      attentionRequiredArea: 'Comercial',
      attentionRequiredText: 'Alta rotación de leads. Se necesita reestructurar el embudo de ventas y capacitar a los SDRs.',
    },
    processes: [
      { id: 'p1', name: 'Go-To-Market Strategy', status: 'En Progreso', progress: 30 },
      { id: 'p2', name: 'Cultura Remota', status: 'Completado', progress: 100 },
      { id: 'p3', name: 'Refactorización Core', status: 'En Progreso', progress: 75 },
    ],
    intervenciones: [
      { id: 't1', topic: 'Reestructuración de Incentivos SDR', tutor: 'Marcos Ruiz', date: '2026-05-19', status: 'Intervención Activa', progress: 30, linkedProblem: 'Alta rotación de comerciales' },
      { id: 't2', topic: 'Procesos de Venta B2B', tutor: 'Julián C.', date: '2026-05-22', status: 'Intervención Activa', progress: 60, linkedProblem: 'Caída de conversión en Leads' },
      { id: 't3', topic: 'Cultura de Retención', tutor: 'Ana Silva', date: '2026-05-10', status: 'Praxis Aplicada', progress: 100, linkedProblem: 'Pérdida de talento técnico' },
    ],
    metrics: {
      revenueGrowth: 35.0,
      costReduction: -2.0,
      teamSatisfaction: 92,
      productivityIndex: 88,
      realityAdherence: 45,
      monthlyPerformance: [
        { month: 'Ene', value: 80, benchmark: 75 },
        { month: 'Feb', value: 82, benchmark: 78 },
        { month: 'Mar', value: 85, benchmark: 80 },
        { month: 'Abr', value: 86, benchmark: 82 },
        { month: 'May', value: 88, benchmark: 85 },
      ],
    },
    gantt: [
      { id: 'g1', task: 'Levantamiento Capital', startMonth: 0, durationMonths: 2, progress: 100 },
      { id: 'g2', task: 'Desarrollo MVP v2', startMonth: 1, durationMonths: 3, progress: 60 },
      { id: 'g3', task: 'Campaña Lanzamiento', startMonth: 3, durationMonths: 2, progress: 10 },
    ],
  },
  {
    id: '3',
    name: 'Agropecuaria El Sol',
    industry: 'Agro',
    contact: {
      ceo: 'Héctor Ramírez',
      email: 'h.ramirez@agroelsol.com',
      phone: '+54 9 341 555-0192',
      address: 'Ruta 33 Km 45, Santa Fe',
    },
    executiveSummary: 'Empresa familiar tradicional con buenas ventas pero un grave déficit en control de procesos y adopción tecnológica. La falta de un sistema ERP está causando pérdidas invisibles de inventario. La gerencia está abierta al cambio pero teme la resistencia cultural del personal operativo.',
    radarData: [
      { subject: 'Finanzas', A: 70, fullMark: 100 },
      { subject: 'Estructura', A: 50, fullMark: 100 },
      { subject: 'Comercial', A: 80, fullMark: 100 },
      { subject: 'Cultura', A: 55, fullMark: 100 },
      { subject: 'Procesos', A: 40, fullMark: 100 },
    ],
    kpis: {
      tasksCompleted: '20%',
      daysInProgram: '15',
      nextMeeting: 'Lunes, 09:00 AM',
      attentionRequiredArea: 'Procesos y Estructura',
      attentionRequiredText: 'Falta de digitalización en inventarios causa pérdidas. Urge implementar ERP básico.',
    },
    processes: [
      { id: 'p1', name: 'Implementación ERP', status: 'Iniciado', progress: 10 },
      { id: 'p2', name: 'Control de Plagas Autom.', status: 'Iniciado', progress: 5 },
      { id: 'p3', name: 'Exportación a UE', status: 'Bloqueado', progress: 0 },
    ],
    intervenciones: [
      { id: 't1', topic: 'Digitalización de Inventarios (ERP)', tutor: 'Elena Castro', date: '2026-05-22', status: 'Diagnóstico Conjunto', progress: 0, linkedProblem: 'Pérdidas de stock invisibles' },
      { id: 't2', topic: 'Auditoría Normativas UE', tutor: 'Luis Mendoza', date: '2026-05-25', status: 'Diagnóstico Conjunto', progress: 0, linkedProblem: 'Bloqueo en exportación por compliance' },
      { id: 't3', topic: 'Cambio Cultural Operativo', tutor: 'Carlos Gómez', date: '2026-05-18', status: 'Intervención Activa', progress: 20, linkedProblem: 'Resistencia del personal al uso de tecnología' },
      { id: 't4', topic: 'Gestión Financiera Básica', tutor: 'Ana Silva', date: '2026-05-12', status: 'Praxis Aplicada', progress: 100, linkedProblem: 'Descontrol en flujo de caja' },
    ],
    metrics: {
      revenueGrowth: 5.5,
      costReduction: 12.0,
      teamSatisfaction: 60,
      productivityIndex: 65,
      realityAdherence: 20,
      monthlyPerformance: [
        { month: 'Ene', value: 50, benchmark: 55 },
        { month: 'Feb', value: 52, benchmark: 58 },
        { month: 'Mar', value: 58, benchmark: 60 },
        { month: 'Abr', value: 62, benchmark: 62 },
        { month: 'May', value: 65, benchmark: 65 },
      ],
    },
    gantt: [
      { id: 'g1', task: 'Análisis de Brechas', startMonth: 0, durationMonths: 1, progress: 100 },
      { id: 'g2', task: 'Selección de ERP', startMonth: 1, durationMonths: 1, progress: 80 },
      { id: 'g3', task: 'Despliegue ERP', startMonth: 2, durationMonths: 3, progress: 0 },
    ],
  }
];
