import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Edit3,
  Save,
  Layers,
  Quote,
  Trash2,
  Eye,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { splitAudioFileForTranscription, parseAudioFileMeta } from '../../lib/audioFileSplitter';
import { saveLocalChunk, sendChunkToEdgeTranscriber } from '../../lib/audioChunker';
import {
  analyzeMeetingForCheckout,
  analyzeMultiSessionForQA,
  persistAutoAnsweredQuestions,
  type DiagnosticCheckoutSuggestion
} from '../../lib/diagnosticCheckoutEngine';
import { exportOfficialMinuteDocx } from '../../lib/gsOfficialExporter';
import {
  DIAGNOSTIC_AREAS,
  getAllDiagnosticQuestions,
  type ResponseOptionValue
} from '../../data/diagnosticQuestions';

interface QueuedAudioItem {
  localId: string;
  sessionId: string;
  file: File;
  title: string;
  detectedDate?: string;
  sizeMB: number;
  status: 'queued' | 'splitting' | 'transcribing' | 'ready' | 'error';
  progressPct: number;
  progressText: string;
  chunksTotal: number;
  chunksDone: number;
  durationSeconds: number;
  transcript: string;
  error?: string;
}

interface StoredSessionSummary {
  id: string;
  titulo: string;
  duracion_segundos: number;
  transcripcion: string;
  created_at: string;
  estado: string;
}

interface MultiAudioBatchQAProps {
  client: { id: string; name: string };
  onDiagnosticUpdated?: () => void;
  onSessionsUpdated?: () => void;
}

const OPTION_LABELS: Record<ResponseOptionValue, string> = {
  formal_active: 'Formalizado / Nivel 5',
  informal_active: 'Informal / Nivel 4',
  partial_dev: 'En desarrollo / Nivel 3',
  none_no_record: 'Inexistente / Nivel 1',
  unknown_na: 'No sabe / N/A'
};

