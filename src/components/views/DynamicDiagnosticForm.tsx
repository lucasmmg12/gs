import React, { useState, useMemo, useEffect } from 'react';
import {
 CheckCircle2,
 ArrowRight,
 Save,
 HelpCircle,
 Sparkles,
 Check,
 Download,
 FileSpreadsheet,
 Mic,
 Lock,
} from 'lucide-react';
import { DIAGNOSTIC_AREAS } from '../../data/diagnosticQuestions';
import type { ResponseOptionValue } from '../../data/diagnosticQuestions';
import { calculateDiagnosticScores } from '../../lib/diagnosticEngine';
import type { FullDiagnosticResults } from '../../lib/diagnosticEngine';
import { QualityApprovalBadge } from '../QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../QualityApprovalBadge';
import type { Client } from '../../data/mockData';
import {
 exportDiagnostic360ExecutiveReport,
 exportDiagnosticResponsesExcel,
} from '../../lib/reportGenerator';
import { LIKERT_1_TO_5_QUESTION_IDS } from '../../data/gsAxisMetadata';
import type { ClientStage } from './OMBModule';
import { supabase } from '../../lib/supabase';
import { loadOrgWorkspaceFromDb, saveOrgWorkspaceToDb } from '../../lib/gsCloudSync';
import { StepAssistantBanner } from '../StepAssistantBanner';

export interface AISuggestionItem {
 id: string;
 question_id: number;
 question_code: string;
 area_id: string;
 question_title: string;
 suggested_option: ResponseOptionValue;
 suggested_label: string;
 reason: string;
 confidence: 'alta' | 'media' | 'baja';
 source_meeting?: string;
 status: 'pending' | 'accepted' | 'rejected';
}

interface DynamicDiagnosticFormProps {
 client: Client;
 stage?: ClientStage;
 answers: Record<number, ResponseOptionValue>;
 onAnswerChange: (questionId: number, value: ResponseOptionValue) => void;
 onSave: () => void;
 approvalStatus: ApprovalStatus;
 auditConsultants: AuditConsultants;
 onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
 onViewMatrices: () => void;
 onSendWhatsApp?: () => void;
 onOpenAudioSession?: () => void;
}

