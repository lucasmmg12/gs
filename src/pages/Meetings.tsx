import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Calendar as CalendarIcon, Plus, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

type Meeting = Database['public']['Tables']['meetings']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

type MeetingWithOrg = Meeting & { organizations: Organization | null };

export default function Meetings() {
  const [meetings, setMeetings] = useState<MeetingWithOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, organizations(*)')
      .order('meeting_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching meetings:', error);
    } else {
      setMeetings(data as MeetingWithOrg[] || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reuniones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registro de sesiones, audios y actas de los clientes
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors">
          <Plus className="h-4 w-4" />
          Nueva Reunión
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando reuniones...</div>
        ) : meetings.length > 0 ? (
          <ul role="list" className="divide-y divide-gray-100">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex min-w-0 gap-x-4">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-indigo-50">
                    <CalendarIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      <Link to={`/meetings/${meeting.id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {meeting.title}
                      </Link>
                    </p>
                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                      <p className="truncate font-medium text-gray-700">{meeting.organizations?.name}</p>
                      <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current"><circle cx={1} cy={1} r={1} /></svg>
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(meeting.meeting_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-x-4">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <p className="text-sm leading-6 text-gray-900 capitalize">{meeting.status}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No hay reuniones</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza registrando la primera sesión de un cliente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
