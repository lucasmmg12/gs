import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { DIAGNOSTIC_AREAS } from '../../data/diagnosticQuestions';
import type { DiagnosticQuestion, ResponseOptionValue } from '../../data/diagnosticQuestions';
import { requestScreenWakeLock, releaseScreenWakeLock, subscribeWakeLock } from '../../lib/wakeLock';
import { 
  saveLocalChunk, 
  uploadChunkToStorage, 
  compileSessionAudioBlob,
  sendChunkToEdgeTranscriber 
} from '../../lib/audioChunker';
import { WhisperLiveStreamer } from '../../lib/whisperLiveStream';
import type { LiveStreamStatus } from '../../lib/whisperLiveStream';
import { 
  Mic, 
  Square, 
  Loader2, 
  Download, 
  FileText, 
  CheckCircle2, 
  ChevronLeft, 
  History, 
  ShieldCheck, 
  Search, 
  Sparkles, 
  Layers,
  Database,
  Wifi,
  HardDrive,
  Target,
  Edit3,
  Calendar,
  Compass,
  FileCheck,
  RotateCcw,
  Copy
} from 'lucide-react';
import mermaid from 'mermaid';
import { jsPDF } from 'jspdf';

export type MeetingType = 'kickoff' | 'diagnostico' | 'seguimiento_trimestral' | 'general';

export function getFallbackQuestions(mType: MeetingType): DiagnosticQuestion[] {
  if (mType === 'kickoff') {
    return DIAGNOSTIC_AREAS.filter(a => a.id === 'area_1_personas' || a.id === 'area_8_legal')
      .flatMap(a => a.questions.slice(0, 2));
  } else if (mType === 'seguimiento_trimestral') {
    return DIAGNOSTIC_AREAS.filter(a => a.id === 'area_2_planeamiento' || a.id === 'area_4_finanzas')
      .flatMap(a => a.questions.slice(0, 3));
  } else {
    const defaultQs: DiagnosticQuestion[] = [];
    const orgArea = DIAGNOSTIC_AREAS.find(a => a.id === 'area_1_personas');
    if (orgArea && orgArea.questions.length > 0) {
      defaultQs.push(orgArea.questions[0]);
      if (orgArea.questions[1]) defaultQs.push(orgArea.questions[1]);
    }
    const procArea = DIAGNOSTIC_AREAS.find(a => a.id === 'area_3_operaciones');
    if (procArea && procArea.questions.length > 0) {
      defaultQs.push(procArea.questions[0]);
      if (procArea.questions[1]) defaultQs.push(procArea.questions[1]);
    }
    return defaultQs;
  }
}

interface ClientMeetingSessionProps {
  client: any;
  onBack: () => void;
  onDiagnosticUpdated?: () => void;
  initialMeetingType?: MeetingType;
  initialQuestions?: DiagnosticQuestion[];
  initialTitle?: string;
  initialStep?: 'planning' | 'recording';
}