export default function MultiAudioBatchQA({
  client,
  onDiagnosticUpdated,
  onSessionsUpdated
}: MultiAudioBatchQAProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedAudioItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Transcript viewer / editor modal + per-session DOCX minute generator
  const [viewingSession, setViewingSession] = useState<StoredSessionSummary | null>(null);
  const [viewingDraftText, setViewingDraftText] = useState('');
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [generatingMinuteId, setGeneratingMinuteId] = useState<string | null>(null);

  // Stored transcribed sessions in DB for this client
  const [storedSessions, setStoredSessions] = useState<StoredSessionSummary[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Cumulative QA state
  const [isRunningQA, setIsRunningQA] = useState(false);
  const [qaProgressText, setQaProgressText] = useState('');
  const [qaSuggestions, setQaSuggestions] = useState<DiagnosticCheckoutSuggestion[]>([]);
  const [qaModelsUsed, setQaModelsUsed] = useState<string[]>([]);
  const [qaFilter, setQaFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [editingQid, setEditingQid] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingQA, setIsSavingQA] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const allQuestions = getAllDiagnosticQuestions();

  const loadStoredSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data } = await (supabase.from('gobernanza_entrevistas') as any)
        .select('id, titulo, duracion_segundos, transcripcion, transcripcion_raw, created_at, estado')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true });

      const valid: StoredSessionSummary[] = (data || [])
        .map((r: any) => ({
          id: r.id,
          titulo: r.titulo || 'Sesión sin título',
          duracion_segundos: r.duracion_segundos || 0,
          transcripcion: (r.transcripcion || r.transcripcion_raw || '').trim(),
          created_at: r.created_at,
          estado: r.estado || 'transcrito_listo'
        }))
        .filter((r: StoredSessionSummary) => r.transcripcion.length > 0);

      setStoredSessions(valid);
      setSelectedSessionIds(new Set(valid.map(v => v.id)));
    } catch (err) {
      console.error('[MultiAudioBatchQA] Error loading sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadStoredSessions();
  }, [client.id]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: QueuedAudioItem[] = Array.from(files)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(file => {
        const meta = parseAudioFileMeta(file.name);
        return {
          localId: crypto.randomUUID(),
          sessionId: crypto.randomUUID(),
          file,
          title: meta.suggestedTitle,
          detectedDate: meta.detectedDate,
          sizeMB: Number((file.size / 1024 / 1024).toFixed(2)),
          status: 'queued',
          progressPct: 0,
          progressText: 'En cola para particionar y transcribir',
          chunksTotal: 0,
          chunksDone: 0,
          durationSeconds: 0,
          transcript: ''
        };
      });

    setQueue(prev => [...prev, ...items]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateItem = (localId: string, patch: Partial<QueuedAudioItem>) => {
    setQueue(prev => prev.map(it => (it.localId === localId ? { ...it, ...patch } : it)));
  };

  const transcribeSingleQueuedItem = async (item: QueuedAudioItem) => {
    updateItem(item.localId, {
      status: 'splitting',
      progressPct: 5,
      progressText: 'Decodificando y segmentando audio en chunks < 8 MB...',
      error: undefined
    });

    try {
      const { chunks, totalDurationSeconds } = await splitAudioFileForTranscription(item.file, prog => {
        updateItem(item.localId, {
          status: 'splitting',
          progressPct: Math.min(35, Math.round(prog.percent * 0.35)),
          progressText: prog.detail
        });
      });

      updateItem(item.localId, {
        status: 'transcribing',
        chunksTotal: chunks.length,
        chunksDone: 0,
        durationSeconds: totalDurationSeconds,
        progressPct: 36,
        progressText: `Transcribiendo segmento 1 de ${chunks.length}...`
      });

      const chunkTexts: string[] = new Array(chunks.length).fill('');
      let completedCount = 0;
      let cursor = 0;
      const CONCURRENCY = 3;

      const worker = async () => {
        while (cursor < chunks.length) {
          const idx = cursor++;
          const ch = chunks[idx];
          const record = await saveLocalChunk(
            client.id,
            item.sessionId,
            ch.chunkIndex,
            ch.blob,
            undefined,
            item.title
          );

          let lastErr = '';
          let chunkOk = false;
          for (let attempt = 1; attempt <= 2; attempt++) {
            const res = await sendChunkToEdgeTranscriber(record, {
              meetingTitle: item.title,
              durationSeconds: ch.durationSeconds
            });

            if (res.success) {
              chunkTexts[idx] = (res.transcription || '').trim();
              chunkOk = true;
              break;
            } else {
              lastErr = res.error || 'Error de transcripción';
              if (attempt === 1) {
                await new Promise(r => setTimeout(r, 1200));
              }
            }
          }

          if (!chunkOk) {
            throw new Error(`Fallo en segmento ${idx + 1}/${chunks.length}: ${lastErr}`);
          }

          completedCount++;
          const pct = 36 + Math.round((completedCount / chunks.length) * 62);
          updateItem(item.localId, {
            chunksDone: completedCount,
            progressPct: pct,
            progressText: `Transcrito segmento ${completedCount} de ${chunks.length} (${Math.round(totalDurationSeconds / 60)} min · 3× paralelo)`
          });
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker()));

      const fullTranscript = chunkTexts.filter(Boolean).join('\n').trim();
      if (!fullTranscript) {
        throw new Error('La transcripción devolvió texto vacío. Verificá que el audio tenga voz audible y que OPENAI_API_KEY esté activa.');
      }

      // Persist finalized ready session in gobernanza_entrevistas
      await (supabase.from('gobernanza_entrevistas') as any).upsert(
        {
          id: item.sessionId,
          client_id: client.id,
          meeting_type: 'diagnostico',
          titulo: item.title,
          duracion_segundos: totalDurationSeconds,
          transcripcion: fullTranscript,
          transcripcion_raw: fullTranscript,
          estado: 'completado',
          live_status: 'completed'
        },
        { onConflict: 'id' }
      );

      updateItem(item.localId, {
        status: 'ready',
        progressPct: 100,
        transcript: fullTranscript,
        progressText: `Listo · ${fullTranscript.length.toLocaleString('es-AR')} caracteres (${chunks.length} segmentos)`
      });
    } catch (err: any) {
      updateItem(item.localId, {
        status: 'error',
        progressText: 'Error en transcripción real (sin datos inventados)',
        error: err?.message || 'Error desconocido al transcribir'
      });
    }
  };

  const processPendingQueue = async () => {
    const targets = queue.filter(q => q.status === 'queued' || q.status === 'error');
    if (targets.length === 0) return;

    setIsProcessingQueue(true);
    try {
      for (const item of targets) {
        await transcribeSingleQueuedItem(item);
      }
      await loadStoredSessions();
      onSessionsUpdated?.();
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleSaveEditedTranscript = async () => {
    if (!viewingSession) return;
    setSavingTranscript(true);
    try {
      await (supabase.from('gobernanza_entrevistas') as any)
        .update({
          transcripcion: viewingDraftText,
          transcripcion_raw: viewingDraftText
        })
        .eq('id', viewingSession.id);

      setStoredSessions(prev =>
        prev.map(s => (s.id === viewingSession.id ? { ...s, transcripcion: viewingDraftText } : s))
      );
      setViewingSession(null);
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleGenerateSessionMinuteDocx = async (session: StoredSessionSummary) => {
    setGeneratingMinuteId(session.id);
    try {
      const snippet = session.transcripcion.slice(0, 28000);
      const analysis = await analyzeMeetingForCheckout({
        sessionId: session.id,
        clientId: client.id,
        clientName: client.name,
        meetingTitle: session.titulo,
        durationSeconds: session.duracion_segundos || 1800,
        transcript: snippet
      });
      const projectCode = localStorage.getItem(`gs_project_code_${client.id}`) || '26-028';
      await exportOfficialMinuteDocx({
        projectCode,
        clientName: client.name,
        revision: '0',
        meetingTitle: analysis.minute.meetingTitle || session.titulo,
        meetingDate: analysis.minute.meetingDate || new Date(session.created_at).toLocaleDateString('es-AR'),
        motivo: analysis.minute.executiveSummary,
        attendeesGS: analysis.minute.attendeesGS || ['Consultor Líder GS'],
        attendeesClient: analysis.minute.attendeesClient || [`Dirección ${client.name}`],
        topicsDiscussed: analysis.minute.topicsDiscussed || [],
        commitments: (analysis.minute.commitments || []).map(c => ({
          responsible: c.responsible,
          task: c.task,
          deadline: c.deadline
        })),
        reflection: analysis.minute.methodologicalReflection
      });
    } catch (err: any) {
      alert(`Error generando Minuta DOCX: ${err?.message || 'desconocido'}`);
    } finally {
      setGeneratingMinuteId(null);
    }
  };

  const handleRunCumulativeQA = async () => {
    const selected = storedSessions.filter(s => selectedSessionIds.has(s.id));
    if (selected.length === 0) return;

    setIsRunningQA(true);
    setSaveBanner(null);
    setQaProgressText(`Iniciando análisis Q/A acumulativo sobre ${selected.length} sesiones...`);

    try {
      const result = await analyzeMultiSessionForQA({
        clientId: client.id,
        clientName: client.name,
        sessions: selected.map(s => ({
          id: s.id,
          title: s.titulo,
          durationSeconds: s.duracion_segundos,
          transcript: s.transcripcion
        })),
        onProgress: (cur, tot, title) => {
          setQaProgressText(`Analizando sesión ${cur} de ${tot}: ${title}...`);
        }
      });

      setQaSuggestions(result.suggestions);
      setQaModelsUsed(result.modelsUsed);
      setQaProgressText(
        `Q/A completado: ${result.suggestions.length} de ${allQuestions.length} preguntas respondidas con evidencia real de ${result.totalSessionsAnalyzed} sesiones.`
      );
    } catch (err: any) {
      setQaProgressText(`Error ejecutando Q/A: ${err?.message || 'desconocido'}`);
    } finally {
      setIsRunningQA(false);
    }
  };

  const setSuggestionStatus = (qid: number, status: 'accepted' | 'rejected' | 'pending') => {
    setQaSuggestions(prev => prev.map(s => (s.questionId === qid ? { ...s, status } : s)));
  };

  const setSuggestionOption = (qid: number, opt: ResponseOptionValue) => {
    setQaSuggestions(prev =>
      prev.map(s => (s.questionId === qid ? { ...s, editedOption: opt, status: 'modified' } : s))
    );
  };

  const handleAcceptAllHigh = () => {
    setQaSuggestions(prev =>
      prev.map(s => (s.status === 'pending' && s.confidence === 'alta' ? { ...s, status: 'accepted' } : s))
    );
  };

  const handleAcceptAllPending = () => {
    setQaSuggestions(prev =>
      prev.map(s => (s.status === 'pending' ? { ...s, status: 'accepted' } : s))
    );
  };

  const handleSaveApprovedQA = async () => {
    const approved = qaSuggestions.filter(s => s.status === 'accepted' || s.status === 'modified');
    if (approved.length === 0) return;

    setIsSavingQA(true);
    try {
      const selected = storedSessions.filter(s => selectedSessionIds.has(s.id));
      const consolidatedTranscript = selected
        .map(s => `=== ${s.titulo} ===\n${s.transcripcion}`)
        .join('\n\n');

      await persistAutoAnsweredQuestions({
        clientId: client.id,
        sessionId: selected[0]?.id || crypto.randomUUID(),
        meetingTitle: `Consolidado Q/A (${selected.length} sesiones) — ${client.name}`,
        transcript: consolidatedTranscript.slice(0, 120000),
        durationSeconds: selected.reduce((acc, s) => acc + (s.duracion_segundos || 0), 0),
        analysis: {
          suggestions: approved,
          minute: {
            meetingTitle: `Consolidación Diagnóstico 360° (${selected.length} audios)`,
            meetingDate: new Date().toLocaleDateString('es-AR'),
            attendeesGS: ['Consultor Líder GS'],
            attendeesClient: [`Dirección ${client.name}`],
            executiveSummary: `Consolidación Q/A validada con ${approved.length} respuestas sobre ${allQuestions.length} preguntas del catálogo Rev10.`,
            topicsDiscussed: [],
            agreements: [`Se validaron ${approved.length} respuestas desde ${selected.length} audios reales.`],
            commitments: [],
            nextSteps: ['Revisar IME / IRE y Pentágono actualizado en el expediente 360°.'],
            methodologicalReflection: 'Validación QA humana sobre evidencias textuales trazables.'
          }
        }
      });

      setSaveBanner(`Se impactaron ${approved.length} respuestas validadas en el Diagnóstico 360° de ${client.name} (IME/IRE actualizados sin sobrescribir respuestas ya validadas).`);
      onDiagnosticUpdated?.();
    } finally {
      setIsSavingQA(false);
    }
  };

  const filteredSuggestions = qaSuggestions.filter(s => {
    const matchStatus =
      qaFilter === 'all' ||
      (qaFilter === 'accepted' ? s.status === 'accepted' || s.status === 'modified' : s.status === qaFilter);
    const matchArea = areaFilter === 'all' || s.areaId === areaFilter;
    return matchStatus && matchArea;
  });

  const acceptedCount = qaSuggestions.filter(s => s.status === 'accepted' || s.status === 'modified').length;
  const pendingCount = qaSuggestions.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* 1. CARGA Y TRANSCRIPCIÓN POR LOTES */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#17324D] flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#0D9488]" />
              Ingesta Multi-Audio con Particionado Automático (&gt;25 MB)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Subí uno o varios archivos <code className="font-mono text-slate-700">.m4a, .mp3, .wav, .webm</code> (incluso de 70–100+ MB). El navegador los convierte a 16 kHz mono en segmentos &lt;8 MB y los transcribe en vivo sin datos inventados.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
              onChange={e => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingQueue}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-[#17324D] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileAudio className="w-4 h-4 text-[#0D9488]" />
              Seleccionar audios
            </button>
            <button
              type="button"
              onClick={processPendingQueue}
              disabled={isProcessingQueue || queue.filter(q => q.status === 'queued' || q.status === 'error').length === 0}
              className="px-4 py-2 rounded-lg bg-[#17324D] hover:bg-[#0F2438] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessingQueue ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Transcribir cola ({queue.filter(q => q.status === 'queued' || q.status === 'error').length})
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (!isProcessingQueue) handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => !isProcessingQueue && fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
            isDraggingOver
              ? 'border-[#0D9488] bg-teal-50/50'
              : 'border-slate-200 bg-slate-50/60 hover:border-[#0D9488]/60 hover:bg-slate-50'
          }`}
        >
          <UploadCloud className="w-6 h-6 text-[#0D9488] mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-[#17324D]">
            Arrastrá y soltá uno o varios audios aquí, o hacé clic para explorar
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Soporta <span className="font-mono">.m4a, .mp3, .wav, .webm, .ogg</span> hasta 200 MB · Particionado sin pérdida y transcripción 3× en paralelo
          </p>
        </div>

        {queue.length > 0 && (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {queue.map(item => (
              <div key={item.localId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 truncate">{item.title}</span>
                    <span className="text-[11px] font-mono text-slate-500">({item.sizeMB} MB)</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.status === 'ready'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status === 'error'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.status === 'queued'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-teal-50 text-[#0D9488] border border-teal-200'
                      }`}
                    >
                      {item.status === 'ready'
                        ? 'Transcrito y listo'
                        : item.status === 'error'
                          ? 'Error'
                          : item.status === 'queued'
                            ? 'En cola'
                            : item.status === 'splitting'
                              ? 'Segmentando'
                              : `Transcribiendo ${item.chunksDone}/${item.chunksTotal}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.progressText}</p>
                  {item.error && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {item.error}
                    </p>
                  )}
                  {(item.status === 'splitting' || item.status === 'transcribing') && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#0D9488] transition-all duration-300"
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'error' && !isProcessingQueue && (
                    <button
                      type="button"
                      onClick={() => transcribeSingleQueuedItem(item)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reintentar
                    </button>
                  )}
                  {!isProcessingQueue && (
                    <button
                      type="button"
                      onClick={() => setQueue(prev => prev.filter(q => q.localId !== item.localId))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Quitar de la cola"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. AUDIOS TRANSCRITOS LISTOS + MOTOR Q/A ACUMULATIVO */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#17324D] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0D9488]" />
              Audios Transcritos Listos de {client.name} ({storedSessions.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Seleccioná las sesiones que querés consolidar para ejecutar el motor Q/A sobre las {allQuestions.length} preguntas ({DIAGNOSTIC_AREAS.length} áreas Rev10).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadStoredSessions}
              disabled={loadingSessions}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
            >
              Actualizar lista
            </button>
            <button
              type="button"
              onClick={handleRunCumulativeQA}
              disabled={isRunningQA || selectedSessionIds.size === 0}
              className="px-4 py-2 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isRunningQA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ejecutar Q/A Acumulativo ({selectedSessionIds.size} sesiones)
            </button>
          </div>
        </div>

        {storedSessions.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
            Todavía no hay audios transcritos guardados para {client.name}. Subí los archivos arriba para dejarlos listos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {storedSessions.map(s => {
              const checked = selectedSessionIds.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    checked ? 'border-[#0D9488] bg-teal-50/30' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedSessionIds(prev => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      });
                    }}
                    className="mt-0.5 accent-[#0D9488]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{s.titulo}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {Math.max(1, Math.round((s.duracion_segundos || 0) / 60))} min · {s.transcripcion.length.toLocaleString('es-AR')} chars
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setViewingSession(s);
                          setViewingDraftText(s.transcripcion);
                        }}
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-[#0D9488]" /> Ver / Editar texto
                      </button>
                      <button
                        type="button"
                        disabled={generatingMinuteId === s.id}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleGenerateSessionMinuteDocx(s);
                        }}
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold text-[#17324D] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {generatingMinuteId === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <FileText className="w-3 h-3 text-[#17324D]" />
                        )}
                        Minuta (.DOCX)
                      </button>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                </label>
              );
            })}
          </div>
        )}

        {qaProgressText && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-2">
            <span>{qaProgressText}</span>
            {qaModelsUsed.length > 0 && (
              <span className="font-mono text-[10px] text-slate-500 shrink-0">Motor: {qaModelsUsed.join(', ')}</span>
            )}
          </div>
        )}
      </div>

      {/* 3. PANEL DE REVISIÓN QA HUMANA (HUMAN-IN-THE-LOOP) */}
      {qaSuggestions.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#17324D]">
                Revisión QA de Respuestas ({qaSuggestions.length} / {allQuestions.length} detectadas)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Validá, editá o rechazá cada respuesta antes de impactar el Diagnóstico 360°. Las respuestas ya validadas por el consultor nunca se sobrescriben.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAcceptAllHigh}
                disabled={pendingCount === 0}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Aprobar Alta Confianza
              </button>
              <button
                type="button"
                onClick={handleAcceptAllPending}
                disabled={pendingCount === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Aprobar todas ({pendingCount})
              </button>
              <button
                type="button"
                onClick={handleSaveApprovedQA}
                disabled={isSavingQA || acceptedCount === 0}
                className="px-4 py-1.5 rounded-lg bg-[#17324D] hover:bg-[#0F2438] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingQA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Impactar {acceptedCount} en Diagnóstico 360°
              </button>
            </div>
          </div>

          {saveBanner && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {saveBanner}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'pending', 'accepted', 'rejected'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setQaFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    qaFilter === st ? 'bg-[#17324D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all'
                    ? `Todas (${qaSuggestions.length})`
                    : st === 'pending'
                      ? `Pendientes (${pendingCount})`
                      : st === 'accepted'
                        ? `Aprobadas (${acceptedCount})`
                        : `Rechazadas (${qaSuggestions.filter(s => s.status === 'rejected').length})`}
                </button>
              ))}
            </div>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="all">Todas las áreas (11)</option>
              {DIAGNOSTIC_AREAS.map(a => (
                <option key={a.id} value={a.id}>
                  Área {a.number}: {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Suggestions list */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {filteredSuggestions.map(sug => {
              const isEditing = editingQid === sug.questionId;
              const activeOpt = sug.editedOption || sug.suggestedOption;
              const activeAns = sug.editedAnswer || sug.suggestedAnswer;
              return (
                <div
                  key={sug.questionId}
                  className={`p-4 rounded-lg border text-xs space-y-2.5 ${
                    sug.status === 'accepted' || sug.status === 'modified'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : sug.status === 'rejected'
                        ? 'border-slate-200 bg-slate-50 opacity-60'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#0D9488] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                          {sug.questionCode}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">{sug.areaName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sug.confidence === 'alta'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          Confianza {sug.confidence}
                        </span>
                        {sug.sourceSessionTitle && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                            Fuente: {sug.sourceSessionTitle}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-slate-900 text-[13px]">{sug.questionTitle}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={activeOpt}
                        onChange={e => setSuggestionOption(sug.questionId, e.target.value as ResponseOptionValue)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {(Object.keys(OPTION_LABELS) as ResponseOptionValue[]).map(k => (
                          <option key={k} value={k}>
                            {OPTION_LABELS[k]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQid(isEditing ? null : sug.questionId);
                          setEditingText(activeAns);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        title="Editar respuesta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestionStatus(sug.questionId, 'accepted')}
                        className={`p-1.5 rounded-lg border cursor-pointer ${
                          sug.status === 'accepted' || sug.status === 'modified'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title="Aprobar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestionStatus(sug.questionId, 'rejected')}
                        className={`p-1.5 rounded-lg border cursor-pointer ${
                          sug.status === 'rejected'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'border-slate-200 text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Rechazar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setQaSuggestions(prev =>
                            prev.map(s =>
                              s.questionId === sug.questionId
                                ? { ...s, editedAnswer: editingText, status: 'modified' }
                                : s
                            )
                          );
                          setEditingQid(null);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#17324D] text-white text-xs font-semibold cursor-pointer"
                      >
                        Guardar edición
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-700 leading-relaxed">{activeAns}</p>
                  )}

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
                    <Quote className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
                    <div>
                      <span className="italic">"{sug.detectedQuote}"</span>
                      {sug.additionalEvidences && sug.additionalEvidences.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-1">
                          <span className="font-semibold text-slate-700 block">
                            Evidencias complementarias ({sug.additionalEvidences.length} sesiones):
                          </span>
                          {sug.additionalEvidences.map((ev, i) => (
                            <p key={i} className="text-slate-500">
                              <strong className="text-slate-700">{ev.sessionTitle}:</strong> "{ev.quote}"
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL VER / EDITAR TRANSCRIPCIÓN */}
      {viewingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div>
                <h4 className="font-display text-sm font-bold text-[#17324D]">{viewingSession.titulo}</h4>
                <p className="text-[11px] text-slate-500">
                  {Math.max(1, Math.round((viewingSession.duracion_segundos || 0) / 60))} min · {viewingDraftText.length.toLocaleString('es-AR')} caracteres
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSession(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <textarea
                rows={18}
                value={viewingDraftText}
                onChange={e => setViewingDraftText(e.target.value)}
                className="w-full h-full rounded-lg border border-slate-200 p-3 text-xs font-mono text-slate-800 leading-relaxed focus:border-[#0D9488] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => setViewingSession(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditedTranscript}
                disabled={savingTranscript}
                className="px-4 py-1.5 rounded-lg bg-[#17324D] hover:bg-[#0F2438] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingTranscript ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar cambios en BD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
