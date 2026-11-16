import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Send, UserCheck, ChevronDown } from 'lucide-react';

export type ApprovalStatus = 'draft_review' | 'approved_published';

export interface AuditConsultants {
  leaderConsultant: string;
  editorConsultant?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface QualityApprovalBadgeProps {
  moduleName: 'Minuta de Sesión' | 'Formulario de Diagnóstico' | 'Master Plan Estratégico';
  status: ApprovalStatus;
  audit: AuditConsultants;
  onStatusChange: (newStatus: ApprovalStatus, audit: AuditConsultants) => void;
  clientName?: string;
  onSendWhatsApp?: () => void;
}

const AVAILABLE_CONSULTANTS = [
  'Martín Gómez (Consultor Senior)',
  'Lucía Fernández (Consultora de Procesos)',
  'Abel (Director de Metodología GS)',
  'Gustavo (Consultor de Gestión)',
  'Lucas (Consultor de Implementación)',
];

export const QualityApprovalBadge: React.FC<QualityApprovalBadgeProps> = ({
  moduleName,
  status,
  audit,
  onStatusChange,
  clientName,
  onSendWhatsApp,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [leader, setLeader] = useState(audit.leaderConsultant || AVAILABLE_CONSULTANTS[0]);
  const [editor, setEditor] = useState(audit.editorConsultant || AVAILABLE_CONSULTANTS[1]);
  const [approver, setApprover] = useState(audit.approvedBy || AVAILABLE_CONSULTANTS[0]);
  const [reviewNotes] = useState(audit.notes || '');

  const isApproved = status === 'approved_published';

  const handleToggle = () => {
    if (!isApproved) {
      const now = new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      onStatusChange('approved_published', {
        leaderConsultant: leader,
        editorConsultant: editor,
        approvedBy: approver,
        approvedAt: now,
        notes: reviewNotes || 'Aprobado formalmente tras revisión de control de calidad.',
      });
      setShowConfig(false);
    } else {
      onStatusChange('draft_review', {
        leaderConsultant: leader,
        editorConsultant: editor,
        notes: 'Puesto nuevamente en revisión interna.',
      });
    }
  };

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    onStatusChange(status, {
      leaderConsultant: leader,
      editorConsultant: editor,
      approvedBy: isApproved ? approver : undefined,
      approvedAt: isApproved ? audit.approvedAt : undefined,
      notes: reviewNotes,
    });
    setShowConfig(false);
  };

  return (
    <div className="figma-card p-4 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-3 h-3 rounded-full ring-4 transition-all shrink-0 ${
              isApproved
                ? 'bg-emerald-500 ring-emerald-100'
                : 'bg-amber-500 ring-amber-100'
            }`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isApproved
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isApproved ? 'Publicado en Portal Cliente' : 'Borrador Interno GS (Oculto al Cliente)'}
              </span>
              <span className="font-display text-xs font-bold text-[#17324D]">
                {moduleName} {clientName ? `· ${clientName}` : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isApproved
                ? `Liberado por ${audit.approvedBy || approver} (${audit.approvedAt || 'validado'})`
                : 'En control de calidad interno. El cliente verá un aviso de auditoría hasta su aprobación.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-[#17324D] hover:bg-slate-50 rounded-xl font-medium flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#0D9488]" />
            Firma & Auditoría
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {isApproved && onSendWhatsApp && (
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="px-3 py-1.5 bg-[#EDF3F8] hover:bg-slate-200/70 text-[#17324D] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#0D9488]" />
              Enviar WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isApproved
                ? 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
                : 'btn-nordic-teal'
            }`}
          >
            {isApproved ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Pasar a Borrador
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprobar y Publicar al Cliente
              </>
            )}
          </button>
        </div>
      </div>

      {showConfig && (
        <form
          onSubmit={handleSaveAudit}
          className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs animate-in fade-in duration-150"
        >
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              1. Consultor Líder de Sesión
            </label>
            <select
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/70 font-medium text-slate-800 focus:outline-none focus:border-[#0D9488]"
            >
              {AVAILABLE_CONSULTANTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              2. Analista / Redactor
            </label>
            <select
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/70 font-medium text-slate-800 focus:outline-none focus:border-[#0D9488]"
            >
              {AVAILABLE_CONSULTANTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              3. Director Auditor GS
            </label>
            <select
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/70 font-medium text-slate-800 focus:outline-none focus:border-[#0D9488]"
            >
              {AVAILABLE_CONSULTANTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-nordic-primary px-4 py-1.5 rounded-xl text-xs font-semibold"
            >
              Guardar Trazabilidad
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
