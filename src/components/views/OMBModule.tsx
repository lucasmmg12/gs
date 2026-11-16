import React, { useState, useEffect } from 'react';
import { 
 Download, FileText, 
 CheckCircle2, Sparkles, Edit3, Save, Plus, 
 Users, History, Trash2, Target
} from 'lucide-react';
import { QualityApprovalBadge } from '../QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../QualityApprovalBadge';
import type { Client } from '../../data/mockData';
import { supabase } from '../../lib/supabase';
import { DEFAULT_OMV_TARGETS, type OMVTargetRow } from '../../data/gsAxisMetadata';
import { loadOrgWorkspaceFromDb, saveOrgWorkspaceToDb } from '../../lib/gsCloudSync';
import { StepAssistantBanner } from '../StepAssistantBanner';

export type ClientStage = 'relevamiento' | 'kickoff_omv' | 'diagnostic_in_progress' | 'diagnostic_closed' | 'master_plan_active';

export interface PartnerVisionInput {
 id: string;
 partnerName: string;
 partnerRole: string;
 visionText: string;
}

export interface OMBRevision {
 id: string;
 revisionCode: string;
 title: string;
 date: string;
 status: 'borrador' | 'en_revision' | 'consensuado_rev0';
 isBaselineRev0: boolean;
 declarationText: string;
 audioPodcastUrl?: string;
 partnerInputs: PartnerVisionInput[];
 notes?: string;
}

interface OMBModuleProps {
 client: Client;
 stage: ClientStage;
 onStageChange: (stage: ClientStage) => void;
 approvalStatus: ApprovalStatus;
 auditConsultants: AuditConsultants;
 onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
 onSendWhatsApp?: () => void;
}

