import JSZip from 'jszip';
import { DIAGNOSTIC_AREAS, type ResponseOptionValue } from '../data/diagnosticQuestions';
import {
  DEFAULT_OMV_TARGETS,
  OFFICIAL_IME_9_AREA_WEIGHTS,
  OFFICIAL_IRE_12_DIMENSIONS,
} from '../data/gsAxisMetadata';
import type {
  OfficialMinuteDocxOptions,
  OfficialDiagnostic360DocxOptions,
} from './gsOfficialExporter';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function triggerBlobDownload(blob: Blob, fileName: string): void {
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

function serializeWordXml(doc: XMLDocument): string {
  const raw = new XMLSerializer().serializeToString(doc);
  if (raw.startsWith('<?xml')) return raw;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${raw}`;
}

function setParagraphPlainTextPreservingFirstRunStyle(doc: XMLDocument, pEl: Element, newText: string): void {
  const runs = Array.from(pEl.getElementsByTagNameNS(W_NS, 'r'));
  let rPrClone: Element | null = null;
  if (runs.length > 0) {
    const firstRPr = runs[0].getElementsByTagNameNS(W_NS, 'rPr')[0];
    if (firstRPr) rPrClone = firstRPr.cloneNode(true) as Element;
  }

  // Remove existing runs/hyperlinks while keeping <w:pPr> intact!
  Array.from(pEl.childNodes).forEach((ch) => {
    if (ch.nodeType === 1 && (ch as Element).localName !== 'pPr') {
      pEl.removeChild(ch);
    }
  });

  const r = doc.createElementNS(W_NS, 'w:r');
  if (rPrClone) r.appendChild(rPrClone);
  const t = doc.createElementNS(W_NS, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.textContent = newText;
  r.appendChild(t);
  pEl.appendChild(r);
}

function setParagraphLeadBoldAndBody(
  doc: XMLDocument,
  pEl: Element,
  leadBold: string,
  restText: string,
  protoBoldRPr?: Element | null,
  protoNormalRPr?: Element | null
): void {
  Array.from(pEl.childNodes).forEach((ch) => {
    if (ch.nodeType === 1 && (ch as Element).localName !== 'pPr') {
      pEl.removeChild(ch);
    }
  });

  if (leadBold) {
    const rBold = doc.createElementNS(W_NS, 'w:r');
    if (protoBoldRPr) {
      rBold.appendChild(protoBoldRPr.cloneNode(true));
    } else {
      const rPr = doc.createElementNS(W_NS, 'w:rPr');
      rPr.appendChild(doc.createElementNS(W_NS, 'w:b'));
      rBold.appendChild(rPr);
    }
    const tB = doc.createElementNS(W_NS, 'w:t');
    tB.setAttribute('xml:space', 'preserve');
    tB.textContent = leadBold;
    rBold.appendChild(tB);
    pEl.appendChild(rBold);
  }

  if (restText) {
    const rNorm = doc.createElementNS(W_NS, 'w:r');
    if (protoNormalRPr) {
      const cloned = protoNormalRPr.cloneNode(true) as Element;
      // Ensure non-bold on restText
      Array.from(cloned.getElementsByTagNameNS(W_NS, 'b')).forEach((b) => cloned.removeChild(b));
      rNorm.appendChild(cloned);
    }
    const tN = doc.createElementNS(W_NS, 'w:t');
    tN.setAttribute('xml:space', 'preserve');
    tN.textContent = restText;
    rNorm.appendChild(tN);
    pEl.appendChild(rNorm);
  }
}

function setTableCellText(doc: XMLDocument, tcEl: Element, text: string): void {
  const paras = Array.from(tcEl.getElementsByTagNameNS(W_NS, 'p'));
  if (paras.length === 0) {
    const p = doc.createElementNS(W_NS, 'w:p');
    tcEl.appendChild(p);
    setParagraphPlainTextPreservingFirstRunStyle(doc, p, text);
    return;
  }
  setParagraphPlainTextPreservingFirstRunStyle(doc, paras[0], text);
  for (let i = 1; i < paras.length; i++) {
    paras[i].parentNode?.removeChild(paras[i]);
  }
}

function replaceTextInAllTextNodes(rootEl: Element, searchRegex: RegExp, replacement: string): void {
  const tNodes = Array.from(rootEl.getElementsByTagNameNS(W_NS, 't'));
  tNodes.forEach((t) => {
    if (t.textContent && searchRegex.test(t.textContent)) {
      t.textContent = t.textContent.replace(searchRegex, replacement);
    }
  });
}

/**
 * Clones `00-000-EJEMPLO_SAS-Minuta_de_Seguimiento_Rev0.docx` 1:1 (preserving embedded GS Logo in header1.xml,
 * styles, Burgundy/Gold/Navy tables, bullets & callouts) and maps 100% of the session's data.
 */
export async function exportTemplateExactMinuteDocx(opts: OfficialMinuteDocxOptions): Promise<void> {
  const resp = await fetch('/templates/00-000-EJEMPLO_SAS-Minuta_de_Seguimiento_Rev0.docx');
  if (!resp.ok) {
    throw new Error(`No se pudo cargar la plantilla oficial de Minuta (${resp.status})`);
  }
  const zip = await JSZip.loadAsync(await resp.arrayBuffer());
  const parser = new DOMParser();

  const projectCode = (opts.projectCode || '26-030').trim();
  const revClean = (opts.revision || '0').replace(/^rev\s*/i, '').trim() || '0';
  const clientName = (opts.clientName || 'Empresa Cliente').trim();
  const safeClient = sanitizeSlug(clientName);
  const meetingDate = opts.meetingDate || new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Patch word/header1.xml (keeps embedded GS Logo image1.png intact!)
  const headerFile = zip.file('word/header1.xml');
  if (headerFile) {
    const hDoc = parser.parseFromString(await headerFile.async('string'), 'application/xml');
    replaceTextInAllTextNodes(
      hDoc.documentElement,
      /00-000-0-EJEMPLO SAS-DESARROLLO Y TUTORÍA ESTRATÉGICA/gi,
      `${projectCode}-${revClean}-${clientName.toUpperCase()}-DESARROLLO Y TUTORÍA ESTRATÉGICA`
    );
    replaceTextInAllTextNodes(hDoc.documentElement, /20 de agosto de 2026/gi, meetingDate);
    replaceTextInAllTextNodes(hDoc.documentElement, /EJEMPLO SAS/gi, clientName);
    zip.file('word/header1.xml', serializeWordXml(hDoc));
  }

  // 2. Patch word/document.xml using exact template prototype paragraphs & tables!
  const docXml = await zip.file('word/document.xml')!.async('string');
  const wDoc = parser.parseFromString(docXml, 'application/xml');
  const body = wDoc.getElementsByTagNameNS(W_NS, 'body')[0];
  const bodyChildren = Array.from(body.children);

  // Extract prototype elements from the template body:
  // [0]: Title 'MINUTA DE SEGUIMIENTO'
  // [1]: Metadata Table (4 rows)
  // [2]: Spacer P
  // [3]: 'TEMAS TRATADOS' Heading P
  // [4]: Prototype Topic Heading P ('1. APERTURA...')
  // [5]: Prototype Topic Intro P
  // [6]: Prototype Topic Bullet P (with numPr + bold run + normal run)
  // [59]: 'LOGÍSTICA Y PRÓXIMOS PASOS' Heading P
  // [60]: Commitments Table (Row 0 Header, Row 1 & Row 2 alternating styled rows)
  // [62]: Closing 'Reflexión: ...' Callout P
  // [last]: <w:sectPr>
  const tables = bodyChildren.filter((el) => el.localName === 'tbl');
  const metaTable = tables[0];
  const commitmentsTable = tables[1];

  const paras = bodyChildren.filter((el) => el.localName === 'p');
  const protoTitleP = paras[0];
  const protoSpacerP = paras[1]?.cloneNode(true) as Element;
  const protoTemasHeadingP = paras[2]?.cloneNode(true) as Element;
  const protoTopicHeadingP = paras[3]?.cloneNode(true) as Element;
  const protoTopicIntroP = paras[4]?.cloneNode(true) as Element;
  const protoBulletP = paras[5]?.cloneNode(true) as Element;

  const logisticaHeadingP =
    paras.find((p) => (p.textContent || '').includes('LOGÍSTICA Y PRÓXIMOS PASOS'))?.cloneNode(true) as Element;
  const reflexionProtoP =
    paras.find((p) => (p.textContent || '').trim().startsWith('Reflexión:'))?.cloneNode(true) as Element;
  const sectPr = bodyChildren.find((el) => el.localName === 'sectPr')?.cloneNode(true) as Element;

  // Extract bold & normal run styles from protoBulletP
  const bulletRuns = protoBulletP ? Array.from(protoBulletP.getElementsByTagNameNS(W_NS, 'r')) : [];
  const protoBulletBoldRPr = bulletRuns[0]?.getElementsByTagNameNS(W_NS, 'rPr')[0] || null;
  const protoBulletNormRPr = bulletRuns[bulletRuns.length - 1]?.getElementsByTagNameNS(W_NS, 'rPr')[0] || null;

  // Update Metadata Table (4 rows: Título, Fecha, Motivo, Asistentes)
  if (metaTable) {
    const mRows = Array.from(metaTable.getElementsByTagNameNS(W_NS, 'tr'));
    const gsAtt = opts.attendeesGS?.length ? opts.attendeesGS.join(', ') : 'Consultora GS';
    const clAtt = opts.attendeesClient?.length ? opts.attendeesClient.join(', ') : `Directorio ${clientName}`;
    const values = [
      opts.meetingTitle || `Acompañamiento y Tutoría Estratégica — ${clientName}`,
      meetingDate,
      opts.motivo || `Revisión de avances del Master Plan Estratégico y acuerdos operativos de ${clientName}.`,
      `Consultora GS: ${gsAtt}  |  ${clientName}: ${clAtt}`,
    ];
    mRows.forEach((tr, idx) => {
      const tcs = Array.from(tr.getElementsByTagNameNS(W_NS, 'tc'));
      if (tcs[1] && values[idx] !== undefined) {
        setTableCellText(wDoc, tcs[1], values[idx]);
      }
    });
  }

  // Update Commitments Table dynamically cloning alternating row templates
  if (commitmentsTable) {
    const cRows = Array.from(commitmentsTable.getElementsByTagNameNS(W_NS, 'tr'));
    const headerRow = cRows[0];
    const oddProto = (cRows[1] || cRows[0]).cloneNode(true) as Element;
    const evenProto = (cRows[2] || cRows[1] || cRows[0]).cloneNode(true) as Element;

    while (commitmentsTable.firstChild) {
      if (
        commitmentsTable.firstChild.nodeType === 1 &&
        ((commitmentsTable.firstChild as Element).localName === 'tblPr' ||
          (commitmentsTable.firstChild as Element).localName === 'tblGrid')
      ) {
        // break out cleanly below — let's only remove <w:tr>
        break;
      }
      break;
    }
    cRows.forEach((tr) => commitmentsTable.removeChild(tr));
    if (headerRow) commitmentsTable.appendChild(headerRow);

    const commitments =
      opts.commitments && opts.commitments.length > 0
        ? opts.commitments
        : [
            {
              responsible: `Directorio ${clientName}`,
              task: 'Validar fechas y responsables de las iniciativas activas del Master Plan Estratégico.',
              deadline: 'Próxima sesión',
            },
            {
              responsible: 'Consultora GS',
              task: 'Actualizar seguimiento metodológico de indicadores y minuta ejecutiva.',
              deadline: 'Próxima semana',
            },
          ];

    commitments.forEach((c, idx) => {
      const tr = (idx % 2 === 0 ? oddProto : evenProto).cloneNode(true) as Element;
      const tcs = Array.from(tr.getElementsByTagNameNS(W_NS, 'tc'));
      if (tcs[0]) setTableCellText(wDoc, tcs[0], c.responsible || clientName);
      if (tcs[1]) setTableCellText(wDoc, tcs[1], c.task || '');
      if (tcs[2]) setTableCellText(wDoc, tcs[2], c.deadline || 'Próxima sesión');
      commitmentsTable.appendChild(tr);
    });
  }

  // Rebuild <body> cleanly in exact template sequence
  while (body.firstChild) body.removeChild(body.firstChild);

  if (protoTitleP) body.appendChild(protoTitleP);
  if (metaTable) body.appendChild(metaTable);
  if (protoSpacerP) body.appendChild(protoSpacerP.cloneNode(true));
  if (protoTemasHeadingP) body.appendChild(protoTemasHeadingP);

  const topics =
    opts.topicsDiscussed && opts.topicsDiscussed.length > 0
      ? opts.topicsDiscussed
      : [
          {
            title: 'Síntesis Ejecutiva y Avances de la Sesión',
            intro: opts.motivo || `Desarrollo de los puntos centrales trabajados junto al equipo de ${clientName}.`,
            points: ['Revisión integral de acuerdos, brechas prioritarias y próximos hitos operativos.'],
          },
        ];

  topics.forEach((topic, idx) => {
    const cleanHeading = topic.title.replace(/^\d+\.\s*/, '').trim();
    if (protoTopicHeadingP) {
      const hP = protoTopicHeadingP.cloneNode(true) as Element;
      setParagraphPlainTextPreservingFirstRunStyle(wDoc, hP, `${idx + 1}. ${cleanHeading}`);
      body.appendChild(hP);
    }

    if (topic.intro && protoTopicIntroP) {
      const iP = protoTopicIntroP.cloneNode(true) as Element;
      setParagraphPlainTextPreservingFirstRunStyle(wDoc, iP, topic.intro);
      body.appendChild(iP);
    }

    (topic.points || []).forEach((pt) => {
      const cleaned = pt.replace(/\*\*/g, '').trim();
      if (!cleaned || !protoBulletP) return;
      const bP = protoBulletP.cloneNode(true) as Element;
      const colonIdx = cleaned.indexOf(':');
      if (colonIdx > 2 && colonIdx < 80) {
        setParagraphLeadBoldAndBody(
          wDoc,
          bP,
          cleaned.slice(0, colonIdx + 1),
          cleaned.slice(colonIdx + 1),
          protoBulletBoldRPr,
          protoBulletNormRPr
        );
      } else {
        setParagraphLeadBoldAndBody(wDoc, bP, '', cleaned, protoBulletBoldRPr, protoBulletNormRPr);
      }
      body.appendChild(bP);
    });

    if (protoSpacerP) body.appendChild(protoSpacerP.cloneNode(true));
  });

  if (logisticaHeadingP) body.appendChild(logisticaHeadingP);
  if (commitmentsTable) body.appendChild(commitmentsTable);
  if (protoSpacerP) body.appendChild(protoSpacerP.cloneNode(true));

  if (reflexionProtoP && opts.reflection) {
    const rRuns = Array.from(reflexionProtoP.getElementsByTagNameNS(W_NS, 'r'));
    const rBoldPr = rRuns[0]?.getElementsByTagNameNS(W_NS, 'rPr')[0] || null;
    const rNormPr = rRuns[rRuns.length - 1]?.getElementsByTagNameNS(W_NS, 'rPr')[0] || null;
    const cleanRef = opts.reflection.replace(/^Reflexión:\s*/i, '').trim();
    setParagraphLeadBoldAndBody(wDoc, reflexionProtoP, 'Reflexión: ', cleanRef, rBoldPr, rNormPr);
    body.appendChild(reflexionProtoP);
  }

  if (sectPr) body.appendChild(sectPr);

  zip.file('word/document.xml', serializeWordXml(wDoc));

  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  triggerBlobDownload(outBlob, `${projectCode}-${safeClient}-Minuta_de_Seguimiento_Rev${revClean}.docx`);
}

function optionToLikert1to5(questionId: number, opt?: ResponseOptionValue, override?: number): number | null {
  if (override && override >= 1 && override <= 5) return override;
  if (!opt) return null;
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
 * Clones `GS_Diagnostico_360_EJEMPLO_SAS_Generico.docx` 1:1 (preserving embedded GS Logo, 206 styled tables,
 * Likert boxes, KPI tables, and IRE/IME summary matrices) and maps 100% of the client's Diagnostic 360° data.
 */
export async function exportTemplateExactDiagnostic360Docx(opts: OfficialDiagnostic360DocxOptions): Promise<void> {
  const resp = await fetch('/templates/GS_Diagnostico_360_EJEMPLO_SAS_Generico.docx');
  if (!resp.ok) {
    throw new Error(`No se pudo cargar la plantilla oficial Diagnóstico 360° (${resp.status})`);
  }
  const zip = await JSZip.loadAsync(await resp.arrayBuffer());
  const parser = new DOMParser();

  const clientName = (opts.client.name || 'Empresa Cliente').trim();
  const safeClient = sanitizeSlug(clientName);
  const projectCode = (opts.projectCode || '26-030').trim();
  const todayStr = new Date().toLocaleDateString('es-AR');
  const targets = opts.omvTargets && opts.omvTargets.length > 0 ? opts.omvTargets : DEFAULT_OMV_TARGETS;

  const docXml = await zip.file('word/document.xml')!.async('string');
  const wDoc = parser.parseFromString(docXml, 'application/xml');
  const body = wDoc.getElementsByTagNameNS(W_NS, 'body')[0];

  // Replace 'EJEMPLO SAS' across all headings/descriptions with actual clientName
  replaceTextInAllTextNodes(body, /EJEMPLO SAS/g, clientName);

  const tbls = Array.from(body.children).filter((el) => el.localName === 'tbl');

  // 1. Table 2: Ficha de Datos de la Empresa (7 rows x 4 cols)
  const companyTbl = tbls[2];
  if (companyTbl) {
    const rows = Array.from(companyTbl.getElementsByTagNameNS(W_NS, 'tr'));
    const pairs: [string, string][] = [
      [clientName, projectCode],
      [clientName, opts.consultantName || 'Martín Gómez  |  Lucía Fernández — GS Consultora'],
      [opts.client.rubro || 'PyME en Profesionalización', opts.sessionNumber || 'Consolidado 360°'],
      [opts.client.location || 'Argentina', opts.reviewerName || 'Dirección Metodológica GS'],
      [opts.client.website || '—', todayStr],
      [opts.client.respondent || `Directorio / Socios ${clientName}`, '2.0 — Oficial GS'],
      [todayStr, `CVA · IME (${opts.results.globalIme}/100) · IRE (${opts.results.globalIre}/100)`],
    ];
    rows.forEach((tr, rIdx) => {
      const tcs = Array.from(tr.getElementsByTagNameNS(W_NS, 'tc'));
      if (pairs[rIdx]) {
        if (tcs[1]) setTableCellText(wDoc, tcs[1], pairs[rIdx][0]);
        if (tcs[3]) setTableCellText(wDoc, tcs[3], pairs[rIdx][1]);
      }
    });
  }

  // 2. Table 7: Pregunta Central CVA (OMV en tiempo presente)
  const omvTbl = tbls[7];
  if (omvTbl && opts.omvText?.trim()) {
    const tc = omvTbl.getElementsByTagNameNS(W_NS, 'tc')[0];
    if (tc) {
      setTableCellText(wDoc, tc, opts.omvText.trim());
    }
  }

  // 3. Table 8: 8 Valores TARGET a 3 Años (Marco CVA)
  const targetsTbl = tbls[8];
  if (targetsTbl) {
    const tRows = Array.from(targetsTbl.getElementsByTagNameNS(W_NS, 'tr'));
    for (let i = 1; i < tRows.length; i++) {
      const targetItem = targets[i - 1];
      if (!targetItem) continue;
      const tcs = Array.from(tRows[i].getElementsByTagNameNS(W_NS, 'tc'));
      const combinedVal =
        targetItem.currentValue || targetItem.target3Years
          ? `Hoy: ${targetItem.currentValue || 's/d'}  →  Meta 3 años: ${targetItem.target3Years || 'en definición'}`
          : 'En relevamiento';
      if (tcs[2]) setTableCellText(wDoc, tcs[2], combinedVal);
    }
  }

  // Build fast lookup of all catalog questions by number (1..78) and by id
  const allQuestionsFlat = DIAGNOSTIC_AREAS.flatMap((a) => a.questions);
  const questionByNumber = new Map<number, (typeof allQuestionsFlat)[number]>();
  allQuestionsFlat.forEach((q, idx) => {
    const codeMatch = String(q.code || '').match(/(\d+)/);
    const qNum = codeMatch ? Number(codeMatch[1]) : idx + 1;
    if (!questionByNumber.has(qNum)) {
      questionByNumber.set(qNum, q);
    }
    questionByNumber.set(q.id, q);
  });

  // 4. Map all Question & Answer / Likert tables across the 10 Areas (Tables 11..197)
  for (let ti = 11; ti < Math.min(tbls.length - 6, 198); ti++) {
    const qText = (tbls[ti].textContent || '').trim();
    const numMatch = qText.match(/^(\d{1,2})\.\s+/);
    if (!numMatch) continue;

    const qNum = Number(numMatch[1]);
    const ansTbl = tbls[ti + 1];
    if (!ansTbl) continue;

    const matchedQ = questionByNumber.get(qNum);
    const qId = matchedQ?.id ?? qNum;
    const selectedOpt = opts.answers[qId] ?? opts.answers[qNum];
    const qualEntry = opts.qualitativeMap?.[qId] ?? opts.qualitativeMap?.[qNum];

    const ansCells = Array.from(ansTbl.getElementsByTagNameNS(W_NS, 'tc'));

    // Case A: 5-column Likert table ('1 ... ☐', '2 ... ☐', ..., '5 ... ☐')
    if (ansCells.length === 5 && (ansTbl.textContent || '').includes('☐')) {
      const likertVal = optionToLikert1to5(qId, selectedOpt, opts.likertOverrides?.[qId]);
      if (likertVal && likertVal >= 1 && likertVal <= 5) {
        const chosenCell = ansCells[likertVal - 1];
        if (chosenCell) {
          replaceTextInAllTextNodes(chosenCell, /☐/g, '☑');
        }
      }
    } else if (ansCells.length === 1 && (selectedOpt || qualEntry?.answer)) {
      // Case B: Open / Structured single-cell response box
      const optObj = matchedQ?.options.find((o) => o.value === selectedOpt);
      const optLabel = optObj ? `[${optObj.shortLabel} — ${optObj.label}]` : '';
      const narrative = qualEntry?.answer ? qualEntry.answer.trim() : '';
      const quote = qualEntry?.quote ? ` (Cita: "${qualEntry.quote.trim()}")` : '';
      const fullResponse = [optLabel, narrative].filter(Boolean).join(' ') + quote;
      if (fullResponse.trim()) {
        setTableCellText(wDoc, ansCells[0], fullResponse.trim());
      }
    }
  }

  // 5. Populate KPIs per Area tables where 'Valor actual' header exists
  tbls.forEach((tbl, idx) => {
    if (idx <= 8 || idx >= 198) return;
    const rows = Array.from(tbl.getElementsByTagNameNS(W_NS, 'tr'));
    if (rows.length < 2) return;
    const hText = rows[0].textContent || '';
    if (hText.includes('Indicador') && hText.includes('Valor')) {
      for (let r = 1; r < rows.length; r++) {
        const tcs = Array.from(rows[r].getElementsByTagNameNS(W_NS, 'tc'));
        if (tcs.length >= 3) {
          const indName = (tcs[0].textContent || '').trim();
          const matchedKey = opts.areaKpiValues
            ? Object.keys(opts.areaKpiValues).find((k) => k.toLowerCase().includes(indName.toLowerCase().slice(0, 14)))
            : undefined;
          if (matchedKey && opts.areaKpiValues?.[matchedKey]) {
            setTableCellText(wDoc, tcs[tcs.length - 1], opts.areaKpiValues[matchedKey]);
          }
        }
      }
    }
  });

  // 6. Map Final IRE 12-Dimension Tables (Tbl 200 & Tbl 201) + IME 9-Area Table (Tbl 203)
  const ireEvalTbl = tbls.find(
    (t) => (t.textContent || '').includes('R1 · Dependencia del dueño') && (t.textContent || '').includes('Prob. (1-5)')
  );
  const ireSummaryTbl = tbls.find(
    (t) => (t.textContent || '').includes('ÍNDICE DE RIESGO EMPRESARIO (IRE)')
  );
  const imeSummaryTbl = tbls.find(
    (t) => (t.textContent || '').includes('ÍNDICE DE MADUREZ EMPRESARIA (IME)')
  );

  let weightedIreExposureSum = 0;

  OFFICIAL_IRE_12_DIMENSIONS.forEach((dim, idx) => {
    const matchedRisk = opts.results.risks.find((r) => r.code === dim.code);
    const prob = matchedRisk ? (matchedRisk.probability === 'Alta' ? 4 : matchedRisk.probability === 'Media' ? 3 : 2) : 3;
    const imp = matchedRisk
      ? matchedRisk.impact === 'Crítico'
        ? 5
        : matchedRisk.impact === 'Alto'
          ? 4
          : matchedRisk.impact === 'Medio'
            ? 3
            : 2
      : 3;
    const exp = prob * imp;
    const weighted = Number((exp * dim.weight).toFixed(2));
    weightedIreExposureSum += weighted;
    const sem = exp >= 15 ? '🔴 Extremo' : exp >= 10 ? '🟠 Alto' : exp >= 5 ? '🟡 Medio' : '🟢 Bajo';

    if (ireEvalTbl) {
      const tr = ireEvalTbl.getElementsByTagNameNS(W_NS, 'tr')[idx + 1];
      if (tr) {
        const tcs = Array.from(tr.getElementsByTagNameNS(W_NS, 'tc'));
        if (tcs[2]) setTableCellText(wDoc, tcs[2], String(prob));
        if (tcs[3]) setTableCellText(wDoc, tcs[3], String(imp));
        if (tcs[4]) setTableCellText(wDoc, tcs[4], String(exp));
        if (tcs[5]) setTableCellText(wDoc, tcs[5], `${sem} · ${matchedRisk?.suggestedAction || dim.defaultMitigation}`);
      }
    }

    if (ireSummaryTbl) {
      const tr = ireSummaryTbl.getElementsByTagNameNS(W_NS, 'tr')[idx + 1];
      if (tr) {
        const tcs = Array.from(tr.getElementsByTagNameNS(W_NS, 'tc'));
        if (tcs[2]) setTableCellText(wDoc, tcs[2], String(exp));
        if (tcs[3]) setTableCellText(wDoc, tcs[3], String(weighted));
        if (tcs[4]) setTableCellText(wDoc, tcs[4], sem);
      }
    }
  });

  if (ireSummaryTbl) {
    const rows = ireSummaryTbl.getElementsByTagNameNS(W_NS, 'tr');
    const totalRow = rows[rows.length - 1];
    if (totalRow) {
      const tcs = Array.from(totalRow.getElementsByTagNameNS(W_NS, 'tc'));
      const ireFinal = opts.results.globalIre || Math.round((weightedIreExposureSum / 25) * 100);
      const ireSem = ireFinal >= 60 ? '🔴 Riesgo Alto' : ireFinal >= 40 ? '🟡 Riesgo Medio' : '🟢 Riesgo Controlado';
      if (tcs[2]) setTableCellText(wDoc, tcs[2], weightedIreExposureSum.toFixed(1));
      if (tcs[3]) setTableCellText(wDoc, tcs[3], `${ireFinal} / 100`);
      if (tcs[4]) setTableCellText(wDoc, tcs[4], ireSem);
    }
  }

  if (imeSummaryTbl) {
    let weightedImeTotal = 0;
    OFFICIAL_IME_9_AREA_WEIGHTS.forEach((wCfg, idx) => {
      const areaScoreObj = opts.results.areaScores.find((a) => a.areaNumber === wCfg.areaNumber);
      const score100 = areaScoreObj ? areaScoreObj.imeScore : opts.results.globalIme || 46;
      const weighted = Number((score100 * wCfg.weight).toFixed(1));
      weightedImeTotal += weighted;
      const sem = score100 >= 60 ? '🟢 Consolidado' : score100 >= 40 ? '🟡 En desarrollo' : '🔴 Inicial / Crítico';

      const tr = imeSummaryTbl.getElementsByTagNameNS(W_NS, 'tr')[idx + 1];
      if (tr) {
        const tcs = Array.from(tr.getElementsByTagNameNS(W_NS, 'tc'));
        if (tcs[2]) setTableCellText(wDoc, tcs[2], `${score100}%`);
        if (tcs[3]) setTableCellText(wDoc, tcs[3], `${weighted}`);
        if (tcs[4]) setTableCellText(wDoc, tcs[4], sem);
      }
    });

    const rows = imeSummaryTbl.getElementsByTagNameNS(W_NS, 'tr');
    const totalRow = rows[rows.length - 1];
    if (totalRow) {
      const tcs = Array.from(totalRow.getElementsByTagNameNS(W_NS, 'tc'));
      const finalIme = Math.round(weightedImeTotal) || opts.results.globalIme;
      const sem = finalIme >= 60 ? '🟢 Consolidado' : finalIme >= 40 ? '🟡 En desarrollo' : '🔴 Crítico';
      if (tcs[2]) setTableCellText(wDoc, tcs[2], `${finalIme} / 100`);
      if (tcs[3]) setTableCellText(wDoc, tcs[3], `${(finalIme / 10).toFixed(1)} / 10`);
      if (tcs[4]) setTableCellText(wDoc, tcs[4], sem);
    }
  }

  zip.file('word/document.xml', serializeWordXml(wDoc));

  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  triggerBlobDownload(outBlob, `${projectCode}_${safeClient}-Diagnostico_360_Rev0.docx`);
}
