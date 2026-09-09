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
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Indicador Semáforo */}
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ring-4 transition-all ${
            isApproved 
              ? 'bg-emerald-500 ring-emerald-100 animate-pulse' 
              : 'bg-rose-500 ring-rose-100'
          }`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isApproved 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {isApproved ? 'VERDE — Aprobado (Visible en Front)' : 'ROJO — Revisión Interna (Back)'}
              </span>
              <span className="text-xs font-medium text-gray-500">
                {moduleName} {clientName ? `• ${clientName}` : ''}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isApproved 
                ? `Publicado para el cliente por ${audit.approvedBy || approver} el ${audit.approvedAt || 'recientemente'}`
                : 'Solo visible por el equipo consultor GS. No disponible para el cliente aún.'}
            </p>
          </div>
        </div>

        {/* Acciones y Botón de Semáforo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg font-medium flex items-center gap-1.5 border border-gray-200"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            Trazabilidad
            <ChevronDown className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {isApproved && onSendWhatsApp && (
            <button
              type="button"
              onClick={onSendWhatsApp}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Notificar por WhatsApp al cliente"
            >
              <Send className="w-3.5 h-3.5" />
              Notificar WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
              isApproved
                ? 'bg-gray-100 text-gray-700 hover:bg-rose-50 hover:text-rose-700 border border-gray-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isApproved ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Regresar a Revisión (Rojo)
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
        <form onSubmit={handleSaveAudit} className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              1. Consultor que lideró la sesión:
            </label>
            <select
              value={leader}
              onChange={e => setLeader(e.target.value)}
              className="w-full text-xs rounded-lg border-gray-300 focus:border-blue-600 focus:ring-blue-500 py-1.5"
            >
              {AVAILABLE_CONSULTANTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              2. Consultor que cargó / continuó:
            </label>
            <select
              value={editor}
              onChange={e => setEditor(e.target.value)}
              className="w-full text-xs rounded-lg border-gray-300 focus:border-blue-600 focus:ring-blue-500 py-1.5"
            >
              {AVAILABLE_CONSULTANTS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">
              3. Consultor Auditor que aprueba:
            </label>
            <select
              value={approver}
              onChange={e => setApprover(e.target.value)}
              className="w-full text-xs rounded-lg border-gray-300 focus:border-blue-600 focus:ring-blue-500 py-1.5"
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
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
            >
              Guardar Trazabilidad
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
