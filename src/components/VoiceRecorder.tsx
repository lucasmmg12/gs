import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Building2 } from 'lucide-react';
import ClientMeetingSession from './views/ClientMeetingSession';

export default function VoiceRecorder({ onBack }: { currentUser?: any; onBack?: () => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data } = await supabase.from('organizations').select('*').order('name');
        if (data && data.length > 0) {
          setClients(data);
          setSelectedClient(data[0]);
        } else {
          const fallbackClient = { id: 'default-org', name: 'Empresa Cliente GS' };
          setClients([fallbackClient]);
          setSelectedClient(fallbackClient);
        }
      } catch (e) {
        const fallbackClient = { id: 'default-org', name: 'Empresa Cliente GS' };
        setClients([fallbackClient]);
        setSelectedClient(fallbackClient);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-red-600 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {clients.length > 1 && (
        <div className="bg-white p-4 rounded-2xl border-2 border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#6B1D2F]" />
            <span className="font-display text-xs font-black uppercase tracking-wider text-zinc-900">
              Seleccionar Cliente para Grabación y Autocompletado (100 Preguntas):
            </span>
          </div>
          <select
            value={selectedClient?.id || ''}
            onChange={e => {
              const found = clients.find(c => c.id === e.target.value);
              if (found) setSelectedClient(found);
            }}
            className="px-3.5 py-2 rounded-xl border-2 border-zinc-300 focus:border-[#6B1D2F] focus:outline-none text-xs font-bold text-zinc-900 bg-zinc-50"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedClient && (
        <ClientMeetingSession
          key={selectedClient.id}
          client={selectedClient}
          onBack={onBack || (() => window.history.back())}
        />
      )}
    </div>
  );
}
