import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Mic, Square, Loader2, Download, FileText, CheckCircle2, ChevronLeft, History } from 'lucide-react';
import mermaid from 'mermaid';
import { jsPDF } from 'jspdf';

// Tipos para evitar errores TS implícitos
interface Plantilla {
  id: string;
  nombre: string;
  preguntas: string[];
}

export default function VoiceRecorder({ currentUser, onBack }: { currentUser: any, onBack?: () => void }) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Grabación
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  // Procesamiento
  const [processingState, setProcessingState] = useState<'uploading' | 'analyzing' | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [transcriptionText, setTranscriptionText] = useState("");
  
  // Referencias
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Cargar plantillas
  useEffect(() => {
    const fetchPlantillas = async () => {
      try {
        const { data, error } = await supabase.from('gobernanza_plantillas').select('*');
        if (error) throw error;
        if (data) {
          const parsed: Plantilla[] = data.map(p => ({
            id: p.id,
            nombre: p.nombre,
            preguntas: Array.isArray(p.preguntas) ? (p.preguntas as string[]) : []
          }));
          setPlantillas(parsed);
        }
      } catch (e) {
        console.error("Error al cargar plantillas", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlantillas();
  }, []);

  // Inicializar Mermaid
  useEffect(() => {
    if (resultData?.mapa_conceptual_mermaid && mermaidRef.current) {
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.run({ nodes: [mermaidRef.current] });
      } catch (err) {
        console.error("Error renderizando mermaid:", err);
      }
    }
  }, [resultData]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

      canvasCtx.fillStyle = '#f8fafc'; // bg-slate-50
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2.5;
      canvasCtx.strokeStyle = '#dc2626';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      setIsRecording(true);
      setDuration(0);
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(finalBlob);
      };

      recorder.start(1000); // Guardar chunks cada 1 segundo en memoria

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      setTimeout(() => drawWaveform(), 50);

    } catch (err) {
      console.error("Mic error:", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsRecording(false);
  };

  const handleAudioUpload = async (blob: Blob) => {
    if (!selectedPlantilla) return;
    
    setProcessingState('uploading');
    const entrevistaId = crypto.randomUUID();
    const fileName = `${entrevistaId}_${Date.now()}.webm`;

    try {
      // 1. Subir audio
      const { error: uploadError } = await supabase.storage
        .from('gobernanza_audios')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      
      if (uploadError) throw new Error(uploadError.message);

      // 2. Registrar en base de datos
      const { error: dbError } = await supabase
        .from('gobernanza_entrevistas')
        .insert({
          id: entrevistaId,
          plantilla_id: selectedPlantilla.id,
          usuario_id: currentUser?.id,
          audio_url: fileName,
          estado: 'procesando',
          titulo: selectedPlantilla.nombre
        });
        
      if (dbError) throw new Error(dbError.message);

      setProcessingState('analyzing');

      // 3. Invocar IA
      const { error: edgeError } = await supabase.functions.invoke('gobernanza-ai', {
        body: { 
          action: 'transcribe_and_analyze', 
          payload: {
            entrevista_id: entrevistaId,
            plantilla_id: selectedPlantilla.id,
            audio_path: fileName
          }
        }
      });

      if (edgeError) throw new Error(edgeError.message);

      // 4. Polling de resultado
      let checkData;
      while (true) {
        const { data } = await supabase.from('gobernanza_entrevistas').select('*').eq('id', entrevistaId).single();
        if (data && data.estado === 'completado') {
          checkData = data;
          break;
        }
        await new Promise(r => setTimeout(r, 3000));
      }

      setTranscriptionText(checkData.transcripcion || "");
      setResultData({
        resumen: checkData.resumen,
        respuestas: checkData.respuestas_cuestionario,
        mapa_conceptual_mermaid: checkData.mapa_conceptual_mermaid,
        minutas: checkData.minutas
      });
      
    } catch (e: any) {
      alert("Error al procesar: " + e.message);
    } finally {
      setProcessingState(null);
    }
  };

  const handleExportPDF = () => {
    if (!selectedPlantilla || !resultData) return;
    const doc = new jsPDF();
    const margin = 14;
    let yPos = 20;

    doc.setFontSize(16);
    doc.text("Auditoría: " + selectedPlantilla.nombre, margin, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text("Resumen Ejecutivo:", margin, yPos);
    yPos += 7;
    doc.setFontSize(10);
    const splitResumen = doc.splitTextToSize(resultData.resumen || "N/A", 180);
    doc.text(splitResumen, margin, yPos);
    yPos += (splitResumen.length * 5) + 10;

    doc.setFontSize(12);
    doc.text("Cuestionario:", margin, yPos);
    yPos += 7;

    selectedPlantilla.preguntas.forEach((q: string, i: number) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const qLines = doc.splitTextToSize(`${i + 1}. ${q}`, 180);
      doc.text(qLines, margin, yPos);
      yPos += (qLines.length * 5) + 2;

      doc.setFont('helvetica', 'normal');
      const ans = (resultData.respuestas && resultData.respuestas[i]) ? resultData.respuestas[i] : 'Sin respuesta';
      const aLines = doc.splitTextToSize(ans, 175);
      doc.text(aLines, margin + 5, yPos);
      yPos += (aLines.length * 5) + 8;
    });

    doc.save(`Auditoria_${selectedPlantilla.nombre}.pdf`);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-red-600 h-8 w-8" /></div>;
  }

  // Si no se ha elegido plantilla
  if (!selectedPlantilla) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {onBack && (
          <button onClick={onBack} className="flex items-center text-zinc-500 hover:text-red-600 mb-2 transition-colors font-bold text-xs uppercase tracking-wider">
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver
          </button>
        )}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">Auditorías de Voz</span>
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-950">
            Gobernanza y Auditorías
          </h1>
          <p className="mt-1 text-sm text-zinc-600 font-sans">
            Selecciona una plantilla estructurada para registrar entrevistas y transcribir con IA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plantillas.map(p => (
            <div key={p.id} onClick={() => setSelectedPlantilla(p)} className="p-6 bg-white border-2 border-zinc-900 rounded-xl hover:shadow-crimson hover:border-red-600 cursor-pointer transition-all group">
              <h3 className="font-display text-lg font-bold text-zinc-950 group-hover:text-red-600 uppercase tracking-wide transition-colors">{p.nombre}</h3>
              <p className="text-xs text-zinc-500 mt-2 font-medium">{p.preguntas.length} preguntas predefinidas</p>
            </div>
          ))}
          {plantillas.length === 0 && (
             <div className="p-6 bg-zinc-100 text-zinc-800 rounded-xl border border-zinc-300 font-medium text-xs">
               No hay plantillas creadas. Se necesita al menos una en base de datos.
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <button onClick={() => setSelectedPlantilla(null)} className="flex items-center text-zinc-500 hover:text-red-600 mb-2 transition-colors font-bold text-xs uppercase tracking-wider">
        <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Plantillas
      </button>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-900 p-8">
        <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950 mb-2">{selectedPlantilla.nombre}</h2>
        <p className="text-zinc-600 text-sm mb-8">Grabe la entrevista y la inteligencia artificial extraerá las respuestas y generará un resumen estructurado.</p>

        {/* Grabador Activo */}
        {!resultData && !processingState && (
          <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-300">
            <canvas ref={canvasRef} width="600" height="100" className="w-full max-w-lg mb-8 rounded-lg bg-zinc-50" />
            
            <div className="text-5xl font-mono font-black text-zinc-950 mb-8 tracking-wider">
              {formatTime(duration)}
            </div>

            <div className="flex gap-4">
              {!isRecording ? (
                <button onClick={startRecording} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-display font-black text-sm uppercase tracking-wider shadow-crimson hover:scale-105 transition-all">
                  <Mic className="w-6 h-6 stroke-[2.5]" /> Iniciar Grabación
                </button>
              ) : (
                <button onClick={stopRecording} className="flex items-center gap-2 bg-zinc-950 hover:bg-black text-white px-8 py-4 rounded-full font-display font-black text-sm uppercase tracking-wider shadow-lg hover:scale-105 transition-all animate-pulse border-2 border-red-600">
                  <Square className="w-6 h-6 text-red-500" /> Detener y Analizar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Estados de Procesamiento */}
        {processingState && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
            <h3 className="font-display text-xl font-black uppercase tracking-wide text-zinc-950">
              {processingState === 'uploading' ? 'Subiendo audio seguro...' : 'Analizando con IA...'}
            </h3>
            <p className="text-xs text-zinc-500 mt-2 font-sans">Esto puede tomar un momento dependiendo de la duración de la grabación.</p>
          </div>
        )}

        {/* Resultados */}
        {resultData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center text-green-700 font-medium">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Análisis Completado
              </div>
              <button onClick={handleExportPDF} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  Resumen Ejecutivo
                </h3>
                <p className="text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  {resultData.resumen}
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2">Mapa Conceptual</h3>
                {resultData.mapa_conceptual_mermaid ? (
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 overflow-x-auto text-center" ref={mermaidRef}>
                    {resultData.mapa_conceptual_mermaid.replace(/```mermaid/g, '').replace(/```/g, '')}
                  </div>
                ) : (
                  <p className="text-zinc-400">No se pudo generar diagrama.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-lg font-black uppercase tracking-wider text-zinc-950 border-b border-zinc-200 pb-2 flex items-center gap-2">
                <History className="w-5 h-5 text-red-600" />
                Respuestas Extraídas
              </h3>
              <div className="space-y-4">
                {selectedPlantilla.preguntas.map((q, i) => (
                  <div key={i} className="bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                    <p className="font-bold text-zinc-900 mb-2">{i + 1}. {q}</p>
                    <p className="text-zinc-600 pl-4 border-l-2 border-red-600">
                      {(resultData.respuestas && resultData.respuestas[i]) || "No hay información en el audio"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <details className="mt-8">
              <summary className="text-slate-500 cursor-pointer hover:text-slate-800 font-medium">Ver Transcripción Completa</summary>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 whitespace-pre-wrap font-mono">
                {transcriptionText}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
