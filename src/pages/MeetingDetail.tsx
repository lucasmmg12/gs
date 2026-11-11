import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mic } from 'lucide-react';
import ClientMeetingSession from '../components/views/ClientMeetingSession';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [minute, setMinute] = useState<any>(null);
  const [transcription, setTranscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMeetingDetails = async () => {
    setLoading(true);
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('*, organizations(*)')
      .eq('id', id as string)
      .single();

    if (meetingData) setMeeting(meetingData);

    const { data: minuteData } = await supabase
      .from('minutes')
      .select('*')
      .eq('meeting_id', id as string)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (minuteData) setMinute(minuteData);

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

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la reunión...</div>;
  if (!meeting) return <div className="p-8 text-center text-gray-500 font-medium">Reunión no encontrada.</div>;

  const minuteContent = typeof minute?.content === 'string' ? JSON.parse(minute?.content || '{}') : (minute?.content || {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div className="flex items-center gap-4">
          <Link to={`/clients/${meeting.organization_id}`} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-950">{meeting.title}</h1>
              <span className="inline-flex items-center rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-400 border border-red-600/40">
                {meeting.organizations?.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-sans">
              Fecha de sesión: {new Date(meeting.meeting_date).toLocaleDateString()} · Flujo Simplificado Automático (100 Preguntas + Informe y Minutas)
            </p>
          </div>
        </div>
      </div>

      {/* Flujo Simplificado Automático (Grabar o Subir Audio -> 100 Preguntas -> Informe y Minuta) */}
      <ClientMeetingSession
        client={{
          id: meeting.organization_id,
          name: meeting.organizations?.name || 'Cliente'
        }}
        initialTitle={meeting.title}
        onBack={() => navigate(`/clients/${meeting.organization_id}`)}
        onDiagnosticUpdated={() => fetchMeetingDetails()}
      />

      {minute && (
        <div className="bg-white rounded-xl border-2 border-zinc-900 shadow-sm p-8 space-y-6">
          <div className="border-b-2 border-zinc-900 pb-4 flex justify-between items-start">
            <div>
              <span className="font-display text-xs font-black text-red-600 uppercase tracking-widest">
                Consultora GS · Minuta de Seguimiento Oficial
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950 mt-1">
                {minuteContent.titulo || meeting.title}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Empresa: <strong className="text-zinc-950 uppercase">{meeting.organizations?.name}</strong> · Fecha: {new Date(meeting.meeting_date).toLocaleDateString()}
              </p>
            </div>
            <span className="bg-zinc-950 text-red-400 text-xs font-black px-3 py-1 rounded-full uppercase border border-red-600/40">
              Versión {minute.version || 1} ({minute.status})
            </span>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-base font-black text-zinc-950 border-b border-zinc-200 pb-2 uppercase tracking-wide">
              Temas Tratados en la Sesión
            </h3>
            {(minuteContent.temas_tratados || []).map((tema: any, i: number) => (
              <div key={i} className="space-y-1">
                <h4 className="font-display text-xs font-bold text-zinc-950 uppercase tracking-wider">
                  {tema.numero ? `${tema.numero}. ` : ''}{tema.titulo}
                </h4>
                <p className="text-xs text-zinc-700 leading-relaxed pl-3 border-l-2 border-red-600">
                  {tema.detalles || tema.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {transcription && (
        <div className="bg-white rounded-xl border-2 border-zinc-900 shadow-sm p-6 space-y-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-2">
            <Mic className="h-4 w-4 text-red-600" /> Transcripción Cruda de la Sesión
          </h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg font-mono text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {transcription.content_corrected || transcription.content_raw}
          </pre>
        </div>
      )}
    </div>
  );
}
