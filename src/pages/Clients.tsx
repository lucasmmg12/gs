import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Building2, Search, Plus, ChevronRight, Activity, Layers, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type Organization = Database['public']['Tables']['organizations']['Row'];

export default function Clients() {
  const [clients, setClients] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientIndustry, setNewClientIndustry] = useState('Salud / Clínica');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setModalError('Ingrese la razón social o nombre de la organización.');
      return;
    }

    setCreating(true);
    setModalError(null);

    try {
      // 1. Insert organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: newClientName.trim(),
          industry: newClientIndustry.trim(),
          status: 'active'
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Initialize diagnostic_360 row
      if (newOrg) {
        await supabase.from('diagnostic_360').insert([{
          organization_id: newOrg.id,
          version: 1,
          status: 'draft',
          ime_score: 5.0,
          ire_score: 3.5
        }]);

        // 3. Initialize pentagon baseline
        await supabase.from('pentagon_scores').insert([{
          organization_id: newOrg.id,
          period_label: 'Línea Base Inicial',
          measurement_date: new Date().toISOString().split('T')[0],
          gobernanza: 5.0,
          procesos: 4.5,
          finanzas: 6.0,
          talento: 5.5,
          comercial: 5.0,
          ime_actual: 5.2,
          is_baseline: true
        }]);
      }

      setIsModalOpen(false);
      setNewClientName('');
      await fetchClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar cliente';
      setModalError(msg);
    } finally {
      setCreating(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.industry && c.industry.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
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
            className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Registrar Nuevo Cliente</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="mt-4 space-y-4">
              {modalError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clínica Los Andes S.A."
                  className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Industria / Rubro
                </label>
                <select
                  className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  value={newClientIndustry}
                  onChange={e => setNewClientIndustry(e.target.value)}
                >
                  <option value="Salud / Clínica">Salud / Clínica</option>
                  <option value="Laboratorio y Diagnóstico">Laboratorio y Diagnóstico</option>
                  <option value="Desarrollo e Ingeniería">Desarrollo e Ingeniería</option>
                  <option value="Servicios Corporativos">Servicios Corporativos</option>
                  <option value="Industria Farmacéutica">Industria Farmacéutica</option>
                  <option value="Otro">Otro</option>
                </select>
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creando...
                    </>
                  ) : (
                    'Guardar Cliente'
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
