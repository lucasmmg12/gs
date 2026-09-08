import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Calendar as CalendarIcon, Plus, Clock, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type Meeting = Database['public']['Tables']['meetings']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];

type MeetingWithOrg = Meeting & { organizations: Organization | null };

export default function Meetings() {
  const [meetings, setMeetings] = useState<MeetingWithOrg[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*').order('name');
    if (data && data.length > 0) {
      setOrganizations(data);
      if (!selectedOrgId) setSelectedOrgId(data[0].id);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchOrganizations();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !meetingTitle.trim()) {
      setModalError('Complete todos los campos requeridos.');
      return;
    }

    setCreating(true);
    setModalError(null);

    try {
      const { error } = await supabase
        .from('meetings')
        .insert([{
          organization_id: selectedOrgId,
          title: meetingTitle.trim(),
          meeting_date: new Date(meetingDate).toISOString(),
          status: 'completed',
          participants: [
            { name: "Consultor GS", role: "Auditor Líder" },
            { name: "Dirección de la Organización", role: "Cliente" }
          ]
        }]);

      if (error) throw error;

      setIsModalOpen(false);
      setMeetingTitle('');
      await fetchMeetings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar reunión';
      setModalError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reuniones y Auditorías</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registro de sesiones clínicas/estratégicas, audios, transcripción Whisper y minutas ejecutivas.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Reunión
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-xs border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500 font-medium">Cargando reuniones...</div>
        ) : meetings.length > 0 ? (
          <ul role="list" className="divide-y divide-gray-100">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="relative flex justify-between gap-x-6 px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex min-w-0 gap-x-4 items-center">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors">
                      <Link to={`/meetings/${meeting.id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {meeting.title}
                      </Link>
                    </p>
                    <div className="mt-1 flex items-center gap-x-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{meeting.organizations?.name || 'Cliente'}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(meeting.meeting_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-x-4">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 capitalize">
                    {meeting.status}
                  </span>
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

      {/* Modal Nueva Reunión */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Registrar Nueva Sesión</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="mt-4 space-y-4">
              {modalError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Organización / Cliente *
                </label>
                <select
                  required
                  className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  value={selectedOrgId}
                  onChange={e => setSelectedOrgId(e.target.value)}
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título de la Sesión *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Acompañamiento Estratégico · Procesos y Medianera Conceptual"
                  className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de la Sesión *
                </label>
                <input
                  type="date"
                  required
                  className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-70"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Crear Reunión'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
