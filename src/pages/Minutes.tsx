import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { FileText, Clock, CheckCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

type Minute = Database['public']['Tables']['minutes']['Row'];
type Meeting = Database['public']['Tables']['meetings']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

type MinuteWithDetails = Minute & { 
  meetings: (Meeting & { organizations: Organization | null }) | null 
};

export default function Minutes() {
  const [minutes, setMinutes] = useState<MinuteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMinutes = async () => {
    const { data, error } = await supabase
      .from('minutes')
      .select('*, meetings(*, organizations(*))')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching minutes:', error);
    } else {
      setMinutes(data as unknown as MinuteWithDetails[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMinutes();
  }, []);

  const getStatusBadge = (status: string | null) => {
    switch(status) {
      case 'draft': return <span className="inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-300 uppercase tracking-wider"><Clock className="h-3 w-3 text-zinc-500" /> Borrador</span>;
      case 'in_review': return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-300 uppercase tracking-wider"><Clock className="h-3 w-3 text-amber-500" /> En revisión</span>;
      case 'approved': return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 uppercase tracking-wider"><CheckCircle className="h-3 w-3 text-emerald-600" /> Aprobada</span>;
      case 'published': return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-black text-red-400 border border-red-600/40 uppercase tracking-wider"><Send className="h-3 w-3 text-red-500" /> Publicada</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            <span className="font-display text-xs font-bold uppercase tracking-widest text-red-600">Documentación Oficial</span>
          </div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-zinc-950">
            Minutas y Aprobaciones
          </h1>
          <p className="mt-1 text-sm text-zinc-600 font-sans">
            Flujo de revisión, validación por consultor y publicación de minutas generadas.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border-2 border-zinc-900">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-bold font-display uppercase tracking-wider">
            Cargando minutas...
          </div>
        ) : minutes.length > 0 ? (
          <ul role="list" className="divide-y divide-zinc-200">
            {minutes.map((minute) => (
              <li key={minute.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-red-50/40 transition-colors group">
                <div className="flex min-w-0 gap-x-4 items-center">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-zinc-950 text-red-500 border border-zinc-800 shadow-xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="font-display text-base font-bold text-zinc-950 group-hover:text-red-600 transition-colors uppercase tracking-wide">
                      <Link to={`/meetings/${minute.meeting_id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {minute.meetings?.title || 'Reunión sin título'}
                      </Link>
                    </p>
                    <div className="mt-1 flex items-center gap-x-3 text-xs text-zinc-500 font-sans">
                      <p className="truncate font-bold text-zinc-800 uppercase tracking-wider">{minute.meetings?.organizations?.name}</p>
                      <span className="h-1 w-1 rounded-full bg-zinc-300" />
                      <p className="font-mono text-zinc-500 font-bold">V{minute.version}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-x-4">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    {getStatusBadge(minute.status)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-zinc-300" />
            <h3 className="mt-2 font-display text-sm font-bold uppercase tracking-wider text-zinc-900">No hay minutas</h3>
            <p className="mt-1 text-sm text-zinc-500">Aún no se han generado borradores desde las reuniones.</p>
          </div>
        )}
      </div>
    </div>
  );
}
