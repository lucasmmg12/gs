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
          <span className="h-2 w-2 rounded-full bg-[#6B1D2F] animate-pulse" />
          <span className="font-display text-xs font-bold uppercase tracking-widest text-[#6B1D2F]">
            SISTEMA CENTRAL DE CONTROL · METODOLOGÍA GS
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Dashboard General · <span className="text-[#6B1D2F]">Consultora GS</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-sans">
          Supervisión de madurez estratégica (IME), Master Plan, minutas y auditorías de salud organizacionales.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Clientes */}
        <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-xs border border-slate-200 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes en Cartera</p>
              <p className="font-display text-3xl font-bold text-slate-900 mt-1">{clientsCount || 3}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Empresas bajo metodología GS
          </p>
        </div>

        {/* Card 2: IME Promedio */}
        <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-xs border border-[#E6C5CD] relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#F9EFF2] text-[#6B1D2F] rounded-xl border border-[#E6C5CD]">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display text-xs font-semibold text-[#6B1D2F] uppercase tracking-wider">IME Promedio</p>
              <p className="font-display text-3xl font-bold text-[#6B1D2F] mt-1">
                5.5 <span className="font-sans text-xs font-bold text-slate-400">/ 10</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-[#6B1D2F] mt-4 font-semibold flex items-center gap-1.5 border-t border-[#F9EFF2] pt-3">
            ▲ +0.8 de incremento trimestral
          </p>
        </div>

        {/* Card 3: Sesiones */}
        <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-xs border border-slate-200 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-semibold text-slate-500 uppercase tracking-wider">Sesiones Auditadas</p>
              <p className="font-display text-3xl font-bold text-slate-900 mt-1">{meetingsCount || 8}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Reuniones con audio & transcripción
          </p>
        </div>

        {/* Card 4: Minutas Pendientes */}
        <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-xs border border-slate-200 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xs font-semibold text-slate-500 uppercase tracking-wider">Minutas Pendientes</p>
              <p className="font-display text-3xl font-bold text-slate-900 mt-1">{minutesCount || 1}</p>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-4 font-semibold flex items-center gap-1.5 border-t border-slate-100 pt-3">
            ● Esperando revisión del consultor
          </p>
        </div>
      </div>

      {/* Quick Access to Clients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#E6C5CD]" />
            <h2 className="font-display text-sm font-bold tracking-wider text-white">
              Estado de Clientes y Madurez
            </h2>
          </div>
          <Link 
            to="/clients" 
            className="font-display text-xs font-semibold text-[#E6C5CD] hover:text-white flex items-center gap-1 transition-colors"
          >
            Ver todos los clientes <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {clients.map(client => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group block"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold shadow-xs group-hover:bg-[#6B1D2F] group-hover:text-white transition-colors">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-slate-900 group-hover:text-[#6B1D2F] tracking-wide transition-colors">
                    {client.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {client.industry || 'PyME'} · <span className="text-slate-900 font-semibold">Diagnóstico 360 Activo</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <span className="font-display text-sm font-bold text-[#6B1D2F]">
                    IME: 5.5 / 10
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">Master Plan: 42% avance</p>
                </div>
                <div className="p-1.5 rounded-md text-slate-400 group-hover:text-[#6B1D2F] group-hover:translate-x-0.5 transition-all">
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
