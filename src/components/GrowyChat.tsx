import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Send, Bot, User, Loader2, 
  Download, FileSpreadsheet, FileText, Maximize2, Minimize2, Sparkles, CheckCircle,
  ShieldCheck, ShieldAlert, Mic, Square
} from 'lucide-react';
import { generateExcelReport, generatePdfReport } from '../lib/reportGenerator';
import { resolveGrowySmartResponse } from '../lib/growyLocalBrain';

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

const CONSULTANT_QUICK_ACTIONS = [
  { label: '🧭 Flujo Consultor 0→4', prompt: 'Explicame paso a paso cómo debe trabajar el Consultor GS desde Etapa 0 hasta Etapa 4 y cómo liberar entregables al cliente.' },
  { label: '🎯 OMV & 8 Targets CVA', prompt: 'Mostrame el estado actual del OMV (Objetivo Material Visualizado en tiempo presente) y los 8 Valores TARGET a 3 años.' },
  { label: '📐 Puente AVANCE-EJES', prompt: 'Calculá la evolución matemática del Pentágono y el puente AVANCE-EJES según las acciones ponderadas del Master Plan.' },
  { label: '👤 Cómo opera el Cliente', prompt: 'Explicame cómo funciona el Portal y la autogestión del Cliente (Reportar Avance, Documentos, Autoevaluación y Preparar Reunión IA).' },
  { label: '📑 Los 4 Entregables GS', prompt: 'Detallame los 4 entregables oficiales exportables (.XLSX de 6 hojas con fórmulas y los 3 documentos Word .DOCX).' },
  { label: '📊 Master Plan en Excel', prompt: 'Generame una planilla Excel (.xlsx) completa con todas las tareas del Master Plan Estratégico de la empresa organizada por ejes.' },
];

const CLIENT_QUICK_ACTIONS = [
  { label: '🧭 Guía de mi Portal', prompt: 'Explicame cómo usar mi Portal Ejecutivo y cómo funciona mi autogestión paso a paso.' },
  { label: '🎯 Mi OMV y 8 Targets', prompt: 'Mostrame el resumen de mi Visión OMV 2029 y mis 8 Valores TARGET a 3 años.' },
  { label: '📐 Mi Pentágono e IME', prompt: 'Explicame cómo están mi Índice de Madurez (IME), mi Índice de Riesgo (IRE) y el avance de mi Master Plan.' },
  { label: '✅ Cómo reportar avances', prompt: '¿Cómo reporto avances de mis tareas del Master Plan y cómo lo valida mi Consultor GS?' },
];

interface GrowyChatProps {
  activeClientId?: string;
  activeClientName?: string;
  roleMode?: 'consultant' | 'client';
}

