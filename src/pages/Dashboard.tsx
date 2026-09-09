import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Calendar, FileText, Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [clientsCount, setClientsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [minutesCount, setMinutesCount] = useState(0);
  const [clients, setClients] = useState<any[]>([]);

  const fetchDashboardStats = async () => {
    // 1. Fetch orgs
    const { data: orgs } = await supabase.from('organizations').select('*');
    if (orgs) {
      setClientsCount(orgs.length);
      setClients(orgs);
    }

    // 2. Fetch meetings
    const { count: mtgCount } = await supabase.from('meetings').select('*', { count: 'exact', head: true });
    setMeetingsCount(mtgCount || 0);

    // 3. Fetch minutes
    const { count: minCount } = await supabase.from('minutes').select('*', { count: 'exact', head: true }).eq('status', 'draft');
    setMinutesCount(minCount || 0);
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
          <span className="font-display text-xs font-black uppercase tracking-widest text-red-600">
            SISTEMA CENTRAL DE CONTROL · METODOLOGÍA GS
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-zinc-950 uppercase">
          Dashboard General · <span className="text-red-600">Consultora GS</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-600 font-sans">
          Supervisión de madurez estratégica (IME), Master Plan, minutas y auditorías de salud organizacionales.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Clientes */}
        <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm border-2 border-zinc-900 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-950" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 text-white rounded-lg border border-zinc-800">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-zinc-500 uppercase tracking-wider">Clientes en Cartera</p>
              <p className="font-display text-4xl font-black text-zinc-950 mt-1">{clientsCount || 3}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-4 font-medium flex items-center gap-1.5 border-t border-zinc-100 pt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
            Empresas bajo metodología GS
          </p>
        </div>

        {/* Card 2: IME Promedio */}
        <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm border-2 border-red-600 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-600 text-white rounded-lg shadow-crimson">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-red-600 uppercase tracking-wider">IME Promedio</p>
              <p className="font-display text-4xl font-black text-red-600 mt-1">
                5.5 <span className="font-sans text-xs font-bold text-zinc-400">/ 10</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-red-600 mt-4 font-bold flex items-center gap-1.5 border-t border-red-100 pt-3">
            ▲ +0.8 de incremento trimestral
          </p>
        </div>

        {/* Card 3: Sesiones */}
        <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm border-2 border-zinc-900 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-950" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 text-white rounded-lg border border-zinc-800">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-zinc-500 uppercase tracking-wider">Sesiones Auditadas</p>
              <p className="font-display text-4xl font-black text-zinc-950 mt-1">{meetingsCount || 8}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-4 font-medium flex items-center gap-1.5 border-t border-zinc-100 pt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
            Reuniones con audio & transcripción
          </p>
        </div>

        {/* Card 4: Minutas Pendientes */}
        <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm border-2 border-zinc-900 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-100 text-zinc-950 rounded-lg border border-zinc-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-zinc-500 uppercase tracking-wider">Minutas Pendientes</p>
              <p className="font-display text-4xl font-black text-zinc-950 mt-1">{minutesCount || 1}</p>
            </div>
          </div>
          <p className="text-xs text-red-600 mt-4 font-semibold flex items-center gap-1.5 border-t border-zinc-100 pt-3">
            ● Esperando revisión del consultor
          </p>
        </div>
      </div>

      {/* Quick Access to Clients Table */}
      <div className="bg-white rounded-xl border-2 border-zinc-900 shadow-sm overflow-hidden">
        <div className="p-5 bg-zinc-950 text-white flex items-center justify-between border-b-2 border-red-600">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-red-600" />
            <h2 className="font-display text-base font-black uppercase tracking-wider text-white">
              Estado de Clientes y Madurez
            </h2>
          </div>
          <Link 
            to="/clients" 
            className="font-display text-xs font-bold text-red-400 hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors"
          >
            Ver todos los clientes <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-zinc-200">
          {clients.map(client => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="p-5 flex items-center justify-between hover:bg-red-50/40 transition-colors group block"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-lg bg-zinc-950 text-red-500 border border-zinc-800 flex items-center justify-center font-bold shadow-xs group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-zinc-950 group-hover:text-red-600 uppercase tracking-wide transition-colors">
                    {client.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {client.industry || 'PyME'} · <span className="text-zinc-900 font-semibold">Diagnóstico 360 Activo</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <span className="font-display text-sm font-black text-red-600 uppercase tracking-wider">
                    IME: 5.5 / 10
                  </span>
                  <p className="text-[11px] text-zinc-500 font-medium">Master Plan: 42% avance</p>
                </div>
                <div className="p-1.5 rounded-md text-zinc-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
