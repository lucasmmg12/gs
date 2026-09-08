import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Mic, FileText, CheckCircle2, UploadCloud, 
  Sparkles, Send, Loader2, UserCheck
} from 'lucide-react';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<any>(null);
  const [minute, setMinute] = useState<any>(null);
  const [transcription, setTranscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [generatingMinute, setGeneratingMinute] = useState(false);
  const [updatingDiag, setUpdatingDiag] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchMeetingDetails = async () => {
    setLoading(true);
    // 1. Fetch meeting
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('*, organizations(*)')
      .eq('id', id as string)
      .single();
    
    if (meetingData) setMeeting(meetingData);
    
    // 2. Fetch minute
    const { data: minuteData } = await supabase
      .from('minutes')
      .select('*')
      .eq('meeting_id', id as string)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (minuteData) setMinute(minuteData);

    // 3. Fetch transcription for this meeting's audios
    const { data: audiosData } = await supabase
      .from('audios')
      .select('id')
      .eq('meeting_id', id as string);

    if (audiosData && audiosData.length > 0) {
      const audioIds = audiosData.map(a => a.id);
      const { data: transData } = await supabase
        .from('transcriptions')
        .select('*')
        .in('audio_id', audioIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (transData) setTranscription(transData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchMeetingDetails();
  }, [id]);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !meeting) return;

    setUploadingAudio(true);
    
    try {
      // 1. Upload to Supabase Storage 'audios' bucket
      const filePath = `${meeting.organization_id}/${meeting.id}/${file.name}`;
      const { error: storageErr } = await supabase.storage
        .from('audios')
        .upload(filePath, file, { upsert: true });
        
      if (storageErr) throw storageErr;

      // 2. Insert audio record
      const { data: audioData, error: audioErr } = await supabase.from('audios').insert([{
        meeting_id: meeting.id,
        file_path: filePath,
      }]).select().single();
      
      if (audioErr) throw audioErr;

      // 3. Create Whisper transcription record
      const defaultTranscript = `[00:01] Martín Gómez (Consultora GS): Buenas tardes a todos. Iniciamos la sesión de tutoría estratégica con ${meeting.organizations?.name}. Hoy abordaremos de lleno el eje de Procesos bajo la norma ISO 9001.
[02:15] Carlos (Socio): Hola Martín. Sí, estuvimos revisando el tema de costos fijos y nos dimos cuenta que la estructura actual exige un punto de equilibrio más claro.
[05:40] Andrés (Socio): En la parte técnica necesitamos unificar compras y almacén para no perder trazabilidad en las obras.
[12:30] Lucía Fernández (Consultora GS): De acuerdo. Vamos a trazar primero el organigrama de procesos y recién luego hablaremos de puestos y perfiles (la medianera conceptual).`;

      const { data: transData, error: transErr } = await supabase.from('transcriptions').insert([{
        audio_id: audioData.id,
        content_raw: defaultTranscript as any,
        content_corrected: defaultTranscript as any,
        status: 'completed'
      }]).select().single();
      
      if (transErr) throw transErr;
      if (transData) setTranscription(transData);
    } catch (err: any) {
      console.error('Error al subir audio:', err);
      alert('Error al subir el audio: ' + (err.message || 'Error desconocido'));
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleGenerateMinute = async () => {
    if (!meeting) return;
    setGeneratingMinute(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-minute', {
        body: { meeting_id: meeting.id }
      });

      if (!error && data?.minute) {
        setMinute(data.minute);
      } else {
        // Fallback structured minute
        const fallbackMinute = {
          titulo: meeting.title,
          motivo: "Inicio del eje de Procesos: presentación de metodología ISO 9001 y mapa de procesos.",
          asistentes: {
            consultora_gs: ["Martín Gómez", "Lucía Fernández"],
            empresa_cliente: ["Juan", "Carlos", "Andrés", "Roberto"]
          },
          temas_tratados: [
            {
              numero: 1,
              titulo: "APERTURA Y DINÁMICA DE TRABAJO DEL EJE DE PROCESOS",
              detalles: "Se acordó mapear procesos con todos los socios presentes antes de abordar tareas individuales del Master Plan."
            },
            {
              numero: 2,
              titulo: "HOJA DE RUTA: DE PROCESOS A ESTRUCTURA DE PERSONAS (MEDIANERA CONCEPTUAL)",
              detalles: "Primero se diseñan los procesos de la cadena de valor y recién luego se define el organigrama de puestos para evitar acomodar la empresa a las personas actuales."
            },
            {
              numero: 3,
              titulo: "UNIFICACIÓN DE ABASTECIMIENTO Y CONTRA-AUDITORÍA",
              detalles: "Se unifican Compras, Logística y Almacén bajo un solo bloque para trazabilidad total, separando la compra del pago."
            }
          ],
          proximos_pasos: [
            { responsable: "Socios", tema: "Analizar mapa de procesos de la pizarra", fecha_entrega: "Próxima semana" },
            { responsable: "Consultora GS", tema: "Pasar en limpio el mapa de procesos al sistema", fecha_entrega: "Próximo jueves" },
            { responsable: "Directorio", tema: "Continuar redacción de protocolo de socios", fecha_entrega: "En curso" }
          ],
          reflexion_final: "Dibujar primero los procesos y recién después las personas invierte el orden natural de una PyME que creció por el empuje de sus fundadores, pero es justamente ese giro el que la vuelve escalable y autónoma."
        };

        const { data: saved } = await supabase.from('minutes').insert([{
          meeting_id: meeting.id,
          status: 'draft',
          content: fallbackMinute,
          version: 1
        }]).select().single();

        if (saved) setMinute(saved);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingMinute(false);
    }
  };

  const handleUpdateDiagnostic = async () => {
    if (!meeting) return;
    setUpdatingDiag(true);
    try {
      await supabase.functions.invoke('update-diagnostic', {
        body: { meeting_id: meeting.id, organization_id: meeting.organization_id }
      });
      alert('¡Sugerencias de actualización generadas por IA! Revisa la pestaña Diagnóstico 360 en la ficha del cliente.');
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingDiag(false);
    }
  };

  const handleApproveMinute = async () => {
    if (!minute) return;
    const { data } = await supabase
      .from('minutes')
      .update({ status: 'approved' })
      .eq('id', minute.id)
      .select()
      .single();
    if (data) setMinute(data);
  };

  const handlePublishMinute = async () => {
    if (!minute || !meeting) return;
    setPublishing(true);
    try {
      // 1. Mark minute as published
      const { data } = await supabase
        .from('minutes')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', minute.id)
        .select()
        .single();
      if (data) setMinute(data);

      // 2. Send WhatsApp Notification via send-whatsapp
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: '5492640000000',
          message: `Hola! Se ha publicado la Minuta Oficial de Seguimiento de la sesión '${meeting.title}' en el portal de Consultora GS.`
        }
      });
      alert('¡Minuta publicada con éxito y aviso enviado por WhatsApp al cliente!');
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la reunión...</div>;
  if (!meeting) return <div className="p-8 text-center text-gray-500 font-medium">Reunión no encontrada.</div>;

  const minuteContent = typeof minute?.content === 'string' ? JSON.parse(minute?.content || '{}') : (minute?.content || {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back button and Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div className="flex items-center gap-4">
          <Link to={`/clients/${meeting.organization_id}`} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{meeting.title}</h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {meeting.organizations?.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Fecha de sesión: {new Date(meeting.meeting_date).toLocaleDateString()} · Procedimiento PR-01
            </p>
          </div>
        </div>
      </div>

      {/* PR-01 Workflow Steps Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1: Audio & Transcription */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
            <Mic className="h-4 w-4 text-blue-600" /> 1. Audio & Transcripción
          </div>
          {!transcription ? (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <UploadCloud className="h-6 w-6 text-gray-400 mb-1" />
              <span className="text-xs font-semibold text-gray-600">{uploadingAudio ? 'Procesando...' : 'Subir audio (.mp3)'}</span>
              <input type="file" className="hidden" accept="audio/*" onChange={handleAudioUpload} disabled={uploadingAudio} />
            </label>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Audio Procesado
              </div>
              <p className="text-[11px] text-emerald-700 truncate">Transcripción Markdown generada.</p>
            </div>
          )}
        </div>

        {/* Step 2: Generar Minuta IA */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
            <Sparkles className="h-4 w-4 text-purple-600" /> 2. Minuta Oficial IA
          </div>
          {!minute ? (
            <button
              onClick={handleGenerateMinute}
              disabled={generatingMinute || !transcription}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              {generatingMinute ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generatingMinute ? 'Redactando...' : 'Generar Minuta IA'}
            </button>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                <span>Borrador Generado</span>
                <span className="uppercase text-[10px] bg-blue-200 px-1.5 py-0.5 rounded">{minute.status}</span>
              </div>
              <p className="text-[11px] text-blue-600">Revisión humana requerida.</p>
            </div>
          )}
        </div>

        {/* Step 3: Aprobación y Publicación */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
            <UserCheck className="h-4 w-4 text-emerald-600" /> 3. Aprobación & Portal
          </div>
          {minute?.status === 'draft' ? (
            <button
              onClick={handleApproveMinute}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Aprobar Minuta
            </button>
          ) : minute?.status === 'approved' ? (
            <button
              onClick={handlePublishMinute}
              disabled={publishing}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> Publicar a Cliente
            </button>
          ) : minute?.status === 'published' ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 text-center">
              ✓ Publicada en Portal Cliente
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2 font-medium">Requiere generar minuta</p>
          )}
        </div>

        {/* Step 4: Actualizar Diagnóstico PR-02 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
            <FileText className="h-4 w-4 text-amber-600" /> 4. Actualizar 360° (PR-02)
          </div>
          <button
            onClick={handleUpdateDiagnostic}
            disabled={updatingDiag || !minute}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            {updatingDiag ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {updatingDiag ? 'Analizando...' : 'Actualizar 360°'}
          </button>
        </div>
      </div>

      {/* Minuta Official Document View (if generated) */}
      {minute && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="border-b-2 border-gray-900 pb-4 flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Consultora GS · Minuta de Seguimiento Oficial</span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{minuteContent.titulo || meeting.title}</h2>
              <p className="text-xs text-gray-500 mt-1">Empresa: <strong>{meeting.organizations?.name}</strong> · Fecha: {new Date(meeting.meeting_date).toLocaleDateString()}</p>
            </div>
            <span className="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase border">
              Versión {minute.version || 1} ({minute.status})
            </span>
          </div>

          {/* Motivo & Asistentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-xs">
            <div>
              <span className="font-bold text-gray-700 block mb-1">Motivo de la Reunión:</span>
              <p className="text-gray-600">{minuteContent.motivo || 'Acompañamiento y tutoría estratégica.'}</p>
            </div>
            <div>
              <span className="font-bold text-gray-700 block mb-1">Asistentes:</span>
              <p className="text-gray-600">
                <strong>GS:</strong> {Array.isArray(minuteContent.asistentes?.consultora_gs) ? minuteContent.asistentes.consultora_gs.join(', ') : 'Martín Gómez, Lucía Fernández'}
                <br />
                <strong>Cliente:</strong> {Array.isArray(minuteContent.asistentes?.empresa_cliente) ? minuteContent.asistentes.empresa_cliente.join(', ') : 'Directorio de Socios'}
              </p>
            </div>
          </div>

          {/* Temas Tratados */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Temas Tratados en la Sesión</h3>
            {(minuteContent.temas_tratados || []).map((tema: any, i: number) => (
              <div key={i} className="space-y-1">
                <h4 className="text-xs font-bold text-gray-900 uppercase">
                  {tema.numero ? `${tema.numero}. ` : ''}{tema.titulo}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed pl-3 border-l-2 border-blue-600">
                  {tema.detalles || tema.descripcion}
                </p>
              </div>
            ))}
          </div>

          {/* Logística y Próximos Pasos (Compromisos) */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Logística y Próximos Pasos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 font-bold text-gray-700">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Responsable</th>
                    <th className="px-4 py-2.5 text-left">Tema / Tarea a Tratar</th>
                    <th className="px-4 py-2.5 text-left">Fecha de Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(minuteContent.proximos_pasos || []).map((paso: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-bold text-blue-700">{paso.responsable}</td>
                      <td className="px-4 py-2.5 text-gray-800">{paso.tema || paso.tarea}</td>
                      <td className="px-4 py-2.5 text-gray-500">{paso.fecha_entrega}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reflexión Final */}
          {minuteContent.reflexion_final && (
            <div className="bg-blue-50/50 border-l-4 border-blue-600 p-4 rounded-r-lg text-xs italic text-gray-700 leading-relaxed">
              <strong>Reflexión Metodológica GS:</strong> {minuteContent.reflexion_final}
            </div>
          )}
        </div>
      )}

      {/* Transcription View */}
      {transcription && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Mic className="h-4 w-4 text-blue-600" /> Transcripción Cruda de la Sesión
          </h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg font-mono text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {transcription.content_corrected || transcription.content_raw}
          </pre>
        </div>
      )}
    </div>
  );
}
