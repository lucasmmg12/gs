import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Building2, Search, Plus, ChevronRight, Activity, Layers, X, Loader2, KeyRound, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { syncPublicOrgsDirectoryToDb, saveOrgWorkspaceToDb } from '../lib/gsCloudSync';
import { StepAssistantBanner } from '../components/StepAssistantBanner';

type Organization = Database['public']['Tables']['organizations']['Row'];

export default function Clients() {
 const [clients, setClients] = useState<Organization[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 
 // Modal state
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [newClientName, setNewClientName] = useState('');
 const [newClientIndustry, setNewClientIndustry] = useState('Salud / Clínica');
 const [creating, setCreating] = useState(false);
 const [modalError, setModalError] = useState<string | null>(null);

 const fetchClients = async () => {
 const { data, error } = await supabase
 .from('organizations')
 .select('*')
 .order('name');
 
 if (error) {
 console.error('Error fetching clients:', error);
 } else {
 const list = data || [];
 setClients(list);
 syncPublicOrgsDirectoryToDb(
 list.map((o) => ({
 id: o.id,
 name: o.name,
 industry: o.industry,
 portal_access_code: o.portal_access_code,
 }))
 );
 }
 setLoading(false);
 };

 useEffect(() => {
 fetchClients();
 }, []);

 const handleCreateClient = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newClientName.trim()) {
 setModalError('Ingrese la razón social o nombre de la organización.');
 return;
 }

 setCreating(true);
 setModalError(null);

 try {
 const codePrefix = newClientName
 .trim()
 .toUpperCase()
 .replace(/[^A-Z0-9]/g, '')
 .slice(0, 6) || 'CLIENT';
 const uniqueAccessCode = `GS-${codePrefix}-2026`;

 // 1. Insert organization with unique portal_access_code
 const { data: newOrg, error: orgError } = await supabase
 .from('organizations')
 .insert([{
 name: newClientName.trim(),
 industry: newClientIndustry.trim(),
 status: 'active',
 portal_access_code: uniqueAccessCode,
 portal_active: true
 }])
 .select()
 .single();

 if (orgError) throw orgError;

 // 2. Initialize diagnostic_responses, quality_approvals (Red by default) & cloud workspace
 if (newOrg) {
 await (supabase.from('diagnostic_responses') as any).insert([{
 organization_id: newOrg.id,
 answers: {},
 ime_score: 0,
 ire_score: 0,
 status: 'draft'
 }]);

 await supabase.from('quality_approvals').insert([
 { organization_id: newOrg.id, entity_type: 'omv', entity_id: newOrg.id, version: 1, approval_status: 'in_review', consultant_name: 'Consultor Senior GS', quality_score: 0, comments: 'Borrador inicial en revisión interna.' },
 { organization_id: newOrg.id, entity_type: 'diagnostic_360', entity_id: newOrg.id, version: 1, approval_status: 'in_review', consultant_name: 'Consultor Senior GS', quality_score: 0, comments: 'Diagnóstico en relevamiento inicial.' },
 { organization_id: newOrg.id, entity_type: 'master_plan', entity_id: newOrg.id, version: 1, approval_status: 'in_review', consultant_name: 'Consultor Senior GS', quality_score: 0, comments: 'Master Plan en diseño interno.' }
 ]);

 // 3. Initialize pentagon baseline
 await supabase.from('pentagon_scores').insert([{
 organization_id: newOrg.id,
 period_label: 'Línea Base Inicial',
 measurement_date: new Date().toISOString().split('T')[0],
 gobernanza: 5.0,
 procesos: 4.5,
 finanzas: 6.0,
 talento: 5.5,
 comercial: 5.0,
 ime_actual: 5.2,
 is_baseline: true
 }]);

 await saveOrgWorkspaceToDb(newOrg.id, {
 orgId: newOrg.id,
 orgName: newOrg.name,
 industry: newOrg.industry || 'PyME',
 portalAccessCode: uniqueAccessCode,
 projectCode: '26-031',
 clientStage: 'relevamiento',
 approvals: {
 omv: 'draft_review',
 diagnostic_360: 'draft_review',
 master_plan: 'draft_review',
 },
 });
 }

 setIsModalOpen(false);
 setNewClientName('');
 await fetchClients();
 } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : 'Error al registrar cliente';
 setModalError(msg);
 } finally {
 setCreating(false);
 }
 };

 const filteredClients = clients.filter(c => 
 c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (c.industry && c.industry.toLowerCase().includes(searchTerm.toLowerCase()))
 );

 return (
 <div className="space-y-6 max-w-7xl mx-auto">
 <StepAssistantBanner
 roleBadge="Consultor GS · Cartera"
 stepTitle="Directorio de Empresas Clientes & Códigos de Portal"
 whatToDo="Cree un nuevo cliente con '+ Nuevo Cliente' o haga clic sobre una empresa para abrir su expediente (Etapas 0 a 4). Cada empresa recibe un Código Privado de Portal único."
 autoAssistNote="Por seguridad, todo cliente nuevo nace con sus entregables en Semáforo ROJO (ocultos) hasta que el Consultor GS apruebe publicarlos en VERDE."
 growyPrompt="Explicame cómo dar de alta un nuevo cliente, cómo arranca en Etapa 0 y cómo compartirle su Código de Acceso al Portal."
 />
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
 <span className="text-[11px] font-semibold text-[#0D9488]">Cartera Corporativa</span>
 </div>
 <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#17324D]">
 Directorio de Clientes
 </h1>
 <p className="mt-1 text-sm text-slate-500">
 Gestione los expedientes 360°, sesiones grabadas, Master Plans y códigos de acceso al Portal Ejecutivo.
 </p>
 </div>
 <button 
 onClick={() => setIsModalOpen(true)}
 className="btn-nordic-teal inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer self-start sm:self-center"
 >
 <Plus className="h-4 w-4 stroke-[2.5]" />
 Nuevo Cliente
 </button>
 </div>

 <div className="figma-card p-4 flex items-center gap-4">
 <div className="relative flex-1 max-w-md">
 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
 <Search className="h-4 w-4 text-slate-400" />
 </div>
 <input
 type="text"
 className="block w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm text-slate-900 focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:outline-none placeholder:text-slate-400 bg-slate-50/60"
 placeholder="Buscar por razón social o industria..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 <div className="figma-card overflow-hidden">
 {loading ? (
 <div className="p-12 text-center text-slate-500 font-medium">
 Cargando organizaciones clientes...
 </div>
 ) : filteredClients.length > 0 ? (
 <ul role="list" className="divide-y divide-slate-100">
 {filteredClients.map((client) => (
 <li key={client.id} className="hover:bg-slate-50/80 transition-colors group">
 <Link to={`/clients/${client.id}`} className="flex items-center justify-between gap-x-6 px-6 py-4.5">
 <div className="flex min-w-0 gap-x-4 items-center">
 <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#EDF3F8] text-[#17324D] group-hover:bg-[#17324D] group-hover:text-white transition-colors">
 <Building2 className="h-5 w-5" />
 </div>
 <div className="min-w-0 flex-auto">
 <p className="font-display text-sm font-bold text-slate-900 group-hover:text-[#17324D] transition-colors tracking-tight">
 {client.name}
 </p>
 <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
 <span className="font-medium">{client.industry || 'PyME en Desarrollo'}</span>
 <span className="h-1 w-1 rounded-full bg-slate-300" />
 <span className="flex items-center gap-1 text-[#0D9488] font-semibold text-[11px]">
 <Activity className="h-3 w-3 stroke-[2.2]" /> IME: 7.8
 </span>
 <span className="h-1 w-1 rounded-full bg-slate-300" />
 <span className="flex items-center gap-1 text-slate-600 font-medium text-[11px]">
 <Layers className="h-3 w-3" /> Master Plan: 42%
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-600 border border-slate-200" title="Código Privado de Portal para este Cliente">
 <KeyRound className="h-3 w-3 text-[#0D9488]" />
 {(client as unknown as { portal_access_code?: string }).portal_access_code || 'GS-DEMO-2026'}
 </span>
 <Link
 to={`/portal/${client.id}`}
 onClick={(e) => e.stopPropagation()}
 className="hidden md:inline-flex items-center gap-1 rounded-lg bg-[#F0FDFA] hover:bg-teal-100/70 px-2.5 py-1 text-[11px] font-semibold text-[#0F766E] border border-teal-200/80 transition-colors"
 title="Previsualizar lo que ve este Cliente en su Portal"
 >
 <Eye className="h-3 w-3" />
 Portal Cliente
 </Link>
 <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
 Activo
 </span>
 <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#0D9488] group-hover:translate-x-0.5 transition-all" />
 </div>
 </Link>
 </li>
 ))}
 </ul>
 ) : (
 <div className="p-12 text-center text-slate-500 font-medium">
 No se encontraron clientes activos.
 </div>
 )}
 </div>

 {/* Modal Nuevo Cliente */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-xs p-4">
 <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-200">
 <div className="flex items-center justify-between pb-4 border-b border-slate-100">
 <h3 className="font-display text-base font-bold text-[#17324D]">
 Registrar Nueva Organización
 </h3>
 <button 
 onClick={() => setIsModalOpen(false)}
 className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
 >
 <X className="h-5 w-5" />
 </button>
 </div>

 <form onSubmit={handleCreateClient} className="mt-5 space-y-4">
 {modalError && (
 <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200 font-medium">
 {modalError}
 </div>
 )}

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1.5">
 Razón Social / Nombre Comercial *
 </label>
 <input
 type="text"
 required
 placeholder="Ej: Clínica Los Andes S.A."
 className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:outline-none"
 value={newClientName}
 onChange={e => setNewClientName(e.target.value)}
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-slate-700 mb-1.5">
 Industria / Rubro
 </label>
 <select
 className="w-full text-sm rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] focus:outline-none"
 value={newClientIndustry}
 onChange={e => setNewClientIndustry(e.target.value)}
 >
 <option value="Salud / Clínica">Salud / Clínica</option>
 <option value="Laboratorio y Diagnóstico">Laboratorio y Diagnóstico</option>
 <option value="Desarrollo e Ingeniería">Desarrollo e Ingeniería</option>
 <option value="Servicios Corporativos">Servicios Corporativos</option>
 <option value="Industria Farmacéutica">Industria Farmacéutica</option>
 <option value="Otro">Otro</option>
 </select>
 </div>

 <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
 <button
 type="button"
 onClick={() => setIsModalOpen(false)}
 className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
 >
 Cancelar
 </button>
 <button
 type="submit"
 disabled={creating}
 className="btn-nordic-teal px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
 >
 {creating ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creando...
 </>
 ) : (
 'Crear Expediente'
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
