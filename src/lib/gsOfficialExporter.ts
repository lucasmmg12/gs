import * as XLSX from 'xlsx';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { DIAGNOSTIC_AREAS } from '../data/diagnosticQuestions';
import type { ResponseOptionValue } from '../data/diagnosticQuestions';
import type { FullDiagnosticResults } from './diagnosticEngine';
import type { MasterPlanTaskItem, PentagonPeriod, RiskItem } from '../data/masterPlanData';
import { INITIAL_PENTAGON_DATA, INITIAL_RISKS } from '../data/masterPlanData';
import {
  DEFAULT_GS_AXES_META,
  DEFAULT_OMV_TARGETS,
  LIKERT_1_TO_5_QUESTION_IDS,
  OFFICIAL_IME_9_AREA_WEIGHTS,
  OFFICIAL_IRE_12_DIMENSIONS,
  type GSAxisStrategicMeta,
  type OMVTargetRow,
} from '../data/gsAxisMetadata';

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function sanitizeFileSlug(name: string): string {
  return (name || 'EJEMPLO_SAS')
    .trim()
    .replace(/[^a-zA-Z0-9ÁÉÍÓÚáéíóúÑñ_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const MONTH_MAP: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  set: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

function parseSpanishMonthYear(str?: string): number | null {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  const match = clean.match(/([a-záéíóú]{3,})\s*(\d{4})/);
  if (!match) return null;
  const mPrefix = match[1].slice(0, 3);
  const year = Number(match[2]);
  const monthIdx = MONTH_MAP[mPrefix];
  if (monthIdx === undefined || Number.isNaN(year)) return null;
  return year * 12 + monthIdx;
}

function buildGanttTimelineMonths(): { label: string; year: number; ym: number }[] {
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const list: { label: string; year: number; ym: number }[] = [];
  // Ago 2026 to Dic 2029 (41 months, identical to TEMPLATE.xlsx)
  for (let y = 2026; y <= 2029; y++) {
    const startM = y === 2026 ? 7 : 0;
    const endM = 11;
    for (let m = startM; m <= endM; m++) {
      list.push({ label: names[m], year: y, ym: y * 12 + m });
    }
  }
  return list;
}

export interface OfficialMasterPlanExportOptions {
  clientName: string;
  projectCode?: string; // e.g. '26-030' or '00-000'
  revision?: string; // e.g. '0', 'A', 'F'
  periodLabel?: string; // e.g. '2026 – 2029'
  consultantNames?: string;
  sector?: string;
  employeesLabel?: string;
  omvText?: string;
  globalIme?: number; // 0..100
  globalIre?: number; // 0..100
  axesMeta?: GSAxisStrategicMeta[];
  tasks: MasterPlanTaskItem[];
  taskWeights?: Record<string, number>; // optional custom incidence (0..100) per task.id
  pentagonPeriods?: PentagonPeriod[];
  risks?: RiskItem[];
}

/**
 * Generates the complete 6-Sheet Official GS Master Plan Strategic Workbook (.xlsx):
 * 1. PORTADA
 * 2. MPE (5 Ejes + Brecha + Iniciativa + OKRs + Jerarquía Iniciativa/Acción + Incidencia/Avance + Gantt 2026-2029)
 * 3. AVANCE-EJES (Puente matemático MPE -> IME + Control de Coherencia ±0.5 pp)
 * 4. PENT-PE (Scores Reales Trimestrales LB..M8..META + Escala 0-10 + IME Proyectado)
 * 5. MATRIZ DE RIESGOS (R-01..R-27 Inherente/Residual + Mapa de Calor COUNTIFS + Seguimiento Trimestral IRE)
 * 6. DATOS_PENT (Espejo de fórmulas para gráficos Radar)
 */
export function exportOfficialMasterPlanWorkbook(opts: OfficialMasterPlanExportOptions): void {
  const wb = XLSX.utils.book_new();
  const projectCode = (opts.projectCode || '00-000').trim();
  const revCode = (opts.revision || '0').replace(/^Rev/i, '').trim() || '0';
  const periodLabel = opts.periodLabel || '2026 – 2029';
  const consultantNames = opts.consultantNames || 'Martín Gómez  |  Lucía Fernández — GS Consultora';
  const issueDate = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const axesMeta = opts.axesMeta && opts.axesMeta.length === 5 ? opts.axesMeta : DEFAULT_GS_AXES_META;
  const pentagon = opts.pentagonPeriods && opts.pentagonPeriods.length > 0 ? opts.pentagonPeriods : INITIAL_PENTAGON_DATA;
  const risks = opts.risks && opts.risks.length > 0 ? opts.risks : INITIAL_RISKS;
  const safeSlug = sanitizeFileSlug(opts.clientName);

  const defaultOmv =
    opts.omvText ||
    `Síntesis del OMV consensuado por el Directorio (proyección a 3 años para ${opts.clientName}): 1) Transición operativa→estratégica con roles ordenados y gerencias formadas. 2) Protección legal y societaria mediante Estatuto de Convivencia / Protocolo de Socios. 3) Diversificación de ingresos en nuevas unidades de negocio. 4) Estabilidad financiera con flujo de caja proyectado y fondo de reserva segregado. 5) Procesos documentados bajo estándar de calidad y trazabilidad.`;

  const ime100 = opts.globalIme ?? 46;
  const ire100 = opts.globalIre ?? 53;

  // =========================================================================
  // SHEET 1: PORTADA
  // =========================================================================
  const portadaAoA: any[][] = [
    [],
    ['', opts.clientName.toUpperCase()],
    [],
    ['', `MASTER PLAN ESTRATÉGICO ${periodLabel}`],
    ['', 'Tutoría Estratégica GS Consultora  |  Sistema Metodológico Integrado PyME 2.0'],
    [],
    ['', 'VISIÓN TRIENAL — OBJETIVO MATERIAL VISUALIZADO (OMV)'],
    ['', defaultOmv],
    [],
    [],
    [],
    ['', 'DATOS DEL PLAN'],
    ['', 'Empresa:', opts.clientName],
    ['', 'Período del plan:', periodLabel],
    ['', 'Consultor responsable:', consultantNames],
    ['', 'Fecha de emisión:', issueDate],
    ['', 'Revisión:', revCode],
    ['', 'Proyecto GS:', projectCode],
    ['', 'Código documento:', `${projectCode}-${safeSlug.toUpperCase()}-MPE-2026-Rev${revCode}`],
    ['', 'Sector:', opts.sector || 'Servicios / PyME en Profesionalización'],
    ['', 'Empleados actuales:', opts.employeesLabel || 'En relevamiento'],
    ['', 'Ejes estratégicos:', 5],
    ['', 'Acciones totales:', opts.tasks.length],
    [
      '',
      'Avance:',
      `Línea base: Diagnóstico PyME 360° — IME ${ime100}/100 · IRE ${ire100}/100 · Seguimiento trimestral activo`,
    ],
    [],
    ['', 'ÍNDICE DEL WORKBOOK'],
    ['', 'PORTADA', 'Ficha de identificación, OMV y datos del plan'],
    ['', 'MPE', 'Master Plan Estratégico completo — 5 ejes, brechas, OKRs, ponderación y cronograma Gantt vinculado'],
    ['', 'AVANCE-EJES', 'Puente MPE → IME: avance ponderado por eje, score IME sugerido y control de coherencia contra el PENT-PE'],
    ['', 'PENT-PE', 'Pentágono del Orden — dashboard de madurez con curva real y proyectada (escala 0–10)'],
    ['', 'MATRIZ DE RIESGOS', 'Registro de riesgos organizacionales — nivel inherente/residual, mapa de calor y evolución trimestral IRE'],
    ['', 'DATOS_PENT', 'Tabla auxiliar vinculada en vivo para gráficos radar del Pentágono del Orden'],
    ['', 'INSTRUCCIONES DE USO'],
    ['', '1. Completar el ESTADO de cada acción en la hoja MPE: SIN INICIAR / EN PROCESO / FINALIZADO / RETRASADO / CANCELADO.'],
    ['', '2. Actualizar los scores del PENT-PE al finalizar cada hito trimestral (M1 = +3 meses, M2 = +6 meses, etc.).'],
    ['', '3. Revisar el Master Plan en cada sesión de tutoría y registrar compromisos en la Minuta de Seguimiento correspondiente.'],
    ['', '4. Cargar en la hoja MPE la INCIDENCIA (%) de cada acción dentro de su eje (suma = 100%) y su AVANCE A LA FECHA (%).'],
    ['', '5. REGLA DE COHERENCIA MPE ↔ PENT-PE: el avance ponderado de cada eje debe guardar coherencia con el score del Pentágono ÷ 10 (tolerancia ±0,5 pp en hoja AVANCE-EJES).'],
    ['', '6. REGLA DE COHERENCIA IME ↔ IRE: al cierre trimestral se recalifican Probabilidad e Impacto en MATRIZ DE RIESGOS; si sube el IME, el IRE debe reducirse proporcionalmente (±5 pp).'],
  ];
  const wsPortada = XLSX.utils.aoa_to_sheet(portadaAoA);
  wsPortada['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsPortada, 'PORTADA');

  // =========================================================================
  // SHEET 2: MPE (Master Plan + Incidencia/Avance + Gantt Mensual)
  // =========================================================================
  const ganttMonths = buildGanttTimelineMonths();
  const mpeAoA: any[][] = [];

  // Row 1 (index 0): blank
  mpeAoA.push([]);
  // Row 2 (index 1): Title
  const row2: any[] = new Array(21 + ganttMonths.length).fill('');
  row2[0] = `MASTER PLAN ESTRATÉGICO — ${opts.clientName.toUpperCase()}`;
  row2[21] = 'CRONOGRAMA DE SEGUIMIENTO (GANTT) — VINCULADO A LOS PLAZOS';
  mpeAoA.push(row2);

  // Row 3 (index 2): Metadata
  const row3: any[] = new Array(21 + ganttMonths.length).fill('');
  row3[1] = `Empresa: ${opts.clientName}`;
  row3[4] = `Período: ${periodLabel}`;
  row3[7] = `Fecha: ${issueDate} (Rev${revCode})`;
  row3[9] = `Rev.: ${revCode}`;
  row3[21] =
    'Barras generadas según PLAZO INICIO, PLAZO FIN y ESTADO: [■ FIN] finalizado · [▶ PROC] en proceso · [● PLAN] sin iniciar · [! RET] retrasado.';
  mpeAoA.push(row3);

  // Row 4 (index 3): OMV Banner + Year markers on Gantt
  const row4: any[] = new Array(21 + ganttMonths.length).fill('');
  row4[1] = `⭐ VISIÓN (OMV del Directorio): ${defaultOmv}`;
  row4[16] = '🗓️ PRÓXIMA MEDICIÓN TRIMESTRAL — completar celdas de avance';
  let prevYear = -1;
  ganttMonths.forEach((gm, idx) => {
    if (gm.year !== prevYear) {
      row4[21 + idx] = gm.year;
      prevYear = gm.year;
    }
  });
  mpeAoA.push(row4);

  // Row 5 (index 4): Column Headers (Row 5 in Excel -> 1-based row 5!)
  // Columns:
  // A(0): '' | B(1): EJE ESTRATÉGICO | C(2): BRECHA ASOCIADA | D(3): INICIATIVA ESTRATÉGICA | E(4): OKR
  // F(5): ACCIONES CLAVE | G(6): Prioridad | H(7): RESPONSABLE | I(8): PLAZO INICIO | J(9): PLAZO FIN
  // K(10): ESTADO | L(11): NIVEL | M(12): INCIDENCIA EN EL EJE (%) | N(13): AVANCE A LA FECHA (%)
  // O(14): INCIDENCIA POR AVANCE (%) | P(15): '' | Q(16): AVANCE PRÓX. TRIM. (%) | R(17): INCID. PRÓX. TRIM. (%)
  // S(18): Δ DEL PERÍODO (pp) | T(19): CONTROL ESTADO ↔ AVANCE | U(20): '' | V(21..): Meses Gantt
  const headerRow: any[] = [
    '',
    'EJE ESTRATÉGICO',
    'BRECHA ASOCIADA',
    'INICIATIVA ESTRATÉGICA',
    'OKR (OBJETIVOS Y RESULTADOS CLAVE)',
    'ACCIONES CLAVE',
    'Prioridad',
    'RESPONSABLE SUGERIDO',
    'PLAZO INICIO',
    'PLAZO FIN',
    'ESTADO',
    'NIVEL',
    'INCIDENCIA DE LA ACCIÓN EN EL EJE (%)',
    'AVANCE A LA FECHA (%)',
    'INCIDENCIA POR AVANCE (%)',
    '',
    'AVANCE PRÓX. MEDICIÓN (%)',
    'INCIDENCIA × AVANCE PRÓX. (%)',
    'Δ DEL PERÍODO (pp)',
    'CONTROL ESTADO ↔ AVANCE',
    '',
    ...ganttMonths.map((g) => g.label),
  ];
  mpeAoA.push(headerRow);

  // Track exact 1-based Excel rows for each Axis summary so AVANCE-EJES formulas link dynamically!
  const axisRowMap: Record<
    number,
    { startExcelRow: number; endActionExcelRow: number; summaryExcelRow: number }
  > = {};

  for (let axisIdx = 0; axisIdx < 5; axisIdx++) {
    const axisNum = axisIdx + 1;
    const meta = axesMeta[axisIdx];
    const axisTasks = opts.tasks.filter((t) => Number(t.axis) === axisNum);

    // Determine which tasks are parent INICIATIVA vs leaf ACCIÓN
    // A task is INICIATIVA if its code has no dot (e.g. "1", "2") AND there are child tasks starting with "1."
    const isParentMap = new Map<string, MasterPlanTaskItem[]>();
    axisTasks.forEach((t) => {
      const cleanCode = String(t.code || '').replace(/\.$/, '').trim();
      if (!cleanCode.includes('.')) {
        const children = axisTasks.filter((other) => {
          const otherClean = String(other.code || '').replace(/\.$/, '').trim();
          return other.id !== t.id && otherClean.startsWith(`${cleanCode}.`);
        });
        if (children.length > 0) {
          isParentMap.set(t.id, children);
        }
      }
    });

    const leafTasks = axisTasks.filter((t) => !isParentMap.has(t.id));
    const leafCount = Math.max(leafTasks.length, 1);

    // Compute normalized weights (sum = 1.0 across leaf actions in this axis)
    const leafWeightMap = new Map<string, number>();
    const customSum = leafTasks.reduce((acc, lt) => acc + (opts.taskWeights?.[lt.id] ?? 0), 0);
    if (customSum > 0) {
      leafTasks.forEach((lt) => {
        leafWeightMap.set(lt.id, Number(((opts.taskWeights?.[lt.id] ?? 0) / customSum).toFixed(4)));
      });
    } else {
      const baseW = Number((1 / leafCount).toFixed(4));
      let running = 0;
      leafTasks.forEach((lt, idx) => {
        if (idx === leafTasks.length - 1) {
          leafWeightMap.set(lt.id, Number((1 - running).toFixed(4)));
        } else {
          leafWeightMap.set(lt.id, baseW);
          running += baseW;
        }
      });
    }

    const startExcelRow = mpeAoA.length + 1; // 1-based Excel row

    if (axisTasks.length === 0) {
      // Fallback placeholder action if axis has no tasks
      const excelRow = mpeAoA.length + 1;
      const r: any[] = new Array(21 + ganttMonths.length).fill('');
      r[1] = meta.fullName;
      r[2] = meta.brechaAsociada;
      r[3] = meta.iniciativaEstrategica;
      r[4] = meta.okrText;
      r[5] = '1.1. Definir acciones específicas del eje en sesión de tutoría';
      r[6] = 'Alta';
      r[7] = 'Directorio + GS Consultora';
      r[8] = 'Ago 2026';
      r[9] = 'Dic 2026';
      r[10] = 'SIN INICIAR';
      r[11] = 'ACCIÓN';
      r[12] = 1;
      r[13] = 0;
      r[14] = { t: 'n', f: `IFERROR(M${excelRow}*N${excelRow},0)`, v: 0 };
      mpeAoA.push(r);
    } else {
      // Map task.id -> excelRow for parent SUM/SUMPRODUCT formulas
      const taskRowIndex = new Map<string, number>();
      axisTasks.forEach((t, idx) => {
        taskRowIndex.set(t.id, startExcelRow + idx);
      });

      axisTasks.forEach((task, idx) => {
        const excelRow = startExcelRow + idx;
        const r: any[] = new Array(21 + ganttMonths.length).fill('');
        if (idx === 0) {
          r[1] = meta.fullName;
          r[2] = meta.brechaAsociada;
          r[3] = meta.iniciativaEstrategica;
          r[4] = meta.okrText;
        }

        const formattedAction = `${task.code}. ${task.title}`.replace(/\.\./g, '.');
        r[5] = formattedAction;
        r[6] = task.priority || 'Alta';
        r[7] = task.assignedRole || 'Por definir';
        r[8] = task.startDate || 'Ago 2026';
        r[9] = task.dueDate || 'Dic 2026';
        r[10] = task.status || 'SIN INICIAR';

        const children = isParentMap.get(task.id);
        const progressDecimal =
          typeof task.progress === 'number' && task.progress > 0
            ? Math.min(1, Math.max(0, task.progress / 100))
            : task.status === 'FINALIZADO'
            ? 1
            : task.status === 'EN PROCESO' || task.status === 'RETRASADO'
            ? 0.5
            : 0;

        if (children && children.length > 0) {
          const firstChildRow = taskRowIndex.get(children[0].id) || excelRow + 1;
          const lastChildRow = taskRowIndex.get(children[children.length - 1].id) || excelRow + children.length;
          r[11] = 'INICIATIVA';
          r[12] = { t: 'n', f: `SUM(M${firstChildRow}:M${lastChildRow})` };
          r[13] = {
            t: 'n',
            f: `IFERROR(SUMPRODUCT(M${firstChildRow}:M${lastChildRow},N${firstChildRow}:N${lastChildRow})/SUM(M${firstChildRow}:M${lastChildRow}),0)`,
          };
          r[14] = { t: 'n', f: `SUM(O${firstChildRow}:O${lastChildRow})` };
          r[16] = '';
          r[17] = { t: 'n', f: `IF(COUNT(Q${firstChildRow}:Q${lastChildRow})=0,"",SUM(R${firstChildRow}:R${lastChildRow}))` };
          r[18] = { t: 'n', f: `IF($Q${excelRow}="","",ROUND(($Q${excelRow}-$N${excelRow})*100,1))` };
        } else {
          const w = leafWeightMap.get(task.id) ?? 0;
          r[11] = 'ACCIÓN';
          r[12] = w;
          r[13] = progressDecimal;
          r[14] = { t: 'n', f: `IFERROR(M${excelRow}*N${excelRow},0)`, v: Number((w * progressDecimal).toFixed(4)) };
          r[16] = '';
          r[17] = { t: 's', f: `IF($Q${excelRow}="","",$M${excelRow}*$Q${excelRow})`, v: '' };
          r[18] = { t: 's', f: `IF($Q${excelRow}="","",ROUND(($Q${excelRow}-$N${excelRow})*100,1))`, v: '' };
          r[19] = {
            t: 's',
            f: `IF(OR($K${excelRow}="",$K${excelRow}="CANCELADO"),"",IF(ABS($N${excelRow}-IF($K${excelRow}="FINALIZADO",1,IF(OR($K${excelRow}="EN PROCESO",$K${excelRow}="RETRASADO"),0.5,0)))<=0.25,"OK","REVISAR ESTADO"))`,
            v: 'OK',
          };
        }

        // Fill Gantt cells from startDate..dueDate
        const startYm = parseSpanishMonthYear(task.startDate);
        const endYm = parseSpanishMonthYear(task.dueDate);
        if (startYm !== null && endYm !== null) {
          const marker =
            task.status === 'FINALIZADO'
              ? '■'
              : task.status === 'EN PROCESO'
              ? '▶'
              : task.status === 'RETRASADO'
              ? '!'
              : '●';
          ganttMonths.forEach((gm, gIdx) => {
            if (gm.ym >= startYm && gm.ym <= endYm) {
              r[21 + gIdx] = marker;
            }
          });
        }

        mpeAoA.push(r);
      });
    }

    const endActionExcelRow = mpeAoA.length;
    // Axis Subtotal Row (used directly by AVANCE-EJES!)
    const summaryExcelRow = mpeAoA.length + 1;
    const sumRow: any[] = new Array(21 + ganttMonths.length).fill('');
    sumRow[1] = `SUBTOTAL ${meta.code} — ${meta.shortName.toUpperCase()}`;
    sumRow[5] = 'Total Incidencia y Avance Ponderado del Eje (sólo filas ACCIÓN)';
    sumRow[11] = 'SUBTOTAL_EJE';
    sumRow[12] = {
      t: 'n',
      f: `SUMIF(L${startExcelRow}:L${endActionExcelRow},"ACCIÓN",M${startExcelRow}:M${endActionExcelRow})`,
      v: 1,
    };
    sumRow[13] = {
      t: 'n',
      f: `IFERROR(O${summaryExcelRow}/M${summaryExcelRow},0)`,
    };
    sumRow[14] = {
      t: 'n',
      f: `SUMIF(L${startExcelRow}:L${endActionExcelRow},"ACCIÓN",O${startExcelRow}:O${endActionExcelRow})`,
    };
    sumRow[17] = {
      t: 's',
      f: `IF(COUNT(Q${startExcelRow}:Q${endActionExcelRow})=0,"",SUMIF(L${startExcelRow}:L${endActionExcelRow},"ACCIÓN",R${startExcelRow}:R${endActionExcelRow}))`,
      v: '',
    };
    mpeAoA.push(sumRow);
    // Blank separator row
    mpeAoA.push([]);

    axisRowMap[axisNum] = { startExcelRow, endActionExcelRow, summaryExcelRow };
  }

  const wsMpe = XLSX.utils.aoa_to_sheet(mpeAoA);
  wsMpe['!cols'] = [
    { wch: 3 },
    { wch: 28 },
    { wch: 48 },
    { wch: 42 },
    { wch: 46 },
    { wch: 52 },
    { wch: 11 },
    { wch: 24 },
    { wch: 13 },
    { wch: 13 },
    { wch: 15 },
    { wch: 13 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 3 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 3 },
    ...ganttMonths.map(() => ({ wch: 4.5 })),
  ];
  XLSX.utils.book_append_sheet(wb, wsMpe, 'MPE');

  // =========================================================================
  // SHEET 3: AVANCE-EJES (Puente MPE -> IME + Control de Coherencia)
  // =========================================================================
  const avanceAoA: any[][] = [
    [`${opts.clientName.toUpperCase()}  ·  PUENTE MPE → IME`],
    ['AVANCE PONDERADO POR EJE  ·  ALIMENTA EL CUADRO DE MEDICIONES DEL IME'],
    ['Todos los valores de esta hoja se calculan solos desde la hoja MPE y PENT-PE. No se cargan datos manuales aquí.'],
    [],
    [],
    [
      '',
      'EJE ESTRATÉGICO',
      'ACCIONES MEDIBLES',
      'INCIDENCIA CARGADA',
      'CONTROL = 100%',
      'AVANCE PONDERADO DEL EJE',
      'IME EQUIVALENTE DIRECTO (0-10)',
      'LÍNEA BASE (PENT-PE)',
      'META TRIENAL (PENT-PE)',
      'SCORE IME SUGERIDO (0-10)',
      'AVANCE OBJETIVO SEGÚN PENT-PE (score ÷ 10)',
      'DESVÍO (puntos %)',
      'CONTROL DE COHERENCIA (±0,5 pp)',
    ],
  ];

  for (let axisIdx = 0; axisIdx < 5; axisIdx++) {
    const axisNum = axisIdx + 1;
    const meta = axesMeta[axisIdx];
    const excelRow = 7 + axisIdx; // Rows 7..11
    const pentRow = 8 + axisIdx; // Rows 8..12 in PENT-PE
    const mapInfo = axisRowMap[axisNum];

    avanceAoA.push([
      '',
      meta.fullName,
      { t: 'n', f: `COUNTIF(MPE!$L$${mapInfo.startExcelRow}:$L$${mapInfo.endActionExcelRow},"ACCIÓN")` },
      { t: 'n', f: `MPE!M${mapInfo.summaryExcelRow}` },
      { t: 's', f: `IF(ROUND(D${excelRow},4)=1,"OK","REVISAR")` },
      { t: 'n', f: `MPE!O${mapInfo.summaryExcelRow}` },
      { t: 'n', f: `ROUND(F${excelRow}*10,1)` },
      { t: 'n', f: `'PENT-PE'!C${pentRow}` },
      { t: 'n', f: `'PENT-PE'!L${pentRow}` },
      { t: 'n', f: `ROUND(H${excelRow}+(I${excelRow}-H${excelRow})*F${excelRow},1)` },
      { t: 'n', f: `'PENT-PE'!M${pentRow}/10` },
      { t: 'n', f: `ROUND((F${excelRow}-K${excelRow})*100,1)` },
      { t: 's', f: `IF(K${excelRow}="","—",IF(ABS(L${excelRow})<=0.5,"COHERENTE","REVISAR"))` },
    ]);
  }

  // Row 12: Global Row
  avanceAoA.push([
    '',
    'AVANCE GLOBAL DEL MASTER PLAN  ·  IME GLOBAL SUGERIDO',
    { t: 'n', f: 'SUM(C7:C11)' },
    { t: 'n', f: 'AVERAGE(D7:D11)' },
    { t: 's', f: 'IF(COUNTIF(E7:E11,"OK")=5,"OK","REVISAR")' },
    { t: 'n', f: 'F7*0.15+F8*0.35+F9*0.15+F10*0.1+F11*0.25' },
    { t: 'n', f: 'ROUND(F12*10,1)' },
    { t: 'n', f: 'H7*0.15+H8*0.35+H9*0.15+H10*0.1+H11*0.25' },
    { t: 'n', f: 'I7*0.15+I8*0.35+I9*0.15+I10*0.1+I11*0.25' },
    { t: 'n', f: 'ROUND(J7*0.15+J8*0.35+J9*0.15+J10*0.1+J11*0.25,2)' },
    { t: 'n', f: 'K7*0.15+K8*0.35+K9*0.15+K10*0.1+K11*0.25' },
    { t: 'n', f: 'ROUND((F12-K12)*100,1)' },
    { t: 's', f: 'IF(ABS(L12)<=0.5,"COHERENTE","REVISAR")' },
  ]);

  avanceAoA.push(
    [],
    ['', 'CÓMO SE LEE Y CÓMO SE USA (REGLAS OFICIALES ESTUDIO GS)'],
    ['', '1. INCIDENCIA CARGADA debe dar 100% (1,00) en cada eje. Si CONTROL dice REVISAR, hay pesos mal distribuidos en la hoja MPE.'],
    ['', '2. AVANCE PONDERADO DEL EJE = Σ (incidencia × avance) de todas las acciones medibles del eje.'],
    ['', '3. SCORE IME SUGERIDO = Línea Base + (Meta − Línea Base) × avance. Respeta el punto de partida del Diagnóstico 360° y la Meta comprometida.'],
    ['', '4. VALIDACIÓN HUMANA OBLIGATORIA: El score sugerido NO se vuelca a ciegas al PENT-PE; el consultor GS lo valida contra evidencia real en tutoría.'],
    ['', '5. CONTROL DE COHERENCIA MPE ↔ PENT-PE: compara avance real vs. score del Pentágono ÷ 10 (tolerancia ±0,5 pp).']
  );

  const wsAvance = XLSX.utils.aoa_to_sheet(avanceAoA);
  wsAvance['!cols'] = [
    { wch: 3 },
    { wch: 46 },
    { wch: 16 },
    { wch: 16 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAvance, 'AVANCE-EJES');

  // =========================================================================
  // SHEET 4: PENT-PE (Pentágono del Orden — Real y Proyectado)
  // =========================================================================
  const findPeriod = (code: string) => pentagon.find((p) => p.periodCode === code);
  const lbP = findPeriod('LB');
  const metaP = findPeriod('META');

  const getAxisVal = (p: PentagonPeriod | undefined, axisIdx: number): number | '' => {
    if (!p) return '';
    const map = [p.gobernanza, p.procesos, p.finanzas, p.talento, p.comercial];
    return typeof map[axisIdx] === 'number' ? map[axisIdx] : '';
  };

  const pentAoA: any[][] = [
    [],
    [`PENTÁGONO DEL ORDEN  ·  ${opts.clientName.toUpperCase()}`],
    [`Sistema de Seguimiento de Madurez Estratégica ${periodLabel}  ·  Escala 0 – 10  ·  Medición cada 3 meses`],
    ['📌 INSTRUCCIÓN: Cargar scores de 0 a 10 en las columnas trimestrales (M1..M8) al cierre de cada revisión. El IME Actual se actualiza solo.'],
    [],
    ['', '📊 TABLA DE SCORES (REAL)  ·  Escala 0 – 10  ·  Validación conjunta Directorio + GS Consultora'],
    [
      '',
      'EJE ESTRATÉGICO',
      'Ago 2026\nLínea Base',
      'Nov 2026\n+ 3 meses (M1)',
      'Feb 2027\n+ 6 meses (M2)',
      'May 2027\n+ 9 meses (M3)',
      'Ago 2027\n+ 12 meses (M4)',
      'Nov 2027\n+ 15 meses (M5)',
      'Feb 2028\n+ 18 meses (M6)',
      'May 2028\n+ 21 meses (M7)',
      'Ago 2028\n+ 24 meses (M8)',
      'Dic 2029\nMeta',
      'IME Actual\n(0-10)',
    ],
  ];

  const mCodes = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];
  for (let axisIdx = 0; axisIdx < 5; axisIdx++) {
    const excelRow = 8 + axisIdx; // Rows 8..12
    const meta = axesMeta[axisIdx];
    const lbScore = getAxisVal(lbP, axisIdx) !== '' ? getAxisVal(lbP, axisIdx) : meta.baselineScore;
    const metaScore = getAxisVal(metaP, axisIdx) !== '' ? getAxisVal(metaP, axisIdx) : meta.targetScore;
    // Only fill M1..M8 if explicitly measured (not projected template)
    const mVals = mCodes.map((mc) => {
      const found = findPeriod(mc);
      // In INITIAL_PENTAGON_DATA M1..M8 are projected curves unless saved in quarterly reviews; leave blank unless explicitly marked real
      return found && (found as any).isRealMeasurement ? getAxisVal(found, axisIdx) : '';
    });

    pentAoA.push([
      '',
      meta.fullName,
      lbScore,
      ...mVals,
      metaScore,
      {
        t: 'n',
        f: `IF(K${excelRow}<>"",K${excelRow},IF(J${excelRow}<>"",J${excelRow},IF(I${excelRow}<>"",I${excelRow},IF(H${excelRow}<>"",H${excelRow},IF(G${excelRow}<>"",G${excelRow},IF(F${excelRow}<>"",F${excelRow},IF(E${excelRow}<>"",E${excelRow},IF(D${excelRow}<>"",D${excelRow},C${excelRow}))))))))`,
      },
    ]);
  }

  // Row 13: IME Weighted Formula Row (C13..M13)
  const colLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const imeFormulaCells = colLetters.map((col) => ({
    t: 'n',
    f: `IF(COUNT(${col}8:${col}12)=5,${col}8*0.15+${col}9*0.35+${col}10*0.15+${col}11*0.1+${col}12*0.25,"")`,
  }));
  pentAoA.push([
    '',
    'ÍNDICE DE MADUREZ EMPRESARIAL (IME)',
    ...imeFormulaCells,
    {
      t: 'n',
      f: 'IF(K13<>"",K13,IF(J13<>"",J13,IF(I13<>"",I13,IF(H13<>"",H13,IF(G13<>"",G13,IF(F13<>"",F13,IF(E13<>"",E13,IF(D13<>"",D13,C13))))))))',
    },
  ]);

  pentAoA.push(
    [
      '',
      'Nota metodológica: Línea Base derivada del Diagnóstico PyME 360° ponderando cada eje (E1 15% · E2 35% · E3 15% · E4 10% · E5 25%).',
    ],
    ['', '📐 ESCALA DE MADUREZ  ·  0 a 10  ·  Bandas de avance progresivo'],
    ['', 'Rango', 'Nivel', '', 'Descripción', '', '', 'Rango', 'Nivel', '', '', 'Descripción'],
    ['', '0–1', 'INEXISTENTE', '', 'Sin actividad ni estructura detectada.', '', '', '5–6', 'EN DESARROLLO', '', '', 'Procesos activos, medición incipiente.'],
    ['', '2–3', 'CRÍTICO', '', 'Acciones aisladas, sin proceso ni responsable.', '', '', '6–7', 'CONSOLIDADO', '', '', 'Sistema funcionando con métricas regulares.'],
    ['', '3–4', 'INICIAL', '', 'Intentos informales. Alta dependencia personal.', '', '', '7–8', 'GESTIONADO', '', '', 'Operación autónoma. Mejoras con datos.'],
    ['', '4–5', 'EN FORMACIÓN', '', 'Primeras prácticas definidas, no estandarizadas.', '', '', '8–9', 'AVANZADO', '', '', 'Alto desempeño, cultura instalada.'],
    ['', '5–6', 'EN DESARROLLO', '', 'Procesos activos, medición incipiente.', '', '', '9–10', 'OPTIMIZADO', '', '', 'Referente. Mejora continua sistematizada.']
  );

  // Pad up to row 41 so Projected table sits cleanly at Row 42..49 like TEMPLATE.xlsx!
  while (pentAoA.length < 41) {
    pentAoA.push([]);
  }

  pentAoA.push(
    ['', '🗺️ IME PROYECTADO — FASES DE AVANCE ESPERADO POR EJE  ·  Orientativas — ajustar según velocidad real de implementación'],
    [
      '',
      'EJE',
      'LB\nAgo 26',
      'M1\nNov 26',
      'M2\nFeb 27',
      'M3\nMay 27',
      'M4\nAgo 27',
      'M5\nNov 27',
      'M6\nFeb 28',
      'M7\nMay 28',
      'M8\nAgo 28',
      'META\nDic 29',
      'Criterio de avance',
    ]
  );

  axesMeta.forEach((meta) => {
    const c = meta.projectedCurve;
    pentAoA.push([
      '',
      `${meta.code} — ${meta.shortName}`,
      c.lb,
      c.m1,
      c.m2,
      c.m3,
      c.m4,
      c.m5,
      c.m6,
      c.m7,
      c.m8,
      c.meta,
      meta.criterioAvance,
    ]);
  });

  // Row 49: Projected Weighted IME
  pentAoA.push([
    '',
    'IME PROYECTADO (ponderado por peso de cada eje)',
    ...colLetters.map((col) => ({
      t: 'n',
      f: `${col}44*0.15+${col}45*0.35+${col}46*0.15+${col}47*0.1+${col}48*0.25`,
    })),
    '',
  ]);

  const wsPent = XLSX.utils.aoa_to_sheet(pentAoA);
  wsPent['!cols'] = [
    { wch: 3 },
    { wch: 44 },
    ...colLetters.map(() => ({ wch: 13 })),
    { wch: 52 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPent, 'PENT-PE');

  // =========================================================================
  // SHEET 5: MATRIZ DE RIESGOS (Inherente + Residual + Mapa de Calor + IRE Trimestral)
  // =========================================================================
  const riskStartRow = 5;
  const riskEndRow = riskStartRow + risks.length - 1;

  const riskAoA: any[][] = [
    [`MATRIZ DE RIESGOS  ·  ${opts.clientName.toUpperCase()}  ·  Registro de Riesgos Organizacionales`],
    [
      `Basada en el Diagnóstico PyME 360° (IME ${ime100}/100 · IRE ${ire100}/100) y el FODA/TOWS Ejecutivo  ·  GS Consultora · Proyecto ${projectCode}`,
    ],
    [
      'Uso: calificar Probabilidad (1–5) e Impacto (1–5); Nivel = P × I se calcula solo. Definir estrategia (Evitar / Mitigar / Transferir / Aceptar), vínculo con Master Plan, responsable por ROL y alerta temprana.',
    ],
    [
      'ID',
      'Categoría',
      'Riesgo',
      'Causa / Origen (diagnóstico)',
      'Consecuencia potencial',
      'Prob.\n(1-5)',
      'Imp.\n(1-5)',
      'Nivel\ninherente',
      'Estrategia de\nrespuesta',
      'Acciones de mitigación (vínculo con el Master Plan)',
      'Responsable\n(rol)',
      'Prob.\nresid.',
      'Imp.\nresid.',
      'Nivel\nresidual',
      'Indicador / Alerta temprana',
      '',
      'MAPA DE CALOR · RIESGO INHERENTE (Probabilidad × Impacto)',
    ],
  ];

  risks.forEach((rk, idx) => {
    const rNum = riskStartRow + idx; // 1-based Excel row (5..31)
    const row: any[] = new Array(24).fill('');
    row[0] = rk.code;
    row[1] = rk.category;
    row[2] = rk.riskName;
    row[3] = rk.cause;
    row[4] = rk.consequence;
    row[5] = rk.probInherent;
    row[6] = rk.impInherent;
    row[7] = { t: 'n', f: `F${rNum}*G${rNum}`, v: rk.probInherent * rk.impInherent };
    row[8] = rk.strategy;
    row[9] = rk.mitigationActions;
    row[10] = rk.responsibleRole;
    row[11] = rk.probResidual;
    row[12] = rk.impResidual;
    row[13] = { t: 'n', f: `L${rNum}*M${rNum}`, v: rk.probResidual * rk.impResidual };
    row[14] = rk.earlyWarningKpi;

    // Embed 5x5 Heat Map with live COUNTIFS in columns Q..W on rows 6..11
    const impactRowIdx = idx - 1; // idx 1..5 => Impact 5..1
    if (impactRowIdx >= 0 && impactRowIdx < 5) {
      const impactLevel = 5 - impactRowIdx;
      const impactLabels: Record<number, string> = {
        5: '5 · Crítico',
        4: '4 · Mayor',
        3: '3 · Moderado',
        2: '2 · Menor',
        1: '1 · Insignif.',
      };
      row[16] = impactRowIdx === 0 ? 'I M P A C T O' : '';
      row[17] = impactLabels[impactLevel];
      for (let probLevel = 1; probLevel <= 5; probLevel++) {
        row[17 + probLevel] = {
          t: 'n',
          f: `COUNTIFS($F$${riskStartRow}:$F$${riskEndRow},${probLevel},$G$${riskStartRow}:$G$${riskEndRow},${impactLevel})`,
        };
      }
    } else if (idx === 6) {
      row[18] = '1 · Muy baja';
      row[19] = '2 · Baja';
      row[20] = '3 · Media';
      row[21] = '4 · Alta';
      row[22] = '5 · Muy alta';
    }

    riskAoA.push(row);
  });

  riskAoA.push([]);
  const ireHeaderRow = riskAoA.length + 1;
  riskAoA.push([
    '📈 CUADRO DE ACTUALIZACIÓN DEL RIESGO TOTAL — ÍNDICE DE RIESGO EMPRESARIAL (IRE)  ·  Escala 0 – 100  ·  Medición cada 3 meses (alineada al PENT-PE)',
  ]);
  riskAoA.push([
    `Metodología: IRE = promedio de los niveles (Prob. × Imp., máx. 25) de los ${risks.length} riesgos del registro, normalizado a 0–100.`,
  ]);

  const kpiTitleRow = riskAoA.length + 1;
  const kpiValRow = kpiTitleRow + 1;
  riskAoA.push([
    '',
    'IRE INHERENTE — Línea Base',
    '',
    '',
    '',
    'IRE SEGÚN MATRIZ (vivo)',
    '',
    '',
    '',
    'IRE RESIDUAL — Meta cierre del plan',
    '',
    '',
    '',
    'Reducción de riesgo lograda (LB → Meta)',
  ]);

  const avgInh = Number(
    (
      (risks.reduce((acc, r) => acc + r.probInherent * r.impInherent, 0) / Math.max(risks.length, 1) / 25) *
      100
    ).toFixed(1)
  );
  riskAoA.push([
    '',
    avgInh,
    '',
    '',
    '',
    { t: 'n', f: `ROUND(AVERAGE(H${riskStartRow}:H${riskEndRow})/25*100,1)` },
    '',
    '',
    '',
    { t: 'n', f: `ROUND(AVERAGE(N${riskStartRow}:N${riskEndRow})/25*100,1)` },
    '',
    '',
    '',
    { t: 'n', f: `IF(B${kpiValRow}-J${kpiValRow}=0,0,(B${kpiValRow}-F${kpiValRow})/(B${kpiValRow}-J${kpiValRow}))` },
  ]);

  riskAoA.push([]);
  riskAoA.push(['', 'Medición', 'IRE (0–100)', 'Nivel', 'Observaciones / fuente']);

  const lbTrackRow = riskAoA.length + 1;
  const trackPeriods = [
    { code: 'LB · Ago 2026', val: avgInh, note: 'Línea base — matriz de riesgo inherente inicial (Diagnóstico PyME 360°).' },
    { code: 'M1 · Nov 2026', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 1° trimestre con evidencia de tutoría.' },
    { code: 'M2 · Feb 2027', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 2° trimestre.' },
    { code: 'M3 · May 2027', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 3° trimestre.' },
    { code: 'M4 · Ago 2027', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 4° trimestre.' },
    { code: 'M5 · Nov 2027', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 5° trimestre.' },
    { code: 'M6 · Feb 2028', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 6° trimestre.' },
    { code: 'M7 · May 2028', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 7° trimestre.' },
    { code: 'M8 · Ago 2028', val: '', note: 'Cargar el IRE SEGÚN MATRIZ al cierre del 8° trimestre.' },
  ];

  trackPeriods.forEach((tp, idx) => {
    const rNum = lbTrackRow + idx;
    riskAoA.push([
      '',
      tp.code,
      tp.val,
      {
        t: 's',
        f: `IF(C${rNum}="","",IF(C${rNum}>=80,"CRÍTICO",IF(C${rNum}>=60,"ALTO",IF(C${rNum}>=40,"MEDIO","BAJO"))))`,
      },
      tp.note,
    ]);
  });

  const lastMRow = lbTrackRow + trackPeriods.length - 1;
  const metaTrackRow = lastMRow + 1;
  const actualTrackRow = metaTrackRow + 1;

  riskAoA.push([
    '',
    'META · Dic 2029',
    { t: 'n', f: `ROUND(AVERAGE(N${riskStartRow}:N${riskEndRow})/25*100,1)` },
    {
      t: 's',
      f: `IF(C${metaTrackRow}="","",IF(C${metaTrackRow}>=80,"CRÍTICO",IF(C${metaTrackRow}>=60,"ALTO",IF(C${metaTrackRow}>=40,"MEDIO","BAJO"))))`,
    },
    'Meta — matriz de riesgo residual (asume la ejecución completa del Master Plan). Vinculada en vivo a columna N.',
  ]);

  riskAoA.push([
    '',
    'IRE ACTUAL',
    { t: 'n', f: `IFERROR(LOOKUP(2,1/(C${lbTrackRow}:C${lastMRow}<>""),C${lbTrackRow}:C${lastMRow}),C${lbTrackRow})` },
    {
      t: 's',
      f: `IF(C${actualTrackRow}="","",IF(C${actualTrackRow}>=80,"CRÍTICO",IF(C${actualTrackRow}>=60,"ALTO",IF(C${actualTrackRow}>=40,"MEDIO","BAJO"))))`,
    },
    'Última medición registrada (automático). Escala: 0–39 BAJO · 40–59 MEDIO · 60–79 ALTO · 80–100 CRÍTICO.',
  ]);

  void ireHeaderRow;

  const wsRisks = XLSX.utils.aoa_to_sheet(riskAoA);
  wsRisks['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 46 },
    { wch: 42 },
    { wch: 40 },
    { wch: 9 },
    { wch: 9 },
    { wch: 11 },
    { wch: 16 },
    { wch: 46 },
    { wch: 22 },
    { wch: 9 },
    { wch: 9 },
    { wch: 11 },
    { wch: 38 },
    { wch: 3 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRisks, 'MATRIZ DE RIESGOS');

  // =========================================================================
  // SHEET 6: DATOS_PENT (Espejo de fórmulas hacia PENT-PE para gráficos Radar)
  // =========================================================================
  const datosPentAoA: any[][] = [
    ['EJE', 'LB', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'META', 'ACTUAL'],
  ];
  const pentCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  axesMeta.forEach((meta, idx) => {
    const pRow = 8 + idx;
    datosPentAoA.push([
      meta.shortName,
      ...pentCols.map((c) => ({ t: 'n', f: `'PENT-PE'!${c}${pRow}` })),
    ]);
  });
  const wsDatosPent = XLSX.utils.aoa_to_sheet(datosPentAoA);
  XLSX.utils.book_append_sheet(wb, wsDatosPent, 'DATOS_PENT');

  const fileName = `${projectCode}_${safeSlug}-Master_Plan_Estrategico_Rev${revCode}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ============================================================================
// WORD (.DOCX) HELPERS — ESTÉTICA INSTITUCIONAL ESTUDIO GS (#6B1D2F & SLATE)
// ============================================================================
const GS_BURGUNDY = '6B1D2F';
const GS_DARK = '18181B';
const GS_BORDER = 'CBD5E1';
const GS_LIGHT_BG = 'F8FAFC';
const GS_ACCENT_BG = 'F9EFF2';

function thinBorders(color = GS_BORDER) {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.SINGLE, size: 4, color },
    right: { style: BorderStyle.SINGLE, size: 4, color },
  };
}

export interface OfficialMinuteDocxOptions {
  projectCode?: string; // e.g. '00-000' or '26-030'
  revision?: string; // e.g. '0'
  clientName: string;
  meetingTitle: string;
  meetingDate: string;
  motivo: string;
  attendeesGS: string[];
  attendeesClient: string[];
  topicsDiscussed: {
    title: string;
    intro?: string;
    points: string[];
  }[];
  commitments: {
    responsible: string;
    task: string;
    deadline: string;
  }[];
  reflection: string;
}

/**
 * Exports a real Microsoft Word (.docx) file strictly matching
 * `00-000-EJEMPLO_SAS-Minuta_de_Seguimiento_Rev0.docx`.
 */
export async function exportOfficialMinuteDocx(opts: OfficialMinuteDocxOptions): Promise<void> {
  const projectCode = (opts.projectCode || '00-000').trim();
  const rev = (opts.revision || '0').replace(/^Rev/i, '').trim() || '0';
  const safeClient = sanitizeFileSlug(opts.clientName);

  const gsList =
    opts.attendeesGS && opts.attendeesGS.length > 0
      ? opts.attendeesGS.join(', ')
      : 'Equipo Consultora GS';
  const clientList =
    opts.attendeesClient && opts.attendeesClient.length > 0
      ? opts.attendeesClient.join(', ')
      : `Directorio / Socios ${opts.clientName}`;

  const headerParagraph = new Paragraph({
    alignment: AlignmentType.RIGHT,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: GS_BURGUNDY },
    },
    spacing: { after: 160 },
    children: [
      new TextRun({
        text: `MINUTA DE SEGUIMIENTO  |  ${projectCode}-${rev}-${opts.clientName.toUpperCase()}-DESARROLLO Y TUTORÍA ESTRATÉGICA  |  ${opts.meetingDate}`,
        size: 16,
        bold: true,
        color: '64748B',
        font: 'Calibri',
      }),
    ],
  });

  // 1. Metadata 4-Row Table
  const metaRowsData: [string, Paragraph[]][] = [
    [
      'Título de la Reunión:',
      [
        new Paragraph({
          children: [new TextRun({ text: opts.meetingTitle || 'Acompañamiento en Desarrollo y Tutoría Estratégica', bold: true, size: 21, font: 'Calibri' })],
        }),
      ],
    ],
    [
      'Fecha:',
      [new Paragraph({ children: [new TextRun({ text: opts.meetingDate, size: 21, font: 'Calibri' })] })],
    ],
    [
      'Motivo:',
      [new Paragraph({ children: [new TextRun({ text: opts.motivo, size: 21, font: 'Calibri' })] })],
    ],
    [
      'Asistentes:',
      [
        new Paragraph({
          children: [
            new TextRun({ text: 'Consultora GS: ', bold: true, size: 20, font: 'Calibri' }),
            new TextRun({ text: gsList, size: 20, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${opts.clientName}: `, bold: true, size: 20, font: 'Calibri' }),
            new TextRun({ text: clientList, size: 20, font: 'Calibri' }),
          ],
        }),
      ],
    ],
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metaRowsData.map(
      ([label, valueParagraphs]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: GS_ACCENT_BG },
              borders: thinBorders(),
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label,
                      bold: true,
                      color: GS_BURGUNDY,
                      size: 20,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 76, type: WidthType.PERCENTAGE },
              borders: thinBorders(),
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: valueParagraphs,
            }),
          ],
        })
    ),
  });

  // 2. TEMAS TRATADOS
  const topicParagraphs: Paragraph[] = [];
  opts.topicsDiscussed.forEach((topic, idx) => {
    const cleanTitle = topic.title.replace(/^\d+\.\s*/, '').toUpperCase();
    topicParagraphs.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: `${idx + 1}. ${cleanTitle}`,
            bold: true,
            size: 23,
            color: GS_BURGUNDY,
            font: 'Calibri',
          }),
        ],
      })
    );

    if (topic.intro) {
      topicParagraphs.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: topic.intro, size: 21, font: 'Calibri' })],
        })
      );
    }

    topic.points.forEach((pt) => {
      const cleaned = pt.replace(/\*\*/g, '').trim();
      const colonIdx = cleaned.indexOf(':');
      const hasLeadConcept = colonIdx > 2 && colonIdx < 75;

      topicParagraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 90 },
          children: hasLeadConcept
            ? [
                new TextRun({
                  text: cleaned.slice(0, colonIdx + 1),
                  bold: true,
                  size: 21,
                  font: 'Calibri',
                }),
                new TextRun({
                  text: cleaned.slice(colonIdx + 1),
                  size: 21,
                  font: 'Calibri',
                }),
              ]
            : [new TextRun({ text: cleaned, size: 21, font: 'Calibri' })],
        })
      );
    });
  });

  // 3. LOGÍSTICA Y PRÓXIMOS PASOS (3-Column Official Table)
  const commitmentsList =
    opts.commitments && opts.commitments.length > 0
      ? opts.commitments
      : [
          {
            responsible: `Socios ${opts.clientName}`,
            task: 'Revisar avances y fechas comprometidas de las actividades activas del Master Plan.',
            deadline: 'Próxima sesión',
          },
          {
            responsible: 'Consultora GS',
            task: 'Consolidar actualización de indicadores y seguimiento metodológico del eje trabajado.',
            deadline: 'Próxima semana',
          },
        ];

  const commitmentsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Responsable', 'Tema a tratar', 'Fecha de entrega'].map(
          (colTitle, cIdx) =>
            new TableCell({
              width: { size: cIdx === 1 ? 56 : 22, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: GS_BURGUNDY },
              borders: thinBorders(GS_BURGUNDY),
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: colTitle,
                      bold: true,
                      color: 'FFFFFF',
                      size: 20,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
      ...commitmentsList.map(
        (c) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
                margins: { top: 90, bottom: 90, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: c.responsible, bold: true, size: 20, font: 'Calibri' })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 56, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
                margins: { top: 90, bottom: 90, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: c.task, size: 20, font: 'Calibri' })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
                margins: { top: 90, bottom: 90, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: c.deadline, size: 20, font: 'Calibri' })],
                  }),
                ],
              }),
            ],
          })
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [headerParagraph],
          }),
        },
        children: [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'MINUTA DE SEGUIMIENTO',
                bold: true,
                size: 32,
                color: GS_BURGUNDY,
                font: 'Calibri',
              }),
            ],
          }),
          metaTable,
          new Paragraph({
            spacing: { before: 320, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GS_BURGUNDY } },
            children: [
              new TextRun({
                text: 'TEMAS TRATADOS',
                bold: true,
                size: 26,
                color: GS_DARK,
                font: 'Calibri',
              }),
            ],
          }),
          ...topicParagraphs,
          new Paragraph({
            spacing: { before: 340, after: 140 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GS_BURGUNDY } },
            children: [
              new TextRun({
                text: 'LOGÍSTICA Y PRÓXIMOS PASOS',
                bold: true,
                size: 26,
                color: GS_DARK,
                font: 'Calibri',
              }),
            ],
          }),
          commitmentsTable,
          new Paragraph({
            spacing: { before: 320, after: 120 },
            shading: { type: ShadingType.CLEAR, fill: GS_LIGHT_BG },
            children: [
              new TextRun({
                text: 'Reflexión: ',
                bold: true,
                italics: true,
                color: GS_BURGUNDY,
                size: 21,
                font: 'Calibri',
              }),
              new TextRun({
                text:
                  opts.reflection ||
                  `El avance sostenido de ${opts.clientName} radica en transformar el conocimiento operativo de los socios fundadores en procesos, métricas y acuerdos escritos que funcionen con autonomía, acercando a la organización paso a paso a su Objetivo Material Visualizado.`,
                italics: true,
                size: 21,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${projectCode}-${safeClient}-Minuta_de_Seguimiento_Rev${rev}.docx`);
}

export interface OfficialDiagnostic360DocxOptions {
  client: {
    name: string;
    rubro?: string;
    location?: string;
    website?: string;
    respondent?: string;
  };
  projectCode?: string;
  sessionNumber?: string;
  consultantName?: string;
  reviewerName?: string;
  omvText?: string;
  omvTargets?: OMVTargetRow[];
  answers: Record<number, ResponseOptionValue>;
  qualitativeMap?: Record<number, { answer: string; quote?: string; updatedAt?: string }>;
  areaKpiValues?: Record<string, string>; // key: `${areaId}_${kpiName}`
  likertOverrides?: Record<number, number>; // 1..5 for Likert questions
  results: FullDiagnosticResults;
}

function optionToLikert1to5(questionId: number, opt?: ResponseOptionValue, override?: number): number | null {
  if (override && override >= 1 && override <= 5) return override;
  if (!opt) return null;
  // Question 6 & 74 are inverse (1 = Nunca/Muy baja, 5 = Siempre me consume/Muy alta)
  const isInverse = questionId === 6 || questionId === 74;
  const baseMap: Record<ResponseOptionValue, number> = {
    formal_active: 5,
    informal_active: 4,
    partial_dev: 3,
    none_no_record: 1,
    unknown_na: 2,
  };
  const val = baseMap[opt] || 3;
  return isInverse ? 6 - val : val;
}

/**
 * Exports the complete Official GS Diagnostic 360° Form (.docx) strictly matching
 * `GS_Diagnostico_360_EJEMPLO_SAS_Generico.docx`:
 * - Ficha de empresa + Código Cliente
 * - Pregunta Central CVA (OMV en presente) + Tabla de 8 Valores TARGET a 3 años
 * - 10 Áreas · Preguntas con texto libre + 8 escalas Likert 1-5 con casilleros ☐/☒ + 10 Tablas de KPIs por Área
 * - Cierre Reflexión (P75..P78)
 * - Matriz IRE (12 dimensiones ponderadas = 100%) + Tabla IME por Área (9 áreas = 100%) + Lectura IME × IRE
 */
export async function exportOfficialDiagnostic360Docx(opts: OfficialDiagnostic360DocxOptions): Promise<void> {
  const safeClient = sanitizeFileSlug(opts.client.name);
  const projectCode = opts.projectCode || '00-000';
  const todayStr = new Date().toLocaleDateString('es-AR');
  const targets = opts.omvTargets && opts.omvTargets.length > 0 ? opts.omvTargets : DEFAULT_OMV_TARGETS;

  const children: (Paragraph | Table)[] = [];

  // Institutional Title Banner
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'GS CONSULTORA', bold: true, size: 28, color: GS_BURGUNDY, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: 'Desarrollo y Aceleración de PyMEs', size: 20, color: '475569', font: 'Calibri' }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: GS_DARK },
              borders: thinBorders(GS_DARK),
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `FORMULARIO DE DIAGNÓSTICO INTEGRAL 360° — ${opts.client.name.toUpperCase()}`,
                      bold: true,
                      color: 'FFFFFF',
                      size: 24,
                      font: 'Calibri',
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '10 Áreas · 78 Preguntas · KPIs por Área · Visión CVA · IME + IRE',
                      color: 'FCA5A5',
                      size: 18,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Company Identification 7-Row Table
  const companyRows: [string, string, string, string][] = [
    ['Nombre de la empresa', opts.client.name, 'Código cliente:', projectCode],
    ['Razón social', opts.client.name, 'Consultor:', opts.consultantName || 'Equipo Consultora GS'],
    ['Sector / Rubro', opts.client.rubro || 'PyME', 'Sesión N°:', opts.sessionNumber || 'Consolidado'],
    ['Ubicación', opts.client.location || 'Argentina', 'Revisado por:', opts.reviewerName || 'Dirección GS'],
    ['Web', opts.client.website || '—', 'Fecha revisión:', todayStr],
    ['Respondente / Cargo', opts.client.respondent || 'Directorio / Socios', 'Versión form.:', '2.0 — Oficial GS'],
    ['Fecha de completado', todayStr, 'Marco:', 'CVA · IME · IRE'],
  ];

  children.push(
    new Paragraph({
      spacing: { before: 220, after: 80 },
      children: [new TextRun({ text: 'Datos de la empresa', bold: true, size: 22, color: GS_DARK, font: 'Calibri' })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: companyRows.map(
        ([k1, v1, k2, v2]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: GS_LIGHT_BG },
                borders: thinBorders(),
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: k1, bold: true, size: 18, font: 'Calibri' })] })],
              }),
              new TableCell({
                width: { size: 32, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: v1, size: 18, font: 'Calibri' })] })],
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: GS_LIGHT_BG },
                borders: thinBorders(),
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: k2, bold: true, size: 18, font: 'Calibri' })] })],
              }),
              new TableCell({
                width: { size: 26, type: WidthType.PERCENTAGE },
                borders: thinBorders(),
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: v2, size: 18, font: 'Calibri' })] })],
              }),
            ],
          })
      ),
    })
  );

  // Pregunta Central — Enfoque CVA (OMV) + 8 Targets Table
  children.push(
    new Paragraph({
      spacing: { before: 260, after: 80 },
      children: [
        new TextRun({
          text: '⭐ PREGUNTA CENTRAL — ENFOQUE CVA (OBJETIVO MATERIAL VISUALIZADO — OMV A 3 AÑOS)',
          bold: true,
          size: 22,
          color: GS_BURGUNDY,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `OMV. ¿Cómo ve a ${opts.client.name} dentro de 3 años, con todos sus objetivos cumplidos? (Redactado en tiempo presente):`,
          bold: true,
          size: 19,
          font: 'Calibri',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: GS_ACCENT_BG },
              borders: thinBorders(GS_BURGUNDY),
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text:
                        opts.omvText ||
                        '[Pendiente de consolidar en sesión de Kickoff / OMV junto al Directorio]',
                      size: 20,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 180, after: 80 },
      children: [
        new TextRun({ text: '📊 Valores TARGET a 3 años (Enfoque CVA)', bold: true, size: 20, color: GS_DARK, font: 'Calibri' }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Indicador / KPI', 'Unidad', 'Valor actual', 'Target a 3 años (OMV)'].map(
            (h, i) =>
              new TableCell({
                width: { size: i === 0 ? 36 : i === 1 ? 14 : 25, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: GS_DARK },
                borders: thinBorders(GS_DARK),
                margins: { top: 70, bottom: 70, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
              })
          ),
        }),
        ...targets.map(
          (t) =>
            new TableRow({
              children: [t.indicator, t.unit, t.currentValue, t.target3Years].map(
                (val, i) =>
                  new TableCell({
                    borders: thinBorders(),
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: val || '—', bold: i === 0, size: 18, font: 'Calibri' })],
                      }),
                    ],
                  })
              ),
            })
        ),
      ],
    })
  );

  // 10 Areas + Official Questions (1..78 first, then annex if >78) + KPI table per area
  DIAGNOSTIC_AREAS.forEach((area) => {
    children.push(
      new Paragraph({
        spacing: { before: 320, after: 60 },
        shading: { type: ShadingType.CLEAR, fill: GS_ACCENT_BG },
        children: [
          new TextRun({
            text: `ÁREA ${area.number} — ${area.name.toUpperCase()}`,
            bold: true,
            size: 23,
            color: GS_BURGUNDY,
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: area.description, italics: true, size: 18, color: '475569', font: 'Calibri' })],
      })
    );

    // Official v2.0 core questions (id <= 78) + complementary questions clearly labeled
    area.questions.forEach((q) => {
      const optVal = opts.answers[q.id];
      const selectedOpt = q.options.find((o) => o.value === optVal);
      const qual = opts.qualitativeMap?.[q.id];
      const likertLabels = LIKERT_1_TO_5_QUESTION_IDS[q.id];

      children.push(
        new Paragraph({
          spacing: { before: 140, after: 40 },
          children: [
            new TextRun({
              text: `${q.id}. ${q.title}`,
              bold: true,
              size: 19,
              color: GS_DARK,
              font: 'Calibri',
            }),
          ],
        })
      );

      if (q.guide || q.kpi) {
        children.push(
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: `${q.guide ? `💡 ${q.guide}` : ''}${q.guide && q.kpi ? '  |  ' : ''}${q.kpi ? `📊 KPI: ${q.kpi}` : ''}`,
                size: 17,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
          })
        );
      }

      if (likertLabels) {
        const chosen1to5 = optionToLikert1to5(q.id, optVal, opts.likertOverrides?.[q.id]);
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: likertLabels.map((lbl, idx) => {
                  const num = idx + 1;
                  const checked = chosen1to5 === num;
                  return new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: checked ? { type: ShadingType.CLEAR, fill: GS_ACCENT_BG } : undefined,
                    borders: thinBorders(checked ? GS_BURGUNDY : GS_BORDER),
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `${num} · ${lbl}  ${checked ? '☒' : '☐'}`,
                            bold: checked,
                            color: checked ? GS_BURGUNDY : GS_DARK,
                            size: 17,
                            font: 'Calibri',
                          }),
                        ],
                      }),
                    ],
                  });
                }),
              }),
            ],
          })
        );
      }

      const narrativeText =
        qual?.answer ||
        (selectedOpt ? `[Nivel relevado: ${selectedOpt.shortLabel}] — ${selectedOpt.label}` : '[Sin responder aún]');

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: thinBorders(),
                  margins: { top: 80, bottom: 80, left: 110, right: 110 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: narrativeText,
                          size: 19,
                          color: qual?.answer || selectedOpt ? GS_DARK : '94A3B8',
                          font: 'Calibri',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });

    // Area Quantitative KPI Table
    if (area.kpis && area.kpis.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({
              text: `📊 KPIs — ${area.name}`,
              bold: true,
              size: 19,
              color: GS_BURGUNDY,
              font: 'Calibri',
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: ['Indicador / KPI', 'Unidad', 'Valor actual'].map(
                (h, i) =>
                  new TableCell({
                    width: { size: i === 0 ? 52 : 24, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: GS_LIGHT_BG },
                    borders: thinBorders(),
                    margins: { top: 60, bottom: 60, left: 90, right: 90 },
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, font: 'Calibri' })] })],
                  })
              ),
            }),
            ...area.kpis.map((kpi) => {
              const key = `${area.id}_${kpi.name}`;
              const val = opts.areaKpiValues?.[key] || kpi.baseline || '';
              return new TableRow({
                children: [kpi.name, kpi.unit, val || '—'].map(
                  (cellVal) =>
                    new TableCell({
                      borders: thinBorders(),
                      margins: { top: 55, bottom: 55, left: 90, right: 90 },
                      children: [new Paragraph({ children: [new TextRun({ text: cellVal, size: 18, font: 'Calibri' })] })],
                    })
                ),
              });
            }),
          ],
        })
      );
    }
  });

  // Final Section: IRE 12 Weighted Dimensions + IME 9 Weighted Areas
  children.push(
    new Paragraph({
      spacing: { before: 340, after: 80 },
      children: [
        new TextRun({
          text: '🛡️ ANÁLISIS DE RIESGOS — IRE (Índice de Riesgo Empresario · 12 Dimensiones Ponderadas)',
          bold: true,
          size: 22,
          color: GS_BURGUNDY,
          font: 'Calibri',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Dimensión', 'Peso', 'Prob. (1-5)', 'Imp. (1-5)', 'Expos. (1-25)', 'Acción de mitigación prevista'].map(
            (h, i) =>
              new TableCell({
                width: { size: i === 0 ? 24 : i === 5 ? 36 : 10, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: GS_DARK },
                borders: thinBorders(GS_DARK),
                margins: { top: 65, bottom: 65, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
              })
          ),
        }),
        ...OFFICIAL_IRE_12_DIMENSIONS.map((dim) => {
          const exp = dim.defaultProb * dim.defaultImp;
          return new TableRow({
            children: [
              `${dim.code} · ${dim.name}`,
              `${Math.round(dim.weight * 100)}%`,
              String(dim.defaultProb),
              String(dim.defaultImp),
              String(exp),
              dim.defaultMitigation,
            ].map(
              (v, idx) =>
                new TableCell({
                  borders: thinBorders(),
                  margins: { top: 55, bottom: 55, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: v, bold: idx === 0 || idx === 4, size: 17, font: 'Calibri' })],
                    }),
                  ],
                })
            ),
          });
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 280, after: 80 },
      children: [
        new TextRun({
          text: `📊 USO INTERNO GS — RESUMEN DE SCORES POR ÁREA (IME Global: ${opts.results.globalIme}/100  ·  IRE Global: ${opts.results.globalIre}/100)`,
          bold: true,
          size: 21,
          color: GS_DARK,
          font: 'Calibri',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Área', 'Peso Oficial', 'Score (0-100)', 'Ponderado', 'Estado'].map(
            (h, i) =>
              new TableCell({
                width: { size: i === 0 ? 38 : 15.5, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: GS_BURGUNDY },
                borders: thinBorders(GS_BURGUNDY),
                margins: { top: 65, bottom: 65, left: 80, right: 80 },
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
              })
          ),
        }),
        ...OFFICIAL_IME_9_AREA_WEIGHTS.map((aw) => {
          const found = opts.results.areaScores.find((a) => a.areaNumber === aw.areaNumber);
          const sc = found ? found.imeScore : 0;
          const pond = (sc * aw.weight).toFixed(1);
          const sem = sc >= 70 ? 'Consolidado' : sc >= 45 ? 'En desarrollo' : 'Crítico / Inicial';
          return new TableRow({
            children: [aw.name, `${Math.round(aw.weight * 100)}%`, `${sc}/100`, pond, sem].map(
              (v, idx) =>
                new TableCell({
                  borders: thinBorders(),
                  margins: { top: 55, bottom: 55, left: 80, right: 80 },
                  children: [new Paragraph({ children: [new TextRun({ text: v, bold: idx === 0, size: 17, font: 'Calibri' })] })],
                })
            ),
          });
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: 'GS Consultora  |  Sistema Metodológico Integrado PyME 2.0 — Documento Confidencial',
          italics: true,
          size: 17,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `GS_Diagnostico_360_${safeClient}.docx`);
}

export interface OwnerMeetingBriefDocxOptions {
  clientName: string;
  meetingTypeLabel: string;
  counterpart: string;
  goal: string;
  briefSections: { heading: string; bullets: string[] }[];
}

/**
 * Exports an Executive Pre-Meeting Brief (.docx) for the Business Owner inside the Client Portal.
 */
export async function exportOwnerMeetingBriefDocx(opts: OwnerMeetingBriefDocxOptions): Promise<void> {
  const safeClient = sanitizeFileSlug(opts.clientName);
  const dateStr = new Date().toLocaleDateString('es-AR');

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `BRIEF EJECUTIVO DE PREPARACIÓN DE REUNIÓN — ${opts.clientName.toUpperCase()}`,
                bold: true,
                size: 26,
                color: GS_BURGUNDY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `Generado por Copiloto Ejecutivo GS  ·  Fecha: ${dateStr}  ·  Tipo: ${opts.meetingTypeLabel}`,
                size: 18,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              ['Interlocutor / Mesa:', opts.counterpart || 'Directorio / Contraparte clave'],
              ['Objetivo buscado:', opts.goal || 'Alinear decisiones con el OMV y Master Plan vigente'],
            ].map(
              ([k, v]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 28, type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.CLEAR, fill: GS_ACCENT_BG },
                      borders: thinBorders(),
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, color: GS_BURGUNDY, size: 19, font: 'Calibri' })] })],
                    }),
                    new TableCell({
                      width: { size: 72, type: WidthType.PERCENTAGE },
                      borders: thinBorders(),
                      margins: { top: 80, bottom: 80, left: 120, right: 120 },
                      children: [new Paragraph({ children: [new TextRun({ text: v, size: 19, font: 'Calibri' })] })],
                    }),
                  ],
                })
            ),
          }),
          ...opts.briefSections.flatMap((sec) => [
            new Paragraph({
              spacing: { before: 220, after: 80 },
              children: [
                new TextRun({
                  text: sec.heading.toUpperCase(),
                  bold: true,
                  size: 21,
                  color: GS_DARK,
                  font: 'Calibri',
                }),
              ],
            }),
            ...sec.bullets.map(
              (b) =>
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 70 },
                  children: [new TextRun({ text: b, size: 20, font: 'Calibri' })],
                })
            ),
          ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `Brief_Reunion_${safeClient}_${new Date().toISOString().slice(0, 10)}.docx`);
}