export const DynamicDiagnosticForm: React.FC<DynamicDiagnosticFormProps> = ({
 client,
 stage,
 answers,
 onAnswerChange,
 onSave,
 approvalStatus,
 auditConsultants,
 onApprovalChange,
 onViewMatrices,
 onSendWhatsApp,
 onOpenAudioSession,
}) => {
 const [selectedAreaId, setSelectedAreaId] = useState<string>(DIAGNOSTIC_AREAS[0].id);
 const [qualitativeMap, setQualitativeMap] = useState<
 Record<number, { answer: string; quote: string; updatedAt: string; validatedByConsultant?: boolean; sourceSessionTitle?: string }>
 >({});
 const [areaKpiValues, setAreaKpiValues] = useState<Record<string, string>>({});
 const [dbSyncStatus, setDbSyncStatus] = useState<'synced' | 'saving'>('synced');

 const isDiagnosticClosed = stage === 'diagnostic_closed' || stage === 'master_plan_active';

 useEffect(() => {
 if (!client?.id) return;
 try {
 const saved = localStorage.getItem(`gs_qualitative_answers_${client.id}`);
 if (saved) setQualitativeMap(JSON.parse(saved));
 } catch (e) {
 console.warn('Error loading qualitative answers:', e);
 }

 try {
 const savedKpis = localStorage.getItem(`gs_area_kpis_${client.id}`);
 if (savedKpis) setAreaKpiValues(JSON.parse(savedKpis));
 } catch {
 // ignore
 }

 async function loadFromDb() {
 try {
 const [{ data }, cloudWs] = await Promise.all([
 (supabase.from('diagnostic_responses') as any)
 .select('answers')
 .eq('organization_id', client.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle(),
 loadOrgWorkspaceFromDb(client.id),
 ]);

 if (cloudWs?.qualitativeAnswers) {
 const normalizedCloud: Record<number, { answer: string; quote: string; updatedAt: string }> = {};
 Object.entries(cloudWs.qualitativeAnswers).forEach(([k, v]) => {
 normalizedCloud[Number(k)] = {
 answer: v.answer || '',
 quote: v.quote || v.answer || '',
 updatedAt: v.updatedAt || 'En BD',
 };
 });
 setQualitativeMap((prev) => ({ ...prev, ...normalizedCloud }));
 }

 if (cloudWs?.areaKpis) {
 setAreaKpiValues((prev) => ({ ...prev, ...cloudWs.areaKpis }));
 }

 if (data?.answers && typeof data.answers === 'object') {
 const dbQual: Record<number, { answer: string; quote: string; updatedAt: string; validatedByConsultant?: boolean; sourceSessionTitle?: string }> = {};
 Object.entries(data.answers).forEach(([k, val]: [string, any]) => {
 if (val && typeof val === 'object' && (val.notes || val.evidence)) {
 dbQual[Number(k)] = {
 answer: val.notes || val.evidence,
 quote: val.evidence || val.notes,
 updatedAt: val.updatedAt
 ? new Date(val.updatedAt).toLocaleDateString('es-AR')
 : 'Reciente',
 validatedByConsultant: Boolean(val.validatedByConsultant),
 sourceSessionTitle: val.meetingTitle || undefined,
 };
 }
 });
 if (Object.keys(dbQual).length > 0) {
 setQualitativeMap((prev) => ({ ...dbQual, ...prev }));
 }
 }
 } catch (err) {
 console.warn('Notice reading diagnostic_responses notes:', err);
 }
 }
 loadFromDb();
 }, [client?.id]);

 const handleValidateQuestionQA = async (questionId: number) => {
 setDbSyncStatus('saving');
 setQualitativeMap((prev) => {
 const cur = prev[questionId];
 if (!cur) return prev;
 const next = {
 ...prev,
 [questionId]: { ...cur, validatedByConsultant: true, updatedAt: new Date().toLocaleDateString('es-AR') },
 };
 try {
 localStorage.setItem(`gs_qualitative_answers_${client.id}`, JSON.stringify(next));
 } catch {
 // ignore
 }
 return next;
 });

 try {
 const { data: currentDiag } = await (supabase.from('diagnostic_responses') as any)
 .select('answers')
 .eq('organization_id', client.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle();
 const existing = (currentDiag?.answers && typeof currentDiag.answers === 'object') ? { ...currentDiag.answers } : {};
 const curEntry = existing[questionId];
 existing[questionId] =
 curEntry && typeof curEntry === 'object'
 ? { ...curEntry, validatedByConsultant: true, updatedAt: new Date().toISOString() }
 : { value: answers[questionId] || 'partial_dev', notes: qualitativeMap[questionId]?.answer || '', validatedByConsultant: true, updatedAt: new Date().toISOString() };
 await (supabase.from('diagnostic_responses') as any).upsert(
 { organization_id: client.id, answers: existing, updated_at: new Date().toISOString() },
 { onConflict: 'organization_id' }
 );
 } catch (e) {
 console.warn('Error persisting QA validation:', e);
 } finally {
 setDbSyncStatus('synced');
 }
 };

 const handleQualitativeChange = (questionId: number, text: string) => {
 setDbSyncStatus('saving');
 setQualitativeMap((prev) => {
 const next = {
 ...prev,
 [questionId]: {
 answer: text,
 quote: prev[questionId]?.quote || text,
 updatedAt: new Date().toLocaleDateString('es-AR'),
 },
 };
 localStorage.setItem(`gs_qualitative_answers_${client.id}`, JSON.stringify(next));
 saveOrgWorkspaceToDb(client.id, { qualitativeAnswers: next }).then(() => setDbSyncStatus('synced'));
 return next;
 });
 };

 const handleAreaKpiChange = (areaId: string, kpiName: string, value: string) => {
 const key = `${areaId}_${kpiName}`;
 setDbSyncStatus('saving');
 setAreaKpiValues((prev) => {
 const next = { ...prev, [key]: value };
 localStorage.setItem(`gs_area_kpis_${client.id}`, JSON.stringify(next));
 saveOrgWorkspaceToDb(client.id, { areaKpis: next }).then(() => setDbSyncStatus('synced'));
 return next;
 });
 };

 const diagnosticResults: FullDiagnosticResults = useMemo(() => {
 return calculateDiagnosticScores(answers);
 }, [answers]);

 const currentArea = useMemo(() => {
 return DIAGNOSTIC_AREAS.find((a) => a.id === selectedAreaId) || DIAGNOSTIC_AREAS[0];
 }, [selectedAreaId]);

 return (
 <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
 <StepAssistantBanner
 roleBadge="Consultor GS · Etapa 2"
 stepTitle="Diagnóstico Integral 360° (11 Áreas · 103 Preguntas Rev10 · KPIs)"
 whatToDo="Seleccione un área a la izquierda, marque el nivel de madurez o grabe una sesión de audio para autocompletar preguntas, registre la narrativa libre y cargue los KPIs numéricos."
 autoAssistNote="Sus respuestas, notas cualitativas y KPIs se respaldan en tiempo real en Supabase y recalculan IME e IRE automáticamente."
 growyPrompt={`Analizame el avance del Diagnóstico 360° de ${client.name}, su IME (${diagnosticResults.globalIme10}/10) y qué áreas priorizar.`}
 dbSyncStatus={dbSyncStatus}
 nextStepLabel="Ver Matrices & Riesgos"
 onNextStep={onViewMatrices}
 />

 {/* 1. Semáforo Rojo/Verde y Trazabilidad Multi-Consultor */}
 <QualityApprovalBadge
 moduleName="Formulario de Diagnóstico"
 status={approvalStatus}
 audit={auditConsultants}
 onStatusChange={onApprovalChange}
 clientName={client.name}
 onSendWhatsApp={onSendWhatsApp}
 />

 {/* 2. Banner Contextual según Etapa: En Curso (con Audio) vs. Diagnóstico Cerrado */}
 {isDiagnosticClosed ? (
 <div className="bg-emerald-950 text-white border-2 border-emerald-700 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-1">
 <span className="font-display text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
 <Lock className="w-3.5 h-3.5" /> Diagnóstico PyME 360° Cerrado y Consolidado
 </span>
 <h3 className="font-display text-base font-bold text-white">
 Relevamiento finalizado — Línea Base oficial establecida para el Master Plan
 </h3>
 <p className="text-xs text-emerald-200/80">
 Las respuestas cualitativas, KPIs por área y puntajes IME/IRE ya alimentan las Matrices Estratégicas y el Workbook del Master Plan en vivo.
 </p>
 </div>
 </div>
 ) : (
 onOpenAudioSession && (
 <div className="bg-[#17324D] text-white border-2 border-[#17324D] rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-1">
 <span className="font-display text-[10px] font-bold text-[#5EEAD4]">
 Autocompletado Híbrido por Voz • 11 Áreas · 103 Preguntas + Texto Libre + KPIs
 </span>
 <h3 className="font-display text-base font-bold text-white">
 Relevamiento en Curso (8 a 10 sesiones semanales)
 </h3>
 <p className="text-xs text-zinc-400">
 Graba la sesión libremente (texto plano continuo): el sistema redacta la respuesta abierta de cada pregunta detectada, sugiere el nivel de madurez para el cálculo de IME/IRE y arma la Minuta de Seguimiento Oficial.
 </p>
 </div>
 <button
 type="button"
 onClick={onOpenAudioSession}
 className="px-5 py-3 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-display text-xs font-bold flex items-center gap-2 shrink-0 shadow-lg hover:scale-105 transition-all cursor-pointer"
 >
 <Mic className="w-4 h-4" />
 Grabar / Subir Audio de Sesión
 </button>
 </div>
 )
 )}

 {/* 3. Barra Superior de Control: Avance Global, IME/IRE y Exportadores Oficiales GS */}
 <div className="bg-white border-2 border-zinc-900 rounded-2xl p-6 shadow-sm">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
 <div className="flex-1">
 <div className="flex items-center justify-between mb-2">
 <span className="font-display text-xs font-bold text-zinc-900 flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-[#0D9488]" />
 {isDiagnosticClosed
 ? 'Cobertura Consolidada del Diagnóstico PyME 360°'
 : 'Avance del Diagnóstico Estratégico (8 a 10 Sesiones)'}
 </span>
 <span className="font-display text-sm font-bold text-[#0D9488]">
 {diagnosticResults.totalAnswered} / {diagnosticResults.totalQuestions} RESPONDIDAS ({diagnosticResults.progressPercentage}%)
 </span>
 </div>
 <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden border border-zinc-200">
 <div
 className="bg-[#0D9488] h-full transition-all duration-500 rounded-full"
 style={{ width: `${diagnosticResults.progressPercentage}%` }}
 />
 </div>
 <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">
 Modelo Híbrido Oficial GS v2.0: Redacción abierta narrativa por pregunta + nivel de madurez/escala 1–5 para cálculo automático de IME e IRE.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2.5">
 <div className="bg-[#17324D] border-2 border-zinc-800 px-3.5 py-2 rounded-xl text-center min-w-[112px]">
 <span className="font-display text-[10px] font-bold text-zinc-400 block">
 IME (Madurez)
 </span>
 <div className="flex items-baseline justify-center gap-1 mt-0.5">
 <span className="font-display text-lg font-bold text-white">{diagnosticResults.globalIme}%</span>
 <span className="font-display text-xs font-bold text-[#14B8A6]">({diagnosticResults.globalIme10}/10)</span>
 </div>
 </div>

 <div className="bg-[#17324D] border-2 border-teal-400/30 px-3.5 py-2 rounded-xl text-center min-w-[112px]">
 <span className="font-display text-[10px] font-bold text-[#5EEAD4] block">
 IRE (Riesgo)
 </span>
 <div className="flex items-baseline justify-center gap-1 mt-0.5">
 <span className="font-display text-lg font-bold text-[#14B8A6]">{diagnosticResults.globalIre}%</span>
 <span className="text-[10px] text-zinc-400 font-bold ">Expos.</span>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={() => exportDiagnostic360ExecutiveReport(client, diagnosticResults, auditConsultants)}
 className="px-3 py-2.5 bg-[#17324D] hover:bg-[#17324D] text-white rounded-xl text-xs font-bold font-display flex items-center gap-1.5 border border-zinc-700 shadow-sm transition-all cursor-pointer"
 title="Descargar Resumen Ejecutivo en PDF"
 >
 <Download className="w-3.5 h-3.5 text-[#14B8A6]" />
 PDF
 </button>

 <button
 type="button"
 onClick={() => exportDiagnosticResponsesExcel(client.name, answers, diagnosticResults)}
 className="px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold font-display flex items-center gap-1.5 border border-zinc-300 shadow-sm transition-all cursor-pointer"
 title="Exportar Respuestas y Matrices a Excel"
 >
 <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
 Excel
 </button>

 <button
 onClick={onViewMatrices}
 className="px-3.5 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-bold font-display flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
 >
 Matrices
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* 4. Panel de 10 Áreas + Preguntas Híbridas (Texto Libre + Puntaje) + Tabla de KPIs Editable */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 <div className="lg:col-span-1 space-y-1.5 bg-white p-3.5 rounded-2xl border-2 border-zinc-900 shadow-sm h-fit">
 <div className="px-2 py-1 mb-2 border-b border-zinc-200 flex items-center justify-between">
 <span className="font-display text-xs font-bold text-zinc-900 ">
 11 Áreas Oficiales GS (Rev10)
 </span>
 </div>

 {DIAGNOSTIC_AREAS.map((area) => {
 const areaScore = diagnosticResults.areaScores.find((a) => a.areaId === area.id);
 const isCompleted =
 areaScore && areaScore.answeredCount > 0 && areaScore.answeredCount === areaScore.totalQuestions;
 const isSelected = selectedAreaId === area.id;

 return (
 <button
 key={area.id}
 onClick={() => setSelectedAreaId(area.id)}
 className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
 isSelected
 ? 'bg-[#17324D] text-white shadow-md border-l-4 border-l-[#0D9488]'
 : 'text-zinc-700 hover:bg-zinc-100'
 }`}
 >
 <div className="flex items-center gap-2.5 truncate">
 <span
 className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
 isSelected ? 'bg-[#0D9488] text-white' : 'bg-zinc-200 text-zinc-800'
 }`}
 >
 {area.number}
 </span>
 <span className="truncate font-display ">{area.name}</span>
 </div>

 <div className="flex items-center gap-1.5 shrink-0 ml-1">
 {isCompleted ? (
 <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-[#14B8A6]' : 'text-emerald-600'}`} />
 ) : (
 <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
 {areaScore?.answeredCount || 0}/{areaScore?.totalQuestions || 0}
 </span>
 )}
 </div>
 </button>
 );
 })}
 </div>

 <div className="lg:col-span-3 bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-6">
 <div className="border-b-2 border-zinc-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 bg-[#17324D] text-[#5EEAD4] font-display text-xs font-bold rounded-md ">
 Área {currentArea.number}
 </span>
 <h2 className="text-xl font-bold font-display text-zinc-950 ">
 {currentArea.name}
 </h2>
 </div>
 <p className="text-xs text-zinc-600 mt-1 font-medium">{currentArea.description}</p>
 </div>

 {(() => {
 const currentScore = diagnosticResults.areaScores.find((a) => a.areaId === currentArea.id);
 return (
 <div className="flex items-center gap-3 bg-[#17324D] text-white px-4 py-2 rounded-xl border border-zinc-800 shrink-0">
 <div className="text-right">
 <span className="text-[10px] text-zinc-400 block font-bold font-display ">
 IME Área
 </span>
 <span className="text-base font-bold font-display text-white">
 {currentScore?.imeScore || 0}%
 </span>
 </div>
 <div className="h-6 w-px bg-zinc-700" />
 <div className="text-right">
 <span className="text-[10px] text-zinc-400 block font-bold font-display ">
 IRE Área
 </span>
 <span className="text-base font-bold font-display text-[#14B8A6]">
 {currentScore?.ireScore || 0}%
 </span>
 </div>
 </div>
 );
 })()}
 </div>

 {/* Tabla Editable de KPIs Cuantitativos del Área (idéntica a la tabla del Word Oficial GS) */}
 {currentArea.kpis && currentArea.kpis.length > 0 && (
 <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="font-display text-[11px] font-bold text-zinc-900 ">
 📊 Tabla de KPIs Cuantitativos — {currentArea.name}
 </span>
 <span className="text-[10px] text-zinc-500">Si es estimado, aclárelo con (*approx.)</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
 {currentArea.kpis.map((kpi, kidx) => {
 const key = `${currentArea.id}_${kpi.name}`;
 return (
 <div key={kidx} className="bg-white p-2.5 rounded-lg border border-zinc-200 text-xs space-y-1">
 <div className="flex items-center justify-between gap-1">
 <span className="text-[11px] text-zinc-800 font-bold leading-tight truncate" title={kpi.name}>
 {kpi.name}
 </span>
 <span className="font-mono text-[10px] font-semibold text-[#17324D] shrink-0">
 {kpi.unit}
 </span>
 </div>
 <input
 type="text"
 value={areaKpiValues[key] ?? kpi.baseline ?? ''}
 onChange={(e) => handleAreaKpiChange(currentArea.id, kpi.name, e.target.value)}
 placeholder={`Valor actual (${kpi.unit})`}
 className="w-full rounded border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-900 focus:border-[#17324D] focus:outline-none"
 />
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Preguntas del Área: Texto Libre Narrativo + Clasificación Matemática IME/IRE */}
 <div className="space-y-6">
 {currentArea.questions.map((question) => {
 if (question.cascadeCondition) {
 const parentAns = answers[question.cascadeCondition.parentQuestionId];
 const shouldShow =
 parentAns && question.cascadeCondition.triggerOptionValues.includes(parentAns);
 if (!shouldShow) return null;
 }

 const isSubquestion = Boolean(question.cascadeCondition);
 const selectedValue = answers[question.id];
 const isLikertQuestion = Boolean(LIKERT_1_TO_5_QUESTION_IDS[question.id]);

 return (
 <div
 key={question.id}
 className={`p-5 rounded-xl border-2 transition-all ${
 isSubquestion
 ? 'bg-zinc-50 border-red-400 ml-6 border-l-4 border-l-[#0D9488]'
 : selectedValue || qualitativeMap[question.id]?.answer
 ? 'bg-white border-zinc-900 shadow-xs'
 : 'bg-zinc-50 border-dashed border-zinc-300'
 }`}
 >
 <div className="flex items-start justify-between gap-3 mb-3">
 <div className="flex items-start gap-2.5">
 <span
 className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
 isSubquestion ? 'bg-[#0D9488] text-white' : 'bg-[#17324D] text-white'
 }`}
 >
 P{question.id} · {question.code}
 </span>
 <div>
 <h4 className="text-sm font-bold text-zinc-950 leading-snug">{question.title}</h4>
 {question.guide && (
 <p className="text-[11px] text-zinc-500 italic mt-1 flex items-center gap-1.5 font-medium">
 <HelpCircle className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
 {question.guide}
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 {isLikertQuestion && (
 <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded">
 Escala 1–5 ☐
 </span>
 )}
 {question.kpi && (
 <span className="px-2.5 py-1 bg-[#F0FDFA] border border-teal-200/80 text-[#0F766E] text-[10px] font-bold font-display rounded-md">
 KPI: {question.kpi}
 </span>
 )}
 </div>
 </div>

 {/* A. Respuesta Abierta / Texto Libre Oficial GS (Autocompletada por IA o escrita por el consultor) */}
 <div className="mt-2 mb-3">
 <label className="text-[10px] font-bold text-zinc-500 flex flex-wrap items-center justify-between gap-2 mb-1">
 <span>Respuesta Desarrollada / Evidencia Cualitativa</span>
 <div className="flex items-center gap-2">
 {qualitativeMap[question.id]?.answer && (
 qualitativeMap[question.id]?.validatedByConsultant ? (
 <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Validado por consultor
 </span>
 ) : (
 <span className="inline-flex items-center gap-1.5">
 <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
 IA · Pendiente validación QA
 </span>
 <button
 type="button"
 onClick={() => handleValidateQuestionQA(question.id)}
 className="px-2 py-0.5 rounded bg-[#17324D] hover:bg-[#0F2438] text-white font-semibold cursor-pointer"
 >
 Validar QA
 </button>
 </span>
 )
 )}
 {qualitativeMap[question.id]?.updatedAt && (
 <span className="text-slate-400">
 {qualitativeMap[question.id].updatedAt}
 </span>
 )}
 </div>
 </label>
 <textarea
 rows={2}
 value={qualitativeMap[question.id]?.answer || ''}
 onChange={(e) => handleQualitativeChange(question.id, e.target.value)}
 placeholder="Redacte o edite aquí la respuesta abierta relevada en sesión (o grabe/suba audios para autocompletarla)..."
 className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 leading-relaxed focus:border-[#17324D] focus:outline-none"
 />
 {qualitativeMap[question.id]?.quote && qualitativeMap[question.id]?.quote !== qualitativeMap[question.id]?.answer && (
 <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
 <span className="font-semibold text-slate-700">Cita de audio:</span>{' '}
 <span className="italic">&ldquo;{qualitativeMap[question.id].quote}&rdquo;</span>
 {qualitativeMap[question.id]?.sourceSessionTitle && (
 <span className="ml-1.5 text-[10px] font-medium text-[#0D9488]">
 · {qualitativeMap[question.id].sourceSessionTitle}
 </span>
 )}
 </div>
 )}
 </div>

 {/* B. Nivel de Madurez / Riesgo para Cálculo Matemático Automático de IME e IRE */}
 <div className="space-y-1.5">
 <span className="text-[10px] font-bold text-zinc-500 block">
 Calificación Estandarizada para Motor Matemático IME / IRE y Pentágono:
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
 {question.options.map((option) => {
 const isOptionSelected = selectedValue === option.value;
 return (
 <button
 key={option.value}
 type="button"
 onClick={() => onAnswerChange(question.id, option.value)}
 className={`p-2.5 rounded-xl text-left text-xs font-medium transition-all flex items-start gap-2 border-2 ${
 isOptionSelected
 ? 'bg-[#17324D] text-white border-[#17324D] shadow-md ring-2 ring-[#0D9488]'
 : 'bg-white text-zinc-800 border-zinc-200 hover:border-[#0D9488]/50 hover:bg-zinc-50'
 }`}
 >
 <div
 className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
 isOptionSelected ? 'border-[#0D9488] bg-[#0D9488]' : 'border-zinc-400 bg-white'
 }`}
 >
 {isOptionSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
 </div>
 <div className="flex-1">
 <span className="block font-bold font-display text-[11px]">
 {option.shortLabel}
 </span>
 <span
 className={`text-[10px] block leading-tight mt-0.5 ${
 isOptionSelected ? 'text-zinc-300' : 'text-zinc-500'
 }`}
 >
 {option.label}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 );
 })}
 </div>

 <div className="pt-4 border-t-2 border-zinc-100 flex flex-wrap items-center justify-between gap-3">
 <span className="text-xs text-zinc-600 font-medium">
 Progreso de <strong className="text-zinc-950 font-bold ">{currentArea.name}</strong>:{' '}
 <strong className="text-[#0D9488] font-mono font-bold">
 {diagnosticResults.areaScores.find((a) => a.areaId === currentArea.id)?.answeredCount || 0} de{' '}
 {diagnosticResults.areaScores.find((a) => a.areaId === currentArea.id)?.totalQuestions || 0}
 </strong>
 </span>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={onSave}
 className="px-5 py-2.5 bg-[#17324D] hover:bg-[#0F2438] text-white rounded-xl text-xs font-bold font-display flex items-center gap-2 shadow-sm transition-colors border border-zinc-700 cursor-pointer"
 >
 <Save className="w-4 h-4 text-[#14B8A6]" />
 Guardar Diagnóstico
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
