import { useState, useMemo } from 'react';
import {
 BookOpen,
 Search,
 CheckCircle2,
 Target,
 Mic,
 ShieldCheck,
 Calendar,
 Activity,
 ChevronRight,
 UserCheck,
 Sparkles,
 Award,
 Terminal,
 FileText,
 Download,
 Bot,
 FileSpreadsheet,
} from 'lucide-react';
import {
 UPDATED_KNOWLEDGE_GUIDES,
 MANUAL_OFICIAL_COMPLETO_GS,
} from '../data/gsManualAndKnowledge';
import { askGrowyContextual } from '../components/StepAssistantBanner';

export default function KnowledgeBase() {
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCategory, setSelectedCategory] = useState<
 'all' | 'consultor' | 'cliente' | 'entregables' | 'tecnico'
 >('all');
 const [activeGuideId, setActiveGuideId] = useState<string>(UPDATED_KNOWLEDGE_GUIDES[0].id);

 const filteredGuides = useMemo(() => {
 return UPDATED_KNOWLEDGE_GUIDES.filter((item) => {
 const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
 const matchSearch =
 item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
 item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchCategory && matchSearch;
 });
 }, [selectedCategory, searchQuery]);

 const activeGuide =
 UPDATED_KNOWLEDGE_GUIDES.find((g) => g.id === activeGuideId) || UPDATED_KNOWLEDGE_GUIDES[0];

 const handleDownloadFullManual = () => {
 const blob = new Blob([MANUAL_OFICIAL_COMPLETO_GS], { type: 'text/markdown;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'MANUAL_OPERATIVO_INTEGRAL_ESTUDIO_GS_v3.md';
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 setTimeout(() => URL.revokeObjectURL(url), 1500);
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Header Principal */}
 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <span className="h-2.5 w-2.5 rounded-full bg-[#17324D]" />
 <span className="font-display text-xs font-bold text-[#17324D]">
 Manual Operativo Oficial v3.0 • Sincronizado con Growy IA
 </span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-slate-950 ">
 Centro de Manuales, Guías Paso a Paso y Protocolos GS
 </h1>
 <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
 Documentación didáctica dividida por sectores: <strong>Ruta del Consultor (Etapas 0 a 4)</strong>,{' '}
 <strong>Autogestión del Cliente en su Portal</strong>, <strong>Estándar de los 4 Entregables (.XLSX / .DOCX)</strong> y{' '}
 <strong>Garantía de Base de Datos</strong>.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2.5 shrink-0">
 <button
 type="button"
 onClick={() =>
 askGrowyContextual(
 'Haceme un recorrido didáctico del Manual Operativo v3.0: cómo trabaja el Consultor GS y cómo se autogestiona el Cliente.'
 )
 }
 className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-[#17324D] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
 >
 <Bot className="w-4 h-4 text-[#5EEAD4]" />
 Preguntar a Growy sobre el Manual
 </button>

 <a
 href="/Presentacion_Manual_GrowLabs_Consultor_y_Cliente.pptx"
 download="Presentacion_Manual_GrowLabs_Consultor_y_Cliente.pptx"
 className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
 >
 <Download className="w-4 h-4" />
 Presentación Grow Labs (.PPTX)
 </a>

 <button
 type="button"
 onClick={handleDownloadFullManual}
 className="px-4 py-2.5 rounded-xl bg-[#17324D] hover:bg-[#0F2438] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
 >
 <Download className="w-4 h-4" />
 Manual (.MD)
 </button>
 </div>
 </div>

 {/* Buscador + Filtros por Sector */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
 <div className="flex flex-wrap gap-2">
 {[
 { id: 'all', label: 'Todos los Sectores', icon: BookOpen },
 { id: 'consultor', label: '1. Rol Consultor GS (0→4)', icon: Award },
 { id: 'cliente', label: '2. Portal & Autogestión Cliente', icon: UserCheck },
 { id: 'entregables', label: '3. Los 4 Entregables (.XLSX/.DOCX)', icon: FileSpreadsheet },
 { id: 'tecnico', label: '4. Base de Datos & Growy IA', icon: Terminal },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setSelectedCategory(tab.id as any)}
 className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-display font-bold transition-all cursor-pointer ${
 selectedCategory === tab.id
 ? 'bg-[#17324D] text-white shadow-sm'
 : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-950'
 }`}
 >
 <tab.icon
 className={`w-3.5 h-3.5 ${selectedCategory === tab.id ? 'text-[#5EEAD4]' : 'text-slate-400'}`}
 />
 {tab.label}
 </button>
 ))}
 </div>

 <div className="relative w-full md:w-72">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar OMV, AVANCE-EJES, Portal..."
 className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:border-[#17324D] focus:outline-none"
 />
 </div>
 </div>

 {/* Layout de Dos Columnas */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Lista izquierda */}
 <div className="lg:col-span-5 space-y-3">
 <span className="font-display text-xs font-bold text-slate-500 block px-1">
 Módulos del Manual ({filteredGuides.length})
 </span>

 {filteredGuides.map((guide) => {
 const isActive = guide.id === activeGuide.id;
 return (
 <div
 key={guide.id}
 onClick={() => setActiveGuideId(guide.id)}
 className={`p-4 rounded-2xl border-2 cursor-pointer transition-all space-y-2 ${
 isActive
 ? 'border-[#17324D] bg-[#EDF3F8]/60 shadow-xs'
 : 'border-slate-200 bg-white hover:border-slate-900'
 }`}
 >
 <div className="flex items-center justify-between">
 <span
 className={`px-2 py-0.5 rounded text-[10px] font-display font-bold ${
 guide.category === 'consultor'
 ? 'bg-[#EDF3F8] text-[#17324D]'
 : guide.category === 'cliente'
 ? 'bg-blue-100 text-blue-800'
 : guide.category === 'entregables'
 ? 'bg-emerald-100 text-emerald-800'
 : 'bg-slate-100 text-slate-800'
 }`}
 >
 {guide.category.charAt(0).toUpperCase() + guide.category.slice(1)}
 </span>
 <span className="text-[10px] font-mono text-slate-400">{guide.readTime}</span>
 </div>

 <h3 className="font-display text-sm font-bold tracking-tight text-slate-950">
 {guide.title}
 </h3>

 <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{guide.summary}</p>

 <div className="flex flex-wrap gap-1.5 pt-1">
 {guide.tags.map((tag) => (
 <span
 key={tag}
 className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600"
 >
 #{tag}
 </span>
 ))}
 </div>
 </div>
 );
 })}
 </div>

 {/* Visor derecho */}
 <div className="lg:col-span-7">
 <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 sm:p-8 space-y-6 shadow-sm">
 <div className="border-b border-slate-200 pb-5 space-y-2">
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 bg-[#17324D] text-white rounded text-[10px] font-display font-bold ">
 {activeGuide.category.charAt(0).toUpperCase() + activeGuide.category.slice(1)}
 </span>
 <span className="text-xs text-slate-500 font-mono">
 Lectura estimada: {activeGuide.readTime}
 </span>
 </div>
 <button
 type="button"
 onClick={() =>
 askGrowyContextual(`Explicame en detalle el módulo del manual: "${activeGuide.title}"`)
 }
 className="text-xs font-bold text-[#17324D] hover:underline flex items-center gap-1 cursor-pointer"
 >
 <Bot className="w-3.5 h-3.5" /> Consultar a Growy
 </button>
 </div>
 <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950">
 {activeGuide.title}
 </h2>
 <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{activeGuide.summary}</p>
 </div>

 {activeGuide.steps && (
 <div className="space-y-4">
 <h3 className="font-display text-xs font-bold text-[#17324D] flex items-center gap-1.5">
 <Sparkles className="w-4 h-4" /> Secuencia Operativa Paso a Paso
 </h3>

 <div className="space-y-3">
 {activeGuide.steps.map((step, idx) => (
 <div
 key={idx}
 className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 hover:border-slate-900 transition-all"
 >
 <div className="flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#17324D] text-white text-xs font-display font-bold shrink-0">
 {idx + 1}
 </span>
 <h4 className="font-display text-xs sm:text-sm font-bold text-slate-950">
 {step.title}
 </h4>
 </div>
 <p className="text-xs text-slate-700 leading-relaxed pl-8">{step.desc}</p>
 {step.tip && (
 <div className="ml-8 p-2.5 rounded-lg bg-[#EDF3F8] border border-[#CBD5E1] text-[11px] text-[#17324D] font-medium flex items-start gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-[#17324D] shrink-0 mt-0.5" />
 <span>
 <strong>Regla de Oro GS:</strong> {step.tip}
 </span>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {activeGuide.contentSections && (
 <div className="space-y-5">
 {activeGuide.contentSections.map((sec, idx) => (
 <div key={idx} className="space-y-2">
 <h3 className="font-display text-sm sm:text-base font-bold text-slate-950 flex items-center gap-2">
 <ChevronRight className="w-4 h-4 text-[#17324D]" />
 {sec.heading}
 </h3>
 <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-6">{sec.body}</p>
 {sec.alert && (
 <div className="ml-6 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-semibold flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
 <span>{sec.alert}</span>
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Resumen de Fórmulas y Reglas Clave */}
 <div className="p-4 rounded-xl bg-[#17324D] text-white space-y-3">
 <span className="font-display text-xs font-bold text-[#5EEAD4] flex items-center gap-1.5">
 <FileText className="w-3.5 h-3.5" /> Reglas Metodológicas Inmutables GS
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
 <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800">
 <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
 <span>ΔEje = (10 - Base) × Σ(Inc% × Avance%)</span>
 </div>
 <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800">
 <Target className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
 <span>OMV en Presente + 8 Targets CVA</span>
 </div>
 <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800">
 <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
 <span>Audio Texto Plano + Filtro Humano</span>
 </div>
 <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800">
 <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
 <span>Coherencia AVANCE-EJES: ±0,5 pp</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
