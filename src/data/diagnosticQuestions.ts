export type ResponseOptionValue = 
  | 'formal_active'       // Sí, formalizado y en uso activo
  | 'informal_active'     // Lo tiene pero es informal / superficial
  | 'partial_dev'         // Parcialmente / En desarrollo
  | 'none_no_record'      // No tiene registro / Inexistente
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
  triggerOptionValues: ResponseOptionValue[]; // Show only if parent is one of these
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
  pentagonAxis?: 'Directorio' | 'Talento' | 'Finanzas' | 'Procesos' | 'Comercial';
  description: string;
  kpis: { name: string; unit: string; baseline?: string; target?: string }[];
  questions: DiagnosticQuestion[];
}

// Opciones estándar de madurez para PYMEs (según procedimiento)
export const STANDARD_CLOSED_OPTIONS: QuestionOption[] = [
  {
    value: 'formal_active',
    label: 'Sí, formalizado con procedimiento y en uso real',
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
    shortLabel: 'Parcial',
    maturityScore: 35,
    riskScore: 65
  },
  {
    value: 'none_no_record',
    label: 'No lo tiene / No tiene registro ni procedimiento',
    shortLabel: 'No lo tiene',
    maturityScore: 0,
    riskScore: 90
  },
  {
    value: 'unknown_na',
    label: 'No sabe / Requiere investigación',
    shortLabel: 'No sabe',
    maturityScore: 10,
    riskScore: 80
  }
];

