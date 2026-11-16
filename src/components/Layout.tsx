import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
 LayoutDashboard,
 Users,
 Settings,
 LogOut,
 Menu,
 BookOpen,
 PanelLeftClose,
 PanelLeftOpen,
 Search,
 Sparkles,
 ChevronRight,
 Building2,
 X,
 Mic,
 Pause,
 Play,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import GrowyChat from './GrowyChat';
import { askGrowyContextual } from './StepAssistantBanner';
import { persistentRecorder, usePersistentRecorder } from '../lib/persistentRecorder';

const workspaceNav = [
 { name: 'Panel Ejecutivo', href: '/', icon: LayoutDashboard, badge: '' },
 { name: 'Cartera de Clientes', href: '/clients', icon: Users, badge: '' },
];

const governanceNav = [
 { name: 'Manuales & Guías', href: '/knowledge', icon: BookOpen },
 { name: 'Prompts IA & Motor', href: '/settings', icon: Settings },
];

export default function Layout() {
 const location = useLocation();
 const navigate = useNavigate();
 const recSnap = usePersistentRecorder();
 const isOnLiveRecRoute = location.pathname.includes('/meetings/live');
 const formatRecTime = (secs: number) => {
 const m = Math.floor(secs / 60);
 const s = secs % 60;
 return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
 };
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [collapsed, setCollapsed] = useState<boolean>(() => {
 try {
 return localStorage.getItem('gs_sidebar_collapsed') === 'true';
 } catch {
 return false;
 }
 });

 // Spotlight Quick Search (Ctrl+K / Cmd+K)
 const [spotlightOpen, setSpotlightOpen] = useState(false);
 const [spotlightQuery, setSpotlightQuery] = useState('');
 const [quickClients, setQuickClients] = useState<{ id: string; name: string; industry: string | null }[]>([]);

 const clientMatch = location.pathname.match(/\/clients\/([a-zA-Z0-9_-]+)/);
 const activeClientId = clientMatch ? clientMatch[1] : undefined;

 useEffect(() => {
 supabase
 .from('organizations')
 .select('id, name, industry')
 .order('name')
 .then(({ data }) => {
 if (data) setQuickClients(data);
 });
 }, [location.pathname]);

 useEffect(() => {
 const onKeyDown = (e: KeyboardEvent) => {
 if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
 e.preventDefault();
 setSpotlightOpen((prev) => !prev);
 } else if (e.key === 'Escape') {
 setSpotlightOpen(false);
 }
 };
 window.addEventListener('keydown', onKeyDown);
 return () => window.removeEventListener('keydown', onKeyDown);
 }, []);

 const toggleCollapse = () => {
 const next = !collapsed;
 setCollapsed(next);
 try {
 localStorage.setItem('gs_sidebar_collapsed', String(next));
 } catch {
 // ignore
 }
 };

 const handleSignOut = async () => {
 await supabase.auth.signOut();
 };

 const activeClientObj = useMemo(
 () => quickClients.find((c) => c.id === activeClientId),
 [quickClients, activeClientId]
 );

 const breadcrumbs = useMemo(() => {
 const p = location.pathname;
 if (p === '/') return ['Workspace', 'Panel Ejecutivo'];
 if (p === '/clients') return ['Workspace', 'Cartera de Clientes'];
 if (p.startsWith('/clients/') && activeClientId) {
 const parts = p.split('/').filter(Boolean);
 const sec = parts[2];
 const secMap: Record<string, string> = {
 relevamiento: '0. Relevamiento Comercial',
 omb: '1. Kickoff & OMV',
 omv: '1. Kickoff & OMV',
 diagnostic: '2. Diagnóstico 360°',
 matrices: '3. Matrices & Riesgos',
 'master-plan': '4. Master Plan',
 master_plan: '4. Master Plan',
 documents: 'Gestor Documental',
 meetings: 'Sesiones & Minutas',
 portal: 'Vista Previa Portal Cliente',
 };
 return [
 'Clientes',
 activeClientObj?.name || 'Expediente',
 sec ? secMap[sec] || sec : 'Resumen 360°',
 ];
 }
 if (p.startsWith('/knowledge')) return ['Gobierno IA', 'Manuales & Guías v3.0'];
 if (p.startsWith('/settings')) return ['Gobierno IA', 'Prompts & Motor IA'];
 if (p.startsWith('/meetings')) return ['Workspace', 'Sesiones & Minutas'];
 return ['Workspace', 'Estudio GS'];
 }, [location.pathname, activeClientId, activeClientObj]);

 const filteredSpotlightClients = useMemo(() => {
 const q = spotlightQuery.trim().toLowerCase();
 if (!q) return quickClients.slice(0, 6);
 return quickClients.filter(
 (c) =>
 c.name.toLowerCase().includes(q) ||
 (c.industry && c.industry.toLowerCase().includes(q))
 );
 }, [quickClients, spotlightQuery]);

 const quickActions = [
 { label: 'Ir al Panel Ejecutivo General', sub: 'Resumen de cartera y métricas', href: '/' },
 { label: 'Directorio de Empresas Clientes', sub: 'Crear o abrir expediente 360°', href: '/clients' },
 { label: 'Manual Operativo & Presentación PPTX', sub: 'Guías paso a paso Consultor y Cliente', href: '/knowledge' },
 { label: 'Centro de Prompts IA & Motores', sub: 'Configurar OpenAI / Claude y 6 prompts', href: '/settings' },
 ].filter(
 (a) =>
 !spotlightQuery.trim() ||
 a.label.toLowerCase().includes(spotlightQuery.toLowerCase()) ||
 a.sub.toLowerCase().includes(spotlightQuery.toLowerCase())
 );

 return (
 <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-slate-900">
 {/* Sidebar Desktop + Mobile Drawer */}
 <aside
 className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-out lg:static lg:translate-x-0 ${
 sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full'
 } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[256px]'}`}
 >
 {/* Brand Header */}
 <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-slate-100">
 <Link to="/" className="flex items-center gap-3 min-w-0">
 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 p-1 shadow-2xs">
 <img src="/grow-favicon.png" alt="Grow Labs" className="h-full w-full object-contain" />
 </div>
 {(!collapsed || sidebarOpen) && (
 <div className="flex flex-col truncate">
 <span className="font-display text-sm font-bold tracking-tight text-[#17324D] leading-none">
 Estudio GS
 </span>
 <span className="text-[10px] font-medium text-[#0D9488] mt-1 ">
 Grow Labs Suite
 </span>
 </div>
 )}
 </Link>

 <button
 type="button"
 onClick={toggleCollapse}
 className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-[#17324D] hover:bg-slate-100 transition-colors cursor-pointer"
 title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
 >
 {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
 </button>
 </div>

 {/* Navigation Sections */}
 <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col">
 <div className="space-y-6">
 <div className="space-y-1">
 {(!collapsed || sidebarOpen) && (
 <span className="px-3 text-[10px] font-semibold text-slate-400 block mb-2">
 Operaciones
 </span>
 )}
 {workspaceNav.map((item) => {
 const isActive =
 location.pathname === item.href ||
 (item.href !== '/' && location.pathname.startsWith(item.href));
 return (
 <Link
 key={item.name}
 to={item.href}
 onClick={() => setSidebarOpen(false)}
 title={collapsed ? item.name : undefined}
 className={`group flex items-center ${
 collapsed && !sidebarOpen ? 'justify-center px-2' : 'px-3'
 } py-2.5 rounded-xl text-[13px] font-medium transition-all ${
 isActive
 ? 'bg-[#EDF3F8] text-[#17324D] font-semibold shadow-[inset_3px_0_0_#0D9488]'
 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
 }`}
 >
 <item.icon
 className={`h-4.5 w-4.5 shrink-0 transition-colors ${
 isActive ? 'text-[#0D9488]' : 'text-slate-400 group-hover:text-slate-700'
 } ${collapsed && !sidebarOpen ? '' : 'mr-3'}`}
 />
 {(!collapsed || sidebarOpen) && <span className="truncate">{item.name}</span>}
 </Link>
 );
 })}
 </div>

 <div className="space-y-1">
 {(!collapsed || sidebarOpen) && (
 <span className="px-3 text-[10px] font-semibold text-slate-400 block mb-2">
 Conocimiento & IA
 </span>
 )}
 {governanceNav.map((item) => {
 const isActive = location.pathname.startsWith(item.href);
 return (
 <Link
 key={item.name}
 to={item.href}
 onClick={() => setSidebarOpen(false)}
 title={collapsed ? item.name : undefined}
 className={`group flex items-center ${
 collapsed && !sidebarOpen ? 'justify-center px-2' : 'px-3'
 } py-2.5 rounded-xl text-[13px] font-medium transition-all ${
 isActive
 ? 'bg-[#EDF3F8] text-[#17324D] font-semibold shadow-[inset_3px_0_0_#0D9488]'
 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
 }`}
 >
 <item.icon
 className={`h-4.5 w-4.5 shrink-0 transition-colors ${
 isActive ? 'text-[#0D9488]' : 'text-slate-400 group-hover:text-slate-700'
 } ${collapsed && !sidebarOpen ? '' : 'mr-3'}`}
 />
 {(!collapsed || sidebarOpen) && <span className="truncate">{item.name}</span>}
 </Link>
 );
 })}
 </div>

 {/* Active Client Quick Pill inside Sidebar */}
 {activeClientObj && (!collapsed || sidebarOpen) && (
 <div className="mx-1 p-3.5 rounded-2xl bg-gradient-to-br from-[#F0FDFA] to-[#EDF3F8] border border-teal-200/70 space-y-2">
 <div className="flex items-center gap-2">
 <span className="h-2 w-2 rounded-full bg-[#0D9488] animate-pulse" />
 <span className="text-[10px] font-bold text-[#0F766E]">
 Cliente Activo
 </span>
 </div>
 <p className="font-display text-xs font-bold text-[#17324D] truncate">
 {activeClientObj.name}
 </p>
 <Link
 to={`/portal/${activeClientObj.id}`}
 className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0D9488] hover:text-[#0F766E]"
 >
 Abrir Portal Cliente <ChevronRight className="w-3 h-3" />
 </Link>
 </div>
 )}
 </div>

 {/* Centered Grow Labs Brand Lockup in Middle of Sidebar */}
 <div className="flex-1 flex flex-col items-center justify-center py-6 px-3 select-none">
 {(!collapsed || sidebarOpen) ? (
 <img
 src="/grow-logo-clean.png"
 alt="Grow Labs"
 className="w-28 h-auto object-contain opacity-95 hover:opacity-100 transition-opacity"
 />
 ) : (
 <img
 src="/grow-favicon.png"
 alt="Grow Labs"
 className="w-7 h-7 object-contain opacity-85 hover:opacity-100 transition-opacity"
 />
 )}
 </div>
 </nav>

 {/* Footer User & SignOut */}
 <div className="p-3 border-t border-slate-100">
 <button
 type="button"
 onClick={handleSignOut}
 title={collapsed ? 'Cerrar Sesión' : undefined}
 className={`group flex w-full items-center ${
 collapsed && !sidebarOpen ? 'justify-center px-2' : 'px-3'
 } py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-rose-50/70 hover:text-rose-700 transition-colors cursor-pointer`}
 >
 <LogOut
 className={`h-4 w-4 text-slate-400 group-hover:text-rose-600 shrink-0 ${
 collapsed && !sidebarOpen ? '' : 'mr-2.5'
 }`}
 />
 {(!collapsed || sidebarOpen) && <span>Cerrar Sesión</span>}
 </button>
 </div>
 </aside>

 {/* Main Content Shell */}
 <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
 {/* Translucent Figma Glass Topbar */}
 <header className="sticky top-0 z-30 h-16 shrink-0 figma-glass border-b border-slate-200/75 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
 <div className="flex items-center gap-3 min-w-0">
 <button
 type="button"
 onClick={() => setSidebarOpen(true)}
 className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
 >
 <Menu className="h-4.5 w-4.5" />
 </button>

 {/* Dynamic Breadcrumbs */}
 <nav className="flex items-center gap-1.5 text-xs sm:text-[13px] truncate">
 {breadcrumbs.map((crumb, idx) => (
 <span key={idx} className="flex items-center gap-1.5 truncate">
 {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
 <span
 className={
 idx === breadcrumbs.length - 1
 ? 'font-display font-semibold text-[#17324D] truncate'
 : 'text-slate-400 font-medium hidden sm:inline truncate'
 }
 >
 {crumb}
 </span>
 </span>
 ))}
 </nav>
 </div>

 {/* Right Topbar Controls: Spotlight Search + Cloud Status + Growy Trigger */}
 <div className="flex items-center gap-2.5 shrink-0">
 <button
 type="button"
 onClick={() => setSpotlightOpen(true)}
 className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/80 text-xs text-slate-500 transition-all cursor-pointer w-40 sm:w-64 justify-between"
 >
 <span className="flex items-center gap-2 truncate">
 <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
 <span className="truncate">Buscar cliente o módulo...</span>
 </span>
 <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white text-slate-500 rounded-md border border-slate-200 shadow-2xs">
 Ctrl K
 </kbd>
 </button>

 <button
 type="button"
 onClick={() =>
 askGrowyContextual(
 activeClientObj
 ? `Resumen rápido del expediente de ${activeClientObj.name} y próximos pasos.`
 : '¿En qué me podés asistir hoy dentro de la plataforma Estudio GS?'
 )
 }
 className="btn-nordic-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
 >
 <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" />
 <span className="hidden sm:inline">Growy IA</span>
 </button>
 </div>
 </header>

 {/* Global Persistent Recording Bar when navigating away from the Live Audio tab */}
 {!isOnLiveRecRoute &&
 recSnap.clientId &&
 (recSnap.status === 'recording' ||
 (recSnap.status === 'paused' && (recSnap.duration > 0 || recSnap.liveTranscript.trim().length > 0))) && (
 <div className="bg-[#17324D] text-white px-4 sm:px-6 lg:px-8 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm z-20">
 <div className="flex items-center gap-2.5 min-w-0">
 <span
 className={`h-2.5 w-2.5 rounded-full shrink-0 ${
 recSnap.status === 'recording' ? 'bg-[#2DD4BF] animate-ping' : 'bg-amber-400'
 }`}
 />
 <Mic className="h-3.5 w-3.5 text-[#5EEAD4] shrink-0" />
 <span className="font-semibold truncate">
 {recSnap.status === 'recording'
 ? `Grabando en segundo plano: ${recSnap.clientName}`
 : `Conversación en pausa guardada: ${recSnap.clientName}`}
 </span>
 <span className="font-mono font-bold text-[#5EEAD4] bg-white/10 px-2 py-0.5 rounded-md shrink-0">
 {formatRecTime(recSnap.duration)}
 </span>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {recSnap.status === 'recording' ? (
 <button
 type="button"
 onClick={() => persistentRecorder.pauseRecording()}
 className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1 cursor-pointer"
 >
 <Pause className="h-3 w-3 fill-white" />
 Pausar
 </button>
 ) : (
 <button
 type="button"
 onClick={() => persistentRecorder.startOrResumeRecording()}
 className="px-3 py-1 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white font-semibold flex items-center gap-1 cursor-pointer"
 >
 <Play className="h-3 w-3 fill-white" />
 Continuar Grabando
 </button>
 )}

 <button
 type="button"
 onClick={() => navigate(`/clients/${recSnap.clientId}/meetings/live`)}
 className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold cursor-pointer"
 >
 Abrir Grabación →
 </button>
 </div>
 </div>
 )}

 {/* Scrollable Workspace Canvas */}
 <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
 <Outlet />
 </main>
 </div>

 {/* Mobile Backdrop */}
 {sidebarOpen && (
 <div
 className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-xs lg:hidden"
 onClick={() => setSidebarOpen(false)}
 />
 )}

 {/* Spotlight Quick Search Modal (Ctrl + K) */}
 {spotlightOpen && (
 <div
 className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-slate-900/35 backdrop-blur-xs p-4 animate-in fade-in duration-150"
 onClick={() => setSpotlightOpen(false)}
 >
 <div
 className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-[0_24px_60px_-12px_rgba(23,50,77,0.22)] overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
 <Search className="h-4.5 w-4.5 text-[#0D9488]" />
 <input
 type="text"
 autoFocus
 value={spotlightQuery}
 onChange={(e) => setSpotlightQuery(e.target.value)}
 placeholder="Saltar a un cliente, etapa, manual o configuración IA..."
 className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
 />
 <button
 type="button"
 onClick={() => setSpotlightOpen(false)}
 className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3">
 {filteredSpotlightClients.length > 0 && (
 <div>
 <span className="px-3 py-1 text-[10px] font-bold text-slate-400 block">
 Empresas Clientes
 </span>
 <div className="space-y-0.5 mt-1">
 {filteredSpotlightClients.map((c) => (
 <button
 key={c.id}
 type="button"
 onClick={() => {
 setSpotlightOpen(false);
 setSpotlightQuery('');
 navigate(`/clients/${c.id}`);
 }}
 className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#EDF3F8]/70 text-left transition-colors group cursor-pointer"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="h-8 w-8 rounded-lg bg-[#EDF3F8] text-[#17324D] flex items-center justify-center shrink-0 group-hover:bg-[#17324D] group-hover:text-white transition-colors">
 <Building2 className="h-4 w-4" />
 </div>
 <div className="truncate">
 <p className="text-xs font-semibold text-slate-900 truncate">{c.name}</p>
 <p className="text-[11px] text-slate-400 truncate">
 {c.industry || 'Organización Cliente'}
 </p>
 </div>
 </div>
 <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#0D9488]" />
 </button>
 ))}
 </div>
 </div>
 )}

 {quickActions.length > 0 && (
 <div>
 <span className="px-3 py-1 text-[10px] font-bold text-slate-400 block">
 Navegación Rápida
 </span>
 <div className="space-y-0.5 mt-1">
 {quickActions.map((act) => (
 <button
 key={act.href}
 type="button"
 onClick={() => {
 setSpotlightOpen(false);
 setSpotlightQuery('');
 navigate(act.href);
 }}
 className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer"
 >
 <div>
 <p className="text-xs font-semibold text-slate-800">{act.label}</p>
 <p className="text-[11px] text-slate-400">{act.sub}</p>
 </div>
 <ChevronRight className="h-4 w-4 text-slate-300" />
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 <GrowyChat activeClientId={activeClientId} />
 </div>
 );
}
