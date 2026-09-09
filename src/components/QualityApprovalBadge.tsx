import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Send, UserCheck, ChevronDown } from 'lucide-react';

export type ApprovalStatus = 'draft_review' | 'approved_published';

export interface AuditConsultants {
  leaderConsultant: string;    // Quien lideró la sesión / inició
  editorConsultant?: string;   // Quien continuó / editó el diagnóstico
  approvedBy?: string;         // Quien revisó y dio el visto bueno final
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
  'Lucas (Consultor de Implementación)'
];

export const QualityApprovalBadge: React.FC<QualityApprovalBadgeProps> = ({
  moduleName,
  status,
  audit,
  onStatusChange,
  clientName,
  onSendWhatsApp
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [leader, setLeader] = useState(audit.leaderConsultant || AVAILABLE_CONSULTANTS[0]);
  const [editor, setEditor] = useState(audit.editorConsultant || AVAILABLE_CONSULTANTS[1]);
  const [approver, setApprover] = useState(audit.approvedBy || AVAILABLE_CONSULTANTS[0]);
  const [reviewNotes] = useState(audit.notes || '');

  const isApproved = status === 'approved_published';

  const handleToggle = () => {
    if (!isApproved) {
      // Pasar a Verde (Aprobado)
      const now = new Date().toLocaleDateString('es-AR', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      onStatusChange('approved_published', {
        leaderConsultant: leader,
        editorConsultant: editor,
        approvedBy: approver,
        approvedAt: now,
        notes: reviewNotes || 'Aprobado formalmente tras revisión de control de calidad.'
      });
      setShowConfig(false);
    } else {
      // Regresar a Rojo (Borrador / Revisión)
      onStatusChange('draft_review', {
        leaderConsultant: leader,
        editorConsultant: editor,
        notes: 'Puesto nuevamente en revisión interna.'
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
      notes: reviewNotes
    });
    setShowConfig(false);
  };

  return (
    <div className="bg-white border-2 border-zinc-900 rounded-xl p-4 shadow-sm transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Indicador Semáforo */}
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ring-4 transition-all ${
            isApproved 
              ? 'bg-emerald-500 ring-emerald-100 animate-pulse' 
              : 'bg-red-600 ring-red-100 shadow-[0_0_12px_rgba(220,38,38,0.5)]'
          }`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-display text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                isApproved 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                  : 'bg-black text-red-400 border border-red-800'
              }`}>
                {isApproved ? 'VERDE • APROBADO (FRONT)' : 'ROJO • REVISIÓN INTERNA (BACK)'}
              </span>
              <span className="font-display text-xs font-bold text-zinc-900 uppercase tracking-wide">
                {moduleName} {clientName ? `— ${clientName}` : ''}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
              {isApproved 
                ? `Publicado para el cliente por ${audit.approvedBy || approver} el ${audit.approvedAt || 'recientemente'}`
                : 'Control de Calidad: Solo visible por consultores GS. Pendiente de aprobación para el cliente.'}
            </p>
          </div>
        </div>

        {/* Acciones y Botón de Semáforo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 text-xs text-zinc-800 hover:text-black hover:bg-zinc-100 rounded-lg font-bold flex items-center gap-1.5 border border-zinc-300 transition-colors uppercase tracking-wider"
          >
            <UserCheck className="w-3.5 h-3.5 text-red-600" />
            Trazabilidad
            <ChevronDown className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {isApproved && onSendWhatsApp && (
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors uppercase tracking-wider border border-zinc-800"
              title="Notificar por WhatsApp al cliente"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              Notificar WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 ${
              isApproved
                ? 'bg-zinc-100 text-zinc-900 hover:bg-red-50 hover:text-red-700 border border-zinc-400'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-crimson border border-red-500'
            }`}
          >
            {isApproved ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                Revertir a Rojo (Revisión)
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprobar y Publicar (Verde)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panel Desplegable de Trazabilidad Multi-Consultor */}
      {showConfig && (
        <form onSubmit={handleSaveAudit} className="mt-4 pt-3 border-t-2 border-zinc-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
              1. Lideró la reunión:
            </label>
            <select
              value={leader}
              onChange={e => setLeader(e.target.value)}
              className="w-full text-xs rounded-lg border-zinc-300 focus:border-red-600 focus:ring-red-600 py-1.5 bg-zinc-50 font-medium"
            >
              {AVAILABLE_CONSULTANTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
              2. Cargó / Continuó:
            </label>
            <select
              value={editor}
              onChange={e => setEditor(e.target.value)}
              className="w-full text-xs rounded-lg border-zinc-300 focus:border-red-600 focus:ring-red-600 py-1.5 bg-zinc-50 font-medium"
            >
              {AVAILABLE_CONSULTANTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
              3. Auditor que aprueba:
            </label>
            <select
              value={approver}
              onChange={e => setApprover(e.target.value)}
              className="w-full text-xs rounded-lg border-zinc-300 focus:border-red-600 focus:ring-red-600 py-1.5 bg-zinc-50 font-medium"
            >
              {AVAILABLE_CONSULTANTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider border border-zinc-700"
            >
              Guardar Auditoría
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