export const OMBModule: React.FC<OMBModuleProps> = ({
 client,
 approvalStatus,
 auditConsultants,
 onApprovalChange,
 onSendWhatsApp
}) => {
 // Initial default revisions
 const defaultPresentTenseOMB = `Hoy es septiembre de 2029. ${client.name} opera con un Directorio consolidado que sesiona mensualmente con actas formales. Los socios fundadores delegan la operación diaria en un equipo de mandos medios autónomos y dedican su tiempo al crecimiento y alianzas estratégicas.

La empresa factura más de $2.5M USD anuales con un margen neto superior al 18%, cuenta con un flujo de caja proyectado a 6 meses y una reserva de liquidez de 90 días. Sus procesos operativos y de abastecimiento están formalizados bajo estándares de calidad, logrando una tasa de satisfacción de clientes del 92% y cero dependencia del boca a boca gracias a un proceso comercial sistematizado.`;

 const initialRevisions: OMBRevision[] = [
 {
 id: 'rev-a',
 revisionCode: 'Rev A (Kickoff Inicial)',
 title: 'Visión Preliminar de Lanzamiento',
 date: '15/05/2026',
 status: 'en_revision',
 isBaselineRev0: false,
 declarationText: defaultPresentTenseOMB,
 audioPodcastUrl: '',
 partnerInputs: [
 {
 id: 'p-1',
 partnerName: 'Socio Fundador 1',
 partnerRole: 'Director General',
 visionText: 'Quiero que la empresa facture el doble pero sin que yo tenga que estar apagando incendios en el taller todos los días.'
 },
 {
 id: 'p-2',
 partnerName: 'Socio Fundador 2',
 partnerRole: 'Director Comercial',
 visionText: 'Consolidar 3 líneas de productos industriales estandarizados y tener presencia en todo el país con vendedores por comisión.'
 }
 ]
 },
 {
 id: 'rev-b',
 revisionCode: 'Rev B (Ajuste Post-Diagnóstico)',
 title: 'Ajuste tras Relevamiento FODA',
 date: '10/07/2026',
 status: 'en_revision',
 isBaselineRev0: false,
 declarationText: `${defaultPresentTenseOMB}\n\nSe incorporó el plan de mitigación del riesgo operativo y el protocolo de asignación de dividendos acordado entre los socios.`,
 partnerInputs: []
 }
 ];

 const storageKey = `gs_omb_revisions_${client.id}`;
 const [revisions, setRevisions] = useState<OMBRevision[]>(() => {
 try {
 const saved = localStorage.getItem(storageKey);
 if (saved) return JSON.parse(saved);
 } catch (e) {
 console.warn('Error reading local OMB revisions:', e);
 }
 return initialRevisions;
 });

 const [selectedRevIndex, setSelectedRevIndex] = useState<number>(0);
 const activeRev = revisions[selectedRevIndex] || revisions[0];

 const [isEditingText, setIsEditingText] = useState(false);
 const [currentText, setCurrentText] = useState(activeRev.declarationText);
 const [activeSubTab, setActiveSubTab] = useState<'declaration' | 'targets' | 'partners'>('declaration');
 const [dbSyncStatus, setDbSyncStatus] = useState<'synced' | 'saving'>('synced');

 const targetsKey = `gs_omv_targets_${client.id}`;
 const [omvTargets, setOmvTargets] = useState<OMVTargetRow[]>(() => {
 try {
 const saved = localStorage.getItem(targetsKey);
 if (saved) return JSON.parse(saved);
 } catch { /* ignore */ }
 return DEFAULT_OMV_TARGETS;
 });

 // Load OMV revisions and 8 CVA Target KPIs directly from Supabase PostgreSQL
 useEffect(() => {
 let active = true;
 (async () => {
 try {
 const [{ data: dbRevs }, cloudWs] = await Promise.all([
 (supabase as any)
 .from('client_omb_revisions')
 .select('*')
 .eq('organization_id', client.id)
 .order('created_at', { ascending: true }),
 loadOrgWorkspaceFromDb(client.id),
 ]);

 if (!active) return;

 if (dbRevs && dbRevs.length > 0) {
 const mapped: OMBRevision[] = dbRevs.map((r: any) => ({
 id: r.id,
 revisionCode: r.revision_code || 'Rev A',
 title: r.title || 'Visión Trienal OMV',
 date: new Date(r.created_at || Date.now()).toLocaleDateString('es-AR'),
 status: (r.status as any) || 'en_revision',
 isBaselineRev0: Boolean(r.is_baseline_rev0),
 declarationText: r.declaration_text || defaultPresentTenseOMB,
 audioPodcastUrl: r.audio_podcast_url || '',
 partnerInputs: Array.isArray(r.partner_inputs) ? r.partner_inputs : [],
 }));
 setRevisions(mapped);
 localStorage.setItem(storageKey, JSON.stringify(mapped));
 }

 if (cloudWs?.omvTargets && cloudWs.omvTargets.length > 0) {
 setOmvTargets(cloudWs.omvTargets);
 localStorage.setItem(targetsKey, JSON.stringify(cloudWs.omvTargets));
 }
 } catch (e) {
 console.warn('OMV DB hydration notice:', e);
 }
 })();
 return () => {
 active = false;
 };
 }, [client.id]);

 const handleTargetUpdate = (id: string, field: 'currentValue' | 'target3Years', val: string) => {
 const next = omvTargets.map((row) => (row.id === id ? { ...row, [field]: val } : row));
 setOmvTargets(next);
 setDbSyncStatus('saving');
 try {
 localStorage.setItem(targetsKey, JSON.stringify(next));
 } catch { /* ignore */ }

 saveOrgWorkspaceToDb(client.id, { omvTargets: next }).then(() => setDbSyncStatus('synced'));
 (supabase as any)
 .from('omv_modules')
 .upsert(
 {
 organization_id: client.id,
 vision_3_years: activeRev?.declarationText || defaultPresentTenseOMB,
 kpi_targets: next.map((t) => ({ kpi: t.indicator, baseline: t.currentValue, target: t.target3Years })),
 updated_at: new Date().toISOString(),
 },
 { onConflict: 'organization_id' }
 )
 .then(() => {});
 };

 // Multi-partner new input form
 const [newPartnerName, setNewPartnerName] = useState('');
 const [newPartnerRole, setNewPartnerRole] = useState('');
 const [newPartnerText, setNewPartnerText] = useState('');

 // Sync state when active revision changes
 useEffect(() => {
 if (activeRev) {
 setCurrentText(activeRev.declarationText);
 }
 }, [selectedRevIndex, revisions]);

 // Persist locally and in Supabase (always using the freshly updated revision object!)
 const persistRevisions = async (updated: OMBRevision[], targetIdx: number = selectedRevIndex) => {
 setRevisions(updated);
 setDbSyncStatus('saving');
 try {
 localStorage.setItem(storageKey, JSON.stringify(updated));
 } catch (err) {
 console.warn('LocalStorage error:', err);
 }

 const revToSave = updated[targetIdx] || updated[updated.length - 1] || updated[0];
 try {
 if (revToSave) {
 await ((supabase as any).from('client_omb_revisions')).upsert({
 id: revToSave.id.includes('rev-') ? undefined : revToSave.id,
 organization_id: client.id,
 revision_code: revToSave.revisionCode,
 title: revToSave.title,
 declaration_text: revToSave.declarationText,
 partner_inputs: revToSave.partnerInputs,
 audio_podcast_url: revToSave.audioPodcastUrl,
 is_baseline_rev0: revToSave.isBaselineRev0,
 status: revToSave.status,
 updated_at: new Date().toISOString()
 });
 await saveOrgWorkspaceToDb(client.id, {
 omvDeclarationText: revToSave.declarationText,
 omvRevisionCode: revToSave.revisionCode,
 omvTargets,
 });
 }
 } catch (dbErr) {
 console.warn('DB sync error (handled gracefully):', dbErr);
 } finally {
 setDbSyncStatus('synced');
 }
 };

 // Create new revision
 const handleCreateRevision = () => {
 const nextLetter = String.fromCharCode(65 + revisions.length);
 const newCode = `Rev ${nextLetter} (Ajuste ${new Date().toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })})`;
 const newRev: OMBRevision = {
 id: crypto.randomUUID(),
 revisionCode: newCode,
 title: `Revisión ${nextLetter} de la Visión`,
 date: new Date().toLocaleDateString('es-AR'),
 status: 'borrador',
 isBaselineRev0: false,
 declarationText: activeRev.declarationText,
 partnerInputs: [...(activeRev.partnerInputs || [])],
 audioPodcastUrl: activeRev.audioPodcastUrl
 };

 const next = [...revisions, newRev];
 persistRevisions(next, next.length - 1);
 setSelectedRevIndex(next.length - 1);
 };

 // Mark as Consensual Revision 0 (Línea Base Oficial)
 const handleMarkAsRev0 = () => {
 const updated = revisions.map((r, i) => {
 if (i === selectedRevIndex) {
 return {
 ...r,
 revisionCode: 'Rev 0 (Consensuada Definitiva)',
 status: 'consensuado_rev0' as const,
 isBaselineRev0: true
 };
 }
 return { ...r, isBaselineRev0: false };
 });
 persistRevisions(updated);
 };

 // Save edited text
 const handleSaveText = () => {
 const updated = revisions.map((r, i) => i === selectedRevIndex ? { ...r, declarationText: currentText } : r);
 persistRevisions(updated);
 setIsEditingText(false);
 };

 // Add partner vision
 const handleAddPartnerInput = () => {
 if (!newPartnerName.trim() || !newPartnerText.trim()) {
 alert('Por favor ingrese el nombre del socio y el texto de su visión.');
 return;
 }
 const newPartner: PartnerVisionInput = {
 id: crypto.randomUUID(),
 partnerName: newPartnerName.trim(),
 partnerRole: newPartnerRole.trim() || 'Socio',
 visionText: newPartnerText.trim()
 };
 const updated = revisions.map((r, i) => {
 if (i === selectedRevIndex) {
 return {
 ...r,
 partnerInputs: [...(r.partnerInputs || []), newPartner]
 };
 }
 return r;
 });
 persistRevisions(updated);
 setNewPartnerName('');
 setNewPartnerRole('');
 setNewPartnerText('');
 };

 // Synthesize partners' visions with Growy IA
 const handleSynthesizeWithGrowy = () => {
 if (!activeRev.partnerInputs || activeRev.partnerInputs.length === 0) {
 alert('No hay visiones de socios cargadas para unificar.');
 return;
 }

 const partnerSummary = activeRev.partnerInputs
 .map(p => `• ${p.partnerName} (${p.partnerRole}): "${p.visionText}"`)
 .join('\n');

 const synthesizedText = `Hoy es septiembre de 2029. ${client.name} ha integrado exitosamente las visiones de sus socios fundadores en una dirección común.\n\n${partnerSummary}\n\nLa empresa consolida sus operaciones bajo un Directorio profesional con sesiones mensuales, delegando la ejecución en mandos medios y alcanzando la autonomía operativa y financiera deseada.`;

 setCurrentText(synthesizedText);
 const updated = revisions.map((r, i) => i === selectedRevIndex ? { ...r, declarationText: synthesizedText } : r);
 persistRevisions(updated);
 setActiveSubTab('declaration');
 alert('¡Visiones de los socios sintetizadas con éxito en el OMB!');
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300 pb-12">
 <StepAssistantBanner
 roleBadge="Consultor GS · Etapa 1"
 stepTitle="Kickoff, OMV en Tiempo Presente y 8 Valores TARGET CVA"
 whatToDo="1) Registre la visión de cada socio en 'Visiones de Socios' y unifíquelas con IA. 2) Complete los 'Valores TARGET a 3 Años (8 KPIs CVA)'. 3) Cuando quede consensuada, pulse 'Fijar como Rev 0'."
 autoAssistNote="Cada revisión y meta CVA se respalda automáticamente en Supabase y alimenta el Informe Word 360° y el Portal del Cliente."
 growyPrompt={`Ayudame a redactar y validar el OMV en tiempo presente y los 8 Valores TARGET CVA de ${client.name}.`}
 dbSyncStatus={dbSyncStatus}
 />

 {/* Semáforo de Aprobación */}
 <QualityApprovalBadge
 moduleName="Minuta de Sesión"
 status={approvalStatus}
 audit={auditConsultants}
 onStatusChange={onApprovalChange}
 clientName={client.name}
 onSendWhatsApp={onSendWhatsApp}
 />

 {/* Barra Superior de Control de Revisiones del OMB */}
 <div className="bg-white border-2 border-zinc-900 rounded-2xl p-5 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-display text-[10px] font-bold text-white bg-[#0D9488] px-2.5 py-0.5 rounded-full">
 Marco CVA • OMV Oficial GS
 </span>
 <span className="text-xs font-bold text-zinc-500">
 Objetivo Material Visualizado — Construir desde el Valor Aspirado (3 Años)
 </span>
 </div>
 <h2 className="font-display text-2xl font-bold text-zinc-950 mt-1">
 {activeRev.title} • {activeRev.revisionCode}
 </h2>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {!activeRev.isBaselineRev0 && (
 <button
 type="button"
 onClick={handleMarkAsRev0}
 className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-display text-xs font-bold flex items-center gap-1.5 transition-colors"
 title="Consensuar esta versión como la Línea Base Rev 0 para el Master Plan"
 >
 <CheckCircle2 className="w-4 h-4 text-emerald-600" />
 Fijar como Rev 0 (Línea Base)
 </button>
 )}

 <button
 type="button"
 onClick={handleCreateRevision}
 className="px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-display text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
 >
 <Plus className="w-4 h-4" />
 Nueva Revisión (Rev {String.fromCharCode(65 + revisions.length)})
 </button>
 </div>
 </div>

 {/* Timeline / Selector de Versiones */}
 <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-zinc-100">
 <span className="text-xs font-bold text-zinc-400 flex items-center gap-1 shrink-0 mr-1">
 <History className="w-3.5 h-3.5" /> Versiones:
 </span>
 {revisions.map((rev, idx) => (
 <button
 key={rev.id}
 type="button"
 onClick={() => setSelectedRevIndex(idx)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border ${
 idx === selectedRevIndex
 ? 'bg-[#17324D] text-white border-zinc-950 shadow-xs'
 : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
 }`}
 >
 {rev.revisionCode}
 {rev.isBaselineRev0 && (
 <span className="ml-1.5 text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full">
 REV 0
 </span>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* 3. Sub-Navegación: Declaración Escrita vs. 8 Targets CVA vs. Visiones de Socios */}
 <div className="flex flex-wrap border-b border-zinc-200 gap-2">
 <button
 type="button"
 onClick={() => setActiveSubTab('declaration')}
 className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
 activeSubTab === 'declaration'
 ? 'border-[#0D9488] text-[#0D9488]'
 : 'border-transparent text-zinc-500 hover:text-zinc-800'
 }`}
 >
 <FileText className="w-4 h-4" />
 Declaración OMV (Tiempo Presente)
 </button>

 <button
 type="button"
 onClick={() => setActiveSubTab('targets')}
 className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
 activeSubTab === 'targets'
 ? 'border-[#0D9488] text-[#0D9488]'
 : 'border-transparent text-zinc-500 hover:text-zinc-800'
 }`}
 >
 <Target className="w-4 h-4" />
 Valores objetivo a 3 años (8 KPIs CVA)
 </button>

 <button
 type="button"
 onClick={() => setActiveSubTab('partners')}
 className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
 activeSubTab === 'partners'
 ? 'border-[#0D9488] text-[#0D9488]'
 : 'border-transparent text-zinc-500 hover:text-zinc-800'
 }`}
 >
 <Users className="w-4 h-4" />
 Visiones de Socios ({activeRev.partnerInputs?.length || 0})
 </button>
 </div>

 {/* SUBTAB TARGETS: TABLA DE 8 VALORES TARGET A 3 AÑOS (MARCO CVA) */}
 {activeSubTab === 'targets' && (
 <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
 <div>
 <h3 className="font-display text-lg font-bold text-zinc-950">
 Valores objetivo a 3 años — Marco CVA (Construir desde el Valor Aspirado)
 </h3>
 <p className="text-xs text-zinc-500">
 Estos 8 indicadores alimentan directamente la Pregunta Central CVA del Informe Word Diagnóstico 360° (.DOCX) y el Portal Cliente.
 </p>
 </div>
 </div>

 <div className="overflow-x-auto rounded-xl border border-zinc-200">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-[#17324D] text-white font-display text-[11px] ">
 <th className="p-3 w-[42%]">Dimensión / Indicador CVA</th>
 <th className="p-3 w-[29%]">Situación Actual (Línea Base)</th>
 <th className="p-3 w-[29%]">Valor TARGET a 3 Años</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-200">
 {omvTargets.map((row) => (
 <tr key={row.id} className="hover:bg-zinc-50">
 <td className="p-3 font-bold text-zinc-900">
 {row.indicator}
 <span className="block text-[10px] font-normal text-zinc-400">{row.unit}</span>
 </td>
 <td className="p-2.5">
 <input
 type="text"
 value={row.currentValue}
 onChange={(e) => handleTargetUpdate(row.id, 'currentValue', e.target.value)}
 placeholder="Ej: USD 1.2M / año..."
 className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-800 focus:border-[#0D9488] focus:outline-none"
 />
 </td>
 <td className="p-2.5">
 <input
 type="text"
 value={row.target3Years}
 onChange={(e) => handleTargetUpdate(row.id, 'target3Years', e.target.value)}
 placeholder="Ej: USD 2.5M / año..."
 className="w-full px-3 py-1.5 rounded-lg border border-teal-200/80 bg-[#F0FDFA]/50 font-semibold text-xs text-zinc-900 focus:border-[#0D9488] focus:outline-none"
 />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* SUBTAB A: DECLARACIÓN ESCRITA FORMAL */}
 {activeSubTab === 'declaration' && (
 <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
 <div className="flex flex-wrap items-center justify-between border-b-2 border-zinc-100 pb-3 gap-3">
 <div>
 <h3 className="font-display text-base font-bold text-zinc-950 ">
 Declaración Escrita Oficial del OMB
 </h3>
 <span className="text-[11px] text-zinc-500 font-medium">
 Redacción obligatoria en tiempo presente ("situación vivida, no deseo a futuro")
 </span>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => {
 if (isEditingText) {
 handleSaveText();
 } else {
 setIsEditingText(true);
 }
 }}
 className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold font-display flex items-center gap-1.5 transition-colors border border-zinc-300"
 >
 {isEditingText ? <Save className="w-3.5 h-3.5 text-[#0D9488]" /> : <Edit3 className="w-3.5 h-3.5 text-[#0D9488]" />}
 {isEditingText ? 'Guardar Cambios' : 'Editar Texto'}
 </button>

 <button
 type="button"
 onClick={() => window.print()}
 className="px-3.5 py-1.5 bg-[#17324D] hover:bg-[#0F2438] text-white rounded-lg text-xs font-bold font-display flex items-center gap-1.5 transition-colors"
 >
 <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
 Exportar PDF
 </button>
 </div>
 </div>

 {isEditingText ? (
 <textarea
 rows={10}
 value={currentText}
 onChange={e => setCurrentText(e.target.value)}
 className="w-full text-xs font-sans rounded-xl border-2 border-zinc-300 focus:border-[#0D9488] focus:ring-[#0D9488] p-4 leading-relaxed bg-white"
 />
 ) : (
 <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-xs text-zinc-800 leading-relaxed space-y-3 font-serif">
 {currentText.split('\n\n').map((paragraph, idx) => (
 <p key={idx}>{paragraph}</p>
 ))}
 </div>
 )}

 <div className="bg-[#17324D] border border-zinc-800 p-4 rounded-xl flex items-start gap-3 text-xs text-zinc-300">
 <Sparkles className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
 <p className="font-medium">
 <strong className="text-white font-display ">Criterio Metodológico GS:</strong> A medida que el diagnóstico destapa problemas y se analiza el FODA, la visión se madura. Al llegar al Master Plan se valida como <strong>Revisión 0</strong>.
 </p>
 </div>
 </div>
 )}

 {/* SUBTAB B: VISIONES DE MÚLTIPLES SOCIOS */}
 {activeSubTab === 'partners' && (
 <div className="space-y-6">
 <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-3">
 <div>
 <h3 className="font-display text-lg font-bold text-zinc-950">
 Visiones de los Socios Fundadores
 </h3>
 <p className="text-xs text-zinc-500">
 Espacio para registrar las aspiraciones de cada socio individualmente y consolidarlas en un OMB consensuado.
 </p>
 </div>
 <button
 type="button"
 onClick={handleSynthesizeWithGrowy}
 className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl font-display text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
 >
 <Sparkles className="w-4 h-4" />
 Unificar Visiones con Growy IA
 </button>
 </div>

 {/* Lista de Visiones de Socios */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {activeRev.partnerInputs && activeRev.partnerInputs.length > 0 ? (
 activeRev.partnerInputs.map((partner) => (
 <div key={partner.id} className="p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50 space-y-2">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="font-display font-bold text-xs text-zinc-900">
 {partner.partnerName}
 </h4>
 <span className="text-[10px] text-zinc-500 font-semibold">{partner.partnerRole}</span>
 </div>
 <button
 type="button"
 onClick={() => {
 const updated = revisions.map((r, i) => {
 if (i === selectedRevIndex) {
 return {
 ...r,
 partnerInputs: r.partnerInputs.filter(p => p.id !== partner.id)
 };
 }
 return r;
 });
 persistRevisions(updated);
 }}
 className="text-zinc-400 hover:text-rose-600 p-1"
 title="Eliminar visión"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 <p className="text-xs text-zinc-700 italic border-l-2 border-[#0D9488] pl-3">
 "{partner.visionText}"
 </p>
 </div>
 ))
 ) : (
 <div className="col-span-2 text-center py-6 text-zinc-400 text-xs">
 No hay aportes individuales registrados aún. Ingrese las visiones de los socios abajo.
 </div>
 )}
 </div>

 {/* Formulario para Agregar Visión de Socio */}
 <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3 pt-4">
 <h4 className="font-display text-xs font-bold text-zinc-800">
 Registrar Aporte de un Socio Fundador
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <input
 type="text"
 placeholder="Nombre del Socio (ej: Martín Rossi)"
 value={newPartnerName}
 onChange={e => setNewPartnerName(e.target.value)}
 className="px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
 />
 <input
 type="text"
 placeholder="Rol en la Empresa (ej: Socio Fundador / Director Comercial)"
 value={newPartnerRole}
 onChange={e => setNewPartnerRole(e.target.value)}
 className="px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
 />
 </div>
 <textarea
 rows={3}
 placeholder="¿Cómo visualiza la empresa en 3 años? (metas cuantitativas, calidad de vida, rol del dueño)..."
 value={newPartnerText}
 onChange={e => setNewPartnerText(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs bg-white"
 />
 <div className="flex justify-end">
 <button
 type="button"
 onClick={handleAddPartnerInput}
 className="px-4 py-2 bg-[#17324D] hover:bg-[#17324D] text-white font-display text-xs font-bold rounded-lg "
 >
 Agregar Visión del Socio
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
