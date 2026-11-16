import React, { useState } from 'react';
import { Bot, CheckCircle2, ArrowRight, HelpCircle, ChevronDown } from 'lucide-react';

export interface StepAssistantBannerProps {
 roleBadge: string;
 stepTitle: string;
 whatToDo: string;
 autoAssistNote?: string;
 growyPrompt: string;
 dbSyncStatus?: 'synced' | 'saving' | 'idle';
 nextStepLabel?: string;
 onNextStep?: () => void;
}

export function askGrowyContextual(prompt: string) {
 window.dispatchEvent(
 new CustomEvent('gs:ask-growy', {
 detail: { prompt },
 })
 );
}

export const StepAssistantBanner: React.FC<StepAssistantBannerProps> = ({
 roleBadge,
 stepTitle,
 whatToDo,
 growyPrompt,
 nextStepLabel,
 onNextStep,
}) => {
 const [expanded, setExpanded] = useState(false);

 return (
 <div className="bg-white rounded-xl border border-slate-200/90 px-3.5 py-2.5 shadow-2xs transition-all">
 <div className="flex flex-wrap items-center justify-between gap-2.5">
 <div className="flex flex-wrap items-center gap-2 min-w-0">
 <span className="px-2 py-0.5 rounded-md bg-[#EDF3F8] text-[#17324D] font-display text-[11px] font-semibold shrink-0">
 {roleBadge}
 </span>
 <h3 className="font-display text-xs font-semibold text-[#17324D] truncate">
 {stepTitle}
 </h3>
 <button
 type="button"
 onClick={() => setExpanded((prev) => !prev)}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 hover:text-[#17324D] hover:bg-slate-100 transition-colors cursor-pointer"
 >
 <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" />
 <span>Guía</span>
 <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
 </button>
 </div>

 <div className="flex flex-wrap items-center gap-2 shrink-0">
 <button
 type="button"
 onClick={() => askGrowyContextual(growyPrompt)}
 className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#17324D] border border-slate-200/90 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
 >
 <Bot className="w-3.5 h-3.5 text-[#0D9488]" />
 Asistencia Growy
 </button>

 {nextStepLabel && onNextStep && (
 <button
 type="button"
 onClick={onNextStep}
 className="btn-nordic-teal px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 {nextStepLabel}
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>

 {expanded && (
 <p className="text-xs text-slate-600 leading-relaxed mt-2 pt-2 border-t border-slate-100">
 <strong className="font-semibold text-slate-800">Guía rápida:</strong> {whatToDo}
 </p>
 )}
 </div>
 );
};
