import React, { useState } from 'react';
import type { Client } from '../../data/mockData';
import { Save, Radar, BarChart3, Building2, CheckCircle2 } from 'lucide-react';

interface ConfiguracionClienteProps {
  client: Client;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

export const ConfiguracionCliente: React.FC<ConfiguracionClienteProps> = ({ client, setClients }) => {
  const [formData, setFormData] = useState({
    name: client.name,
    industry: client.industry,
    ceo: client.contact.ceo,
    executiveSummary: client.executiveSummary,
    daysInProgram: client.kpis.daysInProgram,
    realityAdherence: client.metrics.realityAdherence,
    radar: [...client.radarData]
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate Tasks Completed Automatically
  const totalTasks = client.intervenciones.reduce((acc, int) => acc + (int.checklists?.length || 0), 0);
  const completedTasks = client.intervenciones.reduce((acc, int) => acc + (int.checklists?.filter(c => c.completed)?.length || 0), 0);
  const calculatedTasksCompleted = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleRadarChange = (index: number, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;
    
    const newRadar = [...formData.radar];
    newRadar[index].A = numValue;
    setFormData(prev => ({ ...prev, radar: newRadar }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    setClients(prev => prev.map(c => {
      if (c.id !== client.id) return c;

      return {
        ...c,
        name: formData.name,
        industry: formData.industry,
        contact: { ...c.contact, ceo: formData.ceo },
        executiveSummary: formData.executiveSummary,
        kpis: {
          ...c.kpis,
          tasksCompleted: `${calculatedTasksCompleted}%`,
          daysInProgram: formData.daysInProgram,
        },
        metrics: {
          ...c.metrics,
          realityAdherence: formData.realityAdherence
        },
        radarData: formData.radar
      };
    }));

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="p-8 space-y-8 animate-in slide-in-from-bottom-8 duration-500">
      <div className="relative z-10 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Administración de Expediente</h2>
          <p className="text-gray-500 mt-1 font-medium">Modifica los datos raíz, KPIs y Pentágono del Orden de <span className="text-red-600 font-bold">{client.name}</span>.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Datos Básicos */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600" /> Perfil Comercial
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Empresa</label>
              <input 
                type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Rubro / Industria</label>
              <input 
                type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Director / CEO</label>
              <input 
                type="text" value={formData.ceo} onChange={e => setFormData({...formData, ceo: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500" required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fotografía de la Realidad (Resumen Ejecutivo)</label>
              <textarea 
                value={formData.executiveSummary} onChange={e => setFormData({...formData, executiveSummary: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 min-h-[100px]" required
              />
            </div>
          </div>
        </div>

        {/* KPIs Principales */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" /> KPIs y Métricas de Éxito
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">% Tareas Completadas (Automático)</label>
              <div className="relative">
                <input 
                  type="number" value={calculatedTasksCompleted} readOnly disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none text-gray-500 font-semibold pr-8 cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Adherencia a la Realidad</label>
              <div className="relative">
                <input 
                  type="number" min="0" max="100" value={formData.realityAdherence} onChange={e => setFormData({...formData, realityAdherence: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 pr-8" required
                />
                <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Días en el Programa</label>
              <input 
                type="number" min="0" value={formData.daysInProgram} onChange={e => setFormData({...formData, daysInProgram: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500" required
              />
            </div>
          </div>
        </div>

        {/* Pentágono del Orden */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 hover:shadow-lg transition-all duration-300">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Radar className="w-5 h-5 text-red-600" /> Parámetros del Pentágono del Orden
          </h3>
          <p className="text-sm text-gray-500 mb-4">Estos valores de 0 a 100 determinarán la forma gráfica del radar en el Dashboard.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {formData.radar.map((item, idx) => (
              <div key={item.subject} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="block text-sm font-bold text-gray-800 mb-2 text-center">{item.subject}</label>
                <div className="relative">
                  <input 
                    type="number" min="0" max="100" value={item.A} onChange={e => handleRadarChange(idx, e.target.value)}
                    className="w-full text-center px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 font-bold text-lg text-red-600" required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botonera Guardar */}
        <div className="flex items-center justify-end gap-4 pt-4 relative">
          {showSuccess && (
            <div className="absolute right-[220px] flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg font-bold animate-in fade-in slide-in-from-right-4">
              <CheckCircle2 className="w-5 h-5" /> Guardado Exitoso
            </div>
          )}
          <button 
            type="submit"
            className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-gray-900/20 transition-all duration-300 flex items-center gap-2"
          >
            <Save className="w-5 h-5" /> Guardar Modificaciones
          </button>
        </div>
      </form>
    </div>
  );
};