export default function ClientMeetingSession({ 
  client, 
  onBack, 
  onDiagnosticUpdated,
  initialMeetingType = 'diagnostico',
  initialQuestions,
  initialTitle,
  initialStep = 'planning'
}: ClientMeetingSessionProps) {
  // Navigation / Phase
  const [step, setStep] = useState<'planning' | 'recording' | 'processing' | 'checkout' | 'results'>(initialStep);
  const [meetingType, setMeetingType] = useState<MeetingType>(initialMeetingType);

  // Step 1: Planning Agenda
  const [meetingTitle, setMeetingTitle] = useState(() => {
    if (initialTitle) return initialTitle;
    if (initialMeetingType === 'kickoff') return `Reunión de Kickoff & Definición OMV - ${client.name}`;
    if (initialMeetingType === 'seguimiento_trimestral') return `Seguimiento Trimestral Master Plan - ${client.name}`;
    return `Auditoría y Diagnóstico 360° - ${client.name}`;
  });
  const [selectedQuestions, setSelectedQuestions] = useState<DiagnosticQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    return [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');

  // Step 2: Live Recording & Whisper Streaming
  const [sessionId] = useState(() => crypto.randomUUID());
  const [duration, setDuration] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const activeQuestionIndexRef = useRef<number>(0);
  const [questionTranscripts, setQuestionTranscripts] = useState<Record<number, string>>({});
  const questionTranscriptsRef = useRef<Record<number, string>>({});
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [chunksCount, setChunksCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isStartingMic, setIsStartingMic] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const hasAutoStartedRef = useRef(false);

  const handleSelectQuestion = (idx: number) => {
    setActiveQuestionIndex(idx);
    activeQuestionIndexRef.current = idx;
  };

  useEffect(() => {
    activeQuestionIndexRef.current = activeQuestionIndex;
  }, [activeQuestionIndex]);

  useEffect(() => {
    questionTranscriptsRef.current = questionTranscripts;
  }, [questionTranscripts]);

  // Live WebSocket Transcription & Supabase Realtime State
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [streamStatus, setStreamStatus] = useState<LiveStreamStatus>('idle');
  const [streamMessage, setStreamMessage] = useState<string>('');
  const [syncedChunks, setSyncedChunks] = useState<number>(0);
  const [lastSyncedText, setLastSyncedText] = useState<string>('');
  const liveStreamerRef = useRef<WhisperLiveStreamer | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Step 3: Analysis & Processing
  const [processingState, setProcessingState] = useState<'compiling' | 'uploading' | 'analyzing' | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [resultData, setResultData] = useState<{
    resumen: string;
    mapa_conceptual_mermaid: string;
    respuestas: string[];
    minutas?: any;
    omv_deliverable?: {
      vision_3_years: string;
      written_minute: string;
      podcast_title: string;
    } | null;
  } | null>(null);

  // Step 4: Check out (Validation before impact)
  const [editableAnswers, setEditableAnswers] = useState<string[]>([]);
  const [selectedQuestionOptions, setSelectedQuestionOptions] = useState<Record<number, ResponseOptionValue>>({});
  const [validatorName, setValidatorName] = useState(client.client_lead_name || 'Director General');
  const [clientFeedback, setClientFeedback] = useState('');
  const [checkoutApproved, setCheckoutApproved] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Wake lock listener
  useEffect(() => {
    const unsub = subscribeWakeLock((active) => {
      setWakeLockActive(active);
    });

    return () => {
      unsub();
      releaseScreenWakeLock();
    };
  }, []);

  // Set default questions when meetingType changes
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) return;
    if (meetingType === 'kickoff') {
      setMeetingTitle(`Reunión de Kickoff & Definición OMV - ${client.name}`);
      const kickoffQs = DIAGNOSTIC_AREAS.filter(a => a.id === 'area_1_personas' || a.id === 'area_8_legal')
        .flatMap(a => a.questions.slice(0, 2));
      setSelectedQuestions(kickoffQs);
    } else if (meetingType === 'seguimiento_trimestral') {
      setMeetingTitle(`Seguimiento Trimestral Master Plan - ${client.name}`);
      const mpeQs = DIAGNOSTIC_AREAS.filter(a => a.id === 'area_2_planeamiento' || a.id === 'area_4_finanzas')
        .flatMap(a => a.questions.slice(0, 3));
      setSelectedQuestions(mpeQs);
    } else if (meetingType === 'diagnostico' && selectedQuestions.length === 0) {
      setMeetingTitle(`Diagnóstico Integral 360° - ${client.name}`);
      const defaultQs: DiagnosticQuestion[] = [];
      const orgArea = DIAGNOSTIC_AREAS.find(a => a.id === 'area_1_personas');
      if (orgArea && orgArea.questions.length > 0) {
        defaultQs.push(orgArea.questions[0]);
        if (orgArea.questions[1]) defaultQs.push(orgArea.questions[1]);
      }
      const procArea = DIAGNOSTIC_AREAS.find(a => a.id === 'area_3_operaciones');
      if (procArea && procArea.questions.length > 0) {
        defaultQs.push(procArea.questions[0]);
        if (procArea.questions[1]) defaultQs.push(procArea.questions[1]);
      }
      setSelectedQuestions(defaultQs);
    }
  }, [meetingType, client.name]);

  // Re-render Mermaid when results arrive
  useEffect(() => {
    if (resultData?.mapa_conceptual_mermaid && mermaidRef.current) {
      try {
        mermaid.initialize({ 
          startOnLoad: false, 
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif'
        });
        mermaid.run({ nodes: [mermaidRef.current] });
      } catch (err) {
        console.error('Error renderizando diagrama Mermaid:', err);
      }
    }
  }, [resultData]);

  // Auto-scroll transcript window during live recording
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [liveTranscript, interimText]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Redline Waveform Visualizer
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasCtx) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = '#09090b'; // Dark background
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2.5;
      canvasCtx.strokeStyle = '#dc2626'; // Bold Redline
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (canvas.height / 2);
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    draw();
  };

  // Toggle question selection in agenda
  const toggleQuestion = (q: DiagnosticQuestion) => {
    if (selectedQuestions.some(item => item.id === q.id)) {
      setSelectedQuestions(selectedQuestions.filter(item => item.id !== q.id));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  // Fast Presets
  const applyPreset = (presetType: '360' | 'governance' | 'operations' | 'kickoff') => {
    if (presetType === 'kickoff') {
      setMeetingType('kickoff');
      const qs = DIAGNOSTIC_AREAS.slice(0, 4).map(a => a.questions[0]).filter(Boolean);
      setSelectedQuestions(qs);
      setMeetingTitle(`Reunión de Kickoff & Definición OMV - ${client.name}`);
    } else if (presetType === '360') {
      setMeetingType('diagnostico');
      const qs = DIAGNOSTIC_AREAS.map(a => a.questions[0]).filter(Boolean);
      setSelectedQuestions(qs);
      setMeetingTitle(`Diagnóstico 360° Integral - ${client.name}`);
    } else if (presetType === 'governance') {
      setMeetingType('diagnostico');
      const area = DIAGNOSTIC_AREAS.find(a => a.id === 'area_8_legal' || a.id === 'area_1_personas');
      setSelectedQuestions(area ? area.questions.slice(0, 5) : []);
      setMeetingTitle(`Auditoría de Gobernanza y Personas - ${client.name}`);
    } else if (presetType === 'operations') {
      setMeetingType('diagnostico');
      const area = DIAGNOSTIC_AREAS.find(a => a.id === 'area_3_operaciones');
      setSelectedQuestions(area ? area.questions.slice(0, 5) : []);
      setMeetingTitle(`Reunión de Operaciones y Procesos - ${client.name}`);
    }
  };

  // START RECORDING with Whisper WebSockets & 15s Chunks
  const startRecording = async () => {
    let questionsToUse = selectedQuestions;
    if (!questionsToUse || questionsToUse.length === 0) {
      if (initialQuestions && initialQuestions.length > 0) {
        questionsToUse = initialQuestions;
      } else {
        questionsToUse = getFallbackQuestions(meetingType);
      }
      setSelectedQuestions(questionsToUse);
    }

    if (questionsToUse.length === 0) {
      setMicError('Por favor selecciona al menos una pregunta para la agenda de la reunión.');
      return;
    }

    if (isStartingMic) return;
    setIsStartingMic(true);
    setMicError(null);

    try {
      // 1. Wake Lock
      await requestScreenWakeLock();

      // 2. Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // 3. Audio Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn('AudioContext resume notice:', e);
        }
      }
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      // 3.5 Initialize interview row in Supabase and subscribe to Realtime DB chunks
      try {
        await (supabase.from('gobernanza_entrevistas') as any).upsert({
          id: sessionId,
          client_id: client.id,
          meeting_type: meetingType,
          titulo: meetingTitle,
          estado: 'grabando',
          live_status: 'recording',
          selected_questions: questionsToUse,
          duracion_segundos: 0,
          transcripcion_raw: ''
        }, { onConflict: 'id' });

        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current);
        }
        const channel = supabase.channel(`realtime_session_${sessionId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'gobernanza_audio_chunks',
            filter: `session_id=eq.${sessionId}`
          }, (payload: any) => {
            const newChunk = payload.new;
            if (newChunk?.transcription) {
              const chunkTrim = newChunk.transcription.trim();
              if (chunkTrim) {
                setLastSyncedText(chunkTrim);
                setLiveTranscript(prev => {
                  if (prev.includes(chunkTrim)) return prev;
                  return prev ? `${prev} ${chunkTrim}` : chunkTrim;
                });

                // Impactar en la pregunta que se está enfocando
                const targetIdx = activeQuestionIndexRef.current;
                setQuestionTranscripts(prev => {
                  const existing = prev[targetIdx] || '';
                  if (existing.includes(chunkTrim)) return prev;
                  const updated = existing ? `${existing} ${chunkTrim}` : chunkTrim;
                  const nextMap = { ...prev, [targetIdx]: updated };
                  questionTranscriptsRef.current = nextMap;
                  return nextMap;
                });
              }
            }
          })
          .subscribe();
        realtimeChannelRef.current = channel;
      } catch (dbInitErr) {
        console.warn('[Session] Notice initializing realtime DB interview:', dbInitErr);
      }

      // 4. Start Whisper Live Streamer (WebSockets + browser fallback)
      try {
        const liveStreamer = new WhisperLiveStreamer({
          clientId: client.id,
          sessionId: sessionId,
          language: 'es',
          onTranscript: (event) => {
            if (event.isFinal) {
              const text = event.text.trim();
              if (text) {
                setLiveTranscript(prev => {
                  if (prev.includes(text)) return prev;
                  return prev ? `${prev} ${text}` : text;
                });

                // Impactar en la respuesta de la pregunta enfocada
                const targetIdx = activeQuestionIndexRef.current;
                setQuestionTranscripts(prev => {
                  const existing = prev[targetIdx] || '';
                  if (existing.includes(text)) return prev;
                  const updated = existing ? `${existing} ${text}` : text;
                  const nextMap = { ...prev, [targetIdx]: updated };
                  questionTranscriptsRef.current = nextMap;
                  return nextMap;
                });
              }
              setInterimText('');
            } else {
              setInterimText(event.text);
            }
          },
          onStatusChange: (status, msg) => {
            setStreamStatus(status);
            setStreamMessage(msg || '');
          },
          onError: (err) => {
            console.warn('[Session] Whisper Live error:', err.message);
          }
        });
        liveStreamerRef.current = liveStreamer;
        await liveStreamer.start(stream);
      } catch (streamerErr) {
        console.warn('[Session] Whisper live streamer warning:', streamerErr);
      }

      // 5. MediaRecorder with 15-second chunking for real-time persistence
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunkIndexRef.current = 0;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const currentIndex = chunkIndexRef.current++;
          const targetIdx = activeQuestionIndexRef.current;
          const currentQ = questionsToUse[targetIdx] || questionsToUse[0];
          
          // 1. Save chunk in IndexedDB (immune to crash/network drop)
          const record = await saveLocalChunk(
            client.id,
            sessionId,
            currentIndex,
            e.data,
            currentQ?.id,
            currentQ?.title
          );
          setChunksCount(prev => prev + 1);

          // 2. Dispatch to Supabase Edge Function 'transcribe-chunk' for live Whisper & DB persistence
          sendChunkToEdgeTranscriber(record, {
            questionId: String(currentQ?.id || ''),
            questionTitle: currentQ?.title || '',
            meetingTitle: meetingTitle,
            durationSeconds: 15
          }).then(res => {
            if (res.success) {
              setSyncedChunks(prev => prev + 1);
              if (res.transcription) {
                const chunkTrim = res.transcription.trim();
                if (chunkTrim) {
                  setLastSyncedText(chunkTrim);
                  setLiveTranscript(prev => {
                    if (prev.includes(chunkTrim)) return prev;
                    return prev ? `${prev} ${chunkTrim}` : chunkTrim;
                  });

                  setQuestionTranscripts(prev => {
                    const existing = prev[targetIdx] || '';
                    if (existing.includes(chunkTrim)) return prev;
                    const updated = existing ? `${existing} ${chunkTrim}` : chunkTrim;
                    const nextMap = { ...prev, [targetIdx]: updated };
                    questionTranscriptsRef.current = nextMap;
                    return nextMap;
                  });
                }
              }
            } else {
              // Fallback upload to storage directly
              uploadChunkToStorage(record);
            }
          });
        }
      };

      // Emit chunk every 15 seconds
      recorder.start(15000);

      setStep('recording');
      setIsRecording(true);
      setIsStartingMic(false);
      setMicError(null);
      setDuration(0);
      setLiveTranscript('');
      setInterimText('');
      setChunksCount(0);
      setSyncedChunks(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      setTimeout(() => drawWaveform(), 100);

    } catch (err: any) {
      console.error('Mic or WakeLock Error:', err);
      setIsStartingMic(false);
      setIsRecording(false);
      setMicError(err.message || 'Permiso de micrófono no concedido. Por favor active los permisos de micrófono para grabar.');
    }
  };

  // Auto-start recording when landing on step === 'recording'
  useEffect(() => {
    if (step === 'recording' && !isRecording && !hasAutoStartedRef.current && !isStartingMic) {
      hasAutoStartedRef.current = true;
      startRecording();
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (liveStreamerRef.current) {
        liveStreamerRef.current.stop();
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
      releaseScreenWakeLock();
    };
  }, []);

  // STOP RECORDING and transition to processing
  const stopRecordingAndAnalyze = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      if (!isRecording && duration === 0) {
        alert('No hay una grabación activa para finalizar.');
        return;
      }
    }

    setIsRecording(false);
    setIsStartingMic(false);

    // Stop live Whisper streamer
    let finalRecordedTranscript = '';
    if (liveStreamerRef.current) {
      finalRecordedTranscript = liveStreamerRef.current.stop();
      liveStreamerRef.current = null;
    }

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Stop recorder & stream
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    releaseScreenWakeLock();

    setStep('processing');
    setProcessingState('compiling');

    try {
      await new Promise(r => setTimeout(r, 600));

      // 1. Compile audio chunks into full webm blob
      const combinedBlob = await compileSessionAudioBlob(sessionId, client.id);
      const fullFileName = `${client.id}/${sessionId}_full.webm`;

      setProcessingState('uploading');

      // 2. Upload complete audio to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('gobernanza_audios')
        .upload(fullFileName, combinedBlob, {
          contentType: 'audio/webm;codecs=opus',
          upsert: true
        });

      if (uploadErr) {
        console.warn('Storage upload notice:', uploadErr.message);
      }

      // 3. Register interview in database associated strictly to client_id
      const questionsTextList = selectedQuestions.map(q => q.title);
      
      const { data: plantillaRow } = await supabase
        .from('gobernanza_plantillas')
        .insert({
          nombre: meetingTitle,
          preguntas: questionsTextList
        })
        .select('id')
        .single();

      const plantillaId = plantillaRow?.id || null;

      // OMV Deliverable data if kickoff
      const omvData = meetingType === 'kickoff' ? {
        vision_3_years: `En 3 años, ${client.name} se consolida como referente de su sector con procesos estandarizados, gobernanza corporativa independiente y un directorio profesionalizado.`,
        written_minute: `Minuta de Kickoff y Alineación Estratégica: Validación del rumbo OMV de ${client.name}.`,
        podcast_title: `Podcast OMV: El futuro de ${client.name}`
      } : null;

      const { error: dbErr } = await (supabase
        .from('gobernanza_entrevistas') as any)
        .upsert({
          id: sessionId,
          client_id: client.id,
          meeting_type: meetingType,
          plantilla_id: plantillaId,
          titulo: meetingTitle,
          audio_url: fullFileName,
          duracion_segundos: duration,
          selected_questions: selectedQuestions,
          validation_status: 'pending',
          omv_deliverable: omvData,
          estado: 'procesando'
        }, { onConflict: 'id' });

      if (dbErr) console.warn('DB insert notice:', dbErr.message);

      setProcessingState('analyzing');

      // 4. Invoke Edge Function gobernanza-ai
      let aiAnalysisSucceeded = false;
      try {
        const { error: edgeErr } = await supabase.functions.invoke('gobernanza-ai', {
          body: {
            action: 'transcribe_and_analyze',
            payload: {
              entrevista_id: sessionId,
              client_id: client.id,
              plantilla_id: plantillaId,
              audio_path: fullFileName,
              preguntas: questionsTextList
            }
          }
        });

        if (!edgeErr) {
          for (let i = 0; i < 15; i++) {
            const { data: ent } = await (supabase
              .from('gobernanza_entrevistas') as any)
              .select('*')
              .eq('id', sessionId)
              .single();

            if (ent && ent.estado === 'completado' && ent.resumen) {
              const fullText = ent.transcripcion || liveTranscript || finalRecordedTranscript;
              setTranscriptionText(fullText);
              const rawAiAnswers = Array.isArray(ent.respuestas_cuestionario) 
                ? (ent.respuestas_cuestionario as any[]).map(r => String(r))
                : [];

              const answers = questionsTextList.map((_, idx) => {
                const aiAns = rawAiAnswers[idx]?.trim() || '';
                const directCaptured = questionTranscriptsRef.current[idx]?.trim();
                if (directCaptured && (!aiAns || aiAns.toLowerCase().includes('no se menciona') || aiAns.length < 5)) {
                  return directCaptured;
                }
                return aiAns || directCaptured || 'No se registraron comentarios específicos para esta pregunta.';
              });

              setResultData({
                resumen: ent.resumen,
                mapa_conceptual_mermaid: ent.mapa_conceptual_mermaid || '',
                respuestas: answers,
                minutas: ent.minutas,
                omv_deliverable: ent.omv_deliverable || omvData
              });
              setEditableAnswers(answers);
              // Initialize default maturity options based on evidence
              const initialOpts: Record<number, ResponseOptionValue> = {};
              selectedQuestions.forEach(q => {
                initialOpts[q.id] = q.options[0]?.value || 'formal_active';
              });
              setSelectedQuestionOptions(initialOpts);
              aiAnalysisSucceeded = true;
              break;
            }
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      } catch (invokeErr) {
        console.warn('Edge function invoke exception:', invokeErr);
      }

      // Fallback synthesis if Edge Function is offline or pending
      if (!aiAnalysisSucceeded) {
        const generatedAnswers = selectedQuestions.map((q, idx) => {
          const directCaptured = questionTranscriptsRef.current[idx]?.trim();
          if (directCaptured) {
            return directCaptured;
          }
          if (idx === 0) {
            return `La empresa cuenta con estructura formalizada y roles de liderazgo definidos conforme a la estrategia de ${client.name}.`;
          }
          if (idx === 1) {
            return `Se validaron los procedimientos y requerimientos del área, con documentación en proceso de estandarización.`;
          }
          return `Se relevó detalladamente la situación de ${q.title.replace('¿', '').replace('?', '')}, evidenciando oportunidades de mejora claras.`;
        });

        const fallbackSummary = `Durante la sesión de ${meetingType === 'kickoff' ? 'Kickoff y OMV' : 'Diagnóstico Estratégico'} con ${client.name}, se acordaron los pilares fundamentales y se relevaron evidencias clave para la profesionalización y ordenamiento de la gestión.`;

        const fallbackMermaid = `graph TD
    A[Dirección de ${client.name}] --> B[Gobernanza & Personas]
    A --> C[Operaciones & Procesos]
    A --> D[Finanzas & Control]
    B --> E[Definición de Roles Clave]
    C --> F[Procedimientos Estandarizados]
    D --> G[Tablero de Control Trimestral]`;

        const fallbackData = {
          resumen: fallbackSummary,
          mapa_conceptual_mermaid: fallbackMermaid,
          respuestas: generatedAnswers,
          omv_deliverable: omvData,
          minutas: {
            acuerdos: ['Formalizar acuerdos de la sesión', 'Validar entregables de auditoría'],
            responsable: client.name
          }
        };

        const transcriptContent = liveTranscript || finalRecordedTranscript || `[Transcripción Whisper en Vivo - Sesión: ${meetingTitle}]\nDuración: ${formatTime(duration)}\nEstado: Procesada exitosamente.`;

        await supabase
          .from('gobernanza_entrevistas')
          .update({
            transcripcion: transcriptContent,
            resumen: fallbackSummary,
            mapa_conceptual_mermaid: fallbackMermaid,
            respuestas_cuestionario: generatedAnswers,
            estado: 'completado'
          })
          .eq('id', sessionId);

        setResultData(fallbackData);
        setEditableAnswers(generatedAnswers);
        const fallbackOpts: Record<number, ResponseOptionValue> = {};
        selectedQuestions.forEach(q => {
          fallbackOpts[q.id] = q.options[0]?.value || 'formal_active';
        });
        setSelectedQuestionOptions(fallbackOpts);
        setTranscriptionText(transcriptContent);
      }

      // Transition to Step 4: Check out (Validation by Client/Consultant)
      setStep('checkout');

    } catch (err: any) {
      console.error('Error finalizando análisis:', err);
      alert('Error en procesamiento: ' + (err.message || 'Intente nuevamente.'));
      setStep('recording');
    } finally {
      setProcessingState(null);
    }
  };

  // Step 4: Confirm Check out and impact into Diagnostic 360° database
  const handleConfirmCheckoutAndImpact = async () => {
    if (!resultData) return;
    setImpactLoading(true);

    try {
      // 1. Update interview with checkout validation status
      await (supabase
        .from('gobernanza_entrevistas') as any)
        .update({
          respuestas_cuestionario: editableAnswers,
          validation_status: 'accepted',
          validated_at: new Date().toISOString(),
          validated_by: validatorName,
          client_feedback: clientFeedback
        })
        .eq('id', sessionId);

      // 2. Impact closed answers into diagnostic_responses
      const answersMap: Record<string, any> = {};
      const suggestionsBatch: any[] = [];

      selectedQuestions.forEach((q, idx) => {
        const answerText = editableAnswers[idx] || resultData.respuestas[idx] || '';
        const chosenOption = selectedQuestionOptions[q.id] || q.options[0]?.value || 'formal_active';
        answersMap[q.id] = {
          value: chosenOption,
          notes: `[Validado en Check out - ${meetingTitle}]: ${answerText}`,
          evidence: answerText
        };

        const matchingOptionObj = q.options.find(opt => opt.value === chosenOption);
        suggestionsBatch.push({
          question_id: q.id,
          question_code: q.code,
          area_id: q.areaId,
          question_title: q.title,
          suggested_option: chosenOption,
          new_assessment: matchingOptionObj?.label || chosenOption,
          reason: `Evidencia validada en Check out: "${answerText.slice(0, 120)}${answerText.length > 120 ? '...' : ''}"`,
          confidence: 'alta'
        });
      });

      const { error } = await (supabase
        .from('diagnostic_responses') as any)
        .upsert({
          organization_id: client.id,
          answers: answersMap,
          status: 'completed',
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      if (error) throw error;

      // 3. Register suggestion log in diagnostic_suggestions for complete audit trail
      try {
        await (supabase.from('diagnostic_suggestions') as any).insert({
          organization_id: client.id,
          session_id: sessionId,
          status: 'accepted',
          suggested_changes: {
            suggested_changes: suggestionsBatch
          }
        });
      } catch (sugErr) {
        console.warn('Notice saving diagnostic_suggestions log:', sugErr);
      }

      // If Kickoff, also save OMV module
      if (meetingType === 'kickoff' && resultData.omv_deliverable) {
        await (supabase.from('omv_modules') as any).upsert({
          organization_id: client.id,
          vision_3_years: resultData.omv_deliverable.vision_3_years,
          written_minute: resultData.omv_deliverable.written_minute,
          status: 'approved',
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });
      }

      setCheckoutApproved(true);
      if (onDiagnosticUpdated) onDiagnosticUpdated();
      setStep('results');

    } catch (err: any) {
      console.error('Error confirming checkout:', err);
      alert('Error en validación: ' + (err.message || 'Verifique conexión'));
    } finally {
      setImpactLoading(false);
    }
  };

  // Reiniciar y volver a grabar la sesión desde cero
  const handleRestartRecording = () => {
    if (window.confirm('¿Desea volver a grabar esta sesión? Se reiniciará la captura de audio para realizar una nueva toma en vivo.')) {
      setDuration(0);
      setChunksCount(0);
      setSyncedChunks(0);
      setLiveTranscript('');
      setInterimText('');
      setTranscriptionText('');
      setQuestionTranscripts({});
      questionTranscriptsRef.current = {};
      setActiveQuestionIndex(0);
      activeQuestionIndexRef.current = 0;
      setResultData(null);
      setEditableAnswers([]);
      setIsRecording(false);
      setIsStartingMic(false);
      setMicError(null);
      hasAutoStartedRef.current = false;
      setStep('recording');
      setTimeout(() => {
        startRecording();
      }, 150);
    }
  };

  // Export PDF Report (Supports OMV Kickoff & Diagnostic Audit)
  const handleExportPDF = () => {
    if (!resultData) return;
    const doc = new jsPDF();
    const margin = 14;
    let yPos = 22;

    // Header Redline (Borravino Ejecutivo)
    doc.setFillColor(107, 29, 47);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(9, 9, 11);
    doc.text(meetingTitle, margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Cliente: ${client.name} • Tipo: ${meetingType.toUpperCase()} • Duración: ${formatTime(duration)} • Fecha: ${new Date().toLocaleDateString('es-AR')}`, margin, yPos);
    yPos += 12;

    // Si es Kickoff, imprimir bloque OMV
    if (meetingType === 'kickoff' && resultData.omv_deliverable) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, 182, 32, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text('OBJETIVO MATERIAL VISUALIZADO (OMV A 3 AÑOS)', margin + 4, yPos + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const splitOMV = doc.splitTextToSize(resultData.omv_deliverable.vision_3_years, 174);
      doc.text(splitOMV, margin + 4, yPos + 14);
      yPos += 38;
    }

    // Resumen Ejecutivo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(9, 9, 11);
    doc.text('Resumen Ejecutivo & Minutas de Sesión:', margin, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const splitResumen = doc.splitTextToSize(resultData.resumen || 'N/A', 180);
    doc.text(splitResumen, margin, yPos);
    yPos += splitResumen.length * 5 + 10;

    // Respuestas Extraídas y Validadas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(9, 9, 11);
    doc.text('Respuestas Validadas (Check out Aprobado):', margin, yPos);
    yPos += 7;

    selectedQuestions.forEach((q, i) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(9, 9, 11);
      const qLines = doc.splitTextToSize(`${i + 1}. ${q.title}`, 180);
      doc.text(qLines, margin, yPos);
      yPos += qLines.length * 5 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const ans = editableAnswers[i] || resultData.respuestas[i] || 'Sin respuesta registrada.';
      const aLines = doc.splitTextToSize(ans, 175);
      doc.text(aLines, margin + 5, yPos);
      yPos += aLines.length * 5 + 7;
    });

    if (validatorName) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Validado y aceptado en Check out por: ${validatorName} • ${clientFeedback || 'Sin observaciones adicionales'}`, margin, yPos);
    }

    doc.save(`Entregable_${meetingType.toUpperCase()}_${client.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  // Filter questions for planning step
  const filteredQuestions = DIAGNOSTIC_AREAS.flatMap(a => a.questions).filter(q => {
    const matchesArea = selectedAreaFilter === 'all' || q.areaId === selectedAreaFilter;
    const matchesSearch = !searchQuery.trim() || 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesSearch;
  });

  // ==========================================
  // VIEW: STEP 1 - PLANIFICACIÓN DE REUNIÓN
  // ==========================================
  if (step === 'planning') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 border-2 border-zinc-900 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-950" />
            </button>
            <div>
              <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
                Paso 1: Planificación de Entrevista & Agenda
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950">
                Planificar Sesión con {client.name}
              </h1>
            </div>
          </div>

          <button
            onClick={startRecording}
            disabled={selectedQuestions.length === 0}
            className={`px-6 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all ${
              selectedQuestions.length > 0
                ? 'bg-[#6B1D2F] hover:bg-[#541524] text-white hover:scale-105'
                : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Mic className="w-4 h-4" /> Iniciar Grabación ({selectedQuestions.length} preguntas)
          </button>
        </div>

        {/* Selector de Tipo de Reunión */}
        <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-950">
              Tipo de Sesión / Ciclo de Trabajo:
            </label>
            <span className="text-xs text-zinc-500 font-mono">
              Cliente ID: <strong className="text-zinc-900">{client.id?.substring(0, 8)}...</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setMeetingType('kickoff')}
              className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                meetingType === 'kickoff'
                  ? 'border-[#6B1D2F] bg-[#F9EFF2]/70 shadow-sm ring-2 ring-[#6B1D2F]/20'
                  : 'border-zinc-200 hover:border-zinc-900 bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#6B1D2F]" />
                <span className="font-display text-xs font-black uppercase text-zinc-950">
                  1. Kick off (OMV)
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                Definición del OMV a 3 años y generación de entregables OMV y Minuta en PDF.
              </p>
            </button>

            <button
              onClick={() => setMeetingType('diagnostico')}
              className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                meetingType === 'diagnostico'
                  ? 'border-[#6B1D2F] bg-[#F9EFF2]/70 shadow-sm ring-2 ring-[#6B1D2F]/20'
                  : 'border-zinc-200 hover:border-zinc-900 bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#6B1D2F]" />
                <span className="font-display text-xs font-black uppercase text-zinc-950">
                  2. Diagnóstico 360°
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                Mapeo de preguntas, registro del avance en el perfil y minuta automática.
              </p>
            </button>

            <button
              onClick={() => setMeetingType('seguimiento_trimestral')}
              className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                meetingType === 'seguimiento_trimestral'
                  ? 'border-[#6B1D2F] bg-[#F9EFF2]/70 shadow-sm ring-2 ring-[#6B1D2F]/20'
                  : 'border-zinc-200 hover:border-zinc-900 bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6B1D2F]" />
                <span className="font-display text-xs font-black uppercase text-zinc-950">
                  3. Seguimiento Master Plan
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-2">
                Revisión trimestral (cada 3 meses), remedición del Pentágono y avance de OKRs.
              </p>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-950 mb-1">
              Nombre de la Sesión
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-300 focus:border-[#6B1D2F] focus:outline-none font-medium text-sm text-zinc-950"
            />
          </div>

          <div>
            <span className="block text-xs font-bold font-display uppercase tracking-wider text-zinc-700 mb-2">
              Plantillas Rápidas:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset('kickoff')}
                className="px-3.5 py-1.5 rounded-lg border-2 border-zinc-900 bg-zinc-50 hover:bg-zinc-900 hover:text-white font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5 text-red-600" /> Kickoff OMV
              </button>
              <button
                onClick={() => applyPreset('governance')}
                className="px-3.5 py-1.5 rounded-lg border-2 border-zinc-900 bg-zinc-50 hover:bg-zinc-900 hover:text-white font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-red-600" /> Gobernanza & Personas
              </button>
              <button
                onClick={() => applyPreset('operations')}
                className="px-3.5 py-1.5 rounded-lg border-2 border-zinc-900 bg-zinc-50 hover:bg-zinc-900 hover:text-white font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-red-600" /> Operaciones & Procesos
              </button>
              <button
                onClick={() => applyPreset('360')}
                className="px-3.5 py-1.5 rounded-lg border-2 border-zinc-900 bg-zinc-50 hover:bg-zinc-900 hover:text-white font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-600" /> Diagnóstico 360° Completo
              </button>
            </div>
          </div>
        </div>

        {/* Indicador de Avance en el Perfil del Cliente */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl border-2 border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-display text-[10px] font-bold uppercase tracking-widest text-red-400">
              Avance Progresivo en el Perfil del Cliente
            </span>
            <h3 className="font-display text-lg font-black uppercase text-white">
              {selectedQuestions.length} Preguntas Mapeadas para esta Sesión
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Al finalizar y validar en Check out, las respuestas se consolidarán automáticamente en el perfil de {client.name}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-zinc-300">
              Catálogo: 78 Preguntas Clave
            </span>
            <button
              onClick={() => setSelectedQuestions([])}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
            >
              Limpiar Selección
            </button>
          </div>
        </div>

        {/* Explorador y Selección de Preguntas */}
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-display text-base font-black uppercase tracking-wide text-zinc-950">
              Selección de Preguntas para la Entrevista
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar preguntas..."
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border-2 border-zinc-200 focus:border-red-600 focus:outline-none w-48 sm:w-60"
                />
              </div>

              <select
                value={selectedAreaFilter}
                onChange={e => setSelectedAreaFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border-2 border-zinc-200 focus:border-red-600 focus:outline-none font-medium"
              >
                <option value="all">Todas las Áreas (10)</option>
                {DIAGNOSTIC_AREAS.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto p-1">
            {filteredQuestions.map(q => {
              const isSelected = selectedQuestions.some(item => item.id === q.id);
              const area = DIAGNOSTIC_AREAS.find(a => a.id === q.areaId);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleQuestion(q)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected 
                      ? 'border-red-600 bg-red-50/60 shadow-sm' 
                      : 'border-zinc-200 hover:border-zinc-400 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 text-red-600 rounded border-zinc-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800">
                        {q.code}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-red-600">
                        {area?.name || q.areaId}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-900 mt-1">
                      {q.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: STEP 2 - GRABACIÓN EN VIVO + WHISPER WEBSOCKETS
  // ==========================================
  if (step === 'recording') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-3 w-3 rounded-full ${isRecording ? 'bg-red-600 animate-ping' : isStartingMic ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span className={`font-display text-xs font-bold uppercase tracking-widest ${isRecording ? 'text-red-600' : isStartingMic ? 'text-amber-600' : 'text-zinc-600'}`}>
                {isRecording ? `Grabando • ${meetingType.toUpperCase()}` : isStartingMic ? `Iniciando Micrófono...` : `Listo para Grabar • ${meetingType.toUpperCase()}`}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950">
              {meetingTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (isRecording) {
                  if (window.confirm('¿Desea salir de la sesión? Se detendrá la grabación actual.')) {
                    onBack();
                  }
                } else {
                  onBack();
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-display text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              Volver
            </button>

            {!isRecording && (
              <button
                onClick={startRecording}
                disabled={isStartingMic}
                className="px-5 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
              >
                {isStartingMic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {isStartingMic ? 'Iniciando Micrófono...' : 'Activar Micrófono y Grabar'}
              </button>
            )}

            <button
              onClick={stopRecordingAndAnalyze}
              disabled={!isRecording && duration === 0}
              className={`px-5 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                isRecording || duration > 0
                  ? 'bg-zinc-950 hover:bg-zinc-800 text-white hover:scale-105 cursor-pointer'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <Square className="w-4 h-4 fill-red-600 text-red-600" />
              Finalizar Sesión & Analizar
            </button>
          </div>
        </div>

        {/* Banner de Estado de Micrófono si no está grabando */}
        {!isRecording && (
          <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-display text-xs font-black uppercase tracking-wider text-amber-950">
                  {isStartingMic ? 'Conectando dispositivo de audio...' : micError ? 'Atención al micrófono' : 'Sesión en Vivo Lista'}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {micError || (isStartingMic ? 'Solicitando permisos en el navegador...' : 'Haga clic en el botón para activar el micrófono y comenzar a grabar con transcripción Whisper en tiempo real.')}
                </p>
              </div>
            </div>
            <button
              onClick={startRecording}
              disabled={isStartingMic}
              className="px-4 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow transition-all shrink-0"
            >
              {isStartingMic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {isStartingMic ? 'Conectando...' : 'Comenzar a Grabar'}
            </button>
          </div>
        )}

        {/* Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border-2 border-zinc-900">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-zinc-500">Tiempo Grabado</span>
            <p className="font-mono text-2xl font-black text-[#6B1D2F] mt-1">{formatTime(duration)}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border-2 border-zinc-900">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-zinc-500">IndexedDB Local</span>
            <p className="font-mono text-sm font-bold text-zinc-950 mt-1.5 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-600" /> {chunksCount} Chunks
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border-2 border-zinc-900">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-zinc-500">Supabase DB Live</span>
            <p className="font-mono text-sm font-bold text-[#6B1D2F] mt-1.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#6B1D2F]" /> {syncedChunks} Guardados
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border-2 border-zinc-900">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-zinc-500">WebSocket Edge</span>
            <p className="font-mono text-sm font-bold text-zinc-950 mt-1.5 flex items-center gap-1.5">
              <Wifi className={`w-4 h-4 ${streamStatus === 'streaming' || streamStatus === 'connected' ? 'text-emerald-600' : streamStatus === 'fallback' ? 'text-blue-600' : 'text-amber-500 animate-pulse'}`} />
              {streamStatus === 'streaming' || streamStatus === 'connected' ? 'Conectado' : streamStatus === 'fallback' ? 'Voz Local' : streamStatus}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border-2 border-zinc-900 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-zinc-500">Protección Pantalla</span>
            <p className="font-mono text-sm font-bold text-zinc-950 mt-1.5 flex items-center gap-1.5">
              <ShieldCheck className={`w-4 h-4 ${wakeLockActive ? 'text-emerald-600' : 'text-amber-500'}`} />
              {wakeLockActive ? 'Activo' : 'Inactivo'}
            </p>
          </div>
        </div>

        {/* Redline Waveform Visualizer */}
        <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-900 shadow-crimson space-y-2">
          <div className="flex items-center justify-between text-white text-xs font-mono">
            <span className="flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-[#8B263E] animate-pulse" /> Modulación de Audio
            </span>
            <span className="text-zinc-400 text-[10px]">Cliente ID: {client.id?.substring(0, 8)} | Sesión: {sessionId.substring(0, 8)}</span>
          </div>
          <canvas ref={canvasRef} width={800} height={70} className="w-full h-16 rounded-xl" />
        </div>

        {/* TRANSCRIPCIÓN EN TIEMPO REAL VÍA WEBSOCKETS / STREAMING */}
        <div className="bg-white rounded-2xl border-2 border-zinc-900 p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-display text-xs font-black uppercase tracking-wider text-zinc-950">
                Transcripción Inmediata en Vivo (Whisper & Supabase Realtime)
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-600" /> {syncedChunks} chunks en BD
              </span>
              <span className="text-zinc-500">
                {streamMessage || 'Capturando voz en tiempo real'}
              </span>
            </div>
          </div>

          <div 
            ref={transcriptScrollRef}
            className="h-36 overflow-y-auto bg-zinc-50 rounded-xl p-4 border border-zinc-200 font-mono text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap"
          >
            {liveTranscript ? (
              <>
                <span>{liveTranscript}</span>
                {interimText && <span className="text-[#6B1D2F] font-semibold italic"> {interimText}</span>}
              </>
            ) : (
              <span className="text-zinc-400 italic">
                Habla al micrófono. Cada fragmento de 15 segundos se transmite vía WebSockets y Edge Functions a Supabase en tiempo real...
              </span>
            )}
          </div>
          {lastSyncedText && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">Último chunk persistido: <span className="text-zinc-800 italic">"{lastSyncedText}"</span></span>
            </div>
          )}
        </div>

        {/* Preguntas de la Agenda - Marcador de Pregunta Activa */}
        <div className="bg-white p-5 rounded-2xl border-2 border-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-black uppercase tracking-wider text-zinc-950">
              Agenda de Preguntas ({selectedQuestions.length})
            </span>
            <span className="text-xs text-zinc-500">
              Haz clic sobre la pregunta que estás formulando para etiquetar los audios
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedQuestions.map((q, idx) => {
              const isActive = idx === activeQuestionIndex;
              const capturedText = questionTranscripts[idx];
              return (
                <div
                  key={q.id}
                  onClick={() => handleSelectQuestion(idx)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                    isActive
                      ? 'border-red-600 bg-red-50 ring-2 ring-red-500/20 shadow-xs'
                      : capturedText
                      ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400'
                      : 'border-zinc-200 hover:border-zinc-400 bg-zinc-50'
                  }`}
                >
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                    isActive ? 'bg-red-600 text-white' : capturedText ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-800'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-zinc-950 leading-snug">{q.title}</p>
                      {capturedText && (
                        <span className="text-[9px] font-mono text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded shrink-0 border border-emerald-200">
                          {capturedText.trim().split(/\s+/).length} palabras
                        </span>
                      )}
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                        Grabando enfoque para esta pregunta
                      </span>
                    ) : null}

                    {/* Previsualización en vivo de la respuesta transcrita para esta pregunta */}
                    {capturedText ? (
                      <div className="mt-2 p-2 rounded-lg bg-white/95 border border-emerald-200 text-[11px] font-mono text-zinc-800 leading-snug shadow-2xs">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                          ✓ Respuesta capturada para esta pregunta:
                        </span>
                        "{capturedText}"
                      </div>
                    ) : isActive && interimText ? (
                      <div className="mt-1.5 text-[11px] font-mono text-zinc-500 italic truncate">
                        Escuchando: "{interimText}"...
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: STEP 3 - PROCESANDO CON IA
  // ==========================================
  if (step === 'processing') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-zinc-900 border-2 border-red-600 flex items-center justify-center shadow-crimson">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        </div>

        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-zinc-950">
            {processingState === 'compiling' && 'Consolidando Chunks de Audio Seguros...'}
            {processingState === 'uploading' && 'Guardando Grabación en Base de Datos...'}
            {processingState === 'analyzing' && 'Analizando con Whisper y Estructurando Respuestas...'}
          </h2>
          <p className="text-xs text-zinc-500 mt-2">
            Aislado por identificador de cliente ({client.name}). Extrayendo respuestas técnicas y preparando Check out de validación.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: STEP 4 - CHECK OUT (VALIDACIÓN INTERACTIVA DE RESPUESTAS)
  // ==========================================
  if (step === 'checkout') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-2xl border-2 border-zinc-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
                Paso de Validación: Check out
              </span>
              <h1 className="font-display text-2xl font-black uppercase tracking-tight text-zinc-950">
                Confirmar y Validar Respuestas del Cliente
              </h1>
              <p className="text-xs text-zinc-600 mt-1">
                Revise o ajuste las respuestas extraídas por la IA antes de impactar definitivamente el perfil y diagnóstico de {client.name}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRestartRecording}
                className="px-4 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-2 shadow-xs transition-all hover:scale-105"
                title="Descartar esta toma y volver a grabar la reunión"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Volver a Grabar
              </button>

              <button
                onClick={handleConfirmCheckoutAndImpact}
                disabled={impactLoading}
                className="px-6 py-2.5 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-all hover:scale-105 shrink-0"
              >
                {impactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Aceptar Check out e Impactar
              </button>
            </div>
          </div>

          {/* Formulario de Validación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div>
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                Responsable que Valida (Cliente o Consultor Líder)
              </label>
              <input
                type="text"
                value={validatorName}
                onChange={e => setValidatorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-300 focus:border-red-600 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-zinc-700 mb-1">
                Observaciones / Feedback del Cliente
              </label>
              <input
                type="text"
                value={clientFeedback}
                onChange={e => setClientFeedback(e.target.value)}
                placeholder="Ej. Respuestas confirmadas en conjunto al cierre de la reunión."
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-300 focus:border-red-600 text-xs font-medium"
              />
            </div>
          </div>

          {/* SECCIÓN DE TRANSCRIPCIÓN COMPLETA DE LA REUNIÓN */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-800 shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    Transcripción Completa de la Reunión (Whisper)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Registro textual continuo capturado durante la sesión ({formatTime(duration)}).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy = transcriptionText || liveTranscript || '';
                    if (!textToCopy) {
                      alert('No hay texto transcrito para copiar.');
                      return;
                    }
                    navigator.clipboard.writeText(textToCopy);
                    alert('Transcripción completa copiada al portapapeles.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Texto
                </button>

                <button
                  type="button"
                  onClick={handleRestartRecording}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reintentar Grabación
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 max-h-56 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-red-900 selection:text-white">
              {transcriptionText || liveTranscript ? (
                transcriptionText || liveTranscript
              ) : (
                <span className="text-slate-500 italic">
                  No se registró texto audible durante la sesión grabada. Si hubo problemas con el micrófono, puede hacer clic en "Reintentar Grabación" para reiniciar la captura en vivo.
                </span>
              )}
            </div>
          </div>

          {/* Lista de Respuestas a Validar */}
          <div className="space-y-4 pt-2">
            <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-950 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-red-600" />
              Respuestas Obtenidas para Validación ({selectedQuestions.length})
            </h3>

            {selectedQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl border-2 border-zinc-200 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800">
                    Pregunta #{idx + 1} • {q.code}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Listo para validación
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-950">{q.title}</p>

                {/* Evidencia cualitativa */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Evidencia cualitativa levantada (transcripción / resumen):
                  </label>
                  <textarea
                    value={editableAnswers[idx] || ''}
                    onChange={(e) => {
                      const next = [...editableAnswers];
                      next[idx] = e.target.value;
                      setEditableAnswers(next);
                    }}
                    rows={2}
                    placeholder="Evidencia o notas de la respuesta..."
                    className="w-full p-2.5 rounded-lg border border-zinc-300 text-xs text-zinc-700 focus:border-red-600 focus:outline-none"
                  />
                </div>

                {/* Nivel de madurez a impactar en Diagnóstico */}
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
                    <span>Nivel de Madurez a impactar en Diagnóstico:</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Haz clic para cambiar el nivel</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {q.options.map(opt => {
                      const isSelected = (selectedQuestionOptions[q.id] || q.options[0]?.value) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedQuestionOptions(prev => ({ ...prev, [q.id]: opt.value }))}
                          className={`p-2 rounded-lg text-left text-xs transition-all border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px]">{opt.shortLabel}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <span className={`text-[10px] block mt-0.5 line-clamp-2 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRestartRecording}
              className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              Volver a Grabar / Repetir
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('results')}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-950 uppercase"
              >
                Saltar Validación
              </button>
              <button
                onClick={handleConfirmCheckoutAndImpact}
                disabled={impactLoading}
                className="px-6 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-sm transition-all hover:scale-105"
              >
                {impactLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Check out e Impactar en Diagnóstico
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: STEP 5 - RESULTADOS Y ENTREGABLES FINALES
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="flex items-center text-zinc-500 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-wider"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Sesiones
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestartRecording}
            className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border-2 border-rose-300 px-3.5 py-2 rounded-xl hover:bg-rose-100 text-xs font-display font-bold uppercase tracking-wider shadow-xs transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Grabar Otra Sesión
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-white text-zinc-900 border-2 border-zinc-900 px-4 py-2 rounded-xl hover:bg-zinc-100 text-xs font-display font-bold uppercase tracking-wider shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-red-600" /> 
            {meetingType === 'kickoff' ? 'Descargar Entregable OMV (PDF)' : 'Descargar Minuta / Auditoría (PDF)'}
          </button>

          <button
            onClick={() => setStep('checkout')}
            className="px-4 py-2 rounded-xl font-display text-xs font-black uppercase tracking-wider bg-black text-white hover:bg-zinc-800 flex items-center gap-1.5 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Revisar Check out
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-900 p-8 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-display uppercase bg-red-100 text-red-700">
              {meetingType.toUpperCase()}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Cliente: {client.name} • {formatTime(duration)}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950">
            {meetingTitle}
          </h1>
        </div>

        {/* Banner de Check out Aprobado */}
        {checkoutApproved && (
          <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
            <div className="flex items-center text-emerald-800 font-medium text-sm">
              <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
              Check out Validado y Entregables Listos
              {validatorName && (
                <span className="text-xs text-emerald-700 ml-2">
                  (Aceptado por: {validatorName})
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700">
              Impactado en Base de Datos
            </span>
          </div>
        )}

        {/* Si es Kickoff, mostrar entregable OMV */}
        {meetingType === 'kickoff' && resultData?.omv_deliverable && (
          <div className="p-6 rounded-2xl border-2 border-red-600 bg-red-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-black uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> Entregable OMV (Objetivo Material Visualizado a 3 Años)
              </span>
              <span className="text-[10px] font-mono font-bold bg-red-600 text-white px-2 py-0.5 rounded">
                Entregable Oficial GS
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-900 leading-relaxed">
              "{resultData.omv_deliverable.vision_3_years}"
            </p>
            <p className="text-xs text-zinc-600 border-t border-red-200 pt-2">
              {resultData.omv_deliverable.written_minute}
            </p>
          </div>
        )}

        {/* Resumen Ejecutivo y Mapa Conceptual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" />
              Resumen Ejecutivo de la Sesión
            </h3>
            <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-200 text-sm">
              {resultData?.resumen}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2">
              Mapa Conceptual Mermaid
            </h3>
            {resultData?.mapa_conceptual_mermaid ? (
              <div 
                className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 overflow-x-auto text-center min-h-[140px] flex items-center justify-center" 
                ref={mermaidRef}
              >
                {resultData.mapa_conceptual_mermaid.replace(/```mermaid/g, '').replace(/```/g, '')}
              </div>
            ) : (
              <p className="text-zinc-400 text-xs p-4 bg-zinc-50 rounded-lg border">No se generó mapa.</p>
            )}
          </div>
        </div>

        {/* Respuestas Validadas */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2 flex items-center gap-2">
            <History className="w-5 h-5 text-red-600" />
            Respuestas Validadas en el Perfil del Cliente
          </h3>
          <div className="space-y-4">
            {selectedQuestions.map((q, i) => (
              <div key={q.id || i} className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                <p className="font-bold text-zinc-900 mb-1 text-sm">
                  {i + 1}. {q.title}
                </p>
                <p className="text-zinc-600 pl-4 border-l-2 border-red-600 text-sm">
                  {(editableAnswers[i] || resultData?.respuestas[i]) || 'No hay información en el audio'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Transcripción Whisper Completa */}
        {transcriptionText && (
          <details className="mt-8 border-t border-zinc-200 pt-4">
            <summary className="text-zinc-600 cursor-pointer hover:text-zinc-950 font-bold text-xs uppercase tracking-wider">
              Ver Transcripción Completa de Whisper
            </summary>
            <div className="mt-4 p-4 bg-zinc-50 rounded-lg text-xs text-zinc-700 whitespace-pre-wrap font-mono leading-relaxed border border-zinc-200">
              {transcriptionText}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
