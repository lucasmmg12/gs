import JSZip from 'jszip';
import type { MasterPlanTaskItem, PentagonPeriod, RiskItem } from '../data/masterPlanData';
import { INITIAL_PENTAGON_DATA, INITIAL_RISKS } from '../data/masterPlanData';
import { DEFAULT_GS_AXES_META, type GSAxisStrategicMeta } from '../data/gsAxisMetadata';
import type { FullDiagnosticResults } from './diagnosticEngine';
import { supabase } from './supabase';

const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const SPANISH_MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const MONTH_LOOKUP: Record<string, number> = {
  ene: 0,
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  sep: 8,
  set: 8,
  sept: 8,
  septiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
};

export interface TemplateMappedExportInput {
  clientId?: string;
  clientName: string;
  projectCode?: string;
  revision?: string;
  periodLabel?: string;
  consultantNames?: string;
  sector?: string;
  employeesLabel?: string;
  omvText?: string;
  globalIme?: number; // 0..100
  globalIre?: number; // 0..100
  maturityLabel?: string;
  axesMeta?: GSAxisStrategicMeta[];
  tasks: MasterPlanTaskItem[];
  pentagonPeriods?: PentagonPeriod[];
  diagnosticResults?: FullDiagnosticResults;
  quarterlyReviews?: Array<{
    quarter?: string;
    pentagon_scores?: {
      gobernanza: number;
      procesos: number;
      finanzas: number;
      talento: number;
      comercial: number;
    };
    ire_score?: number;
  }>;
  risks?: RiskItem[];
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sanitizeSlug(name: string): string {
  return (name || 'EJEMPLO_SAS')
    .trim()
    .replace(/[^a-zA-Z0-9ÁÉÍÓÚáéíóúÑñ_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function colIndexToLetter(colIdx1Based: number): string {
  let n = colIdx1Based;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function colRefToIndex(cellRef: string): number {
  const letters = cellRef.replace(/\d+$/, '');
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx;
}

function serializeXmlDoc(doc: XMLDocument): string {
  const raw = new XMLSerializer().serializeToString(doc);
  if (raw.startsWith('<?xml')) return raw;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${raw}`;
}

function getOrCreateCellSorted(doc: XMLDocument, rowEl: Element, cellRef: string): Element {
  const existing = findCellInRow(rowEl, cellRef);
  if (existing) return existing;

  const targetColIdx = colRefToIndex(cellRef);
  const newCell = doc.createElementNS(SPREADSHEET_NS, 'c');
  newCell.setAttribute('r', cellRef);

  const cells = rowEl.getElementsByTagName('c');
  for (let i = 0; i < cells.length; i++) {
    const cRef = cells[i].getAttribute('r') || '';
    if (colRefToIndex(cRef) > targetColIdx) {
      rowEl.insertBefore(newCell, cells[i]);
      return newCell;
    }
  }
  rowEl.appendChild(newCell);
  return newCell;
}

/**
 * Ensures any date string ("Ago 2026", "2027-03-15", "Set 2026", "90 días") converts to strict
 * "Mes AAAA" within Ago 2026 .. Dic 2029 so Excel's Gantt Conditional Formatting formula works 100%.
 */
export function normalizeGanttMonthYear(raw: string | undefined, fallback = 'Ago 2026'): string {
  if (!raw || !raw.trim()) return fallback;
  const s = raw.trim();

  // Relative days e.g. "90 días", "180 días"
  const daysMatch = s.match(/(\d+)\s*d[ií]as/i);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    const base = new Date(2026, 7, 1); // Ago 2026
    base.setMonth(base.getMonth() + Math.max(1, Math.round(days / 30)));
    const y = Math.min(2029, Math.max(2026, base.getFullYear()));
    const m = y === 2026 ? Math.max(7, base.getMonth()) : base.getMonth();
    return `${SPANISH_MONTHS_SHORT[m]} ${y}`;
  }

  // ISO date YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const y = Math.min(2029, Math.max(2026, Number(isoMatch[1])));
    const mRaw = Math.min(11, Math.max(0, Number(isoMatch[2]) - 1));
    const m = y === 2026 ? Math.max(7, mRaw) : mRaw;
    return `${SPANISH_MONTHS_SHORT[m]} ${y}`;
  }

  // DD/MM/YYYY
  const dmyMatch = s.match(/^\d{1,2}\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const y = Math.min(2029, Math.max(2026, Number(dmyMatch[2])));
    const mRaw = Math.min(11, Math.max(0, Number(dmyMatch[1]) - 1));
    const m = y === 2026 ? Math.max(7, mRaw) : mRaw;
    return `${SPANISH_MONTHS_SHORT[m]} ${y}`;
  }

  // Spanish month + 4-digit or 2-digit year e.g. "Ago 2026", "Septiembre 2027", "Feb 27"
  const spMatch = s.toLowerCase().match(/([a-záéíóú]+)\s*[-/. ]*\s*(\d{2,4})/);
  if (spMatch) {
    const mKey = spMatch[1];
    const mIdx = MONTH_LOOKUP[mKey] ?? MONTH_LOOKUP[mKey.slice(0, 3)];
    let y = Number(spMatch[2]);
    if (y < 100) y += 2000;
    if (mIdx !== undefined && !Number.isNaN(y)) {
      const clampedY = Math.min(2029, Math.max(2026, y));
      const clampedM = clampedY === 2026 ? Math.max(7, mIdx) : mIdx;
      return `${SPANISH_MONTHS_SHORT[clampedM]} ${clampedY}`;
    }
  }

  return fallback;
}

function normalizeExcelStatus(status?: string): 'SIN INICIAR' | 'EN PROCESO' | 'FINALIZADO' | 'RETRASADO' | 'CANCELADO' {
  const up = (status || 'SIN INICIAR').trim().toUpperCase();
  if (up === 'FINALIZADO' || up === 'COMPLETED' || up === 'COMPLETADO') return 'FINALIZADO';
  if (up === 'EN PROCESO' || up === 'IN_PROGRESS' || up === 'EN CURSO') return 'EN PROCESO';
  if (up === 'RETRASADO' || up === 'DELAYED' || up === 'ATRASADO') return 'RETRASADO';
  if (up === 'CANCELADO' || up === 'CANCELLED') return 'CANCELADO';
  return 'SIN INICIAR';
}

function getImeMaturityLabel(ime100: number): string {
  if (ime100 >= 80) return '🟢 Avanzado / Optimizado';
  if (ime100 >= 60) return '🟢 Consolidado';
  if (ime100 >= 40) return '🟡 En desarrollo';
  if (ime100 >= 25) return '🟠 Inicial';
  return '🔴 Crítico';
}

class SharedStringsTable {
  private doc: XMLDocument;
  private sstEl: Element;
  private indexMap = new Map<string, number>();
  private count = 0;

  constructor(xmlString: string) {
    const parser = new DOMParser();
    this.doc = parser.parseFromString(xmlString, 'application/xml');
    this.sstEl = this.doc.documentElement;
    const siNodes = Array.from(this.sstEl.getElementsByTagName('si'));
    this.count = siNodes.length;
    siNodes.forEach((si, idx) => {
      // Only map plain single-<t> entries (avoid overwriting rich-text runs)
      const rNodes = si.getElementsByTagName('r');
      if (rNodes.length === 0) {
        const tNode = si.getElementsByTagName('t')[0];
        if (tNode) {
          const val = tNode.textContent ?? '';
          if (!this.indexMap.has(val)) {
            this.indexMap.set(val, idx);
          }
        }
      }
    });
  }

  public intern(text: string): number {
    const normalized = String(text ?? '');
    const existing = this.indexMap.get(normalized);
    if (existing !== undefined) return existing;

    const si = this.doc.createElementNS(SPREADSHEET_NS, 'si');
    const t = this.doc.createElementNS(SPREADSHEET_NS, 't');
    if (normalized.startsWith(' ') || normalized.endsWith(' ') || normalized.includes('\n') || normalized.includes('  ')) {
      t.setAttribute('xml:space', 'preserve');
    }
    t.textContent = normalized;
    si.appendChild(t);
    this.sstEl.appendChild(si);

    const newIdx = this.count++;
    this.indexMap.set(normalized, newIdx);
    return newIdx;
  }

  public serialize(): string {
    this.sstEl.setAttribute('count', String(this.count));
    this.sstEl.setAttribute('uniqueCount', String(this.count));
    return serializeXmlDoc(this.doc);
  }
}

function setCellString(doc: XMLDocument, rowEl: Element, cellRef: string, styleIdx: string | null, sstIdx: number): Element {
  const cell = getOrCreateCellSorted(doc, rowEl, cellRef);
  if (styleIdx !== null) cell.setAttribute('s', styleIdx);
  cell.setAttribute('t', 's');
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  const v = doc.createElementNS(SPREADSHEET_NS, 'v');
  v.textContent = String(sstIdx);
  cell.appendChild(v);
  return cell;
}

function setCellNumber(doc: XMLDocument, rowEl: Element, cellRef: string, styleIdx: string | null, num: number | null, formula?: string): Element {
  const cell = getOrCreateCellSorted(doc, rowEl, cellRef);
  if (styleIdx !== null) cell.setAttribute('s', styleIdx);
  while (cell.firstChild) cell.removeChild(cell.firstChild);

  if (formula) {
    const f = doc.createElementNS(SPREADSHEET_NS, 'f');
    f.textContent = formula;
    cell.appendChild(f);
  }

  if (num !== null && !Number.isNaN(num)) {
    cell.removeAttribute('t');
    const v = doc.createElementNS(SPREADSHEET_NS, 'v');
    v.textContent = String(Number(num.toFixed(4)));
    cell.appendChild(v);
  } else if (formula) {
    cell.setAttribute('t', 'str');
  } else {
    cell.removeAttribute('t');
  }
  return cell;
}

function setCellEmptyStyled(doc: XMLDocument, rowEl: Element, cellRef: string, styleIdx: string): Element {
  const cell = getOrCreateCellSorted(doc, rowEl, cellRef);
  cell.setAttribute('s', styleIdx);
  cell.removeAttribute('t');
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  return cell;
}

function findRow(sheetDoc: XMLDocument, rowNumber: number): Element | null {
  const rows = sheetDoc.getElementsByTagName('row');
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].getAttribute('r') === String(rowNumber)) {
      return rows[i];
    }
  }
  return null;
}

function findCellInRow(rowEl: Element, cellRef: string): Element | null {
  const cells = rowEl.getElementsByTagName('c');
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].getAttribute('r') === cellRef) {
      return cells[i];
    }
  }
  return null;
}

function updateSheetCellString(sheetDoc: XMLDocument, cellRef: string, text: string, sst: SharedStringsTable) {
  const rowNum = Number(cellRef.replace(/^[A-Z]+/, ''));
  const rowEl = findRow(sheetDoc, rowNum);
  if (!rowEl) return;
  const existing = findCellInRow(rowEl, cellRef);
  const style = existing?.getAttribute('s') ?? null;
  setCellString(sheetDoc, rowEl, cellRef, style, sst.intern(text));
}

function updateChartXmlSeriesCache(
  chartXml: string,
  sheetRangePrefix: string, // e.g. "&apos;PENT-PE&apos;!$"
  rowStart: number,
  rowEnd: number,
  axisLabels: string[],
  colsValues: Record<string, (number | null)[]>
): string {
  let updated = chartXml;

  // Update category labels cache if present
  const catCacheItems = axisLabels
    .map((lbl, i) => `<c:pt idx="${i}"><c:v>${escapeXml(lbl)}</c:v></c:pt>`)
    .join('');
  const catRegex = new RegExp(
    `(<c:f>${sheetRangePrefix}B\\$${rowStart}:\\$B\\$${rowEnd}</c:f>\\s*<c:strCache>\\s*<c:ptCount val="5"/>)[\\s\\S]*?(</c:strCache>)`,
    'g'
  );
  updated = updated.replace(catRegex, `$1${catCacheItems}$2`);

  // Update numeric cache for each column C..L
  Object.entries(colsValues).forEach(([colLet, vals]) => {
    const validPts = vals
      .map((v, i) => (v !== null && !Number.isNaN(v) ? `<c:pt idx="${i}"><c:v>${Number(v.toFixed(2))}</c:v></c:pt>` : ''))
      .filter(Boolean);
    const replacementBlock = `<c:ptCount val="5"/>${validPts.join('')}`;
    const numRegex = new RegExp(
      `(<c:f>${sheetRangePrefix}${colLet}\\$${rowStart}:\\$${colLet}\\$${rowEnd}</c:f>\\s*<c:numCache>(?:\\s*<c:formatCode>[^<]*</c:formatCode>)?)\\s*<c:ptCount val="\\d+"/>[\\s\\S]*?(</c:numCache>)`,
      'g'
    );
    updated = updated.replace(numRegex, `$1${replacementBlock}$2`);
  });

  return updated;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const RISK_CATEGORY_STYLES: Record<string, string> = {
  'A. Estratégico / Gobierno': '135',
  'B. Comercial / Mercado': '153',
  'C. Financiero': '161',
  'D. Operativo / Proyectos': '167',
  'E. Técnico / Tecnológico': '168',
  'F. RR.HH. / Talento': '169',
  'G. Externo / Macro': '172',
};

function resolveRiskCategoryStyle(cat: string): string {
  if (RISK_CATEGORY_STYLES[cat]) return RISK_CATEGORY_STYLES[cat];
  const low = cat.toLowerCase();
  if (low.includes('estrat') || low.includes('gobiern')) return '135';
  if (low.includes('comerc') || low.includes('mercad')) return '153';
  if (low.includes('financ')) return '161';
  if (low.includes('operat') || low.includes('proces')) return '167';
  if (low.includes('tecn') || low.includes('it')) return '168';
  if (low.includes('rrhh') || low.includes('rr.hh') || low.includes('talent')) return '169';
  return '172';
}

/**
 * Dynamically maps the client's real diagnostic scores & risks onto the 27-item GS Risk Register
 * so that inherent probabilities/impacts reflect the client's live Diagnostic 360° reality.
 */
function buildMappedClientRisks(
  baseRisks: RiskItem[],
  clientName: string,
  diag?: FullDiagnosticResults
): RiskItem[] {
  const source = baseRisks && baseRisks.length > 0 ? baseRisks : INITIAL_RISKS;
  if (!diag || diag.totalAnswered === 0) {
    return source.map((r) => ({
      ...r,
      riskName: r.riskName.replace(/EJEMPLO SAS/gi, clientName),
      cause: r.cause.replace(/EJEMPLO SAS/gi, clientName),
    }));
  }

  // Compute area risk factor from live diagnostic areaScores (0..100 ireScore)
  const getCategoryIre = (cat: string): number => {
    const low = cat.toLowerCase();
    const matchArea = diag.areaScores.find((a) => {
      const an = a.areaName.toLowerCase();
      if (low.includes('gobiern') || low.includes('estrat')) return an.includes('direcc') || an.includes('gobiern');
      if (low.includes('comerc')) return an.includes('comerc') || an.includes('client');
      if (low.includes('financ')) return an.includes('finanz') || an.includes('admin');
      if (low.includes('operat')) return an.includes('operac') || an.includes('calidad');
      if (low.includes('tecn')) return an.includes('tecnol');
      if (low.includes('rr.hh') || low.includes('talent')) return an.includes('human') || an.includes('rrhh') || an.includes('persona');
      return an.includes('context') || an.includes('entorno');
    });
    return matchArea ? matchArea.ireScore : diag.globalIre;
  };

  return source.map((r) => {
    const catIre = getCategoryIre(r.category);
    // Scale inherent prob (1..5) proportionally if diagnostic shows significantly higher or lower risk than default (~53)
    const delta = Math.round((catIre - 53) / 22);
    const adjProb = Math.min(5, Math.max(1, r.probInherent + delta));
    const adjImp = Math.min(5, Math.max(1, r.impInherent));
    return {
      ...r,
      riskName: r.riskName.replace(/EJEMPLO SAS/gi, clientName),
      cause: r.cause.replace(/EJEMPLO SAS/gi, clientName),
      probInherent: adjProb,
      impInherent: adjImp,
      levelInherent: adjProb * adjImp,
    };
  });
}

/**
 * Generates and downloads an exact clone of `00-000_EJEMPLO_SAS-Master_Plan_Estrategico_TEMPLATE.xlsx`
 * preserving 100% of logos, colors, styles, conditional formatting, formulas & native Excel Radar Charts,
 * with every sheet and cell dynamically mapped to the client's platform data.
 */
export async function exportTemplateExactMasterPlanWorkbook(input: TemplateMappedExportInput): Promise<void> {
  // Fetch the official template binary served from /templates/
  const resp = await fetch('/templates/00-000_EJEMPLO_SAS-Master_Plan_Estrategico_TEMPLATE.xlsx');
  if (!resp.ok) {
    throw new Error(`No se pudo cargar la plantilla oficial Master Plan (${resp.status})`);
  }
  const arrayBuf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuf);
  const parser = new DOMParser();

  // Load SharedStrings
  const sstXml = await zip.file('xl/sharedStrings.xml')!.async('string');
  const sst = new SharedStringsTable(sstXml);

  // Prepare normalized metadata
  const clientName = (input.clientName || 'Empresa Cliente').trim();
  const projectCode = (input.projectCode || '26-030').trim();
  const revCode = (input.revision || '0').replace(/^rev\s*/i, '').trim() || '0';
  const periodLabel = input.periodLabel || '2026 – 2029';
  const consultantNames = input.consultantNames || 'Equipo Consultor Senior — GS Consultora';
  const now = new Date();
  const issueDateLong = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const shortMonthYear = `${SPANISH_MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;
  const slug = sanitizeSlug(clientName);
  const docCode = `${projectCode}-${slug.toUpperCase().slice(0, 12)}-MPE-2026-Rev${revCode}`;
  const sector = input.sector?.trim() || 'PyME en Profesionalización y Escalamiento';
  const employeesLabel = input.employeesLabel?.trim() || 'Dotación activa en relevamiento';

  const axesMeta = input.axesMeta && input.axesMeta.length === 5 ? input.axesMeta : DEFAULT_GS_AXES_META;
  const tasks = input.tasks || [];

  // Derive live Pentagon LB, M1..M8, and Meta scores (0..10)
  const pentPeriods = input.pentagonPeriods && input.pentagonPeriods.length > 0 ? input.pentagonPeriods : INITIAL_PENTAGON_DATA;
  const lbPeriod = pentPeriods.find((p) => p.periodCode === 'LB') || pentPeriods[0];
  const metaPeriod = pentPeriods.find((p) => p.periodCode === 'META') || pentPeriods[pentPeriods.length - 1];

  const hasLiveDiag = Boolean(input.diagnosticResults && input.diagnosticResults.totalAnswered > 0);
  const lbScores: [number, number, number, number, number] = hasLiveDiag
    ? [
        Number((input.diagnosticResults!.pentagon.directorio || lbPeriod.gobernanza).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.procesos || lbPeriod.procesos).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.finanzas || lbPeriod.finanzas).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.talento || lbPeriod.talento).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.comercial || lbPeriod.comercial).toFixed(1)),
      ]
    : [lbPeriod.gobernanza, lbPeriod.procesos, lbPeriod.finanzas, lbPeriod.talento, lbPeriod.comercial];

  const metaScores: [number, number, number, number, number] = [
    metaPeriod?.gobernanza ?? 8.5,
    metaPeriod?.procesos ?? 8.0,
    metaPeriod?.finanzas ?? 8.5,
    metaPeriod?.talento ?? 8.0,
    metaPeriod?.comercial ?? 8.0,
  ];

  const weights: [number, number, number, number, number] = [
    axesMeta[0]?.weight ?? 0.15,
    axesMeta[1]?.weight ?? 0.35,
    axesMeta[2]?.weight ?? 0.15,
    axesMeta[3]?.weight ?? 0.10,
    axesMeta[4]?.weight ?? 0.25,
  ];

  const calcWeightedIme10 = (vals: number[]) =>
    Number(vals.reduce((acc, v, idx) => acc + v * weights[idx], 0).toFixed(2));

  const ime10Baseline = calcWeightedIme10(lbScores);
  const ime100 = input.globalIme ?? Math.round(ime10Baseline * 10);

  const mappedRisks = buildMappedClientRisks(input.risks || INITIAL_RISKS, clientName, input.diagnosticResults);
  const avgInherentLevel =
    mappedRisks.reduce((acc, r) => acc + r.probInherent * r.impInherent, 0) / Math.max(1, mappedRisks.length);
  const computedIreBaseline = Number(((avgInherentLevel / 25) * 100).toFixed(1));
  const ire100 = input.globalIre !== undefined ? Number(input.globalIre.toFixed(1)) : computedIreBaseline;
  const maturityBand = input.maturityLabel || getImeMaturityLabel(ime100);

  const omvFullText = (
    input.omvText ||
    `Síntesis del OMV consensuado por el Directorio de ${clientName} (proyección a 3 años): 1) Transición operativa→estratégica con roles de socios ordenados y mandos medios consolidados. 2) Protección legal y societaria mediante Estatuto de Convivencia y Directorio formal mensual. 3) Procesos estandarizados y trazables con control de capacidad y calidad. 4) Estabilidad financiera con flujo proyectado y fondo de reserva segregado. 5) Crecimiento comercial planificado y diversificación de ingresos.`
  ).trim();

  const omvCompactOneLine = omvFullText.replace(/\s*\n+\s*/g, '  ·  ').slice(0, 520);

  const completedCount = tasks.filter((t) => normalizeExcelStatus(t.status) === 'FINALIZADO').length;
  const inProgressCount = tasks.filter((t) => normalizeExcelStatus(t.status) === 'EN PROCESO').length;
  const avanceSummary =
    completedCount > 0 || inProgressCount > 0
      ? `${completedCount} finalizadas y ${inProgressCount} en proceso de ${tasks.length} acciones  ·  Línea base: Diagnóstico PyME 360° — IME ${ime100}/100 · ${maturityBand}`
      : `Inicio del plan  ·  Línea base: Diagnóstico PyME 360° — IME ${ime100}/100 · ${maturityBand}`;

  // =========================================================================
  // 1. PATCH SHEET 1: PORTADA (xl/worksheets/sheet1.xml)
  // =========================================================================
  const portadaXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  const portadaDoc = parser.parseFromString(portadaXml, 'application/xml');

  updateSheetCellString(portadaDoc, 'B2', clientName, sst);
  updateSheetCellString(portadaDoc, 'B4', `MASTER PLAN ESTRATÉGICO ${periodLabel}`, sst);
  updateSheetCellString(portadaDoc, 'B8', omvFullText, sst);
  updateSheetCellString(portadaDoc, 'C13', clientName, sst);
  updateSheetCellString(portadaDoc, 'C14', periodLabel, sst);
  updateSheetCellString(portadaDoc, 'C15', consultantNames, sst);
  updateSheetCellString(portadaDoc, 'C16', issueDateLong, sst);
  updateSheetCellString(portadaDoc, 'C17', revCode, sst);
  updateSheetCellString(portadaDoc, 'C18', projectCode, sst);
  updateSheetCellString(portadaDoc, 'C19', docCode, sst);
  updateSheetCellString(portadaDoc, 'C20', sector, sst);
  updateSheetCellString(portadaDoc, 'C21', employeesLabel, sst);
  updateSheetCellString(portadaDoc, 'C22', '5', sst);
  updateSheetCellString(portadaDoc, 'C23', `${tasks.length}`, sst);
  updateSheetCellString(portadaDoc, 'C24', avanceSummary, sst);

  zip.file('xl/worksheets/sheet1.xml', serializeXmlDoc(portadaDoc));

  // =========================================================================
  // 2. PATCH SHEET 2: MPE (xl/worksheets/sheet2.xml) — Dynamic Rows + Gantt!
  // =========================================================================
  const mpeXml = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
  const mpeDoc = parser.parseFromString(mpeXml, 'application/xml');

  updateSheetCellString(mpeDoc, 'A2', `MASTER PLAN ESTRATÉGICO — ${clientName}`, sst);
  updateSheetCellString(mpeDoc, 'B3', `Empresa: ${clientName}`, sst);
  updateSheetCellString(mpeDoc, 'E3', `Período: ${periodLabel}`, sst);
  updateSheetCellString(mpeDoc, 'H3', `Fecha: ${shortMonthYear} (Rev${revCode})`, sst);
  updateSheetCellString(mpeDoc, 'J3', `Rev.: ${revCode}`, sst);
  updateSheetCellString(mpeDoc, 'B4', `⭐  VISIÓN 2029 (OMV del Directorio): ${omvCompactOneLine}`, sst);

  const mpeSheetData = mpeDoc.getElementsByTagName('sheetData')[0];
  const allExistingMpeRows = Array.from(mpeSheetData.getElementsByTagName('row'));

  // Clone template Legend rows (87..94) and hidden Gantt Date reference row (205) before rebuilding rows >= 6
  const legendTemplateRows = allExistingMpeRows
    .filter((r) => {
      const n = Number(r.getAttribute('r'));
      return n >= 87 && n <= 94;
    })
    .map((r) => r.cloneNode(true) as Element);

  const dateRefRow205 = allExistingMpeRows.find((r) => r.getAttribute('r') === '205')?.cloneNode(true) as Element | undefined;

  // Remove all rows >= 6 from MPE sheetData so we rebuild 100% dynamically from `tasks` & `axesMeta`
  allExistingMpeRows.forEach((r) => {
    if (Number(r.getAttribute('r')) >= 6) {
      mpeSheetData.removeChild(r);
    }
  });

  const dynamicMerges: string[] = [
    'A1:K1',
    'A2:K2',
    'M2:BA2',
    'B3:D3',
    'E3:G3',
    'H3:I3',
    'J3:K3',
    'M3:BA3',
    'B4:K4',
    'M4:Q4',
    'R4:AC4',
    'AD4:AO4',
    'AP4:BA4',
  ];

  let currentRow = 6;

  for (let axisIdx = 0; axisIdx < 5; axisIdx++) {
    const axisNum = axisIdx + 1;
    const meta = axesMeta[axisIdx];
    const axisTasks = tasks.filter((t) => Number(t.axis) === axisNum);
    const effectiveTasks: MasterPlanTaskItem[] =
      axisTasks.length > 0
        ? axisTasks
        : [
            {
              id: `fallback_${axisNum}`,
              axis: axisNum,
              axisName: meta.fullName,
              code: '1',
              title: 'Definir acciones específicas del eje en sesión de Directorio',
              priority: 'Alta',
              startDate: 'Ago 2026',
              dueDate: 'Dic 2026',
              status: 'SIN INICIAR',
              assignedRole: '',
              progress: 0,
            },
          ];

    const axisFirstRow = currentRow;
    const axisLastRow = currentRow + effectiveTasks.length - 1;
    const axisColBStyle = axisNum % 2 === 1 ? '31' : '44';

    effectiveTasks.forEach((task, idx) => {
      const rNum = currentRow++;
      const rowEl = mpeDoc.createElementNS(SPREADSHEET_NS, 'row');
      rowEl.setAttribute('r', String(rNum));
      rowEl.setAttribute('ht', '45');
      rowEl.setAttribute('customHeight', 'true');

      // Col A (1)
      setCellEmptyStyled(mpeDoc, rowEl, `A${rNum}`, '23');

      // Cols B..E (2..5): populated on first row of axis, empty styled on merged continuation rows
      const axisTitleFormatted = meta.fullName.replace(/^Eje\s+(\d+)\s*·\s*/i, 'EJE $1 — ');
      if (idx === 0) {
        setCellString(mpeDoc, rowEl, `B${rNum}`, axisColBStyle, sst.intern(axisTitleFormatted));
        setCellString(mpeDoc, rowEl, `C${rNum}`, '32', sst.intern(meta.brechaAsociada));
        setCellString(mpeDoc, rowEl, `D${rNum}`, '33', sst.intern(meta.iniciativaEstrategica));
        setCellString(mpeDoc, rowEl, `E${rNum}`, '34', sst.intern(meta.okrText));
      } else {
        setCellEmptyStyled(mpeDoc, rowEl, `B${rNum}`, axisColBStyle);
        setCellEmptyStyled(mpeDoc, rowEl, `C${rNum}`, '32');
        setCellEmptyStyled(mpeDoc, rowEl, `D${rNum}`, '33');
        setCellEmptyStyled(mpeDoc, rowEl, `E${rNum}`, '34');
      }

      // Col F (6): Parent Initiative ('1') vs Sub-Action ('1.1')
      const cleanCode = String(task.code || '').replace(/\.$/, '').trim();
      const isParentInitiative = !cleanCode.includes('.');
      const fStyle = isParentInitiative ? '35' : '41';
      const actionLabel = cleanCode ? `${cleanCode}. ${task.title}` : task.title;
      setCellString(mpeDoc, rowEl, `F${rNum}`, fStyle, sst.intern(actionLabel));

      // Col G (7): Prioridad ('Alta'=36, 'Media'=42, 'Baja'=45)
      const prio = task.priority === 'Baja' ? 'Baja' : task.priority === 'Media' ? 'Media' : 'Alta';
      const gStyle = prio === 'Alta' ? '36' : prio === 'Media' ? '42' : '45';
      setCellString(mpeDoc, rowEl, `G${rNum}`, gStyle, sst.intern(prio));

      // Col H (8): Responsable
      const roleClean = (task.assignedRole || '').trim();
      if (roleClean && roleClean.toLowerCase() !== 'por definir' && roleClean.toLowerCase() !== 'a definir') {
        setCellString(mpeDoc, rowEl, `H${rNum}`, '37', sst.intern(roleClean));
      } else {
        setCellEmptyStyled(mpeDoc, rowEl, `H${rNum}`, '37');
      }

      // Cols I & J (9, 10): PLAZO INICIO & PLAZO FIN normalized to "Mes AAAA"
      const normStart = normalizeGanttMonthYear(task.startDate, 'Ago 2026');
      const normEnd = normalizeGanttMonthYear(task.dueDate, 'Feb 2027');
      setCellString(mpeDoc, rowEl, `I${rNum}`, '38', sst.intern(normStart));
      setCellString(mpeDoc, rowEl, `J${rNum}`, '38', sst.intern(normEnd));

      // Col K (11): ESTADO with matching template status badge style
      const normStatus = normalizeExcelStatus(task.status);
      const kStyle =
        normStatus === 'EN PROCESO'
          ? '51'
          : normStatus === 'FINALIZADO'
            ? '53'
            : normStatus === 'RETRASADO'
              ? '54'
              : normStatus === 'CANCELADO'
                ? '55'
                : '39';
      setCellString(mpeDoc, rowEl, `K${rNum}`, kStyle, sst.intern(normStatus));

      // Col L (12): spacer
      setCellEmptyStyled(mpeDoc, rowEl, `L${rNum}`, '23');

      // Cols M..BA (13..53): 41 Gantt cells with style '40'
      for (let colIdx = 13; colIdx <= 53; colIdx++) {
        const colLet = colIndexToLetter(colIdx);
        setCellEmptyStyled(mpeDoc, rowEl, `${colLet}${rNum}`, '40');
      }

      mpeSheetData.appendChild(rowEl);
    });

    if (axisLastRow > axisFirstRow) {
      dynamicMerges.push(
        `B${axisFirstRow}:B${axisLastRow}`,
        `C${axisFirstRow}:C${axisLastRow}`,
        `D${axisFirstRow}:D${axisLastRow}`,
        `E${axisFirstRow}:E${axisLastRow}`
      );
    }

    // Append Axis Separator Row (ht="15")
    const sepRowNum = currentRow++;
    const sepRow = mpeDoc.createElementNS(SPREADSHEET_NS, 'row');
    sepRow.setAttribute('r', String(sepRowNum));
    sepRow.setAttribute('ht', '15');
    sepRow.setAttribute('customHeight', 'true');
    setCellEmptyStyled(mpeDoc, sepRow, `A${sepRowNum}`, '23');
    for (let c = 2; c <= 11; c++) {
      setCellEmptyStyled(mpeDoc, sepRow, `${colIndexToLetter(c)}${sepRowNum}`, '25');
    }
    setCellEmptyStyled(mpeDoc, sepRow, `L${sepRowNum}`, '23');
    for (let c = 13; c <= 53; c++) {
      setCellEmptyStyled(mpeDoc, sepRow, `${colIndexToLetter(c)}${sepRowNum}`, '43');
    }
    mpeSheetData.appendChild(sepRow);
    dynamicMerges.push(`B${sepRowNum}:K${sepRowNum}`);
  }

  const lastTaskGridRow = currentRow - 1;

  // Append cloned Legend rows (originally 87..94) renumbered cleanly to currentRow..currentRow+7
  const legendStartRow = currentRow;
  legendTemplateRows.forEach((tmplRow, offset) => {
    const targetR = legendStartRow + offset;
    tmplRow.setAttribute('r', String(targetR));
    Array.from(tmplRow.getElementsByTagName('c')).forEach((cEl) => {
      const oldRef = cEl.getAttribute('r') || '';
      const colPrefix = oldRef.replace(/\d+$/, '');
      cEl.setAttribute('r', `${colPrefix}${targetR}`);
    });
    mpeSheetData.appendChild(tmplRow);
    currentRow++;
  });

  // Legend merges (matching D88:G88, D89:E89, D90:E90, D91:E91, D92:E92, D93:K94)
  dynamicMerges.push(
    `D${legendStartRow + 1}:G${legendStartRow + 1}`,
    `D${legendStartRow + 2}:E${legendStartRow + 2}`,
    `D${legendStartRow + 3}:E${legendStartRow + 3}`,
    `D${legendStartRow + 4}:E${legendStartRow + 4}`,
    `D${legendStartRow + 5}:E${legendStartRow + 5}`,
    `D${legendStartRow + 6}:K${legendStartRow + 7}`
  );

  // Place hidden Gantt Date Reference Row (at 205, or currentRow + 10 if plan has >190 rows)
  const dateRefRowNumber = Math.max(205, currentRow + 10);
  if (dateRefRow205) {
    dateRefRow205.setAttribute('r', String(dateRefRowNumber));
    Array.from(dateRefRow205.getElementsByTagName('c')).forEach((cEl) => {
      const oldRef = cEl.getAttribute('r') || '';
      const colPrefix = oldRef.replace(/\d+$/, '');
      cEl.setAttribute('r', `${colPrefix}${dateRefRowNumber}`);
    });
    mpeSheetData.appendChild(dateRefRow205);
  }

  // Update MPE <mergeCells>
  const mergeCellsEl = mpeDoc.getElementsByTagName('mergeCells')[0];
  if (mergeCellsEl) {
    while (mergeCellsEl.firstChild) mergeCellsEl.removeChild(mergeCellsEl.firstChild);
    mergeCellsEl.setAttribute('count', String(dynamicMerges.length));
    dynamicMerges.forEach((ref) => {
      const mc = mpeDoc.createElementNS(SPREADSHEET_NS, 'mergeCell');
      mc.setAttribute('ref', ref);
      mergeCellsEl.appendChild(mc);
    });
  }

  // Update MPE Conditional Formatting range & dateRefRowNumber if shifted
  const mpeCfs = Array.from(mpeDoc.getElementsByTagName('conditionalFormatting'));
  mpeCfs.forEach((cf) => {
    if ((cf.getAttribute('sqref') || '').startsWith('M6:')) {
      cf.setAttribute('sqref', `M6:BA${Math.max(200, lastTaskGridRow)}`);
      if (dateRefRowNumber !== 205) {
        Array.from(cf.getElementsByTagName('formula')).forEach((fEl) => {
          if (fEl.textContent) {
            fEl.textContent = fEl.textContent.replace(/M\$205/g, `M$${dateRefRowNumber}`);
          }
        });
      }
    }
  });

  // Update MPE <dimension>
  const mpeDim = mpeDoc.getElementsByTagName('dimension')[0];
  if (mpeDim) {
    mpeDim.setAttribute('ref', `A1:BA${dateRefRowNumber}`);
  }

  zip.file('xl/worksheets/sheet2.xml', serializeXmlDoc(mpeDoc));

  // =========================================================================
  // 3. PATCH SHEET 3: PENT-PE (sheet3.xml) + CHARTS (chart1.xml & chart2.xml)
  // =========================================================================
  const pentXml = await zip.file('xl/worksheets/sheet3.xml')!.async('string');
  const pentDoc = parser.parseFromString(pentXml, 'application/xml');

  updateSheetCellString(pentDoc, 'A2', `PENTÁGONO DEL ORDEN  ·  ${clientName}`, sst);

  // Map quarterly reviews (M1..M8 -> Cols D..K)
  const quarterCols = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const realColsCache: Record<string, (number | null)[]> = {
    C: [...lbScores],
    D: [null, null, null, null, null],
    E: [null, null, null, null, null],
    F: [null, null, null, null, null],
    G: [null, null, null, null, null],
    H: [null, null, null, null, null],
    I: [null, null, null, null, null],
    J: [null, null, null, null, null],
    K: [null, null, null, null, null],
    L: [...metaScores],
  };

  if (input.quarterlyReviews && input.quarterlyReviews.length > 0) {
    input.quarterlyReviews.slice(0, 8).forEach((qr, qIdx) => {
      const colLet = quarterCols[qIdx];
      if (colLet && qr.pentagon_scores) {
        realColsCache[colLet] = [
          qr.pentagon_scores.gobernanza,
          qr.pentagon_scores.procesos,
          qr.pentagon_scores.finanzas,
          qr.pentagon_scores.talento,
          qr.pentagon_scores.comercial,
        ];
      }
    });
  }

  const axisChartLabels: string[] = [];

  for (let i = 0; i < 5; i++) {
    const rNum = 8 + i;
    const rowEl = findRow(pentDoc, rNum);
    const axisLabel = axesMeta[i].fullName.replace(/^Eje\s+(\d+)\s*·\s*/i, 'EJE $1 — ');
    axisChartLabels.push(axisLabel);

    if (rowEl) {
      const bCell = findCellInRow(rowEl, `B${rNum}`);
      setCellString(pentDoc, rowEl, `B${rNum}`, bCell?.getAttribute('s') || '73', sst.intern(axisLabel));
      setCellNumber(pentDoc, rowEl, `C${rNum}`, '74', lbScores[i]);

      quarterCols.forEach((colLet) => {
        const qVal = realColsCache[colLet][i];
        if (qVal !== null && qVal !== undefined) {
          setCellNumber(pentDoc, rowEl, `${colLet}${rNum}`, '75', qVal);
        } else {
          setCellEmptyStyled(pentDoc, rowEl, `${colLet}${rNum}`, '75');
        }
      });

      setCellNumber(pentDoc, rowEl, `L${rNum}`, '76', metaScores[i]);

      // Latest measured value for M{rNum}
      let latestVal = lbScores[i];
      quarterCols.forEach((colLet) => {
        const v = realColsCache[colLet][i];
        if (v !== null && v !== undefined) latestVal = v;
      });
      const mFormula = `IF(K${rNum}<>"",K${rNum},IF(J${rNum}<>"",J${rNum},IF(I${rNum}<>"",I${rNum},IF(H${rNum}<>"",H${rNum},IF(G${rNum}<>"",G${rNum},IF(F${rNum}<>"",F${rNum},IF(E${rNum}<>"",E${rNum},IF(D${rNum}<>"",D${rNum},C${rNum}))))))))`;
      setCellNumber(pentDoc, rowEl, `M${rNum}`, '77', latestVal, mFormula);
    }
  }

  // Row 13: Weighted IME Real formula using live axis weights
  const row13 = findRow(pentDoc, 13);
  if (row13) {
    const allScoreCols = ['C', ...quarterCols, 'L'];
    allScoreCols.forEach((colLet) => {
      const vals = realColsCache[colLet];
      const allPresent = vals.every((v) => v !== null && v !== undefined);
      const cachedIme = allPresent ? calcWeightedIme10(vals as number[]) : null;
      const style = colLet === 'C' ? '83' : colLet === 'L' ? '85' : '84';
      const wExpr = `${colLet}8*${weights[0]}+${colLet}9*${weights[1]}+${colLet}10*${weights[2]}+${colLet}11*${weights[3]}+${colLet}12*${weights[4]}`;
      setCellNumber(pentDoc, row13, `${colLet}13`, style, cachedIme, `IF(COUNT(${colLet}8:${colLet}12)=5,${wExpr},"")`);
    });
    const m13Formula = `IF(K13<>"",K13,IF(J13<>"",J13,IF(I13<>"",I13,IF(H13<>"",H13,IF(G13<>"",G13,IF(F13<>"",F13,IF(E13<>"",E13,IF(D13<>"",D13,C13))))))))`;
    setCellNumber(pentDoc, row13, 'M13', '86', ime10Baseline, m13Formula);
  }

  // Rows 44..48: Projected Trajectory interpolated smoothly from live LB to META
  const projCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const projColsCache: Record<string, (number | null)[]> = {};
  projCols.forEach((c) => {
    projColsCache[c] = [];
  });
  const shortProjLabels = ['E1 — Gobernanza', 'E2 — Procesos', 'E3 — Finanzas', 'E4 — Talento', 'E5 — Comercial'];

  for (let i = 0; i < 5; i++) {
    const rNum = 44 + i;
    const rowEl = findRow(pentDoc, rNum);
    const startV = lbScores[i];
    const endV = metaScores[i];
    projCols.forEach((colLet, stepIdx) => {
      // Slightly concave progressive curve (faster initial quick-wins, steady maturity consolidation)
      const t = stepIdx / (projCols.length - 1);
      const eased = Math.pow(t, 0.85);
      const val = Number((startV + (endV - startV) * eased).toFixed(1));
      projColsCache[colLet].push(val);
      if (rowEl) {
        setCellNumber(pentDoc, rowEl, `${colLet}${rNum}`, '125', val);
      }
    });
  }

  // Row 49: Weighted IME Proyectado
  const row49 = findRow(pentDoc, 49);
  if (row49) {
    projCols.forEach((colLet) => {
      const vals = projColsCache[colLet] as number[];
      const cached = calcWeightedIme10(vals);
      const wExpr = `${colLet}44*${weights[0]}+${colLet}45*${weights[1]}+${colLet}46*${weights[2]}+${colLet}47*${weights[3]}+${colLet}48*${weights[4]}`;
      setCellNumber(pentDoc, row49, `${colLet}49`, '128', cached, wExpr);
    });
  }

  zip.file('xl/worksheets/sheet3.xml', serializeXmlDoc(pentDoc));

  // Update DATOS_PENT cached values (sheet5.xml) so external readers also see updated numbers
  const datosPentFile = zip.file('xl/worksheets/sheet5.xml');
  if (datosPentFile) {
    const dpXml = await datosPentFile.async('string');
    const dpDoc = parser.parseFromString(dpXml, 'application/xml');
    for (let i = 0; i < 5; i++) {
      const dpRow = findRow(dpDoc, 2 + i);
      if (dpRow) {
        projCols.forEach((pentCol, idx) => {
          const dpCol = colIndexToLetter(2 + idx); // B..K
          const val = realColsCache[pentCol]?.[i] ?? null;
          setCellNumber(dpDoc, dpRow, `${dpCol}${2 + i}`, null, val, `'PENT-PE'!${pentCol}${8 + i}`);
        });
      }
    }
    zip.file('xl/worksheets/sheet5.xml', serializeXmlDoc(dpDoc));
  }

  // Update Native Excel Radar Charts (`chart1.xml` = Proyectado, `chart2.xml` = Real)
  const chart1File = zip.file('xl/charts/chart1.xml');
  if (chart1File) {
    const c1Xml = await chart1File.async('string');
    const patchedC1 = updateChartXmlSeriesCache(
      c1Xml,
      '&apos;PENT-PE&apos;!\\$',
      44,
      48,
      shortProjLabels,
      projColsCache
    );
    zip.file('xl/charts/chart1.xml', patchedC1);
  }

  const chart2File = zip.file('xl/charts/chart2.xml');
  if (chart2File) {
    const c2Xml = await chart2File.async('string');
    const patchedC2 = updateChartXmlSeriesCache(
      c2Xml,
      '&apos;PENT-PE&apos;!\\$',
      8,
      12,
      axisChartLabels,
      realColsCache
    );
    zip.file('xl/charts/chart2.xml', patchedC2);
  }

  // =========================================================================
  // 4. PATCH SHEET 4: MATRIZ DE RIESGOS (xl/worksheets/sheet4.xml)
  // =========================================================================
  const matXml = await zip.file('xl/worksheets/sheet4.xml')!.async('string');
  const matDoc = parser.parseFromString(matXml, 'application/xml');

  updateSheetCellString(
    matDoc,
    'A1',
    `MATRIZ DE RIESGOS  ·  ${clientName}  ·  Registro de Riesgos Organizacionales`,
    sst
  );
  updateSheetCellString(
    matDoc,
    'A2',
    `Basada en el Diagnóstico PyME 360° (IME ${ime100}/100 · ${maturityBand} · IRE ${ire100}/100) y alineada al Master Plan ${periodLabel}`,
    sst
  );

  // Populate the 27 risk rows (rows 5..31) in columns A..O while keeping Q..AE (5x5 Heatmap & Scales) intact!
  const risks27 = mappedRisks.slice(0, 27);
  while (risks27.length < 27) {
    risks27.push(INITIAL_RISKS[risks27.length % INITIAL_RISKS.length]);
  }

  let sumInherent = 0;
  let sumResidual = 0;

  risks27.forEach((risk, idx) => {
    const rNum = 5 + idx;
    const rowEl = findRow(matDoc, rNum);
    if (!rowEl) return;

    const inhLevel = risk.probInherent * risk.impInherent;
    const resLevel = risk.probResidual * risk.impResidual;
    sumInherent += inhLevel;
    sumResidual += resLevel;

    const codeLabel = risk.code || `R-${String(idx + 1).padStart(2, '0')}`;
    const catStyle = resolveRiskCategoryStyle(risk.category);

    setCellString(matDoc, rowEl, `A${rNum}`, '134', sst.intern(codeLabel));
    setCellString(matDoc, rowEl, `B${rNum}`, catStyle, sst.intern(risk.category));
    setCellString(matDoc, rowEl, `C${rNum}`, '136', sst.intern(risk.riskName));
    setCellString(matDoc, rowEl, `D${rNum}`, '136', sst.intern(risk.cause));
    setCellString(matDoc, rowEl, `E${rNum}`, '136', sst.intern(risk.consequence));
    setCellNumber(matDoc, rowEl, `F${rNum}`, '137', risk.probInherent);
    setCellNumber(matDoc, rowEl, `G${rNum}`, '137', risk.impInherent);
    setCellNumber(matDoc, rowEl, `H${rNum}`, '138', inhLevel, `F${rNum}*G${rNum}`);
    setCellString(matDoc, rowEl, `I${rNum}`, '139', sst.intern(risk.strategy));
    setCellString(matDoc, rowEl, `J${rNum}`, '136', sst.intern(risk.mitigationActions));
    setCellString(matDoc, rowEl, `K${rNum}`, '136', sst.intern(risk.responsibleRole));
    setCellNumber(matDoc, rowEl, `L${rNum}`, '137', risk.probResidual);
    setCellNumber(matDoc, rowEl, `M${rNum}`, '137', risk.impResidual);
    setCellNumber(matDoc, rowEl, `N${rNum}`, '138', resLevel, `L${rNum}*M${rNum}`);
    setCellString(matDoc, rowEl, `O${rNum}`, '136', sst.intern(risk.earlyWarningKpi));
  });

  const liveMatrixIre = Number(((sumInherent / 27 / 25) * 100).toFixed(1));
  const residualMatrixIre = Number(((sumResidual / 27 / 25) * 100).toFixed(1));

  // Update IRE Summary Row 37 & Baseline Row 40 + Quarterly IRE rows 41..48
  const matRow37 = findRow(matDoc, 37);
  if (matRow37) {
    setCellNumber(matDoc, matRow37, 'B37', '178', ire100);
    setCellNumber(matDoc, matRow37, 'F37', '179', liveMatrixIre, 'ROUND(AVERAGE(H5:H31)/25*100,1)');
    setCellNumber(matDoc, matRow37, 'J37', '180', residualMatrixIre, 'ROUND(AVERAGE(N5:N31)/25*100,1)');
    const redPct = ire100 - residualMatrixIre === 0 ? 0 : (ire100 - liveMatrixIre) / (ire100 - residualMatrixIre);
    setCellNumber(matDoc, matRow37, 'N37', '181', redPct, 'IF(B37-J37=0,0,(B37-F37)/(B37-J37))');
  }

  const matRow40 = findRow(matDoc, 40);
  if (matRow40) {
    setCellNumber(matDoc, matRow40, 'C40', '187', ire100);
  }

  let latestIre = ire100;
  if (input.quarterlyReviews && input.quarterlyReviews.length > 0) {
    input.quarterlyReviews.slice(0, 8).forEach((qr, qIdx) => {
      if (typeof qr.ire_score === 'number') {
        latestIre = qr.ire_score;
        const qRow = findRow(matDoc, 41 + qIdx);
        if (qRow) {
          setCellNumber(matDoc, qRow, `C${41 + qIdx}`, '187', qr.ire_score);
        }
      }
    });
  }

  const matRow49 = findRow(matDoc, 49);
  if (matRow49) {
    setCellNumber(matDoc, matRow49, 'C49', '190', residualMatrixIre, 'ROUND(AVERAGE(N5:N31)/25*100,1)');
  }

  const matRow50 = findRow(matDoc, 50);
  if (matRow50) {
    setCellNumber(matDoc, matRow50, 'C50', '192', latestIre, 'IFERROR(LOOKUP(2,1/(C40:C48<>""),C40:C48),C40)');
  }

  zip.file('xl/worksheets/sheet4.xml', serializeXmlDoc(matDoc));

  // =========================================================================
  // 5. FORCE FULL FORMULA RECALCULATION ON EXCEL OPEN & SAVE SHARED STRINGS
  // =========================================================================
  const wbFile = zip.file('xl/workbook.xml');
  if (wbFile) {
    let wbXml = await wbFile.async('string');
    if (wbXml.includes('<calcPr')) {
      wbXml = wbXml.replace(/<calcPr[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/>');
    } else {
      wbXml = wbXml.replace('</workbook>', '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    }
    zip.file('xl/workbook.xml', wbXml);
  }

  zip.file('xl/sharedStrings.xml', sst.serialize());

  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });

  const fileName = `${projectCode}_${slug}-Master_Plan_Estrategico_Rev${revCode}.xlsx`;
  triggerDownload(outBlob, fileName);
}

function setCellStringFormula(
  doc: XMLDocument,
  rowEl: Element,
  cellRef: string,
  styleIdx: string | null,
  formula: string,
  cachedStr?: string
): Element {
  const cell = getOrCreateCellSorted(doc, rowEl, cellRef);
  if (styleIdx !== null) cell.setAttribute('s', styleIdx);
  cell.setAttribute('t', 'str');
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  const f = doc.createElementNS(SPREADSHEET_NS, 'f');
  f.textContent = formula;
  cell.appendChild(f);
  if (cachedStr !== undefined) {
    const v = doc.createElementNS(SPREADSHEET_NS, 'v');
    v.textContent = cachedStr;
    cell.appendChild(v);
  }
  return cell;
}

const REVD_RISK_CATEGORY_STYLES: Record<string, string> = {
  'A. Estratégico / Gobierno': '168',
  'B. Comercial / Mercado': '186',
  'C. Financiero': '195',
  'D. Operativo / Proyectos': '200',
  'E. Técnico / Tecnológico': '201',
  'F. RR.HH. / Talento': '203',
  'G. Externo / Macro / Cumplimiento': '206',
};

function resolveRevdRiskCatStyle(cat: string): string {
  if (REVD_RISK_CATEGORY_STYLES[cat]) return REVD_RISK_CATEGORY_STYLES[cat];
  const low = cat.toLowerCase();
  if (low.includes('estrat') || low.includes('gobiern')) return '168';
  if (low.includes('comerc') || low.includes('mercad')) return '186';
  if (low.includes('financ')) return '195';
  if (low.includes('operat') || low.includes('proces')) return '200';
  if (low.includes('tecn') || low.includes('it')) return '201';
  if (low.includes('rrhh') || low.includes('rr.hh') || low.includes('talent')) return '203';
  return '206';
}

/**
 * Generates and downloads an exact 6-sheet clone of `26-030-EJEMPLO_SAS-Master_Plan_Estrategico_MODELO.Revd.xlsx`
 * (PORTADA, MPE 62 cols with NIVEL + INCIDENCIA + AVANCE + Axis Totals + Gantt, AVANCE-EJES live bridge,
 * PENT-PE + 2 Native Excel Radar Charts, MATRIZ DE RIESGOS, DATOS_PENT), 100% mapped to the client's platform data.
 */
export async function exportRevdModelExactMasterPlanWorkbook(input: TemplateMappedExportInput): Promise<void> {
  const resp = await fetch('/templates/26-030-EJEMPLO_SAS-Master_Plan_Estrategico_MODELO.Revd.xlsx');
  if (!resp.ok) {
    throw new Error(`No se pudo cargar el modelo oficial Revd (${resp.status})`);
  }
  const arrayBuf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuf);
  const parser = new DOMParser();

  const sstXml = await zip.file('xl/sharedStrings.xml')!.async('string');
  const sst = new SharedStringsTable(sstXml);

  const clientName = (input.clientName || 'Empresa Cliente').trim();
  const projectCode = (input.projectCode || '26-030').trim();
  const revCode = (input.revision || 'd').replace(/^rev\s*/i, '').trim() || 'd';
  const periodLabel = input.periodLabel || '2026 – 2029';
  const consultantNames = input.consultantNames || 'Martín Gómez | Lucía Fernández — GS Consultora';
  const now = new Date();
  const issueDateLong = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const shortMonthYear = `${SPANISH_MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;
  const slug = sanitizeSlug(clientName);
  const docCode = `${projectCode}-${slug.toUpperCase().slice(0, 12)}-MPE-2026-Rev${revCode}`;
  const sector = input.sector?.trim() || 'Servicios e Ingeniería PyME';
  const employeesLabel = input.employeesLabel?.trim() || 'Dotación activa PyME';

  const axesMeta = input.axesMeta && input.axesMeta.length === 5 ? input.axesMeta : DEFAULT_GS_AXES_META;
  const tasks = input.tasks || [];

  const pentPeriods = input.pentagonPeriods && input.pentagonPeriods.length > 0 ? input.pentagonPeriods : INITIAL_PENTAGON_DATA;
  const lbPeriod = pentPeriods.find((p) => p.periodCode === 'LB') || pentPeriods[0];
  const metaPeriod = pentPeriods.find((p) => p.periodCode === 'META') || pentPeriods[pentPeriods.length - 1];

  const hasLiveDiag = Boolean(input.diagnosticResults && input.diagnosticResults.totalAnswered > 0);
  const lbScores: [number, number, number, number, number] = hasLiveDiag
    ? [
        Number((input.diagnosticResults!.pentagon.directorio || lbPeriod.gobernanza).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.procesos || lbPeriod.procesos).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.finanzas || lbPeriod.finanzas).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.talento || lbPeriod.talento).toFixed(1)),
        Number((input.diagnosticResults!.pentagon.comercial || lbPeriod.comercial).toFixed(1)),
      ]
    : [lbPeriod.gobernanza, lbPeriod.procesos, lbPeriod.finanzas, lbPeriod.talento, lbPeriod.comercial];

  const metaScores: [number, number, number, number, number] = [
    metaPeriod?.gobernanza ?? 8.5,
    metaPeriod?.procesos ?? 8.0,
    metaPeriod?.finanzas ?? 8.5,
    metaPeriod?.talento ?? 8.0,
    metaPeriod?.comercial ?? 8.0,
  ];

  const avgIme10 = Number((lbScores.reduce((a, b) => a + b, 0) / 5).toFixed(2));
  const ime100 = input.globalIme ?? Math.round(avgIme10 * 10);

  const mappedRisks = buildMappedClientRisks(input.risks || INITIAL_RISKS, clientName, input.diagnosticResults);
  const avgInhLevel = mappedRisks.reduce((acc, r) => acc + r.probInherent * r.impInherent, 0) / Math.max(1, mappedRisks.length);
  const computedIreBaseline = Number(((avgInhLevel / 25) * 100).toFixed(1));
  const ire100 = input.globalIre !== undefined ? Number(input.globalIre.toFixed(1)) : computedIreBaseline;
  const maturityBand = input.maturityLabel || getImeMaturityLabel(ime100);

  const omvFullText = (
    input.omvText ||
    `"Consolidar a ${clientName} como referente en su sector con una estructura de gestión profesionalizada, Directorio activo, procesos trazables, finanzas previsibles y autonomía operativa respecto de sus socios fundadores."`
  ).trim();
  const omvCompactOneLine = omvFullText.replace(/\s*\n+\s*/g, '  ·  ').slice(0, 520);

  const completedCount = tasks.filter((t) => normalizeExcelStatus(t.status) === 'FINALIZADO').length;
  const inProgressCount = tasks.filter((t) => normalizeExcelStatus(t.status) === 'EN PROCESO').length;
  const avanceSummary = `${completedCount} acciones finalizadas y ${inProgressCount} en proceso sobre ${tasks.length} totales  ·  Diagnóstico 360°: IME ${ime100}/100 (${maturityBand}) · IRE ${ire100}/100`;

  // =========================================================================
  // 1. PORTADA (xl/worksheets/sheet1.xml)
  // =========================================================================
  const portadaDoc = parser.parseFromString(await zip.file('xl/worksheets/sheet1.xml')!.async('string'), 'application/xml');
  updateSheetCellString(portadaDoc, 'B2', clientName, sst);
  updateSheetCellString(portadaDoc, 'B4', `MASTER PLAN ESTRATÉGICO ${periodLabel}`, sst);
  updateSheetCellString(portadaDoc, 'B7', 'VISIÓN TRIENAL — OBJETIVO MATERIAL VISUALIZADO (OMV)', sst);
  updateSheetCellString(portadaDoc, 'B8', omvFullText, sst);
  updateSheetCellString(portadaDoc, 'C13', clientName, sst);
  updateSheetCellString(portadaDoc, 'C14', periodLabel, sst);
  updateSheetCellString(portadaDoc, 'C15', consultantNames, sst);
  updateSheetCellString(portadaDoc, 'C16', issueDateLong, sst);
  updateSheetCellString(portadaDoc, 'C17', `${revCode}`, sst);
  updateSheetCellString(portadaDoc, 'C18', projectCode, sst);
  updateSheetCellString(portadaDoc, 'C19', docCode, sst);
  updateSheetCellString(portadaDoc, 'C20', sector, sst);
  updateSheetCellString(portadaDoc, 'C21', employeesLabel, sst);
  updateSheetCellString(portadaDoc, 'C22', '5', sst);
  updateSheetCellString(portadaDoc, 'C23', `${tasks.length} acciones (iniciativas y acciones medibles en los 5 ejes)`, sst);
  updateSheetCellString(portadaDoc, 'B24', `Avance a ${shortMonthYear.toLowerCase()}:`, sst);
  updateSheetCellString(portadaDoc, 'C24', avanceSummary, sst);
  zip.file('xl/worksheets/sheet1.xml', serializeXmlDoc(portadaDoc));

  // =========================================================================
  // 2. MPE (xl/worksheets/sheet2.xml) — 62 Columns (A..BJ) + Weighting + Gantt
  // =========================================================================
  const mpeDoc = parser.parseFromString(await zip.file('xl/worksheets/sheet2.xml')!.async('string'), 'application/xml');
  updateSheetCellString(mpeDoc, 'A2', `MASTER PLAN ESTRATÉGICO — ${clientName}`, sst);
  updateSheetCellString(mpeDoc, 'B3', `Empresa: ${clientName}`, sst);
  updateSheetCellString(mpeDoc, 'E3', `Período: ${periodLabel}`, sst);
  updateSheetCellString(mpeDoc, 'H3', `Fecha: ${shortMonthYear} (Rev${revCode})`, sst);
  updateSheetCellString(mpeDoc, 'J3', `Rev.: ${revCode}`, sst);
  updateSheetCellString(mpeDoc, 'B4', ` ⭐  VISIÓN (OMV): ${omvCompactOneLine} `, sst);

  const mpeSheetData = mpeDoc.getElementsByTagName('sheetData')[0];
  const existingRows = Array.from(mpeSheetData.getElementsByTagName('row'));

  // Clone footer legend & methodology rows (127..142) and hidden Gantt Date row (206)
  const footerTemplateRows = existingRows
    .filter((r) => {
      const n = Number(r.getAttribute('r'));
      return n >= 127 && n <= 142;
    })
    .map((r) => ({ offset: Number(r.getAttribute('r')) - 127, node: r.cloneNode(true) as Element }));

  const dateRefRow206 = existingRows.find((r) => r.getAttribute('r') === '206')?.cloneNode(true) as Element | undefined;

  existingRows.forEach((r) => {
    if (Number(r.getAttribute('r')) >= 6) {
      mpeSheetData.removeChild(r);
    }
  });

  const revdMerges: string[] = [
    'A1:K1',
    'A2:K2',
    'V2:BJ2',
    'B3:D3',
    'E3:G3',
    'H3:I3',
    'J3:K3',
    'V3:BJ3',
    'B4:K4',
    'Q4:T4',
    'V4:AD4',
    'AE4:AP4',
    'AQ4:BB4',
  ];

  // Store exact dynamic row coordinates per axis for AVANCE-EJES!
  const axisRangeCoords: Array<{ firstRow: number; lastRow: number; totalRow: number; leafCount: number; weightedAdv: number }> = [];

  let curR = 6;

  for (let axisIdx = 0; axisIdx < 5; axisIdx++) {
    const axisNum = axisIdx + 1;
    const meta = axesMeta[axisIdx];
    const rawAxisTasks = tasks.filter((t) => Number(t.axis) === axisNum);
    const axisTasks: MasterPlanTaskItem[] =
      rawAxisTasks.length > 0
        ? rawAxisTasks
        : [
            {
              id: `fb_${axisNum}`,
              axis: axisNum,
              axisName: meta.fullName,
              code: '1.1',
              title: 'Definir acciones operativas del eje en sesión de tutoría',
              priority: 'Alta',
              startDate: 'Ago 2026',
              dueDate: 'Dic 2026',
              status: 'SIN INICIAR',
              assignedRole: 'Directorio + GS Consultora',
              progress: 0,
            },
          ];

    // Identify parent INICIATIVAs that consolidate children (e.g. '1' has '1.1', '1.2')
    const parentChildrenMap = new Map<string, MasterPlanTaskItem[]>();
    axisTasks.forEach((t) => {
      const cCode = String(t.code || '').replace(/\.$/, '').trim();
      if (cCode && !cCode.includes('.')) {
        const kids = axisTasks.filter((other) => {
          const oCode = String(other.code || '').replace(/\.$/, '').trim();
          return other.id !== t.id && oCode.startsWith(`${cCode}.`);
        });
        if (kids.length > 0) {
          parentChildrenMap.set(t.id, kids);
        }
      }
    });

    const leafTasks = axisTasks.filter((t) => !parentChildrenMap.has(t.id));
    // Priority-proportional normalized weights (Alta=3, Media=2, Baja=1) summing to 1.0000 across leaf actions!
    const rawPoints = leafTasks.map((lt) => (lt.priority === 'Alta' ? 3 : lt.priority === 'Media' ? 2 : 1));
    const totalPoints = Math.max(1, rawPoints.reduce((a, b) => a + b, 0));
    const leafWeights = new Map<string, number>();
    let accWeight = 0;
    leafTasks.forEach((lt, lIdx) => {
      if (lIdx === leafTasks.length - 1) {
        leafWeights.set(lt.id, Number((1 - accWeight).toFixed(4)));
      } else {
        const w = Number((rawPoints[lIdx] / totalPoints).toFixed(4));
        leafWeights.set(lt.id, w);
        accWeight += w;
      }
    });

    const axisFirstRow = curR;
    const axisLastRow = curR + axisTasks.length - 1;
    const taskRowLookup = new Map<string, number>();
    axisTasks.forEach((t, idx) => taskRowLookup.set(t.id, axisFirstRow + idx));

    let axisWeightedAdvanceSum = 0;

    axisTasks.forEach((task, idx) => {
      const rNum = curR++;
      const rowEl = mpeDoc.createElementNS(SPREADSHEET_NS, 'row');
      rowEl.setAttribute('r', String(rNum));
      rowEl.setAttribute('ht', '45');
      rowEl.setAttribute('customHeight', 'true');

      const axisTitleFormatted = meta.fullName
        .replace(/^Eje\s+(\d+)\s*·\s*/i, 'EJE $1 — ')
        .replace(/EJEMPLO SAS/gi, clientName);

      if (idx === 0) {
        setCellString(mpeDoc, rowEl, `B${rNum}`, '34', sst.intern(axisTitleFormatted));
        setCellString(mpeDoc, rowEl, `C${rNum}`, '35', sst.intern(meta.brechaAsociada.replace(/EJEMPLO SAS/gi, clientName)));
        setCellString(mpeDoc, rowEl, `D${rNum}`, '36', sst.intern(meta.iniciativaEstrategica.replace(/EJEMPLO SAS/gi, clientName)));
        setCellString(mpeDoc, rowEl, `E${rNum}`, '37', sst.intern(meta.okrText.replace(/EJEMPLO SAS/gi, clientName)));
      } else {
        setCellEmptyStyled(mpeDoc, rowEl, `B${rNum}`, '34');
        setCellEmptyStyled(mpeDoc, rowEl, `C${rNum}`, '34');
        setCellEmptyStyled(mpeDoc, rowEl, `D${rNum}`, '34');
        setCellEmptyStyled(mpeDoc, rowEl, `E${rNum}`, '34');
      }

      const cleanCode = String(task.code || '').replace(/\.$/, '').trim();
      const children = parentChildrenMap.get(task.id);
      const isParent = Boolean(children && children.length > 0);
      const actionLabel = (cleanCode ? `${cleanCode}. ${task.title}` : task.title).replace(/EJEMPLO SAS/gi, clientName);

      setCellString(mpeDoc, rowEl, `F${rNum}`, isParent ? '38' : '48', sst.intern(actionLabel));
      const prio = task.priority === 'Baja' ? 'Baja' : task.priority === 'Media' ? 'Media' : 'Alta';
      setCellString(mpeDoc, rowEl, `G${rNum}`, '39', sst.intern(prio));
      setCellString(
        mpeDoc,
        rowEl,
        `H${rNum}`,
        '40',
        sst.intern((task.assignedRole || 'Directorio + GS Consultora').replace(/EJEMPLO SAS/gi, clientName))
      );

      const normStart = normalizeGanttMonthYear(task.startDate, 'Ago 2026');
      const normEnd = normalizeGanttMonthYear(task.dueDate, 'Feb 2027');
      setCellString(mpeDoc, rowEl, `I${rNum}`, '41', sst.intern(normStart));
      setCellString(mpeDoc, rowEl, `J${rNum}`, '41', sst.intern(normEnd));

      const normStatus = normalizeExcelStatus(task.status);
      setCellString(mpeDoc, rowEl, `K${rNum}`, '42', sst.intern(normStatus));

      // Col L: Exact automatic NIVEL formula from MODELO.Revd
      const nextRowForLevel = rNum + 1;
      const levelFormula = `IF($F${rNum}="","",IFERROR(IF((LEN(LEFT($F${rNum},FIND(" ",$F${rNum})-1))-LEN(SUBSTITUTE(LEFT($F${rNum},FIND(" ",$F${rNum})-1),".","")))>=2,"ACCIÓN",IF(LEFT($F${nextRowForLevel},LEN(LEFT($F${rNum},FIND(" ",$F${rNum})-1)))=LEFT($F${rNum},FIND(" ",$F${rNum})-1),"INICIATIVA","ACCIÓN")),"ACCIÓN"))`;
      setCellStringFormula(mpeDoc, rowEl, `L${rNum}`, isParent ? '43' : '49', levelFormula, isParent ? 'INICIATIVA' : 'ACCIÓN');

      if (isParent && children) {
        const cStart = taskRowLookup.get(children[0].id) || rNum + 1;
        const cEnd = taskRowLookup.get(children[children.length - 1].id) || rNum + children.length;
        const parentW = Number(children.reduce((s, k) => s + (leafWeights.get(k.id) || 0), 0).toFixed(4));
        const parentWeightedAdv = children.reduce((s, k) => {
          const kw = leafWeights.get(k.id) || 0;
          const kp =
            typeof k.progress === 'number' && k.progress > 0
              ? Math.min(1, Math.max(0, k.progress / 100))
              : normalizeExcelStatus(k.status) === 'FINALIZADO'
                ? 1
                : normalizeExcelStatus(k.status) === 'EN PROCESO'
                  ? 0.5
                  : 0;
          return s + kw * kp;
        }, 0);
        const parentAdv = parentW > 0 ? Number((parentWeightedAdv / parentW).toFixed(4)) : 0;

        setCellNumber(mpeDoc, rowEl, `M${rNum}`, '44', parentW, `SUM(M${cStart}:M${cEnd})`);
        setCellNumber(
          mpeDoc,
          rowEl,
          `N${rNum}`,
          '44',
          parentAdv,
          `IFERROR(SUMPRODUCT(M${cStart}:M${cEnd},N${cStart}:N${cEnd})/SUM(M${cStart}:M${cEnd}),0)`
        );
        setCellNumber(mpeDoc, rowEl, `O${rNum}`, '44', Number(parentWeightedAdv.toFixed(4)), `SUM(O${cStart}:O${cEnd})`);
        setCellStringFormula(
          mpeDoc,
          rowEl,
          `Q${rNum}`,
          '44',
          `IF(COUNT(Q${cStart}:Q${cEnd})=0,"",IFERROR(SUM(R${cStart}:R${cEnd})/SUM(M${cStart}:M${cEnd}),""))`
        );
        setCellStringFormula(mpeDoc, rowEl, `R${rNum}`, '44', `IF(COUNT(Q${cStart}:Q${cEnd})=0,"",SUM(R${cStart}:R${cEnd}))`);
        setCellStringFormula(mpeDoc, rowEl, `S${rNum}`, '45', `IF($Q${rNum}="","",ROUND(($Q${rNum}-$N${rNum})*100,1))`);
        setCellEmptyStyled(mpeDoc, rowEl, `T${rNum}`, '46');
      } else {
        const w = leafWeights.get(task.id) ?? 0;
        const prog =
          typeof task.progress === 'number' && task.progress > 0
            ? Math.min(1, Math.max(0, Number((task.progress / 100).toFixed(2))))
            : normStatus === 'FINALIZADO'
              ? 1
              : normStatus === 'EN PROCESO'
                ? 0.5
                : 0;
        const incAdv = Number((w * prog).toFixed(4));
        axisWeightedAdvanceSum += incAdv;

        setCellNumber(mpeDoc, rowEl, `M${rNum}`, '50', w);
        setCellNumber(mpeDoc, rowEl, `N${rNum}`, '50', prog);
        setCellNumber(mpeDoc, rowEl, `O${rNum}`, '51', incAdv, `IFERROR(M${rNum}*N${rNum},0)`);
        setCellEmptyStyled(mpeDoc, rowEl, `Q${rNum}`, '50');
        setCellStringFormula(mpeDoc, rowEl, `R${rNum}`, '51', `IF($Q${rNum}="", "", $M${rNum}*$Q${rNum})`);
        setCellStringFormula(mpeDoc, rowEl, `S${rNum}`, '52', `IF($Q${rNum}="", "", ROUND(($Q${rNum}-$N${rNum})*100,1))`);
        const ctrlFormula = `IF(OR($Q${rNum}="",$K${rNum}="",$K${rNum}="CANCELADO"),"",IF(ABS($Q${rNum}-IF($K${rNum}="FINALIZADO",1,IF($K${rNum}="AVANZADO",0.75,IF(OR($K${rNum}="EN PROCESO",$K${rNum}="RETRASADO"),0.5,IF($K${rNum}="PENDIENTE",0.25,0)))))<=0.25,"OK","REVISAR ESTADO"))`;
        setCellStringFormula(mpeDoc, rowEl, `T${rNum}`, '53', ctrlFormula);
      }

      // Cols V..BJ (22..62): 41 Gantt cells with style '47'
      for (let colIdx = 22; colIdx <= 62; colIdx++) {
        setCellEmptyStyled(mpeDoc, rowEl, `${colIndexToLetter(colIdx)}${rNum}`, '47');
      }

      mpeSheetData.appendChild(rowEl);
    });

    if (axisLastRow > axisFirstRow) {
      revdMerges.push(
        `B${axisFirstRow}:B${axisLastRow}`,
        `C${axisFirstRow}:C${axisLastRow}`,
        `D${axisFirstRow}:D${axisLastRow}`,
        `E${axisFirstRow}:E${axisLastRow}`
      );
    }

    // Append Axis Weighted Closing Row (`▶  AVANCE PONDERADO DEL EJE {axisNum}`)
    const totRowNum = curR++;
    const totRow = mpeDoc.createElementNS(SPREADSHEET_NS, 'row');
    totRow.setAttribute('r', String(totRowNum));
    totRow.setAttribute('ht', '15');
    totRow.setAttribute('customHeight', 'true');

    setCellString(
      mpeDoc,
      totRow,
      `B${totRowNum}`,
      '54',
      sst.intern(`▶  AVANCE PONDERADO DEL EJE ${axisNum}  (control de incidencia = 100%)`)
    );
    for (let c = 3; c <= 11; c++) {
      setCellEmptyStyled(mpeDoc, totRow, `${colIndexToLetter(c)}${totRowNum}`, '54');
    }
    setCellString(mpeDoc, totRow, `L${totRowNum}`, '55', sst.intern('TOTAL EJE'));
    setCellNumber(
      mpeDoc,
      totRow,
      `M${totRowNum}`,
      '56',
      1,
      `SUMIF($L$${axisFirstRow}:$L$${axisLastRow},"ACCIÓN",M$${axisFirstRow}:M$${axisLastRow})`
    );
    setCellString(mpeDoc, totRow, `N${totRowNum}`, '57', sst.intern('—'));
    const cleanAxisAdv = Number(axisWeightedAdvanceSum.toFixed(4));
    setCellNumber(
      mpeDoc,
      totRow,
      `O${totRowNum}`,
      '58',
      cleanAxisAdv,
      `SUMIF($L$${axisFirstRow}:$L$${axisLastRow},"ACCIÓN",O$${axisFirstRow}:O$${axisLastRow})`
    );
    setCellString(mpeDoc, totRow, `Q${totRowNum}`, '57', sst.intern('—'));
    setCellStringFormula(
      mpeDoc,
      totRow,
      `R${totRowNum}`,
      '58',
      `IF(COUNT(Q${axisFirstRow}:Q${axisLastRow})=0,"",SUMIF($L$${axisFirstRow}:$L$${axisLastRow},"ACCIÓN",R$${axisFirstRow}:R$${axisLastRow}))`
    );
    setCellStringFormula(mpeDoc, totRow, `S${totRowNum}`, '59', `IF($R${totRowNum}="","",ROUND(($R${totRowNum}-$O${totRowNum})*100,1))`);
    setCellEmptyStyled(mpeDoc, totRow, `T${totRowNum}`, '60');
    for (let c = 22; c <= 62; c++) {
      setCellEmptyStyled(mpeDoc, totRow, `${colIndexToLetter(c)}${totRowNum}`, '61');
    }

    mpeSheetData.appendChild(totRow);
    revdMerges.push(`B${totRowNum}:K${totRowNum}`);

    axisRangeCoords.push({
      firstRow: axisFirstRow,
      lastRow: axisLastRow,
      totalRow: totRowNum,
      leafCount: leafTasks.length,
      weightedAdv: cleanAxisAdv,
    });
  }

  const lastGridRow = curR - 1;

  // Append cloned Legend & Weighting Methodology rows (127..142 shifted cleanly)
  const footerBase = curR;
  footerTemplateRows.forEach(({ offset, node }) => {
    const targetR = footerBase + offset;
    node.setAttribute('r', String(targetR));
    Array.from(node.getElementsByTagName('c')).forEach((cEl) => {
      const colPrefix = (cEl.getAttribute('r') || '').replace(/\d+$/, '');
      cEl.setAttribute('r', `${colPrefix}${targetR}`);
    });
    mpeSheetData.appendChild(node);
    curR = Math.max(curR, targetR + 1);
  });

  // Merges for weighting legend block (matching B135:J135 .. B142:J142 -> offset +8..+15 from footerBase)
  for (let off = 8; off <= 15; off++) {
    revdMerges.push(`B${footerBase + off}:J${footerBase + off}`);
  }

  // Place hidden Gantt Date Reference Row (at 206, or curR + 10 if plan has >190 rows)
  const dateRefRowNum = Math.max(206, curR + 10);
  if (dateRefRow206) {
    dateRefRow206.setAttribute('r', String(dateRefRowNum));
    Array.from(dateRefRow206.getElementsByTagName('c')).forEach((cEl) => {
      const colPrefix = (cEl.getAttribute('r') || '').replace(/\d+$/, '');
      cEl.setAttribute('r', `${colPrefix}${dateRefRowNum}`);
    });
    mpeSheetData.appendChild(dateRefRow206);
  }

  const mpeMergesEl = mpeDoc.getElementsByTagName('mergeCells')[0];
  if (mpeMergesEl) {
    while (mpeMergesEl.firstChild) mpeMergesEl.removeChild(mpeMergesEl.firstChild);
    mpeMergesEl.setAttribute('count', String(revdMerges.length));
    revdMerges.forEach((ref) => {
      const mc = mpeDoc.createElementNS(SPREADSHEET_NS, 'mergeCell');
      mc.setAttribute('ref', ref);
      mpeMergesEl.appendChild(mc);
    });
  }

  // Update MPE Conditional Formatting (5 axis M{totalRow} rules + V6:BJ Gantt rule)
  const mpeCfs = Array.from(mpeDoc.getElementsByTagName('conditionalFormatting'));
  let axisCfIdx = 0;
  mpeCfs.forEach((cf) => {
    const sqref = cf.getAttribute('sqref') || '';
    if (sqref.startsWith('V6:')) {
      cf.setAttribute('sqref', `V6:BJ${Math.max(201, lastGridRow)}`);
      if (dateRefRowNum !== 206) {
        Array.from(cf.getElementsByTagName('formula')).forEach((fEl) => {
          if (fEl.textContent) {
            fEl.textContent = fEl.textContent.replace(/V\$206/g, `V$${dateRefRowNum}`);
          }
        });
      }
    } else if (/^M\d+$/.test(sqref) && axisRangeCoords[axisCfIdx]) {
      cf.setAttribute('sqref', `M${axisRangeCoords[axisCfIdx].totalRow}`);
      axisCfIdx++;
    }
  });

  const mpeDim = mpeDoc.getElementsByTagName('dimension')[0];
  if (mpeDim) mpeDim.setAttribute('ref', `A1:BJ${dateRefRowNum}`);

  zip.file('xl/worksheets/sheet2.xml', serializeXmlDoc(mpeDoc));

  // =========================================================================
  // 3. AVANCE-EJES (xl/worksheets/sheet3.xml) — Live MPE ↔ PENT-PE Bridge
  // =========================================================================
  const avDoc = parser.parseFromString(await zip.file('xl/worksheets/sheet3.xml')!.async('string'), 'application/xml');
  updateSheetCellString(avDoc, 'A1', `${clientName}  ·  PUENTE MPE → IME`, sst);

  for (let i = 0; i < 5; i++) {
    const rNum = 7 + i;
    const pentRow = 8 + i;
    const coords = axisRangeCoords[i];
    const rowEl = findRow(avDoc, rNum);
    if (!rowEl || !coords) continue;

    const axisLabel = axesMeta[i].fullName.replace(/^Eje\s+(\d+)\s*·\s*/i, 'EJE $1 — ');
    setCellString(avDoc, rowEl, `B${rNum}`, '75', sst.intern(axisLabel));
    setCellNumber(
      avDoc,
      rowEl,
      `C${rNum}`,
      '76',
      coords.leafCount,
      `COUNTIF(MPE!$L$${coords.firstRow}:$L$${coords.lastRow},"ACCIÓN")`
    );
    setCellNumber(avDoc, rowEl, `D${rNum}`, '77', 1, `MPE!M${coords.totalRow}`);
    setCellStringFormula(avDoc, rowEl, `E${rNum}`, '78', `IF(ROUND(D${rNum},4)=1,"OK","REVISAR")`, 'OK');
    setCellNumber(avDoc, rowEl, `F${rNum}`, '79', coords.weightedAdv, `MPE!O${coords.totalRow}`);
    const imeDirect = Number((coords.weightedAdv * 10).toFixed(1));
    setCellNumber(avDoc, rowEl, `G${rNum}`, '80', imeDirect, `ROUND(F${rNum}*10,1)`);
    setCellNumber(avDoc, rowEl, `H${rNum}`, '80', lbScores[i], `'PENT-PE'!C${pentRow}`);
    setCellNumber(avDoc, rowEl, `I${rNum}`, '80', metaScores[i], `'PENT-PE'!L${pentRow}`);
    const sugScore = Number((lbScores[i] + (metaScores[i] - lbScores[i]) * coords.weightedAdv).toFixed(1));
    setCellNumber(avDoc, rowEl, `J${rNum}`, '81', sugScore, `ROUND(H${rNum}+(I${rNum}-H${rNum})*F${rNum},1)`);
    setCellNumber(avDoc, rowEl, `K${rNum}`, '82', Number((lbScores[i] / 10).toFixed(2)), `IF('PENT-PE'!D${pentRow}="",'PENT-PE'!C${pentRow}/10,'PENT-PE'!D${pentRow}/10)`);
    setCellNumber(avDoc, rowEl, `L${rNum}`, '83', Number(((coords.weightedAdv - lbScores[i] / 10) * 100).toFixed(1)), `ROUND((F${rNum}-K${rNum})*100,1)`);
    setCellStringFormula(avDoc, rowEl, `M${rNum}`, '78', `IF(K${rNum}="","—",IF(ABS(L${rNum})<=0.5,"COHERENTE","REVISAR"))`);
    setCellStringFormula(avDoc, rowEl, `N${rNum}`, '79', `IF(MPE!R${coords.totalRow}="","",MPE!R${coords.totalRow})`);
    setCellStringFormula(avDoc, rowEl, `O${rNum}`, '80', `IF(N${rNum}="","",ROUND(N${rNum}*10,1))`);
    setCellStringFormula(avDoc, rowEl, `P${rNum}`, '82', `IF('PENT-PE'!E${pentRow}="", "", 'PENT-PE'!E${pentRow}/10)`);
    setCellStringFormula(avDoc, rowEl, `Q${rNum}`, '83', `IF(OR(N${rNum}="",P${rNum}=""),"",ROUND((N${rNum}-P${rNum})*100,1))`);
    setCellStringFormula(avDoc, rowEl, `R${rNum}`, '78', `IF(Q${rNum}="","—",IF(ABS(Q${rNum})<=0.5,"COHERENTE","REVISAR"))`);
  }

  zip.file('xl/worksheets/sheet3.xml', serializeXmlDoc(avDoc));

  // =========================================================================
  // 4. PENT-PE (xl/worksheets/sheet4.xml) + DATOS_PENT (sheet6.xml) + CHARTS
  // =========================================================================
  const pentDoc = parser.parseFromString(await zip.file('xl/worksheets/sheet4.xml')!.async('string'), 'application/xml');
  updateSheetCellString(pentDoc, 'A2', `PENTÁGONO DEL ORDEN  ·  ${clientName}`, sst);
  updateSheetCellString(
    pentDoc,
    'A3',
    `Sistema de Seguimiento de Madurez Estratégica ${periodLabel}  ·  Escala 0 a 10 por eje`,
    sst
  );

  const quarterCols = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const realColsCache: Record<string, (number | null)[]> = {
    C: [...lbScores],
    D: [null, null, null, null, null],
    E: [null, null, null, null, null],
    F: [null, null, null, null, null],
    G: [null, null, null, null, null],
    H: [null, null, null, null, null],
    I: [null, null, null, null, null],
    J: [null, null, null, null, null],
    K: [null, null, null, null, null],
    L: [...metaScores],
  };

  if (input.quarterlyReviews && input.quarterlyReviews.length > 0) {
    input.quarterlyReviews.slice(0, 8).forEach((qr, qIdx) => {
      const colLet = quarterCols[qIdx];
      if (colLet && qr.pentagon_scores) {
        realColsCache[colLet] = [
          qr.pentagon_scores.gobernanza,
          qr.pentagon_scores.procesos,
          qr.pentagon_scores.finanzas,
          qr.pentagon_scores.talento,
          qr.pentagon_scores.comercial,
        ];
      }
    });
  }

  const axisChartLabels: string[] = [];
  const bStylesPent = ['106', '111', '112', '113', '114'];

  for (let i = 0; i < 5; i++) {
    const rNum = 8 + i;
    const rowEl = findRow(pentDoc, rNum);
    const axisLabel = axesMeta[i].fullName.replace(/^Eje\s+(\d+)\s*·\s*/i, 'EJE $1 — ');
    axisChartLabels.push(axisLabel);

    if (rowEl) {
      setCellString(pentDoc, rowEl, `B${rNum}`, bStylesPent[i], sst.intern(axisLabel));
      setCellNumber(pentDoc, rowEl, `C${rNum}`, '107', lbScores[i]);

      quarterCols.forEach((colLet) => {
        const qVal = realColsCache[colLet][i];
        if (qVal !== null && qVal !== undefined) {
          setCellNumber(pentDoc, rowEl, `${colLet}${rNum}`, '108', qVal);
        } else {
          setCellEmptyStyled(pentDoc, rowEl, `${colLet}${rNum}`, '108');
        }
      });

      setCellNumber(pentDoc, rowEl, `L${rNum}`, '109', metaScores[i]);

      let latestVal = lbScores[i];
      quarterCols.forEach((colLet) => {
        const v = realColsCache[colLet][i];
        if (v !== null && v !== undefined) latestVal = v;
      });
      const mFormula = `IF(K${rNum}<>"",K${rNum},IF(J${rNum}<>"",J${rNum},IF(I${rNum}<>"",I${rNum},IF(H${rNum}<>"",H${rNum},IF(G${rNum}<>"",G${rNum},IF(F${rNum}<>"",F${rNum},IF(E${rNum}<>"",E${rNum},IF(D${rNum}<>"",D${rNum},C${rNum}))))))))`;
      setCellNumber(pentDoc, rowEl, `M${rNum}`, '110', latestVal, mFormula);
    }
  }

  const row13 = findRow(pentDoc, 13);
  if (row13) {
    const allScoreCols = ['C', ...quarterCols, 'L'];
    allScoreCols.forEach((colLet) => {
      const vals = realColsCache[colLet];
      const allPresent = vals.every((v) => v !== null && v !== undefined);
      const cachedAvg = allPresent ? Number(((vals as number[]).reduce((a, b) => a + b, 0) / 5).toFixed(2)) : null;
      const style = colLet === 'C' ? '116' : colLet === 'L' ? '118' : '117';
      setCellNumber(pentDoc, row13, `${colLet}13`, style, cachedAvg, `IF(COUNT(${colLet}8:${colLet}12)=5,AVERAGE(${colLet}8:${colLet}12),"")`);
    });
    const m13Formula = `IF(K13<>"",K13,IF(J13<>"",J13,IF(I13<>"",I13,IF(H13<>"",H13,IF(G13<>"",G13,IF(F13<>"",F13,IF(E13<>"",E13,IF(D13<>"",D13,C13))))))))`;
    setCellNumber(pentDoc, row13, 'M13', '119', avgIme10, m13Formula);
  }

  const projCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const projColsCache: Record<string, (number | null)[]> = {};
  projCols.forEach((c) => {
    projColsCache[c] = [];
  });
  const shortProjLabels = ['E1 — Gobernanza', 'E2 — Procesos', 'E3 — Finanzas', 'E4 — Talento', 'E5 — Comercial'];

  for (let i = 0; i < 5; i++) {
    const rNum = 44 + i;
    const rowEl = findRow(pentDoc, rNum);
    if (rowEl) {
      setCellString(pentDoc, rowEl, `B${rNum}`, bStylesPent[i], sst.intern(shortProjLabels[i]));
    }
    const startV = lbScores[i];
    const endV = metaScores[i];
    projCols.forEach((colLet, stepIdx) => {
      const t = stepIdx / (projCols.length - 1);
      const val = Number((startV + (endV - startV) * Math.pow(t, 0.85)).toFixed(1));
      projColsCache[colLet].push(val);
      if (rowEl) {
        setCellNumber(pentDoc, rowEl, `${colLet}${rNum}`, '158', val);
      }
    });
  }

  const row49 = findRow(pentDoc, 49);
  if (row49) {
    projCols.forEach((colLet) => {
      const vals = projColsCache[colLet] as number[];
      const cached = Number((vals.reduce((a, b) => a + b, 0) / 5).toFixed(2));
      setCellNumber(pentDoc, row49, `${colLet}49`, '161', cached, `AVERAGE(${colLet}44:${colLet}48)`);
    });
  }

  zip.file('xl/worksheets/sheet4.xml', serializeXmlDoc(pentDoc));

  // Update DATOS_PENT (sheet6.xml)
  const dpFile = zip.file('xl/worksheets/sheet6.xml');
  if (dpFile) {
    const dpDoc = parser.parseFromString(await dpFile.async('string'), 'application/xml');
    const shortNames = ['Gobernanza', 'Procesos', 'Finanzas', 'Talento', 'Comercial'];
    for (let i = 0; i < 5; i++) {
      const dpRow = findRow(dpDoc, 2 + i);
      if (dpRow) {
        setCellString(dpDoc, dpRow, `A${2 + i}`, null, sst.intern(shortNames[i]));
        projCols.forEach((pentCol, idx) => {
          const dpCol = colIndexToLetter(2 + idx);
          const val = realColsCache[pentCol]?.[i] ?? null;
          setCellNumber(dpDoc, dpRow, `${dpCol}${2 + i}`, null, val, `'PENT-PE'!${pentCol}${8 + i}`);
        });
      }
    }
    zip.file('xl/worksheets/sheet6.xml', serializeXmlDoc(dpDoc));
  }

  const chart1File = zip.file('xl/charts/chart1.xml');
  if (chart1File) {
    zip.file(
      'xl/charts/chart1.xml',
      updateChartXmlSeriesCache(await chart1File.async('string'), '&apos;PENT-PE&apos;!\\$', 44, 48, shortProjLabels, projColsCache)
    );
  }
  const chart2File = zip.file('xl/charts/chart2.xml');
  if (chart2File) {
    zip.file(
      'xl/charts/chart2.xml',
      updateChartXmlSeriesCache(await chart2File.async('string'), '&apos;PENT-PE&apos;!\\$', 8, 12, axisChartLabels, realColsCache)
    );
  }

  // =========================================================================
  // 5. MATRIZ DE RIESGOS (xl/worksheets/sheet5.xml)
  // =========================================================================
  const matDoc = parser.parseFromString(await zip.file('xl/worksheets/sheet5.xml')!.async('string'), 'application/xml');
  updateSheetCellString(matDoc, 'A1', `MATRIZ DE RIESGOS  ·  ${clientName}  ·  Registro de Riesgos Organizacionales`, sst);
  updateSheetCellString(
    matDoc,
    'A2',
    `Basada en el Diagnóstico PyME 360° (IME ${ime100}/100 · ${maturityBand} · IRE ${ire100}/100) y alineada al Master Plan ${periodLabel}`,
    sst
  );

  // MODELO.Revd has 28 risk rows (rows 5..32)
  const risks28 = mappedRisks.slice(0, 28);
  while (risks28.length < 28) {
    const extra = mappedRisks[risks28.length % mappedRisks.length];
    risks28.push({ ...extra, code: `R-${String(risks28.length + 1).padStart(2, '0')}` });
  }

  let sumInh = 0;
  let sumRes = 0;

  risks28.forEach((risk, idx) => {
    const rNum = 5 + idx;
    const rowEl = findRow(matDoc, rNum);
    if (!rowEl) return;

    const inh = risk.probInherent * risk.impInherent;
    const res = risk.probResidual * risk.impResidual;
    sumInh += inh;
    sumRes += res;

    const codeLabel = `R-${String(idx + 1).padStart(2, '0')}`;
    const catStyle = resolveRevdRiskCatStyle(risk.category);

    setCellString(matDoc, rowEl, `A${rNum}`, '167', sst.intern(codeLabel));
    setCellString(matDoc, rowEl, `B${rNum}`, catStyle, sst.intern(risk.category));
    setCellString(matDoc, rowEl, `C${rNum}`, '169', sst.intern(risk.riskName));
    setCellString(matDoc, rowEl, `D${rNum}`, '169', sst.intern(risk.cause));
    setCellString(matDoc, rowEl, `E${rNum}`, '169', sst.intern(risk.consequence));
    setCellNumber(matDoc, rowEl, `F${rNum}`, '170', risk.probInherent);
    setCellNumber(matDoc, rowEl, `G${rNum}`, '170', risk.impInherent);
    setCellNumber(matDoc, rowEl, `H${rNum}`, '171', inh, `F${rNum}*G${rNum}`);
    setCellString(matDoc, rowEl, `I${rNum}`, '172', sst.intern(risk.strategy));
    setCellString(matDoc, rowEl, `J${rNum}`, '169', sst.intern(risk.mitigationActions));
    setCellString(matDoc, rowEl, `K${rNum}`, '169', sst.intern(risk.responsibleRole));
    setCellNumber(matDoc, rowEl, `L${rNum}`, '170', risk.probResidual);
    setCellNumber(matDoc, rowEl, `M${rNum}`, '170', risk.impResidual);
    setCellNumber(matDoc, rowEl, `N${rNum}`, '171', res, `L${rNum}*M${rNum}`);
    setCellString(matDoc, rowEl, `O${rNum}`, '169', sst.intern(risk.earlyWarningKpi));
  });

  const residualIre = Number(((sumRes / 28 / 25) * 100).toFixed(1));
  let latestIre = ire100;

  // Clear static demo M1/M2 formulas in rows 41..48 unless client has actual quarterlyReviews
  for (let qIdx = 0; qIdx < 8; qIdx++) {
    const qRow = findRow(matDoc, 41 + qIdx);
    if (!qRow) continue;
    const qr = input.quarterlyReviews?.[qIdx];
    if (qr && typeof qr.ire_score === 'number') {
      latestIre = qr.ire_score;
      setCellNumber(matDoc, qRow, `C${41 + qIdx}`, '222', qr.ire_score);
    } else {
      setCellEmptyStyled(matDoc, qRow, `C${41 + qIdx}`, '222');
    }
  }

  const matRow37 = findRow(matDoc, 37);
  if (matRow37) {
    setCellNumber(matDoc, matRow37, 'B37', '211', ire100);
    setCellNumber(matDoc, matRow37, 'F37', '212', latestIre, 'C50');
    setCellNumber(matDoc, matRow37, 'J37', '213', residualIre, 'ROUND(AVERAGE(N5:N32)/25*100,1)');
    const redPct = ire100 - residualIre === 0 ? 0 : (ire100 - latestIre) / (ire100 - residualIre);
    setCellNumber(matDoc, matRow37, 'N37', '214', redPct, 'IF(B37-J37=0,0,(B37-F37)/(B37-J37))');
  }

  const matRow40 = findRow(matDoc, 40);
  if (matRow40) {
    setCellNumber(matDoc, matRow40, 'C40', '220', ire100);
  }
  const matRow49 = findRow(matDoc, 49);
  if (matRow49) {
    setCellNumber(matDoc, matRow49, 'C49', '223', residualIre, 'ROUND(AVERAGE(N5:N32)/25*100,1)');
  }
  const matRow50 = findRow(matDoc, 50);
  if (matRow50) {
    setCellNumber(matDoc, matRow50, 'C50', '225', latestIre, 'IFERROR(LOOKUP(2,1/(C40:C48<>""),C40:C48),C40)');
  }

  zip.file('xl/worksheets/sheet5.xml', serializeXmlDoc(matDoc));

  // Force full calculation on Excel open
  const wbFile = zip.file('xl/workbook.xml');
  if (wbFile) {
    let wbXml = await wbFile.async('string');
    if (wbXml.includes('<calcPr')) {
      wbXml = wbXml.replace(/<calcPr[^>]*\/>/, '<calcPr calcId="191029" fullCalcOnLoad="1"/>');
    } else {
      wbXml = wbXml.replace('</workbook>', '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    }
    zip.file('xl/workbook.xml', wbXml);
  }

  zip.file('xl/sharedStrings.xml', sst.serialize());

  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });

  const fileName = `${projectCode}-${slug}-Master_Plan_Estrategico_MODELO.Rev${revCode}.xlsx`;
  triggerDownload(outBlob, fileName);
}

/**
 * High-level helper that collects 100% of a client's live platform data from LocalStorage + Supabase
 * (Stage 0 Relevamiento, Stage 1 OMV + 8 CVA Targets, Stage 2 Diagnostic 360°, Quarterly Reviews,
 * Axes Strategic Metadata, Risks, and Master Plan Tasks) and exports the exact template-mapped `.xlsx`.
 * - `mode = 'revd'` (default): Full 6-Sheet `26-030 MODELO.Revd` (with `INCIDENCIA`, `AVANCE`, & `AVANCE-EJES` bridge)
 * - `mode = 'rev0'`: Initial 5-Sheet `00-000 TEMPLATE`
 */
export async function exportClientFullMappedMasterPlan(params: {
  client: { id: string; name: string; industry?: string };
  tasks: MasterPlanTaskItem[];
  axesMeta?: GSAxisStrategicMeta[];
  diagnosticResults?: FullDiagnosticResults;
  pentagonPeriods?: PentagonPeriod[];
  consultantNames?: string;
  omvOverride?: string;
  mode?: 'revd' | 'rev0';
}): Promise<void> {
  const { client } = params;
  let projectCode = localStorage.getItem(`gs_project_code_${client.id}`) || '26-030';
  let employeesLabel = '';
  let omvText = params.omvOverride || '';
  let revision = '0';

  // 1. Read Stage 0 Relevamiento (projectCode, employeesCount)
  try {
    const rawRel = localStorage.getItem(`gs_relevamiento_propuesta_${client.id}`);
    if (rawRel) {
      const rel = JSON.parse(rawRel);
      if (rel.projectCode) projectCode = rel.projectCode;
      if (rel.employeesCount) employeesLabel = rel.employeesCount;
    }
  } catch {
    // ignore
  }

  // 2. Read Stage 1 OMV Declaration + Revision + 8 CVA Targets
  try {
    const rawRevs = localStorage.getItem(`gs_omb_revisions_${client.id}`);
    if (rawRevs) {
      const revs = JSON.parse(rawRevs);
      const rev0 = revs.find((r: any) => r.isBaselineRev0) || revs[revs.length - 1] || revs[0];
      if (rev0) {
        if (!omvText && rev0.declarationText) omvText = rev0.declarationText;
        if (rev0.isBaselineRev0) {
          revision = '0';
        } else if (rev0.revisionCode) {
          const m = String(rev0.revisionCode).match(/Rev\s*([A-Z0-9]+)/i);
          if (m) revision = m[1];
        }
      }
    }

    const rawTargets = localStorage.getItem(`gs_omv_targets_${client.id}`);
    if (rawTargets) {
      const targets = JSON.parse(rawTargets);
      if (Array.isArray(targets)) {
        const empRow = targets.find((t: any) => String(t.indicator || '').toLowerCase().includes('dotación'));
        if (!employeesLabel && empRow?.currentValue) {
          employeesLabel = `${empRow.currentValue} (Meta 3 años: ${empRow.target3Years || 'en definición'})`;
        }
        const filledTargets = targets.filter((t: any) => t.target3Years && String(t.target3Years).trim());
        if (filledTargets.length > 0) {
          const targetsSummary = filledTargets
            .slice(0, 5)
            .map((t: any) => `${t.indicator}: ${t.target3Years}`)
            .join(' · ');
          if (omvText && !omvText.includes('Metas CVA:')) {
            omvText = `${omvText}\nMetas CVA 3 Años: ${targetsSummary}.`;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Read Axes Metadata if not passed explicitly
  let axesMeta = params.axesMeta;
  if (!axesMeta || axesMeta.length !== 5) {
    try {
      const rawAxes = localStorage.getItem(`gs_axes_meta_${client.id}`);
      if (rawAxes) axesMeta = JSON.parse(rawAxes);
    } catch {
      // ignore
    }
  }

  // 4. Fetch live Quarterly Reviews & OMV fallback from Supabase
  let quarterlyReviews: any[] = [];
  try {
    const [{ data: qData }, { data: omvDb }] = await Promise.all([
      ((supabase as any).from('quarterly_reviews'))
        .select('*')
        .eq('organization_id', client.id)
        .order('review_date', { ascending: true }),
      !omvText
        ? ((supabase as any).from('omv_modules'))
            .select('vision_3_years')
            .eq('organization_id', client.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (Array.isArray(qData) && qData.length > 0) {
      quarterlyReviews = qData;
    }
    if (!omvText && omvDb?.vision_3_years) {
      omvText = omvDb.vision_3_years;
    }
  } catch {
    // offline safe
  }

  const exportPayload: TemplateMappedExportInput = {
    clientId: client.id,
    clientName: client.name,
    projectCode,
    revision: params.mode === 'rev0' ? '0' : revision === '0' ? 'd' : revision,
    sector: client.industry || 'Servicios e Ingeniería PyME',
    employeesLabel: employeesLabel || 'Dotación activa PyME',
    consultantNames: params.consultantNames || 'Martín Gómez  |  Lucía Fernández — GS Consultora',
    omvText,
    globalIme: params.diagnosticResults?.globalIme,
    globalIre: params.diagnosticResults?.globalIre,
    maturityLabel: params.diagnosticResults?.maturityStatus?.label,
    axesMeta,
    tasks: params.tasks,
    pentagonPeriods: params.pentagonPeriods,
    diagnosticResults: params.diagnosticResults,
    quarterlyReviews,
    risks: INITIAL_RISKS,
  };

  if (params.mode === 'rev0') {
    await exportTemplateExactMasterPlanWorkbook(exportPayload);
  } else {
    await exportRevdModelExactMasterPlanWorkbook(exportPayload);
  }
}
