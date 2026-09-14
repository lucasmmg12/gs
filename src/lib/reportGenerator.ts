import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAllDiagnosticQuestions } from '../data/diagnosticQuestions';
import type { FullDiagnosticResults } from './diagnosticEngine';
import type { ResponseOptionValue } from '../data/diagnosticQuestions';

export interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ExcelReportOptions {
  fileName: string;
  sheets: ExcelSheetData[];
}

export interface PdfReportSection {
  title: string;
  content?: string;
  table?: {
    headers: string[];
    rows: (string | number)[][];
  };
  metrics?: { label: string; value: string | number }[];
}

export interface PdfReportOptions {
  fileName: string;
  title: string;
  subtitle?: string;
  clientName?: string;
  consultantName?: string;
  date?: string;
  sections: PdfReportSection[];
  kpis?: { label: string; value: string | number; change?: string }[];
}

/**
 * Generates and triggers download of a professionally structured Excel (.xlsx) file.
 */
export function generateExcelReport(options: ExcelReportOptions): void {
  const wb = XLSX.utils.book_new();

  options.sheets.forEach(sheet => {
    // Combine headers and rows
    const data = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto calculate column widths
    const colWidths = sheet.headers.map((header, colIdx) => {
      let maxLen = header.length;
      sheet.rows.forEach(row => {
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.slice(0, 31));
  });

  const safeFileName = options.fileName.endsWith('.xlsx') ? options.fileName : `${options.fileName}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

/**
 * Generates and triggers download of a clean, clinical executive PDF report.
 */
export function generatePdfReport(options: PdfReportOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = 18;

  // Header Banner - Institutional Navy/Blue
  doc.setFillColor(30, 64, 175); // #1e40af
  doc.rect(0, 0, pageWidth, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CONSULTORA GS  ·  GROW LABS  ·  SANATORIO ARGENTINO', margin, 8);
  doc.text(options.date || new Date().toLocaleDateString('es-AR'), pageWidth - margin, 8, { align: 'right' });

  // Main Report Title
  currentY += 8;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray 900
  doc.text(options.title, margin, currentY);

  if (options.subtitle) {
    currentY += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // Gray 500
    doc.text(options.subtitle, margin, currentY);
  }

  // Metadata Box
  currentY += 8;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.setFont('helvetica', 'bold');
  doc.text('Organización / Cliente:', margin + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(options.clientName || 'General / Consolidado', margin + 42, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Auditor / Consultor:', margin + 4, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(options.consultantName || 'Equipo Consultora GS', margin + 42, currentY + 12);

  currentY += 22;

  // KPI Highlights (if provided)
  if (options.kpis && options.kpis.length > 0) {
    const kpiCount = Math.min(options.kpis.length, 4);
    const boxWidth = (pageWidth - (margin * 2) - ((kpiCount - 1) * 4)) / kpiCount;
    const boxHeight = 16;

    options.kpis.slice(0, 4).forEach((kpi, idx) => {
      const boxX = margin + (idx * (boxWidth + 4));
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.setDrawColor(191, 219, 254); // Blue 200
      doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175); // Blue 800
      doc.text(kpi.label.toUpperCase(), boxX + 3, currentY + 5);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(17, 24, 39);
      doc.text(String(kpi.value), boxX + 3, currentY + 12);

      if (kpi.change) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(16, 185, 129); // Emerald 500
        doc.text(kpi.change, boxX + boxWidth - 3, currentY + 12, { align: 'right' });
      }
    });

    currentY += 22;
  }

  // Render Sections
  options.sections.forEach((section) => {
    // Check if new page needed
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }

    // Section Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(section.title, margin, currentY);
    currentY += 2;

    // Underline
    doc.setDrawColor(219, 234, 254);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    // Content text if present
    if (section.content) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81); // Gray 700
      const splitText = doc.splitTextToSize(section.content, pageWidth - (margin * 2));
      doc.text(splitText, margin, currentY);
      currentY += (splitText.length * 4.5) + 4;
    }

    // Table if present
    if (section.table && section.table.headers.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [section.table.headers],
        body: section.table.rows,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [31, 41, 55],
          cellPadding: 2.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          overflow: 'linebreak'
        }
      });

      // Update currentY after table
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  // Footer with Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175); // Gray 400
    doc.text(
      `Página ${i} de ${totalPages} · Consultora GS Sistema Estratégico · Confidencial`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeFileName = options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`;
  doc.save(safeFileName);
}

/**
 * Genera el Informe Oficial de Diagnóstico 360° en PDF con diseño ejecutivo institucional GS (Black & Crimson).
 */
export function exportDiagnostic360ExecutiveReport(
  client: { name: string; rubro?: string; location?: string; id?: string },
  results: FullDiagnosticResults,
  audit?: { leaderConsultant?: string; approvedBy?: string; approvedAt?: string; notes?: string }
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // Header Banner - Black & Crimson
  doc.setFillColor(9, 9, 11); // Zinc 950
  doc.rect(0, 0, pageWidth, 14, 'F');
  
  // Crimson Accent Bar
  doc.setFillColor(220, 38, 38); // Red 600
  doc.rect(0, 14, pageWidth, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CONSULTORA GS  ·  SISTEMA ESTRATÉGICO INTEGRAL 360°', margin, 9);
  doc.setTextColor(239, 68, 68);
  doc.text('GROWLABS METODOLOGÍA OFICIAL', pageWidth - margin, 9, { align: 'right' });

  currentY = 24;

  // Title Block
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(9, 9, 11);
  doc.text('INFORME DE DIAGNÓSTICO INTEGRAL 360°', margin, currentY);

  currentY += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Evaluación holística de Madurez Organizacional (IME) y Exposición al Riesgo (IRE)', margin, currentY);

  currentY += 6;
  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 18, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPRESA CLIENTE:', margin + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name || 'Empresa SAS', margin + 35, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO / APROBACIÓN:', margin + 95, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(audit?.approvedBy ? 'VERDE • APROBADO (OFICIAL)' : 'ROJO • REVISIÓN INTERNA (BACK)', margin + 138, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('CONSULTOR LÍDER:', margin + 4, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(audit?.leaderConsultant || 'Equipo Consultora GS', margin + 35, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('FECHA DE EMISIÓN:', margin + 95, currentY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(audit?.approvedAt || new Date().toLocaleDateString('es-AR'), margin + 138, currentY + 12);

  currentY += 24;

  // Key KPI Cards (IME, IRE, Madurez, Progreso)
  const cards = [
    { label: 'IME (MADUREZ GLOBAL)', value: `${results.globalIme}% (${results.globalIme10}/10)`, color: [220, 38, 38] },
    { label: 'IRE (RIESGO EMPRESARIO)', value: `${results.globalIre}%`, color: [185, 28, 28] },
    { label: 'ESTADO DE MADUREZ', value: results.maturityStatus.label.toUpperCase(), color: [9, 9, 11] },
    { label: 'COBERTURA DIAGNÓSTICO', value: `${results.totalAnswered} / ${results.totalQuestions} (${results.progressPercentage}%)`, color: [71, 85, 105] },
  ];

  const cardW = (pageWidth - (margin * 2) - (3 * 3)) / 4;
  cards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + 3);
    doc.setFillColor(244, 244, 245);
    doc.setDrawColor(212, 212, 216);
    doc.roundedRect(cx, currentY, cardW, 16, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(113, 113, 122);
    doc.text(c.label, cx + 3, currentY + 5);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, cx + 3, currentY + 12);
  });

  currentY += 22;

  // Section 1: Pentágono del Orden
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('1. PENTÁGONO DEL ORDEN (MADUREZ EN 5 EJES CLAVE)', margin, currentY);
  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [['Eje Estratégico', 'Puntaje Actual (0-10)', 'Meta Trienal (0-10)', 'Brecha', 'Interpretación']],
    body: [
      ['1. Dirección y Directorio', `${results.pentagon.directorio.toFixed(1)} / 10`, '8.0 / 10', `${(8.0 - results.pentagon.directorio).toFixed(1)}`, 'Gobernanza, socios y decisiones'],
      ['2. Procesos y Operaciones', `${results.pentagon.procesos.toFixed(1)} / 10`, '8.5 / 10', `${(8.5 - results.pentagon.procesos).toFixed(1)}`, 'Sistemas, calidad y estandarización'],
      ['3. Finanzas y Administración', `${results.pentagon.finanzas.toFixed(1)} / 10`, '8.5 / 10', `${(8.5 - results.pentagon.finanzas).toFixed(1)}`, 'Control de caja, costos y rentabilidad'],
      ['4. Talento Humano y Equipo', `${results.pentagon.talento.toFixed(1)} / 10`, '8.0 / 10', `${(8.0 - results.pentagon.talento).toFixed(1)}`, 'Cultura, liderazgo y roles'],
      ['5. Comercial y Clientes', `${results.pentagon.comercial.toFixed(1)} / 10`, '8.0 / 10', `${(8.0 - results.pentagon.comercial).toFixed(1)}`, 'Ventas, posicionamiento y recurrencia'],
    ],
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [9, 9, 11], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 2.2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Evaluación por 10 Áreas
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('2. EVALUACIÓN DETALLADA POR LAS 10 ÁREAS ORGANIZACIONALES', margin, currentY);
  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  const areaRows = results.areaScores.map(a => [
    `Área ${a.areaNumber}: ${a.areaName}`,
    a.pentagonAxis,
    `${a.answeredCount} / ${a.totalQuestions}`,
    `${a.imeScore}% (${a.imeScale10}/10)`,
    `${a.ireScore}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Área Evaluada', 'Eje PENT-PE', 'Respondidas', 'IME (Madurez)', 'IRE (Riesgo)']],
    body: areaRows,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: [9, 9, 11], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 2.2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Nueva página para Riesgos y FODA
  doc.addPage();
  currentY = 20;

  // Section 3: Focos Críticos de Riesgo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('3. MATRIZ DE FOCOS CRÍTICOS DE RIESGO DETECTADOS', margin, currentY);
  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  const riskRows = results.risks.slice(0, 10).map(r => [
    r.code,
    r.category,
    r.description,
    r.severityLevel,
    r.suggestedAction,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Código', 'Categoría', 'Descripción del Riesgo', 'Severidad', 'Acción Mitigante Recomendada']],
    body: riskRows.length > 0 ? riskRows : [['-', 'General', 'No se han detectado riesgos críticos pendientes.', 'Bajo', 'Mantener monitoreo continuo']],
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 25 },
      2: { cellWidth: 65 },
      3: { cellWidth: 20 },
      4: { cellWidth: 55 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Section 4: FODA Estratégico
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('4. MATRIZ FODA CONSOLIDADA (ORIGEN DE DIAGNÓSTICO CERRADO)', margin, currentY);
  currentY += 2;
  doc.setDrawColor(220, 38, 38);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  const maxItems = 4;
  const fodaRows: string[][] = [];
  for (let i = 0; i < maxItems; i++) {
    const f = results.foda.fortalezas[i]?.text || '-';
    const d = results.foda.debilidades[i]?.text || '-';
    const o = results.foda.oportunidades[i]?.text || '-';
    const a = results.foda.amenazas[i]?.text || '-';
    fodaRows.push([f, d, o, a]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['FORTALEZAS (F)', 'DEBILIDADES (D)', 'OPORTUNIDADES (O)', 'AMENAZAS (A)']],
    body: fodaRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [9, 9, 11], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
  });

  // Footer con paginación
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Página ${i} de ${totalPages} · Consultora GS · Informe de Diagnóstico 360° · Documento de Propiedad Confidencial`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safeFileName = `Diagnostico_360_${(client.name || 'Cliente').replace(/\s+/g, '_')}_GS.pdf`;
  doc.save(safeFileName);
}

/**
 * Genera el archivo Excel completo con todas las respuestas, scores y matrices del Diagnóstico 360°.
 */
export function exportDiagnosticResponsesExcel(
  clientName: string,
  answers: Record<number, ResponseOptionValue>,
  results: FullDiagnosticResults
): void {
  const allQuestions = getAllDiagnosticQuestions();
  
  // Sheet 1: Resumen
  const resumenRows = [
    ['Empresa Cliente', clientName],
    ['Fecha de Exportación', new Date().toLocaleDateString('es-AR')],
    ['IME Global (Madurez)', `${results.globalIme}%`],
    ['IME Escala Pentágono', `${results.globalIme10} / 10`],
    ['IRE Global (Riesgo)', `${results.globalIre}%`],
    ['Estado de Madurez', results.maturityStatus.label],
    ['Total Preguntas Respondidas', `${results.totalAnswered} de ${results.totalQuestions}`],
    ['', ''],
    ['PENTÁGONO DEL ORDEN (5 EJES)', ''],
    ['Gobernanza y Directorio', results.pentagon.directorio],
    ['Procesos y Operaciones', results.pentagon.procesos],
    ['Finanzas y Control', results.pentagon.finanzas],
    ['Talento Humano', results.pentagon.talento],
    ['Comercial y Clientes', results.pentagon.comercial],
  ];

  // Sheet 2: Áreas
  const areasRows = results.areaScores.map(a => [
    a.areaNumber,
    a.areaName,
    a.pentagonAxis,
    a.answeredCount,
    a.totalQuestions,
    `${a.imeScore}%`,
    `${a.ireScore}%`
  ]);

  // Sheet 3: Respuestas Detalladas
  const respuestasRows = allQuestions.map(q => {
    const val = answers[q.id];
    const opt = q.options.find(o => o.value === val);
    return [
      q.code,
      q.areaId,
      q.title,
      opt ? opt.shortLabel : 'Sin responder',
      opt ? opt.label : '',
      opt ? opt.maturityScore : 0,
      opt ? opt.riskScore : 0,
      q.kpi || ''
    ];
  });

  // Sheet 4: Riesgos
  const riesgosRows = results.risks.map(r => [
    r.code,
    r.category,
    r.description,
    r.probability,
    r.impact,
    r.severityScore,
    r.severityLevel,
    r.suggestedAction
  ]);

  generateExcelReport({
    fileName: `Diagnostico_360_Respuestas_${clientName.replace(/\s+/g, '_')}`,
    sheets: [
      {
        sheetName: 'Resumen Ejecutivo',
        headers: ['Indicador / Eje', 'Valor'],
        rows: resumenRows
      },
      {
        sheetName: 'Scores por Área',
        headers: ['N°', 'Área', 'Eje Pentágono', 'Respondidas', 'Total', 'IME %', 'IRE %'],
        rows: areasRows
      },
      {
        sheetName: '78 Preguntas Oficiales',
        headers: ['Código', 'Área ID', 'Pregunta', 'Opción Corta', 'Opción Detallada', 'Score Madurez', 'Score Riesgo', 'KPI'],
        rows: respuestasRows
      },
      {
        sheetName: 'Matriz de Riesgos',
        headers: ['Código', 'Categoría', 'Descripción', 'Probabilidad', 'Impacto', 'P x I', 'Nivel Severidad', 'Acción Mitigante'],
        rows: riesgosRows
      }
    ]
  });
}
