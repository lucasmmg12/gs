import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Building2, Search, Plus, ChevronRight, Activity, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

type Organization = Database['public']['Tables']['organizations']['Row'];

export default function Clients() {
  const [clients, setClients] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Directorio de Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los clientes, su Diagnóstico 360°, Master Plan Estratégico y Pentágono del Orden.
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-gray-200">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            placeholder="Buscar por razón social o industria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-xs border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Cargando clientes de Consultora GS...</div>
        ) : filteredClients.length > 0 ? (
          <ul role="list" className="divide-y divide-gray-100">
            {filteredClients.map((client) => (
              <li key={client.id} className="hover:bg-gray-50/80 transition-colors">
                <Link to={`/clients/${client.id}`} className="flex items-center justify-between gap-x-6 px-6 py-5">
                  <div className="flex min-w-0 gap-x-4 items-center">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors">
                        {client.name}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span>{client.industry || 'PyME en Desarrollo'}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-1 text-blue-700 font-semibold">
                          <Activity className="h-3 w-3" /> IME: 5.5
                        </span>
                        <span className="h-1 w-1 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Layers className="h-3 w-3" /> Master Plan: 42%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-gray-500 font-medium">
            No se encontraron clientes activos.
          </div>
        )}
      </div>
    </div>
  );
}
