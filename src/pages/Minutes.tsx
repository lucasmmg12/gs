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

  useEffect(() => {
    fetchMinutes();
  }, []);

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

  const getStatusBadge = (status: string | null) => {
    switch(status) {
      case 'draft': return <span className="inline-flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200"><Clock className="h-3 w-3 text-gray-400" /> Borrador</span>;
      case 'in_review': return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"><Clock className="h-3 w-3 text-yellow-500" /> En revisión</span>;
      case 'approved': return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><CheckCircle className="h-3 w-3 text-emerald-500" /> Aprobada</span>;
      case 'published': return <span className="inline-flex items-center gap-x-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"><Send className="h-3 w-3 text-blue-500" /> Publicada</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Minutas y Aprobaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Flujo de revisión y publicación de minutas generadas
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando minutas...</div>
        ) : minutes.length > 0 ? (
          <ul role="list" className="divide-y divide-gray-100">
            {minutes.map((minute) => (
              <li key={minute.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex min-w-0 gap-x-4">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-blue-50">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      <Link to={`/meetings/${minute.meeting_id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {minute.meetings?.title || 'Reunión sin título'}
                      </Link>
                    </p>
                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                      <p className="truncate font-medium text-gray-700">{minute.meetings?.organizations?.name}</p>
                      <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current"><circle cx={1} cy={1} r={1} /></svg>
                      <p>V{minute.version}</p>
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
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay minutas</h3>
            <p className="mt-1 text-sm text-gray-500">Aún no se han generado borradores desde las reuniones.</p>
          </div>
        )}
      </div>
    </div>
  );
}
