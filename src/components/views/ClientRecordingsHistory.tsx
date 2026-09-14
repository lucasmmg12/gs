import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Download, 
  FileText, 
  Search, 
  Clock, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Volume2,
  Target
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ClientRecordingsHistoryProps {
  clientId: string;
  clientName: string;
  onNewRecording?: (type?: 'kickoff' | 'diagnostico' | 'seguimiento_trimestral') => void;
}

export default function ClientRecordingsHistory({
  clientId,
  clientName,
  onNewRecording
}: ClientRecordingsHistoryProps) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioUrlMap, setAudioUrlMap] = useState<Record<string, string>>({});

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('gobernanza_entrevistas') as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);

      // Generate signed or public URLs for storage audios
      if (data && data.length > 0) {
        const urlMap: Record<string, string> = {};
        for (const item of data) {
          if (item.audio_url) {
            const { data: publicUrlData } = supabase.storage
              .from('gobernanza_audios')
              .getPublicUrl(item.audio_url);
            
            if (publicUrlData?.publicUrl) {
              urlMap[item.id] = publicUrlData.publicUrl;
            }
          }
        }
        setAudioUrlMap(urlMap);
      }
    } catch (err: any) {
      console.error('Error fetching client recordings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchRecordings();
    }
  }, [clientId]);

  const formatDuration = (secs: number) => {
    const m = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleExportPDF = (rec: any) => {
    const doc = new jsPDF();
    const margin = 14;
    let yPos = 22;

    // Header Redline
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(9, 9, 11);
    doc.text(rec.titulo || 'Informe de Grabación de Sesión', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Cliente: ${clientName} • Tipo: ${(rec.meeting_type || 'diagnóstico').toUpperCase()} • Duración: ${formatDuration(rec.duracion_segundos)} • Fecha: ${new Date(rec.created_at).toLocaleDateString('es-AR')}`, margin, yPos);
    yPos += 12;

    if (rec.resumen) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(9, 9, 11);
      doc.text('Resumen Ejecutivo:', margin, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const split = doc.splitTextToSize(rec.resumen, 180);
      doc.text(split, margin, yPos);
      yPos += split.length * 5 + 10;
    }

    if (Array.isArray(rec.respuestas_cuestionario) && rec.respuestas_cuestionario.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(9, 9, 11);
      doc.text('Respuestas Validadas en Check out:', margin, yPos);
      yPos += 7;

      rec.respuestas_cuestionario.forEach((ans: any, idx: number) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(9, 9, 11);
        doc.text(`Respuesta #${idx + 1}:`, margin, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const aLines = doc.splitTextToSize(String(ans), 175);
        doc.text(aLines, margin + 4, yPos);
        yPos += aLines.length * 5 + 6;
      });
    }

    doc.save(`Grabacion_${clientName.replace(/\s+/g, '_')}_${rec.id.substring(0, 6)}.pdf`);
  };

  const filtered = recordings.filter(r => {
    const matchesType = filterType === 'all' || (r.meeting_type || 'diagnostico') === filterType;
    const matchesSearch = !searchQuery.trim() || 
      (r.titulo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.resumen || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.transcripcion || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header with Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-zinc-900 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-red-600" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">
              Repositorio de Audios & Transcripciones
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-black text-zinc-950 uppercase tracking-tight">
            Historial de Grabaciones ({filtered.length})
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Grabaciones de audio seguras, transcripciones completas de Whisper y validaciones en Check out de {clientName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en grabaciones o texto..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border-2 border-zinc-200 focus:border-red-600 focus:outline-none w-48 sm:w-56"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border-2 border-zinc-200 focus:border-red-600 focus:outline-none font-medium"
          >
            <option value="all">Todos los Tipos</option>
            <option value="kickoff">Kick off (OMV)</option>
            <option value="diagnostico">Diagnóstico 360°</option>
            <option value="seguimiento_trimestral">Seguimiento Trimestral</option>
          </select>

          <button
            onClick={fetchRecordings}
            className="p-2 rounded-xl border-2 border-zinc-900 hover:bg-zinc-100 text-zinc-900 transition-colors"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid or List of Recordings */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border-2 border-zinc-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-red-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cargando grabaciones del cliente...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-zinc-300 text-center space-y-3">
          <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
            No se encontraron grabaciones registradas con los filtros actuales.
          </p>
          {onNewRecording && (
            <button
              onClick={() => onNewRecording('diagnostico')}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-display font-black uppercase tracking-wider hover:bg-red-700 transition-all"
            >
              Iniciar Primera Grabación
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(rec => {
            const isExpanded = expandedId === rec.id;
            const audioSrc = audioUrlMap[rec.id];

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border-2 border-zinc-900 shadow-sm hover:border-red-600 transition-all overflow-hidden"
              >
                {/* Main Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-display font-black uppercase tracking-wider ${
                        rec.meeting_type === 'kickoff' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : rec.meeting_type === 'seguimiento_trimestral'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {rec.meeting_type ? rec.meeting_type.toUpperCase() : 'DIAGNÓSTICO'}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        rec.validation_status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {rec.validation_status === 'accepted' ? '✓ Check out Validado' : 'Pendiente Validación'}
                      </span>

                      <span className="text-zinc-400 text-xs font-mono">
                        {new Date(rec.created_at).toLocaleDateString('es-AR')} • {new Date(rec.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-black text-zinc-950 uppercase tracking-tight">
                      {rec.titulo || 'Auditoría General'}
                    </h3>

                    {rec.resumen && (
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {rec.resumen}
                      </p>
                    )}
                  </div>

                  {/* Actions & Player */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-700">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {formatDuration(rec.duracion_segundos)}
                    </div>

                    <button
                      onClick={() => handleExportPDF(rec)}
                      className="px-3 py-1.5 rounded-xl border-2 border-zinc-900 bg-zinc-50 hover:bg-zinc-900 hover:text-white font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                      title="Descargar entregable en PDF"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      className="p-2 rounded-xl border-2 border-zinc-900 hover:bg-zinc-100 transition-colors"
                      title={isExpanded ? 'Contraer' : 'Ver detalle'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Audio Player Strip */}
                {audioSrc && (
                  <div className="bg-zinc-50 px-5 py-2.5 border-t border-zinc-200 flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-red-600 shrink-0" />
                    <audio 
                      controls 
                      src={audioSrc} 
                      className="w-full h-8"
                      preload="none"
                    >
                      Tu navegador no soporta el elemento de audio.
                    </audio>
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t-2 border-zinc-900 bg-zinc-50/70 space-y-5 animate-in fade-in duration-200">
                    {/* Resumen */}
                    {rec.resumen && (
                      <div className="space-y-1.5">
                        <h4 className="font-display text-xs font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-red-600" /> Resumen Ejecutivo
                        </h4>
                        <p className="text-xs text-zinc-700 bg-white p-3.5 rounded-xl border border-zinc-200 leading-relaxed">
                          {rec.resumen}
                        </p>
                      </div>
                    )}

                    {/* OMV Deliverable if Kickoff */}
                    {rec.omv_deliverable?.vision_3_years && (
                      <div className="space-y-1.5 bg-red-50/60 p-4 rounded-xl border border-red-200">
                        <span className="font-display text-xs font-black uppercase text-red-600 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" /> Entregable OMV (Visión a 3 Años)
                        </span>
                        <p className="text-xs font-semibold text-zinc-900 mt-1">
                          "{rec.omv_deliverable.vision_3_years}"
                        </p>
                      </div>
                    )}

                    {/* Check out Validation details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-zinc-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold font-display uppercase tracking-wider text-zinc-500">
                          Validado en Check out por:
                        </span>
                        <p className="font-bold text-zinc-900 mt-0.5">
                          {rec.validated_by || 'Aprobación del Director General'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold font-display uppercase tracking-wider text-zinc-500">
                          Observaciones / Feedback:
                        </span>
                        <p className="text-zinc-600 mt-0.5">
                          {rec.client_feedback || 'Sin observaciones adicionales.'}
                        </p>
                      </div>
                    </div>

                    {/* Transcripción Whisper Completa */}
                    {rec.transcripcion && (
                      <details className="border border-zinc-200 rounded-xl bg-white p-3">
                        <summary className="text-xs font-bold font-display uppercase tracking-wider text-zinc-700 cursor-pointer hover:text-red-600">
                          Ver Transcripción Completa de Audio
                        </summary>
                        <div className="mt-3 p-3 bg-zinc-50 rounded-lg text-xs font-mono text-zinc-700 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {rec.transcripcion}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