export default function GrowyChat({ activeClientId, activeClientName, roleMode = 'consultant' }: GrowyChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolvedClientName, setResolvedClientName] = useState(activeClientName || '');
  const quickActions = roleMode === 'client' ? CLIENT_QUICK_ACTIONS : CONSULTANT_QUICK_ACTIONS;

  useEffect(() => {
    if (activeClientId && !activeClientName) {
      (supabase as any)
        .from('organizations')
        .select('name')
        .eq('id', activeClientId)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data?.name) setResolvedClientName(data.name);
        });
    } else if (activeClientName) {
      setResolvedClientName(activeClientName);
    }
  }, [activeClientId, activeClientName]);

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      role: 'assistant',
      content:
        roleMode === 'client'
          ? `¡Hola! Soy **Growy**, el copiloto ejecutivo exclusivo de **${activeClientName || 'tu organización'}**.\n\nEstoy conectado en vivo a tu expediente validado en Base de Datos para asistirte paso a paso:\n• 🎯 **Visión OMV & 8 Targets CVA**: Tu norte estratégico a 3 años.\n• 📊 **Pentágono, IME e IRE**: Interpretación clara de tu madurez y riesgos.\n• ✅ **Autogestión**: Cómo reportar avances de tareas, subir documentos, completar tu autoevaluación mensual y preparar tus reuniones clave con IA.\n\n¿En qué paso te ayudo hoy?`
          : `¡Hola! Soy **Growy**, tu copiloto metodológico de **Estudio GS (Manual Operativo v3.0)**.\n\nEstoy entrenado con todo el flujo **Consultor + Portal Cliente** y conectado a Supabase:\n• 🧭 **Ciclo Completo Etapas 0 a 4**: Relevamiento Comercial → Kickoff & OMV (8 KPIs CVA) → Diagnóstico 360° (Audio Texto Plano) → Matrices IME/IRE → Master Plan.\n• 📐 **Puente \`AVANCE-EJES\`**: Coherencia matemática \`MPE ↔ PENT-PE\` (±0,5 pp) y validación de avances del cliente.\n• 📑 **4 Entregables Oficiales**: Workbook Excel de **6 hojas con fórmulas** (\`.XLSX\`) + Minuta, Diagnóstico 360° y Brief en Word (\`.DOCX\`).\n\nTocá un acceso rápido o preguntame sobre cualquier paso.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Dictation (Whisper / Speech API)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceTimerRef = useRef<any>(null);

  const startVoiceDictation = async () => {
    try {
      setIsVoiceRecording(true);
      setVoiceDuration(0);
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration(d => d + 1);
      }, 1000);

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang = 'es-AR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let full = '';
          for (let i = 0; i < event.results.length; ++i) {
            full += event.results[i][0].transcript + ' ';
          }
          if (full.trim()) {
            setInput(full.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition notice:', event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        voiceMediaRecorderRef.current = mediaRecorder;
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
      }
    } catch (err: any) {
      console.error('Error starting mic in Growy:', err);
      alert('No se pudo acceder al micrófono: ' + err.message);
      setIsVoiceRecording(false);
    }
  };

  const stopVoiceDictation = (autoSend: boolean = false) => {
    setIsVoiceRecording(false);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state === 'recording') {
      try { voiceMediaRecorderRef.current.stop(); } catch (e) {}
    }

    if (autoSend && input.trim()) {
      sendQuery(input.trim());
    }
  };

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
          organization_id: activeClientId,
          role_mode: roleMode,
        }
      });

      if (error || !data?.reply) {
        throw error || new Error('Fallback to local GS brain');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          attachment: data.attachment
        }
      ]);
    } catch {
      // Guaranteed DB-backed + Manual v3.0 intelligent answer so Growy never fails
      const smartReply = await resolveGrowySmartResponse({
        query: userMessage,
        roleMode,
        organizationId: activeClientId,
        organizationName: resolvedClientName || activeClientName,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: smartReply }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen to contextual StepAssistantBanner triggers across the entire platform
  useEffect(() => {
    const handler = (ev: Event) => {
      const customEv = ev as CustomEvent<{ prompt?: string }>;
      const prompt = customEv.detail?.prompt;
      setIsOpen(true);
      if (prompt) {
        sendQuery(prompt);
      }
    };
    window.addEventListener('gs:ask-growy', handler);
    return () => window.removeEventListener('gs:ask-growy', handler);
  }, [activeClientId, resolvedClientName, roleMode, isLoading]);

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
        className={`fixed bottom-6 right-6 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#17324D] to-[#0D9488] text-white shadow-[0_12px_30px_-6px_rgba(13,148,136,0.45)] border border-white/15 transition-all hover:scale-105 z-50 flex items-center gap-2.5 cursor-pointer ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        title="Abrir Copiloto Growy IA"
      >
        <Bot className="h-5 w-5 stroke-[2.2]" />
        <span className="font-display text-xs font-semibold tracking-wide hidden sm:inline">
          Growy Copiloto
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 bg-white rounded-3xl shadow-[0_24px_60px_-12px_rgba(23,50,77,0.25)] flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 border border-slate-200/90 ${
          isExpanded 
            ? 'w-[92vw] sm:w-[650px] h-[85vh] max-h-[850px]' 
            : 'w-[92vw] sm:w-[420px] h-[640px] max-h-[82vh]'
        } ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0F2438] via-[#17324D] to-[#115E59] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/12 backdrop-blur-md border border-white/15 text-[#5EEAD4] rounded-xl">
              <Bot className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm tracking-tight">Growy Copiloto</h3>
                <span className="bg-[#0D9488]/30 border border-[#2DD4BF]/40 text-[#5EEAD4] text-[9px] font-semibold px-2 py-0.5 rounded-full">
                  IA + Cloud BD
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Estudio GS · Asistente Metodológico</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white cursor-pointer"
              title={isExpanded ? 'Reducir ventana' : 'Expandir ventana'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white cursor-pointer"
              title="Cerrar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Security & Multi-tenant Isolation Strip */}
        {activeClientId ? (
          <div className="bg-[#F0FDFA] text-[#0F766E] px-3.5 py-2 text-[11px] flex items-center justify-between border-b border-teal-200/70 shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
              Contexto aislado: <strong className="font-semibold text-[#17324D] truncate">{resolvedClientName || activeClientName || activeClientId.substring(0, 8)}</strong>
            </span>
            <span className="text-[10px] font-semibold text-[#0D9488] bg-white px-2 py-0.5 rounded-full border border-teal-200/80 shrink-0">
              Multi-tenant
            </span>
          </div>
        ) : (
          <div className="bg-slate-50 text-slate-600 px-3.5 py-2 text-[11px] flex items-center gap-1.5 border-b border-slate-200/70 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Modo Cartera Global · Seleccione un cliente para análisis aislado</span>
          </div>
        )}

        {/* Quick Action Chips */}
        <div className="bg-slate-50/80 border-b border-slate-100 p-2.5 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => sendQuery(action.prompt)}
              disabled={isLoading}
              className="text-[11px] font-medium bg-white hover:bg-[#F0FDFA] hover:text-[#0F766E] hover:border-teal-300 text-slate-700 border border-slate-200/90 rounded-full px-3 py-1 whitespace-nowrap transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-[#0D9488] shrink-0" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#17324D] to-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="h-4 w-4 stroke-[2.2]" />
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl max-w-[85%] text-xs sm:text-[13px] shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-[#17324D] text-white rounded-br-sm font-medium'
                    : 'bg-white border border-slate-200/90 text-slate-700 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                {/* Attachment Card if present */}
                {msg.attachment && (
                  <div className="mt-3 p-3 rounded-xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl text-white shrink-0 ${
                        msg.attachment.type === 'excel' ? 'bg-[#0D9488]' : 'bg-[#17324D]'
                      }`}>
                        {msg.attachment.type === 'excel' ? (
                          <FileSpreadsheet className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-slate-900 truncate">
                            {msg.attachment.fileName}
                          </p>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F0FDFA] text-[#0F766E] border border-teal-200 uppercase">
                            {msg.attachment.type === 'excel' ? 'Excel .XLSX' : 'PDF Oficial'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-[#0D9488] inline" />
                          Listo para descargar
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(msg.attachment!)}
                      className="btn-nordic-teal px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-xl bg-[#EDF3F8] text-[#17324D] flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-xl bg-[#17324D] text-[#5EEAD4] flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 rounded-bl-sm shadow-2xs flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-[#0D9488]" />
                <span className="text-xs font-medium">
                  Consultando base de datos en tiempo real...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Dictation Banner */}
        {isVoiceRecording && (
          <div className="px-4 py-2 bg-[#F0FDFA] border-t border-teal-200 flex items-center justify-between text-xs text-[#0F766E] animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488] animate-ping" />
              <span className="font-semibold">
                Escuchando dictado ({voiceDuration}s)...
              </span>
            </div>
            <button
              type="button"
              onClick={() => stopVoiceDictation(true)}
              className="btn-nordic-teal px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
            >
              Enviar
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3.5 bg-white border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isVoiceRecording ? "Escuchando tu voz..." : "Consultá indicadores, etapas o pedí un reporte..."}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] bg-slate-50/70 text-slate-900 placeholder:text-slate-400"
              disabled={isLoading}
            />

            <button
              type="button"
              onClick={isVoiceRecording ? () => stopVoiceDictation(true) : startVoiceDictation}
              disabled={isLoading}
              className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                isVoiceRecording
                  ? 'bg-[#0D9488] text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200/80'
              }`}
              title={isVoiceRecording ? "Detener y Enviar Orden de Voz" : "Dictar orden por voz a Growy"}
            >
              {isVoiceRecording ? <Square className="h-4 w-4 fill-white" /> : <Mic className="h-4 w-4 text-[#0D9488]" />}
            </button>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-nordic-primary p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
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
