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
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard General · Consultora GS</h1>
        <p className="mt-1 text-sm text-gray-500">
          Supervisión de madurez estratégica (IME), Master Plan, minutas y auditorías de salud organizacionales.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-xl bg-white p-5 shadow-xs border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Clientes en Cartera</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{clientsCount || 3}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 font-medium">Empresas bajo metodología GS</p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white p-5 shadow-xs border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">IME Promedio</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">5.5 <span className="text-xs font-normal text-gray-500">/ 10</span></p>
            </div>
          </div>
          <p className="text-xs text-emerald-600 mt-3 font-medium">▲ +0.8 de incremento trimestral</p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white p-5 shadow-xs border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Sesiones Auditadas</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{meetingsCount || 8}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 font-medium">Reuniones con audio & transcripción</p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white p-5 shadow-xs border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Minutas Pendientes</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{minutesCount || 1}</p>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-3 font-medium">Esperando revisión del consultor</p>
        </div>
      </div>

      {/* Quick Access to Clients Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Estado de Clientes y Madurez</h2>
          <Link to="/clients" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todos los clientes <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {clients.map(client => (
            <Link
              key={client.id}
              to={`/clients/${client.id}`}
              className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors block"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{client.industry || 'PyME'} · Diagnóstico 360 Activo</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-gray-700">IME: 5.5 / 10</span>
                  <p className="text-[11px] text-gray-400">Master Plan: 42% avance</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
