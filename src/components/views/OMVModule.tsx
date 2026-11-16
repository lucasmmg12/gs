import React, { useState } from 'react';
import { 
 Download, FileText, 
 Sparkles, Edit3, Save
} from 'lucide-react';
import { QualityApprovalBadge } from '../QualityApprovalBadge';
import type { ApprovalStatus, AuditConsultants } from '../QualityApprovalBadge';
import type { Client } from '../../data/mockData';

export type ClientStage = 'relevamiento' | 'kickoff_omv' | 'diagnostic_in_progress' | 'diagnostic_closed' | 'master_plan_active';

interface OMVModuleProps {
 client: Client;
 stage: ClientStage;
 onStageChange: (stage: ClientStage) => void;
 approvalStatus: ApprovalStatus;
 auditConsultants: AuditConsultants;
 onApprovalChange: (status: ApprovalStatus, audit: AuditConsultants) => void;
 onSendWhatsApp?: () => void;
}

export const OMVModule: React.FC<OMVModuleProps> = ({
 client,
 approvalStatus,
 auditConsultants,
 onApprovalChange,
 onSendWhatsApp
}) => {
 const [isEditingText, setIsEditingText] = useState(false);

 // OMV redactado en tiempo presente ("situación vivida", requisito explícito del doc 2)
 const defaultPresentTenseOMV = `Hoy es septiembre de 2029. ${client.name} opera con un Directorio consolidado que sesiona mensualmente con actas formales. Los socios fundadores delegan la operación diaria en un equipo de mandos medios autónomos y dedican su tiempo al crecimiento y alianzas estratégicas. 

La empresa factura más de $2.5M USD anuales con un margen neto superior al 18%, cuenta con un flujo de caja proyectado a 6 meses y una reserva de liquidez de 90 días. Sus procesos operativos y de abastecimiento están formalizados bajo estándares de calidad, logrando una tasa de satisfacción de clientes del 92% y cero dependencia del boca a boca gracias a un proceso comercial sistematizado.`;

 const [omvText, setOmvText] = useState(defaultPresentTenseOMV);

 return (
 <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
 {/* Semáforo de Aprobación */}
 <QualityApprovalBadge
 moduleName="Minuta de Sesión"
 status={approvalStatus}
 audit={auditConsultants}
 onStatusChange={onApprovalChange}
 clientName={client.name}
 onSendWhatsApp={onSendWhatsApp}
 />

 {/* 2. Declaración Escrita OMV en Tiempo Presente */}
 <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
 <div className="flex items-center justify-between border-b-2 border-zinc-100 pb-3">
 <div className="flex items-center gap-2.5">
 <FileText className="w-5 h-5 text-[#0D9488]" />
 <div>
 <h3 className="font-display text-base font-bold text-zinc-950 ">
 Declaración Escrita OMV (Kickoff)
 </h3>
 <span className="text-[11px] text-zinc-500 font-medium">
 Redacción en tiempo presente (situación vivida, no deseo a futuro)
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setIsEditingText(!isEditingText)}
 className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold font-display flex items-center gap-1.5 transition-colors border border-zinc-300"
 >
 {isEditingText ? <Save className="w-3.5 h-3.5 text-[#0D9488]" /> : <Edit3 className="w-3.5 h-3.5 text-[#0D9488]" />}
 {isEditingText ? 'Guardar' : 'Editar'}
 </button>

 <button
 type="button"
 onClick={() => window.print()}
 className="px-3.5 py-1.5 bg-[#17324D] hover:bg-[#0F2438] text-white rounded-lg text-xs font-bold font-display flex items-center gap-1.5 transition-colors"
 >
 <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
 Exportar
 </button>
 </div>
 </div>

 {isEditingText ? (
 <textarea
 rows={8}
 value={omvText}
 onChange={e => setOmvText(e.target.value)}
 className="w-full text-xs font-sans rounded-xl border-2 border-zinc-300 focus:border-[#0D9488] focus:ring-[#0D9488] p-4 leading-relaxed"
 />
 ) : (
 <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-xs text-zinc-800 leading-relaxed space-y-3 font-serif">
 {omvText.split('\n\n').map((paragraph, idx) => (
 <p key={idx}>{paragraph}</p>
 ))}
 </div>
 )}

 <div className="bg-[#17324D] border border-zinc-800 p-4 rounded-xl flex items-start gap-3 text-xs text-zinc-300">
 <Sparkles className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
 <p className="font-medium">
 <strong className="text-white font-display ">Requisito Metodológico GS:</strong> Este texto constituye la portada oficial del Master Plan Estratégico y sirve como ancla de alineación durante las remediciones trimestrales del Pentágono.
 </p>
 </div>
 </div>
 </div>
 );
};
