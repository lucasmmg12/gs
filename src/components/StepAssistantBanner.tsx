import React from 'react';
import { Bot, CheckCircle2, ArrowRight, Database, Loader2, Sparkles } from 'lucide-react';

export interface StepAssistantBannerProps {
  roleBadge: string;
  stepTitle: string;
  whatToDo: string;
  autoAssistNote: string;
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
  autoAssistNote,
  growyPrompt,
  dbSyncStatus = 'synced',
  nextStepLabel,
  onNextStep,
}) => {
  return (
    <div className="figma-card bg-gradient-to-r from-[#F0FDFA]/65 via-white to-[#EDF3F8]/60 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1.5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#EDF3F8] text-[#17324D] border border-slate-200/80 font-display text-[11px] font-semibold">
            {roleBadge}
          </span>
          <h3 className="font-display text-xs sm:text-sm font-bold text-[#17324D]">
            {stepTitle}
          </h3>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              dbSyncStatus === 'saving'
                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-[#F0FDFA] text-[#0F766E] border-teal-200/80'
            }`}
            title="Persistencia automática en PostgreSQL (Supabase) garantizada"
          >
            {dbSyncStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                Sincronizando BD...
              </>
            ) : (
              <>
                <Database className="w-3 h-3 text-[#0D9488]" />
                Guardado en BD ✓
              </>
            )}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="font-semibold text-slate-800">Guía rápida:</strong> {whatToDo}
        </p>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
          <span>{autoAssistNote}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => askGrowyContextual(growyPrompt)}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#17324D] border border-slate-200/90 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <Bot className="w-3.5 h-3.5 text-[#0D9488]" />
          Asistencia Growy
        </button>

        {nextStepLabel && onNextStep && (
          <button
            type="button"
            onClick={onNextStep}
            className="btn-nordic-teal px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {nextStepLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