export const DIAGNOSTIC_AREAS: DiagnosticArea[] = [
  // 1. DIRECCIÓN Y ESTRATEGIA (Eje Pentágono: Directorio)
  {
    id: 'area_1_direccion',
    number: 1,
    name: 'Dirección y Estrategia',
    icon: 'Compass',
    pentagonAxis: 'Directorio',
    description: 'Pensamiento estratégico, visión a 3 años, gobernanza y separación del rol de dueño vs operador.',
    kpis: [
      { name: '% tiempo semanal en estrategia', unit: '%' },
      { name: 'N° reuniones estratégicas/mes', unit: 'N°' },
      { name: 'Score alineación de socios', unit: '1-10' }
    ],
    questions: [
      {
        id: 1,
        areaId: 'area_1_direccion',
        code: '1.1',
        title: '¿Tiene la empresa una Visión, Misión y OMV formalmente definidos y comunicados al equipo?',
        guide: 'Evaluar si está documentado y si los mandos medios lo conocen.',
        kpi: 'Existencia de Visión/OMV documentado',
        isParent: true,
        options: [
          {
            value: 'formal_active',
            label: 'Sí, formalizado, documentado y comunicado a toda la organización',
            shortLabel: 'Formal y Comunicado',
            maturityScore: 100,
            riskScore: 10,
            strategicImpact: { fodaType: 'fortaleza', fodaText: 'Rumbo estratégico claro y visión compartida por el equipo.' }
          },
          {
            value: 'informal_active',
            label: 'Existe en la mente del dueño pero no está documentado ni socializado',
            shortLabel: 'En mente del dueño',
            maturityScore: 40,
            riskScore: 60,
            strategicImpact: { fodaType: 'debilidad', fodaText: 'Visión centralizada en el fundador sin alineación del equipo.' }
          },
          {
            value: 'none_no_record',
            label: 'No existe definición de visión ni objetivos de mediano plazo',
            shortLabel: 'Inexistente',
            maturityScore: 0,
            riskScore: 90,
            strategicImpact: { 
              fodaType: 'debilidad', 
              fodaText: 'Falta de rumbo estratégico formal.',
              riskCategory: 'Estratégico',
              riskProbability: 'Alta',
              riskImpact: 'Alto',
              riskDescription: 'Riesgo de desalineación operativa y dispersión de recursos por falta de visión común.'
            }
          }
        ]
      },
      // Cascada 1.1 -> 1.1.1
      {
        id: 101,
        areaId: 'area_1_direccion',
        code: '1.1.1',
        title: '¿La visión estratégica cuenta con metas numéricas cuantificables a 3 años (OMV)?',
        guide: 'Aparece si la visión está al menos definida.',
        cascadeCondition: {
          parentQuestionId: 1,
          triggerOptionValues: ['formal_active', 'informal_active']
        },
        options: [
          { value: 'formal_active', label: 'Sí, metas financieras y de estructura con KPIs definidos', shortLabel: 'Con KPIs', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Metas cualitativas o estimadas sin métricas duras', shortLabel: 'Cualitativas', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'Solo deseos generales sin plazos ni cifras', shortLabel: 'Deseos generales', maturityScore: 15, riskScore: 80 }
        ]
      },
      {
        id: 2,
        areaId: 'area_1_direccion',
        code: '1.2',
        title: '¿Existen reuniones de Dirección y Directorio periódicas con agenda fija y actas formales?',
        guide: 'Diferenciar de reuniones de pasillo u operativas del día a día.',
        kpi: 'Frecuencia de reuniones de directorio',
        isParent: true,
        options: [
          {
            value: 'formal_active',
            label: 'Sí, reuniones mensuales fijas con acta, orden del día y seguimiento',
            shortLabel: 'Mensual con acta',
            maturityScore: 100,
            riskScore: 10,
            strategicImpact: { fodaType: 'fortaleza', fodaText: 'Gobernanza ordenada y disciplina de directorio.' }
          },
          {
            value: 'informal_active',
            label: 'Se reúnen a charlar pero de forma espontánea y sin acta de acuerdos',
            shortLabel: 'Espontánea sin acta',
            maturityScore: 45,
            riskScore: 55,
            strategicImpact: { fodaType: 'debilidad', fodaText: 'Falta de registro formal de acuerdos societarios.' }
          },
          {
            value: 'none_no_record',
            label: 'No existen reuniones de directorio; todo se resuelve sobre la marcha',
            shortLabel: 'Sin reuniones fijas',
            maturityScore: 0,
            riskScore: 90,
            strategicImpact: {
              fodaType: 'debilidad',
              riskCategory: 'Legal/Gobernanza',
              riskProbability: 'Alta',
              riskImpact: 'Crítico',
              riskDescription: 'Riesgo de parálisis societaria y conflictos de gobernanza no resueltos.'
            }
          }
        ]
      },
      // Cascada 1.2 -> 1.2.1
      {
        id: 102,
        areaId: 'area_1_direccion',
        code: '1.2.1',
        title: '¿Se audita en cada reunión el cumplimiento de los acuerdos y compromisos previos?',
        cascadeCondition: {
          parentQuestionId: 2,
          triggerOptionValues: ['formal_active', 'informal_active']
        },
        options: [
          { value: 'formal_active', label: 'Sí, revisión estricta de compromisos con responsables y fechas', shortLabel: 'Control estricto', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Se revisa solo a veces o cuando hay problemas graves', shortLabel: 'Revisión irregular', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'Rara vez se hace seguimiento a lo acordado en la reunión anterior', shortLabel: 'Sin seguimiento', maturityScore: 10, riskScore: 85 }
        ]
      },
      {
        id: 3,
        areaId: 'area_1_direccion',
        code: '1.3',
        title: '¿Los socios/dueños logran delegar la operación para dedicarse al rol estratégico?',
        guide: 'Evaluar el eje de la poda y si el negocio funciona cuando el dueño se ausenta.',
        options: [
          { value: 'formal_active', label: 'Sí, los socios delegan y dedican más del 30% a la estrategia', shortLabel: 'Estratégico (>30%)', maturityScore: 100, riskScore: 15, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Liderazgo enfocado en crecimiento y no absorbido por la urgencia.' } },
          { value: 'partial_dev', label: 'Delegan parcialmente pero siguen siendo llamados para emergencias', shortLabel: 'Delegación parcial', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'La operación depende 100% de la presencia física de los socios', shortLabel: 'Dueño dependiente', maturityScore: 10, riskScore: 95, strategicImpact: { fodaType: 'debilidad', fodaText: 'Alta dependencia del negocio respecto a sus fundadores.', riskCategory: 'Operativo', riskProbability: 'Alta', riskImpact: 'Crítico', riskDescription: 'Vulnerabilidad operativa extrema ante eventual ausencia de los socios.' } }
        ]
      },
      {
        id: 4,
        areaId: 'area_1_direccion',
        code: '1.4',
        title: '¿Cuenta la empresa con un Protocolo de Socios o Estatuto de Convivencia firmado?',
        options: [
          { value: 'formal_active', label: 'Sí, protocolo formal firmado y con reglas de salida y sucesión', shortLabel: 'Protocolo formal', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Reglas de juego claras y protocolo de socios firmado.' } },
          { value: 'partial_dev', label: 'Hay acuerdos verbales de palabra pero nada firmado legalmente', shortLabel: 'De palabra', maturityScore: 30, riskScore: 70, strategicImpact: { fodaType: 'debilidad', fodaText: 'Acuerdos societarios informales sin respaldo jurídico.' } },
          { value: 'none_no_record', label: 'No existe ningún acuerdo; no se ha hablado de reglas de convivencia', shortLabel: 'Sin protocolo', maturityScore: 0, riskScore: 90, strategicImpact: { riskCategory: 'Legal/Gobernanza', riskProbability: 'Media', riskImpact: 'Crítico', riskDescription: 'Falta de blindaje societario ante desavenencias entre socios.' } }
        ]
      }
    ]
  },

  // 2. ADMINISTRACIÓN Y FINANZAS (Eje Pentágono: Finanzas)
  {
    id: 'area_2_finanzas',
    number: 2,
    name: 'Administración y Finanzas',
    icon: 'DollarSign',
    pentagonAxis: 'Finanzas',
    description: 'Control de flujo de caja, estructura de costos fijos, margen por proyecto y salud financiera.',
    kpis: [
      { name: 'Punto de equilibrio mensual', unit: '$' },
      { name: 'Margen bruto promedio', unit: '%' },
      { name: 'Runway de reserva de caja', unit: 'Meses' },
      { name: 'Días promedio de cobranza', unit: 'Días' }
    ],
    questions: [
      {
        id: 5,
        areaId: 'area_2_finanzas',
        code: '2.1',
        title: '¿Cuenta la empresa con una herramienta de Flujo de Caja Proyectado a 3-6 meses?',
        guide: 'Pregunta base con cascada condicional.',
        kpi: 'Flujo de caja proyectado activo',
        isParent: true,
        options: [
          {
            value: 'formal_active',
            label: 'Sí, flujo de caja proyectado diario/semanal y actualizado sistemáticamente',
            shortLabel: 'Flujo Activo',
            maturityScore: 100,
            riskScore: 10,
            strategicImpact: { fodaType: 'fortaleza', fodaText: 'Previsibilidad financiera y gestión profesional de liquidez.' }
          },
          {
            value: 'informal_active',
            label: 'Lleva registro básico de saldos bancarios pero no proyección a futuro',
            shortLabel: 'Solo saldos',
            maturityScore: 40,
            riskScore: 60,
            strategicImpact: { fodaType: 'debilidad', fodaText: 'Falta de previsión de caja a mediano plazo.' }
          },
          {
            value: 'none_no_record',
            label: 'No cuenta con flujo de caja; se maneja al día con lo que ingresa',
            shortLabel: 'Sin flujo de caja',
            maturityScore: 0,
            riskScore: 95,
            strategicImpact: {
              fodaType: 'debilidad',
              riskCategory: 'Financiero',
              riskProbability: 'Alta',
              riskImpact: 'Crítico',
              riskDescription: 'Riesgo inminente de iliquidez o estrés financiero por falta de proyección de caja.'
            }
          }
        ]
      },
      // Cascada 2.1 -> 2.1.1
      {
        id: 201,
        areaId: 'area_2_finanzas',
        code: '2.1.1',
        title: '¿Con qué frecuencia se actualiza y quién analiza las desviaciones del flujo de caja?',
        cascadeCondition: {
          parentQuestionId: 5,
          triggerOptionValues: ['formal_active', 'informal_active']
        },
        options: [
          { value: 'formal_active', label: 'Semanalmente por responsable administrativo y revisado con gerencia', shortLabel: 'Semanal con gerencia', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Mensualmente o cuando falta liquidez en el banco', shortLabel: 'Mensual/Esporádico', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'No se analiza con periodicidad fija', shortLabel: 'Sin análisis fijo', maturityScore: 20, riskScore: 80 }
        ]
      },
      // Cascada 2.1 -> 2.1.2
      {
        id: 202,
        areaId: 'area_2_finanzas',
        code: '2.1.2',
        title: '¿Se utiliza el flujo de caja para decidir compras e inversiones anticipadas?',
        cascadeCondition: {
          parentQuestionId: 5,
          triggerOptionValues: ['formal_active']
        },
        options: [
          { value: 'formal_active', label: 'Sí, ninguna compra extraordinaria se aprueba sin consultar el flujo', shortLabel: 'Mandatorio en compras', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Solo para compras muy grandes; gastos medios se deciden intuitivamente', shortLabel: 'Uso parcial', maturityScore: 60, riskScore: 40 },
          { value: 'none_no_record', label: 'No se cruzan las decisiones de compra con el flujo proyectado', shortLabel: 'Decisión intuitiva', maturityScore: 20, riskScore: 80 }
        ]
      },
      {
        id: 6,
        areaId: 'area_2_finanzas',
        code: '2.2',
        title: '¿Están las finanzas de la empresa 100% separadas de las personales de los dueños?',
        options: [
          { value: 'formal_active', label: 'Sí, separación total. Los dueños tienen sueldo fijo y cuenta separada', shortLabel: 'Separación Total', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Disciplina financiera y patrimonio personal aislado de la firma.' } },
          { value: 'informal_active', label: 'Cuentas bancarias separadas pero retiros personales a discreción', shortLabel: 'Retiros discrecionales', maturityScore: 40, riskScore: 65, strategicImpact: { fodaType: 'debilidad', fodaText: 'Retiros personales desordenados que distorsionan el balance.' } },
          { value: 'none_no_record', label: 'Mezcla frecuente de gastos de la empresa y gastos familiares', shortLabel: 'Caja mezclada', maturityScore: 0, riskScore: 90, strategicImpact: { fodaType: 'debilidad', riskCategory: 'Financiero', riskProbability: 'Alta', riskImpact: 'Alto', riskDescription: 'Opacidad en rentabilidad real y desprotección patrimonial por mezcla de fondos.' } }
        ]
      },
      {
        id: 7,
        areaId: 'area_2_finanzas',
        code: '2.3',
        title: '¿Tiene calculados con exactitud los costos fijos mensuales y el punto de equilibrio?',
        options: [
          { value: 'formal_active', label: 'Sí, estructura de costos fijos tabulada y punto de equilibrio conocido al centavo', shortLabel: 'Costos y PE exactos', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Control de estructura de costos y umbral de rentabilidad medido.' } },
          { value: 'partial_dev', label: 'Se conocen los costos globales pero no se actualizan por inflación/insumos', shortLabel: 'Aproximado', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'No se conoce el punto de equilibrio mensual con rigor contable', shortLabel: 'PE Desconocido', maturityScore: 10, riskScore: 85, strategicImpact: { fodaType: 'debilidad', fodaText: 'Desconocimiento del volumen mínimo para no perder dinero.' } }
        ]
      },
      {
        id: 8,
        areaId: 'area_2_finanzas',
        code: '2.4',
        title: '¿Lleva medición de rentabilidad unitaria por proyecto, cliente o línea de producto?',
        options: [
          { value: 'formal_active', label: 'Sí, costeo individual por obra/proyecto con margen bruto real calculado', shortLabel: 'Costeo por proyecto', maturityScore: 100, riskScore: 15, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Rentabilidad unitaria monitoreada y protección de márgenes.' } },
          { value: 'informal_active', label: 'Se presupuesta con margen teórico pero no se mide el desvío real al finalizar', shortLabel: 'Solo teórico', maturityScore: 45, riskScore: 55, strategicImpact: { fodaType: 'debilidad', fodaText: 'Falta de post-costeo de obras o ventas para validar márgenes.' } },
          { value: 'none_no_record', label: 'Solo se mide el balance global a fin de año sin discriminar proyectos', shortLabel: 'Sin costeo unitario', maturityScore: 10, riskScore: 85 }
        ]
      }
    ]
  },

  // 3. OPERACIONES Y PRODUCCIÓN (Eje Pentágono: Procesos)
  {
    id: 'area_3_operaciones',
    number: 3,
    name: 'Operaciones y Producción',
    icon: 'Settings',
    pentagonAxis: 'Procesos',
    description: 'Capacidad operativa, cuello de botella, abastecimiento, compras y control de calidad en obra/fábrica.',
    kpis: [
      { name: 'Tasa de reprocesos/fallas', unit: '%' },
      { name: '% entregas a tiempo (OTD)', unit: '%' },
      { name: 'Utilización de capacidad instalada', unit: '%' }
    ],
    questions: [
      {
        id: 9,
        areaId: 'area_3_operaciones',
        code: '3.1',
        title: '¿Están mapeados los procesos principales de la cadena de valor de punta a punta?',
        guide: 'Primero se diseñan los procesos y recién luego las personas.',
        isParent: true,
        options: [
          {
            value: 'formal_active',
            label: 'Sí, mapa de procesos documentado con entradas, salidas e instructivos de trabajo',
            shortLabel: 'Mapa formal',
            maturityScore: 100,
            riskScore: 10,
            strategicImpact: { fodaType: 'fortaleza', fodaText: 'Cadena de valor estandarizada y procesos formalizados.' }
          },
          {
            value: 'informal_active',
            label: 'La gente sabe cómo hacer las cosas pero no hay diagramas ni procedimientos escritos',
            shortLabel: 'Know-how verbal',
            maturityScore: 40,
            riskScore: 60,
            strategicImpact: { fodaType: 'debilidad', fodaText: 'Conocimiento operativo dependiente de la memoria de las personas.' }
          },
          {
            value: 'none_no_record',
            label: 'Cada operario trabaja a su manera sin un criterio homogéneo',
            shortLabel: 'Desorden operativo',
            maturityScore: 0,
            riskScore: 90,
            strategicImpact: {
              fodaType: 'debilidad',
              riskCategory: 'Operativo',
              riskProbability: 'Alta',
              riskImpact: 'Alto',
              riskDescription: 'Alta variabilidad de calidad e ineficiencia por falta de estandarización.'
            }
          }
        ]
      },
      // Cascada 3.1 -> 3.1.1
      {
        id: 301,
        areaId: 'area_3_operaciones',
        code: '3.1.1',
        title: '¿Se utilizan Checklists obligatorios para validar etapas críticas antes de entregar?',
        cascadeCondition: {
          parentQuestionId: 9,
          triggerOptionValues: ['formal_active', 'informal_active']
        },
        options: [
          { value: 'formal_active', label: 'Sí, listas de control firmadas digitalmente o en papel', shortLabel: 'Checklists activos', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Se usan solo en proyectos de clientes exigentes', shortLabel: 'Uso selectivo', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'No se utilizan checklists de control de calidad', shortLabel: 'Sin checklists', maturityScore: 15, riskScore: 85 }
        ]
      },
      {
        id: 10,
        areaId: 'area_3_operaciones',
        code: '3.2',
        title: '¿Existe unificación de Compras, Logística y Almacén con separación de compra y pago?',
        options: [
          { value: 'formal_active', label: 'Sí, circuito de compras unificado con orden de compra y trazabilidad', shortLabel: 'Circuito unificado', maturityScore: 100, riskScore: 15, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Control de stock y abastecimiento blindado contra fraudes y desvíos.' } },
          { value: 'informal_active', label: 'Compran varios responsables según urgencias sin orden previa', shortLabel: 'Compras múltiples', maturityScore: 35, riskScore: 65, strategicImpact: { fodaType: 'debilidad', fodaText: 'Desorden en adquisiciones y riesgo de sobrefacturación de proveedores.' } },
          { value: 'none_no_record', label: 'No hay inventario ni control de compras; se compra a demanda sin registrar', shortLabel: 'Sin control', maturityScore: 0, riskScore: 90, strategicImpact: { riskCategory: 'Operativo', riskProbability: 'Alta', riskImpact: 'Alto', riskDescription: 'Fugas de materiales e inmovilización innecesaria de capital de trabajo.' } }
        ]
      },
      {
        id: 11,
        areaId: 'area_3_operaciones',
        code: '3.3',
        title: '¿Tiene identificados y monitoreados los 3 principales cuellos de botella de la operación?',
        options: [
          { value: 'formal_active', label: 'Sí, cuellos de botella identificados y con plan de descongestión activo', shortLabel: 'Monitoreados', maturityScore: 100, riskScore: 20 },
          { value: 'partial_dev', label: 'Se conocen intuitivamente pero no se han tomado medidas de fondo', shortLabel: 'Conocidos sin plan', maturityScore: 45, riskScore: 55 },
          { value: 'none_no_record', label: 'No están claros cuáles son las restricciones que frenan la capacidad', shortLabel: 'Sin identificar', maturityScore: 10, riskScore: 80 }
        ]
      }
    ]
  },

  // 4. RECURSOS HUMANOS Y ESTRUCTURA (Eje Pentágono: Talento)
  {
    id: 'area_4_rrhh',
    number: 4,
    name: 'Talento, Liderazgo y Estructura',
    icon: 'Users',
    pentagonAxis: 'Talento',
    description: 'Organigrama funcional, descripciones de puestos, mandos medios autónomos y clima laboral.',
    kpis: [
      { name: 'N° personas en equipo total', unit: 'N°' },
      { name: 'Tasa de rotación voluntaria', unit: '%' },
      { name: '% puestos con perfil escrito', unit: '%' }
    ],
    questions: [
      {
        id: 12,
        areaId: 'area_4_rrhh',
        code: '4.1',
        title: '¿Cuenta la empresa con un Organigrama formal y descripciones de puestos por escrito?',
        guide: 'Concepto de la medianera: puestos diseñados para procesos, no adaptados a personas.',
        isParent: true,
        options: [
          {
            value: 'formal_active',
            label: 'Sí, organigrama funcional vigente con manual de funciones y responsabilidades claras',
            shortLabel: 'Organigrama formal',
            maturityScore: 100,
            riskScore: 10,
            strategicImpact: { fodaType: 'fortaleza', fodaText: 'Estructura organizacional formalizada con delimitación de roles.' }
          },
          {
            value: 'informal_active',
            label: 'Hay puestos tácitos pero no están volcados en organigrama ni por escrito',
            shortLabel: 'Roles tácitos',
            maturityScore: 40,
            riskScore: 60,
            strategicImpact: { fodaType: 'debilidad', fodaText: 'Superposición de tareas y responsabilidades difusas entre integrantes.' }
          },
          {
            value: 'none_no_record',
            label: 'No hay estructura; todos hacen de todo según la urgencia del día',
            shortLabel: 'Todos hacen todo',
            maturityScore: 0,
            riskScore: 90,
            strategicImpact: {
              fodaType: 'debilidad',
              riskCategory: 'Operativo',
              riskProbability: 'Alta',
              riskImpact: 'Alto',
              riskDescription: 'Falta de accountability y pérdida de productividad por anarquía funcional.'
            }
          }
        ]
      },
      // Cascada 4.1 -> 4.1.1
      {
        id: 401,
        areaId: 'area_4_rrhh',
        code: '4.1.1',
        title: '¿Los mandos medios tienen autonomía real para tomar decisiones de su sector sin consultar al dueño?',
        cascadeCondition: {
          parentQuestionId: 12,
          triggerOptionValues: ['formal_active', 'informal_active']
        },
        options: [
          { value: 'formal_active', label: 'Sí, límites de decisión delegados por escrito y con presupuesto propio', shortLabel: 'Autonomía alta', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Toman decisiones menores pero para temas relevantes vuelven al socio', shortLabel: 'Autonomía media', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'Cero autonomía; el socio fundador debe autorizar cualquier cambio', shortLabel: 'Sin autonomía', maturityScore: 10, riskScore: 90 }
        ]
      },
      {
        id: 13,
        areaId: 'area_4_rrhh',
        code: '4.2',
        title: '¿Existe un programa de Onboarding / Inducción estructurado para nuevos ingresos?',
        options: [
          { value: 'formal_active', label: 'Sí, plan de inducción de 2 a 4 semanas con mentor asignado y manuales', shortLabel: 'Onboarding estructurado', maturityScore: 100, riskScore: 15 },
          { value: 'informal_active', label: 'Se le explica verbalmente el primer día y aprende mirando a un compañero', shortLabel: 'Inducción informal', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'Comienza a trabajar directo sin ninguna inducción previa', shortLabel: 'Sin inducción', maturityScore: 0, riskScore: 85 }
        ]
      },
      {
        id: 14,
        areaId: 'area_4_rrhh',
        code: '4.3',
        title: '¿Tiene la empresa un esquema de incentivos alineado con objetivos o KPIs de negocio?',
        options: [
          { value: 'formal_active', label: 'Sí, bonos por cumplimiento de metas cuantitativas claras y transparentes', shortLabel: 'Incentivos con KPIs', maturityScore: 100, riskScore: 15, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Equipo motivado con compensaciones ligadas a rentabilidad y metas.' } },
          { value: 'informal_active', label: 'Premios o aumentos otorgados a criterio subjetivo del dueño a fin de año', shortLabel: 'Premios subjetivos', maturityScore: 45, riskScore: 55 },
          { value: 'none_no_record', label: 'Solo sueldos fijos sin ningún esquema de motivación por logros', shortLabel: 'Solo fijos', maturityScore: 20, riskScore: 75 }
        ]
      }
    ]
  },

  // 5. COMERCIAL Y MARKETING (Eje Pentágono: Comercial)
  {
    id: 'area_5_comercial',
    number: 5,
    name: 'Comercial, Ventas y Marketing',
    icon: 'TrendingUp',
    pentagonAxis: 'Comercial',
    description: 'Estrategia de ventas, funnel comercial, propuesta de valor diferenciada y captación sistemática.',
    kpis: [
      { name: 'N° cotizaciones emitidas/mes', unit: 'N°' },
      { name: 'Tasa de cierre / conversión', unit: '%' },
      { name: 'Ticket promedio de venta', unit: '$' }
    ],
    questions: [
      {
        id: 15,
        areaId: 'area_5_comercial',
        code: '5.1',
        title: '¿Cuenta la empresa con un Proceso Comercial y Funnel de Ventas sistematizado en un CRM?',
        guide: 'Evaluar si la venta depende del boca a boca o si hay metodología activa.',
        isParent: true,
        options: [
          {
            value: 'formal_active',
            label: 'Sí, pipeline en CRM con etapas claras, registro de leads y métricas de conversión',
            shortLabel: 'CRM activo',
            maturityScore: 100,
            riskScore: 10,
            strategicImpact: { fodaType: 'fortaleza', fodaText: 'Sistemática comercial con trazabilidad y pipeline digital.' }
          },
          {
            value: 'informal_active',
            label: 'Se gestiona en hojas de cálculo o chats de WhatsApp sin un embudo formal',
            shortLabel: 'Planillas/WhatsApp',
            maturityScore: 45,
            riskScore: 55,
            strategicImpact: { fodaType: 'debilidad', fodaText: 'Falta de CRM y riesgo de pérdida de prospectos comerciales.' }
          },
          {
            value: 'none_no_record',
            label: 'No hay proceso de ventas; se atiende solo a quien llama por recomendación',
            shortLabel: 'Comercial pasivo',
            maturityScore: 10,
            riskScore: 90,
            strategicImpact: {
              fodaType: 'debilidad',
              riskCategory: 'Comercial',
              riskProbability: 'Alta',
              riskImpact: 'Alto',
              riskDescription: 'Vulnerabilidad ante caída del mercado por ausencia de captación proactiva de clientes.'
            }
          }
        ]
      },
      // Cascada 5.1 -> 5.1.1
      {
        id: 501,
        areaId: 'area_5_comercial',
        code: '5.1.1',
        title: '¿Con qué frecuencia se realiza prospección activa y generación outbound de nuevos clientes?',
        cascadeCondition: {
          parentQuestionId: 15,
          triggerOptionValues: ['formal_active', 'informal_active']
        },
        options: [
          { value: 'formal_active', label: 'Semanal y estructurada con responsables comerciales exclusivos', shortLabel: 'Prospección semanal', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Solo cuando baja el trabajo en el taller u oficina', shortLabel: 'Solo en valles', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'Nunca se hace prospección activa', shortLabel: 'Sin prospección', maturityScore: 10, riskScore: 90 }
        ]
      },
      {
        id: 16,
        areaId: 'area_5_comercial',
        code: '5.2',
        title: '¿Tiene la empresa una Propuesta de Valor única y validada que la diferencie de la competencia?',
        options: [
          { value: 'formal_active', label: 'Sí, diferencial claro y sustentable que los clientes reconocen y pagan más por él', shortLabel: 'Propuesta única', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Posicionamiento premium y propuesta de valor validada en el mercado.', porterForce: 'rivalidad', porterText: 'Baja presión competitiva directa por alto grado de diferenciación.' } },
          { value: 'informal_active', label: 'Diferencial basado únicamente en "buena atención y calidad" sin nada singular', shortLabel: 'Comoditizado', maturityScore: 40, riskScore: 60, strategicImpact: { fodaType: 'debilidad', fodaText: 'Riesgo de comoditización por falta de propuesta de valor distintiva.', porterForce: 'rivalidad', porterText: 'Fuerte competencia por precios con competidores similares.' } },
          { value: 'none_no_record', label: 'Compiten casi exclusivamente por menor precio para ganar cotizaciones', shortLabel: 'Guerra de precios', maturityScore: 15, riskScore: 90, strategicImpact: { fodaType: 'amenaza', fodaText: 'Presión destructiva sobre márgenes comerciales.', porterForce: 'clientes', porterText: 'Alto poder de negociación de clientes para exigir descuentos.' } }
        ]
      },
      {
        id: 17,
        areaId: 'area_5_comercial',
        code: '5.3',
        title: '¿Qué porcentaje de las ventas está concentrado en el cliente principal?',
        guide: 'Riesgo crítico de concentración de cartera.',
        kpi: '% facturación cliente top 1',
        options: [
          { value: 'formal_active', label: 'Menos del 20% en el cliente principal (cartera muy atomizada)', shortLabel: '< 20% (Óptimo)', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Baja dependencia y cartera de clientes diversificada.' } },
          { value: 'partial_dev', label: 'Entre 20% y 45% en el cliente principal', shortLabel: '20% - 45% (Alerta)', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'Más del 45% en un solo cliente (concentración extrema)', shortLabel: '> 45% (Crítico)', maturityScore: 10, riskScore: 95, strategicImpact: { fodaType: 'amenaza', fodaText: 'Dependencia crítica de un solo cliente que pone en jaque la continuidad.', riskCategory: 'Comercial', riskProbability: 'Alta', riskImpact: 'Crítico', riskDescription: 'Riesgo de quiebra o derrumbe operativo si el cliente principal rescinde contrato.' } }
        ]
      }
    ]
  },

  // 6. CLIENTES Y EXPERIENCIA
  {
    id: 'area_6_clientes',
    number: 6,
    name: 'Clientes y Experiencia',
    icon: 'Smile',
    pentagonAxis: 'Comercial',
    description: 'Satisfacción sistemática, fidelización post-venta, índice NPS y gestión de reclamos.',
    kpis: [
      { name: 'NPS de satisfacción de clientes', unit: 'Score' },
      { name: 'Tasa de retención anual', unit: '%' },
      { name: 'Tiempo de resolución de reclamos', unit: 'Horas' }
    ],
    questions: [
      {
        id: 18,
        areaId: 'area_6_clientes',
        code: '6.1',
        title: '¿Se mide sistemáticamente la satisfacción de los clientes (NPS o encuestas post-entrega)?',
        options: [
          { value: 'formal_active', label: 'Sí, medición formal periódica y auditoría de satisfacción post-venta', shortLabel: 'NPS sistemático', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Cultura de escucha activa y fidelización de clientes.' } },
          { value: 'informal_active', label: 'Se pregunta informalmente por teléfono si quedó conforme', shortLabel: 'Llamada informal', maturityScore: 45, riskScore: 55 },
          { value: 'none_no_record', label: 'No se mide; solo se entera la empresa si el cliente se queja', shortLabel: 'Sin medición', maturityScore: 0, riskScore: 85 }
        ]
      },
      {
        id: 19,
        areaId: 'area_6_clientes',
        code: '6.2',
        title: '¿Existe un protocolo estandarizado para la recepción y resolución de reclamos o quejas?',
        options: [
          { value: 'formal_active', label: 'Sí, registro formal con análisis de causa raíz y plazos de respuesta', shortLabel: 'Protocolo formal', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Se resuelve caso por caso según la molestia del cliente', shortLabel: 'Caso por caso', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'No hay registro de reclamos; se discute en caliente', shortLabel: 'Sin registro', maturityScore: 10, riskScore: 90, strategicImpact: { fodaType: 'debilidad', fodaText: 'Pérdida de clientes por gestión deficiente de reclamos.' } }
        ]
      }
    ]
  },

  // 7. PROCESOS Y SISTEMAS DE GESTIÓN ISO
  {
    id: 'area_7_procesos',
    number: 7,
    name: 'Sistemas de Gestión y Calidad (ISO)',
    icon: 'Layers',
    pentagonAxis: 'Procesos',
    description: 'Estandarización bajo normas de calidad, auditorías internas y mejora continua.',
    kpis: [
      { name: 'N° procedimientos auditados', unit: 'N°' },
      { name: 'Estado certificación ISO 9001', unit: 'Estado' }
    ],
    questions: [
      {
        id: 20,
        areaId: 'area_7_procesos',
        code: '7.1',
        title: '¿Cuenta la empresa con un Sistema de Gestión de Calidad alineado o certificado bajo ISO 9001?',
        isParent: true,
        options: [
          { value: 'formal_active', label: 'Certificación vigente con auditorías externas aprobadas', shortLabel: 'Certificado ISO', maturityScore: 100, riskScore: 5, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Sistema de gestión de calidad certificado con respaldo internacional.', pestelCategory: 'legal', pestelText: 'Cumplimiento normativo y acceso a licitaciones de gran envergadura.' } },
          { value: 'partial_dev', label: 'Procesos alineados a la norma en etapa de implementación sin certificar', shortLabel: 'En implementación', maturityScore: 55, riskScore: 45 },
          { value: 'none_no_record', label: 'No trabaja bajo normas de calidad ni tiene intención en el corto plazo', shortLabel: 'Sin ISO', maturityScore: 10, riskScore: 80, strategicImpact: { fodaType: 'debilidad', fodaText: 'Limitación para competir en industrias exigentes sin aval de calidad.' } }
        ]
      },
      // Cascada 7.1 -> 7.1.1
      {
        id: 701,
        areaId: 'area_7_procesos',
        code: '7.1.1',
        title: '¿Se ejecutan auditorías internas periódicas para asegurar el cumplimiento de instructivos?',
        cascadeCondition: {
          parentQuestionId: 20,
          triggerOptionValues: ['formal_active', 'partial_dev']
        },
        options: [
          { value: 'formal_active', label: 'Sí, calendario de auditorías trimestrales con planes de acción', shortLabel: 'Auditorías fijas', maturityScore: 100, riskScore: 10 },
          { value: 'partial_dev', label: 'Solo antes de la auditoría externa de renovación', shortLabel: 'Solo previa', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'No se hacen auditorías internas', shortLabel: 'Sin auditorías', maturityScore: 10, riskScore: 85 }
        ]
      }
    ]
  },

  // 8. TECNOLOGÍA E INNOVACIÓN
  {
    id: 'area_8_tecnologia',
    number: 8,
    name: 'Tecnología, Digitalización e IA',
    icon: 'Cpu',
    pentagonAxis: 'Procesos',
    description: 'Sistemas ERP/CRM integrados, automatización de tareas y adopción de IA en procesos.',
    kpis: [
      { name: '% procesos digitalizados', unit: '%' },
      { name: 'N° herramientas integradas en la nube', unit: 'N°' }
    ],
    questions: [
      {
        id: 21,
        areaId: 'area_8_tecnologia',
        code: '8.1',
        title: '¿Utiliza un ERP o software de gestión empresarial integrado que unifique administración y ventas?',
        options: [
          { value: 'formal_active', label: 'Sí, ERP en la nube que integra compras, stock, facturación y contabilidad', shortLabel: 'ERP integrado', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Plataforma tecnológica integrada y datos en tiempo real.' } },
          { value: 'informal_active', label: 'Múltiples herramientas desconectadas (facturador por un lado, Excel por otro)', shortLabel: 'Fragmentado', maturityScore: 40, riskScore: 60, strategicImpact: { fodaType: 'debilidad', fodaText: 'Sistemas fragmentados que exigen doble carga de información.' } },
          { value: 'none_no_record', label: 'Gestión 100% en cuadernos o planillas manuales propensas a error', shortLabel: 'Manual', maturityScore: 0, riskScore: 90, strategicImpact: { riskCategory: 'Operativo', riskProbability: 'Alta', riskImpact: 'Alto', riskDescription: 'Falta de respaldo y riesgo de pérdida de datos críticos por obsolescencia tecnológica.' } }
        ]
      },
      {
        id: 22,
        areaId: 'area_8_tecnologia',
        code: '8.2',
        title: '¿Aplica herramientas de Inteligencia Artificial y automatizaciones para ahorrar horas operativas?',
        options: [
          { value: 'formal_active', label: 'Sí, IA y automatizaciones integradas en rutinas de oficina y minutas', shortLabel: 'IA integrada', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'oportunidad', fodaText: 'Ventaja de productividad y reducción drástica de tiempos administrativos mediante IA.' } },
          { value: 'partial_dev', label: 'Uso esporádico individual (ej. ChatGPT para redactar mails puntuales)', shortLabel: 'Uso personal', maturityScore: 45, riskScore: 55 },
          { value: 'none_no_record', label: 'No se utiliza IA ni automatizaciones en ningún proceso', shortLabel: 'Sin adopción de IA', maturityScore: 15, riskScore: 80 }
        ]
      }
    ]
  },

  // 9. GOBERNANZA Y SUCESIÓN
  {
    id: 'area_9_gobernanza',
    number: 9,
    name: 'Gobernanza, Directorio y Sucesión',
    icon: 'Briefcase',
    pentagonAxis: 'Directorio',
    description: 'Estructura societaria, política de incorporación de familiares y plan de retiro/sucesión.',
    kpis: [
      { name: 'Plan de sucesión formalizado (S/N)', unit: 'S/N' },
      { name: 'Política de familiares documentada', unit: 'S/N' }
    ],
    questions: [
      {
        id: 23,
        areaId: 'area_9_gobernanza',
        code: '9.1',
        title: '¿Existe una política expresa para el ingreso, remuneración y evaluación de familiares en la empresa?',
        options: [
          { value: 'formal_active', label: 'Sí, política escrita con requisitos de formación profesional y sueldos de mercado', shortLabel: 'Política escrita', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Profesionalización de la empresa familiar y reglas claras para parientes.' } },
          { value: 'informal_active', label: 'Criterio tácito pero sin reglas objetivas; genera fricciones ocasionales', shortLabel: 'Criterio tácito', maturityScore: 35, riskScore: 65, strategicImpact: { fodaType: 'debilidad', fodaText: 'Tensiones familiares por falta de pautas objetivas de ingreso y remuneración.' } },
          { value: 'none_no_record', label: 'Los familiares ingresan sin concurso ni perfil definido', shortLabel: 'Sin reglas', maturityScore: 0, riskScore: 90, strategicImpact: { riskCategory: 'Legal/Gobernanza', riskProbability: 'Media', riskImpact: 'Alto', riskDescription: 'Riesgo de conflicto entre la familia y la empresa que afecte la continuidad.' } }
        ]
      },
      {
        id: 24,
        areaId: 'area_9_gobernanza',
        code: '9.2',
        title: '¿Cuenta la empresa con un Plan de Sucesión formalizado ante el eventual retiro del fundador?',
        options: [
          { value: 'formal_active', label: 'Sí, sucesor perfilado y proceso de transición calendarizado', shortLabel: 'Sucesor perfilado', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Sostenibilidad intergeneracional asegurada con plan de sucesión.' } },
          { value: 'partial_dev', label: 'Se tiene una idea de quién podría suceder pero no se ha iniciado la formación', shortLabel: 'Idea preliminar', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'No se habla del tema; si falta el fundador el futuro de la empresa es incierto', shortLabel: 'Tabú / Inexistente', maturityScore: 0, riskScore: 95, strategicImpact: { fodaType: 'amenaza', fodaText: 'Vacío de poder y riesgo terminal ante pérdida repentina del líder.', riskCategory: 'Estratégico', riskProbability: 'Media', riskImpact: 'Crítico', riskDescription: 'Falta de plan de continuidad directiva para la próxima generación.' } }
        ]
      }
    ]
  },

  // 10. MATRIZ DE RIESGO Y CONTINUIDAD EMPRESARIA
  {
    id: 'area_10_riesgo',
    number: 10,
    name: 'Continuidad y Riesgo Empresario',
    icon: 'ShieldAlert',
    pentagonAxis: 'Finanzas',
    description: 'Matriz de contingencias, resiliencia ante crisis y blindaje patrimonial.',
    kpis: [
      { name: 'Índice de Riesgo Empresario (IRE)', unit: '0-100' },
      { name: 'N° riesgos en nivel crítico', unit: 'N°' }
    ],
    questions: [
      {
        id: 25,
        areaId: 'area_10_riesgo',
        code: '10.1',
        title: '¿Cuenta la empresa con una Matriz de Riesgos formal y planes de contingencia documentados?',
        options: [
          { value: 'formal_active', label: 'Sí, matriz de riesgos actualizada trimestralmente con medidas preventivas', shortLabel: 'Matriz formal', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Gestión proactiva de riesgos y cultura de resiliencia.' } },
          { value: 'partial_dev', label: 'Se conocen los riesgos mayores pero no hay un documento formal ni plan de contingencia', shortLabel: 'Intuitivo', maturityScore: 40, riskScore: 60 },
          { value: 'none_no_record', label: 'No se analizan riesgos; se reacciona cuando el problema ya ocurrió', shortLabel: 'Reaccionario', maturityScore: 0, riskScore: 95, strategicImpact: { fodaType: 'debilidad', fodaText: 'Vulnerabilidad ante imprevistos económicos, legales o climáticos.' } }
        ]
      },
      {
        id: 26,
        areaId: 'area_10_riesgo',
        code: '10.2',
        title: '¿Qué capacidad tiene la empresa para afrontar 3 meses con facturación reducida al 50%?',
        guide: 'Mide la robustez del fondo de reserva de liquidez.',
        options: [
          { value: 'formal_active', label: 'Puede operar más de 4 meses con reservas líquidas sin despedir personal', shortLabel: '> 4 meses (Sólido)', maturityScore: 100, riskScore: 10, strategicImpact: { fodaType: 'fortaleza', fodaText: 'Espalda financiera y solvencia para resistir shocks macroeconómicos.' } },
          { value: 'partial_dev', label: 'Puede sostenerse entre 1 y 2 meses pero requiriendo endeudamiento', shortLabel: '1 a 2 meses', maturityScore: 50, riskScore: 50 },
          { value: 'none_no_record', label: 'Menos de 30 días de reserva; entraría en cesación de pagos de inmediato', shortLabel: '< 30 días (Crítico)', maturityScore: 10, riskScore: 95, strategicImpact: { fodaType: 'amenaza', fodaText: 'Asfixia financiera inmediata ante retraso de cobros o caída de demanda.', riskCategory: 'Financiero', riskProbability: 'Alta', riskImpact: 'Crítico', riskDescription: 'Quiebra técnica por ausencia de colchón de liquidez ante crisis.' } }
        ]
      }
    ]
  }
];

// Helper to flatten questions including cascade subquestions
export function getAllDiagnosticQuestions(): DiagnosticQuestion[] {
  return DIAGNOSTIC_AREAS.flatMap(a => a.questions);
}
