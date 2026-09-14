import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Send, Bot, User, Loader2, 
  Download, FileSpreadsheet, FileText, Maximize2, Minimize2, Sparkles, CheckCircle,
  ShieldCheck, ShieldAlert
} from 'lucide-react';
import { generateExcelReport, generatePdfReport } from '../lib/reportGenerator';

interface MessageAttachment {
  type: 'excel' | 'pdf';
  fileName: string;
  options: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment?: MessageAttachment;
}

const QUICK_ACTIONS = [
  { label: '📊 Master Plan en Excel', prompt: 'Generame una planilla Excel (.xlsx) completa con todas las tareas del Master Plan Estratégico de la empresa organizada por ejes.' },
  { label: '📑 Informe Diagnóstico en PDF', prompt: 'Generame un informe ejecutivo en PDF de presentación formal con el Diagnóstico 360°, el estado de madurez IME y el resumen de la empresa.' },
  { label: '🛡️ Riesgos en Excel', prompt: 'Generame un Excel con la Matriz de Riesgos de la empresa con nivel de riesgo, causas y planes de contingencia.' },
  { label: '📈 Pentágono en PDF', prompt: 'Generame un informe PDF con la evolución del Pentágono del Orden y las metas trienales de madurez.' },
  { label: '📋 Acta de Reunión en PDF', prompt: 'Generame un reporte formal en PDF de la última reunión de tutoría estratégica con sus acuerdos y compromisos.' }
];

interface GrowyChatProps {
  activeClientId?: string;
  activeClientName?: string;
}

export default function GrowyChat({ activeClientId, activeClientName }: GrowyChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: '¡Hola! Soy Growy, tu copiloto de inteligencia estratégica y analítica de Consultora GS.\n\nTengo acceso completo a la base de datos (grabaciones, transcripciones, minutas, diagnósticos 360°, Master Plan, Pentágono y matriz de riesgos). Todas mis consultas operan bajo estricto aislamiento de datos para garantizar confidencialidad absoluta entre clientes.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage = queryText.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const currentMessages = [...messages, { role: 'user', content: userMessage }].map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('growy-chat', {
        body: { 
          messages: currentMessages,
          organization_id: activeClientId
        }
      });

      if (error) throw error;

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: data.reply || 'He procesado tu solicitud.',
          attachment: data.attachment
        }
      ]);
    } catch (error: any) {
      console.error('Error al consultar a Growy:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message || 'No se pudo conectar con el servicio'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleDownloadAttachment = (attachment: MessageAttachment) => {
    try {
      if (attachment.type === 'excel') {
        generateExcelReport(attachment.options);
      } else if (attachment.type === 'pdf') {
        generatePdfReport(attachment.options);
      }
    } catch (err: any) {
      console.error('Error generando archivo:', err);
      alert('Error al generar el archivo: ' + err.message);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-[#6B1D2F] text-white shadow-lg border-2 border-[#8A2B42] transition-all hover:bg-[#541524] hover:scale-105 z-50 flex items-center gap-2.5 ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        title="Abrir Asistente Virtual GS"
      >
        <Bot className="h-6 w-6 stroke-[2.5]" />
        <span className="font-display text-xs font-black uppercase tracking-wider hidden sm:inline">
          Growy Asistente
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-obsidian flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 border-2 border-slate-900 ${
          isExpanded 
            ? 'w-[92vw] sm:w-[650px] h-[85vh] max-h-[850px]' 
            : 'w-[92vw] sm:w-[420px] h-[640px] max-h-[82vh]'
        } ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b-2 border-[#6B1D2F] text-white shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6B1D2F] text-white rounded-xl shadow-xs">
              <Bot className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm tracking-wider uppercase">Growy Asistente</h3>
                <span className="bg-[#6B1D2F] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest">IA + BD</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Consultora GS · Inteligencia Metodológica</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              title={isExpanded ? 'Reducir ventana' : 'Expandir ventana'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-[#6B1D2F]/20 hover:text-[#E6C5CD] rounded-lg transition-colors text-slate-400"
              title="Cerrar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Security & Multi-tenant Isolation Strip */}
        {activeClientId ? (
          <div className="bg-emerald-950 text-emerald-300 px-3 py-1.5 text-[10px] font-mono flex items-center justify-between border-b border-emerald-800 shrink-0">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Aislamiento Activo: <strong className="text-white">{activeClientName || activeClientId.substring(0, 8)}</strong>
            </span>
            <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded">
              Multi-tenant Seguro
            </span>
          </div>
        ) : (
          <div className="bg-zinc-900 text-zinc-400 px-3 py-1.5 text-[10px] font-mono flex items-center gap-1.5 border-b border-zinc-800 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Modo Global • Selecciona un cliente para consultas contextuales aisladas</span>
          </div>
        )}

        {/* Quick Action Chips */}
        <div className="bg-zinc-100 border-b border-zinc-200 p-2.5 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
          {QUICK_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              onClick={() => sendQuery(action.prompt)}
              disabled={isLoading}
              className="text-[11px] font-bold bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-zinc-700 border border-zinc-200 rounded-lg px-2.5 py-1 whitespace-nowrap transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3 text-red-600 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-zinc-950 text-red-500 border border-zinc-800 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 stroke-[2.5]" />
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl max-w-[85%] text-xs sm:text-sm shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-red-600 text-white rounded-br-none font-medium shadow-crimson'
                    : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                {/* Attachment Card if present */}
                {msg.attachment && (
                  <div className="mt-3 p-3 rounded-xl border bg-zinc-50 border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-lg text-white shrink-0 ${
                        msg.attachment.type === 'excel' ? 'bg-emerald-600' : 'bg-red-600'
                      }`}>
                        {msg.attachment.type === 'excel' ? (
                          <FileSpreadsheet className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-zinc-900 truncate">
                            {msg.attachment.fileName}
                          </p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            msg.attachment.type === 'excel' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {msg.attachment.type === 'excel' ? 'Excel .XLSX' : 'PDF Oficial'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500 inline" />
                          Generado listo para descargar
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(msg.attachment!)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 ${
                        msg.attachment.type === 'excel'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-red-600 hover:bg-red-700 shadow-crimson'
                      }`}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar {msg.attachment.type === 'excel' ? 'Excel' : 'PDF'}
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-zinc-950 text-white border border-zinc-800 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-slate-950 text-[#DA9BAC] border border-slate-800 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-xs flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-[#6B1D2F]" />
                <span className="text-xs text-slate-500 font-medium">
                  Consultando base de datos y preparando respuesta...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3.5 bg-white border-t border-slate-200">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntame sobre clientes, minutas o pedime un Excel/PDF..."
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1D2F] focus:border-[#6B1D2F] bg-slate-50 text-slate-900 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-[#6B1D2F] text-white rounded-xl hover:bg-[#541524] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
              title="Enviar consulta"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
