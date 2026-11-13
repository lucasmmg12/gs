import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mic, Download, ShieldCheck, EyeOff, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ClientMeetingSession from '../components/views/ClientMeetingSession';
import { exportOfficialMinuteDocx } from '../lib/gsOfficialExporter';

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [minute, setMinute] = useState<any>(null);
  const [transcription, setTranscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPublishedToClient, setIsPublishedToClient] = useState(true);

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

    if (minuteData) {
      setMinute(minuteData);
      const orgId = meetingData?.organization_id;
      const localRaw = orgId ? localStorage.getItem(`gs_minute_approvals_${orgId}`) : null;
      const localMap = localRaw ? JSON.parse(localRaw) : {};
      if (localMap[minuteData.id] !== undefined) {
        setIsPublishedToClient(localMap[minuteData.id]);
      } else {
        setIsPublishedToClient(
          minuteData.status === 'approved' ||
            minuteData.status === 'published' ||
            minuteData.quality_status === 'approved'
        );
      }
    }

    const { data: audiosData } = await supabase
      .from('audios')
      .select('id')
      .eq('meeting_id', id as string);

    if (audiosData && audiosData.length > 0) {
      const audioIds = audiosData.map((a) => a.id);
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

  const handleToggleMinuteVisibility = async () => {
    if (!minute || !meeting) return;
    const nextVal = !isPublishedToClient;
    setIsPublishedToClient(nextVal);

    const orgId = meeting.organization_id;
    const localRaw = localStorage.getItem(`gs_minute_approvals_${orgId}`);
    const localMap = localRaw ? JSON.parse(localRaw) : {};
    localMap[minute.id] = nextVal;
    localStorage.setItem(`gs_minute_approvals_${orgId}`, JSON.stringify(localMap));

    try {
      await (supabase.from('minutes') as any)
        .update({
          status: nextVal ? 'published' : 'draft',
          quality_status: nextVal ? 'approved' : 'in_review',
        })
        .eq('id', minute.id);
    } catch {
      // ignore
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Cargando detalles de la reunión...</div>;
  if (!meeting) return <div className="p-8 text-center text-gray-500 font-medium">Reunión no encontrada.</div>;

  const minuteContent =
    typeof minute?.content === 'string'
      ? JSON.parse(minute?.content || '{}')
      : minute?.content || {};

  const rawTopics = minuteContent.temas_tratados || minuteContent.TEMAS_TRATADOS || [];
  const rawCommitments = minuteContent.compromisos || minuteContent.COMPROMISOS || [];
  const reflection = minuteContent.reflexion_general || '';

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTUDIO GS CONSULTORA — MINUTA DE SEGUIMIENTO OFICIAL', 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Cliente: ${meeting.organizations?.name || 'EJEMPLO SAS'}  |  Fecha: ${new Date(meeting.meeting_date).toLocaleDateString('es-AR')}`,
      14,
      25
    );

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Pilar / Tema Tratado', 'Diagnóstico / Observación', 'Acuerdo / Acción']],
      body: rawTopics.map((t: any, idx: number) => [
        String(t.numero || t.NUMERO || `2.${idx + 1}`),
        t.titulo || t.TITULO || 'Tema',
        t.resumen || t.detalles || t.descripcion || t.DESCRIPCION || '',
        t.acuerdos || t.ACUERDO || '',
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [107, 29, 47], textColor: 255 },
    });

    const afterY = (doc as any).lastAutoTable?.finalY || 130;
    if (rawCommitments.length > 0) {
      autoTable(doc, {
        startY: afterY + 8,
        head: [['Compromiso / Próximo Paso (30 Días)', 'Responsable', 'Fecha Objetivo']],
        body: rawCommitments.map((c: any) => [
          c.accion || c.TAREA || '',
          c.responsable || c.RESPONSABLE || '',
          c.fecha || c.FECHA_LIMITE || '',
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      });
    }

    doc.save(`00-000-${(meeting.organizations?.name || 'Cliente').replace(/\s+/g, '_')}-Minuta_Rev0.pdf`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-4">
          <Link
            to={`/clients/${meeting.organization_id}/meetings`}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950">
                {meeting.title}
              </h1>
              <span className="inline-flex items-center rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-400 border border-red-600/40">
                {meeting.organizations?.name}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 font-sans">
              Fecha de sesión: {new Date(meeting.meeting_date).toLocaleDateString('es-AR')} · Control de Calidad y Publicación al Portal del Cliente
            </p>
          </div>
        </div>

        {minute && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMinuteVisibility}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
                isPublishedToClient
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
            >
              {isPublishedToClient ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Publicada en Portal Cliente (Verde)
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-red-600" />
                  Borrador Interno GS (Rojo)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={async () => {
                const orgName = meeting.organizations?.name || 'EJEMPLO SAS';
                const projectCode = localStorage.getItem(`gs_project_code_${meeting.organization_id}`) || '00-000';
                await exportOfficialMinuteDocx({
                  projectCode,
                  clientName: orgName,
                  revision: 'Rev0',
                  meetingTitle: minuteContent.titulo || meeting.title || 'Minuta de Seguimiento',
                  meetingDate:
                    minuteContent.cabecera?.fecha ||
                    minuteContent.CABECERA?.FECHA ||
                    new Date(meeting.meeting_date).toLocaleDateString('es-AR'),
                  motivo:
                    minuteContent.cabecera?.motivo ||
                    minuteContent.CABECERA?.MOTIVO ||
                    'Seguimiento de avances e implementación metodológica Estudio GS',
                  attendeesGS: minuteContent.cabecera?.asistentes_gs || ['Equipo Consultor GS'],
                  attendeesClient: minuteContent.cabecera?.asistentes_cliente || [orgName],
                  topicsDiscussed: rawTopics.map((t: any) => ({
                    title: t.titulo || t.TITULO || 'Tema Tratado',
                    intro: t.acuerdos || t.ACUERDO || undefined,
                    points: [t.resumen || t.detalles || t.descripcion || t.DESCRIPCION || ''],
                  })),
                  commitments: rawCommitments.map((c: any) => ({
                    responsible: c.responsable || c.RESPONSABLE || 'Equipo',
                    task: c.accion || c.TAREA || '',
                    deadline: c.fecha || c.FECHA_LIMITE || 'Próxima sesión',
                  })),
                  reflection:
                    reflection ||
                    'Sostener el ritmo de ejecución semanal convierte las definiciones estratégicas en hábitos de gestión sostenibles.',
                });
              }}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              Word Oficial (.DOCX)
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-red-500" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Flujo Simplificado Automático (Grabar o Subir Audio -> 100 Preguntas -> Informe y Minuta) */}
      <ClientMeetingSession
        client={{
          id: meeting.organization_id,
          name: meeting.organizations?.name || 'Cliente',
        }}
        initialTitle={meeting.title}
        onBack={() => navigate(`/clients/${meeting.organization_id}`)}
        onDiagnosticUpdated={() => fetchMeetingDetails()}
      />

      {minute && (
        <div className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm p-8 space-y-6">
          <div className="border-b-2 border-zinc-900 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <span className="font-display text-xs font-black text-red-600 uppercase tracking-widest">
                Consultora GS · Minuta de Seguimiento Oficial (Rev 0)
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-950 mt-1">
                {minuteContent.titulo || meeting.title}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Empresa: <strong className="text-zinc-950 uppercase">{meeting.organizations?.name}</strong> · Fecha:{' '}
                {minuteContent.cabecera?.fecha ||
                  minuteContent.CABECERA?.FECHA ||
                  new Date(meeting.meeting_date).toLocaleDateString('es-AR')}
              </p>
            </div>
            <span
              className={`text-xs font-black px-3 py-1 rounded-full uppercase border ${
                isPublishedToClient
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}
            >
              {isPublishedToClient ? 'Visible en Portal Cliente' : 'Borrador Oculto al Cliente'}
            </span>
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-base font-black text-zinc-950 border-b border-zinc-200 pb-2 uppercase tracking-wide">
              Desarrollo de Pilares Tratados ({rawTopics.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rawTopics.map((tema: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 space-y-2">
                  <h4 className="font-display text-xs font-bold text-zinc-950 uppercase tracking-wider">
                    {tema.numero || tema.NUMERO ? `${tema.numero || tema.NUMERO}. ` : ''}
                    {tema.titulo || tema.TITULO}
                  </h4>
                  <p className="text-xs text-zinc-700 leading-relaxed">
                    {tema.resumen || tema.detalles || tema.descripcion || tema.DESCRIPCION}
                  </p>
                  {(tema.acuerdos || tema.ACUERDO) && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      <strong>Acuerdo: </strong>
                      {tema.acuerdos || tema.ACUERDO}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {rawCommitments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-base font-black text-zinc-950 border-b border-zinc-200 pb-2 uppercase tracking-wide">
                Compromisos y Próximos Pasos (30 Días)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900 text-white font-display uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Acción / Compromiso</th>
                      <th className="py-2.5 px-4">Responsable</th>
                      <th className="py-2.5 px-4">Plazo / Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {rawCommitments.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4 font-medium text-zinc-900">{c.accion || c.TAREA}</td>
                        <td className="py-2.5 px-4 text-zinc-600 font-semibold">{c.responsable || c.RESPONSABLE}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-red-700">{c.fecha || c.FECHA_LIMITE}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reflection && (
            <div className="p-5 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 block">
                Reflexión General del Consultor GS
              </span>
              <p className="text-xs leading-relaxed italic">"{reflection}"</p>
            </div>
          )}
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
