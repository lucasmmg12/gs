import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
 Building2,
 Calendar,
 FileText,
 Activity,
 ChevronRight,
 Plus,
 Sparkles,
 BookOpen,
 ArrowUpRight,
 KeyRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { askGrowyContextual } from '../components/StepAssistantBanner';

export default function Dashboard() {
 const [clientsCount, setClientsCount] = useState(0);
 const [meetingsCount, setMeetingsCount] = useState(0);
 const [minutesCount, setMinutesCount] = useState(0);
 const [clients, setClients] = useState<any[]>([]);

 const fetchDashboardStats = async () => {
 const { data: orgs } = await supabase.from('organizations').select('*').order('name');
 if (orgs) {
 setClientsCount(orgs.length);
 setClients(orgs);
 }

 const { count: mtgCount } = await supabase
 .from('meetings')
 .select('*', { count: 'exact', head: true });
 setMeetingsCount(mtgCount || 0);

 const { count: minCount } = await supabase
 .from('minutes')
 .select('*', { count: 'exact', head: true })
 .eq('status', 'draft');
 setMinutesCount(minCount || 0);
 };

 useEffect(() => {
 fetchDashboardStats();
 }, []);

 return (
 <div className="space-y-7 max-w-7xl mx-auto pb-12">
 {/* Figma Hero Header Bento */}
 <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F2438] via-[#17324D] to-[#115E59] text-white p-7 sm:p-9 shadow-[0_18px_40px_-14px_rgba(23,50,77,0.3)]">
 <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#2DD4BF]/15 blur-3xl" />
 <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
 <div className="space-y-2 max-w-2xl">
 <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-[#5EEAD4]">
 <span className="h-1.5 w-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
 Centro de Control Estratégico · Estudio GS
 </span>
 <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
 Panel Ejecutivo de Consultoría
 </h1>
 <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
 Supervise el avance del Diagnóstico 360°, la evolución matemática del Pentágono (IME/IRE) y la publicación auditada en el Portal de cada empresa cliente.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3 shrink-0">
 <Link
 to="/clients"
 className="btn-nordic-teal px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
 >
 <Plus className="h-4 w-4" />
 Gestionar Cartera
 </Link>
 <Link
 to="/knowledge"
 className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
 >
 <BookOpen className="h-4 w-4 text-[#5EEAD4]" />
 Manual & PPTX
 </Link>
 <button
 type="button"
 onClick={() =>
 askGrowyContextual(
 'Dame un panorama general de cómo gestionar mi cartera de clientes hoy desde el Panel Ejecutivo.'
 )
 }
 className="px-4 py-2.5 rounded-xl bg-white text-[#17324D] hover:bg-slate-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
 >
 <Sparkles className="h-4 w-4 text-[#0D9488]" />
 Consultar a Growy
 </button>
 </div>
 </div>
 </div>

 {/* 4 Bento Metric Cards */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <div className="figma-card figma-card-hover p-5 flex flex-col justify-between">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs font-medium text-slate-500">Empresas Activas</p>
 <p className="font-display text-3xl font-bold text-[#17324D] mt-1.5" data-numeric="true">
 {clientsCount || 3}
 </p>
 </div>
 <div className="h-10 w-10 rounded-xl bg-[#EDF3F8] text-[#17324D] flex items-center justify-center">
 <Building2 className="h-5 w-5" />
 </div>
 </div>
 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
 <span className="text-slate-500">Aislamiento multi-tenant</span>
 <span className="font-semibold text-[#0D9488]">100% Activo</span>
 </div>
 </div>

 <div className="figma-card figma-card-hover p-5 flex flex-col justify-between">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs font-medium text-slate-500">Madurez Promedio (IME)</p>
 <p className="font-display text-3xl font-bold text-[#0D9488] mt-1.5" data-numeric="true">
 5.8 <span className="text-sm font-medium text-slate-400">/ 10</span>
 </p>
 </div>
 <div className="h-10 w-10 rounded-xl bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
 <Activity className="h-5 w-5" />
 </div>
 </div>
 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
 <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
 +0.8 pts trimestral
 </span>
 <span className="text-slate-400">Meta trienal: 8.0</span>
 </div>
 </div>

 <div className="figma-card figma-card-hover p-5 flex flex-col justify-between">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs font-medium text-slate-500">Sesiones Grabadas</p>
 <p className="font-display text-3xl font-bold text-[#17324D] mt-1.5" data-numeric="true">
 {meetingsCount || 8}
 </p>
 </div>
 <div className="h-10 w-10 rounded-xl bg-[#EDF3F8] text-[#17324D] flex items-center justify-center">
 <Calendar className="h-5 w-5" />
 </div>
 </div>
 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
 <span className="text-slate-500">Audio → 100 preguntas</span>
 <span className="font-semibold text-[#17324D]">IA Auditada</span>
 </div>
 </div>

 <div className="figma-card figma-card-hover p-5 flex flex-col justify-between">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs font-medium text-slate-500">Minutas en Revisión</p>
 <p className="font-display text-3xl font-bold text-[#17324D] mt-1.5" data-numeric="true">
 {minutesCount || 1}
 </p>
 </div>
 <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
 <FileText className="h-5 w-5" />
 </div>
 </div>
 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
 <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
 Filtro humano GS
 </span>
 <span className="text-slate-400">Previo a Portal</span>
 </div>
 </div>
 </div>

 {/* Portfolio Bento Table */}
 <div className="figma-card overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
 <div>
 <h2 className="font-display text-base font-bold text-[#17324D]">
 Expedientes Corporativos en Seguimiento
 </h2>
 <p className="text-xs text-slate-500 mt-0.5">
 Seleccione una organización para abrir su ciclo Etapas 0 a 4 o previsualizar su Portal Ejecutivo.
 </p>
 </div>
 <Link
 to="/clients"
 className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1"
 >
 Directorio completo <ArrowUpRight className="h-3.5 w-3.5" />
 </Link>
 </div>

 <div className="divide-y divide-slate-100">
 {clients.map((client) => (
 <div
 key={client.id}
 className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors group"
 >
 <Link to={`/clients/${client.id}`} className="flex items-center gap-4 min-w-0 flex-1">
 <div className="h-10 w-10 rounded-xl bg-[#EDF3F8] text-[#17324D] flex items-center justify-center font-display font-bold text-sm shrink-0 group-hover:bg-[#17324D] group-hover:text-white transition-colors">
 {client.name?.substring(0, 2).toUpperCase() || 'GS'}
 </div>
 <div className="min-w-0">
 <p className="font-display text-sm font-bold text-slate-900 group-hover:text-[#17324D] truncate">
 {client.name}
 </p>
 <p className="text-xs text-slate-500 truncate mt-0.5">
 {client.industry || 'Organización PyME'} ·{' '}
 <span className="text-[#0D9488] font-medium">Expediente 360° Activo</span>
 </p>
 </div>
 </Link>

 <div className="flex items-center gap-3 shrink-0">
 <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-mono font-medium text-slate-600">
 <KeyRound className="h-3 w-3 text-[#0D9488]" />
 {client.portal_access_code || 'GS-DEMO-2026'}
 </span>

 <Link
 to={`/portal/${client.id}`}
 className="px-3 py-1.5 rounded-lg bg-[#F0FDFA] hover:bg-teal-100/70 text-[#0F766E] border border-teal-200/80 text-xs font-semibold transition-colors"
 >
 Portal Cliente
 </Link>

 <Link
 to={`/clients/${client.id}`}
 className="p-2 rounded-lg text-slate-400 hover:text-[#17324D] hover:bg-slate-100 transition-all"
 >
 <ChevronRight className="h-4.5 w-4.5" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
