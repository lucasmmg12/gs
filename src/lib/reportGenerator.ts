import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
